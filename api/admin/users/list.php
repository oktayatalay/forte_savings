<?php
header('Content-Type: application/json');

require_once '../../config/database.php';
require_once '../../security/SecurityMiddleware.php';

// Initialize security middleware
SecurityMiddleware::init();
SecurityMiddleware::apply('admin', ['allowed_methods' => ['GET', 'OPTIONS']]);
$user = SecurityMiddleware::authenticate(['admin', 'super_admin']);

// Get request parameters
$page = filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT) ?: 1;
$limit = filter_var($_GET['limit'] ?? 20, FILTER_VALIDATE_INT) ?: 20;
$search = trim($_GET['search'] ?? '');
$role_filter = trim($_GET['role'] ?? '');
$status_filter = trim($_GET['status'] ?? '');
$department_filter = trim($_GET['department'] ?? '');

// Validate limit
$limit = min(max($limit, 1), 100); // Between 1 and 100
$offset = ($page - 1) * $limit;

try {
    $pdo = getDbConnection();
    
    // Build WHERE conditions
    $conditions = [];
    $params = [];
    
    if (!empty($search)) {
        $conditions[] = "(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    if (!empty($role_filter)) {
        $conditions[] = "u.role = ?";
        $params[] = $role_filter;
    }
    
    if (!empty($status_filter)) {
        $conditions[] = "u.status = ?";
        $params[] = $status_filter;
    }
    
    if (!empty($department_filter)) {
        $conditions[] = "u.department = ?";
        $params[] = $department_filter;
    }
    
    $whereClause = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
    
    // Get total count
    $countSql = "SELECT COUNT(*) FROM users u $whereClause";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalUsers = $countStmt->fetchColumn();
    
    // Get users with additional info
    $sql = "
        SELECT 
            u.id,
            u.email,
            u.first_name,
            u.last_name,
            u.role,
            u.status,
            u.department,
            u.position,
            u.phone,
            u.created_at,
            u.updated_at,
            u.last_login,
            u.email_verified_at,
            COUNT(DISTINCT p.id) as project_count,
            COUNT(DISTINCT s.id) as savings_count,
            COALESCE(SUM(s.amount), 0) as total_savings,
            (SELECT COUNT(*) FROM audit_logs WHERE user_id = u.id) as activity_count
        FROM users u
        LEFT JOIN projects p ON u.id = p.created_by
        LEFT JOIN savings_records s ON p.id = s.project_id
        $whereClause
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
    ";
    
    $params[] = $limit;
    $params[] = $offset;
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format user data
    $formattedUsers = array_map(function($user) {
        return [
            'id' => (int)$user['id'],
            'email' => $user['email'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'role' => $user['role'],
            'status' => $user['status'],
            'department' => $user['department'],
            'position' => $user['position'],
            'phone' => $user['phone'],
            'created_at' => $user['created_at'],
            'updated_at' => $user['updated_at'],
            'last_login' => $user['last_login'],
            'email_verified' => !empty($user['email_verified_at']),
            'two_factor_enabled' => false, // TODO: Implement 2FA
            'project_count' => (int)$user['project_count'],
            'savings_count' => (int)$user['savings_count'],
            'total_savings' => (float)$user['total_savings'],
            'activity_count' => (int)$user['activity_count'],
            'last_activity' => $user['last_login'] ? timeAgo($user['last_login']) : 'Hiç giriş yapmadı'
        ];
    }, $users);
    
    // Calculate pagination
    $totalPages = ceil($totalUsers / $limit);
    
    echo json_encode([
        'success' => true,
        'data' => $formattedUsers,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$totalUsers,
            'pages' => $totalPages,
            'has_next' => $page < $totalPages,
            'has_prev' => $page > 1
        ],
        'summary' => [
            'total_users' => (int)$totalUsers,
            'active_users' => 0, // Will be calculated
            'admin_users' => 0,  // Will be calculated
            'new_this_week' => 0 // Will be calculated
        ]
    ]);
    
} catch (Exception $e) {
    error_log('Admin users list error: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Kullanıcı listesi alınırken bir hata oluştu'
    ]);
}

function timeAgo($datetime) {
    $time = time() - strtotime($datetime);
    
    if ($time < 60) return 'Az önce';
    if ($time < 3600) return floor($time/60) . ' dakika önce';
    if ($time < 86400) return floor($time/3600) . ' saat önce';
    if ($time < 2592000) return floor($time/86400) . ' gün önce';
    if ($time < 31536000) return floor($time/2592000) . ' ay önce';
    return floor($time/31536000) . ' yıl önce';
}
?>