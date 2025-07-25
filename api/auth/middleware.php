<?php
require_once '../config/database.php';

function verifyJWT($token) {
    try {
        $pdo = getDBConnection();
        
        // JWT Secret'ı al
        $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'jwt_secret'");
        $stmt->execute();
        $jwt_secret = $stmt->fetchColumn();
        
        if (empty($jwt_secret)) {
            return false;
        }
        
        // JWT'yi parçala
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }
        
        $header = $parts[0];
        $payload = $parts[1];
        $signature = $parts[2];
        
        // Signature'ı doğrula
        $expected_signature = str_replace(['+', '/', '='], ['-', '_', ''], 
            base64_encode(hash_hmac('sha256', $header . '.' . $payload, $jwt_secret, true))
        );
        
        if (!hash_equals($signature, $expected_signature)) {
            return false;
        }
        
        // Payload'ı decode et
        $payload_data = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
        
        if (!$payload_data) {
            return false;
        }
        
        // Expiration kontrolü
        if (isset($payload_data['exp']) && $payload_data['exp'] < time()) {
            return false;
        }
        
        // Kullanıcı var mı ve aktif mi kontrol et
        $user_stmt = $pdo->prepare("
            SELECT id, email, role, is_active 
            FROM users 
            WHERE id = ? AND is_active = TRUE
        ");
        $user_stmt->execute([$payload_data['user_id']]);
        $user = $user_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            return false;
        }
        
        return [
            'user_id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'payload' => $payload_data
        ];
        
    } catch (Exception $e) {
        error_log("JWT verification error: " . $e->getMessage());
        return false;
    }
}

function requireAuth($required_roles = null) {
    $headers = apache_request_headers();
    $auth_header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (!$auth_header || !str_starts_with($auth_header, 'Bearer ')) {
        http_response_code(401);
        echo json_encode(['error' => 'Authorization token required']);
        exit;
    }
    
    $token = substr($auth_header, 7);
    $auth_data = verifyJWT($token);
    
    if (!$auth_data) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid or expired token']);
        exit;
    }
    
    // Rol kontrolü
    if ($required_roles && !in_array($auth_data['role'], $required_roles)) {
        http_response_code(403);
        echo json_encode(['error' => 'Insufficient permissions']);
        exit;
    }
    
    return $auth_data;
}

function requireAdmin() {
    return requireAuth(['admin']);
}

function requireUserOrAbove() {
    return requireAuth(['user', 'cc', 'admin']);
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