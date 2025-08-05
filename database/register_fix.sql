-- Forte Savings Registration System Database Updates
-- Bu dosyayı phpMyAdmin'de çalıştırın

-- 1. Admin kullanıcısının şifresini güncelle (bcryptjs ile uyumlu)
-- Yeni şifre: 'ForteSecure2025!'
UPDATE users 
SET password_hash = '$2b$12$W175x8e/xkk3DfbOgwicf.Z0rohjsglK7d19GwLdGyLNSP/7Oy/7e'
WHERE email = 'admin@fortetourism.com' 
AND role = 'admin';

-- 2. Yeni bcryptjs hash'ler için uyumluluk sağla
-- PHP'de password_verify() fonksiyonu $2b$ prefix'ini de destekler

-- 3. Email verification token alanlarını ekle (güvenli şekilde)
-- Bu komutlar hata verebilir eğer sütunlar zaten varsa, bu normal
ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN password_reset_expires DATETIME NULL;

-- 4. Audit logs tablosu oluştur (eğer yoksa)
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Sistem ayarları tablosu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. JWT secret ve diğer ayarları ekle
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('app_name', 'Forte Savings', 'Application name'),
('app_version', '2.0.0', 'Application version'),
('default_currency', 'TRY', 'Default currency'),
('jwt_secret', SUBSTRING(MD5(RAND()) FROM 1 FOR 64), 'JWT Secret Key'),
('email_domain', '@fortetourism.com', 'Allowed email domain')
ON DUPLICATE KEY UPDATE 
    setting_value = COALESCE(NULLIF(setting_value, ''), VALUES(setting_value));

-- 7. Test kayıt sistemi için index'ler oluştur (güvenli şekilde)
-- Bu komutlar hata verebilir eğer index'ler zaten varsa, bu normal
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Güncellemelerin tamamlandığını göster
SELECT 'Registration system database updates completed successfully!' as message;

-- Mevcut admin kullanıcısını göster
SELECT id, email, role, created_at, 
       CASE WHEN password_hash LIKE '$2b$%' THEN 'bcryptjs compatible' ELSE 'needs update' END as password_status
FROM users 
WHERE role = 'admin' 
LIMIT 5;