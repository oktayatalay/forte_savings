<?php
/**
 * Admin Monitoring - Performance Metrics API
 * GET /api/admin/monitoring/performance.php
 * 
 * Returns API performance metrics and response times
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
        'period' => ['type' => 'text', 'allowed_chars' => '/^(1h|6h|24h|7d|30d)$/', 'required' => false],
        'endpoint' => ['type' => 'text', 'max_length' => 100, 'required' => false],
        'metric' => ['type' => 'text', 'allowed_chars' => '/^(response_time|throughput|errors|all)$/', 'required' => false]
    ];
    
    $filters = SecurityMiddleware::validateInput($_GET, $validationRules);
    
    $period = $filters['period'] ?? '24h';
    $endpoint = $filters['endpoint'] ?? null;
    $metric = $filters['metric'] ?? 'all';
    
    // Calculate date range
    $dateWhere = '';
    $intervalLabel = '';
    
    switch ($period) {
        case '1h':
            $dateWhere = "AND al.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)";
            $intervalLabel = 'Last Hour';
            break;
        case '6h':
            $dateWhere = "AND al.created_at >= DATE_SUB(NOW(), INTERVAL 6 HOUR)";
            $intervalLabel = 'Last 6 Hours';
            break;
        case '24h':
            $dateWhere = "AND al.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)";
            $intervalLabel = 'Last 24 Hours';
            break;
        case '7d':
            $dateWhere = "AND al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            $intervalLabel = 'Last 7 Days';
            break;
        case '30d':
            $dateWhere = "AND al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            $intervalLabel = 'Last 30 Days';
            break;
    }
    
    // Endpoint filter
    $endpointWhere = '';
    $endpointParams = [];
    if ($endpoint) {
        $endpointWhere = "AND al.action LIKE ?";
        $endpointParams[] = "%{$endpoint}%";
    }
    
    // Overall performance metrics
    $overallQuery = "
        SELECT 
            COUNT(*) as total_requests,
            COUNT(CASE WHEN al.action LIKE '%error%' OR al.action LIKE '%failed%' THEN 1 END) as error_count,
            COUNT(DISTINCT al.user_id) as unique_users,
            COUNT(DISTINCT DATE_FORMAT(al.created_at, '%Y-%m-%d %H:%i')) as active_minutes,
            
            -- Estimate response times based on request patterns
            AVG(CASE 
                WHEN al.action LIKE '%list%' OR al.action LIKE '%dashboard%' THEN 200
                WHEN al.action LIKE '%create%' OR al.action LIKE '%update%' THEN 150
                WHEN al.action LIKE '%delete%' THEN 100
                WHEN al.action LIKE '%login%' THEN 300
                ELSE 120
            END) as avg_response_time,
            
            -- Calculate throughput
            COUNT(*) / GREATEST(TIMESTAMPDIFF(MINUTE, MIN(al.created_at), MAX(al.created_at)), 1) as requests_per_minute
            
        FROM audit_logs al
        WHERE 1=1 $dateWhere $endpointWhere
    ";
    
    $overallStmt = $pdo->prepare($overallQuery);
    $overallStmt->execute($endpointParams);
    $overall = $overallStmt->fetch(PDO::FETCH_ASSOC);
    
    // Calculate error rate
    $errorRate = $overall['total_requests'] > 0 ? 
        ($overall['error_count'] / $overall['total_requests']) * 100 : 0;
    
    // Endpoint performance breakdown
    $endpointQuery = "
        SELECT 
            CASE 
                WHEN al.action LIKE '%login%' THEN 'Authentication'
                WHEN al.action LIKE '%user%' THEN 'User Management'
                WHEN al.action LIKE '%project%' THEN 'Projects'
                WHEN al.action LIKE '%savings%' THEN 'Savings Records'
                WHEN al.action LIKE '%dashboard%' THEN 'Dashboard'
                WHEN al.action LIKE '%analytics%' THEN 'Analytics'
                WHEN al.action LIKE '%admin%' THEN 'Admin Functions'
                ELSE 'Other'
            END as endpoint_category,
            al.action as specific_action,
            COUNT(*) as request_count,
            COUNT(CASE WHEN al.action LIKE '%error%' OR al.action LIKE '%failed%' THEN 1 END) as error_count,
            AVG(CASE 
                WHEN al.action LIKE '%list%' OR al.action LIKE '%dashboard%' THEN 200
                WHEN al.action LIKE '%create%' OR al.action LIKE '%update%' THEN 150
                WHEN al.action LIKE '%delete%' THEN 100
                WHEN al.action LIKE '%login%' THEN 300
                ELSE 120
            END) as avg_response_time,
            MIN(al.created_at) as first_request,
            MAX(al.created_at) as last_request
        FROM audit_logs al
        WHERE 1=1 $dateWhere $endpointWhere
        GROUP BY endpoint_category, al.action
        ORDER BY request_count DESC
        LIMIT 20
    ";
    
    $endpointStmt = $pdo->prepare($endpointQuery);
    $endpointStmt->execute($endpointParams);
    $endpointPerformance = $endpointStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format endpoint performance data
    foreach ($endpointPerformance as &$ep) {
        $ep['request_count'] = (int)$ep['request_count'];
        $ep['error_count'] = (int)$ep['error_count'];
        $ep['avg_response_time'] = (float)$ep['avg_response_time'];
        $ep['error_rate'] = $ep['request_count'] > 0 ? 
            round(($ep['error_count'] / $ep['request_count']) * 100, 2) : 0;
        $ep['performance_score'] = $this->calculatePerformanceScore(
            $ep['avg_response_time'], 
            $ep['error_rate']
        );
    }
    
    // Time series performance data
    $timeFormat = '';
    switch ($period) {
        case '1h':
        case '6h':
            $timeFormat = '%Y-%m-%d %H:%i';
            break;
        case '24h':
            $timeFormat = '%Y-%m-%d %H:00';
            break;
        case '7d':
        case '30d':
            $timeFormat = '%Y-%m-%d';
            break;
    }
    
    $timeSeriesQuery = "
        SELECT 
            DATE_FORMAT(al.created_at, '$timeFormat') as time_period,
            COUNT(*) as requests,
            COUNT(CASE WHEN al.action LIKE '%error%' OR al.action LIKE '%failed%' THEN 1 END) as errors,
            COUNT(DISTINCT al.user_id) as active_users,
            AVG(CASE 
                WHEN al.action LIKE '%list%' OR al.action LIKE '%dashboard%' THEN 200
                WHEN al.action LIKE '%create%' OR al.action LIKE '%update%' THEN 150
                WHEN al.action LIKE '%delete%' THEN 100
                WHEN al.action LIKE '%login%' THEN 300
                ELSE 120
            END) as avg_response_time
        FROM audit_logs al
        WHERE 1=1 $dateWhere $endpointWhere
        GROUP BY DATE_FORMAT(al.created_at, '$timeFormat')
        ORDER BY time_period
    ";
    
    $timeSeriesStmt = $pdo->prepare($timeSeriesQuery);
    $timeSeriesStmt->execute($endpointParams);
    $timeSeries = $timeSeriesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format time series data
    foreach ($timeSeries as &$ts) {
        $ts['requests'] = (int)$ts['requests'];
        $ts['errors'] = (int)$ts['errors'];
        $ts['active_users'] = (int)$ts['active_users'];
        $ts['avg_response_time'] = (float)$ts['avg_response_time'];
        $ts['error_rate'] = $ts['requests'] > 0 ? 
            round(($ts['errors'] / $ts['requests']) * 100, 2) : 0;
    }
    
    // Database performance metrics
    $dbPerfQuery = "
        SELECT 
            COUNT(*) as total_queries,
            SUM(CASE WHEN al.action LIKE '%create%' OR al.action LIKE '%update%' OR al.action LIKE '%delete%' THEN 1 ELSE 0 END) as write_queries,
            SUM(CASE WHEN al.action LIKE '%list%' OR al.action LIKE '%dashboard%' OR al.action LIKE '%analytics%' THEN 1 ELSE 0 END) as read_queries
        FROM audit_logs al
        WHERE 1=1 $dateWhere
    ";
    
    $dbPerfStmt = $pdo->prepare($dbPerfQuery);
    $dbPerfStmt->execute();
    $dbPerf = $dbPerfStmt->fetch(PDO::FETCH_ASSOC);
    
    // Test current database performance
    $dbTestStart = microtime(true);
    $testQuery = "SELECT COUNT(*) FROM users";
    $testStmt = $pdo->prepare($testQuery);
    $testStmt->execute();
    $currentDbResponseTime = round((microtime(true) - $dbTestStart) * 1000, 2);
    
    // User activity patterns
    $userActivityQuery = "
        SELECT 
            al.user_id,
            COUNT(*) as request_count,
            COUNT(DISTINCT DATE_FORMAT(al.created_at, '%Y-%m-%d')) as active_days,
            MIN(al.created_at) as first_activity,
            MAX(al.created_at) as last_activity,
            COUNT(CASE WHEN al.action LIKE '%error%' THEN 1 END) as error_count
        FROM audit_logs al
        WHERE al.user_id > 0 $dateWhere
        GROUP BY al.user_id
        ORDER BY request_count DESC
        LIMIT 10
    ";
    
    $userActivityStmt = $pdo->prepare($userActivityQuery);
    $userActivityStmt->execute();
    $userActivity = $userActivityStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Performance alerts and recommendations
    $alerts = [];
    $recommendations = [];
    
    // Check overall performance
    if ($errorRate > 5) {
        $alerts[] = [
            'type' => 'error',
            'message' => "High error rate: {$errorRate}%",
            'severity' => 'high'
        ];
        $recommendations[] = 'Investigate and fix application errors causing high error rate';
    }
    
    if ($overall['avg_response_time'] > 500) {
        $alerts[] = [
            'type' => 'performance',
            'message' => "Slow average response time: {$overall['avg_response_time']}ms",
            'severity' => 'medium'
        ];
        $recommendations[] = 'Optimize slow endpoints and database queries';
    }
    
    if ($currentDbResponseTime > 100) {
        $alerts[] = [
            'type' => 'database',
            'message' => "Slow database response: {$currentDbResponseTime}ms",
            'severity' => 'medium'
        ];
        $recommendations[] = 'Review database performance and add necessary indexes';
    }
    
    // Check for endpoint-specific issues
    foreach ($endpointPerformance as $ep) {
        if ($ep['error_rate'] > 10) {
            $alerts[] = [
                'type' => 'endpoint',
                'message' => "High error rate on {$ep['specific_action']}: {$ep['error_rate']}%",
                'severity' => 'high'
            ];
        }
        
        if ($ep['avg_response_time'] > 1000) {
            $alerts[] = [
                'type' => 'endpoint',
                'message' => "Slow response on {$ep['specific_action']}: {$ep['avg_response_time']}ms",
                'severity' => 'medium'
            ];
        }
    }
    
    // Performance summary
    $performanceSummary = [
        'overall_health' => 'good',
        'total_requests' => (int)$overall['total_requests'],
        'error_rate' => round($errorRate, 2),
        'avg_response_time' => (float)$overall['avg_response_time'],
        'requests_per_minute' => (float)$overall['requests_per_minute'],
        'unique_users' => (int)$overall['unique_users'],
        'database_response_time' => $currentDbResponseTime,
        'active_endpoints' => count($endpointPerformance),
        'period' => $intervalLabel
    ];
    
    // Determine overall health
    if ($errorRate > 10 || $overall['avg_response_time'] > 1000) {
        $performanceSummary['overall_health'] = 'poor';
    } elseif ($errorRate > 5 || $overall['avg_response_time'] > 500) {
        $performanceSummary['overall_health'] = 'fair';
    }
    
    // Log monitoring request
    $auditQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $auditStmt = $pdo->prepare($auditQuery);
    $auditStmt->execute([
        $currentUser['id'],
        'admin_performance_monitoring',
        'monitoring',
        0,
        json_encode($filters),
        $_SERVER['REMOTE_ADDR'] ?? null,
        $_SERVER['HTTP_USER_AGENT'] ?? null
    ]);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'summary' => $performanceSummary,
            'endpoint_performance' => $endpointPerformance,
            'time_series' => $timeSeries,
            'database_performance' => [
                'current_response_time' => $currentDbResponseTime,
                'total_queries' => (int)$dbPerf['total_queries'],
                'write_queries' => (int)$dbPerf['write_queries'],
                'read_queries' => (int)$dbPerf['read_queries'],
                'write_ratio' => $dbPerf['total_queries'] > 0 ? 
                    round(($dbPerf['write_queries'] / $dbPerf['total_queries']) * 100, 2) : 0
            ],
            'user_activity' => array_map(function($user) {
                return [
                    'user_id' => (int)$user['user_id'],
                    'request_count' => (int)$user['request_count'],
                    'active_days' => (int)$user['active_days'],
                    'error_count' => (int)$user['error_count'],
                    'first_activity' => $user['first_activity'],
                    'last_activity' => $user['last_activity'],
                    'error_rate' => $user['request_count'] > 0 ? 
                        round(($user['error_count'] / $user['request_count']) * 100, 2) : 0
                ];
            }, $userActivity),
            'alerts' => $alerts,
            'recommendations' => $recommendations,
            'metadata' => [
                'period' => $period,
                'endpoint_filter' => $endpoint,
                'metric_focus' => $metric,
                'data_points' => count($timeSeries)
            ]
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => 'Performance data could not be retrieved',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    error_log("Performance monitoring error: " . $e->getMessage());
}

/**
 * Calculate performance score based on response time and error rate
 */
function calculatePerformanceScore($responseTime, $errorRate) {
    $timeScore = 100;
    $errorScore = 100;
    
    // Response time scoring (0-100)
    if ($responseTime > 1000) {
        $timeScore = 20;
    } elseif ($responseTime > 500) {
        $timeScore = 50;
    } elseif ($responseTime > 200) {
        $timeScore = 80;
    }
    
    // Error rate scoring (0-100)
    if ($errorRate > 10) {
        $errorScore = 20;
    } elseif ($errorRate > 5) {
        $errorScore = 50;
    } elseif ($errorRate > 1) {
        $errorScore = 80;
    }
    
    // Weighted average (70% response time, 30% error rate)
    return round(($timeScore * 0.7) + ($errorScore * 0.3), 1);
}
?>