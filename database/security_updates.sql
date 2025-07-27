-- CRITICAL SECURITY UPDATE - Admin Password Change
-- Execute this SQL script to update the admin password
-- New password: zoSfQaLKNM6EMunM3VU9G1FHe828EhCh

UPDATE users 
SET password = '$2y$12$HvJgH8QGZp4x2YWkR6L3h.GpYhQoYfUfpWz8vHK4lOm2x5nE7dK8.' 
WHERE email = 'admin@fortetourism.com';

-- Verify the update
SELECT email, role, is_active, updated_at 
FROM users 
WHERE email = 'admin@fortetourism.com';

-- Security note: The password hash above corresponds to password: zoSfQaLKNM6EMunM3VU9G1FHe828EhCh
-- This is a temporary secure password. Change it immediately after first login.