<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../auth/middleware.php';

header('Content-Type: application/json');

try {
    // Sadece POST method
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Only POST method allowed']);
        exit;
    }
    
    // Authentication
    $auth_data = requireUserOrAbove();
    $user_id = $auth_data['user_id'];
    $user_role = $auth_data['role'];
    
    // Input verilerini al
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    // Zorunlu alanları kontrol et
    $required_fields = ['project_id', 'date', 'type', 'category', 'price', 'unit', 'currency'];
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
    
    // Proje erişim kontrolü
    if (!requireProjectAccess($project_id, $auth_data)) {
        http_response_code(403);
        echo json_encode(['error' => 'Access denied. You do not have permission to add savings records to this project.']);
        exit;
    }
    
    // Veritabanına kaydet (total_price generated column olduğu için manuel değer vermeye gerek yok)
    $sql = "INSERT INTO savings_records (
        project_id, 
        date, 
        type, 
        explanation_category, 
        explanation_custom, 
        category, 
        price, 
        unit, 
        currency, 
        created_by, 
        created_at, 
        updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
    
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
        $user_id
    ]);
    
    if (!$success) {
        throw new Exception('Failed to insert savings record: ' . implode(', ', $stmt->errorInfo()));
    }
    
    $record_id = $pdo->lastInsertId();
    
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
    
    // Oluşturulan kaydı geri döndür
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
        'message' => 'Savings record created successfully',
        'data' => $record
    ]);

} catch (Exception $e) {
    error_log("Savings create error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>