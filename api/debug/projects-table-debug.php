<?php
header('Content-Type: application/json');
require_once '../config/database.php';
require_once '../auth/middleware.php';

try {
    $auth_data = requireUserOrAbove();
    $user_id = $auth_data['user_id'];
    $user_role = $auth_data['role'];
    
    $pdo = getDBConnection();
    
    // Base WHERE clause
    $base_where = "WHERE p.is_active = TRUE";
    
    if ($user_role !== 'admin') {
        $base_where .= " AND (
            p.created_by = :user_id OR 
            EXISTS (
                SELECT 1 FROM project_permissions pp 
                WHERE pp.project_id = p.id AND pp.user_id = :user_id2
            )
        )";
    }
    
    // Query parameters
    $query_params = [];
    if ($user_role !== 'admin') {
        $query_params['user_id'] = $user_id;
        $query_params['user_id2'] = $user_id;
    }
    
    // Test different calculation methods
    $sql = "SELECT 
        p.id, 
        p.frn, 
        p.project_name,
        
        -- Current API calculations (should be fixed)
        (SELECT COALESCE(SUM(CASE WHEN sr.type = 'Savings' THEN sr.total_price ELSE 0 END), 0) FROM (SELECT DISTINCT id, project_id, type, total_price FROM savings_records) sr WHERE sr.project_id = p.id) as actual_savings,
        (SELECT COALESCE(SUM(CASE WHEN sr.type = 'Cost Avoidance' THEN sr.total_price ELSE 0 END), 0) FROM (SELECT DISTINCT id, project_id, type, total_price FROM savings_records) sr WHERE sr.project_id = p.id) as cost_avoidance,
        
        -- Manual calculation for comparison
        (SELECT GROUP_CONCAT(CONCAT(sr.id, ':', sr.type, ':', sr.total_price) SEPARATOR '|') FROM savings_records sr WHERE sr.project_id = p.id) as raw_records_debug,
        
        -- Projects table stored value
        p.total_savings as stored_total_savings
        
        FROM projects p 
        {$base_where}
        ORDER BY p.id
        LIMIT 5";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($query_params);
    $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Process each project for detailed analysis
    foreach ($projects as &$project) {
        $project_id = $project['id'];
        
        // Get detailed breakdown per project
        $detail_sql = "SELECT 
            id, type, currency, total_price, 
            CASE WHEN type = 'Savings' THEN total_price ELSE 0 END as savings_amount,
            CASE WHEN type = 'Cost Avoidance' THEN total_price ELSE 0 END as cost_avoidance_amount
            FROM savings_records 
            WHERE project_id = ?
            ORDER BY id";
        
        $detail_stmt = $pdo->prepare($detail_sql);
        $detail_stmt->execute([$project_id]);
        $details = $detail_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Manual calculation
        $manual_savings = 0;
        $manual_cost_avoidance = 0;
        
        foreach ($details as $detail) {
            if ($detail['type'] === 'Savings') {
                $manual_savings += floatval($detail['total_price']);
            } else {
                $manual_cost_avoidance += floatval($detail['total_price']);
            }
        }
        
        $project['manual_savings'] = $manual_savings;
        $project['manual_cost_avoidance'] = $manual_cost_avoidance;
        $project['detailed_records'] = $details;
        
        // Convert to float for comparison
        $project['actual_savings'] = floatval($project['actual_savings']);
        $project['cost_avoidance'] = floatval($project['cost_avoidance']);
        
        // Check if calculations match
        $project['calculations_match'] = [
            'savings_match' => abs($project['actual_savings'] - $manual_savings) < 0.01,
            'cost_avoidance_match' => abs($project['cost_avoidance'] - $manual_cost_avoidance) < 0.01
        ];
    }
    
    echo json_encode([
        'projects' => $projects,
        'user_role' => $user_role,
        'user_id' => $user_id
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>