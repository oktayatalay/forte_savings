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
            p.id, p.frn, p.customer, p.project_name, 
            p.forte_responsible, p.total_savings, p.created_at
            FROM projects p 
            WHERE p.is_active = TRUE 
            ORDER BY p.created_at DESC 
            LIMIT 10";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
    } else {
        $sql = "SELECT 
            p.id, p.frn, p.customer, p.project_name, 
            p.forte_responsible, p.total_savings, p.created_at
            FROM projects p 
            WHERE p.is_active = TRUE AND (
                p.created_by = :user_id OR 
                EXISTS (
                    SELECT 1 FROM project_permissions pp 
                    WHERE pp.project_id = p.id AND pp.user_id = :user_id
                )
            )
            ORDER BY p.created_at DESC 
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