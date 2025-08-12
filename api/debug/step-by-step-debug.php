<?php
// Step by step debug - exactly same as detail.php but with debug output
header('Content-Type: application/json');
require_once '../config/database.php';
require_once '../auth/middleware.php';

try {
    $project_id = 1;
    $pdo = getDBConnection();
    
    // Exact same SQL as detail.php
    $savings_sql = "SELECT 
        sr.id,
        sr.project_id,
        sr.date,
        sr.type,
        sr.explanation_category,
        sr.explanation_custom,
        sr.category,
        sr.price,
        sr.unit,
        sr.currency,
        sr.total_price,
        sr.created_by,
        sr.created_at,
        sr.updated_at,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name
        FROM savings_records sr
        INNER JOIN users u ON u.id = sr.created_by
        WHERE sr.project_id = ?
        ORDER BY sr.date DESC, sr.created_at DESC";
    
    $savings_stmt = $pdo->prepare($savings_sql);
    $savings_stmt->execute([$project_id]);
    $savings_records = $savings_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $debug = [];
    $debug['step1_sql_result'] = [
        'count' => count($savings_records),
        'ids' => array_column($savings_records, 'id')
    ];
    
    // Exact same formatting as detail.php
    foreach ($savings_records as &$record) {
        $record['date'] = date('Y-m-d', strtotime($record['date']));
        $record['created_at'] = date('Y-m-d H:i:s', strtotime($record['created_at']));
        $record['updated_at'] = date('Y-m-d H:i:s', strtotime($record['updated_at']));
        $record['price'] = floatval($record['price']);
        $record['unit'] = intval($record['unit']);
        $record['total_price'] = floatval($record['total_price']);
    }
    
    $debug['step2_after_formatting'] = [
        'count' => count($savings_records),
        'ids' => array_column($savings_records, 'id')
    ];
    
    // Exact same duplicate cleaning as detail.php
    $unique_records = [];
    $seen_ids = [];
    foreach ($savings_records as $record) {
        if (!in_array($record['id'], $seen_ids)) {
            $unique_records[] = $record;
            $seen_ids[] = $record['id'];
        }
    }
    
    if (count($savings_records) !== count($unique_records)) {
        $debug['duplicates_found'] = count($savings_records) - count($unique_records);
    }
    
    $savings_records = $unique_records;
    
    $debug['step3_after_cleaning'] = [
        'count' => count($savings_records),
        'ids' => array_column($savings_records, 'id')
    ];
    
    // Check if System Admin record exists at each step
    $debug['system_admin_tracking'] = [
        'id_1_exists_after_sql' => in_array(1, $debug['step1_sql_result']['ids']),
        'id_1_exists_after_formatting' => in_array(1, $debug['step2_after_formatting']['ids']),
        'id_1_exists_after_cleaning' => in_array(1, $debug['step3_after_cleaning']['ids'])
    ];
    
    echo json_encode([
        'debug_steps' => $debug,
        'final_records' => array_map(function($r) {
            return ['id' => $r['id'], 'created_by_name' => $r['created_by_name']];
        }, $savings_records)
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>