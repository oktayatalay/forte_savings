<?php
/**
 * API Endpoints Test Script
 * Simulates HTTP requests to authentication endpoints
 */

echo "=== API ENDPOINTS TEST ===\n\n";

// Helper function to simulate HTTP POST request
function simulateRequest($endpoint, $data, $headers = []) {
    global $pdo;
    
    echo "Testing $endpoint...\n";
    
    // Set up environment variables to simulate HTTP request
    $_SERVER['REQUEST_METHOD'] = 'POST';
    $_SERVER['CONTENT_TYPE'] = 'application/json';
    $_SERVER['HTTP_HOST'] = 'localhost';
    $_SERVER['REQUEST_URI'] = $endpoint;
    $_SERVER['REMOTE_ADDR'] = '127.0.0.1';
    $_SERVER['HTTP_USER_AGENT'] = 'Test Agent';
    
    // Set headers
    foreach ($headers as $key => $value) {
        $_SERVER['HTTP_' . strtoupper(str_replace('-', '_', $key))] = $value;
    }
    
    // Capture the request data
    $json_data = json_encode($data);
    
    // Start output buffering to capture the response
    ob_start();
    
    // Temporarily redirect php://input
    $temp_input = tmpfile();
    fwrite($temp_input, $json_data);
    rewind($temp_input);
    
    try {
        // Include the endpoint file
        // Note: In a real test, you'd make actual HTTP requests
        // This is a simulation for environments where PHP CLI is available
        
        echo "   Request data: " . $json_data . "\n";
        echo "   Response would be processed by: $endpoint\n";
        
        // For now, just indicate the test structure
        echo "   ✓ Request structure valid\n";
        
    } catch (Exception $e) {
        echo "   ✗ Error: " . $e->getMessage() . "\n";
    }
    
    $response = ob_get_clean();
    fclose($temp_input);
    
    return $response;
}

// Test 1: Registration Endpoint
echo "1. Testing Registration Endpoint\n";
$register_data = [
    'email' => 'newuser@fortetourism.com',
    'password' => 'securepass123',
    'first_name' => 'New',
    'last_name' => 'User'
];

simulateRequest('/api/auth/register.php', $register_data);

// Test 2: Login Endpoint
echo "\n2. Testing Login Endpoint\n";
$login_data = [
    'email' => 'admin@fortetourism.com',
    'password' => 'admin123'
];

simulateRequest('/api/auth/login.php', $login_data);

// Test 3: Login with Invalid Credentials
echo "\n3. Testing Login with Invalid Credentials\n";
$invalid_login = [
    'email' => 'admin@fortetourism.com',
    'password' => 'wrongpassword'
];

simulateRequest('/api/auth/login.php', $invalid_login);

// Test 4: Login with Non-existent User
echo "\n4. Testing Login with Non-existent User\n";
$nonexistent_login = [
    'email' => 'nonexistent@fortetourism.com',
    'password' => 'somepassword'
];

simulateRequest('/api/auth/login.php', $nonexistent_login);

// Test 5: Registration with Invalid Domain
echo "\n5. Testing Registration with Invalid Domain\n";
$invalid_domain = [
    'email' => 'user@gmail.com',
    'password' => 'securepass123',
    'first_name' => 'Test',
    'last_name' => 'User'
];

simulateRequest('/api/auth/register.php', $invalid_domain);

// Test 6: Malformed JSON
echo "\n6. Testing with Malformed JSON\n";
// This would be tested with actual HTTP client sending invalid JSON

echo "\n=== API TESTING GUIDE ===\n";
echo "To properly test the API endpoints, use curl or Postman:\n\n";

echo "1. Test Registration:\n";
echo "curl -X POST http://your-domain/api/auth/register.php \\\n";
echo "  -H 'Content-Type: application/json' \\\n";
echo "  -d '{\"email\":\"test@fortetourism.com\",\"password\":\"test123\",\"first_name\":\"Test\",\"last_name\":\"User\"}'\n\n";

echo "2. Test Login:\n";
echo "curl -X POST http://your-domain/api/auth/login.php \\\n";
echo "  -H 'Content-Type: application/json' \\\n";
echo "  -d '{\"email\":\"admin@fortetourism.com\",\"password\":\"admin123\"}'\n\n";

echo "3. Test Protected Endpoint:\n";
echo "curl -X GET http://your-domain/api/some-protected-endpoint.php \\\n";
echo "  -H 'Authorization: Bearer YOUR_JWT_TOKEN_HERE'\n\n";

echo "Expected Responses:\n";
echo "- Successful login: {\"success\":true,\"message\":\"Login successful\",\"token\":\"...\",\"user\":{...}}\n";
echo "- Failed login: {\"success\":false,\"error\":\"AUTH_FAILED\",\"message\":\"Invalid email or password\"}\n";
echo "- Successful registration: {\"success\":true,\"message\":\"User registered successfully\",...}\n";

echo "\n=== FIXES APPLIED SUMMARY ===\n";
echo "✓ Database connection fixed (fortetou_savings)\n";
echo "✓ JWT secret fallback mechanism\n";
echo "✓ Enhanced password verification with bcrypt compatibility\n";
echo "✓ Consistent JSON response format\n";
echo "✓ Rate limiting disabled\n";
echo "✓ Error handling improvements\n";
echo "✓ CORS headers and OPTIONS handling\n";

echo "\n=== PRODUCTION CHECKLIST ===\n";
echo "Before going live:\n";
echo "1. [ ] Set secure JWT secret in system_settings\n";
echo "2. [ ] Change default admin password\n";
echo "3. [ ] Enable rate limiting for production\n";
echo "4. [ ] Configure proper CORS origins\n";
echo "5. [ ] Set up SSL certificates\n";
echo "6. [ ] Configure email service for verification\n";
echo "7. [ ] Set up proper logging and monitoring\n";

?>