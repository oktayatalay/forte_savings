<?php

require_once __DIR__ . '/InputValidator.php';
require_once __DIR__ . '/SecurityHeaders.php';
require_once __DIR__ . '/RateLimiter.php';
require_once __DIR__ . '/SecureErrorHandler.php';
require_once __DIR__ . '/CSRFProtection.php';

/**
 * Comprehensive Security Middleware
 * Combines all security measures into a single middleware system
 */
class SecurityMiddleware {
    
    private static $config = [
        'max_request_size' => 1048576, // 1MB
        'max_execution_time' => 30,
        'enable_csrf' => true,
        'enable_rate_limiting' => true,
        'strict_headers' => true
    ];
    
    /**
     * Initialize security middleware
     */
    public static function init($config = []) {
        self::$config = array_merge(self::$config, $config);
        
        // Set execution time limit
        set_time_limit(self::$config['max_execution_time']);
        
        // Initialize error handler
        SecureErrorHandler::init();
        
        // Initialize CSRF protection
        if (self::$config['enable_csrf']) {
            CSRFProtection::init();
        }
    }
    
    /**
     * Apply all security measures to incoming request
     */
    public static function apply($endpoint = 'api', $options = []) {
        try {
            // Generate request ID for tracking
            $requestId = SecurityHeaders::generateRequestID();
            
            // Apply security headers
            SecurityHeaders::apply(self::$config['strict_headers']);
            
            // Handle OPTIONS requests (CORS preflight)
            SecurityHeaders::handleOptionsRequest();
            
            // Check request size limits
            SecurityHeaders::checkRequestSize(self::$config['max_request_size']);
            
            // Rate limiting
            if (self::$config['enable_rate_limiting']) {
                self::applyRateLimiting($endpoint, $options);
            }
            
            // Check for suspicious activity
            RateLimiter::checkSuspiciousActivity($requestId);
            
            // Check for distributed attacks
            RateLimiter::checkDistributedAttack();
            
            // CSRF protection for state-changing operations
            if (self::$config['enable_csrf'] && CSRFProtection::needsProtection()) {
                CSRFProtection::middleware();
            }
            
            // Validate HTTP method
            if (isset($options['allowed_methods'])) {
                SecurityHeaders::validateMethod($options['allowed_methods']);
            }
            
            // Log security event
            self::logSecurityEvent('request_processed', [
                'endpoint' => $endpoint,
                'request_id' => $requestId,
                'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ]);
            
        } catch (Exception $e) {
            SecureErrorHandler::handleException($e);
        }
    }
    
    /**
     * Apply endpoint-specific rate limiting
     */
    private static function applyRateLimiting($endpoint, $options) {
        switch ($endpoint) {
            case 'auth':
            case 'login':
            case 'register':
                // RateLimiter::checkAuthLimit(); // DISABLED FOR TESTING
                break;
                
            case 'password-reset':
                if (isset($options['email'])) {
                    RateLimiter::checkPasswordResetLimit($options['email']);
                } else {
                    RateLimiter::checkPasswordResetLimit('unknown');
                }
                break;
                
            case 'registration':
                RateLimiter::checkRegistrationLimit();
                break;
                
            default:
                RateLimiter::checkApiLimit();
                break;
        }
    }
    
    /**
     * Validate and sanitize input data
     */
    public static function validateInput($data, $rules) {
        $validated = [];
        $errors = [];
        
        foreach ($rules as $field => $rule) {
            try {
                $value = $data[$field] ?? null;
                $validated[$field] = self::applyValidationRule($value, $rule);
            } catch (InvalidArgumentException $e) {
                $errors[$field] = $e->getMessage();
            }
        }
        
        if (!empty($errors)) {
            SecureErrorHandler::handleValidationError($errors);
        }
        
        return $validated;
    }
    
    /**
     * Apply specific validation rule
     */
    private static function applyValidationRule($value, $rule) {
        $type = $rule['type'] ?? 'text';
        $required = $rule['required'] ?? true;
        
        switch ($type) {
            case 'email':
                return InputValidator::validateEmail($value, $required);
                
            case 'text':
                $maxLength = $rule['max_length'] ?? 255;
                $allowedChars = $rule['allowed_chars'] ?? null;
                return InputValidator::validateText($value, $maxLength, $required, $allowedChars);
                
            case 'numeric':
                $min = $rule['min'] ?? null;
                $max = $rule['max'] ?? null;
                return InputValidator::validateNumeric($value, $min, $max, $required);
                
            case 'integer':
                $min = $rule['min'] ?? null;
                $max = $rule['max'] ?? null;
                return InputValidator::validateInteger($value, $min, $max, $required);
                
            case 'date':
                $format = $rule['format'] ?? 'Y-m-d';
                return InputValidator::validateDate($value, $format, $required);
                
            case 'password':
                $minLength = $rule['min_length'] ?? 8;
                return InputValidator::validatePassword($value, $minLength);
                
            case 'url':
                return InputValidator::validateURL($value, $required);
                
            case 'filename':
                $allowedExtensions = $rule['allowed_extensions'] ?? [];
                return InputValidator::validateFilename($value, $allowedExtensions);
                
            default:
                throw new InvalidArgumentException("Unknown validation type: {$type}");
        }
    }
    
    /**
     * Security check for file uploads
     */
    public static function validateFileUpload($file, $allowedTypes = [], $maxSize = 1048576) {
        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            throw new InvalidArgumentException('Invalid file upload');
        }
        
        // Check file size
        if ($file['size'] > $maxSize) {
            throw new InvalidArgumentException('File size exceeds limit');
        }
        
        // Validate filename
        $filename = InputValidator::validateFilename($file['name'], $allowedTypes);
        
        // Check MIME type
        $mimeType = mime_content_type($file['tmp_name']);
        $allowedMimes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'pdf' => 'application/pdf',
            'txt' => 'text/plain'
        ];
        
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (!empty($allowedTypes) && !in_array($extension, $allowedTypes)) {
            throw new InvalidArgumentException('File type not allowed');
        }
        
        if (isset($allowedMimes[$extension]) && $mimeType !== $allowedMimes[$extension]) {
            throw new InvalidArgumentException('File MIME type does not match extension');
        }
        
        // Scan for malicious content
        if (self::scanFileForMalware($file['tmp_name'])) {
            throw new InvalidArgumentException('File contains malicious content');
        }
        
        return [
            'original_name' => $filename,
            'size' => $file['size'],
            'mime_type' => $mimeType,
            'extension' => $extension
        ];
    }
    
    /**
     * Basic malware scanning for uploaded files
     */
    private static function scanFileForMalware($filePath) {
        // Check for PHP code in uploaded files
        $content = file_get_contents($filePath);
        
        $maliciousPatterns = [
            '/<\?php/i',
            '/<script/i',
            '/eval\s*\(/i',
            '/exec\s*\(/i',
            '/system\s*\(/i',
            '/shell_exec\s*\(/i',
            '/base64_decode\s*\(/i'
        ];
        
        foreach ($maliciousPatterns as $pattern) {
            if (preg_match($pattern, $content)) {
                self::logSecurityEvent('malware_detected', [
                    'file_path' => $filePath,
                    'pattern' => $pattern
                ]);
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Authenticate request and return user data
     */
    public static function authenticate($requiredRoles = null) {
        require_once __DIR__ . '/../auth/middleware.php';
        
        try {
            if ($requiredRoles) {
                return requireAuth($requiredRoles);
            } else {
                return requireUserOrAbove();
            }
        } catch (Exception $e) {
            SecureErrorHandler::handleAuthError($e->getMessage());
        }
    }
    
    /**
     * Log security events
     */
    private static function logSecurityEvent($event, $data = []) {
        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'event' => $event,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
            'data' => $data
        ];
        
        error_log('[SECURITY] ' . json_encode($logEntry));
    }
    
    /**
     * Get security status for monitoring
     */
    public static function getSecurityStatus() {
        return [
            'rate_limiting' => RateLimiter::getStatus(),
            'csrf_protection' => CSRFProtection::getStats(),
            'error_stats' => SecureErrorHandler::getErrorStats(24),
            'config' => self::$config,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * Quick setup for different endpoint types
     */
    public static function setupAuth() {
        self::init();
        self::apply('auth', ['allowed_methods' => ['POST', 'OPTIONS']]);
    }
    
    public static function setupAPI($allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
        self::init();
        self::apply('api', ['allowed_methods' => $allowedMethods]);
    }
    
    public static function setupPublic() {
        self::init(['enable_csrf' => false]);
        self::apply('public', ['allowed_methods' => ['GET', 'OPTIONS']]);
    }
    
    /**
     * Cleanup security data
     */
    public static function cleanup() {
        RateLimiter::cleanup();
        SecureErrorHandler::cleanupLogs();
    }
}
?>