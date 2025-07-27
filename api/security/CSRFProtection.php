<?php

/**
 * CSRF Protection Implementation
 * Provides Cross-Site Request Forgery protection for state-changing operations
 */
class CSRFProtection {
    
    private static $tokenName = 'csrf_token';
    private static $headerName = 'X-CSRF-Token';
    private static $sessionKey = 'forte_csrf_tokens';
    private static $tokenLifetime = 3600; // 1 hour
    
    /**
     * Initialize CSRF protection
     */
    public static function init() {
        if (session_status() === PHP_SESSION_NONE) {
            // Secure session configuration
            ini_set('session.cookie_httponly', 1);
            ini_set('session.cookie_secure', self::isHTTPS() ? 1 : 0);
            ini_set('session.cookie_samesite', 'Strict');
            ini_set('session.use_strict_mode', 1);
            
            session_start();
        }
        
        // Initialize token storage
        if (!isset($_SESSION[self::$sessionKey])) {
            $_SESSION[self::$sessionKey] = [];
        }
        
        // Clean expired tokens
        self::cleanExpiredTokens();
    }
    
    /**
     * Generate a new CSRF token
     */
    public static function generateToken() {
        self::init();
        
        $token = bin2hex(random_bytes(32));
        $tokenData = [
            'value' => $token,
            'created_at' => time(),
            'expires_at' => time() + self::$tokenLifetime
        ];
        
        // Store token with timestamp
        $_SESSION[self::$sessionKey][$token] = $tokenData;
        
        return $token;
    }
    
    /**
     * Validate CSRF token
     */
    public static function validateToken($token = null, $remove = true) {
        self::init();
        
        // Get token from various sources
        if (!$token) {
            $token = self::getTokenFromRequest();
        }
        
        if (!$token) {
            self::logCSRFViolation('No CSRF token provided');
            return false;
        }
        
        // Check if token exists and is valid
        if (!isset($_SESSION[self::$sessionKey][$token])) {
            self::logCSRFViolation('Invalid CSRF token');
            return false;
        }
        
        $tokenData = $_SESSION[self::$sessionKey][$token];
        
        // Check if token is expired
        if (time() > $tokenData['expires_at']) {
            unset($_SESSION[self::$sessionKey][$token]);
            self::logCSRFViolation('Expired CSRF token');
            return false;
        }
        
        // Remove token after use (single-use tokens)
        if ($remove) {
            unset($_SESSION[self::$sessionKey][$token]);
        }
        
        return true;
    }
    
    /**
     * Require valid CSRF token for request
     */
    public static function requireToken() {
        if (!self::validateToken()) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode([
                'error' => 'CSRF token validation failed',
                'message' => 'Invalid or missing CSRF token',
                'code' => 'CSRF_TOKEN_REQUIRED'
            ]);
            exit;
        }
        
        return true;
    }
    
    /**
     * Get CSRF token from request
     */
    private static function getTokenFromRequest() {
        // Check header first
        $headers = getallheaders();
        if ($headers && isset($headers[self::$headerName])) {
            return $headers[self::$headerName];
        }
        
        // Check $_SERVER for headers (nginx compatibility)
        $headerKey = 'HTTP_' . str_replace('-', '_', strtoupper(self::$headerName));
        if (isset($_SERVER[$headerKey])) {
            return $_SERVER[$headerKey];
        }
        
        // Check POST data
        if (isset($_POST[self::$tokenName])) {
            return $_POST[self::$tokenName];
        }
        
        // Check JSON input
        $input = json_decode(file_get_contents('php://input'), true);
        if ($input && isset($input[self::$tokenName])) {
            return $input[self::$tokenName];
        }
        
        return null;
    }
    
    /**
     * Check if request needs CSRF protection
     */
    public static function needsProtection() {
        $method = $_SERVER['REQUEST_METHOD'];
        $protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
        
        return in_array($method, $protectedMethods);
    }
    
    /**
     * Apply CSRF protection middleware
     */
    public static function middleware() {
        // Skip for GET, HEAD, OPTIONS requests
        if (!self::needsProtection()) {
            return;
        }
        
        // Skip for API key authentication (if present)
        if (self::hasValidApiKey()) {
            return;
        }
        
        // Require CSRF token
        self::requireToken();
    }
    
    /**
     * Generate token for API response
     */
    public static function getTokenForResponse() {
        $token = self::generateToken();
        
        return [
            'csrf_token' => $token,
            'csrf_header' => self::$headerName,
            'expires_in' => self::$tokenLifetime
        ];
    }
    
    /**
     * Validate double-submit cookie pattern
     */
    public static function validateDoubleSubmitCookie() {
        $cookieToken = $_COOKIE['csrf_token'] ?? null;
        $headerToken = self::getTokenFromRequest();
        
        if (!$cookieToken || !$headerToken) {
            return false;
        }
        
        return hash_equals($cookieToken, $headerToken);
    }
    
    /**
     * Set CSRF cookie
     */
    public static function setCookie($token) {
        $secure = self::isHTTPS();
        $expires = time() + self::$tokenLifetime;
        
        setcookie(
            'csrf_token',
            $token,
            [
                'expires' => $expires,
                'path' => '/',
                'domain' => '',
                'secure' => $secure,
                'httponly' => true,
                'samesite' => 'Strict'
            ]
        );
    }
    
    /**
     * Clean expired tokens from session
     */
    private static function cleanExpiredTokens() {
        if (!isset($_SESSION[self::$sessionKey])) {
            return;
        }
        
        $now = time();
        foreach ($_SESSION[self::$sessionKey] as $token => $data) {
            if ($now > $data['expires_at']) {
                unset($_SESSION[self::$sessionKey][$token]);
            }
        }
    }
    
    /**
     * Check for valid API key (exempts from CSRF)
     */
    private static function hasValidApiKey() {
        $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? null;
        
        if (!$apiKey) {
            return false;
        }
        
        // Validate API key (implement your API key validation logic)
        // This is a placeholder - implement actual validation
        return false;
    }
    
    /**
     * Check if connection is HTTPS
     */
    private static function isHTTPS() {
        return (
            (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
            $_SERVER['SERVER_PORT'] == 443 ||
            (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
        );
    }
    
    /**
     * Log CSRF violations
     */
    private static function logCSRFViolation($reason) {
        $logData = [
            'event' => 'csrf_violation',
            'reason' => $reason,
            'timestamp' => date('Y-m-d H:i:s'),
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
            'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
            'referer' => $_SERVER['HTTP_REFERER'] ?? 'unknown'
        ];
        
        error_log('[CSRF_VIOLATION] ' . json_encode($logData));
    }
    
    /**
     * Get CSRF statistics for monitoring
     */
    public static function getStats() {
        self::init();
        
        $stats = [
            'active_tokens' => count($_SESSION[self::$sessionKey]),
            'session_id' => session_id(),
            'token_lifetime' => self::$tokenLifetime
        ];
        
        return $stats;
    }
    
    /**
     * Regenerate session ID (call after login)
     */
    public static function regenerateSession() {
        if (session_status() === PHP_SESSION_ACTIVE) {
            // Clear old tokens
            $_SESSION[self::$sessionKey] = [];
            
            // Regenerate session ID
            session_regenerate_id(true);
        }
    }
    
    /**
     * Generate form HTML with CSRF token
     */
    public static function getFormField() {
        $token = self::generateToken();
        return sprintf(
            '<input type="hidden" name="%s" value="%s">',
            htmlspecialchars(self::$tokenName),
            htmlspecialchars($token)
        );
    }
    
    /**
     * Generate meta tag for AJAX requests
     */
    public static function getMetaTag() {
        $token = self::generateToken();
        return sprintf(
            '<meta name="csrf-token" content="%s">',
            htmlspecialchars($token)
        );
    }
    
    /**
     * Validate origin header
     */
    public static function validateOrigin($allowedOrigins = []) {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        if (empty($allowedOrigins)) {
            $allowedOrigins = [
                'https://savings.forte.works',
                'https://forte.works'
            ];
            
            // Add localhost for development
            if ($_ENV['APP_ENV'] === 'development') {
                $allowedOrigins[] = 'http://localhost:3000';
                $allowedOrigins[] = 'http://localhost:8000';
            }
        }
        
        if ($origin && !in_array($origin, $allowedOrigins)) {
            self::logCSRFViolation('Invalid origin: ' . $origin);
            return false;
        }
        
        return true;
    }
    
    /**
     * Enhanced CSRF protection with SameSite validation
     */
    public static function enhancedValidation() {
        // Validate origin
        if (!self::validateOrigin()) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode([
                'error' => 'Invalid request origin',
                'code' => 'INVALID_ORIGIN'
            ]);
            exit;
        }
        
        // Validate CSRF token
        if (!self::validateToken()) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode([
                'error' => 'CSRF token validation failed',
                'code' => 'CSRF_TOKEN_INVALID'
            ]);
            exit;
        }
        
        return true;
    }
}
?>