<?php
// Simple API test endpoint to debug 500 errors

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
        'status' => 'success',
        'message' => 'Simple test endpoint working',
        'timestamp' => date('Y-m-d H:i:s'),
        'php_version' => phpversion(),
        'request_method' => $_SERVER['REQUEST_METHOD'],
        'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown'
    ];

    // Test database connection
    try {
        require_once '../config/database.php';
        $pdo = getDBConnection();
        $stmt = $pdo->query("SELECT 1 as test");
        $test_result = $stmt->fetch();

        $response['database'] = [
            'status' => 'connected',
            'test_query' => $test_result ? 'success' : 'failed'
        ];
    } catch (Exception $e) {
        $response['database'] = [
            'status' => 'error',
            'error' => $e->getMessage()
        ];
    }

    // Test auth middleware
    try {
        require_once '../auth/middleware.php';
        $response['auth_middleware'] = [
            'status' => 'loaded',
            'functions_exist' => [
                'requireUserOrAbove' => function_exists('requireUserOrAbove'),
                'getAuthToken' => function_exists('getAuthToken')
            ]
        ];
    } catch (Exception $e) {
        $response['auth_middleware'] = [
            'status' => 'error',
            'error' => $e->getMessage()
        ];
    }

    // Test environment
    $response['environment'] = [
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown',
        'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? 'unknown',
        'include_path' => get_include_path(),
        'working_directory' => getcwd()
    ];

    echo json_encode($response, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    $error_response = [
        'status' => 'error',
        'message' => 'Simple test failed',
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString(),
        'timestamp' => date('Y-m-d H:i:s')
    ];

    http_response_code(500);
    echo json_encode($error_response, JSON_PRETTY_PRINT);
}
?>