<?php
/**
 * Admin Analytics - User Performance Rankings API
 * GET /api/admin/analytics/users-performance.php
 * 
 * Returns detailed user performance rankings and metrics
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
        'metric' => ['type' => 'text', 'allowed_chars' => '/^(savings|projects|consistency|efficiency)$/', 'required' => false],
        'limit' => ['type' => 'integer', 'min' => 1, 'max' => 100, 'required' => false],
        'min_activity' => ['type' => 'integer', 'min' => 0, 'required' => false]
    ];
    
    $filters = SecurityMiddleware::validateInput($_GET, $validationRules);
    
    $period = $filters['period'] ?? '90d';
    $department = $filters['department'] ?? null;
    $metric = $filters['metric'] ?? 'savings';
    $limit = $filters['limit'] ?? 50;
    $minActivity = $filters['min_activity'] ?? 1;
    
    // Calculate date range
    $dateWhere = '';
    switch ($period) {
        case '30d':
            $dateWhere = "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            break;
        case '90d':
            $dateWhere = "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
            break;
        case '6m':
            $dateWhere = "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)";
            break;
        case '1y':
            $dateWhere = "AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
            break;
        case 'all':
        default:
            $dateWhere = "";
            break;
    }
    
    // Department filter
    $deptWhere = '';
    $deptParams = [];
    if ($department) {
        $deptWhere = "AND (u.department = ? OR (u.department IS NULL AND ? = 'Unassigned'))";
        $deptParams = [$department, $department];
    }
    
    // Main user performance query
    $userQuery = "
        SELECT 
            u.id as user_id,
            u.email,
            CONCAT(u.first_name, ' ', u.last_name) as full_name,
            u.first_name,
            u.last_name,
            COALESCE(u.department, 'Unassigned') as department,
            COALESCE(u.position, 'N/A') as position,
            u.created_at as user_created_at,
            
            -- Core metrics
            COUNT(DISTINCT p.id) as project_count,
            COUNT(DISTINCT sr.id) as savings_records,
            SUM(sr.total_price) as total_savings,
            AVG(sr.total_price) as avg_savings_per_record,
            MAX(sr.total_price) as highest_single_saving,
            MIN(sr.total_price) as lowest_single_saving,
            
            -- Type breakdown
            SUM(CASE WHEN sr.type = 'Savings' THEN sr.total_price ELSE 0 END) as direct_savings,
            SUM(CASE WHEN sr.type = 'Cost Avoidance' THEN sr.total_price ELSE 0 END) as cost_avoidance,
            
            -- Activity metrics
            COUNT(DISTINCT DATE(sr.created_at)) as active_days,
            MIN(sr.created_at) as first_contribution,
            MAX(sr.created_at) as last_contribution,
            DATEDIFF(NOW(), MAX(sr.created_at)) as days_since_last_activity,
            
            -- Consistency metrics
            COUNT(sr.id) / COUNT(DISTINCT p.id) as records_per_project,
            STDDEV(sr.total_price) as savings_volatility,
            
            -- Recent activity (last 30 days)
            COUNT(CASE WHEN sr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recent_records,
            SUM(CASE WHEN sr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN sr.total_price ELSE 0 END) as recent_savings,
            
            -- Login activity from audit logs
            (SELECT COUNT(*) FROM audit_logs al WHERE al.user_id = u.id AND al.action = 'login' AND al.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)) as recent_logins,
            (SELECT MAX(al.created_at) FROM audit_logs al WHERE al.user_id = u.id AND al.action = 'login') as last_login
            
        FROM users u
        LEFT JOIN savings_records sr ON sr.created_by = u.id
        LEFT JOIN projects p ON sr.project_id = p.id AND p.is_active = 1
        WHERE u.is_active = 1 
        AND u.role != 'super_admin'
        $dateWhere 
        $deptWhere
        GROUP BY u.id, u.email, u.first_name, u.last_name, u.department, u.position, u.created_at
        HAVING savings_records >= ?
        ORDER BY total_savings DESC
        LIMIT ?
    ";
    
    $queryParams = array_merge($deptParams, [$minActivity, $limit]);
    $userStmt = $pdo->prepare($userQuery);
    $userStmt->execute($queryParams);
    $users = $userStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calculate performance scores and rankings
    $processedUsers = [];
    $totalSavings = array_sum(array_column($users, 'total_savings'));
    
    foreach ($users as $i => $user) {
        // Calculate efficiency score (0-100)
        $efficiencyScore = 0;
        $consistencyScore = 0;
        $activityScore = 0;
        
        // Efficiency: Based on savings per record and savings per project
        if ($user['savings_records'] > 0) {
            $avgPerRecord = $user['avg_savings_per_record'];
            $efficiencyScore = min(100, ($avgPerRecord / 5000) * 50); // Normalize to 50 points max
        }
        
        if ($user['project_count'] > 0) {
            $savingsPerProject = $user['total_savings'] / $user['project_count'];
            $efficiencyScore += min(50, ($savingsPerProject / 10000) * 50); // Add up to 50 more points
        }
        
        // Consistency: Based on regular activity and low volatility
        if ($user['active_days'] > 0) {
            $daysInPeriod = 90; // Default period days
            $consistencyRatio = min(1, $user['active_days'] / ($daysInPeriod * 0.3)); // Active 30% of days = 100%
            $consistencyScore = $consistencyRatio * 60; // Up to 60 points
            
            // Penalty for high volatility
            if ($user['savings_volatility'] > 0) {
                $volatilityPenalty = min(20, ($user['savings_volatility'] / $user['avg_savings_per_record']) * 20);
                $consistencyScore = max(0, $consistencyScore - $volatilityPenalty);
            }
        }
        
        // Activity: Based on recent activity and login frequency
        if ($user['days_since_last_activity'] <= 7) {
            $activityScore = 40;
        } elseif ($user['days_since_last_activity'] <= 30) {
            $activityScore = 25;
        } elseif ($user['days_since_last_activity'] <= 90) {
            $activityScore = 10;
        }
        
        // Bonus for recent logins
        if ($user['recent_logins'] > 10) {
            $activityScore += 20;
        } elseif ($user['recent_logins'] > 5) {
            $activityScore += 10;
        } elseif ($user['recent_logins'] > 0) {
            $activityScore += 5;
        }
        
        $performanceScore = min(100, $efficiencyScore + $consistencyScore + $activityScore);
        
        // Calculate contribution percentage
        $contributionPercentage = $totalSavings > 0 ? ($user['total_savings'] / $totalSavings) * 100 : 0;
        
        // Determine status based on recent activity
        $status = 'active';
        if ($user['days_since_last_activity'] > 90) {
            $status = 'inactive';
        } elseif ($user['days_since_last_activity'] > 30) {
            $status = 'low_activity';
        }
        
        // Calculate growth trend (compare recent vs older activity)
        $growthTrend = 'stable';
        if ($user['recent_savings'] > 0 && $user['total_savings'] > $user['recent_savings']) {
            $recentRatio = $user['recent_savings'] / ($user['total_savings'] - $user['recent_savings']);
            if ($recentRatio > 0.5) {
                $growthTrend = 'up';
            } elseif ($recentRatio < 0.1) {
                $growthTrend = 'down';
            }
        }
        
        $processedUsers[] = [
            'rank' => $i + 1,
            'user_id' => (int)$user['user_id'],
            'email' => $user['email'],
            'name' => $user['full_name'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'department' => $user['department'],
            'position' => $user['position'],
            'user_created_at' => $user['user_created_at'],
            
            // Performance metrics
            'project_count' => (int)$user['project_count'],
            'savings_records' => (int)$user['savings_records'],
            'total_savings' => (float)$user['total_savings'],
            'avg_savings_per_record' => (float)$user['avg_savings_per_record'],
            'highest_single_saving' => (float)$user['highest_single_saving'],
            'lowest_single_saving' => (float)$user['lowest_single_saving'],
            'direct_savings' => (float)$user['direct_savings'],
            'cost_avoidance' => (float)$user['cost_avoidance'],
            
            // Activity metrics
            'active_days' => (int)$user['active_days'],
            'first_contribution' => $user['first_contribution'],
            'last_contribution' => $user['last_contribution'],
            'days_since_last_activity' => (int)$user['days_since_last_activity'],
            'records_per_project' => round((float)$user['records_per_project'], 2),
            'savings_volatility' => (float)$user['savings_volatility'],
            
            // Recent activity
            'recent_records' => (int)$user['recent_records'],
            'recent_savings' => (float)$user['recent_savings'],
            'recent_logins' => (int)$user['recent_logins'],
            'last_login' => $user['last_login'],
            
            // Calculated metrics
            'performance_score' => round($performanceScore, 1),
            'efficiency_score' => round($efficiencyScore, 1),
            'consistency_score' => round($consistencyScore, 1),
            'activity_score' => round($activityScore, 1),
            'contribution_percentage' => round($contributionPercentage, 2),
            'status' => $status,
            'growth_trend' => $growthTrend,
            
            // Formatted activity
            'last_activity' => $this->formatRelativeTime($user['last_contribution'] ?? $user['user_created_at'])
        ];
    }
    
    // Re-sort based on requested metric
    switch ($metric) {
        case 'efficiency':
            usort($processedUsers, function($a, $b) {
                return $b['efficiency_score'] <=> $a['efficiency_score'];
            });
            break;
        case 'consistency':
            usort($processedUsers, function($a, $b) {
                return $b['consistency_score'] <=> $a['consistency_score'];
            });
            break;
        case 'projects':
            usort($processedUsers, function($a, $b) {
                return $b['project_count'] <=> $a['project_count'];
            });
            break;
        case 'savings':
        default:
            // Already sorted by total_savings
            break;
    }
    
    // Update ranks after sorting
    foreach ($processedUsers as $i => &$user) {
        $user['rank'] = $i + 1;
    }
    
    // Category performance by user (top categories for top users)
    $categoryPerformanceQuery = "
        SELECT 
            u.id as user_id,
            sr.category,
            COUNT(*) as record_count,
            SUM(sr.total_price) as category_savings,
            AVG(sr.total_price) as avg_category_savings
        FROM users u
        JOIN savings_records sr ON sr.created_by = u.id
        JOIN projects p ON sr.project_id = p.id
        WHERE p.is_active = 1 $dateWhere $deptWhere
        AND u.id IN (" . implode(',', array_column($processedUsers, 'user_id')) . ")
        GROUP BY u.id, sr.category
        ORDER BY category_savings DESC
    ";
    
    $categoryPerfStmt = $pdo->prepare($categoryPerformanceQuery);
    $categoryPerfStmt->execute($deptParams);
    $categoryPerformance = $categoryPerfStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Group category performance by user
    $userCategories = [];
    foreach ($categoryPerformance as $catPerf) {
        $userId = $catPerf['user_id'];
        if (!isset($userCategories[$userId])) {
            $userCategories[$userId] = [];
        }
        
        $userCategories[$userId][] = [
            'category' => $catPerf['category'],
            'record_count' => (int)$catPerf['record_count'],
            'savings' => (float)$catPerf['category_savings'],
            'avg_savings' => (float)$catPerf['avg_category_savings']
        ];
    }
    
    // Department summary
    $departments = array_unique(array_column($processedUsers, 'department'));
    $departmentSummary = [];
    
    foreach ($departments as $dept) {
        $deptUsers = array_filter($processedUsers, function($u) use ($dept) {
            return $u['department'] === $dept;
        });
        
        if (!empty($deptUsers)) {
            $departmentSummary[] = [
                'department' => $dept,
                'user_count' => count($deptUsers),
                'total_savings' => array_sum(array_column($deptUsers, 'total_savings')),
                'avg_performance_score' => array_sum(array_column($deptUsers, 'performance_score')) / count($deptUsers),
                'top_performer' => reset($deptUsers)['name']
            ];
        }
    }
    
    // Performance distribution
    $distribution = [
        'excellent' => count(array_filter($processedUsers, function($u) { return $u['performance_score'] >= 80; })),
        'good' => count(array_filter($processedUsers, function($u) { return $u['performance_score'] >= 60 && $u['performance_score'] < 80; })),
        'average' => count(array_filter($processedUsers, function($u) { return $u['performance_score'] >= 40 && $u['performance_score'] < 60; })),
        'below_average' => count(array_filter($processedUsers, function($u) { return $u['performance_score'] < 40; }))
    ];
    
    // Log analytics request
    $auditQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $auditStmt = $pdo->prepare($auditQuery);
    $auditStmt->execute([
        $currentUser['id'],
        'admin_analytics_user_performance',
        'analytics',
        0,
        json_encode($filters),
        $_SERVER['REMOTE_ADDR'] ?? null,
        $_SERVER['HTTP_USER_AGENT'] ?? null
    ]);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'users' => $processedUsers,
            'userCategories' => $userCategories,
            'departmentSummary' => $departmentSummary,
            'distribution' => $distribution,
            'metadata' => [
                'period' => $period,
                'department' => $department,
                'metric' => $metric,
                'limit' => $limit,
                'min_activity' => $minActivity,
                'total_users_found' => count($processedUsers),
                'total_savings' => $totalSavings
            ]
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => 'User performance data could not be retrieved',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    error_log("User performance analytics error: " . $e->getMessage());
}

/**
 * Format relative time helper function
 */
function formatRelativeTime($datetime) {
    if (!$datetime) return 'Hiç';
    
    $time = time() - strtotime($datetime);
    
    if ($time < 60) return 'Az önce';
    if ($time < 3600) return floor($time/60) . ' dakika önce';
    if ($time < 86400) return floor($time/3600) . ' saat önce';
    if ($time < 604800) return floor($time/86400) . ' gün önce';
    if ($time < 2592000) return floor($time/604800) . ' hafta önce';
    
    return date('d.m.Y', strtotime($datetime));
}
?>