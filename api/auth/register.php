<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../config/mail.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input']);
    exit;
}

// Validasyon
$required_fields = ['email', 'password', 'first_name', 'last_name'];
foreach ($required_fields as $field) {
    if (!isset($input[$field]) || empty(trim($input[$field]))) {
        http_response_code(400);
        echo json_encode(['error' => "Field '$field' is required"]);
        exit;
    }
}

$email = filter_var(trim($input['email']), FILTER_VALIDATE_EMAIL);
$password = trim($input['password']);
$first_name = trim($input['first_name']);
$last_name = trim($input['last_name']);

// Email domain kontrolü
if (!$email || !str_ends_with($email, '@fortetourism.com')) {
    http_response_code(400);
    echo json_encode(['error' => 'Only @fortetourism.com email addresses are allowed']);
    exit;
}

// Şifre kontrolü
if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 6 characters long']);
    exit;
}

try {
    $pdo = getDBConnection();
    
    // Email zaten kayıtlı mı kontrol et
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Email address is already registered']);
        exit;
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
    error_log("Registration error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Registration failed. Please try again.']);
}
?>