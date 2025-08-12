<?php
// Debug duplicate cleaning step in detail
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $project_id = 1;
    $pdo = getDBConnection();
    
    // Get same records as detail.php
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
    
    // Apply formatting
    foreach ($savings_records as &$record) {
        $record['date'] = date('Y-m-d', strtotime($record['date']));
        $record['created_at'] = date('Y-m-d H:i:s', strtotime($record['created_at']));
        $record['updated_at'] = date('Y-m-d H:i:s', strtotime($record['updated_at']));
        $record['price'] = floatval($record['price']);
        $record['unit'] = intval($record['unit']);
        $record['total_price'] = floatval($record['total_price']);
    }
    
    // Debug duplicate cleaning step by step
    $debug = [];
    $debug['original_records'] = array_map(function($r) {
        return ['id' => $r['id'], 'created_by_name' => $r['created_by_name']];
    }, $savings_records);
    
    // Check for actual duplicates
    $all_ids = array_column($savings_records, 'id');
    $unique_ids = array_unique($all_ids);
    $actual_duplicates = array_diff_assoc($all_ids, $unique_ids);
    
    $debug['duplicate_analysis'] = [
        'all_ids' => $all_ids,
        'unique_ids' => $unique_ids, 
        'actual_duplicates' => $actual_duplicates,
        'has_real_duplicates' => count($all_ids) !== count($unique_ids)
    ];
    
    // Trace the cleaning logic
    $unique_records = [];
    $seen_ids = [];
    $cleaning_trace = [];
    
    foreach ($savings_records as $index => $record) {
        $cleaning_trace[] = [
            'processing_index' => $index,
            'record_id' => $record['id'],
            'seen_ids_before' => array_values($seen_ids),
            'is_duplicate' => in_array($record['id'], $seen_ids),
            'action' => in_array($record['id'], $seen_ids) ? 'SKIP_DUPLICATE' : 'ADD_TO_UNIQUE'
        ];
        
        if (!in_array($record['id'], $seen_ids)) {
            $unique_records[] = $record;
            $seen_ids[] = $record['id'];
        }
    }
    
    $debug['cleaning_trace'] = $cleaning_trace;
    $debug['final_result'] = [
        'original_count' => count($savings_records),
        'final_count' => count($unique_records),
        'removed_count' => count($savings_records) - count($unique_records),
        'final_ids' => array_column($unique_records, 'id')
    ];
    
    echo json_encode($debug, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>