<?php
require_once '../security/SecurityMiddleware.php';
require_once '../config/database.php';
require_once '../config/mail.php';

// Apply comprehensive security for registration
SecurityMiddleware::setupAuth();

// Additional rate limiting for registration
RateLimiter::checkRegistrationLimit();

// Validate input with enhanced security
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    SecureErrorHandler::sendErrorResponse('INVALID_INPUT', 'Invalid JSON input', [], 400);
}

// Enhanced input validation with stronger rules
$validationRules = [
    'email' => ['type' => 'email', 'required' => true],
    'password' => ['type' => 'password', 'required' => true, 'min_length' => 8],
    'first_name' => ['type' => 'text', 'required' => true, 'max_length' => 50, 'allowed_chars' => '/^[a-zA-ZÀ-ÿ\s\-\'\.]+$/'],
    'last_name' => ['type' => 'text', 'required' => true, 'max_length' => 50, 'allowed_chars' => '/^[a-zA-ZÀ-ÿ\s\-\'\.]+$/']
];

$validated = SecurityMiddleware::validateInput($input, $validationRules);
$email = $validated['email'];
$password = $validated['password'];
$first_name = $validated['first_name'];
$last_name = $validated['last_name'];

// Enhanced email domain kontrolü
if (!str_ends_with($email, '@fortetourism.com')) {
    SecurityHeaders::logSecurityEvent('invalid_domain_registration', [
        'email' => $email,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ]);
    SecureErrorHandler::sendErrorResponse('DOMAIN_NOT_ALLOWED', 'Only @fortetourism.com email addresses are allowed', [], 400);
}

try {
    $pdo = getDBConnection();
    
    // Email zaten kayıtlı mı kontrol et
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->rowCount() > 0) {
        SecureErrorHandler::sendErrorResponse('EMAIL_EXISTS', 'Email address is already registered', [], 400);
    }
    
    // Şifreyi hash'le
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    
    // Email verification token oluştur
    $verification_token = bin2hex(random_bytes(32));
    
    // Kullanıcıyı kaydet
    $stmt = $pdo->prepare("
        INSERT INTO users (email, password_hash, first_name, last_name, email_verification_token) 
        VALUES (?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([$email, $password_hash, $first_name, $last_name, $verification_token]);
    
    $user_id = $pdo->lastInsertId();
    
    // Audit log
    $audit_stmt = $pdo->prepare("
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) 
        VALUES (?, 'CREATE', 'users', ?, ?, ?, ?)
    ");
    
    $new_values = json_encode([
        'email' => $email,
        'first_name' => $first_name,
        'last_name' => $last_name,
        'role' => 'user'
    ]);
    
    $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    
    $audit_stmt->execute([$user_id, $user_id, $new_values, $ip_address, $user_agent]);
    
    // Email gönderimi
    $mailService = new MailService();
    $emailSent = $mailService->sendVerificationEmail($email, $first_name, $verification_token);
    
    // Başarılı yanıt
    http_response_code(201);
    echo json_encode([
        'message' => 'User registered successfully',
        'user_id' => $user_id,
        'email' => $email,
        'verification_required' => true,
        'email_sent' => $emailSent,
        'verification_token' => $emailSent ? null : $verification_token // Sadece email gönderilmediyse token'ı döndür
    ]);
    
} catch (PDOException $e) {
    SecureErrorHandler::handleDatabaseError($e, 'user registration');
} catch (Exception $e) {
    SecureErrorHandler::handleException($e);
}
?>