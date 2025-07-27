<?php
header('Content-Type: application/json');

require_once '../../config/database.php';
require_once '../../security/SecurityMiddleware.php';

// Initialize security middleware
$security = new SecurityMiddleware();
$security->authenticate();
$security->requireAdminRole();

// Get request parameters
$page = filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT) ?: 1;
$limit = filter_var($_GET['limit'] ?? 20, FILTER_VALIDATE_INT) ?: 20;
$search = trim($_GET['search'] ?? '');
$action_filter = trim($_GET['action'] ?? '');
$user_filter = trim($_GET['user'] ?? '');
$date_from = trim($_GET['date_from'] ?? '');
$date_to = trim($_GET['date_to'] ?? '');

// Validate limit
$limit = min(max($limit, 1), 100); // Between 1 and 100
$offset = ($page - 1) * $limit;

try {
    $pdo = getDbConnection();
    
    // Build WHERE conditions
    $conditions = ['1=1']; // Base condition to simplify concatenation
    $params = [];
    
    if (!empty($search)) {
        $conditions[] = "(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR a.description LIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    if (!empty($action_filter)) {
        $conditions[] = "a.action = ?";
        $params[] = $action_filter;
    }
    
    if (!empty($user_filter)) {
        $conditions[] = "a.user_id = ?";
        $params[] = $user_filter;
    }
    
    if (!empty($date_from)) {
        $conditions[] = "a.created_at >= ?";
        $params[] = $date_from . ' 00:00:00';
    }
    
    if (!empty($date_to)) {
        $conditions[] = "a.created_at <= ?";
        $params[] = $date_to . ' 23:59:59';
    }
    
    $whereClause = 'WHERE ' . implode(' AND ', $conditions);
    
    // Get total count
    $countSql = "
        SELECT COUNT(*) 
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        $whereClause
    ";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalLogs = $countStmt->fetchColumn();
    
    // Get audit logs with user information
    $sql = "
        SELECT 
            a.id,
            a.user_id,
            a.action,
            a.resource_type,
            a.resource_id,
            a.description,
            a.metadata,
            a.ip_address,
            a.created_at,
            u.first_name,
            u.last_name,
            u.email,
            COALESCE(u.first_name, 'Sistem') as user_name
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        $whereClause
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
    ";
    
    $params[] = $limit;
    $params[] = $offset;
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format audit log data
    $formattedLogs = array_map(function($log) {
        // Determine device type from user agent (simple detection)
        $userAgent = strtolower($log['ip_address'] ?? ''); // Using ip_address as placeholder
        $deviceType = 'desktop'; // Default
        if (strpos($userAgent, 'mobile') !== false || strpos($userAgent, 'android') !== false) {
            $deviceType = 'mobile';
        } elseif (strpos($userAgent, 'tablet') !== false || strpos($userAgent, 'ipad') !== false) {
            $deviceType = 'tablet';
        }
        
        return [
            'id' => (int)$log['id'],
            'user_id' => (int)$log['user_id'],
            'user_name' => $log['first_name'] . ' ' . $log['last_name'],
            'user_email' => $log['email'] ?? '',
            'action' => $log['action'],
            'action_type' => $log['action'], // Alias for compatibility
            'resource_type' => $log['resource_type'],
            'resource_id' => $log['resource_id'] ? (int)$log['resource_id'] : null,
            'description' => $log['description'],
            'ip_address' => $log['ip_address'] ?? '0.0.0.0',
            'user_agent' => 'Web Browser', // Placeholder
            'device_type' => $deviceType,
            'location' => 'Türkiye', // Placeholder - could use IP geolocation
            'status' => 'success', // Most actions are successful
            'risk_level' => 'low', // Default risk level
            'created_at' => $log['created_at'],
            'timestamp' => $log['created_at'],
            'metadata' => $log['metadata'],
            'session_id' => null, // Not tracked yet
            'changes' => $log['metadata'] ? json_decode($log['metadata'], true) : null
        ];
    }, $logs);
    
    // Calculate pagination
    $totalPages = ceil($totalLogs / $limit);
    
    echo json_encode([
        'success' => true,
        'data' => $formattedLogs,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$totalLogs,
            'pages' => $totalPages,
            'has_next' => $page < $totalPages,
            'has_prev' => $page > 1
        ],
        'summary' => [
            'total_logs' => (int)$totalLogs,
            'filtered_logs' => count($formattedLogs),
            'date_range' => [
                'from' => $date_from ?: 'başlangıç',
                'to' => $date_to ?: 'bugün'
            ]
        ]
    ]);
    
} catch (Exception $e) {
    $security->logError('admin_audit_logs_error', $e->getMessage(), [
        'page' => $page,
        'limit' => $limit,
        'search' => $search
    ]);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Audit logları alınırken bir hata oluştu'
    ]);
}
?>