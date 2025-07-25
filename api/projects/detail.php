<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../auth/middleware.php';

header('Content-Type: application/json');

try {
    // Authentication
    $auth_data = requireUserOrAbove();
    $user_id = $auth_data['user_id'];
    $user_role = $auth_data['role'];
    
    // Proje ID'sini al
    $project_id = null;
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $project_id = $_GET['id'] ?? null;
    } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $project_id = $input['id'] ?? null;
    }
    
    if (!$project_id || !is_numeric($project_id)) {
        http_response_code(400);
        echo json_encode(['error' => 'Valid project ID is required']);
        exit;
    }
    
    $pdo = getDBConnection();
    
    // Proje erişim kontrolü
    if (!requireProjectAccess($project_id, $auth_data)) {
        http_response_code(403);
        echo json_encode(['error' => 'Access denied. You do not have permission to view this project.']);
        exit;
    }
    
    // Proje detaylarını al
    $project_sql = "SELECT 
        p.*,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
        u.email as created_by_email
        FROM projects p 
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.id = ? AND p.is_active = TRUE";
    
    $project_stmt = $pdo->prepare($project_sql);
    $project_stmt->execute([$project_id]);
    $project = $project_stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$project) {
        http_response_code(404);
        echo json_encode(['error' => 'Project not found or inactive']);
        exit;
    }
    
    // Tarihleri formatla ve sayıları düzelt
    $project['group_in'] = date('Y-m-d', strtotime($project['group_in']));
    $project['group_out'] = date('Y-m-d', strtotime($project['group_out']));
    $project['created_at'] = date('Y-m-d H:i:s', strtotime($project['created_at']));
    $project['updated_at'] = date('Y-m-d H:i:s', strtotime($project['updated_at']));
    $project['total_savings'] = floatval($project['total_savings']);
    $project['po_amount'] = floatval($project['po_amount']);
    $project['hcp_count'] = intval($project['hcp_count']);
    $project['colleague_count'] = intval($project['colleague_count']);
    $project['external_non_hcp_count'] = intval($project['external_non_hcp_count']);
    
    // Kullanıcının bu projedeki yetkisini belirle
    $user_permission = 'viewer';
    if ($user_role === 'admin') {
        $user_permission = 'admin';
    } else if ($project['created_by'] == $user_id) {
        $user_permission = 'owner';
    } else {
        // CC permission kontrolü
        $permission_stmt = $pdo->prepare("
            SELECT permission_type FROM project_permissions 
            WHERE project_id = ? AND user_id = ?
        ");
        $permission_stmt->execute([$project_id, $user_id]);
        $permission = $permission_stmt->fetchColumn();
        if ($permission) {
            $user_permission = $permission; // 'cc' veya 'owner'
        }
    }
    
    // Tasarruf kayıtlarını al
    $savings_sql = "SELECT 
        sr.*,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name
        FROM savings_records sr
        LEFT JOIN users u ON sr.created_by = u.id
        WHERE sr.project_id = ?
        ORDER BY sr.date DESC, sr.created_at DESC";
    
    $savings_stmt = $pdo->prepare($savings_sql);
    $savings_stmt->execute([$project_id]);
    $savings_records = $savings_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Tasarruf kayıtlarını formatla
    foreach ($savings_records as &$record) {
        $record['date'] = date('Y-m-d', strtotime($record['date']));
        $record['created_at'] = date('Y-m-d H:i:s', strtotime($record['created_at']));
        $record['updated_at'] = date('Y-m-d H:i:s', strtotime($record['updated_at']));
        $record['price'] = floatval($record['price']);
        $record['unit'] = intval($record['unit']);
        $record['total_price'] = floatval($record['total_price']);
    }
    
    // Proje istatistiklerini hesapla
    $stats = [
        'total_savings_records' => count($savings_records),
        'total_cost_avoidance' => 0,
        'total_savings' => 0,
        'total_amount' => 0,
        'last_record_date' => null
    ];
    
    foreach ($savings_records as $record) {
        if ($record['type'] === 'Cost Avoidance') {
            $stats['total_cost_avoidance'] += $record['total_price'];
        } else {
            $stats['total_savings'] += $record['total_price'];
        }
        $stats['total_amount'] += $record['total_price'];
        
        if (!$stats['last_record_date'] || $record['date'] > $stats['last_record_date']) {
            $stats['last_record_date'] = $record['date'];
        }
    }
    
    // CC kişilerini al
    $cc_sql = "SELECT 
        pp.permission_type,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        u.email
        FROM project_permissions pp
        LEFT JOIN users u ON pp.user_id = u.id
        WHERE pp.project_id = ?
        ORDER BY pp.permission_type, u.first_name";
    
    $cc_stmt = $pdo->prepare($cc_sql);
    $cc_stmt->execute([$project_id]);
    $project_team = $cc_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $response = [
        'success' => true,
        'data' => [
            'project' => $project,
            'savings_records' => $savings_records,
            'project_team' => $project_team,
            'statistics' => $stats,
            'user_permission' => $user_permission
        ],
        'user' => [
            'id' => $user_id,
            'role' => $user_role,
            'permission' => $user_permission
        ]
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    error_log("Project detail error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>