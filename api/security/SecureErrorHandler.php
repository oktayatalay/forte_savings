<?php

/**
 * Secure Error Handler
 * Provides standardized, secure error responses that don't leak sensitive information
 */
class SecureErrorHandler {
    
    private static $isProduction = null;
    private static $errorLogFile = null;
    
    /**
     * Initialize error handler
     */
    public static function init() {
        // Set custom error handler
        set_error_handler([self::class, 'handleError']);
        set_exception_handler([self::class, 'handleException']);
        
        // Disable error display in production
        if (self::isProduction()) {
            ini_set('display_errors', '0');
            ini_set('display_startup_errors', '0');
        }
        
        // Set error log file
        self::$errorLogFile = __DIR__ . '/../../logs/secure_errors.log';
        
        // Ensure log directory exists
        $logDir = dirname(self::$errorLogFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
    }
    
    /**
     * Handle PHP errors securely
     */
    public static function handleError($severity, $message, $file, $line) {
        // Don't handle suppressed errors
        if (!(error_reporting() & $severity)) {
            return false;
        }
        
        $errorId = self::generateErrorId();
        
        // Log detailed error information
        self::logError([
            'error_id' => $errorId,
            'type' => 'php_error',
            'severity' => $severity,
            'message' => $message,
            'file' => $file,
            'line' => $line,
            'backtrace' => debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS)
        ]);
        
        // Send secure response
        self::sendErrorResponse('INTERNAL_ERROR', 'An internal error occurred', [
            'error_id' => $errorId
        ], 500);
        
        return true;
    }
    
    /**
     * Handle exceptions securely
     */
    public static function handleException($exception) {
        $errorId = self::generateErrorId();
        
        // Log detailed exception information
        self::logError([
            'error_id' => $errorId,
            'type' => 'exception',
            'class' => get_class($exception),
            'message' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'backtrace' => $exception->getTrace()
        ]);
        
        // Determine appropriate HTTP status code
        $statusCode = self::getHttpStatusForException($exception);
        
        // Send secure response
        if ($exception instanceof InvalidArgumentException) {
            self::sendErrorResponse('VALIDATION_ERROR', $exception->getMessage(), [
                'error_id' => $errorId
            ], $statusCode);
        } else {
            self::sendErrorResponse('INTERNAL_ERROR', 'An internal error occurred', [
                'error_id' => $errorId
            ], $statusCode);
        }
    }
    
    /**
     * Send standardized error response
     */
    public static function sendErrorResponse($code, $message, $data = [], $httpStatus = 400) {
        // Ensure headers aren't already sent
        if (!headers_sent()) {
            http_response_code($httpStatus);
            header('Content-Type: application/json; charset=UTF-8');
            
            // Add security headers
            header('X-Content-Type-Options: nosniff');
            header('X-Frame-Options: DENY');
            header('Cache-Control: no-store, no-cache, must-revalidate');
        }
        
        $response = [
            'success' => false,
            'error' => [
                'code' => $code,
                'message' => self::sanitizeErrorMessage($message),
                'timestamp' => date('c')
            ]
        ];
        
        // Add additional data if provided
        if (!empty($data)) {
            $response['error']['data'] = self::sanitizeErrorData($data);
        }
        
        // Add debug info only in development
        if (!self::isProduction() && isset($data['debug'])) {
            $response['error']['debug'] = $data['debug'];
        }
        
        echo json_encode($response, JSON_UNESCAPED_SLASHES);
        exit;
    }
    
    /**
     * Handle database errors securely
     */
    public static function handleDatabaseError($exception, $operation = 'database operation') {
        $errorId = self::generateErrorId();
        
        // Log detailed database error
        self::logError([
            'error_id' => $errorId,
            'type' => 'database_error',
            'operation' => $operation,
            'message' => $exception->getMessage(),
            'sql_state' => $exception->errorInfo[0] ?? null,
            'error_code' => $exception->errorInfo[1] ?? null,
            'error_message' => $exception->errorInfo[2] ?? null
        ]);
        
        // Check for specific SQL errors that might indicate attacks
        $sqlInjectionPatterns = [
            '/syntax error/i',
            '/union.*select/i',
            '/insert.*into/i',
            '/update.*set/i',
            '/delete.*from/i'
        ];
        
        foreach ($sqlInjectionPatterns as $pattern) {
            if (preg_match($pattern, $exception->getMessage())) {
                self::logSecurityIncident('SQL_INJECTION_ATTEMPT', [
                    'error_id' => $errorId,
                    'sql_error' => $exception->getMessage()
                ]);
                break;
            }
        }
        
        self::sendErrorResponse('DATABASE_ERROR', 'Database operation failed', [
            'error_id' => $errorId
        ], 500);
    }
    
    /**
     * Handle authentication errors
     */
    public static function handleAuthError($message, $code = 'AUTH_FAILED', $httpStatus = 401) {
        $errorId = self::generateErrorId();
        
        // Log authentication error
        self::logError([
            'error_id' => $errorId,
            'type' => 'auth_error',
            'message' => $message,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ]);
        
        self::sendErrorResponse($code, $message, [
            'error_id' => $errorId
        ], $httpStatus);
    }
    
    /**
     * Handle validation errors
     */
    public static function handleValidationError($errors, $message = 'Validation failed') {
        $errorId = self::generateErrorId();
        
        // Sanitize validation errors
        $sanitizedErrors = [];
        if (is_array($errors)) {
            foreach ($errors as $field => $error) {
                $sanitizedErrors[$field] = self::sanitizeErrorMessage($error);
            }
        } else {
            $sanitizedErrors = self::sanitizeErrorMessage($errors);
        }
        
        self::sendErrorResponse('VALIDATION_ERROR', $message, [
            'error_id' => $errorId,
            'validation_errors' => $sanitizedErrors
        ], 400);
    }
    
    /**
     * Handle rate limit errors
     */
    public static function handleRateLimitError($limit, $window, $retryAfter) {
        $errorId = self::generateErrorId();
        
        // Add rate limit headers
        if (!headers_sent()) {
            header("X-RateLimit-Limit: {$limit}");
            header("X-RateLimit-Remaining: 0");
            header("Retry-After: {$retryAfter}");
        }
        
        self::sendErrorResponse('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', [
            'error_id' => $errorId,
            'limit' => $limit,
            'window' => $window,
            'retry_after' => $retryAfter
        ], 429);
    }
    
    /**
     * Generate unique error ID for tracking
     */
    private static function generateErrorId() {
        return 'err_' . date('Ymd') . '_' . uniqid() . '_' . bin2hex(random_bytes(4));
    }
    
    /**
     * Log error with detailed information
     */
    private static function logError($errorData) {
        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
            'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
            'error' => $errorData
        ];
        
        // Write to error log
        $logLine = json_encode($logEntry) . "\n";
        file_put_contents(self::$errorLogFile, $logLine, FILE_APPEND | LOCK_EX);
        
        // Also log to PHP error log
        error_log('[SECURE_ERROR] ' . json_encode($errorData));
    }
    
    /**
     * Log security incidents
     */
    private static function logSecurityIncident($type, $data) {
        $incident = [
            'type' => $type,
            'timestamp' => date('Y-m-d H:i:s'),
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'data' => $data
        ];
        
        error_log('[SECURITY_INCIDENT] ' . json_encode($incident));
    }
    
    /**
     * Sanitize error messages to prevent information disclosure
     */
    private static function sanitizeErrorMessage($message) {
        // Remove file paths
        $message = preg_replace('/\/[a-zA-Z0-9_\-\/\.]+\.php/', '[FILE_PATH]', $message);
        
        // Remove database connection details
        $message = preg_replace('/host=[a-zA-Z0-9\-\.]+/', 'host=[REDACTED]', $message);
        $message = preg_replace('/password=[^;]+/', 'password=[REDACTED]', $message);
        $message = preg_replace('/user=[^;]+/', 'user=[REDACTED]', $message);
        
        // Remove SQL queries
        $message = preg_replace('/SELECT .* FROM/i', 'SELECT [QUERY] FROM', $message);
        $message = preg_replace('/INSERT INTO .* VALUES/i', 'INSERT INTO [TABLE] VALUES', $message);
        
        // Limit message length
        if (strlen($message) > 200) {
            $message = substr($message, 0, 197) . '...';
        }
        
        return $message;
    }
    
    /**
     * Sanitize error data
     */
    private static function sanitizeErrorData($data) {
        if (is_array($data)) {
            $sanitized = [];
            foreach ($data as $key => $value) {
                if (in_array($key, ['password', 'token', 'secret', 'key'])) {
                    $sanitized[$key] = '[REDACTED]';
                } else if (is_string($value)) {
                    $sanitized[$key] = self::sanitizeErrorMessage($value);
                } else {
                    $sanitized[$key] = $value;
                }
            }
            return $sanitized;
        }
        
        return $data;
    }
    
    /**
     * Get appropriate HTTP status code for exception
     */
    private static function getHttpStatusForException($exception) {
        if ($exception instanceof InvalidArgumentException) {
            return 400;
        } else if ($exception instanceof UnauthorizedAccessException) {
            return 401;
        } else if ($exception instanceof ForbiddenException) {
            return 403;
        } else if ($exception instanceof NotFoundException) {
            return 404;
        } else if ($exception instanceof PDOException) {
            return 500;
        }
        
        return 500; // Default to internal server error
    }
    
    /**
     * Check if running in production environment
     */
    private static function isProduction() {
        if (self::$isProduction === null) {
            $env = $_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: 'production';
            self::$isProduction = !in_array($env, ['development', 'dev', 'local', 'testing']);
        }
        
        return self::$isProduction;
    }
    
    /**
     * Clean old error logs
     */
    public static function cleanupLogs($daysToKeep = 30) {
        $cutoffTime = time() - ($daysToKeep * 24 * 60 * 60);
        
        if (file_exists(self::$errorLogFile)) {
            $lines = file(self::$errorLogFile);
            $newLines = [];
            
            foreach ($lines as $line) {
                $data = json_decode($line, true);
                if ($data && isset($data['timestamp'])) {
                    $timestamp = strtotime($data['timestamp']);
                    if ($timestamp > $cutoffTime) {
                        $newLines[] = $line;
                    }
                }
            }
            
            file_put_contents(self::$errorLogFile, implode('', $newLines));
        }
    }
    
    /**
     * Get error statistics (for admin monitoring)
     */
    public static function getErrorStats($hours = 24) {
        if (!file_exists(self::$errorLogFile)) {
            return [];
        }
        
        $cutoffTime = time() - ($hours * 60 * 60);
        $stats = [
            'total_errors' => 0,
            'error_types' => [],
            'top_ips' => [],
            'recent_errors' => []
        ];
        
        $lines = file(self::$errorLogFile);
        
        foreach ($lines as $line) {
            $data = json_decode($line, true);
            if ($data && isset($data['timestamp'])) {
                $timestamp = strtotime($data['timestamp']);
                if ($timestamp > $cutoffTime) {
                    $stats['total_errors']++;
                    
                    $errorType = $data['error']['type'] ?? 'unknown';
                    $stats['error_types'][$errorType] = ($stats['error_types'][$errorType] ?? 0) + 1;
                    
                    $ip = $data['ip'] ?? 'unknown';
                    $stats['top_ips'][$ip] = ($stats['top_ips'][$ip] ?? 0) + 1;
                    
                    if (count($stats['recent_errors']) < 10) {
                        $stats['recent_errors'][] = [
                            'timestamp' => $data['timestamp'],
                            'type' => $errorType,
                            'message' => $data['error']['message'] ?? '',
                            'ip' => $ip
                        ];
                    }
                }
            }
        }
        
        // Sort by count
        arsort($stats['error_types']);
        arsort($stats['top_ips']);
        
        return $stats;
    }
}

// Initialize error handler
SecureErrorHandler::init();
?>