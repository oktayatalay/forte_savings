<?php
/**
 * Admin User Management - Delete/Deactivate User API
 * DELETE /api/admin/users/delete.php
 * 
 * Deactivates or permanently deletes users
 */

require_once __DIR__ . '/../../security/SecurityMiddleware.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

try {
    // Initialize security and authenticate admin
    SecurityMiddleware::setupAPI(['DELETE', 'POST', 'OPTIONS']);
    $currentUser = SecurityMiddleware::authenticate(['admin', 'super_admin']);
    
    // Only super_admin can delete admin users
    $canDeleteAdmin = $currentUser['role'] === 'super_admin';
    
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
        'id' => ['type' => 'integer', 'min' => 1, 'required' => true],
        'action' => ['type' => 'text', 'allowed_chars' => '/^(deactivate|delete)$/', 'required' => false],
        'reason' => ['type' => 'text', 'max_length' => 500, 'required' => false]
    ];
    
    $validated = SecurityMiddleware::validateInput($input, $validationRules);
    $userId = $validated['id'];
    $action = $validated['action'] ?? 'deactivate'; // Default to deactivate for safety
    $reason = $validated['reason'] ?? '';
    
    // Get target user data
    $getUserQuery = "SELECT * FROM users WHERE id = ?";
    $getUserStmt = $pdo->prepare($getUserQuery);
    $getUserStmt->execute([$userId]);
    $targetUser = $getUserStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$targetUser) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'User not found',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    // Authorization checks
    if ($targetUser['role'] === 'super_admin' && !$canDeleteAdmin) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Insufficient privileges',
            'message' => 'Only super administrators can delete super admin users',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    if ($targetUser['role'] === 'admin' && !$canDeleteAdmin) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Insufficient privileges',
            'message' => 'Only super administrators can delete admin users',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    // Prevent self-deletion
    if ($userId === $currentUser['id']) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Cannot delete own account',
            'message' => 'Users cannot delete their own account',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    // Check if user has active projects that would be affected
    $projectCheckQuery = "
        SELECT COUNT(*) as active_projects
        FROM projects 
        WHERE (created_by = ? OR forte_responsible = ? OR project_director = ?) 
        AND is_active = 1
    ";
    $projectCheckStmt = $pdo->prepare($projectCheckQuery);
    $projectCheckStmt->execute([
        $userId, 
        $targetUser['first_name'] . ' ' . $targetUser['last_name'],
        $targetUser['first_name'] . ' ' . $targetUser['last_name']
    ]);
    $activeProjects = $projectCheckStmt->fetch(PDO::FETCH_ASSOC)['active_projects'];
    
    // Warn about active projects
    if ($activeProjects > 0 && $action === 'delete') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'User has active projects',
            'message' => "User has {$activeProjects} active projects. Please reassign or complete them before deletion, or use deactivation instead.",
            'data' => [
                'active_projects' => (int)$activeProjects,
                'suggested_action' => 'deactivate'
            ],
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    $pdo->beginTransaction();
    
    try {
        if ($action === 'deactivate') {
            // Deactivate user (soft delete)
            $updateQuery = "UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
            $updateStmt = $pdo->prepare($updateQuery);
            $updateStmt->execute([$userId]);
            
            $actionMessage = 'User deactivated successfully';
            $auditAction = 'user_deactivated';
            
        } else {
            // Hard delete - remove user and related data
            
            // First, anonymize audit logs (keep logs but remove user reference)
            $anonymizeAuditQuery = "UPDATE audit_logs SET user_id = 0 WHERE user_id = ?";
            $anonymizeAuditStmt = $pdo->prepare($anonymizeAuditQuery);
            $anonymizeAuditStmt->execute([$userId]);
            
            // Remove project permissions
            $deletePermissionsQuery = "DELETE FROM project_permissions WHERE user_id = ?";
            $deletePermissionsStmt = $pdo->prepare($deletePermissionsQuery);
            $deletePermissionsStmt->execute([$userId]);
            
            // Remove refresh tokens
            $deleteTokensQuery = "DELETE FROM refresh_tokens WHERE user_id = ?";
            $deleteTokensStmt = $pdo->prepare($deleteTokensQuery);
            $deleteTokensStmt->execute([$userId]);
            
            // Update projects to remove user reference
            $updateProjectsQuery = "
                UPDATE projects 
                SET forte_responsible = CONCAT(forte_responsible, ' (Deleted User)')
                WHERE created_by = ?
            ";
            $updateProjectsStmt = $pdo->prepare($updateProjectsQuery);
            $updateProjectsStmt->execute([$userId]);
            
            // Update savings records to remove user reference
            $updateSavingsQuery = "UPDATE savings_records SET created_by = 0 WHERE created_by = ?";
            $updateSavingsStmt = $pdo->prepare($updateSavingsQuery);
            $updateSavingsStmt->execute([$userId]);
            
            // Finally, delete the user
            $deleteUserQuery = "DELETE FROM users WHERE id = ?";
            $deleteUserStmt = $pdo->prepare($deleteUserQuery);
            $deleteUserStmt->execute([$userId]);
            
            $actionMessage = 'User permanently deleted';
            $auditAction = 'user_deleted';
        }
        
        // Log action in audit log
        $auditQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $auditStmt = $pdo->prepare($auditQuery);
        
        $auditData = [
            'target_user_email' => $targetUser['email'],
            'target_user_role' => $targetUser['role'],
            'action_type' => $action,
            'reason' => $reason,
            'active_projects_count' => (int)$activeProjects
        ];
        
        $auditStmt->execute([
            $currentUser['id'],
            $auditAction,
            'users',
            $userId,
            json_encode($targetUser),
            json_encode($auditData),
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null
        ]);
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'data' => [
                'user_id' => $userId,
                'action' => $action,
                'affected_projects' => (int)$activeProjects
            ],
            'message' => $actionMessage,
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
        'message' => 'User deletion/deactivation failed',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    // Log error
    error_log("User deletion error: " . $e->getMessage());
}
?>