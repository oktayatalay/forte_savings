<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../auth/middleware.php';

header('Content-Type: application/json');

try {
    // Sadece DELETE/POST method
    if (!in_array($_SERVER['REQUEST_METHOD'], ['DELETE', 'POST'])) {
        http_response_code(405);
        echo json_encode(['error' => 'Only DELETE/POST methods allowed']);
        exit;
    }
    
    // Authentication
    $auth_data = requireUserOrAbove();
    $user_id = $auth_data['user_id'];
    $user_role = $auth_data['role'];
    
    // Record ID'sini al
    $record_id = null;
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $record_id = $_GET['id'] ?? null;
    } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $record_id = $input['id'] ?? null;
    }
    
    // ID validation - empty, null veya geçersiz değerleri reddet
    if (empty($record_id) || !ctype_digit(strval($record_id))) {
        http_response_code(400);
        echo json_encode(['error' => 'Valid record ID is required']);
        exit;
    }
    
    $record_id = intval($record_id);
    
    if ($record_id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid record ID']);
        exit;
    }
    
    $pdo = getDBConnection();
    
    // Kayıt var mı ve erişim yetkisi var mı kontrol et
    $check_sql = "SELECT sr.*, p.created_by as project_owner FROM savings_records sr 
                  LEFT JOIN projects p ON sr.project_id = p.id 
                  WHERE sr.id = ?";
    $check_stmt = $pdo->prepare($check_sql);
    $check_stmt->execute([$record_id]);
    $existing_record = $check_stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existing_record) {
        http_response_code(404);
        echo json_encode(['error' => 'Savings record not found']);
        exit;
    }
    
    $project_id = $existing_record['project_id'];
    
    // Proje erişim kontrolü
    if (!requireProjectAccess($project_id, $auth_data)) {
        http_response_code(403);
        echo json_encode(['error' => 'Access denied. You do not have permission to delete savings records for this project.']);
        exit;
    }
    
    // Eğer admin değilse, sadece kendi kayıtlarını silebilir
    if ($user_role !== 'admin' && $existing_record['created_by'] != $user_id) {
        http_response_code(403);
        echo json_encode(['error' => 'Access denied. You can only delete your own savings records.']);
        exit;
    }
    
    // Silinecek kaydın bilgilerini backup olarak sakla
    $deleted_record = [
        'id' => intval($existing_record['id']),
        'project_id' => intval($existing_record['project_id']),
        'date' => $existing_record['date'],
        'type' => $existing_record['type'],
        'explanation_category' => $existing_record['explanation_category'],
        'explanation_custom' => $existing_record['explanation_custom'],
        'category' => $existing_record['category'],
        'price' => floatval($existing_record['price']),
        'unit' => intval($existing_record['unit']),
        'currency' => $existing_record['currency'],
        'total_price' => floatval($existing_record['total_price']),
        'created_by' => intval($existing_record['created_by']),
        'created_at' => $existing_record['created_at'],
        'updated_at' => $existing_record['updated_at']
    ];
    
    // Kaydı sil
    $delete_sql = "DELETE FROM savings_records WHERE id = ?";
    $delete_stmt = $pdo->prepare($delete_sql);
    $success = $delete_stmt->execute([$record_id]);
    
    if (!$success) {
        throw new Exception('Failed to delete savings record: ' . implode(', ', $delete_stmt->errorInfo()));
    }
    
    $affected_rows = $delete_stmt->rowCount();
    
    if ($affected_rows === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'No record found to delete']);
        exit;
    }
    
    // Proje total_savings'i güncelle
    $update_sql = "UPDATE projects SET 
        total_savings = (
            SELECT COALESCE(SUM(total_price), 0) 
            FROM savings_records 
            WHERE project_id = ? AND type = 'Savings'
        ),
        updated_at = NOW()
        WHERE id = ?";
    
    $update_stmt = $pdo->prepare($update_sql);
    $update_stmt->execute([$project_id, $project_id]);
    
    // Audit log için gelecekte kullanılabilir
    // TODO: Silme işlemini audit_logs tablosuna kaydet
    
    echo json_encode([
        'success' => true,
        'message' => 'Savings record deleted successfully',
        'deleted_record' => $deleted_record
    ]);

} catch (Exception $e) {
    error_log("Savings delete error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>