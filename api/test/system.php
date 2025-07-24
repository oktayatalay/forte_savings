<?php
require_once '../config/cors.php';

try {
    $system_info = [
        'php_version' => phpversion(),
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'Unknown',
        'current_time' => date('Y-m-d H:i:s'),
        'timezone' => date_default_timezone_get(),
        'memory_limit' => ini_get('memory_limit'),
        'max_execution_time' => ini_get('max_execution_time'),
        'extensions' => [
            'pdo' => extension_loaded('pdo'),
            'pdo_mysql' => extension_loaded('pdo_mysql'),
            'json' => extension_loaded('json'),
            'mbstring' => extension_loaded('mbstring')
        ]
    ];

    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'System information retrieved successfully',
        'data' => $system_info
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'System test failed: ' . $e->getMessage()
    ]);
}
?>