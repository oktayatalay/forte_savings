<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    // Try to load database config
    require_once '../config/database.php';
    
    $database = new Database();
    $result = $database->testConnection();
    
    if ($result['success']) {
        // Get actual table counts
        $pdo = $database->getConnection();
        
        $tables = ['users', 'projects', 'savings_records', 'categories', 'audit_logs'];
        $counts = [];
        
        foreach ($tables as $table) {
            try {
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM $table");
                $stmt->execute();
                $counts[$table] = $stmt->fetchColumn();
            } catch (Exception $e) {
                $counts[$table] = "Error: " . $e->getMessage();
            }
        }
        
        echo json_encode([
            'success' => true,
            'database_connection' => $result,
            'table_counts' => $counts,
            'env_vars' => [
                'DB_HOST' => $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: 'not set',
                'DB_NAME' => $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'not set',
                'DB_USER' => $_ENV['DB_USER'] ?? getenv('DB_USER') ?: 'not set',
                'DB_PASS' => isset($_ENV['DB_PASS']) || getenv('DB_PASS') ? 'set' : 'not set',
            ],
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_PRETTY_PRINT);
    } else {
        echo json_encode([
            'success' => false,
            'error' => $result['message'],
            'env_vars' => [
                'DB_HOST' => $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: 'not set',
                'DB_NAME' => $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'not set',
                'DB_USER' => $_ENV['DB_USER'] ?? getenv('DB_USER') ?: 'not set',
                'DB_PASS' => isset($_ENV['DB_PASS']) || getenv('DB_PASS') ? 'set' : 'not set',
            ],
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_PRETTY_PRINT);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Failed to load database config: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}
?>