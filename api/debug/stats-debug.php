<?php
// Debug version of stats.php to identify 500 errors

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
        'request_method' => $_SERVER['REQUEST_METHOD']
    ];

    // Step 1: Load CORS
    $debug_info['step'] = 'loading_cors';
    require_once '../config/cors.php';
    $debug_info['cors_loaded'] = true;

    // Step 2: Load Database
    $debug_info['step'] = 'loading_database';
    require_once '../config/database.php';
    $debug_info['database_loaded'] = true;

    // Step 3: Test database connection
    $debug_info['step'] = 'testing_database_connection';
    $pdo = getDBConnection();
    $debug_info['database_connected'] = true;

    // Step 4: Load auth middleware
    $debug_info['step'] = 'loading_auth_middleware';
    require_once '../auth/middleware.php';
    $debug_info['auth_middleware_loaded'] = true;

    // Step 5: Check if functions exist
    $debug_info['step'] = 'checking_functions';
    $debug_info['functions'] = [
        'requireUserOrAbove' => function_exists('requireUserOrAbove'),
        'getDBConnection' => function_exists('getDBConnection'),
        'getAuthToken' => function_exists('getAuthToken')
    ];

    // Step 6: Check request method
    $debug_info['step'] = 'checking_request_method';
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        $debug_info['error'] = 'Only GET method allowed';
        echo json_encode($debug_info);
        exit;
    }

    // Step 7: Get authorization header
    $debug_info['step'] = 'checking_auth_header';
    $headers = [];
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers['HTTP_AUTHORIZATION'] = 'present';
    }
    if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $headers['REDIRECT_HTTP_AUTHORIZATION'] = 'present';
    }
    $debug_info['headers'] = $headers;

    // Step 8: Try authentication (this is where it might fail)
    $debug_info['step'] = 'attempting_authentication';

    try {
        $auth_data = requireUserOrAbove();
        $debug_info['auth_success'] = true;
        $debug_info['user_id'] = $auth_data['user_id'] ?? 'unknown';
        $debug_info['user_role'] = $auth_data['role'] ?? 'unknown';
    } catch (Exception $e) {
        $debug_info['auth_error'] = [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ];
        echo json_encode($debug_info, JSON_PRETTY_PRINT);
        exit;
    }

    // Step 9: Test simple query
    $debug_info['step'] = 'testing_simple_query';
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM users");
    $user_count = $stmt->fetchColumn();
    $debug_info['user_count'] = $user_count;

    $debug_info['step'] = 'success';
    $debug_info['message'] = 'All steps completed successfully';

    echo json_encode($debug_info, JSON_PRETTY_PRINT);

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