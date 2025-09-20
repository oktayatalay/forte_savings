<?php
// Debug version of login.php to identify 500 errors

// Enable comprehensive error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $debug_info = [
        'step' => 'initialization',
        'timestamp' => date('Y-m-d H:i:s'),
        'request_method' => $_SERVER['REQUEST_METHOD'],
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'unknown'
    ];

    // Step 1: Check request method
    $debug_info['step'] = 'checking_request_method';
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        $debug_info['error'] = 'Only POST method allowed';
        echo json_encode($debug_info);
        exit;
    }

    // Step 2: Load CORS (skip for now to avoid SecurityHeaders issue)
    $debug_info['step'] = 'loading_cors';
    // Skip: require_once '../config/cors.php';
    $debug_info['cors_skipped'] = true;

    // Step 3: Load Database
    $debug_info['step'] = 'loading_database';
    require_once '../config/database.php';
    $debug_info['database_loaded'] = true;

    // Step 4: Test database connection
    $debug_info['step'] = 'testing_database_connection';
    $pdo = getDBConnection();
    $debug_info['database_connected'] = true;

    // Step 5: Load JWT Manager
    $debug_info['step'] = 'loading_jwt_manager';
    require_once '../auth/JWTManager.php';
    $debug_info['jwt_manager_loaded'] = true;

    // Step 6: Read POST data
    $debug_info['step'] = 'reading_post_data';
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        $debug_info['error'] = 'Invalid JSON data';
        $debug_info['raw_input'] = $input;
        echo json_encode($debug_info);
        exit;
    }

    $debug_info['data_received'] = true;
    $debug_info['fields'] = array_keys($data);

    // Step 7: Validate required fields
    $debug_info['step'] = 'validating_fields';
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($email) || empty($password)) {
        $debug_info['error'] = 'Email and password are required';
        echo json_encode($debug_info);
        exit;
    }

    $debug_info['email'] = $email;
    $debug_info['password_length'] = strlen($password);

    // Step 8: Check if user exists
    $debug_info['step'] = 'checking_user_exists';
    $stmt = $pdo->prepare("SELECT id, email, username, password_hash, role, is_active, email_verified FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        $debug_info['error'] = 'User not found';
        echo json_encode($debug_info);
        exit;
    }

    $debug_info['user_found'] = true;
    $debug_info['user_info'] = [
        'id' => $user['id'],
        'email' => $user['email'],
        'username' => $user['username'],
        'role' => $user['role'],
        'is_active' => (bool)$user['is_active'],
        'email_verified' => (bool)$user['email_verified']
    ];

    // Step 9: Verify password
    $debug_info['step'] = 'verifying_password';
    if (!password_verify($password, $user['password_hash'])) {
        $debug_info['error'] = 'Invalid password';
        echo json_encode($debug_info);
        exit;
    }

    $debug_info['password_verified'] = true;

    // Step 10: Check user status
    $debug_info['step'] = 'checking_user_status';
    if (!$user['is_active']) {
        $debug_info['error'] = 'Account is not active';
        echo json_encode($debug_info);
        exit;
    }

    if (!$user['email_verified']) {
        $debug_info['error'] = 'Email not verified';
        echo json_encode($debug_info);
        exit;
    }

    // Step 11: Generate JWT token
    $debug_info['step'] = 'generating_jwt_token';
    $token_data = [
        'id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role']
    ];

    try {
        $token = JWTManager::generateToken($token_data, 24); // 24 hours
        $refresh_token = JWTManager::generateToken($token_data, 24 * 7); // 7 days

        $debug_info['token_generated'] = true;
        $debug_info['token_preview'] = substr($token, 0, 30) . '...';

    } catch (Exception $e) {
        $debug_info['jwt_error'] = [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ];
        echo json_encode($debug_info);
        exit;
    }

    // Step 12: Success
    $debug_info['step'] = 'success';
    $debug_info['message'] = 'Login process completed successfully';

    $response = [
        'success' => true,
        'message' => 'Login successful',
        'token' => $token,
        'refresh_token' => $refresh_token,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'first_name' => $user['username'], // fallback
            'last_name' => '',
            'role' => $user['role']
        ],
        'debug_info' => $debug_info
    ];

    echo json_encode($response, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    $error_response = [
        'status' => 'error',
        'step' => $debug_info['step'] ?? 'unknown',
        'debug_info' => $debug_info ?? [],
        'error' => [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ];

    http_response_code(500);
    echo json_encode($error_response, JSON_PRETTY_PRINT);
}
?>