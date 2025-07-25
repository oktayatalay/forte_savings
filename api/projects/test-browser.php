<?php
require_once '../config/cors.php';
require_once '../config/database.php';

header('Content-Type: application/json');

try {
    $pdo = getDBConnection();
    
    // Admin user'ı bul
    $user_stmt = $pdo->prepare("SELECT id, email, role FROM users WHERE email = 'admin@fortetourism.com' OR email = 'oktay.atalay@fortetourism.com' LIMIT 1");
    $user_stmt->execute();
    $admin_user = $user_stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin_user) {
        throw new Exception("Admin user bulunamadı");
    }
    
    // Projeleri al (admin tüm projeleri görebilir)
    $projects_stmt = $pdo->prepare("
        SELECT 
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
        LIMIT 10
    ");
    $projects_stmt->execute();
    $projects = $projects_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'Browser test - Authorization bypass',
        'data' => [
            'projects' => $projects,
            'count' => count($projects)
        ],
        'admin_user' => [
            'id' => $admin_user['id'],
            'email' => $admin_user['email'],
            'role' => $admin_user['role']
        ],
        'note' => 'Bu endpoint sadece test amaçlı - gerçek kullanımda authentication gerekli'
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_PRETTY_PRINT);
}
?>