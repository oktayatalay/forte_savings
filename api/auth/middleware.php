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
    // Authorization header'ını al - çoklu yöntem desteği
    $auth_header = '';
    
    // Yöntem 1: apache_request_headers() (Apache)
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $auth_header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    
    // Yöntem 2: $_SERVER array'i (nginx, diğer sunucular)
    if (empty($auth_header)) {
        // Farklı server değişkenlerini dene
        $possible_headers = [
            'HTTP_AUTHORIZATION',
            'REDIRECT_HTTP_AUTHORIZATION', 
            'PHP_AUTH_DIGEST',
            'PHP_AUTH_USER',
            'Authorization'
        ];
        
        foreach ($possible_headers as $header_name) {
            if (isset($_SERVER[$header_name]) && !empty($_SERVER[$header_name])) {
                $auth_header = $_SERVER[$header_name];
                break;
            }
        }
    }
    
    // Yöntem 3: PHP input stream'den authorization'ı parse et
    if (empty($auth_header)) {
        if (function_exists('getallheaders')) {
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
    }
    
    // Yöntem 4: Manual header parsing
    if (empty($auth_header)) {
        // Input stream'den header'ları parse et
        if (!empty($_SERVER['CONTENT_TYPE']) || !empty($_SERVER['HTTP_AUTHORIZATION'])) {
            $input = file_get_contents('php://input');
            if ($input) {
                // POST data parse et
                $data = json_decode($input, true);
                if (isset($data['_headers']['Authorization'])) {
                    $auth_header = $data['_headers']['Authorization'];
                }
            }
        }
    }
    
    if (!$auth_header || !str_starts_with($auth_header, 'Bearer ')) {
        http_response_code(401);
        echo json_encode([
            'error' => 'Authorization token required',
            'debug' => [
                'auth_header_found' => !empty($auth_header),
                'auth_header_preview' => substr($auth_header, 0, 20) . '...',
                'server_vars' => [
                    'HTTP_AUTHORIZATION' => isset($_SERVER['HTTP_AUTHORIZATION']) ? 'exists' : 'missing',
                    'REDIRECT_HTTP_AUTHORIZATION' => isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) ? 'exists' : 'missing',
                    'PHP_AUTH_DIGEST' => isset($_SERVER['PHP_AUTH_DIGEST']) ? 'exists' : 'missing',
                    'Authorization' => isset($_SERVER['Authorization']) ? 'exists' : 'missing'
                ],
                'all_server_headers' => array_filter($_SERVER, function($key) {
                    return strpos($key, 'HTTP_') === 0 || strpos($key, 'AUTH') !== false;
                }, ARRAY_FILTER_USE_KEY),
                'apache_headers_function' => function_exists('apache_request_headers'),
                'getallheaders_function' => function_exists('getallheaders')
            ]
        ]);
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