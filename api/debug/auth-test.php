<?php
// Direct authentication test without CORS dependencies

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $response = [
        'step' => 'initialization',
        'timestamp' => date('Y-m-d H:i:s'),
        'request_method' => $_SERVER['REQUEST_METHOD']
    ];

    // Step 1: Load database directly
    $response['step'] = 'loading_database';
    require_once '../config/database.php';
    $pdo = getDBConnection();
    $response['database_connected'] = true;

    // Step 2: Load JWT manager directly
    $response['step'] = 'loading_jwt_manager';
    require_once '../auth/JWTManager.php';
    $response['jwt_manager_loaded'] = true;

    // Step 3: Get authorization header
    $response['step'] = 'checking_auth_header';
    $auth_header = null;

    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $auth_header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) {
            $auth_header = $headers['Authorization'];
        }
    }

    $response['auth_header'] = $auth_header ? 'present' : 'missing';

    if (!$auth_header) {
        $response['error'] = 'No authorization header found';
        $response['all_headers'] = $_SERVER;
        echo json_encode($response, JSON_PRETTY_PRINT);
        exit;
    }

    // Step 4: Parse token
    $response['step'] = 'parsing_token';
    if (!preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
        $response['error'] = 'Invalid authorization header format';
        $response['header_value'] = $auth_header;
        echo json_encode($response, JSON_PRETTY_PRINT);
        exit;
    }

    $token = $matches[1];
    $response['token'] = substr($token, 0, 20) . '...';

    // Step 5: Verify token with JWT manager
    $response['step'] = 'verifying_token';
    try {
        $user_data = JWTManager::verifyToken($token);

        if ($user_data === false) {
            $response['error'] = 'Token verification failed';
            echo json_encode($response, JSON_PRETTY_PRINT);
            exit;
        }

        $response['token_valid'] = true;
        $response['user_id'] = $user_data['id'] ?? 'unknown';
        $response['user_email'] = $user_data['email'] ?? 'unknown';

    } catch (Exception $e) {
        $response['jwt_error'] = [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ];
        echo json_encode($response, JSON_PRETTY_PRINT);
        exit;
    }

    // Step 6: Check if user exists in database
    $response['step'] = 'checking_user_exists';
    $stmt = $pdo->prepare("SELECT id, email, role, is_active FROM users WHERE id = ? AND is_active = 1");
    $stmt->execute([$user_data['id']]);
    $db_user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$db_user) {
        $response['error'] = 'User not found or inactive';
        echo json_encode($response, JSON_PRETTY_PRINT);
        exit;
    }

    $response['user_exists'] = true;
    $response['user_role'] = $db_user['role'];

    $response['step'] = 'success';
    $response['message'] = 'Authentication successful';

    echo json_encode($response, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    $error_response = [
        'status' => 'error',
        'step' => $response['step'] ?? 'unknown',
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