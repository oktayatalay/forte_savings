<?php
header('Content-Type: application/json');

require_once '../config/database.php';

try {
    $pdo = getDbConnection();
    
    // Check each table
    $tables = ['users', 'projects', 'savings_records', 'categories', 'audit_logs', 'system_settings'];
    $results = [];
    
    foreach ($tables as $table) {
        try {
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM $table");
            $stmt->execute();
            $count = $stmt->fetchColumn();
            $results[$table] = $count;
            
            // Get sample data
            if ($count > 0) {
                $sampleStmt = $pdo->prepare("SELECT * FROM $table LIMIT 3");
                $sampleStmt->execute();
                $results[$table . '_sample'] = $sampleStmt->fetchAll(PDO::FETCH_ASSOC);
            }
        } catch (Exception $e) {
            $results[$table] = "Error: " . $e->getMessage();
        }
    }
    
    // Check database connection
    $results['database_connection'] = 'Connected successfully';
    $results['database_info'] = $pdo->getAttribute(PDO::ATTR_SERVER_INFO);
    
    echo json_encode([
        'success' => true,
        'data' => $results,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}
?>