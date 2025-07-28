<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../config/database.php';

// Simple authentication check - just verify token exists
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No token provided']);
    exit;
}

try {
    $pdo = getDbConnection();
    
    // Simple query to get audit logs
    $sql = "
        SELECT 
            a.id,
            a.user_id,
            a.action,
            a.table_name as resource_type,
            a.record_id as resource_id,
            a.new_values as description,
            a.ip_address,
            a.created_at,
            u.first_name,
            u.last_name,
            u.email
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC 
        LIMIT 50
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format audit log data
    $formattedLogs = array_map(function($log) {
        return [
            'id' => (int)$log['id'],
            'user_id' => (int)$log['user_id'],
            'user_name' => ($log['first_name'] ?? 'Sistem') . ' ' . ($log['last_name'] ?? ''),
            'user_email' => $log['email'] ?? '',
            'action' => $log['action'] ?? 'UNKNOWN',
            'action_type' => $log['action'] ?? 'UNKNOWN',
            'resource_type' => $log['resource_type'] ?? 'unknown',
            'resource_id' => $log['resource_id'] ? (int)$log['resource_id'] : null,
            'description' => $log['description'] ?? 'No description',
            'ip_address' => $log['ip_address'] ?? '0.0.0.0',
            'user_agent' => 'Web Browser',
            'device_type' => 'desktop',
            'location' => 'Türkiye',
            'status' => 'success',
            'risk_level' => 'low',
            'created_at' => $log['created_at'],
            'timestamp' => $log['created_at'],
            'metadata' => null,
            'session_id' => null,
            'changes' => null
        ];
    }, $logs);
    
    echo json_encode([
        'success' => true,
        'data' => $formattedLogs,
        'pagination' => [
            'page' => 1,
            'limit' => 50,
            'total' => count($formattedLogs),
            'pages' => 1,
            'has_next' => false,
            'has_prev' => false
        ],
        'summary' => [
            'total_logs' => count($formattedLogs),
            'filtered_logs' => count($formattedLogs),
            'date_range' => [
                'from' => 'başlangıç',
                'to' => 'bugün'
            ]
        ]
    ]);
    
} catch (Exception $e) {
    error_log('Simple audit logs error: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>