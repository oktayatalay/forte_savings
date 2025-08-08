<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    
    // Calculate the fallback secret (same as in login.php and middleware.php)
    $fallback_secret = 'default_jwt_secret_change_in_production_' . hash('sha256', 'forte_savings_2024');
    
    $result = [
        'success' => false,
        'actions_taken' => []
    ];
    
    // 1. Check/Create system_settings table
    try {
        $table_check = $pdo->prepare("SHOW TABLES LIKE 'system_settings'");
        $table_check->execute();
        
        if ($table_check->rowCount() == 0) {
            $create_table = $pdo->prepare("
                CREATE TABLE system_settings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    setting_key VARCHAR(255) NOT NULL UNIQUE,
                    setting_value TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            ");
            $create_table->execute();
            $result['actions_taken'][] = 'Created system_settings table';
        }
    } catch (Exception $e) {
        $result['error'] = 'Failed to create table: ' . $e->getMessage();
        echo json_encode($result);
        exit;
    }
    
    // 2. Insert/Update JWT secret to match fallback
    try {
        $insert_stmt = $pdo->prepare("
            INSERT INTO system_settings (setting_key, setting_value) 
            VALUES ('jwt_secret', ?) 
            ON DUPLICATE KEY UPDATE setting_value = ?
        ");
        $insert_stmt->execute([$fallback_secret, $fallback_secret]);
        
        $result['actions_taken'][] = 'Synced JWT secret with fallback';
        $result['success'] = true;
        $result['secret_preview'] = substr($fallback_secret, 0, 20) . '...';
        
    } catch (Exception $e) {
        $result['error'] = 'Failed to sync JWT secret: ' . $e->getMessage();
    }
    
    echo json_encode($result, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>