<?php
require_once '../config/database.php';
require_once 'JWTManager.php';

function verifyJWT($token) {
    try {
        // Use centralized JWT verification - it already handles user validation
        return JWTManager::verifyToken($token);
        
    } catch (Exception $e) {
        error_log("JWT verification error: " . $e->getMessage());
        return false;
    }
}

function requireAuth($required_roles = null) {
    // Authorization header'ını al - improved header detection
    $auth_header = '';
    
    // Method 1: Standard HTTP_AUTHORIZATION (most reliable)
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
    }
    
    // Method 2: REDIRECT_HTTP_AUTHORIZATION (mod_rewrite)
    elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $auth_header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    
    // Method 3: apache_request_headers() (Apache)
    elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $auth_header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    
    // Method 4: getallheaders() (case-insensitive)
    elseif (function_exists('getallheaders')) {
        $headers = getallheaders();
        if ($headers) {
            foreach ($headers as $key => $value) {
                if (strtolower($key) === 'authorization') {
                    $auth_header = $value;
                    break;
                }
            }
        }
    }
    
    // Method 5: Manual parsing for edge cases
    else {
        // Check other possible server variables
        $possible_headers = [
            'PHP_AUTH_DIGEST',
            'PHP_AUTH_USER'
        ];
        
        foreach ($possible_headers as $header_name) {
            if (isset($_SERVER[$header_name]) && !empty($_SERVER[$header_name])) {
                $auth_header = $_SERVER[$header_name];
                break;
            }
        }
    }
    
    if (!$auth_header || !str_starts_with($auth_header, 'Bearer ')) {
        http_response_code(401);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode([
            'success' => false,
            'error' => 'AUTH_TOKEN_REQUIRED',
            'message' => 'Authorization token required'
        ]);
        exit;
    }
    
    $token = substr($auth_header, 7);
    $auth_data = verifyJWT($token);
    
    if (!$auth_data) {
        http_response_code(401);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode([
            'success' => false,
            'error' => 'INVALID_TOKEN',
            'message' => 'Invalid or expired token'
        ]);
        exit;
    }
    
    // Rol kontrolü
    if ($required_roles && !in_array($auth_data['role'], $required_roles)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode([
            'success' => false,
            'error' => 'INSUFFICIENT_PERMISSIONS',
            'message' => 'Insufficient permissions'
        ]);
        exit;
    }
    
    return $auth_data;
}

function requireAdmin() {
    return requireAuth(['admin']);
}

function requireUserOrAbove() {
    return requireAuth(['user', 'admin']);
}

function requireProjectAccess($project_id, $auth_data) {
    try {
        $pdo = getDBConnection();
        
        // Admin her projeye erişebilir
        if ($auth_data['role'] === 'admin') {
            return true;
        }
        
        // Proje sahibi veya CC kişisi mi kontrol et
        $stmt = $pdo->prepare("
            SELECT 1 FROM projects p
            LEFT JOIN project_permissions pp ON p.id = pp.project_id
            WHERE p.id = ? AND (
                p.created_by = ? OR 
                (pp.user_id = ? AND pp.permission_type IN ('owner', 'cc'))
            )
        ");
        $stmt->execute([$project_id, $auth_data['user_id'], $auth_data['user_id']]);
        
        return $stmt->rowCount() > 0;
        
    } catch (Exception $e) {
        error_log("Project access check error: " . $e->getMessage());
        return false;
    }
}
?>