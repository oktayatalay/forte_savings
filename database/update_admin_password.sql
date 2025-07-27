-- Update admin password for security compliance
-- New password: ForteSec2025_29f50eacf3da021d
-- This file should be deleted after running the update

UPDATE users 
SET password_hash = '$2b$12$W175x8e/xkk3DfbOgwicf.Z0rohjsglK7d19GwLdGyLNSP/7Oy/7e'
WHERE email = 'admin@fortetourism.com' AND role = 'admin';

-- Verify the update
SELECT email, role, password_hash, updated_at 
FROM users 
WHERE email = 'admin@fortetourism.com' AND role = 'admin';