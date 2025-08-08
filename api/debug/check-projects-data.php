<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    
    // FRN-2025-001 projesinin ID'sini bul
    $project_sql = "SELECT id, frn FROM projects WHERE frn = 'FRN-2025-001'";
    $stmt = $pdo->query($project_sql);
    $project = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$project) {
        echo json_encode(['error' => 'Project FRN-2025-001 not found']);
        exit;
    }
    
    $project_id = $project['id'];
    
    // Bu projede kayıtlı savings_records'ları göster
    $records_sql = "SELECT id, currency, type, total_price, date FROM savings_records WHERE project_id = ?";
    $stmt = $pdo->prepare($records_sql);
    $stmt->execute([$project_id]);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Currency bazında hesaplama yap (detail.php mantığı)
    $stats_by_currency = [];
    foreach ($records as $record) {
        $currency = $record['currency'];
        $type = $record['type'];
        $amount = floatval($record['total_price']);
        
        if (!isset($stats_by_currency[$currency])) {
            $stats_by_currency[$currency] = [
                'currency' => $currency,
                'savings' => 0,
                'cost_avoidance' => 0,
                'total' => 0,
                'record_count' => 0
            ];
        }
        
        if ($type === 'Savings') {
            $stats_by_currency[$currency]['savings'] += $amount;
        } else {
            $stats_by_currency[$currency]['cost_avoidance'] += $amount;
        }
        
        $stats_by_currency[$currency]['total'] += $amount;
        $stats_by_currency[$currency]['record_count']++;
    }
    
    echo json_encode([
        'project_id' => $project_id,
        'frn' => $project['frn'],
        'raw_records' => $records,
        'calculated_stats' => array_values($stats_by_currency),
        'debug' => [
            'total_records' => count($records),
            'expected_savings_TRY' => isset($stats_by_currency['TRY']) ? $stats_by_currency['TRY']['savings'] : 0
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>