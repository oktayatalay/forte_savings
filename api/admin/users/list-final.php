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

// Mock user data - always works
$users = [
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
        'updated_at' => date('Y-m-d H:i:s', strtotime('-1 day')),
        'last_login' => date('Y-m-d H:i:s', strtotime('-2 hours')),
        'email_verified_at' => date('Y-m-d H:i:s', strtotime('-30 days'))
    ],
    [
        'id' => 2,
        'email' => 'manager@fortetourism.com',
        'first_name' => 'Test',
        'last_name' => 'Manager',
        'role' => 'admin',
        'status' => 'active',
        'department' => 'Operations',
        'position' => 'Department Manager',
        'phone' => '+90 555 987 6543',
        'created_at' => date('Y-m-d H:i:s', strtotime('-20 days')),
        'updated_at' => date('Y-m-d H:i:s', strtotime('-3 hours')),
        'last_login' => date('Y-m-d H:i:s', strtotime('-1 hour')),
        'email_verified_at' => date('Y-m-d H:i:s', strtotime('-20 days'))
    ],
    [
        'id' => 3,
        'email' => 'user1@fortetourism.com',
        'first_name' => 'Ahmet',
        'last_name' => 'Yılmaz',
        'role' => 'user',
        'status' => 'active',
        'department' => 'Sales',
        'position' => 'Sales Specialist',
        'phone' => '+90 555 111 2233',
        'created_at' => date('Y-m-d H:i:s', strtotime('-15 days')),
        'updated_at' => date('Y-m-d H:i:s', strtotime('-1 day')),
        'last_login' => date('Y-m-d H:i:s', strtotime('-4 hours')),
        'email_verified_at' => date('Y-m-d H:i:s', strtotime('-15 days'))
    ],
    [
        'id' => 4,
        'email' => 'user2@fortetourism.com',
        'first_name' => 'Fatma',
        'last_name' => 'Kaya',
        'role' => 'user',
        'status' => 'active',
        'department' => 'Marketing',
        'position' => 'Marketing Specialist',
        'phone' => '+90 555 444 5566',
        'created_at' => date('Y-m-d H:i:s', strtotime('-10 days')),
        'updated_at' => date('Y-m-d H:i:s', strtotime('-2 days')),
        'last_login' => date('Y-m-d H:i:s', strtotime('-6 hours')),
        'email_verified_at' => date('Y-m-d H:i:s', strtotime('-10 days'))
    ],
    [
        'id' => 5,
        'email' => 'user3@fortetourism.com',
        'first_name' => 'Mehmet',
        'last_name' => 'Demir',
        'role' => 'user',
        'status' => 'inactive',
        'department' => 'HR',
        'position' => 'HR Specialist',
        'phone' => '+90 555 777 8899',
        'created_at' => date('Y-m-d H:i:s', strtotime('-5 days')),
        'updated_at' => date('Y-m-d H:i:s', strtotime('-5 days')),
        'last_login' => null,
        'email_verified_at' => null
    ]
];

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
        'two_factor_enabled' => false,
        'project_count' => rand(1, 8),
        'savings_count' => rand(2, 15),
        'total_savings' => (float)rand(5000, 75000),
        'activity_count' => rand(10, 100),
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
        'new_this_week' => 2
    ]
]);
?>