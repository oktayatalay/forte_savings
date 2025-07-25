<?php
require_once 'database.php';
require_once __DIR__ . '/../phpmailer/PHPMailer.php';
require_once __DIR__ . '/../phpmailer/SMTP.php';
require_once __DIR__ . '/../phpmailer/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

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
        
        $this->smtp_host = $this->getEnvVar('SMTP_HOST', 'corporate.forte.works');
        $this->smtp_user = $this->getEnvVar('SMTP_USER', 'system@corporate.forte.works');
        $this->smtp_pass = $this->getEnvVar('SMTP_PASS', 'ForteTourism2025');
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
        // Güvenlik için sadece @fortetourism.com adreslerine gönder
        if (!str_ends_with($to, '@fortetourism.com')) {
            error_log("Email sending blocked for non-company domain: " . $to);
            return false;
        }
        
        $mail = new PHPMailer(true);
        
        try {
            // SMTP ayarları - forte_crm'deki çalışan konfigürasyon
            $mail->isSMTP();
            $mail->Host       = $this->smtp_host;
            $mail->SMTPAuth   = true;
            $mail->Username   = $this->smtp_user;
            $mail->Password   = $this->smtp_pass;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            $mail->Port       = 465;
            $mail->CharSet    = 'UTF-8';
            
            // SSL doğrulama ayarları (shared hosting için)
            $mail->SMTPOptions = array(
                'ssl' => array(
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true
                )
            );
            
            // Debug mode (geliştirme için)
            $mail->SMTPDebug = 0; // 0 = üretim, 2 = debug
            
            // Gönderen bilgileri
            $mail->setFrom($this->smtp_user, 'Forte Savings');
            $mail->addAddress($to);
            $mail->addReplyTo($this->smtp_user, 'Forte Savings');
            
            // E-posta içeriği
            $mail->isHTML($isHtml);
            $mail->Subject = $subject;
            $mail->Body = $body;
            
            if (!$isHtml) {
                $mail->AltBody = strip_tags($body);
            }
            
            $mail->send();
            error_log("PHPMailer: Email sent successfully to: " . $to);
            return true;
            
        } catch (Exception $e) {
            error_log("PHPMailer Error: " . $mail->ErrorInfo);
            error_log("Exception: " . $e->getMessage());
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