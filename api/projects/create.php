<?php
require_once '../security/SecurityMiddleware.php';
require_once '../config/database.php';
require_once '../auth/middleware.php';

// Apply comprehensive security
SecurityMiddleware::setupAPI(['POST', 'OPTIONS']);

try {
    // Authentication - Admin ve user'lar yeni proje oluşturabilir
    $auth_data = SecurityMiddleware::authenticate(['user', 'admin']);
    $user_id = $auth_data['user_id'];
    $user_role = $auth_data['role'];
    
    // Input verilerini al ve validate et
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    // Enhanced input validation with security rules
    $validationRules = [
        'frn' => ['type' => 'text', 'required' => true, 'max_length' => 50],
        'entity' => ['type' => 'text', 'required' => true, 'max_length' => 100],
        'customer' => ['type' => 'text', 'required' => true, 'max_length' => 100],
        'project_name' => ['type' => 'text', 'required' => true, 'max_length' => 200],
        'event_type' => ['type' => 'text', 'required' => true, 'max_length' => 100],
        'project_type' => ['type' => 'text', 'required' => true, 'max_length' => 100],
        'group_in' => ['type' => 'date', 'required' => true],
        'group_out' => ['type' => 'date', 'required' => true],
        'location' => ['type' => 'text', 'required' => true, 'max_length' => 200],
        'po_amount' => ['type' => 'numeric', 'required' => true, 'min' => 0.01],
        'forte_responsible' => ['type' => 'text', 'required' => true, 'max_length' => 100],
        'project_director' => ['type' => 'text', 'required' => true, 'max_length' => 100],
        'forte_cc_person' => ['type' => 'text', 'required' => true, 'max_length' => 100],
        'client_representative' => ['type' => 'text', 'required' => true, 'max_length' => 100],
        'hotels' => ['type' => 'text', 'required' => false, 'max_length' => 500],
        'customer_po_number' => ['type' => 'text', 'required' => false, 'max_length' => 100],
        'hcp_count' => ['type' => 'integer', 'required' => false, 'min' => 0],
        'colleague_count' => ['type' => 'integer', 'required' => false, 'min' => 0],
        'external_non_hcp_count' => ['type' => 'integer', 'required' => false, 'min' => 0]
    ];
    
    $validated = SecurityMiddleware::validateInput($input, $validationRules);
    
    // Extract validated values
    $frn = $validated['frn'];
    $entity = $validated['entity'];
    $customer = $validated['customer'];
    $project_name = $validated['project_name'];
    $event_type = $validated['event_type'];
    $project_type = $validated['project_type'];
    $group_in = $validated['group_in'];
    $group_out = $validated['group_out'];
    $location = $validated['location'];
    $hotels = $validated['hotels'] ?? '';
    $po_amount = $validated['po_amount'];
    $forte_responsible = $validated['forte_responsible'];
    $project_director = $validated['project_director'];
    $forte_cc_person = $validated['forte_cc_person'];
    $client_representative = $validated['client_representative'];
    $customer_po_number = $validated['customer_po_number'] ?? '';
    $hcp_count = $validated['hcp_count'] ?? 0;
    $colleague_count = $validated['colleague_count'] ?? 0;
    $external_non_hcp_count = $validated['external_non_hcp_count'] ?? 0;
    
    // Additional business logic validations
    if (strlen($frn) < 3) {
        SecureErrorHandler::sendErrorResponse('INVALID_FRN', 'FRN must be at least 3 characters long', [], 400);
    }
    
    // Date validation is already handled by InputValidator
    $group_in_obj = DateTime::createFromFormat('Y-m-d', $group_in);
    $group_out_obj = DateTime::createFromFormat('Y-m-d', $group_out);
    
    // Çıkış tarihi giriş tarihinden sonra olmalı
    if ($group_out_obj <= $group_in_obj) {
        SecureErrorHandler::sendErrorResponse('INVALID_DATE_RANGE', 'Group out date must be after group in date', [], 400);
    }
    
    $pdo = getDBConnection();
    
    // FRN benzersizlik kontrolü
    $frn_check = $pdo->prepare("SELECT id FROM projects WHERE frn = ?");
    $frn_check->execute([$frn]);
    if ($frn_check->fetch()) {
        SecureErrorHandler::sendErrorResponse('DUPLICATE_FRN', 'FRN already exists. Please use a unique FRN.', [], 400);
    }
    
    // Veritabanına kaydet
    $sql = "INSERT INTO projects (
        frn, entity, customer, project_name, event_type, project_type,
        group_in, group_out, location, hotels, po_amount,
        forte_responsible, project_director, forte_cc_person, client_representative,
        customer_po_number, hcp_count, colleague_count, external_non_hcp_count,
        total_savings, created_by, created_at, updated_at, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, NOW(), NOW(), TRUE)";
    
    $stmt = $pdo->prepare($sql);
    $success = $stmt->execute([
        $frn, $entity, $customer, $project_name, $event_type, $project_type,
        $group_in, $group_out, $location, $hotels, $po_amount,
        $forte_responsible, $project_director, $forte_cc_person, $client_representative,
        $customer_po_number, $hcp_count, $colleague_count, $external_non_hcp_count,
        $user_id
    ]);
    
    if (!$success) {
        $error_info = $stmt->errorInfo();
        throw new Exception('Failed to insert project: ' . implode(', ', $error_info));
    }
    
    $project_id = $pdo->lastInsertId();
    
    // Oluşturulan projeyi geri döndür
    $select_sql = "SELECT 
        p.*,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.id = ?";
    
    $select_stmt = $pdo->prepare($select_sql);
    $select_stmt->execute([$project_id]);
    $project = $select_stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($project) {
        // Tarihleri formatla
        $project['group_in'] = date('Y-m-d', strtotime($project['group_in']));
        $project['group_out'] = date('Y-m-d', strtotime($project['group_out']));
        $project['created_at'] = date('Y-m-d H:i:s', strtotime($project['created_at']));
        $project['updated_at'] = date('Y-m-d H:i:s', strtotime($project['updated_at']));
        $project['po_amount'] = floatval($project['po_amount']);
        $project['total_savings'] = floatval($project['total_savings']);
        $project['hcp_count'] = intval($project['hcp_count']);
        $project['colleague_count'] = intval($project['colleague_count']);
        $project['external_non_hcp_count'] = intval($project['external_non_hcp_count']);
        $project['id'] = intval($project['id']);
        $project['created_by'] = intval($project['created_by']);
        $project['is_active'] = (bool)$project['is_active'];
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Project created successfully',
        'data' => $project
    ]);

} catch (PDOException $e) {
    SecureErrorHandler::handleDatabaseError($e, 'project creation');
} catch (Exception $e) {
    SecureErrorHandler::handleException($e);
}
?>