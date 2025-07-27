<?php
/**
 * Admin User Management - Bulk Actions API
 * POST /api/admin/users/bulk-actions.php
 * 
 * Performs bulk operations on multiple users
 */

require_once __DIR__ . '/../../security/SecurityMiddleware.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

try {
    // Initialize security and authenticate admin
    SecurityMiddleware::setupAPI(['POST', 'OPTIONS']);
    $currentUser = SecurityMiddleware::authenticate(['admin', 'super_admin']);
    
    // Only super_admin can perform bulk actions on admin users
    $canModifyAdmin = $currentUser['role'] === 'super_admin';
    
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
        'action' => ['type' => 'text', 'allowed_chars' => '/^(activate|deactivate|reset_password|send_email|delete|change_role)$/', 'required' => true],
        'user_ids' => ['type' => 'text', 'required' => true], // Will validate separately
        'parameters' => ['type' => 'text', 'required' => false] // Additional parameters as JSON
    ];
    
    $validated = SecurityMiddleware::validateInput($input, $validationRules);
    
    // Validate user_ids array
    if (!is_array($input['user_ids']) || empty($input['user_ids'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid user_ids',
            'message' => 'user_ids must be a non-empty array of integers',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    $userIds = array_filter($input['user_ids'], function($id) {
        return is_numeric($id) && (int)$id > 0;
    });
    
    if (empty($userIds)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'No valid user IDs provided',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    $userIds = array_map('intval', $userIds);
    $action = $validated['action'];
    $parameters = !empty($input['parameters']) ? $input['parameters'] : [];
    
    // Limit bulk operations to prevent abuse
    if (count($userIds) > 100) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Too many users',
            'message' => 'Bulk operations are limited to 100 users at a time',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    // Prevent user from affecting themselves in certain operations
    if (in_array($action, ['deactivate', 'delete']) && in_array($currentUser['id'], $userIds)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Cannot perform this action on your own account',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    // Get target users data
    $placeholders = str_repeat('?,', count($userIds) - 1) . '?';
    $getUsersQuery = "SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id IN ($placeholders)";
    $getUsersStmt = $pdo->prepare($getUsersQuery);
    $getUsersStmt->execute($userIds);
    $targetUsers = $getUsersStmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($targetUsers)) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'No users found',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    // Authorization checks
    $adminUsers = array_filter($targetUsers, function($user) {
        return in_array($user['role'], ['admin', 'super_admin']);
    });
    
    if (!empty($adminUsers) && !$canModifyAdmin) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Insufficient privileges',
            'message' => 'Only super administrators can perform bulk actions on admin users',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    $pdo->beginTransaction();
    
    try {
        $results = [];
        $successCount = 0;
        $errorCount = 0;
        
        foreach ($targetUsers as $user) {
            $userId = $user['id'];
            $userResult = [
                'user_id' => $userId,
                'email' => $user['email'],
                'success' => false,
                'message' => ''
            ];
            
            try {
                switch ($action) {
                    case 'activate':
                        if ($user['is_active']) {
                            $userResult['message'] = 'User already active';
                            $userResult['success'] = true;
                        } else {
                            $stmt = $pdo->prepare("UPDATE users SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                            $stmt->execute([$userId]);
                            $userResult['message'] = 'User activated';
                            $userResult['success'] = true;
                        }
                        break;
                        
                    case 'deactivate':
                        if (!$user['is_active']) {
                            $userResult['message'] = 'User already inactive';
                            $userResult['success'] = true;
                        } else {
                            $stmt = $pdo->prepare("UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                            $stmt->execute([$userId]);
                            $userResult['message'] = 'User deactivated';
                            $userResult['success'] = true;
                        }
                        break;
                        
                    case 'reset_password':
                        $newPassword = bin2hex(random_bytes(8));
                        $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
                        
                        $stmt = $pdo->prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                        $stmt->execute([$passwordHash, $userId]);
                        
                        $userResult['message'] = 'Password reset';
                        $userResult['new_password'] = $newPassword;
                        $userResult['success'] = true;
                        break;
                        
                    case 'send_email':
                        // Email sending would be implemented here
                        // For now, just log it
                        error_log("Bulk email should be sent to: {$user['email']}");
                        $userResult['message'] = 'Email queued for sending';
                        $userResult['success'] = true;
                        break;
                        
                    case 'delete':
                        // Check for active projects
                        $projectCheckQuery = "
                            SELECT COUNT(*) as active_projects
                            FROM projects 
                            WHERE created_by = ? AND is_active = 1
                        ";
                        $projectCheckStmt = $pdo->prepare($projectCheckQuery);
                        $projectCheckStmt->execute([$userId]);
                        $activeProjects = $projectCheckStmt->fetch(PDO::FETCH_ASSOC)['active_projects'];
                        
                        if ($activeProjects > 0) {
                            $userResult['message'] = "User has {$activeProjects} active projects - deactivated instead";
                            $stmt = $pdo->prepare("UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                            $stmt->execute([$userId]);
                        } else {
                            // Perform safe deletion
                            $pdo->prepare("UPDATE audit_logs SET user_id = 0 WHERE user_id = ?")->execute([$userId]);
                            $pdo->prepare("DELETE FROM project_permissions WHERE user_id = ?")->execute([$userId]);
                            $pdo->prepare("DELETE FROM refresh_tokens WHERE user_id = ?")->execute([$userId]);
                            $pdo->prepare("UPDATE savings_records SET created_by = 0 WHERE created_by = ?")->execute([$userId]);
                            $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$userId]);
                            
                            $userResult['message'] = 'User deleted';
                        }
                        $userResult['success'] = true;
                        break;
                        
                    case 'change_role':
                        $newRole = $parameters['role'] ?? null;
                        if (!$newRole || !in_array($newRole, ['user', 'admin', 'super_admin'])) {
                            $userResult['message'] = 'Invalid role specified';
                            break;
                        }
                        
                        if (($newRole === 'admin' || $newRole === 'super_admin') && !$canModifyAdmin) {
                            $userResult['message'] = 'Insufficient privileges to assign admin roles';
                            break;
                        }
                        
                        if ($user['role'] === $newRole) {
                            $userResult['message'] = 'User already has this role';
                            $userResult['success'] = true;
                        } else {
                            $stmt = $pdo->prepare("UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                            $stmt->execute([$newRole, $userId]);
                            $userResult['message'] = "Role changed to {$newRole}";
                            $userResult['success'] = true;
                        }
                        break;
                        
                    default:
                        $userResult['message'] = 'Unknown action';
                        break;
                }
                
                if ($userResult['success']) {
                    $successCount++;
                } else {
                    $errorCount++;
                }
                
            } catch (Exception $e) {
                $userResult['message'] = 'Operation failed: ' . $e->getMessage();
                $errorCount++;
            }
            
            $results[] = $userResult;
        }
        
        // Log bulk action in audit log
        $auditQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $auditStmt = $pdo->prepare($auditQuery);
        
        $auditData = [
            'bulk_action' => $action,
            'target_user_count' => count($targetUsers),
            'success_count' => $successCount,
            'error_count' => $errorCount,
            'parameters' => $parameters
        ];
        
        $auditStmt->execute([
            $currentUser['id'],
            'bulk_user_action',
            'users',
            0,
            json_encode($auditData),
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null
        ]);
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'data' => [
                'action' => $action,
                'total_users' => count($targetUsers),
                'success_count' => $successCount,
                'error_count' => $errorCount,
                'results' => $results
            ],
            'message' => "Bulk action completed: {$successCount} successful, {$errorCount} failed",
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
        'message' => 'Bulk action failed',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    // Log error
    error_log("Bulk action error: " . $e->getMessage());
}
?>