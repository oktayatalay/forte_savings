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

// İki mod: token gönderme veya şifre sıfırlama
if (isset($input['email'])) {
    // Şifre sıfırlama token'ı gönder
    $email = filter_var(trim($input['email']), FILTER_VALIDATE_EMAIL);
    
    if (!$email) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid email format']);
        exit;
    }
    
    try {
        $pdo = getDBConnection();
        
        // Kullanıcı var mı kontrol et
        $stmt = $pdo->prepare("SELECT id, first_name FROM users WHERE email = ? AND is_active = TRUE");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            // Güvenlik için her zaman başarılı mesajı döndür
            http_response_code(200);
            echo json_encode(['message' => 'If email exists, password reset instructions have been sent']);
            exit;
        }
        
        // Reset token oluştur
        $reset_token = bin2hex(random_bytes(32));
        $expires_at = date('Y-m-d H:i:s', time() + (60 * 60)); // 1 saat
        
        // Token'ı kaydet
        $update_stmt = $pdo->prepare("
            UPDATE users 
            SET password_reset_token = ?, password_reset_expires = ? 
            WHERE id = ?
        ");
        $update_stmt->execute([$reset_token, $expires_at, $user['id']]);
        
        // Audit log
        $audit_stmt = $pdo->prepare("
            INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) 
            VALUES (?, 'PASSWORD_RESET_REQUEST', 'users', ?, ?, ?, ?)
        ");
        
        $new_values = json_encode(['reset_token_generated' => true]);
        $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        
        $audit_stmt->execute([$user['id'], $user['id'], $new_values, $ip_address, $user_agent]);
        
        // Email gönderimi
        $mailService = new MailService();
        $emailSent = $mailService->sendPasswordResetEmail($email, $user['first_name'], $reset_token);
        
        // Başarılı yanıt
        http_response_code(200);
        echo json_encode([
            'message' => 'Password reset instructions have been sent to your email',
            'email_sent' => $emailSent,
            'reset_token' => $emailSent ? null : $reset_token // Sadece email gönderilmediyse token'ı döndür
        ]);
        
    } catch (PDOException $e) {
        error_log("Password reset request error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Password reset request failed. Please try again.']);
    }
    
} elseif (isset($input['token']) && isset($input['new_password'])) {
    // Şifreyi sıfırla
    $token = trim($input['token']);
    $new_password = trim($input['new_password']);
    
    if (strlen($new_password) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'Password must be at least 6 characters long']);
        exit;
    }
    
    try {
        $pdo = getDBConnection();
        
        // Token'ı kontrol et
        $stmt = $pdo->prepare("
            SELECT id, email 
            FROM users 
            WHERE password_reset_token = ? AND password_reset_expires > NOW() AND is_active = TRUE
        ");
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid or expired reset token']);
            exit;
        }
        
        // Şifreyi güncelle
        $password_hash = password_hash($new_password, PASSWORD_DEFAULT);
        
        $update_stmt = $pdo->prepare("
            UPDATE users 
            SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL 
            WHERE id = ?
        ");
        $update_stmt->execute([$password_hash, $user['id']]);
        
        // Tüm refresh token'ları sil (güvenlik)
        $delete_tokens_stmt = $pdo->prepare("DELETE FROM refresh_tokens WHERE user_id = ?");
        $delete_tokens_stmt->execute([$user['id']]);
        
        // Audit log
        $audit_stmt = $pdo->prepare("
            INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) 
            VALUES (?, 'PASSWORD_RESET', 'users', ?, ?, ?, ?)
        ");
        
        $new_values = json_encode(['password_reset' => true]);
        $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        
        $audit_stmt->execute([$user['id'], $user['id'], $new_values, $ip_address, $user_agent]);
        
        // Başarılı yanıt
        http_response_code(200);
        echo json_encode([
            'message' => 'Password reset successful',
            'email' => $user['email']
        ]);
        
    } catch (PDOException $e) {
        error_log("Password reset error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Password reset failed. Please try again.']);
    }
    
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Either email or token+new_password is required']);
}
?>