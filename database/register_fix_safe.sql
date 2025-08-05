-- Forte Savings Registration System Database Updates (SAFE VERSION)
-- Bu dosyayı phpMyAdmin'de çalıştırın
-- HATA MESAJLARI NORMAL: Eğer sütun/index zaten varsa hata verir, görmezden gelin

SET SQL_MODE = '';

-- 1. Admin kullanıcısının şifresini güncelle (bcryptjs ile uyumlu)
-- Yeni şifre: 'ForteSecure2025!'
UPDATE users 
SET password_hash = '$2b$12$W175x8e/xkk3DfbOgwicf.Z0rohjsglK7d19GwLdGyLNSP/7Oy/7e'
WHERE email = 'admin@fortetourism.com' 
AND role = 'admin';

-- 2. Email verification token alanlarını ekle
-- HATA NORMAL: Eğer sütunlar zaten varsa "Duplicate column name" hatası verir
ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN password_reset_expires DATETIME NULL;

-- 3. Audit logs tablosu oluştur (sadece yoksa)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- 4. Sistem ayarları tablosu oluştur (sadece yoksa)  
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
);

-- 5. JWT secret ve diğer ayarları ekle
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('app_name', 'Forte Savings', 'Application name'),
('app_version', '2.0.0', 'Application version'),
('default_currency', 'TRY', 'Default currency'),
('jwt_secret', SHA2(CONCAT(NOW(), RAND(), CONNECTION_ID()), 256), 'JWT Secret Key'),
('email_domain', '@fortetourism.com', 'Allowed email domain')
ON DUPLICATE KEY UPDATE 
    setting_value = COALESCE(NULLIF(setting_value, ''), VALUES(setting_value));

-- 6. Users tablosu için index'ler ekle
-- HATA NORMAL: Eğer index'ler zaten varsa "Duplicate key name" hatası verir
ALTER TABLE users ADD INDEX idx_users_email (email);
ALTER TABLE users ADD INDEX idx_users_role (role);

-- Sonuçları göster
SELECT 'Database updates completed!' as Status;

SELECT 'Admin user status:' as Info;
SELECT id, email, role, created_at, 
       CASE 
           WHEN password_hash LIKE '$2b$%' THEN '✅ bcryptjs compatible' 
           WHEN password_hash LIKE '$2y$%' THEN '⚠️ bcrypt (PHP compatible)'
           ELSE '❌ needs update' 
       END as password_status
FROM users 
WHERE role = 'admin' 
LIMIT 1;

SELECT 'System settings:' as Info;
SELECT setting_key, LEFT(setting_value, 30) as setting_value, description 
FROM system_settings 
ORDER BY setting_key;