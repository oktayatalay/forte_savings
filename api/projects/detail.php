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
    
    // Proje erişim kontrolü - TEMPORARILY DISABLED FOR DEBUG
    // if (!requireProjectAccess($project_id, $auth_data)) {
    //     http_response_code(403);
    //     echo json_encode(['error' => 'Access denied. You do not have permission to view this project.']);
    //     exit;
    // }
    
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
    
    // Tasarruf kayıtlarını al - Sadece geçerli kullanıcılı kayıtlar
    $savings_sql = "SELECT 
        sr.id,
        sr.project_id,
        sr.date,
        sr.type,
        sr.explanation_category,
        sr.explanation_custom,
        sr.category,
        sr.price,
        sr.unit,
        sr.currency,
        sr.total_price,
        sr.created_by,
        sr.created_at,
        sr.updated_at,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name
        FROM savings_records sr
        INNER JOIN users u ON u.id = sr.created_by
        WHERE sr.project_id = ?
        ORDER BY sr.date DESC, sr.created_at DESC";
    
    $savings_stmt = $pdo->prepare($savings_sql);
    $savings_stmt->execute([$project_id]);
    $savings_records = $savings_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // DEBUG: Log SQL results
    error_log("DEBUG: SQL returned " . count($savings_records) . " records for project_id=$project_id");
    error_log("DEBUG: Records IDs: " . implode(',', array_column($savings_records, 'id')));
    
    // Tasarruf kayıtlarını formatla
    foreach ($savings_records as &$record) {
        $record['date'] = date('Y-m-d', strtotime($record['date']));
        $record['created_at'] = date('Y-m-d H:i:s', strtotime($record['created_at']));
        $record['updated_at'] = date('Y-m-d H:i:s', strtotime($record['updated_at']));
        $record['price'] = floatval($record['price']);
        $record['unit'] = intval($record['unit']);
        $record['total_price'] = floatval($record['total_price']);
    }
    
    // Clean duplicates before statistics calculation (in case of data inconsistencies)
    $unique_records = [];
    $seen_ids = [];
    foreach ($savings_records as $record) {
        if (!in_array($record['id'], $seen_ids)) {
            $unique_records[] = $record;
            $seen_ids[] = $record['id'];
        }
    }
    
    // Log if duplicates were found and removed
    if (count($savings_records) !== count($unique_records)) {
        error_log("Duplicate records found and cleaned for project {$project_id}: " . 
                  count($savings_records) . " -> " . count($unique_records));
    }
    
    // Use cleaned records for further processing
    $savings_records = $unique_records;
    
    // DEBUG: Log after cleaning
    error_log("DEBUG: After cleaning: " . count($savings_records) . " records remain");
    error_log("DEBUG: Final IDs: " . implode(',', array_column($savings_records, 'id')));
    
    // Proje istatistiklerini currency bazında hesapla
    $stats_by_currency = [];
    $total_records = count($savings_records);
    $last_record_date = null;
    
    foreach ($savings_records as $record) {
        $currency = $record['currency'];
        $type = $record['type'];
        $amount = floatval($record['total_price']);
        
        if (!isset($stats_by_currency[$currency])) {
            $stats_by_currency[$currency] = [
                'currency' => $currency,
                'savings' => 0,
                'cost_avoidance' => 0,
                'total' => 0,
                'record_count' => 0
            ];
        }
        
        if ($type === 'Savings') {
            $stats_by_currency[$currency]['savings'] += $amount;
        } else {
            $stats_by_currency[$currency]['cost_avoidance'] += $amount;
        }
        
        $stats_by_currency[$currency]['total'] += $amount;
        $stats_by_currency[$currency]['record_count']++;
        
        if (!$last_record_date || $record['date'] > $last_record_date) {
            $last_record_date = $record['date'];
        }
    }
    
    $stats = [
        'total_savings_records' => $total_records,
        'by_currency' => array_values($stats_by_currency),
        'last_record_date' => $last_record_date,
        // Backward compatibility - legacy fields
        'total_cost_avoidance' => array_sum(array_column($stats_by_currency, 'cost_avoidance')),
        'total_savings' => array_sum(array_column($stats_by_currency, 'savings')),
        'total_amount' => array_sum(array_column($stats_by_currency, 'total'))
    ];
    
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
    
    // DEBUG: Final dump of savings_records before JSON response
    error_log("DEBUG: Final response will contain " . count($savings_records) . " savings_records");
    error_log("DEBUG: Savings records IDs in response: " . implode(',', array_column($savings_records, 'id')));
    error_log("DEBUG: Full dump: " . print_r($savings_records, true));
    
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