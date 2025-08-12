<?php
require_once 'api/config/database.php';

try {
    $pdo = getDBConnection();
    echo "Database connection successful!\n\n";
    
    // Check if system_settings table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'system_settings'");
    $table_exists = $stmt->rowCount() > 0;
    
    if ($table_exists) {
        echo "system_settings table EXISTS\n";
        
        // Check if jwt_secret exists
        $stmt = $pdo->prepare("SELECT setting_key, setting_value FROM system_settings WHERE setting_key = 'jwt_secret'");
        $stmt->execute();
        $jwt_setting = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($jwt_setting) {
            echo "JWT secret row exists\n";
            echo "Value: " . ($jwt_setting['setting_value'] ? '[SET - ' . strlen($jwt_setting['setting_value']) . ' chars]' : '[EMPTY]') . "\n";
        } else {
            echo "JWT secret row NOT FOUND\n";
        }
        
        // Show all system_settings
        echo "\nAll system settings:\n";
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM system_settings");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $value = $row['setting_value'] ?: '[EMPTY]';
            if ($row['setting_key'] === 'jwt_secret' && $value !== '[EMPTY]') {
                $value = '[SET - ' . strlen($row['setting_value']) . ' chars]';
            }
            echo "- {$row['setting_key']}: {$value}\n";
        }
    } else {
        echo "system_settings table NOT FOUND\n";
    }
    
    // Test fallback secret generation
    echo "\nFallback secret test:\n";
    $fallback_secret = 'default_jwt_secret_change_in_production_' . hash('sha256', 'forte_savings_2024');
    echo "Fallback secret length: " . strlen($fallback_secret) . " chars\n";
    echo "Fallback secret hash: " . hash('sha256', $fallback_secret) . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>