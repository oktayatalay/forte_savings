<?php

/**
 * Input Validation and Sanitization Class
 * Provides comprehensive security validation for all API inputs
 */
class InputValidator {
    
    // XSS prevention patterns
    private static $xss_patterns = [
        '/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/mi',
        '/javascript:/i',
        '/vbscript:/i',
        '/onload=/i',
        '/onerror=/i',
        '/onclick=/i',
        '/onmouseover=/i',
        '/<iframe/i',
        '/<object/i',
        '/<embed/i'
    ];
    
    // SQL injection prevention patterns
    private static $sql_patterns = [
        '/(\s*(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\s+)/i',
        '/(\s*(OR|AND)\s+\d+\s*=\s*\d+)/i',
        '/(\s*;\s*(--|\#))/i',
        '/(\s*\/\*.*?\*\/)/i'
    ];
    
    /**
     * Sanitize and validate email
     */
    public static function validateEmail($email, $required = true) {
        if (empty($email) && !$required) {
            return null;
        }
        
        if (empty($email) && $required) {
            throw new InvalidArgumentException('Email is required');
        }
        
        $email = trim($email);
        
        // Length check
        if (strlen($email) > 254) {
            throw new InvalidArgumentException('Email address too long');
        }
        
        // Basic format validation
        $sanitized = filter_var($email, FILTER_VALIDATE_EMAIL);
        if (!$sanitized) {
            throw new InvalidArgumentException('Invalid email format');
        }
        
        // Check for dangerous patterns
        self::checkXSSPatterns($sanitized, 'email');
        
        return $sanitized;
    }
    
    /**
     * Sanitize and validate text input
     */
    public static function validateText($text, $maxLength = 255, $required = true, $allowedChars = null) {
        if (empty($text) && !$required) {
            return null;
        }
        
        if (empty($text) && $required) {
            throw new InvalidArgumentException('Text field is required');
        }
        
        $text = trim($text);
        
        // Length check
        if (strlen($text) > $maxLength) {
            throw new InvalidArgumentException("Text exceeds maximum length of {$maxLength} characters");
        }
        
        // Check for dangerous patterns
        self::checkXSSPatterns($text, 'text');
        self::checkSQLPatterns($text, 'text');
        
        // Character whitelist if provided
        if ($allowedChars && !preg_match($allowedChars, $text)) {
            throw new InvalidArgumentException('Text contains invalid characters');
        }
        
        // HTML encode for safety
        return htmlspecialchars($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
    
    /**
     * Validate numeric input
     */
    public static function validateNumeric($value, $min = null, $max = null, $required = true) {
        if (empty($value) && $value !== '0' && $value !== 0 && !$required) {
            return null;
        }
        
        if ((empty($value) && $value !== '0' && $value !== 0) && $required) {
            throw new InvalidArgumentException('Numeric value is required');
        }
        
        if (!is_numeric($value)) {
            throw new InvalidArgumentException('Value must be numeric');
        }
        
        $numValue = floatval($value);
        
        if ($min !== null && $numValue < $min) {
            throw new InvalidArgumentException("Value must be at least {$min}");
        }
        
        if ($max !== null && $numValue > $max) {
            throw new InvalidArgumentException("Value must not exceed {$max}");
        }
        
        return $numValue;
    }
    
    /**
     * Validate integer input
     */
    public static function validateInteger($value, $min = null, $max = null, $required = true) {
        if (empty($value) && $value !== '0' && $value !== 0 && !$required) {
            return null;
        }
        
        if ((empty($value) && $value !== '0' && $value !== 0) && $required) {
            throw new InvalidArgumentException('Integer value is required');
        }
        
        if (!is_numeric($value) || intval($value) != $value) {
            throw new InvalidArgumentException('Value must be an integer');
        }
        
        $intValue = intval($value);
        
        if ($min !== null && $intValue < $min) {
            throw new InvalidArgumentException("Value must be at least {$min}");
        }
        
        if ($max !== null && $intValue > $max) {
            throw new InvalidArgumentException("Value must not exceed {$max}");
        }
        
        return $intValue;
    }
    
    /**
     * Validate date input
     */
    public static function validateDate($date, $format = 'Y-m-d', $required = true) {
        if (empty($date) && !$required) {
            return null;
        }
        
        if (empty($date) && $required) {
            throw new InvalidArgumentException('Date is required');
        }
        
        $dateObj = DateTime::createFromFormat($format, $date);
        if (!$dateObj || $dateObj->format($format) !== $date) {
            throw new InvalidArgumentException("Date must be in {$format} format");
        }
        
        return $date;
    }
    
    /**
     * Validate password strength
     */
    public static function validatePassword($password, $minLength = 8) {
        if (empty($password)) {
            throw new InvalidArgumentException('Password is required');
        }
        
        if (strlen($password) < $minLength) {
            throw new InvalidArgumentException("Password must be at least {$minLength} characters long");
        }
        
        // Check for at least one uppercase letter
        if (!preg_match('/[A-Z]/', $password)) {
            throw new InvalidArgumentException('Password must contain at least one uppercase letter');
        }
        
        // Check for at least one lowercase letter
        if (!preg_match('/[a-z]/', $password)) {
            throw new InvalidArgumentException('Password must contain at least one lowercase letter');
        }
        
        // Check for at least one number
        if (!preg_match('/[0-9]/', $password)) {
            throw new InvalidArgumentException('Password must contain at least one number');
        }
        
        // Check for at least one special character
        if (!preg_match('/[^A-Za-z0-9]/', $password)) {
            throw new InvalidArgumentException('Password must contain at least one special character');
        }
        
        // Check for common weak passwords
        $weakPasswords = [
            'password', '12345678', 'qwerty123', 'abc123456', 
            'password123', 'admin123', 'welcome123'
        ];
        
        if (in_array(strtolower($password), $weakPasswords)) {
            throw new InvalidArgumentException('Password is too common and weak');
        }
        
        return $password;
    }
    
    /**
     * Validate JSON input
     */
    public static function validateJSON($jsonString, $required = true) {
        if (empty($jsonString) && !$required) {
            return null;
        }
        
        if (empty($jsonString) && $required) {
            throw new InvalidArgumentException('JSON input is required');
        }
        
        // Check string length
        if (strlen($jsonString) > 1048576) { // 1MB limit
            throw new InvalidArgumentException('JSON input too large');
        }
        
        $decoded = json_decode($jsonString, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new InvalidArgumentException('Invalid JSON format: ' . json_last_error_msg());
        }
        
        return $decoded;
    }
    
    /**
     * Validate URL
     */
    public static function validateURL($url, $required = true) {
        if (empty($url) && !$required) {
            return null;
        }
        
        if (empty($url) && $required) {
            throw new InvalidArgumentException('URL is required');
        }
        
        $url = trim($url);
        
        // Length check
        if (strlen($url) > 2048) {
            throw new InvalidArgumentException('URL too long');
        }
        
        $sanitized = filter_var($url, FILTER_VALIDATE_URL);
        if (!$sanitized) {
            throw new InvalidArgumentException('Invalid URL format');
        }
        
        // Check for dangerous patterns
        self::checkXSSPatterns($sanitized, 'url');
        
        // Only allow HTTP and HTTPS protocols
        $parsedUrl = parse_url($sanitized);
        if (!in_array($parsedUrl['scheme'], ['http', 'https'])) {
            throw new InvalidArgumentException('Only HTTP and HTTPS URLs are allowed');
        }
        
        return $sanitized;
    }
    
    /**
     * Validate array of required fields
     */
    public static function validateRequiredFields($data, $requiredFields) {
        $missingFields = [];
        
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }
        
        if (!empty($missingFields)) {
            throw new InvalidArgumentException('Missing required fields: ' . implode(', ', $missingFields));
        }
        
        return true;
    }
    
    /**
     * Check for XSS patterns
     */
    private static function checkXSSPatterns($input, $fieldName = 'input') {
        foreach (self::$xss_patterns as $pattern) {
            if (preg_match($pattern, $input)) {
                error_log("XSS attempt detected in {$fieldName}: " . substr($input, 0, 100));
                throw new InvalidArgumentException("Invalid characters detected in {$fieldName}");
            }
        }
    }
    
    /**
     * Check for SQL injection patterns
     */
    private static function checkSQLPatterns($input, $fieldName = 'input') {
        foreach (self::$sql_patterns as $pattern) {
            if (preg_match($pattern, $input)) {
                error_log("SQL injection attempt detected in {$fieldName}: " . substr($input, 0, 100));
                throw new InvalidArgumentException("Invalid characters detected in {$fieldName}");
            }
        }
    }
    
    /**
     * Sanitize filename for file uploads
     */
    public static function validateFilename($filename, $allowedExtensions = []) {
        if (empty($filename)) {
            throw new InvalidArgumentException('Filename is required');
        }
        
        // Remove path traversal attempts
        $filename = basename($filename);
        
        // Check for dangerous characters
        if (preg_match('/[^a-zA-Z0-9._-]/', $filename)) {
            throw new InvalidArgumentException('Filename contains invalid characters');
        }
        
        // Check file extension if provided
        if (!empty($allowedExtensions)) {
            $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            if (!in_array($extension, $allowedExtensions)) {
                throw new InvalidArgumentException('File type not allowed');
            }
        }
        
        // Length check
        if (strlen($filename) > 255) {
            throw new InvalidArgumentException('Filename too long');
        }
        
        return $filename;
    }
    
    /**
     * Rate limiting check helper
     */
    public static function checkRateLimit($key, $maxAttempts = 5, $timeWindow = 900) { // 15 minutes
        $cacheFile = sys_get_temp_dir() . '/rate_limit_' . md5($key) . '.json';
        
        $attempts = [];
        if (file_exists($cacheFile)) {
            $attempts = json_decode(file_get_contents($cacheFile), true) ?: [];
        }
        
        $now = time();
        
        // Clean old attempts
        $attempts = array_filter($attempts, function($timestamp) use ($now, $timeWindow) {
            return ($now - $timestamp) < $timeWindow;
        });
        
        // Check if rate limit exceeded
        if (count($attempts) >= $maxAttempts) {
            throw new Exception("Rate limit exceeded. Try again later.");
        }
        
        // Add current attempt
        $attempts[] = $now;
        
        // Save to cache
        file_put_contents($cacheFile, json_encode($attempts));
        
        return true;
    }
}
?>