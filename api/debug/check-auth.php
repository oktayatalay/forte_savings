<?php
header('Content-Type: text/html; charset=UTF-8');
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    
    echo "<h1>Authentication Debug</h1>";
    
    // 1. Check JWT secret
    echo "<h2>1. JWT Secret Check</h2>";
    $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'jwt_secret'");
    $stmt->execute();
    $jwt_secret = $stmt->fetchColumn();
    
    if (empty($jwt_secret)) {
        echo "<p style='color: red'>🚨 <strong>JWT SECRET MISSING!</strong> This will cause all tokens to fail.</p>";
        
        // Generate and insert JWT secret
        $new_secret = bin2hex(random_bytes(32));
        $insert_stmt = $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value, created_at, updated_at) VALUES ('jwt_secret', ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()");
        $insert_stmt->execute([$new_secret, $new_secret]);
        
        echo "<p style='color: green'>✅ <strong>JWT SECRET GENERATED AND SAVED</strong></p>";
        echo "<p><strong>New JWT Secret:</strong> " . substr($new_secret, 0, 20) . "... (truncated for security)</p>";
        
    } else {
        echo "<p style='color: green'>✅ JWT Secret exists: " . substr($jwt_secret, 0, 20) . "... (truncated for security)</p>";
    }
    
    // 2. Check system_settings table structure
    echo "<h2>2. System Settings Table</h2>";
    $settings_sql = "SELECT * FROM system_settings WHERE setting_key = 'jwt_secret'";
    $settings_stmt = $pdo->prepare($settings_sql);
    $settings_stmt->execute();
    $settings = $settings_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($settings) > 0) {
        echo "<table border='1' cellpadding='5' style='border-collapse: collapse'>";
        echo "<tr style='background-color: #f0f0f0'>";
        echo "<th>Setting Key</th><th>Setting Value (Partial)</th><th>Created At</th><th>Updated At</th>";
        echo "</tr>";
        foreach ($settings as $setting) {
            echo "<tr>";
            echo "<td>{$setting['setting_key']}</td>";
            echo "<td>" . substr($setting['setting_value'], 0, 20) . "...</td>";
            echo "<td>{$setting['created_at']}</td>";
            echo "<td>{$setting['updated_at']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    
    // 3. Test token parsing
    echo "<h2>3. Token Parsing Test</h2>";
    
    // Show what headers are available
    echo "<h3>Available Headers:</h3>";
    echo "<pre>";
    echo "HTTP_AUTHORIZATION: " . ($_SERVER['HTTP_AUTHORIZATION'] ?? 'NOT SET') . "\n";
    echo "REDIRECT_HTTP_AUTHORIZATION: " . ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? 'NOT SET') . "\n";
    
    if (function_exists('apache_request_headers')) {
        $apache_headers = apache_request_headers();
        echo "Apache Headers Authorization: " . ($apache_headers['Authorization'] ?? $apache_headers['authorization'] ?? 'NOT SET') . "\n";
    }
    
    if (function_exists('getallheaders')) {
        $all_headers = getallheaders();
        if ($all_headers) {
            foreach ($all_headers as $key => $value) {
                if (strtolower($key) === 'authorization') {
                    echo "getallheaders() Authorization: " . $value . "\n";
                }
            }
        }
    }
    echo "</pre>";
    
    // 4. Check users table
    echo "<h2>4. Active Users Check</h2>";
    $users_sql = "SELECT id, email, role, is_active, created_at FROM users WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 5";
    $users_stmt = $pdo->prepare($users_sql);
    $users_stmt->execute();
    $users = $users_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<p><strong>Active users count:</strong> " . count($users) . "</p>";
    
    if (count($users) > 0) {
        echo "<table border='1' cellpadding='5' style='border-collapse: collapse'>";
        echo "<tr style='background-color: #f0f0f0'>";
        echo "<th>ID</th><th>Email</th><th>Role</th><th>Is Active</th><th>Created At</th>";
        echo "</tr>";
        foreach ($users as $user) {
            echo "<tr>";
            echo "<td>{$user['id']}</td>";
            echo "<td>{$user['email']}</td>";
            echo "<td>{$user['role']}</td>";
            echo "<td>" . ($user['is_active'] ? '✅ Yes' : '❌ No') . "</td>";
            echo "<td>{$user['created_at']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    
    // 5. Instructions
    echo "<h2>5. Fix Instructions</h2>";
    echo "<div style='background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0;'>";
    echo "<h4>If INVALID_TOKEN error persists:</h4>";
    echo "<ol>";
    echo "<li><strong>Clear browser localStorage:</strong> Open browser console and run <code>localStorage.clear()</code></li>";
    echo "<li><strong>Re-login:</strong> Go to login page and login again to get a new token</li>";
    echo "<li><strong>Check token expiration:</strong> Tokens may have expired, requiring re-authentication</li>";
    echo "</ol>";
    echo "</div>";
    
} catch (Exception $e) {
    echo "<p style='color: red'>Error: " . htmlspecialchars($e->getMessage()) . "</p>";
}
?>

<style>
body { font-family: Arial, sans-serif; margin: 20px; }
table { width: 100%; margin: 10px 0; }
pre { background-color: #f8f9fa; padding: 10px; border: 1px solid #ddd; }
</style>