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
    
    // Create simple Excel-compatible CSV with proper formatting
    header('Content-Type: application/vnd.ms-excel; charset=UTF-8');
    header('Content-Disposition: attachment; filename="forte_savings_report_' . date('Y-m-d') . '.xls"');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // Start HTML table format for Excel
    echo '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    echo '<meta charset="UTF-8">';
    echo '<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head>';
    echo '<body>';
    
    echo '<h2>Forte Savings - Tasarruf Raporu</h2>';
    echo '<p>Rapor Tarihi: ' . date('d/m/Y H:i') . '</p>';
    echo '<p>Toplam Kayıt: ' . count($records) . '</p>';
    echo '<br>';
    
    echo '<table border="1" cellpadding="5" cellspacing="0">';
    echo '<tr style="background-color: #4472C4; color: white; font-weight: bold;">';
    echo '<th>ID</th>';
    echo '<th>Tarih</th>';
    echo '<th>Tip</th>';
    echo '<th>Açıklama Kategorisi</th>';
    echo '<th>Özel Açıklama</th>';
    echo '<th>Kategori</th>';
    echo '<th>Birim Fiyat</th>';
    echo '<th>Adet</th>';
    echo '<th>Para Birimi</th>';
    echo '<th>Toplam Fiyat</th>';
    echo '<th>FRN</th>';
    echo '<th>Müşteri</th>';
    echo '<th>Proje Adı</th>';
    echo '<th>Lokasyon</th>';
    echo '<th>Oluşturan</th>';
    echo '<th>Oluşturma Tarihi</th>';
    echo '</tr>';
    
    $totalSavings = 0;
    $totalCostAvoidance = 0;
    
    foreach ($records as $index => $record) {
        // Zebra striping
        $bgColor = ($index % 2 == 0) ? '#F2F2F2' : '#FFFFFF';
        
        // Color based on type
        if ($record['type'] == 'Savings') {
            $totalSavings += $record['total_price'];
            $typeColor = '#D4EDDA';
        } else {
            $totalCostAvoidance += $record['total_price'];
            $typeColor = '#FFF3CD';
        }
        
        echo '<tr style="background-color: ' . $bgColor . '">';
        echo '<td>' . htmlspecialchars($record['id']) . '</td>';
        echo '<td>' . htmlspecialchars($record['date']) . '</td>';
        echo '<td style="background-color: ' . $typeColor . '">' . htmlspecialchars($record['type']) . '</td>';
        echo '<td>' . htmlspecialchars($record['explanation_category']) . '</td>';
        echo '<td>' . htmlspecialchars($record['explanation_custom']) . '</td>';
        echo '<td>' . htmlspecialchars($record['category']) . '</td>';
        echo '<td style="text-align: right">' . number_format($record['price'], 2, ',', '.') . '</td>';
        echo '<td style="text-align: center">' . htmlspecialchars($record['unit']) . '</td>';
        echo '<td style="text-align: center">' . htmlspecialchars($record['currency']) . '</td>';
        echo '<td style="text-align: right; font-weight: bold">' . number_format($record['total_price'], 2, ',', '.') . '</td>';
        echo '<td>' . htmlspecialchars($record['frn']) . '</td>';
        echo '<td>' . htmlspecialchars($record['customer']) . '</td>';
        echo '<td>' . htmlspecialchars($record['project_name']) . '</td>';
        echo '<td>' . htmlspecialchars($record['location']) . '</td>';
        echo '<td>' . htmlspecialchars($record['created_by_name']) . '</td>';
        echo '<td>' . htmlspecialchars($record['created_at']) . '</td>';
        echo '</tr>';
    }
    
    // Summary row
    echo '<tr style="background-color: #4472C4; color: white; font-weight: bold;">';
    echo '<td colspan="9">TOPLAM</td>';
    echo '<td style="text-align: right">' . number_format($totalSavings + $totalCostAvoidance, 2, ',', '.') . '</td>';
    echo '<td colspan="6">';
    echo 'Tasarruf: ' . number_format($totalSavings, 2, ',', '.') . ' | ';
    echo 'Maliyet Kaçınma: ' . number_format($totalCostAvoidance, 2, ',', '.');
    echo '</td>';
    echo '</tr>';
    
    echo '</table>';
    echo '</body></html>';

} catch (Exception $e) {
    error_log("Excel export error: " . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'Excel export failed: ' . $e->getMessage()
    ]);
}
?>