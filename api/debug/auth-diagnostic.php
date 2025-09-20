<?php
/**
 * Authentication Diagnostic Script
 * Purpose: Diagnose 401 INVALID_TOKEN errors in the backend
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../config/database.php';
require_once '../auth/JWTManager.php';
require_once '../auth/middleware.php';

header('Content-Type: application/json; charset=UTF-8');

try {
    $diagnostics = [];

    // 1. Database Connection Test
    $diagnostics['database'] = testDatabaseConnection();

    // 2. JWT Secret Test
    $diagnostics['jwt_secret'] = testJWTSecret();

    // 3. JWT Operations Test
    $diagnostics['jwt_operations'] = testJWTOperations();

    // 4. Authorization Header Test
    $diagnostics['auth_headers'] = testAuthorizationHeaders();

    // 5. System Settings Table Test
    $diagnostics['system_settings'] = testSystemSettings();

    // 6. User Table Test
    $diagnostics['users_table'] = testUsersTable();

    // 7. Token Verification Flow Test
    $diagnostics['token_verification'] = testTokenVerificationFlow();

    echo json_encode([
        'success' => true,
        'diagnostics' => $diagnostics,
        'timestamp' => date('Y-m-d H:i:s'),
        'summary' => generateSummary($diagnostics)
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}

function testDatabaseConnection() {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->query("SELECT CONNECTION_ID(), VERSION()");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'status' => 'success',
            'connection_id' => $result['CONNECTION_ID()'],
            'mysql_version' => $result['VERSION()'],
            'message' => 'Database connection successful'
        ];
    } catch (Exception $e) {
        return [
            'status' => 'error',
            'error' => $e->getMessage(),
            'message' => 'Database connection failed'
        ];
    }
}

function testJWTSecret() {
    try {
        // Use reflection to access private method
        $reflection = new ReflectionClass('JWTManager');
        $method = $reflection->getMethod('getJWTSecret');
        $method->setAccessible(true);

        $secret = $method->invoke(null);

        return [
            'status' => 'success',
            'secret_exists' => !empty($secret),
            'secret_length' => strlen($secret),
            'secret_preview' => substr($secret, 0, 20) . '...',
            'message' => 'JWT secret retrieved successfully'
        ];
    } catch (Exception $e) {
        return [
            'status' => 'error',
            'error' => $e->getMessage(),
            'message' => 'JWT secret retrieval failed'
        ];
    }
}

function testJWTOperations() {
    try {
        // Test token generation
        $test_user = [
            'id' => 999,
            'email' => 'test@diagnostic.com',
            'role' => 'user'
        ];

        $token = JWTManager::generateToken($test_user, 1); // 1 hour

        if (!$token) {
            return [
                'status' => 'error',
                'message' => 'Token generation failed'
            ];
        }

        // Test token verification (this will fail because user doesn't exist)
        $verification = JWTManager::verifyToken($token);

        return [
            'status' => 'success',
            'token_generated' => true,
            'token_preview' => substr($token, 0, 50) . '...',
            'token_parts' => count(explode('.', $token)),
            'verification_without_user' => $verification ? 'passed' : 'failed (expected)',
            'message' => 'JWT operations functional'
        ];
    } catch (Exception $e) {
        return [
            'status' => 'error',
            'error' => $e->getMessage(),
            'message' => 'JWT operations failed'
        ];
    }
}

function testAuthorizationHeaders() {
    $headers = [];

    // Check various header detection methods
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers['HTTP_AUTHORIZATION'] = $_SERVER['HTTP_AUTHORIZATION'];
    }

    if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $headers['REDIRECT_HTTP_AUTHORIZATION'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }

    if (function_exists('apache_request_headers')) {
        $apache_headers = apache_request_headers();
        $headers['apache_headers'] = $apache_headers;
    }

    if (function_exists('getallheaders')) {
        $all_headers = getallheaders();
        $headers['all_headers'] = $all_headers;
    }

    return [
        'status' => 'info',
        'detected_headers' => $headers,
        'server_vars' => array_filter($_SERVER, function($key) {
            return strpos(strtolower($key), 'auth') !== false ||
                   strpos(strtolower($key), 'bearer') !== false;
        }, ARRAY_FILTER_USE_KEY),
        'message' => 'Authorization header detection results'
    ];
}

function testSystemSettings() {
    try {
        $pdo = getDBConnection();

        // Check if system_settings table exists
        $stmt = $pdo->query("SHOW TABLES LIKE 'system_settings'");
        $table_exists = $stmt->rowCount() > 0;

        if (!$table_exists) {
            return [
                'status' => 'error',
                'table_exists' => false,
                'message' => 'system_settings table does not exist'
            ];
        }

        // Check table structure
        $stmt = $pdo->query("DESCRIBE system_settings");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Check for JWT secret
        $stmt = $pdo->prepare("SELECT setting_key, setting_value FROM system_settings WHERE setting_key = 'jwt_secret'");
        $stmt->execute();
        $jwt_setting = $stmt->fetch(PDO::FETCH_ASSOC);

        // Get all settings
        $stmt = $pdo->query("SELECT setting_key, created_at, updated_at FROM system_settings");
        $all_settings = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'status' => 'success',
            'table_exists' => true,
            'columns' => array_column($columns, 'Field'),
            'jwt_secret_exists' => !empty($jwt_setting),
            'jwt_secret_preview' => $jwt_setting ? substr($jwt_setting['setting_value'], 0, 20) . '...' : null,
            'total_settings' => count($all_settings),
            'all_settings' => $all_settings,
            'message' => 'system_settings table analysis complete'
        ];
    } catch (Exception $e) {
        return [
            'status' => 'error',
            'error' => $e->getMessage(),
            'message' => 'system_settings table test failed'
        ];
    }
}

function testUsersTable() {
    try {
        $pdo = getDBConnection();

        // Check users table structure
        $stmt = $pdo->query("DESCRIBE users");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Check for active users
        $stmt = $pdo->query("SELECT COUNT(*) as total,
                                    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active,
                                    COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified
                             FROM users");
        $user_stats = $stmt->fetch(PDO::FETCH_ASSOC);

        // Get sample user (first one)
        $stmt = $pdo->query("SELECT id, email, role, is_active, email_verified, created_at FROM users LIMIT 1");
        $sample_user = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'status' => 'success',
            'columns' => array_column($columns, 'Field'),
            'user_stats' => $user_stats,
            'sample_user' => $sample_user,
            'message' => 'Users table analysis complete'
        ];
    } catch (Exception $e) {
        return [
            'status' => 'error',
            'error' => $e->getMessage(),
            'message' => 'Users table test failed'
        ];
    }
}

function testTokenVerificationFlow() {
    try {
        $pdo = getDBConnection();

        // Get a real user for testing
        $stmt = $pdo->query("SELECT id, email, role FROM users WHERE is_active = TRUE AND email_verified = TRUE LIMIT 1");
        $real_user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$real_user) {
            return [
                'status' => 'warning',
                'message' => 'No active, verified users found for testing'
            ];
        }

        // Generate token for real user
        $token = JWTManager::generateToken($real_user, 1);

        if (!$token) {
            return [
                'status' => 'error',
                'message' => 'Token generation failed for real user'
            ];
        }

        // Verify token
        $verification = JWTManager::verifyToken($token);

        return [
            'status' => 'success',
            'test_user' => [
                'id' => $real_user['id'],
                'email' => $real_user['email'],
                'role' => $real_user['role']
            ],
            'token_generated' => true,
            'token_preview' => substr($token, 0, 50) . '...',
            'verification_success' => $verification !== false,
            'verification_data' => $verification,
            'message' => 'Token verification flow test complete'
        ];
    } catch (Exception $e) {
        return [
            'status' => 'error',
            'error' => $e->getMessage(),
            'message' => 'Token verification flow test failed'
        ];
    }
}

function generateSummary($diagnostics) {
    $issues = [];
    $successes = [];

    foreach ($diagnostics as $test => $result) {
        if ($result['status'] === 'error') {
            $issues[] = "$test: " . $result['message'];
        } elseif ($result['status'] === 'success') {
            $successes[] = "$test: " . $result['message'];
        }
    }

    return [
        'total_tests' => count($diagnostics),
        'issues_found' => count($issues),
        'successes' => count($successes),
        'issues' => $issues,
        'critical_systems' => [
            'database' => $diagnostics['database']['status'],
            'jwt_secret' => $diagnostics['jwt_secret']['status'],
            'jwt_operations' => $diagnostics['jwt_operations']['status'],
            'system_settings' => $diagnostics['system_settings']['status']
        ]
    ];
}
?>