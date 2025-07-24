-- Forte Savings Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Savings accounts table
CREATE TABLE IF NOT EXISTS savings_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type ENUM('regular', 'goal', 'emergency') DEFAULT 'regular',
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    target_amount DECIMAL(15,2) DEFAULT NULL,
    target_date DATE DEFAULT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    transaction_type ENUM('deposit', 'withdrawal', 'transfer') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description VARCHAR(255),
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_number VARCHAR(50) UNIQUE,
    FOREIGN KEY (account_id) REFERENCES savings_accounts(id) ON DELETE CASCADE
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('app_name', 'Forte Savings', 'Application name'),
('app_version', '1.0.0', 'Application version'),
('default_currency', 'TRY', 'Default currency'),
('date_format', 'Y-m-d', 'Default date format')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);