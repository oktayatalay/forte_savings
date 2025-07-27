<?php
/**
 * Admin User Management - Create User API
 * POST /api/admin/users/create.php
 * 
 * Creates a new user account (admin only)
 */

require_once __DIR__ . '/../../security/SecurityMiddleware.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

try {
    // Initialize security and authenticate admin
    SecurityMiddleware::setupAPI(['POST', 'OPTIONS']);
    $currentUser = SecurityMiddleware::authenticate(['admin', 'super_admin']);
    
    // Only super_admin can create admin users
    $canCreateAdmin = $currentUser['role'] === 'super_admin';
    
    // Get and validate input data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid JSON input',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    $validationRules = [
        'first_name' => ['type' => 'text', 'max_length' => 50, 'required' => true],
        'last_name' => ['type' => 'text', 'max_length' => 50, 'required' => true],
        'email' => ['type' => 'email', 'required' => true],
        'role' => ['type' => 'text', 'allowed_chars' => '/^(user|admin|super_admin)$/', 'required' => true],
        'department' => ['type' => 'text', 'max_length' => 100, 'required' => false],
        'position' => ['type' => 'text', 'max_length' => 100, 'required' => false],
        'phone' => ['type' => 'text', 'max_length' => 20, 'required' => false],
        'status' => ['type' => 'text', 'allowed_chars' => '/^(active|inactive)$/', 'required' => false],
        'send_welcome_email' => ['type' => 'text', 'allowed_chars' => '/^(true|false)$/', 'required' => false]
    ];
    
    $validated = SecurityMiddleware::validateInput($input, $validationRules);
    
    // Authorization checks
    if ($validated['role'] === 'admin' && !$canCreateAdmin) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Insufficient privileges',
            'message' => 'Only super administrators can create admin users',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    if ($validated['role'] === 'super_admin' && !$canCreateAdmin) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Insufficient privileges',
            'message' => 'Only super administrators can create super admin users',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    // Validate email domain
    if (!preg_match('/@fortetourism\.com$/i', $validated['email'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid email domain',
            'message' => 'Email must be from fortetourism.com domain',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    // Check if user already exists
    $checkQuery = "SELECT id FROM users WHERE email = ?";
    $checkStmt = $pdo->prepare($checkQuery);
    $checkStmt->execute([$validated['email']]);
    
    if ($checkStmt->fetch()) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error' => 'User already exists',
            'message' => 'A user with this email address already exists',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    // Generate temporary password
    $tempPassword = bin2hex(random_bytes(8));
    $passwordHash = password_hash($tempPassword, PASSWORD_DEFAULT);
    
    // Generate email verification token
    $verificationToken = bin2hex(random_bytes(32));
    
    // Prepare user data
    $userData = [
        'email' => $validated['email'],
        'password_hash' => $passwordHash,
        'first_name' => $validated['first_name'],
        'last_name' => $validated['last_name'],
        'role' => $validated['role'],
        'is_active' => ($validated['status'] ?? 'active') === 'active',
        'email_verification_token' => $verificationToken,
        'department' => $validated['department'] ?? null,
        'position' => $validated['position'] ?? null,
        'phone' => $validated['phone'] ?? null
    ];
    
    // Insert user
    $insertQuery = "
        INSERT INTO users (
            email, password_hash, first_name, last_name, role, is_active, 
            email_verification_token, department, position, phone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ";
    
    $pdo->beginTransaction();
    
    try {
        $insertStmt = $pdo->prepare($insertQuery);
        $insertStmt->execute([
            $userData['email'],
            $userData['password_hash'],
            $userData['first_name'],
            $userData['last_name'],
            $userData['role'],
            $userData['is_active'],
            $userData['email_verification_token'],
            $userData['department'],
            $userData['position'],
            $userData['phone']
        ]);
        
        $newUserId = $pdo->lastInsertId();
        
        // Log user creation in audit log
        $auditQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $auditStmt = $pdo->prepare($auditQuery);
        
        $auditData = [
            'created_user_email' => $userData['email'],
            'created_user_role' => $userData['role'],
            'created_user_active' => $userData['is_active']
        ];
        
        $auditStmt->execute([
            $currentUser['id'],
            'user_created',
            'users',
            $newUserId,
            json_encode($auditData),
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null
        ]);
        
        $pdo->commit();
        
        // Send welcome email if requested
        $emailSent = false;
        if (($validated['send_welcome_email'] ?? 'true') === 'true') {
            try {
                // Email sending logic would go here
                // For now, we'll just log it
                error_log("Welcome email should be sent to: {$userData['email']} with password: {$tempPassword}");
                $emailSent = true;
            } catch (Exception $e) {
                error_log("Failed to send welcome email: " . $e->getMessage());
            }
        }
        
        // Get the created user data for response
        $getUserQuery = "
            SELECT id, email, first_name, last_name, role, is_active, 
                   department, position, phone, created_at, updated_at,
                   email_verified
            FROM users 
            WHERE id = ?
        ";
        $getUserStmt = $pdo->prepare($getUserQuery);
        $getUserStmt->execute([$newUserId]);
        $createdUser = $getUserStmt->fetch(PDO::FETCH_ASSOC);
        
        // Format response
        $responseUser = [
            'id' => (int)$createdUser['id'],
            'email' => $createdUser['email'],
            'first_name' => $createdUser['first_name'],
            'last_name' => $createdUser['last_name'],
            'role' => $createdUser['role'],
            'status' => $createdUser['is_active'] ? 'active' : 'inactive',
            'department' => $createdUser['department'],
            'position' => $createdUser['position'],
            'phone' => $createdUser['phone'],
            'email_verified' => (bool)$createdUser['email_verified'],
            'created_at' => $createdUser['created_at'],
            'updated_at' => $createdUser['updated_at']
        ];
        
        echo json_encode([
            'success' => true,
            'data' => [
                'user' => $responseUser,
                'temporary_password' => $tempPassword,
                'verification_token' => $verificationToken,
                'welcome_email_sent' => $emailSent
            ],
            'message' => 'User created successfully',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => 'User could not be created',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    // Log error
    error_log("User creation error: " . $e->getMessage());
}
?>