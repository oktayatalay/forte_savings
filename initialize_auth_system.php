<?php
/**
 * Authentication System Initialization Script
 * Ensures database is properly set up for authentication
 */

require_once 'api/config/database.php';

echo "=== INITIALIZING FORTE SAVINGS AUTHENTICATION SYSTEM ===\n\n";

try {
    $pdo = getDBConnection();
    echo "✓ Database connected successfully\n";
    
    // 1. Ensure system_settings table exists and has JWT secret
    echo "\n1. Setting up system configuration...\n";
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");
    
    // Generate secure JWT secret
    $jwt_secret = hash('sha256', uniqid() . time() . random_bytes(32));
    
    $stmt = $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value, description) 
                           VALUES ('jwt_secret', ?, 'JWT Secret Key for authentication') 
                           ON DUPLICATE KEY UPDATE 
                           setting_value = CASE WHEN setting_value = '' OR setting_value IS NULL THEN VALUES(setting_value) ELSE setting_value END");
    $stmt->execute([$jwt_secret]);
    
    echo "   ✓ JWT secret configured\n";
    
    // 2. Ensure users table is properly configured
    echo "\n2. Setting up users table...\n";
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        email_verified BOOLEAN DEFAULT FALSE,
        email_verification_token VARCHAR(255) NULL,
        password_reset_token VARCHAR(255) NULL,
        password_reset_expires DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");
    
    echo "   ✓ Users table ready\n";
    
    // 3. Ensure admin user exists
    echo "\n3. Setting up admin user...\n";
    
    $stmt = $pdo->prepare("SELECT id FROM users WHERE role = 'admin' AND email = 'admin@fortetourism.com'");
    $stmt->execute();
    
    if (!$stmt->fetch()) {
        // Create admin user
        $admin_password = 'ForteSavings2024!'; // Strong default password
        $password_hash = password_hash($admin_password, PASSWORD_BCRYPT, ['cost' => 12]);
        
        $stmt = $pdo->prepare("INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified) 
                               VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            'admin@fortetourism.com',
            $password_hash,
            'System',
            'Administrator',
            'admin',
            1,
            1
        ]);
        
        echo "   ✓ Admin user created\n";
        echo "   📧 Email: admin@fortetourism.com\n";
        echo "   🔑 Password: $admin_password\n";
        echo "   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!\n";
    } else {
        echo "   ✓ Admin user already exists\n";
    }
    
    // 4. Set up other required tables
    echo "\n4. Setting up supporting tables...\n";
    
    // Refresh tokens table
    $pdo->exec("CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");
    
    // Audit logs table
    $pdo->exec("CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(50) NOT NULL,
        record_id INT NOT NULL,
        old_values JSON,
        new_values JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");
    
    echo "   ✓ Supporting tables ready\n";
    
    // 5. Clean up old tokens
    echo "\n5. Cleaning up expired tokens...\n";
    
    $stmt = $pdo->prepare("DELETE FROM refresh_tokens WHERE expires_at < NOW()");
    $stmt->execute();
    $deleted = $stmt->rowCount();
    
    echo "   ✓ Removed $deleted expired tokens\n";
    
    // 6. Verify system configuration
    echo "\n6. Verifying system configuration...\n";
    
    $checks = [
        "SELECT COUNT(*) FROM users WHERE role = 'admin'" => "Admin users",
        "SELECT COUNT(*) FROM system_settings WHERE setting_key = 'jwt_secret' AND setting_value != ''" => "JWT secret",
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'refresh_tokens'" => "Refresh tokens table",
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs'" => "Audit logs table"
    ];
    
    foreach ($checks as $query => $description) {
        $stmt = $pdo->query($query);
        $count = $stmt->fetchColumn();
        if ($count > 0) {
            echo "   ✓ $description: OK\n";
        } else {
            echo "   ✗ $description: FAILED\n";
        }
    }
    
    echo "\n=== INITIALIZATION COMPLETE ===\n";
    echo "🎉 Authentication system is ready!\n\n";
    
    echo "Next steps:\n";
    echo "1. Test the login endpoint with admin credentials\n";
    echo "2. Create additional users via registration endpoint\n";
    echo "3. Implement frontend authentication flow\n";
    echo "4. Set up proper email verification (optional)\n";
    echo "5. Configure production security settings\n";
    
} catch (Exception $e) {
    echo "❌ Initialization failed: " . $e->getMessage() . "\n";
    echo "Please check your database configuration and try again.\n";
    exit(1);
}
?>