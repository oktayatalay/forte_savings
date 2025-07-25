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
    
    $pdo = getDBConnection();
    
    // Basit sorgu - sadece temel proje listesi
    if ($user_role === 'admin') {
        $sql = "SELECT 
            p.id, p.frn, p.customer, p.project_name, p.forte_responsible, 
            p.project_director, p.forte_cc_person, p.group_in, p.group_out,
            p.total_savings, p.po_amount, p.location, p.event_type, p.project_type,
            p.created_at, p.updated_at,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
            'admin' as user_permission,
            (SELECT COUNT(*) FROM savings_records sr WHERE sr.project_id = p.id) as savings_records_count,
            (SELECT sr.date FROM savings_records sr WHERE sr.project_id = p.id ORDER BY sr.date DESC LIMIT 1) as last_savings_date
            FROM projects p 
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.is_active = TRUE 
            ORDER BY p.updated_at DESC 
            LIMIT 10";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
    } else {
        $sql = "SELECT 
            p.id, p.frn, p.customer, p.project_name, p.forte_responsible,
            p.project_director, p.forte_cc_person, p.group_in, p.group_out,
            p.total_savings, p.po_amount, p.location, p.event_type, p.project_type,
            p.created_at, p.updated_at,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
            CASE 
                WHEN p.created_by = :user_id THEN 'owner'
                WHEN EXISTS (
                    SELECT 1 FROM project_permissions pp 
                    WHERE pp.project_id = p.id AND pp.user_id = :user_id AND pp.permission_type = 'cc'
                ) THEN 'cc'
                ELSE 'none'
            END as user_permission,
            (SELECT COUNT(*) FROM savings_records sr WHERE sr.project_id = p.id) as savings_records_count,
            (SELECT sr.date FROM savings_records sr WHERE sr.project_id = p.id ORDER BY sr.date DESC LIMIT 1) as last_savings_date
            FROM projects p 
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.is_active = TRUE AND (
                p.created_by = :user_id OR 
                EXISTS (
                    SELECT 1 FROM project_permissions pp 
                    WHERE pp.project_id = p.id AND pp.user_id = :user_id
                )
            )
            ORDER BY p.updated_at DESC 
            LIMIT 10";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['user_id' => $user_id]);
    }
    
    $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'projects' => $projects,
            'count' => count($projects)
        ],
        'user' => [
            'id' => $user_id,
            'role' => $user_role
        ]
    ]);

} catch (Exception $e) {
    error_log("Projects list error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>