<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    
    // Check if JWT secret exists
    $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'jwt_secret'");
    $stmt->execute();
    $existing_secret = $stmt->fetchColumn();
    
    if (empty($existing_secret)) {
        // Generate new JWT secret
        $new_secret = bin2hex(random_bytes(32));
        
        // Insert or update JWT secret
        $insert_stmt = $pdo->prepare("
            INSERT INTO system_settings (setting_key, setting_value, created_at, updated_at) 
            VALUES ('jwt_secret', ?, NOW(), NOW()) 
            ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()
        ");
        $insert_stmt->execute([$new_secret, $new_secret]);
        
        echo json_encode([
            'success' => true,
            'message' => 'JWT secret generated and saved',
            'action' => 'created',
            'secret_preview' => substr($new_secret, 0, 20) . '...'
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'message' => 'JWT secret already exists',
            'action' => 'exists',
            'secret_preview' => substr($existing_secret, 0, 20) . '...'
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>