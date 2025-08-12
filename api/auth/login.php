<?php
require_once '../security/SecurityMiddleware.php';
require_once '../config/database.php';
require_once 'JWTManager.php';

// Apply comprehensive security - disable CSRF for login
SecurityMiddleware::init(['enable_csrf' => false]);
SecurityMiddleware::apply('auth', ['allowed_methods' => ['POST', 'OPTIONS']]);

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
    
    // Şifre kontrolü - enhanced bcrypt compatibility
    $password_valid = false;
    
    // İlk önce normal password_verify dene
    if (password_verify($password, $user['password_hash'])) {
        $password_valid = true;
    } else {
        // bcrypt variants arasında uyumluluk için alternatif kontrol
        // $2b$ ile $2y$ arasındaki fark için
        $hash_to_check = $user['password_hash'];
        if (strpos($hash_to_check, '$2b$') === 0) {
            // $2b$ -> $2y$ çevir ve tekrar dene
            $hash_to_check = '$2y$' . substr($hash_to_check, 4);
            if (password_verify($password, $hash_to_check)) {
                $password_valid = true;
            }
        } elseif (strpos($hash_to_check, '$2y$') === 0) {
            // $2y$ -> $2b$ çevir ve tekrar dene
            $hash_to_check = '$2b$' . substr($hash_to_check, 4);
            if (password_verify($password, $hash_to_check)) {
                $password_valid = true;
            }
        }
    }
    
    if (!$password_valid) {
        // Apply progressive delay for failed attempts - DISABLED FOR TESTING
        // $attemptCount = RateLimiter::getStatus()['auth_attempts'] ?? 0;
        // RateLimiter::applyProgressiveDelay($email, $attemptCount);
        
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
    
    // JWT Token oluştur - Centralized JWT management kullan (30 gün default)
    $jwt = JWTManager::generateToken($user); // Uses 30-day default expiry
    
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
    
    // Başarılı yanıt - Frontend uyumlu format
    http_response_code(200);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode([
        'success' => true,
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