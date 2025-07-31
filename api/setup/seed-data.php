<?php
header('Content-Type: application/json');

require_once '../config/database.php';

try {
    $pdo = getDbConnection();
    
    // Start transaction
    $pdo->beginTransaction();
    
    $results = [];
    
    // 1. Create tables if they don't exist
    $createTables = [
        'users' => "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            role ENUM('user', 'admin', 'super_admin') DEFAULT 'user',
            status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
            phone VARCHAR(20),
            department VARCHAR(100),
            position VARCHAR(100),
            last_login DATETIME,
            email_verified_at DATETIME,
            two_factor_enabled BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted_at DATETIME NULL
        )",
        
        'projects' => "CREATE TABLE IF NOT EXISTS projects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            category_id INT,
            status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
            created_by INT,
            start_date DATE,
            end_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )",
        
        'savings_records' => "CREATE TABLE IF NOT EXISTS savings_records (
            id INT AUTO_INCREMENT PRIMARY KEY,
            project_id INT NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'TRY',
            type ENUM('savings', 'cost_avoidance') DEFAULT 'savings',
            description TEXT,
            date_recorded DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )",
        
        'categories' => "CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            type ENUM('project_category', 'department', 'cost_center') DEFAULT 'project_category',
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )",
        
        'audit_logs' => "CREATE TABLE IF NOT EXISTS audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            action VARCHAR(50) NOT NULL,
            resource_type VARCHAR(50),
            resource_id INT,
            description TEXT,
            ip_address VARCHAR(45),
            user_agent TEXT,
            metadata JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )",
        
        'system_settings' => "CREATE TABLE IF NOT EXISTS system_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            setting_key VARCHAR(100) UNIQUE NOT NULL,
            setting_value TEXT,
            setting_type ENUM('string', 'integer', 'boolean', 'array') DEFAULT 'string',
            category VARCHAR(50),
            description TEXT,
            updated_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (updated_by) REFERENCES users(id)
        )"
    ];
    
    foreach ($createTables as $tableName => $sql) {
        $pdo->exec($sql);
        $results['tables'][$tableName] = 'Created/verified';
    }
    
    // 2. Check if data already exists
    $userCount = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    
    if ($userCount == 0) {
        // 3. Insert sample users
        $users = [
            [
                'email' => 'admin@fortetourism.com',
                'password_hash' => password_hash('admin123', PASSWORD_DEFAULT),
                'first_name' => 'Admin',
                'last_name' => 'User',
                'role' => 'super_admin',
                'department' => 'IT',
                'position' => 'System Administrator',
                'phone' => '+90 555 123 4567',
                'email_verified_at' => date('Y-m-d H:i:s')
            ],
            [
                'email' => 'manager@fortetourism.com',
                'password_hash' => password_hash('manager123', PASSWORD_DEFAULT),
                'first_name' => 'Ahmet',
                'last_name' => 'Yılmaz',
                'role' => 'admin',
                'department' => 'Operations',
                'position' => 'Department Manager',
                'phone' => '+90 555 234 5678'
            ],
            [
                'email' => 'user1@fortetourism.com',
                'password_hash' => password_hash('user123', PASSWORD_DEFAULT),
                'first_name' => 'Fatma',
                'last_name' => 'Koç',
                'role' => 'user',
                'department' => 'Finance',
                'position' => 'Financial Analyst',
                'phone' => '+90 555 345 6789'
            ],
            [
                'email' => 'user2@fortetourism.com',
                'password_hash' => password_hash('user123', PASSWORD_DEFAULT),
                'first_name' => 'Mehmet',
                'last_name' => 'Çelik',
                'role' => 'user',
                'department' => 'Sales',
                'position' => 'Sales Specialist',
                'phone' => '+90 555 456 7890'
            ]
        ];
        
        $userSql = "INSERT INTO users (email, password_hash, first_name, last_name, role, department, position, phone, email_verified_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $userStmt = $pdo->prepare($userSql);
        
        foreach ($users as $user) {
            $userStmt->execute([
                $user['email'],
                $user['password_hash'],
                $user['first_name'],
                $user['last_name'],
                $user['role'],
                $user['department'],
                $user['position'],
                $user['phone'],
                $user['email_verified_at'] ?? null
            ]);
        }
        
        $results['users'] = count($users) . ' users created';
        
        // 4. Insert sample categories
        $categories = [
            ['name' => 'IT Altyapı', 'description' => 'Bilgi teknolojileri altyapı projeleri', 'type' => 'project_category'],
            ['name' => 'Süreç İyileştirme', 'description' => 'İş süreçlerinin iyileştirilmesi', 'type' => 'project_category'],
            ['name' => 'Maliyet Azaltma', 'description' => 'Operasyonel maliyet azaltma projeleri', 'type' => 'project_category'],
            ['name' => 'Finans', 'description' => 'Finans departmanı', 'type' => 'department'],
            ['name' => 'Operasyon', 'description' => 'Operasyon departmanı', 'type' => 'department'],
            ['name' => 'IT', 'description' => 'Bilgi teknolojileri departmanı', 'type' => 'department']
        ];
        
        $categorySql = "INSERT INTO categories (name, description, type) VALUES (?, ?, ?)";
        $categoryStmt = $pdo->prepare($categorySql);
        
        foreach ($categories as $category) {
            $categoryStmt->execute([$category['name'], $category['description'], $category['type']]);
        }
        
        $results['categories'] = count($categories) . ' categories created';
        
        // 5. Insert sample projects
        $projects = [
            [
                'title' => '2024 Q1 Tasarruf Projesi',
                'description' => 'İlk çeyrek tasarruf hedefleri',
                'category_id' => 1,
                'created_by' => 2,
                'start_date' => '2024-01-01',
                'status' => 'completed'
            ],
            [
                'title' => 'Sistem Otomasyonu',
                'description' => 'Manuel süreçlerin otomasyonu',
                'category_id' => 1,
                'created_by' => 3,
                'start_date' => '2024-02-01',
                'status' => 'active'
            ],
            [
                'title' => 'Maliyet Optimizasyonu',
                'description' => 'Operasyonel maliyetlerin optimizasyonu',
                'category_id' => 3,
                'created_by' => 4,
                'start_date' => '2024-03-01',
                'status' => 'active'
            ]
        ];
        
        $projectSql = "INSERT INTO projects (title, description, category_id, created_by, start_date, status) VALUES (?, ?, ?, ?, ?, ?)";
        $projectStmt = $pdo->prepare($projectSql);
        
        foreach ($projects as $project) {
            $projectStmt->execute([
                $project['title'],
                $project['description'],
                $project['category_id'],
                $project['created_by'],
                $project['start_date'],
                $project['status']
            ]);
        }
        
        $results['projects'] = count($projects) . ' projects created';
        
        // 6. Insert sample savings
        $savings = [
            ['project_id' => 1, 'amount' => 15000, 'currency' => 'TRY', 'description' => 'Enerji tasarrufu', 'date_recorded' => '2024-01-15'],
            ['project_id' => 1, 'amount' => 8500, 'currency' => 'TRY', 'description' => 'Malzeme tasarrufu', 'date_recorded' => '2024-01-20'],
            ['project_id' => 2, 'amount' => 25000, 'currency' => 'TRY', 'description' => 'Süreç otomasyonu', 'date_recorded' => '2024-02-10'],
            ['project_id' => 3, 'amount' => 12000, 'currency' => 'TRY', 'description' => 'Tedarikçi optimizasyonu', 'date_recorded' => '2024-03-05']
        ];
        
        $savingSql = "INSERT INTO savings_records (project_id, amount, currency, description, date_recorded) VALUES (?, ?, ?, ?, ?)";
        $savingStmt = $pdo->prepare($savingSql);
        
        foreach ($savings as $saving) {
            $savingStmt->execute([
                $saving['project_id'],
                $saving['amount'],
                $saving['currency'],
                $saving['description'],
                $saving['date_recorded']
            ]);
        }
        
        $results['savings'] = count($savings) . ' savings records created';
        
        // 7. Insert some audit logs
        $auditLogs = [
            ['user_id' => 1, 'action' => 'login', 'description' => 'Admin user logged in', 'ip_address' => '192.168.1.100'],
            ['user_id' => 2, 'action' => 'create', 'resource_type' => 'project', 'description' => 'Created new project', 'ip_address' => '192.168.1.101'],
            ['user_id' => 3, 'action' => 'update', 'resource_type' => 'savings', 'description' => 'Updated savings record', 'ip_address' => '192.168.1.102']
        ];
        
        $auditSql = "INSERT INTO audit_logs (user_id, action, resource_type, description, ip_address) VALUES (?, ?, ?, ?, ?)";
        $auditStmt = $pdo->prepare($auditSql);
        
        foreach ($auditLogs as $log) {
            $auditStmt->execute([
                $log['user_id'],
                $log['action'],
                $log['resource_type'] ?? null,
                $log['description'],
                $log['ip_address']
            ]);
        }
        
        $results['audit_logs'] = count($auditLogs) . ' audit logs created';
        
    } else {
        $results['message'] = 'Data already exists, skipping seed';
        $results['existing_users'] = $userCount;
    }
    
    // Commit transaction
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'results' => $results,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    $pdo->rollBack();
    
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}
?>