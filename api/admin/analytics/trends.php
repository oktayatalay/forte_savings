<?php
/**
 * Admin Analytics - Savings Trends API
 * GET /api/admin/analytics/trends.php
 * 
 * Returns detailed savings trends and growth analytics
 */

require_once __DIR__ . '/../../security/SecurityMiddleware.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

try {
    // Initialize security and authenticate admin
    SecurityMiddleware::setupAPI(['GET', 'OPTIONS']);
    $currentUser = SecurityMiddleware::authenticate(['admin', 'super_admin']);
    
    // Validate input parameters
    $validationRules = [
        'period' => ['type' => 'text', 'allowed_chars' => '/^(7d|30d|90d|6m|1y|2y)$/', 'required' => false],
        'granularity' => ['type' => 'text', 'allowed_chars' => '/^(daily|weekly|monthly|quarterly)$/', 'required' => false],
        'type' => ['type' => 'text', 'allowed_chars' => '/^(savings|projects|users|all)$/', 'required' => false],
        'department' => ['type' => 'text', 'max_length' => 100, 'required' => false],
        'category' => ['type' => 'text', 'max_length' => 100, 'required' => false]
    ];
    
    $filters = SecurityMiddleware::validateInput($_GET, $validationRules);
    
    $period = $filters['period'] ?? '90d';
    $granularity = $filters['granularity'] ?? 'monthly';
    $type = $filters['type'] ?? 'all';
    $department = $filters['department'] ?? null;
    $category = $filters['category'] ?? null;
    
    // Calculate date range and grouping
    $dateWhere = '';
    $dateFormat = '';
    $intervalDays = 90;
    
    switch ($period) {
        case '7d':
            $dateWhere = "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            $intervalDays = 7;
            break;
        case '30d':
            $dateWhere = "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            $intervalDays = 30;
            break;
        case '90d':
            $dateWhere = "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
            $intervalDays = 90;
            break;
        case '6m':
            $dateWhere = "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)";
            $intervalDays = 180;
            break;
        case '1y':
            $dateWhere = "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
            $intervalDays = 365;
            break;
        case '2y':
            $dateWhere = "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 2 YEAR)";
            $intervalDays = 730;
            break;
    }
    
    // Determine appropriate granularity if not specified
    if (!isset($filters['granularity'])) {
        if ($intervalDays <= 7) {
            $granularity = 'daily';
        } elseif ($intervalDays <= 90) {
            $granularity = 'weekly';
        } else {
            $granularity = 'monthly';
        }
    }
    
    // Set date format based on granularity
    switch ($granularity) {
        case 'daily':
            $dateFormat = '%Y-%m-%d';
            break;
        case 'weekly':
            $dateFormat = '%Y-%u';
            break;
        case 'monthly':
            $dateFormat = '%Y-%m';
            break;
        case 'quarterly':
            $dateFormat = '%Y-Q%q';
            break;
    }
    
    // Build filter conditions
    $filterWhere = '';
    $filterParams = [];
    
    if ($department) {
        $filterWhere .= " AND (p.forte_responsible LIKE ? OR p.project_director LIKE ?)";
        $filterParams = array_merge($filterParams, ["%{$department}%", "%{$department}%"]);
    }
    
    if ($category) {
        $filterWhere .= " AND sr.category = ?";
        $filterParams[] = $category;
    }
    
    // Main trends query
    $trendsQuery = "
        SELECT 
            DATE_FORMAT(sr.created_at, '$dateFormat') as period,
            COUNT(DISTINCT sr.id) as total_records,
            COUNT(DISTINCT p.id) as unique_projects,
            COUNT(DISTINCT sr.created_by) as active_users,
            SUM(sr.total_price) as total_savings,
            AVG(sr.total_price) as avg_savings,
            SUM(CASE WHEN sr.type = 'Savings' THEN sr.total_price ELSE 0 END) as direct_savings,
            SUM(CASE WHEN sr.type = 'Cost Avoidance' THEN sr.total_price ELSE 0 END) as cost_avoidance
        FROM savings_records sr
        JOIN projects p ON sr.project_id = p.id
        WHERE p.is_active = 1 $dateWhere $filterWhere
        GROUP BY DATE_FORMAT(sr.created_at, '$dateFormat')
        ORDER BY period
    ";
    
    $trendsStmt = $pdo->prepare($trendsQuery);
    $trendsStmt->execute($filterParams);
    $trends = $trendsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calculate period-over-period growth
    $trendsWithGrowth = [];
    $prevTotal = 0;
    
    foreach ($trends as $i => $trend) {
        $trend['total_records'] = (int)$trend['total_records'];
        $trend['unique_projects'] = (int)$trend['unique_projects'];
        $trend['active_users'] = (int)$trend['active_users'];
        $trend['total_savings'] = (float)$trend['total_savings'];
        $trend['avg_savings'] = (float)$trend['avg_savings'];
        $trend['direct_savings'] = (float)$trend['direct_savings'];
        $trend['cost_avoidance'] = (float)$trend['cost_avoidance'];
        
        // Calculate growth rate
        if ($i > 0 && $prevTotal > 0) {
            $trend['growth_rate'] = (($trend['total_savings'] - $prevTotal) / $prevTotal) * 100;
        } else {
            $trend['growth_rate'] = 0;
        }
        
        $trend['growth_rate'] = round($trend['growth_rate'], 1);
        $prevTotal = $trend['total_savings'];
        
        $trendsWithGrowth[] = $trend;
    }
    
    // Category trends
    $categoryTrendsQuery = "
        SELECT 
            sr.category,
            DATE_FORMAT(sr.created_at, '$dateFormat') as period,
            SUM(sr.total_price) as savings,
            COUNT(*) as records
        FROM savings_records sr
        JOIN projects p ON sr.project_id = p.id
        WHERE p.is_active = 1 $dateWhere $filterWhere
        GROUP BY sr.category, DATE_FORMAT(sr.created_at, '$dateFormat')
        ORDER BY period, savings DESC
    ";
    
    $categoryTrendsStmt = $pdo->prepare($categoryTrendsQuery);
    $categoryTrendsStmt->execute($filterParams);
    $categoryTrends = $categoryTrendsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Organize category trends by period
    $categoryTrendsByPeriod = [];
    foreach ($categoryTrends as $trend) {
        $period = $trend['period'];
        if (!isset($categoryTrendsByPeriod[$period])) {
            $categoryTrendsByPeriod[$period] = [];
        }
        $categoryTrendsByPeriod[$period][] = [
            'category' => $trend['category'],
            'savings' => (float)$trend['savings'],
            'records' => (int)$trend['records']
        ];
    }
    
    // Department trends
    $deptTrendsQuery = "
        SELECT 
            COALESCE(u.department, 'Unassigned') as department,
            DATE_FORMAT(sr.created_at, '$dateFormat') as period,
            SUM(sr.total_price) as savings,
            COUNT(DISTINCT p.id) as projects
        FROM savings_records sr
        JOIN projects p ON sr.project_id = p.id
        LEFT JOIN users u ON sr.created_by = u.id
        WHERE p.is_active = 1 $dateWhere $filterWhere
        GROUP BY u.department, DATE_FORMAT(sr.created_at, '$dateFormat')
        ORDER BY period, savings DESC
    ";
    
    $deptTrendsStmt = $pdo->prepare($deptTrendsQuery);
    $deptTrendsStmt->execute($filterParams);
    $departmentTrends = $deptTrendsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Project type trends
    $projectTypeTrendsQuery = "
        SELECT 
            p.project_type,
            DATE_FORMAT(sr.created_at, '$dateFormat') as period,
            SUM(sr.total_price) as savings,
            COUNT(DISTINCT p.id) as projects,
            AVG(sr.total_price) as avg_savings_per_record
        FROM savings_records sr
        JOIN projects p ON sr.project_id = p.id
        WHERE p.is_active = 1 $dateWhere $filterWhere
        GROUP BY p.project_type, DATE_FORMAT(sr.created_at, '$dateFormat')
        ORDER BY period, savings DESC
    ";
    
    $projectTypeTrendsStmt = $pdo->prepare($projectTypeTrendsQuery);
    $projectTypeTrendsStmt->execute($filterParams);
    $projectTypeTrends = $projectTypeTrendsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Performance metrics
    $performanceQuery = "
        SELECT 
            COUNT(DISTINCT p.id) as total_projects,
            COUNT(DISTINCT sr.created_by) as contributing_users,
            COUNT(sr.id) as total_records,
            SUM(sr.total_price) as total_value,
            AVG(sr.total_price) as avg_record_value,
            MAX(sr.total_price) as max_record_value,
            MIN(sr.total_price) as min_record_value,
            STDDEV(sr.total_price) as value_std_dev
        FROM savings_records sr
        JOIN projects p ON sr.project_id = p.id
        WHERE p.is_active = 1 $dateWhere $filterWhere
    ";
    
    $performanceStmt = $pdo->prepare($performanceQuery);
    $performanceStmt->execute($filterParams);
    $performance = $performanceStmt->fetch(PDO::FETCH_ASSOC);
    
    // Top performers in the period
    $topPerformersQuery = "
        SELECT 
            CONCAT(u.first_name, ' ', u.last_name) as user_name,
            u.department,
            COUNT(DISTINCT p.id) as projects_contributed,
            COUNT(sr.id) as total_records,
            SUM(sr.total_price) as total_contribution,
            AVG(sr.total_price) as avg_contribution
        FROM savings_records sr
        JOIN projects p ON sr.project_id = p.id
        JOIN users u ON sr.created_by = u.id
        WHERE p.is_active = 1 $dateWhere $filterWhere
        GROUP BY u.id, u.first_name, u.last_name, u.department
        ORDER BY total_contribution DESC
        LIMIT 10
    ";
    
    $topPerformersStmt = $pdo->prepare($topPerformersQuery);
    $topPerformersStmt->execute($filterParams);
    $topPerformers = $topPerformersStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format top performers data
    foreach ($topPerformers as &$performer) {
        $performer['projects_contributed'] = (int)$performer['projects_contributed'];
        $performer['total_records'] = (int)$performer['total_records'];
        $performer['total_contribution'] = (float)$performer['total_contribution'];
        $performer['avg_contribution'] = (float)$performer['avg_contribution'];
    }
    
    // Predictions (simple linear regression on last 6 points)
    $predictions = [];
    if (count($trendsWithGrowth) >= 3) {
        $recentTrends = array_slice($trendsWithGrowth, -6);
        $xValues = range(1, count($recentTrends));
        $yValues = array_column($recentTrends, 'total_savings');
        
        $slope = calculateSlope($xValues, $yValues);
        $intercept = calculateIntercept($xValues, $yValues, $slope);
        
        // Predict next 3 periods
        for ($i = 1; $i <= 3; $i++) {
            $nextX = count($recentTrends) + $i;
            $predictions[] = [
                'period_offset' => $i,
                'predicted_savings' => max(0, $slope * $nextX + $intercept),
                'confidence' => max(0.6, 1 - ($i * 0.15)) // Decreasing confidence
            ];
        }
    }
    
    // Log analytics request
    $auditQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $auditStmt = $pdo->prepare($auditQuery);
    $auditStmt->execute([
        $currentUser['id'],
        'admin_analytics_trends',
        'analytics',
        0,
        json_encode($filters),
        $_SERVER['REMOTE_ADDR'] ?? null,
        $_SERVER['HTTP_USER_AGENT'] ?? null
    ]);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'trends' => $trendsWithGrowth,
            'categoryTrends' => $categoryTrendsByPeriod,
            'departmentTrends' => $departmentTrends,
            'projectTypeTrends' => $projectTypeTrends,
            'performance' => [
                'total_projects' => (int)$performance['total_projects'],
                'contributing_users' => (int)$performance['contributing_users'],
                'total_records' => (int)$performance['total_records'],
                'total_value' => (float)$performance['total_value'],
                'avg_record_value' => (float)$performance['avg_record_value'],
                'max_record_value' => (float)$performance['max_record_value'],
                'min_record_value' => (float)$performance['min_record_value'],
                'value_std_dev' => (float)$performance['value_std_dev']
            ],
            'topPerformers' => $topPerformers,
            'predictions' => $predictions,
            'metadata' => [
                'period' => $period,
                'granularity' => $granularity,
                'type' => $type,
                'filters_applied' => [
                    'department' => $department,
                    'category' => $category
                ],
                'data_points' => count($trendsWithGrowth)
            ]
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => 'Trends data could not be retrieved',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    error_log("Analytics trends error: " . $e->getMessage());
}

/**
 * Helper functions for linear regression
 */
function calculateSlope($xValues, $yValues) {
    $n = count($xValues);
    $sumX = array_sum($xValues);
    $sumY = array_sum($yValues);
    $sumXY = 0;
    $sumXX = 0;
    
    for ($i = 0; $i < $n; $i++) {
        $sumXY += $xValues[$i] * $yValues[$i];
        $sumXX += $xValues[$i] * $xValues[$i];
    }
    
    return ($n * $sumXY - $sumX * $sumY) / ($n * $sumXX - $sumX * $sumX);
}

function calculateIntercept($xValues, $yValues, $slope) {
    $n = count($xValues);
    $sumX = array_sum($xValues);
    $sumY = array_sum($yValues);
    
    return ($sumY - $slope * $sumX) / $n;
}
?>