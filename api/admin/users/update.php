<?php
header('Content-Type: application/json');

require_once '../../config/database.php';
require_once '../../security/SecurityMiddleware.php';

// Initialize security middleware
SecurityMiddleware::init(['enable_csrf' => false]);
SecurityMiddleware::apply('admin', ['allowed_methods' => ['PUT', 'OPTIONS']]);
$user = SecurityMiddleware::authenticate(['admin', 'super_admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
    exit;
}

// Validate required fields
$userId = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
if (!$userId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Valid user ID is required']);
    exit;
}

try {
    $pdo = getDbConnection();
    
    // Check if user exists
    $checkUserSql = "SELECT id, email, role FROM users WHERE id = ?";
    $checkStmt = $pdo->prepare($checkUserSql);
    $checkStmt->execute([$userId]);
    $existingUser = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existingUser) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit;
    }
    
    // Validate input data
    $updateData = [];
    $auditChanges = [];
    
    // Validate and update first_name
    if (isset($input['first_name'])) {
        $firstName = $security->sanitizeInput(trim($input['first_name']));
        if (empty($firstName)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'First name cannot be empty']);
            exit;
        }
        $updateData['first_name'] = $firstName;
    }
    
    // Validate and update last_name
    if (isset($input['last_name'])) {
        $lastName = $security->sanitizeInput(trim($input['last_name']));
        if (empty($lastName)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Last name cannot be empty']);
            exit;
        }
        $updateData['last_name'] = $lastName;
    }
    
    // Validate and update email
    if (isset($input['email'])) {
        $email = trim($input['email']);
        if (!$security->validateEmail($email)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid email format']);
            exit;
        }
        
        // Check if email already exists (for other users)
        $emailCheckSql = "SELECT id FROM users WHERE email = ? AND id != ?";
        $emailStmt = $pdo->prepare($emailCheckSql);
        $emailStmt->execute([$email, $userId]);
        if ($emailStmt->fetchColumn()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Email already exists']);
            exit;
        }
        
        $updateData['email'] = $email;
        if ($existingUser['email'] !== $email) {
            $auditChanges['email'] = ['from' => $existingUser['email'], 'to' => $email];
        }
    }
    
    // Validate and update role
    if (isset($input['role'])) {
        $role = trim($input['role']);
        $allowedRoles = ['user', 'admin', 'super_admin'];
        
        if (!in_array($role, $allowedRoles)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid role']);
            exit;
        }
        
        // Check if current admin has permission to assign this role
        $currentUser = $security->getCurrentUser();
        if ($role === 'super_admin' && $currentUser['role'] !== 'super_admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Only super admins can assign super admin role']);
            exit;
        }
        
        $updateData['role'] = $role;
        if ($existingUser['role'] !== $role) {
            $auditChanges['role'] = ['from' => $existingUser['role'], 'to' => $role];
        }
    }
    
    // Validate and update status
    if (isset($input['status'])) {
        $status = trim($input['status']);
        $allowedStatuses = ['active', 'inactive', 'suspended'];
        
        if (!in_array($status, $allowedStatuses)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid status']);
            exit;
        }
        
        $updateData['status'] = $status;
    }
    
    // Validate and update department
    if (isset($input['department'])) {
        $department = $security->sanitizeInput(trim($input['department']));
        $updateData['department'] = $department ?: null;
    }
    
    // Validate and update position
    if (isset($input['position'])) {
        $position = $security->sanitizeInput(trim($input['position']));
        $updateData['position'] = $position ?: null;
    }
    
    // Validate and update phone
    if (isset($input['phone'])) {
        $phone = $security->sanitizeInput(trim($input['phone']));
        $updateData['phone'] = $phone ?: null;
    }
    
    // If no updates provided
    if (empty($updateData)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No valid update data provided']);
        exit;
    }
    
    // Add updated_at timestamp
    $updateData['updated_at'] = date('Y-m-d H:i:s');
    
    // Build update query
    $setParts = [];
    $params = [];
    
    foreach ($updateData as $field => $value) {
        $setParts[] = "$field = ?";
        $params[] = $value;
    }
    $params[] = $userId; // For WHERE clause
    
    $updateSql = "UPDATE users SET " . implode(', ', $setParts) . " WHERE id = ?";
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Update user
        $updateStmt = $pdo->prepare($updateSql);
        $updateStmt->execute($params);
        
        // Log audit trail
        if (!empty($auditChanges)) {
            $auditSql = "INSERT INTO audit_logs (user_id, action, resource_type, resource_id, description, metadata, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)";
            $auditStmt = $pdo->prepare($auditSql);
            
            $description = "User profile updated";
            if (isset($auditChanges['role'])) {
                $description = "User role changed from {$auditChanges['role']['from']} to {$auditChanges['role']['to']}";
            } elseif (isset($auditChanges['email'])) {
                $description = "User email changed from {$auditChanges['email']['from']} to {$auditChanges['email']['to']}";
            }
            
            $auditStmt->execute([
                $security->getCurrentUser()['id'],
                'update',
                'user',
                $userId,
                $description,
                json_encode($auditChanges),
                $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ]);
        }
        
        $pdo->commit();
        
        // Get updated user data
        $getUserSql = "
            SELECT 
                id, email, first_name, last_name, role, status, 
                department, position, phone, created_at, updated_at, last_login
            FROM users 
            WHERE id = ?
        ";
        $getUserStmt = $pdo->prepare($getUserSql);
        $getUserStmt->execute([$userId]);
        $updatedUser = $getUserStmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'User updated successfully',
            'data' => [
                'id' => (int)$updatedUser['id'],
                'email' => $updatedUser['email'],
                'first_name' => $updatedUser['first_name'],
                'last_name' => $updatedUser['last_name'],
                'role' => $updatedUser['role'],
                'status' => $updatedUser['status'],
                'department' => $updatedUser['department'],
                'position' => $updatedUser['position'],
                'phone' => $updatedUser['phone'],
                'created_at' => $updatedUser['created_at'],
                'updated_at' => $updatedUser['updated_at'],
                'last_login' => $updatedUser['last_login']
            ]
        ]);
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log('Admin user update error: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'User update failed'
    ]);
}
?>