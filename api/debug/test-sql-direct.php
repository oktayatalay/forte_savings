<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    $project_id = 1;
    
    // Test exact same SQL as detail.php
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
    
    // Test duplicate cleaning logic
    $unique_records = [];
    $seen_ids = [];
    foreach ($savings_records as $record) {
        if (!in_array($record['id'], $seen_ids)) {
            $unique_records[] = $record;
            $seen_ids[] = $record['id'];
        }
    }
    
    echo json_encode([
        'sql_query' => $savings_sql,
        'sql_returned_count' => count($savings_records),
        'sql_results' => array_map(function($r) {
            return ['id' => $r['id'], 'amount' => $r['total_price'], 'created_by' => $r['created_by_name']];
        }, $savings_records),
        'after_cleaning_count' => count($unique_records),
        'cleaned_results' => array_map(function($r) {
            return ['id' => $r['id'], 'amount' => $r['total_price'], 'created_by' => $r['created_by_name']];
        }, $unique_records),
        'duplicates_removed' => count($savings_records) - count($unique_records)
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>