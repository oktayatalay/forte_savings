<?php
header('Content-Type: application/json');
require_once '../config/database.php';
require_once '../auth/middleware.php';

try {
    $auth_data = requireUserOrAbove();
    $user_id = $auth_data['user_id'];
    $user_role = $auth_data['role'];
    
    $pdo = getDBConnection();
    
    // Kullanıcının erişebileceği projeleri belirle
    if ($user_role === 'admin') {
        $project_condition = "1=1";
        $project_params = [];
    } else {
        $project_condition = "(p.created_by = ? OR EXISTS(
            SELECT 1 FROM project_permissions pp 
            WHERE pp.project_id = p.id 
            AND pp.user_id = ? 
            AND pp.permission_type IN ('owner', 'cc')
        ))";
        $project_params = [$user_id, $user_id];
    }
    
    // Test different queries to see differences
    $result = [
        'user_role' => $user_role,
        'user_id' => $user_id,
        'queries' => []
    ];
    
    // 1. Raw savings records with potential duplicates
    $raw_sql = "SELECT 
        sr.id, sr.project_id, sr.currency, sr.type, sr.total_price
        FROM projects p 
        LEFT JOIN savings_records sr ON p.id = sr.project_id
        WHERE p.is_active = TRUE AND sr.id IS NOT NULL AND " . $project_condition . "
        ORDER BY sr.currency, sr.type, sr.id";
    
    $raw_stmt = $pdo->prepare($raw_sql);
    $raw_stmt->execute($project_params);
    $raw_records = $raw_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 2. DISTINCT query (what we're using now)
    $distinct_sql = "SELECT 
        sr.currency,
        sr.type,
        COALESCE(SUM(sr.total_price), 0) as total_amount,
        COUNT(sr.id) as record_count
        FROM projects p 
        LEFT JOIN (
            SELECT DISTINCT id, project_id, currency, type, total_price, created_at, created_by
            FROM savings_records
        ) sr ON p.id = sr.project_id
        WHERE p.is_active = TRUE AND sr.id IS NOT NULL AND " . $project_condition . "
        GROUP BY sr.currency, sr.type
        ORDER BY sr.currency, sr.type";
    
    $distinct_stmt = $pdo->prepare($distinct_sql);
    $distinct_stmt->execute($project_params);
    $distinct_records = $distinct_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 3. Old query (without DISTINCT) for comparison
    $old_sql = "SELECT 
        sr.currency,
        sr.type,
        COALESCE(SUM(sr.total_price), 0) as total_amount,
        COUNT(sr.id) as record_count
        FROM projects p 
        LEFT JOIN savings_records sr ON p.id = sr.project_id
        WHERE p.is_active = TRUE AND sr.id IS NOT NULL AND " . $project_condition . "
        GROUP BY sr.currency, sr.type
        ORDER BY sr.currency, sr.type";
    
    $old_stmt = $pdo->prepare($old_sql);
    $old_stmt->execute($project_params);
    $old_records = $old_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Analysis
    $raw_ids = array_column($raw_records, 'id');
    $unique_ids = array_unique($raw_ids);
    $has_duplicates = count($raw_ids) !== count($unique_ids);
    
    // Calculate totals manually from raw data
    $manual_totals = [];
    $seen_ids = [];
    foreach ($raw_records as $record) {
        if (!in_array($record['id'], $seen_ids)) {
            $seen_ids[] = $record['id'];
            $currency = $record['currency'];
            $type = $record['type'];
            $amount = floatval($record['total_price']);
            
            if (!isset($manual_totals[$currency])) {
                $manual_totals[$currency] = ['Savings' => 0, 'Cost Avoidance' => 0];
            }
            $manual_totals[$currency][$type] += $amount;
        }
    }
    
    $result['analysis'] = [
        'raw_records_count' => count($raw_records),
        'unique_ids_count' => count($unique_ids),
        'has_duplicates' => $has_duplicates,
        'duplicate_ids' => $has_duplicates ? array_diff($raw_ids, $unique_ids) : [],
        'manual_calculation' => $manual_totals
    ];
    
    $result['queries']['raw_records'] = $raw_records;
    $result['queries']['old_aggregated'] = $old_records;
    $result['queries']['new_distinct'] = $distinct_records;
    
    echo json_encode($result, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>