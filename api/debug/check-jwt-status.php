<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    
    // JWT secret durumunu kontrol et
    $jwt_from_db = null;
    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'jwt_secret'");
        $stmt->execute();
        $jwt_from_db = $stmt->fetchColumn();
    } catch (Exception $e) {
        $jwt_from_db = "ERROR: " . $e->getMessage();
    }
    
    // Fallback secret oluştur
    $fallback_secret = 'default_jwt_secret_change_in_production_' . hash('sha256', 'forte_savings_2024');
    
    // Test token - kendin oluştur
    $test_payload = [
        'user_id' => 2,
        'email' => 'oktay.atalay@fortetourism.com', 
        'role' => 'admin',
        'exp' => time() + 3600,
        'iat' => time()
    ];
    
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode($test_payload);
    
    $header_b64 = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $payload_b64 = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
    
    $secret_to_use = empty($jwt_from_db) ? $fallback_secret : $jwt_from_db;
    $signature = str_replace(['+', '/', '='], ['-', '_', ''], 
        base64_encode(hash_hmac('sha256', $header_b64 . '.' . $payload_b64, $secret_to_use, true))
    );
    
    $new_token = $header_b64 . '.' . $payload_b64 . '.' . $signature;
    
    echo json_encode([
        'jwt_from_db' => $jwt_from_db ?: "NULL",
        'using_fallback' => empty($jwt_from_db),
        'fallback_secret_preview' => substr($fallback_secret, 0, 50) . "...",
        'new_test_token' => $new_token,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>