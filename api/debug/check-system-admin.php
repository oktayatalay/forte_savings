<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    
    // System Admin user'ını kontrol et
    $user_sql = "SELECT * FROM users WHERE id = 1";
    $stmt = $pdo->query($user_sql);
    $system_admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // System Admin'in kayıtlarını kontrol et  
    $records_sql = "SELECT * FROM savings_records WHERE created_by = 1";
    $stmt = $pdo->query($records_sql);
    $system_admin_records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // INNER JOIN test et
    $join_test_sql = "SELECT 
        sr.id, sr.total_price, sr.created_by,
        u.first_name, u.last_name
        FROM savings_records sr
        INNER JOIN users u ON u.id = sr.created_by
        WHERE sr.created_by = 1";
    $stmt = $pdo->query($join_test_sql);
    $join_results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'system_admin_user' => $system_admin,
        'system_admin_records_count' => count($system_admin_records),
        'system_admin_records' => $system_admin_records,
        'inner_join_test_count' => count($join_results),
        'inner_join_test' => $join_results
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>