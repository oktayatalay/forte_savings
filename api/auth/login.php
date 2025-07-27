<?php
require_once '../security/SecurityMiddleware.php';
require_once '../config/database.php';

// Apply comprehensive security
SecurityMiddleware::setupAuth();

// Validate input with enhanced security
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    SecureErrorHandler::sendErrorResponse('INVALID_INPUT', 'Invalid JSON input', [], 400);
}

// Enhanced input validation
$validationRules = [
    'email' => ['type' => 'email', 'required' => true],
    'password' => ['type' => 'text', 'required' => true, 'max_length' => 1000]
];

$validated = SecurityMiddleware::validateInput($input, $validationRules);
$email = $validated['email'];
$password = $validated['password'];

try {
    $pdo = getDBConnection();
    
    // Kullanıcıyı bul
    $stmt = $pdo->prepare("
        SELECT id, email, password_hash, first_name, last_name, role, is_active, email_verified 
        FROM users 
        WHERE email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        SecureErrorHandler::handleAuthError('Invalid email or password', 'AUTH_FAILED', 401);
    }
    
    // Şifre kontrolü
    if (!password_verify($password, $user['password_hash'])) {
        // Apply progressive delay for failed attempts
        $attemptCount = RateLimiter::getStatus()['auth_attempts'] ?? 0;
        RateLimiter::applyProgressiveDelay($email, $attemptCount);
        
        SecureErrorHandler::handleAuthError('Invalid email or password', 'AUTH_FAILED', 401);
    }
    
    // Kullanıcı aktif mi?
    if (!$user['is_active']) {
        SecureErrorHandler::handleAuthError('Account is deactivated', 'ACCOUNT_INACTIVE', 401);
    }
    
    // Email doğrulandı mı?
    if (!$user['email_verified']) {
        SecureErrorHandler::handleAuthError('Email verification required', 'EMAIL_NOT_VERIFIED', 401);
    }
    
    // JWT Secret'ı al
    $settings_stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'jwt_secret'");
    $settings_stmt->execute();
    $jwt_secret = $settings_stmt->fetchColumn();
    
    if (empty($jwt_secret)) {
        error_log("JWT secret not configured");
        SecureErrorHandler::sendErrorResponse('CONFIG_ERROR', 'Authentication system not configured', [], 500);
    }
    
    // JWT Token oluştur
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode([
        'user_id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'exp' => time() + (24 * 60 * 60), // 24 saat
        'iat' => time()
    ]);
    
    $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
    
    $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, $jwt_secret, true);
    $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    $jwt = $base64Header . "." . $base64Payload . "." . $base64Signature;
    
    // Refresh token oluştur
    $refresh_token = bin2hex(random_bytes(32));
    $refresh_expires = date('Y-m-d H:i:s', time() + (30 * 24 * 60 * 60)); // 30 gün
    
    // Refresh token'ı kaydet
    $refresh_stmt = $pdo->prepare("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
    $refresh_stmt->execute([$user['id'], $refresh_token, $refresh_expires]);
    
    // Audit log
    $audit_stmt = $pdo->prepare("
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) 
        VALUES (?, 'LOGIN', 'users', ?, ?, ?, ?)
    ");
    
    $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    
    $audit_stmt->execute([$user['id'], $user['id'], json_encode(['login_time' => date('Y-m-d H:i:s')]), $ip_address, $user_agent]);
    
    // Başarılı yanıt
    http_response_code(200);
    echo json_encode([
        'message' => 'Login successful',
        'token' => $jwt,
        'refresh_token' => $refresh_token,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'role' => $user['role']
        ]
    ]);
    
} catch (PDOException $e) {
    SecureErrorHandler::handleDatabaseError($e, 'user login');
} catch (Exception $e) {
    SecureErrorHandler::handleException($e);
}
?>