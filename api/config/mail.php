<?php
require_once 'database.php';

class MailService {
    private $smtp_host;
    private $smtp_user;
    private $smtp_pass;
    private $smtp_port = 465;
    
    public function __construct() {
        // Load .env file if exists
        $envFile = __DIR__ . '/../../.env';
        if (file_exists($envFile)) {
            $this->loadEnv($envFile);
        }
        
        $this->smtp_host = $this->getEnvVar('SMTP_HOST');
        $this->smtp_user = $this->getEnvVar('SMTP_USER');
        $this->smtp_pass = $this->getEnvVar('SMTP_PASS');
    }
    
    private function loadEnv($file) {
        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
    
    private function getEnvVar($key, $default = '') {
        return $_ENV[$key] ?? getenv($key) ?: $default;
    }
    
    public function sendMail($to, $subject, $body, $isHtml = true) {
        if (empty($this->smtp_host) || empty($this->smtp_user) || empty($this->smtp_pass)) {
            error_log("SMTP configuration missing - falling back to development mode");
            return false; // Geliştirme modunda email gönderme devre dışı
        }
        
        // Güvenlik için sadece @fortetourism.com adreslerine gönder
        if (!str_ends_with($to, '@fortetourism.com')) {
            error_log("Email sending blocked for non-company domain: " . $to);
            return false;
        }
        
        $headers = array(
            'From: Forte Savings <' . $this->smtp_user . '>',
            'Reply-To: ' . $this->smtp_user,
            'X-Mailer: PHP/' . phpversion(),
            'MIME-Version: 1.0'
        );
        
        if ($isHtml) {
            $headers[] = 'Content-type: text/html; charset=UTF-8';
        } else {
            $headers[] = 'Content-type: text/plain; charset=UTF-8';
        }
        
        try {
            // Basit mail() fonksiyonu kullan
            $success = mail($to, $subject, $body, implode("\r\n", $headers));
            
            if ($success) {
                error_log("Email sent successfully to: " . $to);
                return true;
            } else {
                error_log("Mail function failed for: " . $to);
                return false;
            }
        } catch (Exception $e) {
            error_log("Email sending error: " . $e->getMessage());
            return false;
        }
    }
    
    public function sendVerificationEmail($email, $firstName, $token) {
        $subject = "Forte Savings - Email Doğrulama";
        
        $verificationUrl = "https://savings.forte.works/api/auth/verify-email.php?token=" . urlencode($token);
        
        $body = "
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #0066cc; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .button { display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; }
                .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Forte Savings</h1>
                    <p>Tasarruf Yönetim Sistemi</p>
                </div>
                <div class='content'>
                    <h2>Merhaba {$firstName},</h2>
                    <p>Forte Savings hesabınızı oluşturduğunuz için teşekkür ederiz!</p>
                    <p>Hesabınızı aktif etmek için aşağıdaki butona tıklayın:</p>
                    <p style='text-align: center; margin: 30px 0;'>
                        <a href='{$verificationUrl}' class='button'>Email Adresimi Doğrula</a>
                    </p>
                    <p>Eğer buton çalışmıyorsa, aşağıdaki linki tarayıcınıza kopyalayın:</p>
                    <p style='word-break: break-all; background: #eee; padding: 10px; font-size: 12px;'>
                        {$verificationUrl}
                    </p>
                    <p><strong>Not:</strong> Bu link 24 saat geçerlidir.</p>
                </div>
                <div class='footer'>
                    <p>Bu email Forte Tourism tarafından gönderilmiştir.</p>
                    <p>Eğer bu hesabı siz oluşturmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
                </div>
            </div>
        </body>
        </html>";
        
        return $this->sendMail($email, $subject, $body, true);
    }
    
    public function sendPasswordResetEmail($email, $firstName, $token) {
        $subject = "Forte Savings - Şifre Sıfırlama";
        
        $resetUrl = "https://savings.forte.works/auth/reset-password?token=" . urlencode($token);
        
        $body = "
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .button { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; }
                .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Forte Savings</h1>
                    <p>Şifre Sıfırlama Talebi</p>
                </div>
                <div class='content'>
                    <h2>Merhaba {$firstName},</h2>
                    <p>Hesabınız için şifre sıfırlama talebinde bulundunuz.</p>
                    <p>Yeni şifre belirlemek için aşağıdaki butona tıklayın:</p>
                    <p style='text-align: center; margin: 30px 0;'>
                        <a href='{$resetUrl}' class='button'>Şifremi Sıfırla</a>
                    </p>
                    <p>Eğer buton çalışmıyorsa, aşağıdaki linki tarayıcınıza kopyalayın:</p>
                    <p style='word-break: break-all; background: #eee; padding: 10px; font-size: 12px;'>
                        {$resetUrl}
                    </p>
                    <p><strong>Önemli:</strong> Bu link 1 saat geçerlidir.</p>
                    <p>Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
                </div>
                <div class='footer'>
                    <p>Bu email Forte Tourism tarafından gönderilmiştir.</p>
                    <p>Güvenliğiniz için şifrenizi kimseyle paylaşmayın.</p>
                </div>
            </div>
        </body>
        </html>";
        
        return $this->sendMail($email, $subject, $body, true);
    }
}
?>