<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../auth/middleware.php';

// Test endpoint for export functionality
// Bu endpoint export API'larının düzgün çalışıp çalışmadığını test eder

header('Content-Type: application/json');

try {
    // Authentication
    $auth_data = requireUserOrAbove();
    $user_id = $auth_data['user_id'];
    $user_role = $auth_data['role'];
    
    $pdo = getDBConnection();
    
    // Test data availability
    $sql = "SELECT 
        COUNT(sr.id) as total_records,
        COUNT(DISTINCT sr.currency) as currencies,
        COUNT(DISTINCT p.id) as projects,
        MIN(sr.created_at) as oldest_record,
        MAX(sr.created_at) as newest_record
        FROM savings_records sr
        JOIN projects p ON sr.project_id = p.id
        WHERE p.is_active = TRUE";
    
    $params = [];
    
    // User permission filtering
    if ($user_role !== 'admin') {
        $sql .= " AND (p.created_by = ? OR EXISTS(
            SELECT 1 FROM project_permissions pp 
            WHERE pp.project_id = p.id 
            AND pp.user_id = ? 
            AND pp.permission_type IN ('owner', 'cc')
        ))";
        $params[] = $user_id;
        $params[] = $user_id;
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Test API endpoint accessibility
    $endpoints = [
        'excel' => '/api/reports/export-excel.php',
        'pdf' => '/api/reports/export-pdf.php', 
        'csv' => '/api/reports/export-csv.php'
    ];
    
    $endpoint_status = [];
    foreach ($endpoints as $type => $endpoint) {
        $endpoint_status[$type] = [
            'path' => $endpoint,
            'file_exists' => file_exists(__DIR__ . '/' . basename($endpoint)),
            'readable' => file_exists(__DIR__ . '/' . basename($endpoint)) && is_readable(__DIR__ . '/' . basename($endpoint))
        ];
    }
    
    // System requirements check
    $requirements = [
        'php_version' => PHP_VERSION,
        'php_version_ok' => version_compare(PHP_VERSION, '7.4', '>='),
        'pdo_available' => extension_loaded('pdo'),
        'pdo_mysql_available' => extension_loaded('pdo_mysql'),
        'json_available' => extension_loaded('json'),
        'mbstring_available' => extension_loaded('mbstring'),
        'output_buffering' => ini_get('output_buffering'),
        'memory_limit' => ini_get('memory_limit'),
        'max_execution_time' => ini_get('max_execution_time')
    ];
    
    echo json_encode([
        'success' => true,
        'message' => 'Export system test completed',
        'data' => [
            'user_info' => [
                'user_id' => $user_id,
                'role' => $user_role,
                'email' => $auth_data['email']
            ],
            'data_stats' => [
                'total_records' => intval($stats['total_records']),
                'currencies' => intval($stats['currencies']),
                'projects' => intval($stats['projects']),
                'oldest_record' => $stats['oldest_record'],
                'newest_record' => $stats['newest_record'],
                'exportable' => intval($stats['total_records']) > 0
            ],
            'endpoints' => $endpoint_status,
            'system_requirements' => $requirements,
            'recommendations' => [
                'can_export' => intval($stats['total_records']) > 0 && $requirements['php_version_ok'],
                'excel_ready' => $endpoint_status['excel']['file_exists'] && $endpoint_status['excel']['readable'],
                'pdf_ready' => $endpoint_status['pdf']['file_exists'] && $endpoint_status['pdf']['readable'],
                'csv_ready' => $endpoint_status['csv']['file_exists'] && $endpoint_status['csv']['readable']
            ]
        ],
        'generated_at' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    error_log("Export test error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'TEST_ERROR',
        'message' => 'Export system test sırasında hata oluştu.',
        'details' => $e->getMessage()
    ]);
}
?>