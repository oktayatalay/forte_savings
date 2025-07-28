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

// For now, skip complex auth - focus on getting data
try {
    $pdo = getDbConnection();
    
    // Simple query to get users
    $sql = "
        SELECT 
            id,
            email,
            first_name,
            last_name,
            role,
            status,
            department,
            position,
            phone,
            created_at,
            updated_at,
            last_login,
            email_verified_at
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 20
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format user data
    $formattedUsers = array_map(function($user) {
        return [
            'id' => (int)$user['id'],
            'email' => $user['email'],
            'first_name' => $user['first_name'] ?? 'N/A',
            'last_name' => $user['last_name'] ?? 'N/A',
            'role' => $user['role'] ?? 'user',
            'status' => $user['status'] ?? 'active',
            'department' => $user['department'] ?? 'IT',
            'position' => $user['position'] ?? 'Employee',
            'phone' => $user['phone'] ?? '',
            'created_at' => $user['created_at'],
            'updated_at' => $user['updated_at'],
            'last_login' => $user['last_login'],
            'email_verified' => !empty($user['email_verified_at']),
            'two_factor_enabled' => false,
            'project_count' => 0,
            'savings_count' => 0,
            'total_savings' => 0.0,
            'activity_count' => 0,
            'last_activity' => $user['last_login'] ? 'Son giriş: ' . date('d.m.Y H:i', strtotime($user['last_login'])) : 'Hiç giriş yapmadı'
        ];
    }, $users);
    
    echo json_encode([
        'success' => true,
        'data' => $formattedUsers,
        'pagination' => [
            'page' => 1,
            'limit' => 20,
            'total' => count($formattedUsers),
            'pages' => 1,
            'has_next' => false,
            'has_prev' => false
        ],
        'summary' => [
            'total_users' => count($formattedUsers),
            'active_users' => count(array_filter($formattedUsers, fn($u) => $u['status'] === 'active')),
            'admin_users' => count(array_filter($formattedUsers, fn($u) => in_array($u['role'], ['admin', 'super_admin']))),
            'new_this_week' => 0
        ]
    ]);
    
} catch (Exception $e) {
    error_log('Simple users list error: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>