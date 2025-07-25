-- Forte Savings Database Schema - Roadmap Uyumlu Versiyon

-- Kullanıcılar tablosu
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255) NULL,
    password_reset_token VARCHAR(255) NULL,
    password_reset_expires DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_email_domain CHECK (email LIKE '%@fortetourism.com')
);

-- Projeler tablosu
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    frn VARCHAR(50) UNIQUE NOT NULL,
    entity VARCHAR(100) NOT NULL,
    customer VARCHAR(100) NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    project_type VARCHAR(100) NOT NULL,
    group_in DATE NOT NULL,
    group_out DATE NOT NULL,
    location VARCHAR(200) NOT NULL,
    hotels TEXT,
    po_amount DECIMAL(15,2) NOT NULL,
    forte_responsible VARCHAR(100) NOT NULL,
    project_director VARCHAR(100) NOT NULL,
    forte_cc_person VARCHAR(100) NOT NULL,
    client_representative VARCHAR(100) NOT NULL,
    customer_po_number VARCHAR(100),
    hcp_count INT DEFAULT 0,
    colleague_count INT DEFAULT 0,
    external_non_hcp_count INT DEFAULT 0,
    total_savings DECIMAL(15,2) DEFAULT 0.00,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Proje yetkilileri tablosu (CC persons)
CREATE TABLE IF NOT EXISTS project_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    permission_type ENUM('owner', 'cc') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_project_user (project_id, user_id)
);

-- Tasarruf ve maliyet engelleme kayıtları
CREATE TABLE IF NOT EXISTS savings_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    date DATE NOT NULL,
    type ENUM('Cost Avoidance', 'Savings') NOT NULL,
    explanation_category VARCHAR(100) NOT NULL,
    explanation_custom TEXT,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    unit INT NOT NULL DEFAULT 1,
    currency VARCHAR(3) DEFAULT 'TRY',
    total_price DECIMAL(15,2) GENERATED ALWAYS AS (price * unit) STORED,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Explanation kategorileri (Admin tarafından yönetilebilir)
CREATE TABLE IF NOT EXISTS explanation_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Genel kategoriler (Admin tarafından yönetilebilir)
CREATE TABLE IF NOT EXISTS general_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Program tipleri (Admin tarafından yönetilebilir)
CREATE TABLE IF NOT EXISTS program_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log tablosu
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

-- JWT refresh token tablosu
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sistem ayarları
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Varsayılan kategorileri ekle
INSERT INTO explanation_categories (name) VALUES
('Hotel Cost Reduction'),
('Flight Cost Reduction'),
('Venue Cost Reduction'),
('Catering Cost Reduction'),
('Transportation Cost Reduction'),
('Material Cost Reduction'),
('Staff Cost Reduction'),
('Technology Cost Reduction'),
('Other')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO general_categories (name) VALUES
('Accommodation'),
('Transportation'),
('Catering'),
('Venue'),
('Materials'),
('Technology'),
('Personnel'),
('Marketing'),
('Other')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO program_types (name) VALUES
('Conference'),
('Training'),
('Workshop'),
('Meeting'),
('Event'),
('Symposium'),
('Congress'),
('Other')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Sistem ayarlarını ekle
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('app_name', 'Forte Savings', 'Application name'),
('app_version', '1.0.0', 'Application version'),
('default_currency', 'TRY', 'Default currency'),
('date_format', 'Y-m-d', 'Default date format'),
('jwt_secret', '', 'JWT Secret Key - Manuel olarak ayarlanacak'),
('email_domain', '@fortetourism.com', 'Allowed email domain')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Varsayılan admin kullanıcısı (Şifre: admin123 - Deploy sonrası değiştirilmeli)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified) VALUES
('admin@fortetourism.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System', 'Admin', 'admin', TRUE, TRUE)
ON DUPLICATE KEY UPDATE email = VALUES(email);