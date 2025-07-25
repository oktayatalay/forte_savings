<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../auth/middleware.php';

header('Content-Type: application/json');

try {
    // Sadece PUT method
    if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
        http_response_code(405);
        echo json_encode(['error' => 'Only PUT method allowed']);
        exit;
    }
    
    // Authentication - Admin ve proje sahibi/CC'si düzenleyebilir
    $auth_data = requireUserOrAbove();
    $user_id = $auth_data['user_id'];
    $user_role = $auth_data['role'];
    
    // Input verilerini al
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    // Proje ID zorunlu
    if (!isset($input['id']) || !is_numeric($input['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Project ID is required and must be numeric']);
        exit;
    }
    
    $project_id = intval($input['id']);
    $pdo = getDBConnection();
    
    // Proje var mı kontrol et ve permission check
    $permission_sql = "SELECT p.*, 
                      (CASE 
                          WHEN p.created_by = ? THEN 'owner'
                          WHEN EXISTS(SELECT 1 FROM project_permissions pp WHERE pp.project_id = p.id AND pp.user_id = ? AND pp.permission_type IN ('owner', 'cc')) THEN 'cc'
                          ELSE 'none'
                      END) as user_permission
                      FROM projects p 
                      WHERE p.id = ? AND p.is_active = TRUE";
    
    $permission_check = $pdo->prepare($permission_sql);
    $permission_check->execute([$user_id, $user_id, $project_id]);
    $existing_project = $permission_check->fetch(PDO::FETCH_ASSOC);
    
    if (!$existing_project) {
        http_response_code(404);
        echo json_encode(['error' => 'Project not found or access denied']);
        exit;
    }
    
    // Permission kontrolü - admin her şeyi düzenleyebilir, diğerleri sadece sahip olduğu/CC olduğu projeleri
    if ($user_role !== 'admin' && $existing_project['user_permission'] === 'none') {
        http_response_code(403);
        echo json_encode(['error' => 'Insufficient permissions to edit this project']);
        exit;
    }
    
    // Zorunlu alanları kontrol et
    $required_fields = [
        'frn', 'entity', 'customer', 'project_name', 'event_type', 'project_type',
        'group_in', 'group_out', 'location', 'po_amount', 'forte_responsible',
        'project_director', 'forte_cc_person', 'client_representative'
    ];
    $missing_fields = [];
    
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || trim($input[$field]) === '') {
            $missing_fields[] = $field;
        }
    }
    
    if (!empty($missing_fields)) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Missing required fields: ' . implode(', ', $missing_fields),
            'required_fields' => $required_fields,
            'received_fields' => array_keys($input)
        ]);
        exit;
    }
    
    // Değerleri al ve validate et
    $frn = trim($input['frn']);
    $entity = trim($input['entity']);
    $customer = trim($input['customer']);
    $project_name = trim($input['project_name']);
    $event_type = trim($input['event_type']);
    $project_type = trim($input['project_type']);
    $group_in = $input['group_in'];
    $group_out = $input['group_out'];
    $location = trim($input['location']);
    $hotels = trim($input['hotels'] ?? '');
    $po_amount = floatval($input['po_amount']);
    $forte_responsible = trim($input['forte_responsible']);
    $project_director = trim($input['project_director']);
    $forte_cc_person = trim($input['forte_cc_person']);
    $client_representative = trim($input['client_representative']);
    $customer_po_number = trim($input['customer_po_number'] ?? '');
    $hcp_count = intval($input['hcp_count'] ?? 0);
    $colleague_count = intval($input['colleague_count'] ?? 0);
    $external_non_hcp_count = intval($input['external_non_hcp_count'] ?? 0);
    
    // Validasyonlar
    if (strlen($frn) < 3) {
        http_response_code(400);
        echo json_encode(['error' => 'FRN must be at least 3 characters long']);
        exit;
    }
    
    if ($po_amount <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'PO amount must be greater than 0']);
        exit;
    }
    
    // Tarih formatlarını kontrol et
    $group_in_obj = DateTime::createFromFormat('Y-m-d', $group_in);
    if (!$group_in_obj || $group_in_obj->format('Y-m-d') !== $group_in) {
        http_response_code(400);
        echo json_encode(['error' => 'Group in date must be in YYYY-MM-DD format']);
        exit;
    }
    
    $group_out_obj = DateTime::createFromFormat('Y-m-d', $group_out);
    if (!$group_out_obj || $group_out_obj->format('Y-m-d') !== $group_out) {
        http_response_code(400);
        echo json_encode(['error' => 'Group out date must be in YYYY-MM-DD format']);
        exit;
    }
    
    // Çıkış tarihi giriş tarihinden sonra olmalı
    if ($group_out_obj <= $group_in_obj) {
        http_response_code(400);
        echo json_encode(['error' => 'Group out date must be after group in date']);
        exit;
    }
    
    // Sayısal değerlerin negatif olmaması
    if ($hcp_count < 0 || $colleague_count < 0 || $external_non_hcp_count < 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Participant counts cannot be negative']);
        exit;
    }
    
    // FRN benzersizlik kontrolü (kendi projesi hariç)
    $frn_check = $pdo->prepare("SELECT id FROM projects WHERE frn = ? AND id != ?");
    $frn_check->execute([$frn, $project_id]);
    if ($frn_check->fetch()) {
        http_response_code(400);
        echo json_encode(['error' => 'FRN already exists. Please use a unique FRN.']);
        exit;
    }
    
    // Projeyi güncelle
    $sql = "UPDATE projects SET 
            frn = ?, entity = ?, customer = ?, project_name = ?, event_type = ?, project_type = ?,
            group_in = ?, group_out = ?, location = ?, hotels = ?, po_amount = ?,
            forte_responsible = ?, project_director = ?, forte_cc_person = ?, client_representative = ?,
            customer_po_number = ?, hcp_count = ?, colleague_count = ?, external_non_hcp_count = ?,
            updated_at = NOW()
            WHERE id = ?";
    
    $stmt = $pdo->prepare($sql);
    $success = $stmt->execute([
        $frn, $entity, $customer, $project_name, $event_type, $project_type,
        $group_in, $group_out, $location, $hotels, $po_amount,
        $forte_responsible, $project_director, $forte_cc_person, $client_representative,
        $customer_po_number, $hcp_count, $colleague_count, $external_non_hcp_count,
        $project_id
    ]);
    
    if (!$success) {
        $error_info = $stmt->errorInfo();
        throw new Exception('Failed to update project: ' . implode(', ', $error_info));
    }
    
    // Güncellenmiş projeyi geri döndür
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
        'message' => 'Project updated successfully',
        'data' => $project
    ]);

} catch (Exception $e) {
    error_log("Project update error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>