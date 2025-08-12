<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../auth/middleware.php';

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Only GET method allowed']);
        exit;
    }
    
    $auth_data = requireUserOrAbove();
    $user_id = $auth_data['user_id'];
    $user_role = $auth_data['role'];
    
    $period = $_GET['period'] ?? '12months';
    $pdo = getDBConnection();
    
    // Kullanıcının erişebileceği projeleri belirle
    $project_access_condition = "";
    $project_access_params = [];
    
    if ($user_role !== 'admin') {
        $project_access_condition = " AND (p.created_by = ? OR pp.user_id = ?)";
        $project_access_params = [$user_id, $user_id];
    }
    
    // Period'a göre date range belirle
    $date_condition = "";
    switch ($period) {
        case '7days':
            $date_condition = "AND sr.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
            break;
        case '30days':
            $date_condition = "AND sr.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
            break;
        case '3months':
            $date_condition = "AND sr.created_at >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)";
            break;
        case '6months':
            $date_condition = "AND sr.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)";
            break;
        case '12months':
        default:
            $date_condition = "AND sr.created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)";
            break;
    }
    
    // Aylık trend verisi al - Tasarruf ve Maliyet Engelleme ayrı ayrı, currency bazında
    $trend_sql = "
        SELECT 
            DATE_FORMAT(sr.created_at, '%Y-%m') as month_year,
            sr.type,
            sr.currency,
            SUM(sr.total_price) as total_amount,
            COUNT(sr.id) as record_count
        FROM savings_records sr
        LEFT JOIN projects p ON p.id = sr.project_id
        LEFT JOIN project_permissions pp ON pp.project_id = p.id
        WHERE p.is_active = TRUE 
        {$date_condition}
        {$project_access_condition}
        GROUP BY DATE_FORMAT(sr.created_at, '%Y-%m'), sr.type, sr.currency
        ORDER BY month_year ASC, sr.type, sr.currency
    ";
    
    $stmt = $pdo->prepare($trend_sql);
    $stmt->execute($project_access_params);
    $trend_results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Data'yı organize et
    $organized_data = [];
    $all_months = [];
    $currencies = [];
    
    foreach ($trend_results as $row) {
        $month = $row['month_year'];
        $type = $row['type'];
        $currency = $row['currency'];
        $amount = floatval($row['total_amount']);
        
        if (!in_array($month, $all_months)) {
            $all_months[] = $month;
        }
        if (!in_array($currency, $currencies)) {
            $currencies[] = $currency;
        }
        
        if (!isset($organized_data[$type])) {
            $organized_data[$type] = [];
        }
        if (!isset($organized_data[$type][$currency])) {
            $organized_data[$type][$currency] = [];
        }
        
        $organized_data[$type][$currency][$month] = $amount;
    }
    
    // Son 12 ay için eksik ayları 0 ile doldur
    sort($all_months);
    $complete_months = [];
    
    if (empty($all_months)) {
        // Eğer hiç veri yoksa son 12 ayı oluştur
        for ($i = 11; $i >= 0; $i--) {
            $complete_months[] = date('Y-m', strtotime("-{$i} months"));
        }
    } else {
        // Mevcut veriye göre ay range'i tamamla
        $start_month = min($all_months);
        $end_month = max($all_months);
        
        $current = new DateTime($start_month . '-01');
        $end = new DateTime($end_month . '-01');
        
        while ($current <= $end) {
            $complete_months[] = $current->format('Y-m');
            $current->modify('+1 month');
        }
    }
    
    // Chart data formatını oluştur
    $chart_data = [
        'labels' => array_map(function($month) {
            return date('M Y', strtotime($month . '-01'));
        }, $complete_months),
        'datasets' => []
    ];
    
    // Color palettes
    $savings_colors = [
        'TRY' => 'rgb(34, 197, 94)',   // Green
        'USD' => 'rgb(59, 130, 246)',  // Blue  
        'EUR' => 'rgb(168, 85, 247)',  // Purple
        'GBP' => 'rgb(251, 146, 60)'   // Orange
    ];
    
    $cost_avoidance_colors = [
        'TRY' => 'rgb(239, 68, 68)',   // Red
        'USD' => 'rgb(14, 165, 233)',  // Sky Blue
        'EUR' => 'rgb(139, 92, 246)',  // Violet
        'GBP' => 'rgb(245, 101, 101)'  // Rose
    ];
    
    // Dataset'leri oluştur
    sort($currencies);
    
    foreach (['Savings', 'Cost Avoidance'] as $type) {
        if (!isset($organized_data[$type])) continue;
        
        foreach ($currencies as $currency) {
            if (!isset($organized_data[$type][$currency])) continue;
            
            $data_points = [];
            foreach ($complete_months as $month) {
                $data_points[] = $organized_data[$type][$currency][$month] ?? 0;
            }
            
            $color_palette = $type === 'Savings' ? $savings_colors : $cost_avoidance_colors;
            $color = $color_palette[$currency] ?? 'rgb(107, 114, 128)';
            
            $dataset = [
                'label' => $type === 'Savings' ? "Tasarruf ({$currency})" : "Maliyet Eng. ({$currency})",
                'data' => $data_points,
                'borderColor' => $color,
                'backgroundColor' => str_replace('rgb', 'rgba', str_replace(')', ', 0.1)', $color)),
                'fill' => false,
                'tension' => 0.3,
                'borderWidth' => 2
            ];
            
            $chart_data['datasets'][] = $dataset;
        }
    }
    
    // Summary bilgileri
    $summary = [
        'total_months' => count($complete_months),
        'currencies_found' => $currencies,
        'types' => array_keys($organized_data),
        'period_label' => $period === '12months' ? 'Son 12 Ay' : 
                         ($period === '6months' ? 'Son 6 Ay' :
                         ($period === '3months' ? 'Son 3 Ay' :
                         ($period === '30days' ? 'Son 30 Gün' : 'Son 7 Gün')))
    ];
    
    echo json_encode([
        'success' => true,
        'data' => [
            'chart_data' => $chart_data,
            'summary' => $summary,
            'period' => $period
        ]
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    error_log("Trend data error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}
?>