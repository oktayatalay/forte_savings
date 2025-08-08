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
    
    // Get summary statistics
    $stats_sql = "SELECT 
        COUNT(*) as total_records,
        SUM(CASE WHEN type = 'Savings' THEN total_price ELSE 0 END) as total_savings,
        SUM(CASE WHEN type = 'Cost Avoidance' THEN total_price ELSE 0 END) as total_cost_avoidance,
        COUNT(DISTINCT project_id) as total_projects
        FROM savings_records";
    
    $stats_stmt = $pdo->prepare($stats_sql);
    $stats_stmt->execute();
    $stats = $stats_stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get recent records for the report
    $sql = "SELECT 
                sr.id,
                sr.date,
                sr.type,
                sr.explanation_category,
                sr.category,
                sr.total_price,
                sr.currency,
                p.frn,
                p.customer,
                p.project_name
            FROM savings_records sr
            LEFT JOIN projects p ON sr.project_id = p.id
            ORDER BY sr.created_at DESC
            LIMIT 100";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Set PDF headers  
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="forte_savings_report_' . date('Y-m-d') . '.pdf"');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // Simple HTML to PDF conversion using print-friendly HTML
    echo '<html>';
    echo '<head>';
    echo '<meta charset="UTF-8">';
    echo '<title>Forte Savings Raporu</title>';
    echo '<style>';
    echo 'body { font-family: Arial, sans-serif; margin: 20px; }';
    echo 'table { width: 100%; border-collapse: collapse; margin: 20px 0; }';
    echo 'th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }';
    echo 'th { background-color: #4472C4; color: white; font-weight: bold; }';
    echo '.summary { background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px; }';
    echo '.savings { background-color: #d4edda; }';
    echo '.cost-avoidance { background-color: #fff3cd; }';
    echo '.total { font-weight: bold; background-color: #e9ecef; }';
    echo '@media print { body { margin: 0; } }';
    echo '</style>';
    echo '</head>';
    echo '<body>';
    
    // Header
    echo '<h1 style="color: #4472C4; text-align: center;">Forte Savings - Tasarruf Raporu</h1>';
    echo '<p style="text-align: center;">Rapor Tarihi: ' . date('d/m/Y H:i') . '</p>';
    echo '<hr>';
    
    // Summary section
    echo '<div class="summary">';
    echo '<h2>Özet Bilgiler</h2>';
    echo '<p><strong>Toplam Kayıt:</strong> ' . number_format($stats['total_records']) . '</p>';
    echo '<p><strong>Toplam Proje:</strong> ' . number_format($stats['total_projects']) . '</p>';
    echo '<p><strong>Toplam Tasarruf:</strong> ' . number_format($stats['total_savings'], 2, ',', '.') . ' TL</p>';
    echo '<p><strong>Toplam Maliyet Kaçınma:</strong> ' . number_format($stats['total_cost_avoidance'], 2, ',', '.') . ' TL</p>';
    echo '<p><strong>Genel Toplam:</strong> ' . number_format($stats['total_savings'] + $stats['total_cost_avoidance'], 2, ',', '.') . ' TL</p>';
    echo '</div>';
    
    // Records table
    echo '<h2>Kayıtlar (Son 100)</h2>';
    echo '<table>';
    echo '<thead>';
    echo '<tr>';
    echo '<th>ID</th>';
    echo '<th>Tarih</th>';
    echo '<th>Tip</th>';
    echo '<th>Kategori</th>';
    echo '<th>Tutar</th>';
    echo '<th>FRN</th>';
    echo '<th>Müşteri</th>';
    echo '<th>Proje</th>';
    echo '</tr>';
    echo '</thead>';
    echo '<tbody>';
    
    foreach ($records as $record) {
        $rowClass = ($record['type'] == 'Savings') ? 'savings' : 'cost-avoidance';
        
        echo '<tr class="' . $rowClass . '">';
        echo '<td>' . htmlspecialchars($record['id']) . '</td>';
        echo '<td>' . htmlspecialchars($record['date']) . '</td>';
        echo '<td>' . htmlspecialchars($record['type']) . '</td>';
        echo '<td>' . htmlspecialchars($record['category']) . '</td>';
        echo '<td style="text-align: right">' . number_format($record['total_price'], 2, ',', '.') . ' ' . htmlspecialchars($record['currency']) . '</td>';
        echo '<td>' . htmlspecialchars($record['frn']) . '</td>';
        echo '<td>' . htmlspecialchars($record['customer']) . '</td>';
        echo '<td>' . htmlspecialchars($record['project_name']) . '</td>';
        echo '</tr>';
    }
    
    echo '</tbody>';
    echo '</table>';
    
    // Footer
    echo '<hr>';
    echo '<p style="text-align: center; font-size: 12px; color: #666;">Forte Tourism - Tasarruf Yönetim Sistemi</p>';
    
    echo '</body>';
    echo '</html>';

} catch (Exception $e) {
    error_log("PDF export error: " . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'PDF export failed: ' . $e->getMessage()
    ]);
}
?>