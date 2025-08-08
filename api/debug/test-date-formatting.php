<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    
    // System Admin'in kaydını direkt çek
    $sql = "SELECT 
        sr.id,
        sr.date,
        sr.created_at,
        sr.updated_at,
        sr.total_price,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name
        FROM savings_records sr
        INNER JOIN users u ON u.id = sr.created_by
        WHERE sr.id = 1";
    
    $stmt = $pdo->query($sql);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Date formatting test
    $formatted_record = $record;
    $formatted_record['date_original'] = $record['date'];
    $formatted_record['date_formatted'] = date('Y-m-d', strtotime($record['date']));
    $formatted_record['created_at_original'] = $record['created_at'];
    $formatted_record['created_at_formatted'] = date('Y-m-d H:i:s', strtotime($record['created_at']));
    $formatted_record['updated_at_original'] = $record['updated_at'];
    $formatted_record['updated_at_formatted'] = date('Y-m-d H:i:s', strtotime($record['updated_at']));
    
    // Test if date formatting causes issues
    $formatting_success = true;
    $errors = [];
    
    try {
        date('Y-m-d', strtotime($record['date']));
    } catch (Exception $e) {
        $formatting_success = false;
        $errors[] = "Date formatting error: " . $e->getMessage();
    }
    
    try {
        date('Y-m-d H:i:s', strtotime($record['created_at']));
    } catch (Exception $e) {
        $formatting_success = false;
        $errors[] = "Created_at formatting error: " . $e->getMessage();
    }
    
    echo json_encode([
        'raw_record' => $record,
        'formatted_record' => $formatted_record,
        'formatting_success' => $formatting_success,
        'errors' => $errors
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>