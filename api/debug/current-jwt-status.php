<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    
    $result = [];
    
    // 1. Check if system_settings table exists
    try {
        $table_check = $pdo->prepare("SHOW TABLES LIKE 'system_settings'");
        $table_check->execute();
        $result['system_settings_table_exists'] = $table_check->rowCount() > 0;
    } catch (Exception $e) {
        $result['system_settings_table_exists'] = false;
        $result['table_error'] = $e->getMessage();
    }
    
    // 2. Check JWT secret in database
    $result['jwt_secret_in_db'] = false;
    $result['jwt_secret_preview'] = null;
    
    try {
        if ($result['system_settings_table_exists']) {
            $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'jwt_secret'");
            $stmt->execute();
            $jwt_secret = $stmt->fetchColumn();
            
            if (!empty($jwt_secret)) {
                $result['jwt_secret_in_db'] = true;
                $result['jwt_secret_preview'] = substr($jwt_secret, 0, 20) . '...';
            }
        }
    } catch (Exception $e) {
        $result['jwt_secret_error'] = $e->getMessage();
    }
    
    // 3. Calculate what fallback secret would be
    $fallback_secret = 'default_jwt_secret_change_in_production_' . hash('sha256', 'forte_savings_2024');
    $result['fallback_secret_preview'] = substr($fallback_secret, 0, 20) . '...';
    
    // 4. Check if they match
    if ($result['jwt_secret_in_db']) {
        $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'jwt_secret'");
        $stmt->execute();
        $db_secret = $stmt->fetchColumn();
        $result['secrets_match'] = $db_secret === $fallback_secret;
    } else {
        $result['secrets_match'] = false;
    }
    
    // 5. Recommendations
    $result['recommendations'] = [];
    
    if (!$result['system_settings_table_exists']) {
        $result['recommendations'][] = "Create system_settings table";
    }
    
    if (!$result['jwt_secret_in_db']) {
        $result['recommendations'][] = "Insert JWT secret into database";
    }
    
    if ($result['jwt_secret_in_db'] && !$result['secrets_match']) {
        $result['recommendations'][] = "Update JWT secret in database to match fallback";
    }
    
    echo json_encode($result, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>