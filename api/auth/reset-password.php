<?php
require_once '../security/SecurityMiddleware.php';
require_once '../config/database.php';
require_once '../config/mail.php';

// Apply comprehensive security for password reset
SecurityMiddleware::setupAuth();

// Validate input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    SecureErrorHandler::sendErrorResponse('INVALID_INPUT', 'Invalid JSON input', [], 400);
}

// İki mod: token gönderme veya şifre sıfırlama
if (isset($input['email'])) {
    // Rate limiting for password reset requests
    RateLimiter::checkPasswordResetLimit($input['email']);
    
    // Validate email input
    try {
        $email = InputValidator::validateEmail($input['email'], true);
    } catch (InvalidArgumentException $e) {
        SecureErrorHandler::sendErrorResponse('INVALID_EMAIL', $e->getMessage(), [], 400);
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
        SecureErrorHandler::handleDatabaseError($e, 'password reset request');
    } catch (Exception $e) {
        SecureErrorHandler::handleException($e);
    }
    
} elseif (isset($input['token']) && isset($input['new_password'])) {
    // Şifreyi sıfırla
    $token = trim($input['token']);
    $new_password = trim($input['new_password']);
    
    // Validate password with enhanced security
    try {
        $new_password = InputValidator::validatePassword($new_password, 8);
    } catch (InvalidArgumentException $e) {
        SecureErrorHandler::sendErrorResponse('WEAK_PASSWORD', $e->getMessage(), [], 400);
    }
    
    try {
        $pdo = getDBConnection();
        
        // Token'ı kontrol et - debug ile
        $stmt = $pdo->prepare("
            SELECT id, email, password_reset_token, password_reset_expires 
            FROM users 
            WHERE password_reset_token = ? AND is_active = TRUE
        ");
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Debug log
        error_log("Reset password attempt - Token: " . $token);
        if ($user) {
            error_log("User found - expires: " . $user['password_reset_expires'] . ", current: " . date('Y-m-d H:i:s'));
            // Token süresi kontrolü
            if (strtotime($user['password_reset_expires']) <= time()) {
                error_log("Token expired");
                http_response_code(400);
                echo json_encode(['error' => 'Reset token has expired']);
                exit;
            }
        } else {
            error_log("No user found with this token");
        }
        
        if (!$user) {
            SecurityHeaders::logSecurityEvent('invalid_reset_token', [
                'token_provided' => substr($token, 0, 8) . '...',
                'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ]);
            SecureErrorHandler::sendErrorResponse('INVALID_TOKEN', 'Invalid reset token', [], 400);
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
        SecureErrorHandler::handleDatabaseError($e, 'password reset');
    } catch (Exception $e) {
        SecureErrorHandler::handleException($e);
    }
    
} else {
    SecureErrorHandler::sendErrorResponse('MISSING_PARAMETERS', 'Either email or token+new_password is required', [], 400);
}
?>