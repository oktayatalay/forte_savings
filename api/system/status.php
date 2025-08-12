<?php
require_once '../config/cors.php';
require_once '../config/database.php';

header('Content-Type: application/json; charset=UTF-8');

try {
    $pdo = getDBConnection();
    
    // Basic system health checks
    $checks = [
        'database' => false,
        'jwt_config' => false,
        'auth_system' => false
    ];
    
    // Database connectivity
    $stmt = $pdo->query("SELECT 1 as test");
    if ($stmt && $stmt->fetchColumn()) {
        $checks['database'] = true;
    }
    
    // JWT configuration check
    $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'jwt_secret'");
    $stmt->execute();
    if ($stmt->fetchColumn()) {
        $checks['jwt_config'] = true;
    }
    
    // Auth system check
    $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE is_active = TRUE");
    if ($stmt && $stmt->fetchColumn() > 0) {
        $checks['auth_system'] = true;
    }
    
    $all_healthy = array_reduce($checks, function($carry, $item) {
        return $carry && $item;
    }, true);
    
    http_response_code($all_healthy ? 200 : 503);
    echo json_encode([
        'success' => true,
        'status' => $all_healthy ? 'healthy' : 'degraded',
        'checks' => $checks,
        'timestamp' => date('Y-m-d H:i:s'),
        'version' => '1.0.1'
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'status' => 'error',
        'error' => 'System check failed',
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}
?>