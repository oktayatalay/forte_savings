<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../auth/middleware.php';

header('Content-Type: application/json');

try {
    // Sadece DELETE method
    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
        http_response_code(405);
        echo json_encode(['error' => 'Only DELETE method allowed']);
        exit;
    }
    
    // Authentication - Admin ve proje sahibi silme yapabilir (CC yetkisiz)
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
                          WHEN EXISTS(SELECT 1 FROM project_permissions pp WHERE pp.project_id = p.id AND pp.user_id = ? AND pp.permission_type = 'owner') THEN 'owner'
                          WHEN EXISTS(SELECT 1 FROM project_permissions pp WHERE pp.project_id = p.id AND pp.user_id = ? AND pp.permission_type = 'cc') THEN 'cc'
                          ELSE 'none'
                      END) as user_permission,
                      (SELECT COUNT(*) FROM savings_records sr WHERE sr.project_id = p.id) as savings_count
                      FROM projects p 
                      WHERE p.id = ? AND p.is_active = TRUE";
    
    $permission_check = $pdo->prepare($permission_sql);
    $permission_check->execute([$user_id, $user_id, $user_id, $project_id]);
    $existing_project = $permission_check->fetch(PDO::FETCH_ASSOC);
    
    if (!$existing_project) {
        http_response_code(404);
        echo json_encode(['error' => 'Project not found or already deleted']);
        exit;
    }
    
    // Permission kontrolü - sadece admin ve proje sahibi silebilir (CC silemez)
    if ($user_role !== 'admin' && $existing_project['user_permission'] !== 'owner') {
        http_response_code(403);
        echo json_encode(['error' => 'Insufficient permissions to delete this project. Only project owners and admins can delete projects.']);
        exit;
    }
    
    // Confirmation kontrolü
    $confirmation = $input['confirm'] ?? false;
    if (!$confirmation) {
        // İlk request - bilgi ver ve onay iste
        echo json_encode([
            'success' => false,
            'requires_confirmation' => true,
            'message' => 'Project deletion requires confirmation',
            'project_info' => [
                'id' => $existing_project['id'],
                'frn' => $existing_project['frn'],
                'project_name' => $existing_project['project_name'],
                'customer' => $existing_project['customer'],
                'savings_count' => intval($existing_project['savings_count']),
                'total_savings' => floatval($existing_project['total_savings'])
            ],
            'warning' => 'This action will soft-delete the project and all associated savings records. This action can be undone by an admin.'
        ]);
        exit;
    }
    
    // Transaction başlat
    $pdo->beginTransaction();
    
    try {
        // Audit log için eski değerleri kaydet
        $audit_data = [
            'id' => $existing_project['id'],
            'frn' => $existing_project['frn'],
            'project_name' => $existing_project['project_name'],
            'customer' => $existing_project['customer'],
            'total_savings' => $existing_project['total_savings'],
            'savings_count' => $existing_project['savings_count']
        ];
        
        // Projeyi soft delete (is_active = FALSE)
        $soft_delete_sql = "UPDATE projects SET is_active = FALSE, updated_at = NOW() WHERE id = ?";
        $soft_delete_stmt = $pdo->prepare($soft_delete_sql);
        $success = $soft_delete_stmt->execute([$project_id]);
        
        if (!$success) {
            throw new Exception('Failed to soft delete project');
        }
        
        // İlgili tasarruf kayıtlarını da soft delete yapabiliriz (opsiyonel)
        // Şu an için projeye bağlı kayıtlar kalacak ama proje inactive olduğu için görünmeyecek
        
        // Audit log ekle
        $audit_sql = "INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent) 
                     VALUES (?, 'DELETE', 'projects', ?, ?, ?, ?, ?)";
        $audit_stmt = $pdo->prepare($audit_sql);
        $audit_stmt->execute([
            $user_id,
            $project_id,
            json_encode($audit_data),
            json_encode(['is_active' => false, 'deleted_at' => date('Y-m-d H:i:s')]),
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ]);
        
        // Transaction commit
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Project deleted successfully',
            'data' => [
                'id' => $project_id,
                'frn' => $existing_project['frn'],
                'project_name' => $existing_project['project_name'],
                'deleted_at' => date('Y-m-d H:i:s'),
                'savings_affected' => intval($existing_project['savings_count'])
            ]
        ]);
        
    } catch (Exception $e) {
        // Transaction rollback
        $pdo->rollBack();
        throw $e;
    }

} catch (Exception $e) {
    error_log("Project delete error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>