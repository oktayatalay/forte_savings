<?php
/**
 * JWT Initialization Utility
 * Run this script to properly initialize JWT secret in database
 * 
 * Usage: php init_jwt.php [--force]
 */

require_once '../config/database.php';
require_once 'JWTManager.php';

function initializeJWTAuth($force = false) {
    echo "JWT Authentication Initialization\n";
    echo "================================\n\n";
    
    try {
        $pdo = getDBConnection();
        echo "✓ Database connection successful\n";
        
        // Check if system_settings table exists
        $stmt = $pdo->query("SHOW TABLES LIKE 'system_settings'");
        if ($stmt->rowCount() == 0) {
            echo "✗ system_settings table does not exist\n";
            echo "Please run database/create_tables.sql first\n";
            return false;
        }
        echo "✓ system_settings table exists\n";
        
        // Check current JWT secret
        $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'jwt_secret'");
        $stmt->execute();
        $current_secret = $stmt->fetchColumn();
        
        if ($current_secret && !$force) {
            echo "✓ JWT secret already exists (length: " . strlen($current_secret) . " chars)\n";
            echo "Use --force to regenerate\n";
        } else {
            echo ($force ? "⟳ Regenerating" : "⚙ Initializing") . " JWT secret...\n";
            
            $new_secret = JWTManager::initializeJWTSecret($force);
            if ($new_secret) {
                echo "✓ JWT secret initialized successfully\n";
                echo "  Length: " . strlen($new_secret) . " chars\n";
            } else {
                echo "✗ Failed to initialize JWT secret\n";
                return false;
            }
        }
        
        // Test JWT operations
        echo "\nTesting JWT operations...\n";
        
        $test_payload = [
            'user_id' => 1,
            'email' => 'test@fortetourism.com',
            'role' => 'admin',
            'exp' => time() + 3600,
            'iat' => time()
        ];
        
        $token = JWTManager::generateToken($test_payload);
        echo "✓ Token generation successful\n";
        echo "  Token length: " . strlen($token) . " chars\n";
        
        $verified = JWTManager::verifyToken($token);
        if ($verified && $verified['user_id'] == $test_payload['user_id']) {
            echo "✓ Token verification successful\n";
        } else {
            echo "✗ Token verification failed\n";
            return false;
        }
        
        echo "\n🎉 JWT Authentication initialization completed successfully!\n";
        echo "\nNext steps:\n";
        echo "1. Restart your web server\n";
        echo "2. Clear any browser tokens/localStorage\n";
        echo "3. Try logging in again\n";
        
        return true;
        
    } catch (Exception $e) {
        echo "✗ Error: " . $e->getMessage() . "\n";
        return false;
    }
}

// Command line arguments
$force = in_array('--force', $argv);

if (!initializeJWTAuth($force)) {
    exit(1);
}
?>