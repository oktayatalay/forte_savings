<?php
// Minimal test - Use proper database connection
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    // Use proper database connection
    $pdo = getDBConnection();
    
    // Raw query - no middleware, no includes
    $sql = "SELECT 
        sr.id,
        sr.project_id,
        sr.type,
        sr.total_price,
        sr.created_by,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name
        FROM savings_records sr
        INNER JOIN users u ON u.id = sr.created_by
        WHERE sr.project_id = 1
        ORDER BY sr.id";
    
    $stmt = $pdo->query($sql);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'raw_query_result_count' => count($records),
        'records' => $records,
        'specific_record_1_exists' => array_filter($records, fn($r) => $r['id'] == 1) ? true : false,
        'debug_info' => [
            'php_version' => PHP_VERSION,
            'memory_usage' => memory_get_usage(true),
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>