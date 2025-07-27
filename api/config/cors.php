<?php
require_once __DIR__ . '/../security/SecurityHeaders.php';

// Apply secure CORS and security headers
SecurityHeaders::apply();

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>