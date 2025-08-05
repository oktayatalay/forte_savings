-- Forte Savings Database Update for New Authentication System
-- This SQL file updates the existing database to support the new Next.js API authentication

-- 1. First check if tables exist and add missing columns if needed
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255) NULL AFTER email_verified,
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255) NULL AFTER email_verification_token,
ADD COLUMN IF NOT EXISTS password_reset_expires DATETIME NULL AFTER password_reset_token;

-- 2. Update the role enum to include only 'admin' and 'user' (remove 'cc' for simplicity)
-- Note: This will fail if 'cc' values exist, so first update any existing 'cc' to 'user'
UPDATE users SET role = 'user' WHERE role = 'cc';
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'user') DEFAULT 'user';

-- 3. Ensure the email constraint is properly set
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_email_domain;
ALTER TABLE users ADD CONSTRAINT chk_email_domain CHECK (email LIKE '%@fortetourism.com');

-- 4. Create audit_logs table if it doesn't exist
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

-- 5. Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. Insert default system settings (only if they don't already exist)
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('app_name', 'Forte Savings', 'Application name'),
('app_version', '2.0.0', 'Application version'),
('default_currency', 'TRY', 'Default currency'),
('jwt_secret', SUBSTRING(MD5(RAND()) FROM 1 FOR 32), 'JWT Secret Key - CHANGE THIS IN PRODUCTION'),
('email_domain', '@fortetourism.com', 'Allowed email domain')
ON DUPLICATE KEY UPDATE 
    setting_value = COALESCE(NULLIF(setting_value, ''), VALUES(setting_value));

-- 7. Update admin user password if using default
-- New password hash for 'ForteSecure2025!' (replace the old 'admin123')
UPDATE users 
SET password_hash = '$2b$12$W175x8e/xkk3DfbOgwicf.Z0rohjsglK7d19GwLdGyLNSP/7Oy/7e'
WHERE email = 'admin@fortetourism.com' 
AND role = 'admin'
AND password_hash = '$2y$10$example_old_hash'; -- Only update if still using old hash

-- 8. Clean up any unused columns or indexes if they exist
-- (Add any cleanup queries here if needed)

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- 10. Show updated table structure
SELECT 'Database update completed successfully. Verify the following tables:' as message;
SHOW TABLES LIKE 'users';
SHOW TABLES LIKE 'audit_logs';
SHOW TABLES LIKE 'system_settings';

-- 11. Show current system settings
SELECT 'Current system settings:' as message;
SELECT setting_key, LEFT(setting_value, 50) as setting_value, description 
FROM system_settings 
ORDER BY setting_key;

-- MANUAL STEPS REQUIRED AFTER RUNNING THIS SQL:
-- 1. Update the JWT_SECRET in your environment variables (.env file)
-- 2. Test the new authentication endpoints: /api/auth/login and /api/auth/register
-- 3. Verify the admin login with email: admin@fortetourism.com
-- 4. If you changed the admin password, use the new password: ForteSecure2025!