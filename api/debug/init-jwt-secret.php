<?php
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    
    echo "Initializing JWT Secret...\n";
    
    // Check if system_settings table exists
    $table_check = $pdo->prepare("SHOW TABLES LIKE 'system_settings'");
    $table_check->execute();
    
    if ($table_check->rowCount() == 0) {
        echo "Creating system_settings table...\n";
        
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
        echo "✅ system_settings table created\n";
    }
    
    // Check if JWT secret exists
    $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'jwt_secret'");
    $stmt->execute();
    $existing_secret = $stmt->fetchColumn();
    
    if (empty($existing_secret)) {
        // Generate secure JWT secret
        $jwt_secret = bin2hex(random_bytes(32));
        
        // Insert JWT secret
        $insert_stmt = $pdo->prepare("
            INSERT INTO system_settings (setting_key, setting_value) 
            VALUES ('jwt_secret', ?)
        ");
        $insert_stmt->execute([$jwt_secret]);
        
        echo "✅ JWT secret generated and saved to database\n";
        echo "Secret preview: " . substr($jwt_secret, 0, 20) . "...\n";
        
    } else {
        echo "✅ JWT secret already exists in database\n";
        echo "Secret preview: " . substr($existing_secret, 0, 20) . "...\n";
    }
    
    echo "\n🎉 JWT Secret initialization complete!\n";
    echo "\nNow try logging in again - the INVALID_TOKEN error should be resolved.\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>