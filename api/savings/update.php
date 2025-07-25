<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../auth/middleware.php';

header('Content-Type: application/json');

try {
    // Sadece PUT/POST method
    if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'POST'])) {
        http_response_code(405);
        echo json_encode(['error' => 'Only PUT/POST methods allowed']);
        exit;
    }
    
    // Authentication
    $auth_data = requireUserOrAbove();
    $user_id = $auth_data['user_id'];
    $user_role = $auth_data['role'];
    
    // Input verilerini al
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    // Zorunlu alanları kontrol et
    $required_fields = ['id', 'project_id', 'date', 'type', 'category', 'price', 'unit', 'currency'];
    $missing_fields = [];
    
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || $input[$field] === '' || $input[$field] === null) {
            $missing_fields[] = $field;
        }
    }
    
    if (!empty($missing_fields)) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Missing required fields: ' . implode(', ', $missing_fields),
            'required_fields' => $required_fields
        ]);
        exit;
    }
    
    // Değerleri al ve validate et
    $record_id = intval($input['id']);
    $project_id = intval($input['project_id']);
    $date = $input['date'];
    $type = $input['type'];
    $explanation_category = $input['explanation_category'] ?? '';
    $explanation_custom = $input['explanation_custom'] ?? '';
    $category = $input['category'];
    $price = floatval($input['price']);
    $unit = intval($input['unit']);
    $currency = $input['currency'];
    
    // Validasyonlar
    if ($record_id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid record ID']);
        exit;
    }
    
    if ($project_id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid project ID']);
        exit;
    }
    
    if (!in_array($type, ['Savings', 'Cost Avoidance'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Type must be either "Savings" or "Cost Avoidance"']);
        exit;
    }
    
    if ($price <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Price must be greater than 0']);
        exit;
    }
    
    if ($unit <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Unit must be greater than 0']);
        exit;
    }
    
    if (!in_array($currency, ['TRY', 'USD', 'EUR', 'GBP'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Currency must be one of: TRY, USD, EUR, GBP']);
        exit;
    }
    
    // Tarih formatını kontrol et
    $date_obj = DateTime::createFromFormat('Y-m-d', $date);
    if (!$date_obj || $date_obj->format('Y-m-d') !== $date) {
        http_response_code(400);
        echo json_encode(['error' => 'Date must be in YYYY-MM-DD format']);
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
    
    // Proje erişim kontrolü
    if (!requireProjectAccess($project_id, $auth_data)) {
        http_response_code(403);
        echo json_encode(['error' => 'Access denied. You do not have permission to edit savings records for this project.']);
        exit;
    }
    
    // Eğer admin değilse, sadece kendi kayıtlarını düzenleyebilir
    if ($user_role !== 'admin' && $existing_record['created_by'] != $user_id) {
        http_response_code(403);
        echo json_encode(['error' => 'Access denied. You can only edit your own savings records.']);
        exit;
    }
    
    // Kaydı güncelle (total_price generated column olduğu için manuel değer vermeye gerek yok)
    $sql = "UPDATE savings_records SET 
        project_id = ?, 
        date = ?, 
        type = ?, 
        explanation_category = ?, 
        explanation_custom = ?, 
        category = ?, 
        price = ?, 
        unit = ?, 
        currency = ?, 
        updated_at = NOW()
        WHERE id = ?";
    
    $stmt = $pdo->prepare($sql);
    $success = $stmt->execute([
        $project_id,
        $date,
        $type,
        $explanation_category,
        $explanation_custom,
        $category,
        $price,
        $unit,
        $currency,
        $record_id
    ]);
    
    if (!$success) {
        throw new Exception('Failed to update savings record: ' . implode(', ', $stmt->errorInfo()));
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
    
    // Güncellenen kaydı geri döndür
    $select_sql = "SELECT 
        sr.*,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name
        FROM savings_records sr
        LEFT JOIN users u ON sr.created_by = u.id
        WHERE sr.id = ?";
    
    $select_stmt = $pdo->prepare($select_sql);
    $select_stmt->execute([$record_id]);
    $record = $select_stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($record) {
        // Tarihleri formatla
        $record['date'] = date('Y-m-d', strtotime($record['date']));
        $record['created_at'] = date('Y-m-d H:i:s', strtotime($record['created_at']));
        $record['updated_at'] = date('Y-m-d H:i:s', strtotime($record['updated_at']));
        $record['price'] = floatval($record['price']);
        $record['unit'] = intval($record['unit']);
        $record['total_price'] = floatval($record['total_price']);
        $record['id'] = intval($record['id']);
        $record['project_id'] = intval($record['project_id']);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Savings record updated successfully',
        'data' => $record
    ]);

} catch (Exception $e) {
    error_log("Savings update error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>