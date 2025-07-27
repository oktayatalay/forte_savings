<?php
/**
 * Security Verification Script for Forte Savings
 * This script verifies all security configurations are properly implemented
 */

require_once 'api/config/database.php';
require_once 'api/config/mail.php';

echo "=== FORTE SAVINGS SECURITY VERIFICATION ===\n\n";

// 1. Check Environment Configuration
echo "1. ENVIRONMENT CONFIGURATION:\n";
$env_file = __DIR__ . '/.env';
if (file_exists($env_file)) {
    echo "✓ .env file exists\n";
    
    $env_content = file_get_contents($env_file);
    
    // Check for environment variables
    $required_vars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'ADMIN_PASSWORD_HASH'];
    foreach ($required_vars as $var) {
        if (strpos($env_content, $var . '=') !== false) {
            echo "✓ $var is configured\n";
        } else {
            echo "✗ $var is missing\n";
        }
    }
    
    // Check for hardcoded credentials (should not be present)
    if (strpos($env_content, 'admin123') === false) {
        echo "✓ No default 'admin123' password found\n";
    } else {
        echo "✗ Default password 'admin123' still present\n";
    }
} else {
    echo "✗ .env file not found\n";
}

echo "\n2. SMTP SECURITY CONFIGURATION:\n";
try {
    $mail_service = new MailService();
    echo "✓ MailService instantiated successfully (environment variables loaded)\n";
    
    // Check if mail.php uses environment variables
    $mail_content = file_get_contents('api/config/mail.php');
    if (strpos($mail_content, 'verify_peer\' => true') !== false) {
        echo "✓ SSL peer verification enabled\n";
    }
    if (strpos($mail_content, 'verify_peer_name\' => true') !== false) {
        echo "✓ SSL peer name verification enabled\n";
    }
    if (strpos($mail_content, 'allow_self_signed\' => false') !== false) {
        echo "✓ Self-signed certificates disabled\n";
    }
    
} catch (Exception $e) {
    echo "✗ MailService error: " . $e->getMessage() . "\n";
}

echo "\n3. DATABASE SECURITY:\n";
try {
    $db = new Database();
    $conn = $db->getConnection();
    echo "✓ Database connection successful\n";
    
    // Check admin password
    $stmt = $conn->prepare("SELECT password_hash FROM users WHERE email = 'admin@fortetourism.com' AND role = 'admin'");
    $stmt->execute();
    $admin_hash = $stmt->fetchColumn();
    
    if ($admin_hash && $admin_hash !== '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi') {
        echo "✓ Admin password updated from default\n";
    } else {
        echo "✗ Admin still using default password\n";
    }
    
} catch (Exception $e) {
    echo "✗ Database error: " . $e->getMessage() . "\n";
}

echo "\n4. FILE SYSTEM SECURITY:\n";
// Check for test directories
if (!is_dir('api/test')) {
    echo "✓ api/test directory not present\n";
} else {
    echo "✗ api/test directory still exists\n";
}

// Check for debug files
$debug_files = glob('api/**/*debug*', GLOB_BRACE);
if (empty($debug_files)) {
    echo "✓ No debug files found\n";
} else {
    echo "✗ Debug files found: " . implode(', ', $debug_files) . "\n";
}

echo "\n5. CODE SECURITY:\n";
// Check for common security issues in application code (excluding phpmailer)
$php_files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator('api', RecursiveDirectoryIterator::SKIP_DOTS)
);

$security_issues = 0;
foreach ($php_files as $file) {
    if (pathinfo($file, PATHINFO_EXTENSION) === 'php' && strpos($file, 'phpmailer') === false) {
        $content = file_get_contents($file);
        
        // Check for eval, exec, system calls
        if (preg_match('/\b(eval|exec|system|shell_exec|passthru|`[^`]*`)\s*\(/', $content)) {
            echo "✗ Potentially dangerous function found in: $file\n";
            $security_issues++;
        }
        
        // Check for SQL injection vulnerabilities (basic check)
        if (preg_match('/query\s*\(\s*["\'].*\$_[GET|POST|REQUEST]/', $content)) {
            echo "✗ Potential SQL injection in: $file\n";
            $security_issues++;
        }
    }
}

if ($security_issues === 0) {
    echo "✓ No obvious security issues found in application code\n";
}

echo "\n=== SECURITY VERIFICATION COMPLETE ===\n";
echo "Timestamp: " . date('Y-m-d H:i:s') . "\n";
?>