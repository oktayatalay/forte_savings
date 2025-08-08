<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    $project_id = $_GET['project_id'] ?? 3; // Default to project 3
    
    // Get raw records exactly as the API does
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
        (SELECT CONCAT(u.first_name, ' ', u.last_name) 
         FROM users u 
         WHERE u.id = sr.created_by 
         LIMIT 1) as created_by_name
        FROM savings_records sr
        WHERE sr.project_id = ?
        ORDER BY sr.date DESC, sr.created_at DESC";
    
    $savings_stmt = $pdo->prepare($savings_sql);
    $savings_stmt->execute([$project_id]);
    $raw_records = $savings_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Process exactly like in the API
    $processed_records = [];
    foreach ($raw_records as $record) {
        $processed_records[] = [
            'id' => intval($record['id']),
            'project_id' => intval($record['project_id']),
            'date' => date('Y-m-d', strtotime($record['date'])),
            'type' => $record['type'],
            'explanation_category' => $record['explanation_category'],
            'explanation_custom' => $record['explanation_custom'],
            'category' => $record['category'],
            'price' => floatval($record['price']),
            'unit' => intval($record['unit']),
            'currency' => $record['currency'],
            'total_price' => floatval($record['total_price']),
            'created_by' => intval($record['created_by']),
            'created_at' => date('Y-m-d H:i:s', strtotime($record['created_at'])),
            'updated_at' => date('Y-m-d H:i:s', strtotime($record['updated_at'])),
            'created_by_name' => $record['created_by_name']
        ];
    }
    
    // Analysis
    $all_ids = array_column($processed_records, 'id');
    $unique_ids = array_unique($all_ids);
    $has_duplicates = count($all_ids) !== count($unique_ids);
    
    $response = [
        'project_id' => $project_id,
        'total_records' => count($processed_records),
        'unique_ids_count' => count($unique_ids),
        'has_duplicates' => $has_duplicates,
        'all_ids' => $all_ids,
        'unique_ids' => array_values($unique_ids),
        'last_3_records' => array_slice($processed_records, -3),
        'records' => $processed_records
    ];
    
    if ($has_duplicates) {
        $duplicate_ids = array_diff_assoc($all_ids, array_unique($all_ids));
        $response['duplicate_ids'] = array_values(array_unique($duplicate_ids));
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>