<?php
/**
 * Admin Monitoring - System Health API
 * GET /api/admin/monitoring/system-health.php
 * 
 * Returns real-time system health metrics and status
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
        'detailed' => ['type' => 'text', 'allowed_chars' => '/^(true|false)$/', 'required' => false]
    ];
    
    $filters = SecurityMiddleware::validateInput($_GET, $validationRules);
    $detailed = ($filters['detailed'] ?? 'false') === 'true';
    
    // Database health check
    $dbHealth = [
        'status' => 'healthy',
        'connection_time' => 0,
        'query_time' => 0,
        'table_count' => 0,
        'total_records' => 0,
        'database_size' => 0,
        'errors' => []
    ];
    
    try {
        $start = microtime(true);
        
        // Test basic connection
        $testQuery = "SELECT 1";
        $testStmt = $pdo->prepare($testQuery);
        $testStmt->execute();
        
        $dbHealth['connection_time'] = round((microtime(true) - $start) * 1000, 2);
        
        // Test query performance
        $start = microtime(true);
        $countQuery = "SELECT COUNT(*) as count FROM users";
        $countStmt = $pdo->prepare($countQuery);
        $countStmt->execute();
        $userCount = $countStmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        $dbHealth['query_time'] = round((microtime(true) - $start) * 1000, 2);
        
        // Get table information
        $tablesQuery = "SHOW TABLES";
        $tablesStmt = $pdo->prepare($tablesQuery);
        $tablesStmt->execute();
        $dbHealth['table_count'] = $tablesStmt->rowCount();
        
        // Get total records across main tables
        $recordCountQuery = "
            SELECT 
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM projects) as projects,
                (SELECT COUNT(*) FROM savings_records) as savings_records,
                (SELECT COUNT(*) FROM audit_logs) as audit_logs
        ";
        $recordStmt = $pdo->prepare($recordCountQuery);
        $recordStmt->execute();
        $recordCounts = $recordStmt->fetch(PDO::FETCH_ASSOC);
        
        $dbHealth['total_records'] = array_sum($recordCounts);
        $dbHealth['record_breakdown'] = $recordCounts;
        
        // Get database size
        $sizeQuery = "
            SELECT 
                ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
        ";
        $sizeStmt = $pdo->prepare($sizeQuery);
        $sizeStmt->execute();
        $size = $sizeStmt->fetch(PDO::FETCH_ASSOC);
        $dbHealth['database_size'] = (float)$size['size_mb'];
        
        // Check for slow queries or issues
        if ($dbHealth['connection_time'] > 1000) {
            $dbHealth['status'] = 'warning';
            $dbHealth['errors'][] = 'Slow database connection detected';
        }
        
        if ($dbHealth['query_time'] > 500) {
            $dbHealth['status'] = 'warning';
            $dbHealth['errors'][] = 'Slow query performance detected';
        }
        
    } catch (Exception $e) {
        $dbHealth['status'] = 'error';
        $dbHealth['errors'][] = 'Database connection failed: ' . $e->getMessage();
    }
    
    // System resources
    $systemHealth = [
        'status' => 'healthy',
        'php_version' => PHP_VERSION,
        'memory_usage' => [
            'current' => memory_get_usage(true),
            'peak' => memory_get_peak_usage(true),
            'limit' => ini_get('memory_limit')
        ],
        'disk_space' => [
            'free' => disk_free_space('.'),
            'total' => disk_total_space('.'),
            'used_percentage' => 0
        ],
        'server_time' => date('Y-m-d H:i:s'),
        'uptime' => null,
        'load_average' => null,
        'errors' => []
    ];
    
    // Calculate disk usage percentage
    if ($systemHealth['disk_space']['total'] > 0) {
        $used = $systemHealth['disk_space']['total'] - $systemHealth['disk_space']['free'];
        $systemHealth['disk_space']['used_percentage'] = round(($used / $systemHealth['disk_space']['total']) * 100, 2);
        
        if ($systemHealth['disk_space']['used_percentage'] > 90) {
            $systemHealth['status'] = 'critical';
            $systemHealth['errors'][] = 'Disk space critically low';
        } elseif ($systemHealth['disk_space']['used_percentage'] > 80) {
            $systemHealth['status'] = 'warning';
            $systemHealth['errors'][] = 'Disk space running low';
        }
    }
    
    // Memory usage check
    $memoryUsageMB = $systemHealth['memory_usage']['current'] / 1024 / 1024;
    if ($memoryUsageMB > 128) {
        $systemHealth['status'] = 'warning';
        $systemHealth['errors'][] = 'High memory usage detected';
    }
    
    // Try to get system load (Linux/Unix only)
    if (function_exists('sys_getloadavg')) {
        $systemHealth['load_average'] = sys_getloadavg();
        if ($systemHealth['load_average'][0] > 2.0) {
            $systemHealth['status'] = 'warning';
            $systemHealth['errors'][] = 'High system load detected';
        }
    }
    
    // Application health checks
    $appHealth = [
        'status' => 'healthy',
        'active_sessions' => 0,
        'recent_errors' => 0,
        'api_response_time' => 0,
        'cache_status' => 'disabled', // Would be implemented if cache is used
        'queue_status' => 'disabled', // Would be implemented if queues are used
        'errors' => []
    ];
    
    // Check recent error count from logs
    $errorQuery = "
        SELECT COUNT(*) as error_count
        FROM audit_logs 
        WHERE action LIKE '%error%' 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    ";
    $errorStmt = $pdo->prepare($errorQuery);
    $errorStmt->execute();
    $appHealth['recent_errors'] = (int)$errorStmt->fetch(PDO::FETCH_ASSOC)['error_count'];
    
    if ($appHealth['recent_errors'] > 10) {
        $appHealth['status'] = 'warning';
        $appHealth['errors'][] = 'High error rate detected in the last hour';
    }
    
    // Check active user sessions (recent logins)
    $sessionQuery = "
        SELECT COUNT(DISTINCT user_id) as active_sessions
        FROM audit_logs 
        WHERE action = 'login' 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    ";
    $sessionStmt = $pdo->prepare($sessionQuery);
    $sessionStmt->execute();
    $appHealth['active_sessions'] = (int)$sessionStmt->fetch(PDO::FETCH_ASSOC)['active_sessions'];
    
    // Security health checks
    $securityHealth = [
        'status' => 'healthy',
        'failed_login_attempts' => 0,
        'suspicious_activities' => 0,
        'csrf_protection' => 'enabled',
        'rate_limiting' => 'enabled',
        'ssl_status' => isset($_SERVER['HTTPS']) ? 'enabled' : 'disabled',
        'errors' => []
    ];
    
    // Check failed login attempts in last hour
    $failedLoginQuery = "
        SELECT COUNT(*) as failed_attempts
        FROM audit_logs 
        WHERE action LIKE '%login_failed%' 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    ";
    $failedLoginStmt = $pdo->prepare($failedLoginQuery);
    $failedLoginStmt->execute();
    $securityHealth['failed_login_attempts'] = (int)$failedLoginStmt->fetch(PDO::FETCH_ASSOC)['failed_attempts'];
    
    if ($securityHealth['failed_login_attempts'] > 20) {
        $securityHealth['status'] = 'warning';
        $securityHealth['errors'][] = 'High number of failed login attempts';
    }
    
    // Check for suspicious activities
    $suspiciousQuery = "
        SELECT COUNT(*) as suspicious_count
        FROM audit_logs 
        WHERE (action LIKE '%suspicious%' OR action LIKE '%blocked%')
        AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    ";
    $suspiciousStmt = $pdo->prepare($suspiciousQuery);
    $suspiciousStmt->execute();
    $securityHealth['suspicious_activities'] = (int)$suspiciousStmt->fetch(PDO::FETCH_ASSOC)['suspicious_count'];
    
    // SSL check
    if ($securityHealth['ssl_status'] === 'disabled') {
        $securityHealth['status'] = 'warning';
        $securityHealth['errors'][] = 'SSL/HTTPS not enabled';
    }
    
    // Performance metrics
    $performanceHealth = [
        'status' => 'healthy',
        'average_response_time' => 0,
        'requests_per_minute' => 0,
        'error_rate' => 0,
        'database_performance' => $dbHealth['query_time'],
        'errors' => []
    ];
    
    // Calculate recent request performance
    $perfQuery = "
        SELECT 
            COUNT(*) as total_requests,
            COUNT(CASE WHEN action LIKE '%error%' THEN 1 END) as error_requests
        FROM audit_logs 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    ";
    $perfStmt = $pdo->prepare($perfQuery);
    $perfStmt->execute();
    $perfData = $perfStmt->fetch(PDO::FETCH_ASSOC);
    
    $performanceHealth['requests_per_minute'] = (int)$perfData['total_requests'];
    
    if ($perfData['total_requests'] > 0) {
        $performanceHealth['error_rate'] = round(($perfData['error_requests'] / $perfData['total_requests']) * 100, 2);
        
        if ($performanceHealth['error_rate'] > 5) {
            $performanceHealth['status'] = 'warning';
            $performanceHealth['errors'][] = 'High error rate detected';
        }
    }
    
    // Overall system status
    $statuses = [
        $dbHealth['status'],
        $systemHealth['status'],
        $appHealth['status'],
        $securityHealth['status'],
        $performanceHealth['status']
    ];
    
    $overallStatus = 'healthy';
    if (in_array('critical', $statuses)) {
        $overallStatus = 'critical';
    } elseif (in_array('error', $statuses)) {
        $overallStatus = 'error';
    } elseif (in_array('warning', $statuses)) {
        $overallStatus = 'warning';
    }
    
    // Recommendations based on health status
    $recommendations = [];
    
    if ($dbHealth['status'] !== 'healthy') {
        $recommendations[] = 'Check database performance and optimize queries';
    }
    
    if ($systemHealth['disk_space']['used_percentage'] > 80) {
        $recommendations[] = 'Clean up old files and consider expanding disk space';
    }
    
    if ($securityHealth['failed_login_attempts'] > 10) {
        $recommendations[] = 'Review and strengthen authentication security';
    }
    
    if ($performanceHealth['error_rate'] > 3) {
        $recommendations[] = 'Investigate and fix application errors';
    }
    
    // Detailed metrics (if requested)
    $detailedMetrics = [];
    if ($detailed) {
        $detailedMetrics = [
            'recent_activities' => [],
            'resource_usage_history' => [],
            'error_breakdown' => [],
            'performance_trends' => []
        ];
        
        // Get recent activities
        $activitiesQuery = "
            SELECT action, COUNT(*) as count, MAX(created_at) as last_occurrence
            FROM audit_logs 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            GROUP BY action
            ORDER BY count DESC
            LIMIT 10
        ";
        $activitiesStmt = $pdo->prepare($activitiesQuery);
        $activitiesStmt->execute();
        $detailedMetrics['recent_activities'] = $activitiesStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get error breakdown
        $errorBreakdownQuery = "
            SELECT action, COUNT(*) as count
            FROM audit_logs 
            WHERE action LIKE '%error%' 
            AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            GROUP BY action
            ORDER BY count DESC
        ";
        $errorBreakdownStmt = $pdo->prepare($errorBreakdownQuery);
        $errorBreakdownStmt->execute();
        $detailedMetrics['error_breakdown'] = $errorBreakdownStmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // Log monitoring request
    $auditQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $auditStmt = $pdo->prepare($auditQuery);
    $auditStmt->execute([
        $currentUser['id'],
        'admin_system_health_check',
        'monitoring',
        0,
        json_encode(['overall_status' => $overallStatus, 'detailed' => $detailed]),
        $_SERVER['REMOTE_ADDR'] ?? null,
        $_SERVER['HTTP_USER_AGENT'] ?? null
    ]);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'overall_status' => $overallStatus,
            'database' => $dbHealth,
            'system' => $systemHealth,
            'application' => $appHealth,
            'security' => $securityHealth,
            'performance' => $performanceHealth,
            'recommendations' => $recommendations,
            'detailed_metrics' => $detailed ? $detailedMetrics : null,
            'last_check' => date('Y-m-d H:i:s')
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => 'System health data could not be retrieved',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    error_log("System health monitoring error: " . $e->getMessage());
}
?>