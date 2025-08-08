<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    
    $result = [];
    
    // Get all projects with their stored total_savings
    $projects_sql = "SELECT id, frn, project_name, total_savings FROM projects WHERE is_active = TRUE ORDER BY id";
    $projects_stmt = $pdo->prepare($projects_sql);
    $projects_stmt->execute();
    $projects = $projects_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($projects as $project) {
        $project_id = $project['id'];
        
        // Get actual calculated totals from savings_records
        $records_sql = "SELECT 
            currency,
            type,
            SUM(total_price) as actual_total,
            COUNT(*) as record_count
            FROM savings_records 
            WHERE project_id = ?
            GROUP BY currency, type
            ORDER BY currency, type";
        
        $records_stmt = $pdo->prepare($records_sql);
        $records_stmt->execute([$project_id]);
        $records = $records_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calculate actual totals by currency
        $actual_by_currency = [];
        $actual_total_all = 0;
        
        foreach ($records as $record) {
            $currency = $record['currency'];
            $type = $record['type'];
            $amount = floatval($record['actual_total']);
            
            if (!isset($actual_by_currency[$currency])) {
                $actual_by_currency[$currency] = [
                    'savings' => 0,
                    'cost_avoidance' => 0,
                    'total' => 0
                ];
            }
            
            if ($type === 'Savings') {
                $actual_by_currency[$currency]['savings'] = $amount;
            } else {
                $actual_by_currency[$currency]['cost_avoidance'] = $amount;
            }
            $actual_by_currency[$currency]['total'] += $amount;
            
            // For total_savings comparison (assuming it's TRY primary)
            if ($currency === 'TRY') {
                $actual_total_all += $amount;
            }
        }
        
        $result[] = [
            'project_id' => intval($project_id),
            'frn' => $project['frn'],
            'project_name' => $project['project_name'],
            'stored_total_savings' => floatval($project['total_savings']),
            'actual_by_currency' => $actual_by_currency,
            'actual_total_try' => $actual_total_all,
            'difference' => floatval($project['total_savings']) - $actual_total_all,
            'raw_records' => $records
        ];
    }
    
    // Get dashboard calculation for comparison
    $dashboard_sql = "SELECT 
        sr.currency,
        sr.type,
        SUM(sr.total_price) as dashboard_total
        FROM projects p 
        LEFT JOIN (
            SELECT DISTINCT id, project_id, currency, type, total_price
            FROM savings_records
        ) sr ON p.id = sr.project_id
        WHERE p.is_active = TRUE AND sr.id IS NOT NULL
        GROUP BY sr.currency, sr.type
        ORDER BY sr.currency, sr.type";
    
    $dashboard_stmt = $pdo->prepare($dashboard_sql);
    $dashboard_stmt->execute();
    $dashboard_totals = $dashboard_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'projects_analysis' => $result,
        'dashboard_totals' => $dashboard_totals,
        'summary' => [
            'total_projects' => count($result),
            'projects_with_mismatch' => count(array_filter($result, function($p) { 
                return abs($p['difference']) > 0.01; 
            }))
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>