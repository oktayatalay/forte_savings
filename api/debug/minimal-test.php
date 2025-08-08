<?php
// Minimal test - No includes, no middleware, just raw database query
header('Content-Type: application/json');

try {
    // Database connection
    $servername = "localhost";
    $username = "fortetou_user";  
    $password = "fortetour2024!";
    $dbname = "fortetou_savings";
    
    $pdo = new PDO("mysql:host=$servername;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
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