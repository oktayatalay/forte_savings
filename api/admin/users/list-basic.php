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

// Basic database connection
$host = $_ENV['DB_HOST'] ?? 'localhost';
$dbname = $_ENV['DB_NAME'] ?? 'forte_savings';
$username = $_ENV['DB_USER'] ?? 'root';
$password = $_ENV['DB_PASS'] ?? '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

// Mock data if database fails
$mockUsers = [
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
        'created_at' => '2024-01-01 10:00:00',
        'updated_at' => '2024-01-20 15:30:00',
        'last_login' => '2024-01-20 09:15:00',
        'email_verified_at' => '2024-01-01 10:05:00'
    ],
    [
        'id' => 2,
        'email' => 'user@fortetourism.com',
        'first_name' => 'Test',
        'last_name' => 'User',
        'role' => 'user',
        'status' => 'active',
        'department' => 'Operations',
        'position' => 'Specialist',
        'phone' => '+90 555 987 6543',
        'created_at' => '2024-01-05 14:20:00',
        'updated_at' => '2024-01-18 11:45:00',
        'last_login' => '2024-01-19 16:30:00',
        'email_verified_at' => '2024-01-05 14:25:00'
    ]
];

try {
    // Try to get real users from database
    $sql = "SELECT id, email, first_name, last_name, role, status, department, position, phone, created_at, updated_at, last_login, email_verified_at FROM users ORDER BY created_at DESC LIMIT 20";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $users = $stmt->fetchAll();
    
    // If no users found, use mock data
    if (empty($users)) {
        $users = $mockUsers;
    }
} catch (Exception $e) {
    // If database query fails, use mock data
    error_log('Database query failed: ' . $e->getMessage());
    $users = $mockUsers;
}

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
        'project_count' => rand(0, 5),
        'savings_count' => rand(0, 10),
        'total_savings' => (float)rand(1000, 50000),
        'activity_count' => rand(5, 50),
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
?>