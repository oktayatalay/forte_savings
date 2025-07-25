<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../auth/middleware.php';

header('Content-Type: application/json');

try {
    // Authentication test
    $auth_data = requireUserOrAbove();
    
    echo json_encode([
        'success' => true,
        'message' => 'API çalışıyor',
        'user' => [
            'id' => $auth_data['user_id'],
            'email' => $auth_data['email'],
            'role' => $auth_data['role']
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>