<?php
require_once '../config/cors.php';

try {
    // Check .env file
    $envFile = __DIR__ . '/../../.env';
    $envExists = file_exists($envFile);
    
    // Show environment variables (safely)
    $debug_info = [
        'env_file_exists' => $envExists,
        'env_file_path' => $envFile,
        'db_host' => getenv('DB_HOST') ?: $_ENV['DB_HOST'] ?? 'NOT SET',
        'db_name' => getenv('DB_NAME') ?: $_ENV['DB_NAME'] ?? 'NOT SET',
        'db_user' => getenv('DB_USER') ?: $_ENV['DB_USER'] ?? 'NOT SET',
        'db_pass_set' => !empty(getenv('DB_PASS')) || !empty($_ENV['DB_PASS']),
        'current_dir' => __DIR__,
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'NOT SET'
    ];
    
    if ($envExists) {
        $debug_info['env_file_size'] = filesize($envFile);
        $debug_info['env_file_readable'] = is_readable($envFile);
    }

    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Environment debug information',
        'data' => $debug_info
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Debug failed: ' . $e->getMessage()
    ]);
}
?>