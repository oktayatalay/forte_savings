<?php
// Permanently fix JWT secret inconsistency
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    
    // Generate a consistent JWT secret
    $permanent_jwt_secret = 'forte_savings_production_jwt_' . hash('sha256', 'forte2024_stable_key');
    
    // Insert or update JWT secret in database
    $stmt = $pdo->prepare("
        INSERT INTO system_settings (setting_key, setting_value, updated_at) 
        VALUES ('jwt_secret', ?, NOW())
        ON DUPLICATE KEY UPDATE 
        setting_value = VALUES(setting_value), 
        updated_at = VALUES(updated_at)
    ");
    $stmt->execute([$permanent_jwt_secret]);
    
    // Verify it was saved
    $verify_stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'jwt_secret'");
    $verify_stmt->execute();
    $saved_secret = $verify_stmt->fetchColumn();
    
    // Create a long-lived token (30 days)
    $user_stmt = $pdo->prepare("SELECT id, email, role FROM users WHERE email = 'oktay.atalay@fortetourism.com'");
    $user_stmt->execute();
    $user = $user_stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        $payload = [
            'user_id' => (int)$user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'exp' => time() + (30 * 24 * 3600), // 30 days
            'iat' => time()
        ];
        
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload_json = json_encode($payload);
        
        $header_b64 = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $payload_b64 = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload_json));
        
        $signature = str_replace(['+', '/', '='], ['-', '_', ''], 
            base64_encode(hash_hmac('sha256', $header_b64 . '.' . $payload_b64, $permanent_jwt_secret, true))
        );
        
        $long_token = $header_b64 . '.' . $payload_b64 . '.' . $signature;
    }
    
    echo json_encode([
        'success' => true,
        'jwt_secret_saved' => true,
        'secret_matches' => ($saved_secret === $permanent_jwt_secret),
        'long_lived_token' => $long_token ?? null,
        'token_expires' => '30 days from now',
        'instructions' => [
            '1. Copy the long_lived_token above',
            '2. Set it in localStorage as before',
            '3. This token will work for 30 days',
            '4. Both login.php and middleware.php now use same JWT secret from database'
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>