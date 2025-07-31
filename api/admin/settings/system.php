<?php
header('Content-Type: application/json');

require_once '../../config/database.php';
require_once '../../security/SecurityMiddleware.php';

// Initialize security middleware
SecurityMiddleware::init(['enable_csrf' => false]);
SecurityMiddleware::apply('admin', ['allowed_methods' => ['GET', 'POST', 'OPTIONS']]);
$user = SecurityMiddleware::authenticate(['admin', 'super_admin']);

$method = $_SERVER['REQUEST_METHOD'];

try {
    $pdo = getDbConnection();
    
    if ($method === 'GET') {
        // Get current system settings
        $settingsQuery = "
            SELECT setting_key, setting_value, setting_type, description 
            FROM system_settings 
            ORDER BY setting_key
        ";
        
        $stmt = $pdo->prepare($settingsQuery);
        $stmt->execute();
        $settingsData = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Organize settings by category
        $settings = [
            'general' => [
                'site_name' => 'Forte Savings',
                'site_description' => 'Tasarruf Yönetim Sistemi',
                'admin_email' => 'admin@forte.com',
                'timezone' => 'Europe/Istanbul',
                'language' => 'tr',
                'currency' => 'TRY',
                'date_format' => 'DD/MM/YYYY',
                'time_format' => '24h'
            ],
            'email' => [
                'smtp_host' => 'smtp.gmail.com',
                'smtp_port' => 587,
                'smtp_username' => 'noreply@forte.com',
                'smtp_password' => '••••••••',
                'smtp_encryption' => 'tls',
                'from_email' => 'noreply@forte.com',
                'from_name' => 'Forte Savings',
                'reply_to' => 'support@forte.com',
                'test_email' => 'test@forte.com'
            ],
            'security' => [
                'session_timeout' => 30,
                'password_min_length' => 8,
                'require_password_complexity' => true,
                'enable_two_factor' => false,
                'max_login_attempts' => 5,
                'lockout_duration' => 15,
                'enable_audit_log' => true,
                'enable_ip_whitelist' => false,
                'allowed_file_types' => ['pdf', 'docx', 'xlsx', 'jpg', 'png'],
                'max_file_size' => 10
            ],
            'backup' => [
                'auto_backup_enabled' => true,
                'backup_frequency' => 'daily',
                'backup_retention_days' => 30,
                'backup_location' => '/backups',
                'email_backup_reports' => true
            ],
            'notifications' => [
                'email_notifications' => true,
                'system_alerts' => true,
                'user_registration_alert' => true,
                'project_creation_alert' => false,
                'backup_status_alert' => true,
                'security_alert' => true
            ],
            'performance' => [
                'cache_enabled' => true,
                'cache_duration' => 3600,
                'compress_responses' => true,
                'enable_cdn' => false,
                'api_rate_limit' => 1000,
                'log_level' => 'info'
            ]
        ];
        
        // Override with database values if they exist
        foreach ($settingsData as $setting) {
            $key = $setting['setting_key'];
            $value = $setting['setting_value'];
            
            // Convert value based on type
            switch ($setting['setting_type']) {
                case 'boolean':
                    $value = filter_var($value, FILTER_VALIDATE_BOOLEAN);
                    break;
                case 'integer':
                    $value = (int)$value;
                    break;
                case 'array':
                    $value = json_decode($value, true) ?: [];
                    break;
                default:
                    // Keep as string
                    break;
            }
            
            // Find the category and set the value
            foreach ($settings as $category => &$categorySettings) {
                if (array_key_exists($key, $categorySettings)) {
                    $categorySettings[$key] = $value;
                    break;
                }
            }
        }
        
        // Get categories and email templates
        $categoriesQuery = "
            SELECT id, name, description, type, status, created_at,
                   (SELECT COUNT(*) FROM projects WHERE category_id = c.id) as usage_count
            FROM categories c
            ORDER BY name
        ";
        
        $stmt = $pdo->prepare($categoriesQuery);
        $stmt->execute();
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Mock email templates for now
        $emailTemplates = [
            [
                'id' => 1,
                'name' => 'Hoş Geldiniz',
                'subject' => 'Forte Savings\'e Hoş Geldiniz',
                'content' => 'Merhaba {{first_name}}, hesabınız başarıyla oluşturuldu.',
                'type' => 'welcome',
                'variables' => ['first_name', 'last_name', 'email'],
                'status' => 'active'
            ],
            [
                'id' => 2,
                'name' => 'Şifre Sıfırlama',
                'subject' => 'Şifre Sıfırlama Talebi',
                'content' => 'Şifrenizi sıfırlamak için linke tıklayın: {{reset_link}}',
                'type' => 'password_reset',
                'variables' => ['first_name', 'reset_link', 'expiry_time'],
                'status' => 'active'
            ]
        ];
        
        echo json_encode([
            'success' => true,
            'data' => [
                'settings' => $settings,
                'categories' => $categories,
                'emailTemplates' => $emailTemplates
            ]
        ]);
        
    } elseif ($method === 'POST') {
        // Update system settings
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['category']) || !isset($input['settings'])) {
            throw new Exception('Geçersiz istek formatı');
        }
        
        $category = $input['category'];
        $newSettings = $input['settings'];
        
        // Validate category
        $validCategories = ['general', 'email', 'security', 'backup', 'notifications', 'performance'];
        if (!in_array($category, $validCategories)) {
            throw new Exception('Geçersiz ayar kategorisi');
        }
        
        // Begin transaction
        $pdo->beginTransaction();
        
        try {
            // Prepare upsert statement
            $upsertSql = "
                INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, updated_by)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    setting_value = VALUES(setting_value),
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = VALUES(updated_by)
            ";
            
            $stmt = $pdo->prepare($upsertSql);
            
            foreach ($newSettings as $key => $value) {
                // Determine setting type
                $settingType = 'string';
                if (is_bool($value)) {
                    $settingType = 'boolean';
                    $value = $value ? '1' : '0';
                } elseif (is_int($value)) {
                    $settingType = 'integer';
                    $value = (string)$value;
                } elseif (is_array($value)) {
                    $settingType = 'array';
                    $value = json_encode($value);
                }
                
                $description = "System setting for {$category} - {$key}";
                
                $stmt->execute([
                    $key,
                    $value,
                    $settingType,
                    $category,
                    $description,
                    $user['id']
                ]);
            }
            
            // Log the action
            $logSql = "
                INSERT INTO audit_logs (user_id, action, resource_type, description, ip_address, user_agent)
                VALUES (?, 'update', 'system_settings', ?, ?, ?)
            ";
            
            $logStmt = $pdo->prepare($logSql);
            $logStmt->execute([
                $user['id'],
                "System settings updated for category: {$category}",
                $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
            ]);
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Ayarlar başarıyla güncellendi',
                'updated_at' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
        
    } else {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed'
        ]);
    }
    
} catch (Exception $e) {
    error_log('Admin settings error: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>