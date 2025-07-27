<?php

/**
 * Security Headers Middleware
 * Implements comprehensive security headers for API responses
 */
class SecurityHeaders {
    
    /**
     * Apply all security headers to the response
     */
    public static function apply($strictMode = true) {
        // Prevent caching of sensitive data
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: Thu, 19 Nov 1981 08:52:00 GMT');
        
        // Content Security Policy
        if ($strictMode) {
            header("Content-Security-Policy: default-src 'none'; script-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none';");
        } else {
            header("Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'self';");
        }
        
        // Prevent MIME type sniffing
        header('X-Content-Type-Options: nosniff');
        
        // Prevent framing (clickjacking protection)
        header('X-Frame-Options: DENY');
        
        // XSS Protection
        header('X-XSS-Protection: 1; mode=block');
        
        // Referrer Policy
        header('Referrer-Policy: strict-origin-when-cross-origin');
        
        // Feature Policy / Permissions Policy
        header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()');
        
        // HSTS (HTTP Strict Transport Security) - only if HTTPS
        if (self::isHTTPS()) {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
        }
        
        // Remove server information
        header_remove('X-Powered-By');
        header_remove('Server');
        
        // Set secure content type
        header('Content-Type: application/json; charset=UTF-8');
        
        // Add security headers for API
        header('X-API-Version: 1.0');
        header('X-Rate-Limit-Remaining: ' . self::getRateLimitRemaining());
        
        // CORS headers with strict policy
        self::applyCORSHeaders();
    }
    
    /**
     * Apply CORS headers with security considerations
     */
    private static function applyCORSHeaders() {
        // Get environment-specific allowed origins
        $allowedOrigins = self::getAllowedOrigins();
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        // Check if origin is allowed
        if (in_array($origin, $allowedOrigins)) {
            header("Access-Control-Allow-Origin: {$origin}");
        } else {
            // Default to primary domain if no valid origin
            header("Access-Control-Allow-Origin: https://savings.forte.works");
        }
        
        // Secure CORS headers
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Max-Age: 3600"); // Cache preflight for 1 hour
        header("Access-Control-Expose-Headers: X-Rate-Limit-Remaining, X-Request-ID");
    }
    
    /**
     * Get allowed origins based on environment
     */
    private static function getAllowedOrigins() {
        $allowedOrigins = [
            'https://savings.forte.works',
            'https://forte.works'
        ];
        
        // Add localhost for development
        if (self::isDevelopment()) {
            $allowedOrigins[] = 'http://localhost:3000';
            $allowedOrigins[] = 'http://localhost:8000';
            $allowedOrigins[] = 'http://127.0.0.1:3000';
        }
        
        return $allowedOrigins;
    }
    
    /**
     * Check if request is over HTTPS
     */
    private static function isHTTPS() {
        return (
            (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
            $_SERVER['SERVER_PORT'] == 443 ||
            (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
            (!empty($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on')
        );
    }
    
    /**
     * Check if in development environment
     */
    private static function isDevelopment() {
        $env = $_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: 'production';
        return in_array($env, ['development', 'dev', 'local']);
    }
    
    /**
     * Get rate limit remaining (placeholder - implement with actual rate limiting)
     */
    private static function getRateLimitRemaining() {
        // This should be replaced with actual rate limiting logic
        return '100';
    }
    
    /**
     * Apply request size limits
     */
    public static function checkRequestSize($maxSize = 1048576) { // 1MB default
        $contentLength = $_SERVER['CONTENT_LENGTH'] ?? 0;
        
        if ($contentLength > $maxSize) {
            http_response_code(413);
            header('Content-Type: application/json');
            echo json_encode([
                'error' => 'Request entity too large',
                'max_size' => $maxSize,
                'received_size' => $contentLength
            ]);
            exit;
        }
        
        // Check actual input size
        $input = file_get_contents('php://input');
        if (strlen($input) > $maxSize) {
            http_response_code(413);
            header('Content-Type: application/json');
            echo json_encode([
                'error' => 'Request entity too large',
                'max_size' => $maxSize,
                'actual_size' => strlen($input)
            ]);
            exit;
        }
    }
    
    /**
     * Generate and validate CSRF token
     */
    public static function generateCSRFToken() {
        session_start();
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }
    
    /**
     * Validate CSRF token
     */
    public static function validateCSRFToken($token) {
        session_start();
        if (!isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
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
    
    /**
     * Add request ID for tracking
     */
    public static function generateRequestID() {
        $requestId = 'req_' . uniqid() . '_' . bin2hex(random_bytes(4));
        header("X-Request-ID: {$requestId}");
        return $requestId;
    }
    
    /**
     * Set security headers for file downloads
     */
    public static function applyFileDownloadHeaders($filename, $contentType = 'application/octet-stream') {
        // Prevent execution
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        
        // Force download
        header("Content-Type: {$contentType}");
        header("Content-Disposition: attachment; filename=\"" . addslashes($filename) . "\"");
        
        // Prevent caching
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: Thu, 19 Nov 1981 08:52:00 GMT');
    }
    
    /**
     * Handle OPTIONS requests (CORS preflight)
     */
    public static function handleOptionsRequest() {
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            self::apply(false); // Less strict for OPTIONS
            http_response_code(200);
            exit;
        }
    }
    
    /**
     * Validate HTTP method
     */
    public static function validateMethod($allowedMethods) {
        $method = $_SERVER['REQUEST_METHOD'];
        
        if (!in_array($method, $allowedMethods)) {
            http_response_code(405);
            header('Allow: ' . implode(', ', $allowedMethods));
            header('Content-Type: application/json');
            echo json_encode([
                'error' => 'Method not allowed',
                'allowed_methods' => $allowedMethods,
                'received_method' => $method
            ]);
            exit;
        }
    }
    
    /**
     * Log security events
     */
    public static function logSecurityEvent($event, $details = []) {
        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'event' => $event,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
            'details' => $details
        ];
        
        error_log('[SECURITY] ' . json_encode($logEntry));
    }
}
?>