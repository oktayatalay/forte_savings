<?php
require_once '../config/cors.php';
require_once '../config/database.php';

try {
    $database = new Database();
    $result = $database->testConnection();
    
    http_response_code($result['success'] ? 200 : 500);
    echo json_encode([
        'status' => $result['success'] ? 'success' : 'error',
        'message' => $result['message'],
        'timestamp' => date('Y-m-d H:i:s'),
        'server_info' => $result['server_info'] ?? null
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Test failed: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>