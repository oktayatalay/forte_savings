<?php
// Generate a fresh JWT token for dashboard access
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    
    // Get your user info
    $user_stmt = $pdo->prepare("SELECT id, email, role FROM users WHERE email = 'oktay.atalay@fortetourism.com'");
    $user_stmt->execute();
    $user = $user_stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo json_encode(['error' => 'User not found']);
        exit;
    }
    
    // Get JWT secret from database or use fallback
    $jwt_secret = null;
    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'jwt_secret'");
        $stmt->execute();
        $jwt_secret = $stmt->fetchColumn();
    } catch (Exception $e) {
        // Fallback
    }
    
    if (empty($jwt_secret)) {
        $jwt_secret = 'default_jwt_secret_change_in_production_' . hash('sha256', 'forte_savings_2024');
    }
    
    // Create new token with longer expiry
    $payload = [
        'user_id' => (int)$user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'exp' => time() + (24 * 3600), // 24 hours
        'iat' => time()
    ];
    
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload_json = json_encode($payload);
    
    $header_b64 = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $payload_b64 = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload_json));
    
    $signature = str_replace(['+', '/', '='], ['-', '_', ''], 
        base64_encode(hash_hmac('sha256', $header_b64 . '.' . $payload_b64, $jwt_secret, true))
    );
    
    $new_token = $header_b64 . '.' . $payload_b64 . '.' . $signature;
    
    echo json_encode([
        'success' => true,
        'new_token' => $new_token,
        'user_info' => $user,
        'expires_in' => '24 hours',
        'instructions' => [
            '1. Copy the new_token above',
            '2. Go to https://savings.forte.works/auth/login',
            '3. Open F12 Developer Tools',
            '4. Go to Application/Storage tab',
            '5. Find localStorage -> savings.forte.works',
            '6. Set token key to the new_token value',
            '7. Refresh the dashboard page'
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>