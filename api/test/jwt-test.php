<?php
require_once '../config/database.php';
require_once '../auth/JWTManager.php';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Test database connection
    $pdo = getDBConnection();
    echo json_encode([
        'success' => true,
        'message' => 'JWT Test Endpoint',
        'database' => 'Connected',
        'timestamp' => date('Y-m-d H:i:s'),
        'jwt_test' => JWTManager::test()
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}
?>