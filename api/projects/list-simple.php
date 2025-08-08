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
    
    // Input parametreleri al
    $input = [];
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
    } else {
        $input = $_GET;
    }
    
    // Sayfalama parametreleri
    $page = (int)($input['page'] ?? 1);
    $limit = (int)($input['limit'] ?? 10);
    $offset = ($page - 1) * $limit;
    
    // Filtreleme parametreleri
    $search = $input['search'] ?? '';
    $sort_by = $input['sort_by'] ?? 'updated_at';
    $sort_order = strtoupper($input['sort_order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
    
    // Geçerli sıralama alanları
    $valid_sort_fields = [
        'frn', 'customer', 'project_name', 'forte_responsible', 
        'project_director', 'group_in', 'group_out', 'total_savings', 
        'created_at', 'updated_at'
    ];
    
    if (!in_array($sort_by, $valid_sort_fields)) {
        $sort_by = 'updated_at';
    }
    
    $pdo = getDBConnection();
    
    // Base WHERE clause
    $base_where = "WHERE p.is_active = TRUE";
    
    if ($user_role !== 'admin') {
        $base_where .= " AND (
            p.created_by = :user_id OR 
            EXISTS (
                SELECT 1 FROM project_permissions pp 
                WHERE pp.project_id = p.id AND pp.user_id = :user_id2
            )
        )";
    }
    
    // Arama filtresi ekle
    if (!empty($search)) {
        $base_where .= " AND (
            p.frn LIKE :search1 OR 
            p.customer LIKE :search2 OR 
            p.project_name LIKE :search3 OR
            p.forte_responsible LIKE :search4 OR
            p.project_director LIKE :search5
        )";
    }
    
    // Count query için parametreleri hazırla
    $count_params = [];
    if ($user_role !== 'admin') {
        $count_params['user_id'] = $user_id;
        $count_params['user_id2'] = $user_id;
    }
    if (!empty($search)) {
        $search_term = '%' . $search . '%';
        $count_params['search1'] = $search_term;
        $count_params['search2'] = $search_term;
        $count_params['search3'] = $search_term;
        $count_params['search4'] = $search_term;
        $count_params['search5'] = $search_term;
    }
    
    // Toplam kayıt sayısını al (limit/offset olmadan)
    $count_sql = "SELECT COUNT(*) FROM projects p " . $base_where;
    try {
        $count_stmt = $pdo->prepare($count_sql);
        $count_stmt->execute($count_params);
        $total_records = $count_stmt->fetchColumn();
    } catch (Exception $count_error) {
        throw new Exception("Count query error: " . $count_error->getMessage() . " | SQL: " . $count_sql . " | Params: " . json_encode($count_params));
    }
    
    // Main query için parametreleri hazırla
    $query_params = $count_params; // Count ile aynı parametreler
    $query_params['limit'] = $limit;
    $query_params['offset'] = $offset;
    
    // Ana sorgu
    $sql = "SELECT 
        p.id, p.frn, p.customer, p.project_name, p.forte_responsible, 
        p.project_director, p.forte_cc_person, p.group_in, p.group_out,
        p.total_savings, p.po_amount, p.location, p.event_type, p.project_type,
        p.created_at, p.updated_at,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
        '" . ($user_role === 'admin' ? 'admin' : 'owner') . "' as user_permission,
        (SELECT COUNT(DISTINCT sr.id) FROM savings_records sr WHERE sr.project_id = p.id) as savings_records_count,
        (SELECT sr.date FROM (SELECT DISTINCT id, project_id, date FROM savings_records) sr WHERE sr.project_id = p.id ORDER BY sr.date DESC LIMIT 1) as last_savings_date,
        (SELECT COALESCE(SUM(CASE WHEN sr.type = 'Savings' THEN sr.total_price ELSE 0 END), 0) FROM savings_records sr WHERE sr.project_id = p.id) as actual_savings,
        (SELECT COALESCE(SUM(CASE WHEN sr.type = 'Cost Avoidance' THEN sr.total_price ELSE 0 END), 0) FROM savings_records sr WHERE sr.project_id = p.id) as cost_avoidance
        FROM projects p 
        LEFT JOIN users u ON p.created_by = u.id
        {$base_where}
        ORDER BY p.{$sort_by} {$sort_order}
        LIMIT :limit OFFSET :offset
    ";
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($query_params);
    } catch (Exception $main_error) {
        throw new Exception("Main query error: " . $main_error->getMessage() . " | SQL: " . substr($sql, 0, 300) . "... | Params: " . json_encode($query_params));
    }
    
    $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Tarihleri formatla ve sayıları düzelt
    foreach ($projects as &$project) {
        $project['group_in'] = date('Y-m-d', strtotime($project['group_in']));
        $project['group_out'] = date('Y-m-d', strtotime($project['group_out']));
        $project['created_at'] = date('Y-m-d H:i:s', strtotime($project['created_at']));
        $project['updated_at'] = date('Y-m-d H:i:s', strtotime($project['updated_at']));
        $project['total_savings'] = floatval($project['total_savings']);
        $project['po_amount'] = floatval($project['po_amount']);
        $project['savings_records_count'] = intval($project['savings_records_count']);
        $project['actual_savings'] = floatval($project['actual_savings']);
        $project['cost_avoidance'] = floatval($project['cost_avoidance']);
        
        if ($project['last_savings_date']) {
            $project['last_savings_date'] = date('Y-m-d', strtotime($project['last_savings_date']));
        }
        
        // Her proje için currency breakdown'ını al
        $currency_sql = "SELECT 
            currency,
            COALESCE(SUM(CASE WHEN type = 'Savings' THEN total_price ELSE 0 END), 0) as savings,
            COALESCE(SUM(CASE WHEN type = 'Cost Avoidance' THEN total_price ELSE 0 END), 0) as cost_avoidance,
            COALESCE(SUM(total_price), 0) as total
            FROM savings_records sr
            WHERE sr.project_id = ? 
            GROUP BY currency 
            HAVING total > 0 
            ORDER BY total DESC";
        
        $currency_stmt = $pdo->prepare($currency_sql);
        $currency_stmt->execute([$project['id']]);
        $currency_breakdown = $currency_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format currency breakdown
        foreach ($currency_breakdown as &$currency_data) {
            $currency_data['savings'] = floatval($currency_data['savings']);
            $currency_data['cost_avoidance'] = floatval($currency_data['cost_avoidance']);
            $currency_data['total'] = floatval($currency_data['total']);
        }
        
        $project['savings_by_currency'] = $currency_breakdown;
    }
    
    // Sayfalama bilgileri hesapla
    $total_pages = ceil($total_records / $limit);
    
    $response = [
        'success' => true,
        'data' => [
            'projects' => $projects,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => $total_pages,
                'total_records' => (int)$total_records,
                'per_page' => $limit,
                'has_next_page' => $page < $total_pages,
                'has_prev_page' => $page > 1
            ],
            'filters' => [
                'search' => $search,
                'sort_by' => $sort_by,
                'sort_order' => $sort_order
            ]
        ],
        'user' => [
            'id' => $user_id,
            'role' => $user_role
        ]
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    error_log("Projects list error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'debug' => [
            'user_role' => $user_role ?? 'unknown',
            'user_id' => $user_id ?? 'unknown',
            'search_term' => $search ?? '',
            'base_where' => $base_where ?? 'unknown',
            'params' => $params ?? [],
            'sql_preview' => isset($sql) ? substr($sql, 0, 200) . '...' : 'not set'
        ]
    ]);
}
?>