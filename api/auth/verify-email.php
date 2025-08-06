<?php
require_once '../config/cors.php';
require_once '../config/database.php';

header('Content-Type: application/json');

// Support both GET (URL token) and POST (JSON token) methods
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $token = $_GET['token'] ?? '';
    if (!$token) {
        http_response_code(400);
        echo json_encode(['error' => 'Token parameter required']);
        exit;
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !isset($input['token'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Token required in request body']);
        exit;
    }
    $token = $input['token'];
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Validasyon
if (empty(trim($token))) {
    http_response_code(400);
    echo json_encode(['error' => 'Verification token is required']);
    exit;
}

$token = trim($token);

try {
    $pdo = getDBConnection();
    
    // Token'ı kontrol et
    $stmt = $pdo->prepare("
        SELECT id, email, first_name, last_name 
        FROM users 
        WHERE email_verification_token = ? AND email_verified = FALSE
    ");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid or expired verification token']);
        exit;
    }
    
    // Email'i doğrulandı olarak işaretle
    $update_stmt = $pdo->prepare("
        UPDATE users 
        SET email_verified = TRUE, email_verification_token = NULL 
        WHERE id = ?
    ");
    $update_stmt->execute([$user['id']]);
    
    // Audit log ekle (eğer tablo varsa)
    try {
        $audit_stmt = $pdo->prepare("
            INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) 
            VALUES (?, 'UPDATE', 'users', ?, ?, ?, ?)
        ");
        
        $new_values = json_encode(['email_verified' => true]);
        $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        
        $audit_stmt->execute([$user['id'], $user['id'], $new_values, $ip_address, $user_agent]);
    } catch (PDOException $audit_error) {
        // Audit log hatası sistem çalışmasını etkilemez
        error_log("Audit log error: " . $audit_error->getMessage());
    }
    
    // Başarılı yanıt
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Email successfully verified! You can now log in.',
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'email_verified' => true
        ]
    ]);
    
} catch (PDOException $e) {
    error_log("Email verification error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Email verification failed. Please try again.']);
}
?>