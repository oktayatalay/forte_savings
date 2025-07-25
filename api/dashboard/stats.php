<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../auth/middleware.php';

header('Content-Type: application/json');

try {
    // Sadece GET method
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Only GET method allowed']);
        exit;
    }
    
    // Authentication - Tüm kullanıcılar kendi istatistiklerini görebilir
    $auth_data = requireUserOrAbove();
    $user_id = $auth_data['user_id'];
    $user_role = $auth_data['role'];
    
    $pdo = getDBConnection();
    
    // Kullanıcının erişebileceği projeleri belirle
    if ($user_role === 'admin') {
        // Admin tüm projeleri görebilir
        $project_condition = "1=1";
        $project_params = [];
    } else {
        // Normal kullanıcı sadece sahip olduğu + CC olduğu projeleri görebilir
        $project_condition = "(p.created_by = ? OR EXISTS(
            SELECT 1 FROM project_permissions pp 
            WHERE pp.project_id = p.id 
            AND pp.user_id = ? 
            AND pp.permission_type IN ('owner', 'cc')
        ))";
        $project_params = [$user_id, $user_id];
    }
    
    // 1. Proje İstatistikleri
    $project_stats_sql = "SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN p.group_out >= CURDATE() THEN 1 END) as active_projects,
        COUNT(CASE WHEN YEAR(p.created_at) = YEAR(CURDATE()) THEN 1 END) as projects_this_year,
        COUNT(CASE WHEN MONTH(p.created_at) = MONTH(CURDATE()) AND YEAR(p.created_at) = YEAR(CURDATE()) THEN 1 END) as projects_this_month
        FROM projects p 
        WHERE p.is_active = TRUE AND " . $project_condition;
    
    $project_stats_stmt = $pdo->prepare($project_stats_sql);
    $project_stats_stmt->execute($project_params);
    $project_stats = $project_stats_stmt->fetch(PDO::FETCH_ASSOC);
    
    // 2. Tasarruf İstatistikleri (Currency bazında)
    $savings_stats_sql = "SELECT 
        sr.currency,
        sr.type,
        COALESCE(SUM(sr.total_price), 0) as total_amount,
        COUNT(sr.id) as record_count
        FROM projects p 
        LEFT JOIN savings_records sr ON p.id = sr.project_id
        WHERE p.is_active = TRUE AND sr.id IS NOT NULL AND " . $project_condition . "
        GROUP BY sr.currency, sr.type
        ORDER BY sr.currency, sr.type";
    
    $savings_stats_stmt = $pdo->prepare($savings_stats_sql);
    $savings_stats_stmt->execute($project_params);
    $raw_savings_stats = $savings_stats_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Currency bazında organize et
    $savings_by_currency = [];
    $total_records = 0;
    
    foreach ($raw_savings_stats as $stat) {
        $currency = $stat['currency'];
        $type = $stat['type'];
        $amount = floatval($stat['total_amount']);
        $count = intval($stat['record_count']);
        
        if (!isset($savings_by_currency[$currency])) {
            $savings_by_currency[$currency] = [
                'currency' => $currency,
                'savings' => 0,
                'cost_avoidance' => 0,
                'total' => 0,
                'record_count' => 0
            ];
        }
        
        if ($type === 'Savings') {
            $savings_by_currency[$currency]['savings'] = $amount;
        } else {
            $savings_by_currency[$currency]['cost_avoidance'] = $amount;
        }
        
        $savings_by_currency[$currency]['total'] += $amount;
        $savings_by_currency[$currency]['record_count'] += $count;
        $total_records += $count;
    }
    
    // 3. Son Aktiviteler (Son 10 işlem)
    $recent_activities_sql = "SELECT 
        'project_created' as activity_type,
        p.id as project_id,
        p.frn,
        p.project_name,
        p.customer,
        p.created_at as activity_date,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        'Yeni proje oluşturuldu' as activity_description
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.is_active = TRUE AND " . $project_condition . "
        
        UNION ALL
        
        SELECT 
        'savings_record_created' as activity_type,
        p.id as project_id,
        p.frn,
        p.project_name,
        p.customer,
        sr.created_at as activity_date,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        CONCAT(sr.type, ' kaydı eklendi: ', FORMAT(sr.total_price, 2), ' ', sr.currency) as activity_description
        FROM savings_records sr
        JOIN projects p ON sr.project_id = p.id
        LEFT JOIN users u ON sr.created_by = u.id
        WHERE p.is_active = TRUE AND " . $project_condition . "
        
        ORDER BY activity_date DESC
        LIMIT 10";
    
    $recent_activities_stmt = $pdo->prepare($recent_activities_sql);
    // Union query için parametreleri iki kez geçmek gerekiyor
    $union_params = array_merge($project_params, $project_params);
    $recent_activities_stmt->execute($union_params);
    $recent_activities = $recent_activities_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 4. Bu Ayın Top Projeleri (En çok tasarruf sağlayan)
    $top_projects_sql = "SELECT 
        p.id,
        p.frn,
        p.project_name,
        p.customer,
        p.total_savings,
        COUNT(sr.id) as records_count
        FROM projects p
        LEFT JOIN savings_records sr ON p.id = sr.project_id 
            AND MONTH(sr.created_at) = MONTH(CURDATE()) 
            AND YEAR(sr.created_at) = YEAR(CURDATE())
        WHERE p.is_active = TRUE AND " . $project_condition . "
        GROUP BY p.id, p.frn, p.project_name, p.customer, p.total_savings
        HAVING p.total_savings > 0
        ORDER BY p.total_savings DESC
        LIMIT 5";
    
    $top_projects_stmt = $pdo->prepare($top_projects_sql);
    $top_projects_stmt->execute($project_params);
    $top_projects = $top_projects_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Response formatla
    $stats = [
        'projects' => [
            'total' => intval($project_stats['total_projects']),
            'active' => intval($project_stats['active_projects']),
            'this_year' => intval($project_stats['projects_this_year']),
            'this_month' => intval($project_stats['projects_this_month'])
        ],
        'savings' => [
            'by_currency' => array_values($savings_by_currency),
            'total_records' => $total_records,
            // Backward compatibility için ana currency (TRY) bilgisi
            'primary_currency_total' => isset($savings_by_currency['TRY']) ? $savings_by_currency['TRY']['total'] : 0
        ],
        'recent_activities' => array_map(function($activity) {
            return [
                'activity_type' => $activity['activity_type'],
                'project_id' => intval($activity['project_id']),
                'frn' => $activity['frn'],
                'project_name' => $activity['project_name'],
                'customer' => $activity['customer'],
                'activity_date' => date('Y-m-d H:i:s', strtotime($activity['activity_date'])),
                'user_name' => $activity['user_name'],
                'activity_description' => $activity['activity_description'],
                'formatted_date' => date('d.m.Y H:i', strtotime($activity['activity_date']))
            ];
        }, $recent_activities),
        'top_projects' => array_map(function($project) {
            return [
                'id' => intval($project['id']),
                'frn' => $project['frn'],
                'project_name' => $project['project_name'],
                'customer' => $project['customer'],
                'total_savings' => floatval($project['total_savings']),
                'records_count' => intval($project['records_count'])
            ];
        }, $top_projects)
    ];
    
    echo json_encode([
        'success' => true,
        'data' => $stats,
        'user_role' => $user_role,
        'generated_at' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    error_log("Dashboard stats error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>