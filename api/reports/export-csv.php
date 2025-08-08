<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../auth/middleware.php';

try {
    // Only GET method allowed
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Only GET method allowed']);
        exit;
    }
    
    // Authentication
    $auth_data = requireUserOrAbove();
    $user_id = $auth_data['user_id'];
    $user_role = $auth_data['role'];
    
    $pdo = getDBConnection();
    
    // Get all savings records with project info
    $sql = "SELECT 
                sr.id,
                sr.date,
                sr.type,
                sr.explanation_category,
                sr.explanation_custom,
                sr.category,
                sr.price,
                sr.unit,
                sr.currency,
                sr.total_price,
                sr.created_at,
                p.frn,
                p.customer,
                p.project_name,
                p.location,
                CONCAT(u.first_name, ' ', u.last_name) as created_by_name
            FROM savings_records sr
            LEFT JOIN projects p ON sr.project_id = p.id
            LEFT JOIN users u ON sr.created_by = u.id
            ORDER BY sr.created_at DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Set CSV headers
    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="forte_savings_data_' . date('Y-m-d') . '.csv"');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // Add BOM for UTF-8
    echo "\xEF\xBB\xBF";
    
    // Create output stream
    $output = fopen('php://output', 'w');
    
    // CSV headers (Turkish)
    $headers = [
        'ID',
        'Tarih',
        'Tip',
        'Açıklama Kategorisi',
        'Özel Açıklama',
        'Kategori',
        'Birim Fiyat',
        'Adet',
        'Para Birimi',
        'Toplam Fiyat',
        'FRN',
        'Müşteri',
        'Proje Adı',
        'Lokasyon',
        'Oluşturan',
        'Oluşturma Tarihi'
    ];
    
    fputcsv($output, $headers);
    
    // Write data rows
    foreach ($records as $record) {
        $row = [
            $record['id'],
            $record['date'],
            $record['type'],
            $record['explanation_category'],
            $record['explanation_custom'],
            $record['category'],
            number_format($record['price'], 2, ',', '.'),
            $record['unit'],
            $record['currency'],
            number_format($record['total_price'], 2, ',', '.'),
            $record['frn'],
            $record['customer'],
            $record['project_name'],
            $record['location'],
            $record['created_by_name'],
            $record['created_at']
        ];
        
        fputcsv($output, $row);
    }
    
    fclose($output);

} catch (Exception $e) {
    error_log("CSV export error: " . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'CSV export failed: ' . $e->getMessage()
    ]);
}
?>