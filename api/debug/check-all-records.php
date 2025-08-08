<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    
    // FRN-2025-001 projesinin ID'sini bul
    $project_sql = "SELECT id, frn FROM projects WHERE frn = 'FRN-2025-001'";
    $stmt = $pdo->query($project_sql);
    $project = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$project) {
        echo json_encode(['error' => 'Project FRN-2025-001 not found']);
        exit;
    }
    
    $project_id = $project['id'];
    
    // Tüm kayıtları göster
    $all_records_sql = "SELECT 
        sr.id, 
        sr.currency, 
        sr.type, 
        sr.total_price, 
        sr.created_by,
        CASE 
            WHEN u.id IS NULL THEN 'USER_DELETED'
            ELSE CONCAT(u.first_name, ' ', u.last_name)
        END as created_by_name
        FROM savings_records sr
        LEFT JOIN users u ON u.id = sr.created_by
        WHERE sr.project_id = ?
        ORDER BY sr.id";
    
    $stmt = $pdo->prepare($all_records_sql);
    $stmt->execute([$project_id]);
    $all_records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Sadece geçerli kullanıcılı kayıtları göster
    $valid_records_sql = "SELECT 
        sr.id, 
        sr.currency, 
        sr.type, 
        sr.total_price, 
        sr.created_by,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name
        FROM savings_records sr
        INNER JOIN users u ON u.id = sr.created_by
        WHERE sr.project_id = ?
        ORDER BY sr.id";
    
    $stmt = $pdo->prepare($valid_records_sql);
    $stmt->execute([$project_id]);
    $valid_records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'project_id' => $project_id,
        'frn' => $project['frn'],
        'all_records_count' => count($all_records),
        'valid_records_count' => count($valid_records),
        'all_records' => $all_records,
        'valid_records' => $valid_records,
        'difference' => array_diff(
            array_column($all_records, 'id'),
            array_column($valid_records, 'id')
        )
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>