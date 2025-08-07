<?php
require_once '../config/database.php';

// Get token from URL
$token = $_GET['token'] ?? '';
$verification_result = null;
$user_data = null;

if (!$token) {
    $verification_result = 'missing_token';
} else {
    try {
        $pdo = getDBConnection();
        
        // Check if token exists and user is not verified
        $stmt = $pdo->prepare("
            SELECT id, email, first_name, last_name, email_verified 
            FROM users 
            WHERE email_verification_token = ?
        ");
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            $verification_result = 'invalid_token';
        } elseif ($user['email_verified']) {
            $verification_result = 'already_verified';
            $user_data = $user;
        } else {
            // Verify the email
            $update_stmt = $pdo->prepare("
                UPDATE users 
                SET email_verified = TRUE, email_verification_token = NULL 
                WHERE id = ?
            ");
            $update_stmt->execute([$user['id']]);
            
            // Add audit log
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
                error_log("Audit log error: " . $audit_error->getMessage());
            }
            
            $verification_result = 'success';
            $user_data = $user;
        }
        
    } catch (PDOException $e) {
        error_log("Email verification error: " . $e->getMessage());
        $verification_result = 'error';
    }
}
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Doğrulama - Forte Savings</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
            padding: 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        
        .icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
        }
        
        .success .icon {
            background: #d4edda;
            color: #155724;
        }
        
        .error .icon, .invalid .icon {
            background: #f8d7da;
            color: #721c24;
        }
        
        .warning .icon {
            background: #fff3cd;
            color: #856404;
        }
        
        h1 {
            font-size: 24px;
            margin-bottom: 15px;
            font-weight: 600;
        }
        
        .success h1 {
            color: #155724;
        }
        
        .error h1, .invalid h1 {
            color: #721c24;
        }
        
        .warning h1 {
            color: #856404;
        }
        
        p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        
        .user-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .user-info strong {
            color: #333;
        }
        
        .button {
            display: inline-block;
            background: #0066cc;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 10px 5px;
            transition: background-color 0.3s;
        }
        
        .button:hover {
            background: #0052a3;
        }
        
        .button.secondary {
            background: #6c757d;
        }
        
        .button.secondary:hover {
            background: #545b62;
        }
        
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="container">
        <?php if ($verification_result === 'success'): ?>
            <div class="success">
                <div class="icon">✓</div>
                <h1>Email Başarıyla Doğrulandı!</h1>
                <p>Tebrikler! Email adresiniz başarıyla doğrulandı ve hesabınız aktif edildi.</p>
                
                <?php if ($user_data): ?>
                <div class="user-info">
                    <strong><?php echo htmlspecialchars($user_data['first_name'] . ' ' . $user_data['last_name']); ?></strong><br>
                    <small><?php echo htmlspecialchars($user_data['email']); ?></small>
                </div>
                <?php endif; ?>
                
                <p>Artık Forte Savings sistemine giriş yapabilirsiniz.</p>
                
                <a href="https://savings.forte.works/auth/login" class="button">Giriş Yap</a>
            </div>
            
        <?php elseif ($verification_result === 'already_verified'): ?>
            <div class="warning">
                <div class="icon">⚠</div>
                <h1>Email Zaten Doğrulandı</h1>
                <p>Bu email adresi daha önce doğrulandı. Hesabınız zaten aktif durumda.</p>
                
                <?php if ($user_data): ?>
                <div class="user-info">
                    <strong><?php echo htmlspecialchars($user_data['first_name'] . ' ' . $user_data['last_name']); ?></strong><br>
                    <small><?php echo htmlspecialchars($user_data['email']); ?></small>
                </div>
                <?php endif; ?>
                
                <a href="https://savings.forte.works/auth/login" class="button">Giriş Yap</a>
            </div>
            
        <?php elseif ($verification_result === 'invalid_token'): ?>
            <div class="invalid">
                <div class="icon">✗</div>
                <h1>Geçersiz Doğrulama Bağlantısı</h1>
                <p>Bu doğrulama bağlantısı geçersiz veya süresi dolmuş. Bu durum şu sebeplerden kaynaklanabilir:</p>
                <ul style="text-align: left; margin: 20px 0; padding-left: 20px;">
                    <li>Bağlantı daha önce kullanıldı</li>
                    <li>Bağlantının süresi doldu (24 saat)</li>
                    <li>Bağlantı bozuk veya eksik</li>
                </ul>
                
                <a href="https://savings.forte.works/auth/register" class="button">Yeni Hesap Oluştur</a>
                <a href="https://savings.forte.works/auth/login" class="button secondary">Giriş Yap</a>
            </div>
            
        <?php elseif ($verification_result === 'missing_token'): ?>
            <div class="error">
                <div class="icon">✗</div>
                <h1>Doğrulama Bağlantısı Eksik</h1>
                <p>Doğrulama kodu bulunamadı. Lütfen email'inizdeki doğrulama bağlantısını kullanın.</p>
                
                <a href="https://savings.forte.works/auth/register" class="button">Yeni Hesap Oluştur</a>
            </div>
            
        <?php else: ?>
            <div class="error">
                <div class="icon">✗</div>
                <h1>Doğrulama Hatası</h1>
                <p>Email doğrulama sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
                
                <a href="https://savings.forte.works/auth/register" class="button">Yeni Hesap Oluştur</a>
                <a href="https://savings.forte.works/auth/login" class="button secondary">Giriş Yap</a>
            </div>
        <?php endif; ?>
        
        <div class="footer">
            <p>Forte Tourism - Tasarruf Yönetim Sistemi</p>
        </div>
    </div>
</body>
</html>