<?php
/**
 * Centralized JWT Manager
 * Single source of truth for all JWT operations
 */
class JWTManager {
    private static $instance = null;
    private static $jwtSecret = null;
    private static $pdo = null;
    
    private function __construct() {}
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Get JWT secret with caching
     */
    private static function getJWTSecret() {
        if (self::$jwtSecret !== null) {
            return self::$jwtSecret;
        }
        
        try {
            require_once __DIR__ . '/../config/database.php';
            
            if (self::$pdo === null) {
                self::$pdo = getDBConnection();
            }
            
            $stmt = self::$pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'jwt_secret' LIMIT 1");
            $stmt->execute();
            $secret = $stmt->fetchColumn();
            
            // If no secret in database, create a stable one
            if (empty($secret)) {
                $secret = 'forte_jwt_' . hash('sha256', 'forte_savings_stable_2024');
                
                // Save it to database for consistency
                $insert_stmt = self::$pdo->prepare("
                    INSERT INTO system_settings (setting_key, setting_value, created_at, updated_at) 
                    VALUES ('jwt_secret', ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
                ");
                $insert_stmt->execute([$secret]);
                
                error_log("JWT secret generated and saved to database");
            }
            
            self::$jwtSecret = $secret;
            return $secret;
            
        } catch (Exception $e) {
            error_log("JWT secret retrieval failed: " . $e->getMessage());
            
            // Emergency fallback - same as before but more stable
            $fallback = 'forte_jwt_emergency_' . hash('sha256', 'forte_savings_stable_2024');
            self::$jwtSecret = $fallback;
            return $fallback;
        }
    }
    
    /**
     * Generate JWT token
     */
    public static function generateToken($user_data, $expire_hours = 720) { // 30 days default
        try {
            $secret = self::getJWTSecret();
            
            $payload = [
                'user_id' => (int)$user_data['id'],
                'email' => $user_data['email'],
                'role' => $user_data['role'],
                'exp' => time() + ($expire_hours * 3600),
                'iat' => time()
            ];
            
            $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
            $payload_json = json_encode($payload);
            
            $header_b64 = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
            $payload_b64 = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload_json));
            
            $signature = str_replace(['+', '/', '='], ['-', '_', ''], 
                base64_encode(hash_hmac('sha256', $header_b64 . '.' . $payload_b64, $secret, true))
            );
            
            return $header_b64 . '.' . $payload_b64 . '.' . $signature;
            
        } catch (Exception $e) {
            error_log("JWT token generation failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Verify JWT token
     */
    public static function verifyToken($token) {
        try {
            if (empty($token)) {
                return false;
            }
            
            $secret = self::getJWTSecret();
            
            // Parse token
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return false;
            }
            
            [$header, $payload, $signature] = $parts;
            
            // Verify signature
            $expected_signature = str_replace(['+', '/', '='], ['-', '_', ''], 
                base64_encode(hash_hmac('sha256', $header . '.' . $payload, $secret, true))
            );
            
            if (!hash_equals($signature, $expected_signature)) {
                error_log("JWT signature verification failed");
                return false;
            }
            
            // Decode payload
            $payload_data = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
            
            if (!$payload_data) {
                error_log("JWT payload decode failed");
                return false;
            }
            
            // Check expiration
            if (isset($payload_data['exp']) && $payload_data['exp'] < time()) {
                error_log("JWT token expired");
                return false;
            }
            
            // Verify user still exists and active
            if (self::$pdo === null) {
                require_once __DIR__ . '/../config/database.php';
                self::$pdo = getDBConnection();
            }
            
            $user_stmt = self::$pdo->prepare("
                SELECT id, email, role, is_active 
                FROM users 
                WHERE id = ? AND is_active = TRUE
            ");
            $user_stmt->execute([$payload_data['user_id']]);
            $user = $user_stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                error_log("JWT user not found or inactive: " . $payload_data['user_id']);
                return false;
            }
            
            return [
                'user_id' => $user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'payload' => $payload_data
            ];
            
        } catch (Exception $e) {
            error_log("JWT token verification failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Initialize JWT secret (used by init script)
     */
    public static function initializeJWTSecret($force = false) {
        try {
            require_once __DIR__ . '/../config/database.php';
            
            if (self::$pdo === null) {
                self::$pdo = getDBConnection();
            }
            
            // Check if secret already exists
            if (!$force) {
                $stmt = self::$pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'jwt_secret'");
                $stmt->execute();
                $existing = $stmt->fetchColumn();
                
                if ($existing) {
                    return $existing;
                }
            }
            
            // Generate new secret
            $secret = 'forte_jwt_' . hash('sha256', 'forte_savings_' . time() . '_' . random_bytes(16));
            
            // Save to database
            $stmt = self::$pdo->prepare("
                INSERT INTO system_settings (setting_key, setting_value, created_at, updated_at) 
                VALUES ('jwt_secret', ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
            ");
            $stmt->execute([$secret]);
            
            // Clear cached secret to force reload
            self::$jwtSecret = null;
            
            return $secret;
            
        } catch (Exception $e) {
            error_log("JWT secret initialization failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Test JWT operations
     */
    public static function test() {
        try {
            // Test secret retrieval
            $secret = self::getJWTSecret();
            
            // Test token generation
            $test_user = ['id' => 999, 'email' => 'test@test.com', 'role' => 'user'];
            $token = self::generateToken($test_user, 1); // 1 hour
            
            if (!$token) {
                return ['success' => false, 'error' => 'Token generation failed'];
            }
            
            return [
                'success' => true,
                'secret_length' => strlen($secret),
                'secret_preview' => substr($secret, 0, 20) . '...',
                'token_generated' => true,
                'token_preview' => substr($token, 0, 50) . '...'
            ];
            
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
?>