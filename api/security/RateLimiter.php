<?php

/**
 * Advanced Rate Limiter for API Security
 * Implements multiple rate limiting strategies for different endpoints
 */
class RateLimiter {
    
    private static $rateStore = [];
    private static $cacheDir;
    
    public function __construct() {
        self::$cacheDir = sys_get_temp_dir() . '/forte_rate_limits/';
        if (!is_dir(self::$cacheDir)) {
            mkdir(self::$cacheDir, 0755, true);
        }
    }
    
    /**
     * Rate limit for authentication endpoints (stricter)
     */
    public static function checkAuthLimit($identifier = null) {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        
        // Create composite key for more robust tracking
        $key = $identifier ?: ($ip . ':' . md5($userAgent));
        
        // Multiple rate limit checks
        self::checkLimit($key, 'auth_attempts', 5, 900);      // 5 attempts per 15 minutes
        self::checkLimit($ip, 'auth_ip', 10, 3600);           // 10 attempts per hour per IP
        self::checkLimit($key, 'auth_burst', 3, 60);          // 3 attempts per minute
        
        return true;
    }
    
    /**
     * Rate limit for general API endpoints
     */
    public static function checkApiLimit($identifier = null) {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $key = $identifier ?: $ip;
        
        // General API limits
        self::checkLimit($key, 'api_requests', 100, 3600);    // 100 requests per hour
        self::checkLimit($key, 'api_burst', 20, 60);          // 20 requests per minute
        
        return true;
    }
    
    /**
     * Rate limit for password reset attempts
     */
    public static function checkPasswordResetLimit($email) {
        $emailKey = 'pwd_reset:' . hash('sha256', $email);
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        
        // Strict limits for password reset
        self::checkLimit($emailKey, 'pwd_reset_email', 3, 3600);  // 3 per hour per email
        self::checkLimit($ip, 'pwd_reset_ip', 5, 3600);           // 5 per hour per IP
        
        return true;
    }
    
    /**
     * Rate limit for registration attempts
     */
    public static function checkRegistrationLimit() {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        
        // Registration limits
        self::checkLimit($ip, 'registration', 3, 3600);       // 3 registrations per hour per IP
        self::checkLimit($ip, 'reg_burst', 1, 300);           // 1 registration per 5 minutes
        
        return true;
    }
    
    /**
     * Generic rate limit checker
     */
    private static function checkLimit($key, $type, $maxAttempts, $timeWindow) {
        $cacheKey = "{$type}:{$key}";
        $attempts = self::getAttempts($cacheKey, $timeWindow);
        
        if (count($attempts) >= $maxAttempts) {
            $resetTime = min($attempts) + $timeWindow;
            $waitTime = $resetTime - time();
            
            // Log rate limit violation
            self::logRateLimitViolation($key, $type, count($attempts), $maxAttempts);
            
            http_response_code(429);
            header('Content-Type: application/json');
            header("Retry-After: {$waitTime}");
            header("X-RateLimit-Limit: {$maxAttempts}");
            header("X-RateLimit-Remaining: 0");
            header("X-RateLimit-Reset: {$resetTime}");
            
            echo json_encode([
                'error' => 'Rate limit exceeded',
                'message' => 'Too many requests. Please try again later.',
                'retry_after' => $waitTime,
                'limit' => $maxAttempts,
                'window' => $timeWindow
            ]);
            exit;
        }
        
        // Record this attempt
        self::recordAttempt($cacheKey);
        
        // Add rate limit headers
        $remaining = max(0, $maxAttempts - count($attempts) - 1);
        header("X-RateLimit-Limit: {$maxAttempts}");
        header("X-RateLimit-Remaining: {$remaining}");
        header("X-RateLimit-Reset: " . (time() + $timeWindow));
        
        return true;
    }
    
    /**
     * Get attempts from cache
     */
    private static function getAttempts($cacheKey, $timeWindow) {
        $cacheFile = self::$cacheDir . md5($cacheKey) . '.json';
        
        $attempts = [];
        if (file_exists($cacheFile)) {
            $data = json_decode(file_get_contents($cacheFile), true);
            $attempts = $data['attempts'] ?? [];
        }
        
        $now = time();
        
        // Clean old attempts
        $attempts = array_filter($attempts, function($timestamp) use ($now, $timeWindow) {
            return ($now - $timestamp) < $timeWindow;
        });
        
        return $attempts;
    }
    
    /**
     * Record new attempt
     */
    private static function recordAttempt($cacheKey) {
        $cacheFile = self::$cacheDir . md5($cacheKey) . '.json';
        $attempts = self::getAttempts($cacheKey, 86400); // Keep for 24 hours
        
        $attempts[] = time();
        
        $data = [
            'attempts' => $attempts,
            'last_updated' => time()
        ];
        
        file_put_contents($cacheFile, json_encode($data));
    }
    
    /**
     * Check for suspicious patterns
     */
    public static function checkSuspiciousActivity($identifier) {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        
        $suspiciousPatterns = [
            // Common bot user agents
            '/bot|crawler|spider|scraper/i',
            // Empty or very short user agents
            '/^.{0,10}$/',
            // Known attack tools
            '/sqlmap|nikto|nessus|openvas|w3af/i'
        ];
        
        foreach ($suspiciousPatterns as $pattern) {
            if (preg_match($pattern, $userAgent)) {
                self::logSecurityThreat('suspicious_user_agent', [
                    'ip' => $ip,
                    'user_agent' => $userAgent,
                    'pattern' => $pattern
                ]);
                
                // Apply stricter rate limits for suspicious activity
                self::checkLimit($ip, 'suspicious', 1, 3600); // 1 request per hour
            }
        }
        
        return true;
    }
    
    /**
     * Progressive delay for failed attempts
     */
    public static function applyProgressiveDelay($identifier, $attemptCount) {
        // Exponential backoff: 1s, 2s, 4s, 8s, etc.
        $delay = min(pow(2, $attemptCount - 1), 30); // Max 30 seconds
        
        if ($delay > 0) {
            sleep($delay);
        }
        
        return $delay;
    }
    
    /**
     * Check for distributed attacks
     */
    public static function checkDistributedAttack() {
        $now = time();
        $timeWindow = 300; // 5 minutes
        
        // Get all recent attempts across all IPs
        $allAttempts = 0;
        $files = glob(self::$cacheDir . '*.json');
        
        foreach ($files as $file) {
            $data = json_decode(file_get_contents($file), true);
            if ($data && isset($data['attempts'])) {
                $recentAttempts = array_filter($data['attempts'], function($timestamp) use ($now, $timeWindow) {
                    return ($now - $timestamp) < $timeWindow;
                });
                $allAttempts += count($recentAttempts);
            }
        }
        
        // If too many attempts across all IPs, temporarily block all
        if ($allAttempts > 500) { // 500 attempts across all IPs in 5 minutes
            self::logSecurityThreat('distributed_attack', [
                'total_attempts' => $allAttempts,
                'time_window' => $timeWindow
            ]);
            
            http_response_code(503);
            header('Content-Type: application/json');
            header('Retry-After: 300');
            
            echo json_encode([
                'error' => 'Service temporarily unavailable',
                'message' => 'High traffic detected. Please try again later.',
                'retry_after' => 300
            ]);
            exit;
        }
        
        return true;
    }
    
    /**
     * Whitelist trusted IPs (admin, monitoring systems)
     */
    public static function isWhitelisted($ip = null) {
        $ip = $ip ?: ($_SERVER['REMOTE_ADDR'] ?? '');
        
        $whitelist = [
            '127.0.0.1',
            '::1',
            // Add trusted admin IPs here
        ];
        
        return in_array($ip, $whitelist);
    }
    
    /**
     * Log rate limit violations
     */
    private static function logRateLimitViolation($key, $type, $attempts, $limit) {
        $logData = [
            'event' => 'rate_limit_exceeded',
            'key' => $key,
            'type' => $type,
            'attempts' => $attempts,
            'limit' => $limit,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        error_log('[RATE_LIMIT] ' . json_encode($logData));
    }
    
    /**
     * Log security threats
     */
    private static function logSecurityThreat($threat, $details) {
        $logData = [
            'event' => 'security_threat',
            'threat_type' => $threat,
            'details' => $details,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        error_log('[SECURITY_THREAT] ' . json_encode($logData));
    }
    
    /**
     * Clean old cache files
     */
    public static function cleanup() {
        $files = glob(self::$cacheDir . '*.json');
        $cutoff = time() - 86400; // 24 hours
        
        foreach ($files as $file) {
            if (filemtime($file) < $cutoff) {
                unlink($file);
            }
        }
    }
    
    /**
     * Get rate limit status for debugging
     */
    public static function getStatus($identifier = null) {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $key = $identifier ?: $ip;
        
        return [
            'auth_attempts' => count(self::getAttempts("auth_attempts:{$key}", 900)),
            'api_requests' => count(self::getAttempts("api_requests:{$key}", 3600)),
            'is_whitelisted' => self::isWhitelisted($ip),
            'ip' => $ip
        ];
    }
}

// Initialize rate limiter
new RateLimiter();
?>