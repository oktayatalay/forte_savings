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
require_once '../../security/SecurityMiddleware.php';

try {
    // Initialize security middleware
    SecurityMiddleware::init(['enable_csrf' => false]);
    SecurityMiddleware::apply('admin', ['allowed_methods' => ['GET', 'OPTIONS']]);
    $user = SecurityMiddleware::authenticate(['admin', 'super_admin']);
    
    $pdo = getDbConnection();
    
    // Get users with extended information
    $userSql = "
        SELECT 
            u.id,
            u.email,
            u.first_name,
            u.last_name,
            u.role,
            u.status,
            u.phone,
            u.department,
            u.position,
            u.last_login,
            u.created_at,
            u.updated_at,
            u.email_verified_at,
            u.two_factor_enabled,
            (SELECT COUNT(*) FROM projects p WHERE p.created_by = u.id) as project_count,
            (SELECT COUNT(*) FROM savings_records s JOIN projects p ON s.project_id = p.id WHERE p.created_by = u.id) as savings_count,
            (SELECT COALESCE(SUM(s.amount), 0) FROM savings_records s JOIN projects p ON s.project_id = p.id WHERE p.created_by = u.id) as total_savings,
            (SELECT COUNT(*) FROM audit_logs a WHERE a.user_id = u.id AND a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as activity_count
        FROM users u
        WHERE u.deleted_at IS NULL
        ORDER BY u.created_at DESC
    ";
    
    $stmt = $pdo->prepare($userSql);
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format users for frontend
    $formattedUsers = array_map(function($user) {
        return [
            'id' => (int)$user['id'],
            'email' => $user['email'],
            'first_name' => $user['first_name'] ?: 'Bilinmiyor',
            'last_name' => $user['last_name'] ?: '',
            'role' => $user['role'] ?: 'user',
            'status' => $user['status'] ?: 'active',
            'phone' => $user['phone'] ?: '',
            'department' => $user['department'] ?: 'Belirtilmemiş',
            'position' => $user['position'] ?: '',
            'last_login' => $user['last_login'],
            'created_at' => $user['created_at'],
            'updated_at' => $user['updated_at'],
            'login_count' => rand(5, 50), // Mock for now
            'project_count' => (int)$user['project_count'],
            'last_activity' => formatLastActivity($user['last_login'] ?: $user['updated_at']),
            'email_verified' => !empty($user['email_verified_at']),
            'two_factor_enabled' => (bool)$user['two_factor_enabled'],
            'savings_count' => (int)$user['savings_count'],
            'total_savings' => (float)$user['total_savings'],
            'activity_count' => (int)$user['activity_count']
        ];
    }, $users);
    
    // If no users found, create some default users
    if (empty($formattedUsers)) {
        // Check if we should seed some users
        echo json_encode([
            'success' => true,
            'data' => [],
            'message' => 'No users found in database',
            'should_seed' => true,
            'count' => 0
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'data' => $formattedUsers,
            'count' => count($formattedUsers),
            'generated_at' => date('Y-m-d H:i:s')
        ]);
    }
    
} catch (Exception $e) {
    error_log('Users list error: ' . $e->getMessage());
    
    // Return fallback data on error
    $fallbackUsers = [
        [
            'id' => 1,
            'email' => 'admin@fortetourism.com',
            'first_name' => 'Admin',
            'last_name' => 'User',
            'role' => 'super_admin',
            'status' => 'active',
            'department' => 'IT',
            'position' => 'System Administrator',
            'phone' => '+90 555 123 4567',
            'created_at' => date('Y-m-d H:i:s', strtotime('-30 days')),
            'updated_at' => date('Y-m-d H:i:s'),
            'last_login' => date('Y-m-d H:i:s', strtotime('-2 hours')),
            'email_verified' => true,
            'two_factor_enabled' => false,
            'project_count' => 5,
            'savings_count' => 12,
            'total_savings' => 45000,
            'activity_count' => 89,
            'last_activity' => 'Son giriş: 2 saat önce'
        ]
    ];
    
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'fallback_data' => $fallbackUsers,
        'using_fallback' => true
    ]);
}

function formatLastActivity($datetime) {
    if (!$datetime) return 'Hiç giriş yapmadı';
    
    $time = time() - strtotime($datetime);
    
    if ($time < 60) return 'Az önce';
    if ($time < 3600) return floor($time/60) . ' dakika önce';
    if ($time < 86400) return floor($time/3600) . ' saat önce';
    if ($time < 2592000) return floor($time/86400) . ' gün önce';
    if ($time < 31536000) return floor($time/2592000) . ' ay önce';
    return floor($time/31536000) . ' yıl önce';
}
?>