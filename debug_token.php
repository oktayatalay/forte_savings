<?php
require_once 'api/config/database.php';

// URL'den token al
$token = $_GET['token'] ?? '';

if (!$token) {
    echo json_encode(['error' => 'Token parameter required']);
    exit;
}

try {
    $pdo = getDBConnection();
    
    echo "<h2>Token Debug Information</h2>";
    echo "<p><strong>Token:</strong> " . htmlspecialchars($token) . "</p>";
    
    // Token'ın database'de olup olmadığını kontrol et
    $stmt = $pdo->prepare("
        SELECT id, email, first_name, last_name, email_verified, email_verification_token,
               created_at, updated_at
        FROM users 
        WHERE email_verification_token = ?
    ");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "<h3>Token Search Results:</h3>";
    if ($user) {
        echo "<p style='color: green;'>✅ Token found in database!</p>";
        echo "<pre>";
        print_r($user);
        echo "</pre>";
        
        if ($user['email_verified']) {
            echo "<p style='color: orange;'>⚠️ User is already verified!</p>";
        } else {
            echo "<p style='color: blue;'>ℹ️ User is not yet verified - token should work</p>";
        }
    } else {
        echo "<p style='color: red;'>❌ Token NOT found in database</p>";
        
        // Tüm kullanıcıları göster debug için
        $all_stmt = $pdo->prepare("SELECT id, email, email_verified, LEFT(email_verification_token, 20) as token_preview FROM users ORDER BY created_at DESC LIMIT 5");
        $all_stmt->execute();
        $all_users = $all_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<h3>Recent Users (for debug):</h3>";
        echo "<pre>";
        print_r($all_users);
        echo "</pre>";
    }
    
    // Aynı token'la verify işlemini simüle et
    echo "<h3>Verification Test:</h3>";
    $verify_stmt = $pdo->prepare("
        SELECT id, email, first_name, last_name 
        FROM users 
        WHERE email_verification_token = ? AND email_verified = FALSE
    ");
    $verify_stmt->execute([$token]);
    $verify_user = $verify_stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($verify_user) {
        echo "<p style='color: green;'>✅ Verification would SUCCEED</p>";
        echo "<p>User: " . htmlspecialchars($verify_user['email']) . "</p>";
    } else {
        echo "<p style='color: red;'>❌ Verification would FAIL</p>";
        echo "<p>Reason: Token not found OR user already verified</p>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'>Database Error: " . htmlspecialchars($e->getMessage()) . "</p>";
}
?>