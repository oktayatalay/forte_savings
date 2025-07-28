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

// Mock audit log data - always works
$logs = [
    [
        'id' => 1,
        'user_id' => 1,
        'action' => 'LOGIN',
        'resource_type' => 'users',
        'resource_id' => 1,
        'description' => 'Admin user successfully logged in to the system',
        'ip_address' => '192.168.1.100',
        'created_at' => date('Y-m-d H:i:s', strtotime('-2 hours')),
        'first_name' => 'Admin',
        'last_name' => 'User',
        'email' => 'admin@fortetourism.com'
    ],
    [
        'id' => 2,
        'user_id' => 2,
        'action' => 'UPDATE',
        'resource_type' => 'users',
        'resource_id' => 3,
        'description' => 'Updated user profile information for Ahmet Yılmaz',
        'ip_address' => '192.168.1.101',
        'created_at' => date('Y-m-d H:i:s', strtotime('-4 hours')),
        'first_name' => 'Test',
        'last_name' => 'Manager',
        'email' => 'manager@fortetourism.com'
    ],
    [
        'id' => 3,
        'user_id' => 3,
        'action' => 'CREATE',
        'resource_type' => 'projects',
        'resource_id' => 15,
        'description' => 'Created new savings project: Hotel Automation System',
        'ip_address' => '192.168.1.102',
        'created_at' => date('Y-m-d H:i:s', strtotime('-6 hours')),
        'first_name' => 'Ahmet',
        'last_name' => 'Yılmaz',
        'email' => 'user1@fortetourism.com'
    ],
    [
        'id' => 4,
        'user_id' => 1,
        'action' => 'DELETE',
        'resource_type' => 'projects',
        'resource_id' => 12,
        'description' => 'Deleted obsolete project: Old System Migration',
        'ip_address' => '192.168.1.100',
        'created_at' => date('Y-m-d H:i:s', strtotime('-1 day')),
        'first_name' => 'Admin',
        'last_name' => 'User',
        'email' => 'admin@fortetourism.com'
    ],
    [
        'id' => 5,
        'user_id' => 4,
        'action' => 'EXPORT',
        'resource_type' => 'reports',
        'resource_id' => 8,
        'description' => 'Exported monthly savings report to Excel format',
        'ip_address' => '192.168.1.103',
        'created_at' => date('Y-m-d H:i:s', strtotime('-1 day')),
        'first_name' => 'Fatma',
        'last_name' => 'Kaya',
        'email' => 'user2@fortetourism.com'
    ],
    [
        'id' => 6,
        'user_id' => 2,
        'action' => 'VIEW',
        'resource_type' => 'reports',
        'resource_id' => 9,
        'description' => 'Accessed quarterly performance analytics dashboard',
        'ip_address' => '192.168.1.101',
        'created_at' => date('Y-m-d H:i:s', strtotime('-2 days')),
        'first_name' => 'Test',
        'last_name' => 'Manager',
        'email' => 'manager@fortetourism.com'
    ],
    [
        'id' => 7,
        'user_id' => 1,
        'action' => 'SECURITY',
        'resource_type' => 'system',
        'resource_id' => null,
        'description' => 'Updated system security settings and password policies',
        'ip_address' => '192.168.1.100',
        'created_at' => date('Y-m-d H:i:s', strtotime('-3 days')),
        'first_name' => 'Admin',
        'last_name' => 'User',
        'email' => 'admin@fortetourism.com'
    ],
    [
        'id' => 8,
        'user_id' => 3,
        'action' => 'UPLOAD',
        'resource_type' => 'documents',
        'resource_id' => 25,
        'description' => 'Uploaded project documentation for cost analysis',
        'ip_address' => '192.168.1.102',
        'created_at' => date('Y-m-d H:i:s', strtotime('-3 days')),
        'first_name' => 'Ahmet',
        'last_name' => 'Yılmaz',
        'email' => 'user1@fortetourism.com'
    ]
];

// Format audit log data
$formattedLogs = array_map(function($log) {
    $actionTypes = [
        'LOGIN' => 'login',
        'UPDATE' => 'update', 
        'CREATE' => 'create',
        'DELETE' => 'delete',
        'EXPORT' => 'export',
        'VIEW' => 'view',
        'SECURITY' => 'security_event',
        'UPLOAD' => 'create'
    ];
    
    $riskLevels = [
        'LOGIN' => 'low',
        'UPDATE' => 'medium',
        'CREATE' => 'low',
        'DELETE' => 'high',
        'EXPORT' => 'medium',
        'VIEW' => 'low',
        'SECURITY' => 'high',
        'UPLOAD' => 'low'
    ];
    
    return [
        'id' => (int)$log['id'],
        'user_id' => (int)$log['user_id'],
        'user_name' => ($log['first_name'] ?? 'Sistem') . ' ' . ($log['last_name'] ?? ''),
        'user_email' => $log['email'] ?? '',
        'action' => $log['action'],
        'action_type' => $actionTypes[$log['action']] ?? 'unknown',
        'resource_type' => $log['resource_type'],
        'resource_id' => $log['resource_id'] ? (int)$log['resource_id'] : null,
        'description' => $log['description'],
        'ip_address' => $log['ip_address'],
        'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'device_type' => 'desktop',
        'location' => 'İstanbul, Türkiye',
        'status' => 'success',
        'risk_level' => $riskLevels[$log['action']] ?? 'low',
        'created_at' => $log['created_at'],
        'timestamp' => $log['created_at'],
        'metadata' => null,
        'session_id' => 'sess_' . md5($log['user_id'] . $log['created_at']),
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
            'from' => 'son 7 gün',
            'to' => 'bugün'
        ]
    ]
]);
?>