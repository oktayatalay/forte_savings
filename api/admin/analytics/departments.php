<?php
/**
 * Admin Analytics - Department Performance API
 * GET /api/admin/analytics/departments.php
 * 
 * Returns department-wise performance data and comparisons
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
        'period' => ['type' => 'text', 'allowed_chars' => '/^(30d|90d|6m|1y|all)$/', 'required' => false],
        'department' => ['type' => 'text', 'max_length' => 100, 'required' => false],
        'metric' => ['type' => 'text', 'allowed_chars' => '/^(savings|projects|efficiency|growth)$/', 'required' => false],
        'compare_period' => ['type' => 'text', 'allowed_chars' => '/^(previous|year_ago)$/', 'required' => false]
    ];
    
    $filters = SecurityMiddleware::validateInput($_GET, $validationRules);
    
    $period = $filters['period'] ?? '90d';
    $targetDepartment = $filters['department'] ?? null;
    $metric = $filters['metric'] ?? 'savings';
    $comparePeriod = $filters['compare_period'] ?? 'previous';
    
    // Calculate date ranges
    $currentWhere = '';
    $compareWhere = '';
    
    switch ($period) {
        case '30d':
            $currentWhere = "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            $compareWhere = $comparePeriod === 'previous' 
                ? "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND sr.created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)"
                : "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR + INTERVAL 30 DAY) AND sr.created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)";
            break;
        case '90d':
            $currentWhere = "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
            $compareWhere = $comparePeriod === 'previous'
                ? "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 180 DAY) AND sr.created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)"
                : "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR + INTERVAL 90 DAY) AND sr.created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)";
            break;
        case '6m':
            $currentWhere = "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)";
            $compareWhere = $comparePeriod === 'previous'
                ? "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH) AND sr.created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH)"
                : "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 18 MONTH) AND sr.created_at < DATE_SUB(NOW(), INTERVAL 12 MONTH)";
            break;
        case '1y':
            $currentWhere = "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
            $compareWhere = "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 2 YEAR) AND sr.created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)";
            break;
        case 'all':
        default:
            $currentWhere = "";
            $compareWhere = "AND sr.created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)";
            break;
    }
    
    // Main department performance query
    $departmentQuery = "
        SELECT 
            COALESCE(u.department, 'Unassigned') as department,
            COUNT(DISTINCT u.id) as user_count,
            COUNT(DISTINCT p.id) as project_count,
            COUNT(DISTINCT sr.id) as savings_records,
            SUM(sr.total_price) as total_savings,
            AVG(sr.total_price) as avg_savings_per_record,
            SUM(sr.total_price) / COUNT(DISTINCT p.id) as avg_savings_per_project,
            SUM(sr.total_price) / COUNT(DISTINCT u.id) as avg_savings_per_user,
            MAX(sr.total_price) as highest_single_saving,
            MIN(sr.total_price) as lowest_single_saving,
            SUM(CASE WHEN sr.type = 'Savings' THEN sr.total_price ELSE 0 END) as direct_savings,
            SUM(CASE WHEN sr.type = 'Cost Avoidance' THEN sr.total_price ELSE 0 END) as cost_avoidance,
            
            -- Activity metrics
            COUNT(DISTINCT DATE(sr.created_at)) as active_days,
            MAX(sr.created_at) as last_activity,
            
            -- Efficiency metrics  
            COUNT(sr.id) / COUNT(DISTINCT p.id) as records_per_project,
            COUNT(sr.id) / COUNT(DISTINCT u.id) as records_per_user
            
        FROM users u
        LEFT JOIN savings_records sr ON sr.created_by = u.id
        LEFT JOIN projects p ON sr.project_id = p.id AND p.is_active = 1
        WHERE u.is_active = 1 $currentWhere
        GROUP BY u.department
        HAVING project_count > 0 OR department = ?
        ORDER BY total_savings DESC
    ";
    
    $departmentStmt = $pdo->prepare($departmentQuery);
    $departmentStmt->execute([$targetDepartment]);
    $departments = $departmentStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get comparison data for growth calculations
    $comparisonQuery = "
        SELECT 
            COALESCE(u.department, 'Unassigned') as department,
            SUM(sr.total_price) as prev_total_savings,
            COUNT(DISTINCT p.id) as prev_project_count,
            COUNT(DISTINCT sr.id) as prev_savings_records
        FROM users u
        LEFT JOIN savings_records sr ON sr.created_by = u.id
        LEFT JOIN projects p ON sr.project_id = p.id AND p.is_active = 1
        WHERE u.is_active = 1 $compareWhere
        GROUP BY u.department
    ";
    
    $comparisonStmt = $pdo->prepare($comparisonQuery);
    $comparisonStmt->execute();
    $comparisonData = $comparisonStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Create lookup for comparison data
    $comparisonLookup = [];
    foreach ($comparisonData as $comp) {
        $comparisonLookup[$comp['department']] = $comp;
    }
    
    // Process departments with growth calculations
    $processedDepartments = [];
    foreach ($departments as $dept) {
        $deptName = $dept['department'];
        $comparison = $comparisonLookup[$deptName] ?? null;
        
        // Calculate growth rates
        $savingsGrowth = 0;
        $projectGrowth = 0;
        $recordsGrowth = 0;
        
        if ($comparison) {
            if ($comparison['prev_total_savings'] > 0) {
                $savingsGrowth = (($dept['total_savings'] - $comparison['prev_total_savings']) / $comparison['prev_total_savings']) * 100;
            }
            if ($comparison['prev_project_count'] > 0) {
                $projectGrowth = (($dept['project_count'] - $comparison['prev_project_count']) / $comparison['prev_project_count']) * 100;
            }
            if ($comparison['prev_savings_records'] > 0) {
                $recordsGrowth = (($dept['savings_records'] - $comparison['prev_savings_records']) / $comparison['prev_savings_records']) * 100;
            }
        } elseif ($dept['total_savings'] > 0) {
            $savingsGrowth = 100; // New department with savings
        }
        
        // Calculate efficiency score (0-100)
        $efficiencyScore = 0;
        if ($dept['user_count'] > 0 && $dept['project_count'] > 0) {
            $avgSavingsPerUser = $dept['avg_savings_per_user'] ?? 0;
            $recordsPerUser = $dept['records_per_user'] ?? 0;
            $activeDays = $dept['active_days'] ?? 0;
            
            // Normalize and combine metrics
            $efficiencyScore = min(100, 
                ($avgSavingsPerUser / 10000) * 30 + // Savings weight
                ($recordsPerUser / 10) * 25 + // Activity weight  
                ($activeDays / 30) * 25 + // Consistency weight
                ($dept['avg_savings_per_record'] / 5000) * 20 // Quality weight
            );
        }
        
        // Performance trend (based on recent activity)
        $trend = 'stable';
        if ($savingsGrowth > 15) {
            $trend = 'up';
        } elseif ($savingsGrowth < -15) {
            $trend = 'down';
        }
        
        $processedDepartments[] = [
            'department' => $deptName,
            'user_count' => (int)$dept['user_count'],
            'project_count' => (int)$dept['project_count'],
            'savings_records' => (int)$dept['savings_records'],
            'total_savings' => (float)$dept['total_savings'],
            'avg_savings_per_record' => (float)$dept['avg_savings_per_record'],
            'avg_savings_per_project' => (float)$dept['avg_savings_per_project'],
            'avg_savings_per_user' => (float)$dept['avg_savings_per_user'],
            'highest_single_saving' => (float)$dept['highest_single_saving'],
            'lowest_single_saving' => (float)$dept['lowest_single_saving'],
            'direct_savings' => (float)$dept['direct_savings'],
            'cost_avoidance' => (float)$dept['cost_avoidance'],
            'active_days' => (int)$dept['active_days'],
            'last_activity' => $dept['last_activity'],
            'records_per_project' => round((float)$dept['records_per_project'], 2),
            'records_per_user' => round((float)$dept['records_per_user'], 2),
            'growth_rates' => [
                'savings' => round($savingsGrowth, 1),
                'projects' => round($projectGrowth, 1),
                'records' => round($recordsGrowth, 1)
            ],
            'efficiency_score' => round($efficiencyScore, 1),
            'trend' => $trend,
            'comparison_period' => $comparePeriod
        ];
    }
    
    // Department category breakdown (if specific department requested)
    $categoryBreakdown = [];
    if ($targetDepartment) {
        $categoryQuery = "
            SELECT 
                sr.category,
                COUNT(*) as record_count,
                SUM(sr.total_price) as total_savings,
                AVG(sr.total_price) as avg_savings,
                MAX(sr.total_price) as max_savings,
                MIN(sr.total_price) as min_savings
            FROM savings_records sr
            JOIN projects p ON sr.project_id = p.id
            JOIN users u ON sr.created_by = u.id
            WHERE p.is_active = 1 $currentWhere
            AND (u.department = ? OR (u.department IS NULL AND ? = 'Unassigned'))
            GROUP BY sr.category
            ORDER BY total_savings DESC
        ";
        
        $categoryStmt = $pdo->prepare($categoryQuery);
        $categoryStmt->execute([$targetDepartment, $targetDepartment]);
        $categoryBreakdown = $categoryStmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($categoryBreakdown as &$category) {
            $category['record_count'] = (int)$category['record_count'];
            $category['total_savings'] = (float)$category['total_savings'];
            $category['avg_savings'] = (float)$category['avg_savings'];
            $category['max_savings'] = (float)$category['max_savings'];
            $category['min_savings'] = (float)$category['min_savings'];
        }
    }
    
    // Department user performance (top performers per department)
    $userPerformanceQuery = "
        SELECT 
            COALESCE(u.department, 'Unassigned') as department,
            CONCAT(u.first_name, ' ', u.last_name) as user_name,
            u.id as user_id,
            COUNT(DISTINCT p.id) as projects,
            COUNT(sr.id) as records,
            SUM(sr.total_price) as total_contribution,
            AVG(sr.total_price) as avg_contribution,
            MAX(sr.created_at) as last_contribution
        FROM users u
        LEFT JOIN savings_records sr ON sr.created_by = u.id
        LEFT JOIN projects p ON sr.project_id = p.id AND p.is_active = 1
        WHERE u.is_active = 1 $currentWhere
        GROUP BY u.id, u.department, u.first_name, u.last_name
        HAVING total_contribution > 0
        ORDER BY u.department, total_contribution DESC
    ";
    
    $userPerformanceStmt = $pdo->prepare($userPerformanceQuery);
    $userPerformanceStmt->execute();
    $userPerformance = $userPerformanceStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Group user performance by department
    $usersByDepartment = [];
    foreach ($userPerformance as $user) {
        $dept = $user['department'];
        if (!isset($usersByDepartment[$dept])) {
            $usersByDepartment[$dept] = [];
        }
        
        $usersByDepartment[$dept][] = [
            'user_id' => (int)$user['user_id'],
            'user_name' => $user['user_name'],
            'projects' => (int)$user['projects'],
            'records' => (int)$user['records'],
            'total_contribution' => (float)$user['total_contribution'],
            'avg_contribution' => (float)$user['avg_contribution'],
            'last_contribution' => $user['last_contribution']
        ];
    }
    
    // Department rankings
    $rankings = [
        'by_total_savings' => [],
        'by_efficiency' => [],
        'by_growth' => [],
        'by_activity' => []
    ];
    
    foreach ($processedDepartments as $i => $dept) {
        $rankings['by_total_savings'][] = [
            'rank' => $i + 1,
            'department' => $dept['department'],
            'value' => $dept['total_savings']
        ];
    }
    
    // Sort by efficiency
    $efficiencySort = $processedDepartments;
    usort($efficiencySort, function($a, $b) {
        return $b['efficiency_score'] <=> $a['efficiency_score'];
    });
    
    foreach ($efficiencySort as $i => $dept) {
        $rankings['by_efficiency'][] = [
            'rank' => $i + 1,
            'department' => $dept['department'],
            'value' => $dept['efficiency_score']
        ];
    }
    
    // Sort by growth
    $growthSort = $processedDepartments;
    usort($growthSort, function($a, $b) {
        return $b['growth_rates']['savings'] <=> $a['growth_rates']['savings'];
    });
    
    foreach ($growthSort as $i => $dept) {
        $rankings['by_growth'][] = [
            'rank' => $i + 1,
            'department' => $dept['department'],
            'value' => $dept['growth_rates']['savings']
        ];
    }
    
    // Sort by activity (records per user)
    $activitySort = $processedDepartments;
    usort($activitySort, function($a, $b) {
        return $b['records_per_user'] <=> $a['records_per_user'];
    });
    
    foreach ($activitySort as $i => $dept) {
        $rankings['by_activity'][] = [
            'rank' => $i + 1,
            'department' => $dept['department'],
            'value' => $dept['records_per_user']
        ];
    }
    
    // Summary statistics
    $summary = [
        'total_departments' => count($processedDepartments),
        'total_savings' => array_sum(array_column($processedDepartments, 'total_savings')),
        'total_projects' => array_sum(array_column($processedDepartments, 'project_count')),
        'total_users' => array_sum(array_column($processedDepartments, 'user_count')),
        'avg_efficiency_score' => count($processedDepartments) > 0 ? 
            array_sum(array_column($processedDepartments, 'efficiency_score')) / count($processedDepartments) : 0,
        'best_performing_department' => !empty($processedDepartments) ? $processedDepartments[0]['department'] : null,
        'fastest_growing_department' => !empty($growthSort) ? $growthSort[0]['department'] : null
    ];
    
    // Log analytics request
    $auditQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $auditStmt = $pdo->prepare($auditQuery);
    $auditStmt->execute([
        $currentUser['id'],
        'admin_analytics_departments',
        'analytics',
        0,
        json_encode($filters),
        $_SERVER['REMOTE_ADDR'] ?? null,
        $_SERVER['HTTP_USER_AGENT'] ?? null
    ]);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'departments' => $processedDepartments,
            'categoryBreakdown' => $categoryBreakdown,
            'usersByDepartment' => $usersByDepartment,
            'rankings' => $rankings,
            'summary' => $summary,
            'metadata' => [
                'period' => $period,
                'target_department' => $targetDepartment,
                'metric' => $metric,
                'compare_period' => $comparePeriod
            ]
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => 'Department analytics could not be retrieved',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    error_log("Department analytics error: " . $e->getMessage());
}
?>