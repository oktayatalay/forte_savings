<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    
    // Test different ORDER BY clauses
    $queries = [
        'by_id' => "SELECT sr.id, sr.date, sr.created_at, sr.total_price, CONCAT(u.first_name, ' ', u.last_name) as created_by_name
                   FROM savings_records sr
                   INNER JOIN users u ON u.id = sr.created_by
                   WHERE sr.project_id = 1
                   ORDER BY sr.id",
                   
        'by_date_desc' => "SELECT sr.id, sr.date, sr.created_at, sr.total_price, CONCAT(u.first_name, ' ', u.last_name) as created_by_name
                          FROM savings_records sr
                          INNER JOIN users u ON u.id = sr.created_by
                          WHERE sr.project_id = 1
                          ORDER BY sr.date DESC, sr.created_at DESC",
                          
        'date_comparison' => "SELECT 
                             sr.id, 
                             sr.date,
                             sr.date IS NULL as date_is_null,
                             sr.date = '0000-00-00' as date_is_zero,
                             STR_TO_DATE(sr.date, '%Y-%m-%d') IS NULL as date_invalid,
                             sr.created_at,
                             sr.total_price,
                             CONCAT(u.first_name, ' ', u.last_name) as created_by_name
                             FROM savings_records sr
                             INNER JOIN users u ON u.id = sr.created_by
                             WHERE sr.project_id = 1
                             ORDER BY sr.id"
    ];
    
    $results = [];
    
    foreach ($queries as $name => $sql) {
        $stmt = $pdo->query($sql);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $results[$name] = [
            'count' => count($records),
            'records' => $records,
            'has_system_admin' => array_filter($records, fn($r) => $r['id'] == 1) ? true : false
        ];
    }
    
    echo json_encode($results, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>