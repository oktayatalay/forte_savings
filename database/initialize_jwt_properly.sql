-- Forte Savings - Proper JWT Secret Initialization
-- This script generates a strong JWT secret and initializes the system

-- Ensure system_settings table exists
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Generate a strong JWT secret (256-bit base64 encoded)
-- This should be done manually or via PHP script, but here's a strong fallback
SET @jwt_secret = CONCAT(
    SHA2(CONCAT(NOW(), CONNECTION_ID(), RAND()), 256),
    SHA2(CONCAT(USER(), DATABASE(), RAND()), 256)
);

-- Remove any existing jwt_secret
DELETE FROM system_settings WHERE setting_key = 'jwt_secret';

-- Insert the new JWT secret
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('jwt_secret', @jwt_secret, 'JWT Secret Key for authentication');

-- Add other required system settings
INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
('app_name', 'Forte Savings', 'Application name'),
('app_version', '1.0.1', 'Application version'),
('default_currency', 'TRY', 'Default currency'),
('date_format', 'Y-m-d', 'Default date format'),
('email_domain', '@fortetourism.com', 'Allowed email domain'),
('registration_enabled', '1', 'Whether new registrations are allowed'),
('max_login_attempts', '5', 'Maximum login attempts before lockout'),
('session_timeout', '3600', 'Session timeout in seconds'),
('password_min_length', '8', 'Minimum password length');

-- Ensure default admin user exists
INSERT IGNORE INTO users (username, email, password_hash, role, is_active, email_verified, created_at)
VALUES (
    'admin',
    'admin@fortetourism.com',
    '$2y$12$LQv3c1yqBWVHxkd0LQ4YCuHHG8zXYJElrjhNlZy4SzON7g8/v0qDK', -- password: Admin123!
    'admin',
    1,
    1,
    NOW()
);

-- Show results
SELECT 'JWT Secret Length' as 'Test', LENGTH(setting_value) as 'Result'
FROM system_settings WHERE setting_key = 'jwt_secret'
UNION ALL
SELECT 'Admin User Exists' as 'Test', COUNT(*) as 'Result'
FROM users WHERE role = 'admin' AND is_active = 1
UNION ALL
SELECT 'Total Settings' as 'Test', COUNT(*) as 'Result'
FROM system_settings;

-- Show current system settings (masked for security)
SELECT
    setting_key,
    CASE
        WHEN setting_key = 'jwt_secret' THEN CONCAT(LEFT(setting_value, 20), '...[MASKED]')
        ELSE setting_value
    END as setting_value,
    description,
    created_at
FROM system_settings
ORDER BY setting_key;