<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $pdo = getDbConnection();
    $project_id = 1;
    
    // 1. Check the specific record mentioned (id=1, amount=29750₺)
    $record_check = $pdo->prepare("
        SELECT * FROM savings_records 
        WHERE project_id = ? AND id = 1
    ");
    $record_check->execute([$project_id]);
    $phantom_record = $record_check->fetch(PDO::FETCH_ASSOC);
    
    // 2. Get all records for project 1 (raw data)
    $all_records = $pdo->prepare("
        SELECT id, project_id, date, type, total_price, created_by, created_at, updated_at
        FROM savings_records 
        WHERE project_id = ?
        ORDER BY id
    ");
    $all_records->execute([$project_id]);
    $all_project_records = $all_records->fetchAll(PDO::FETCH_ASSOC);
    
    // 3. Test detail.php query exactly
    $detail_query = $pdo->prepare("SELECT 
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
        ORDER BY sr.date DESC, sr.created_at DESC");
    $detail_query->execute([$project_id]);
    $detail_results = $detail_query->fetchAll(PDO::FETCH_ASSOC);
    
    // 4. Test list-simple.php query exactly (for calculations)
    $list_calc_query = $pdo->prepare("
        SELECT currency, type, total_price 
        FROM savings_records 
        WHERE project_id = ?
    ");
    $list_calc_query->execute([$project_id]);
    $list_calc_results = $list_calc_query->fetchAll(PDO::FETCH_ASSOC);
    
    // 5. Calculate totals from both queries
    $detail_savings_total = 0;
    $list_savings_total = 0;
    
    foreach ($detail_results as $record) {
        if ($record['type'] === 'Savings') {
            $detail_savings_total += floatval($record['total_price']);
        }
    }
    
    foreach ($list_calc_results as $record) {
        if ($record['type'] === 'Savings') {
            $list_savings_total += floatval($record['total_price']);
        }
    }
    
    // 6. Check if there are any users with the created_by id
    if ($phantom_record) {
        $user_check = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $user_check->execute([$phantom_record['created_by']]);
        $user_exists = $user_check->fetch(PDO::FETCH_ASSOC);
    }
    
    $response = [
        'success' => true,
        'investigation' => [
            'phantom_record_exists' => !empty($phantom_record),
            'phantom_record_data' => $phantom_record,
            'phantom_record_user_exists' => isset($user_exists) ? !empty($user_exists) : 'N/A',
            'phantom_record_user_data' => $user_exists ?? null,
            'total_records_in_project' => count($all_project_records),
            'all_project_records' => $all_project_records,
            'detail_query_count' => count($detail_results),
            'list_query_count' => count($list_calc_results),
            'detail_savings_total' => $detail_savings_total,
            'list_savings_total' => $list_savings_total,
            'totals_match' => ($detail_savings_total == $list_savings_total),
            'detail_results' => $detail_results,
            'list_calc_results' => $list_calc_results
        ],
        'analysis' => [
            'records_missing_from_detail' => array_udiff($list_calc_results, $detail_results, function($a, $b) {
                return $a['total_price'] <=> $b['total_price'];
            }),
            'difference_in_total' => $list_savings_total - $detail_savings_total
        ]
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'line' => $e->getLine(),
        'file' => $e->getFile()
    ], JSON_PRETTY_PRINT);
}
?>