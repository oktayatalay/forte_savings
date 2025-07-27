# Forte Savings - Production Setup Instructions

## Database Configuration Required

### 1. Admin Password Update

The default admin password (`admin123`) needs to be changed for security.

**Database:** `fortetou_savings`
**Action:** Update admin user password

**SQL Command:**
```sql
UPDATE users 
SET password_hash = '$2b$12$W175x8e/xkk3DfbOgwicf.Z0rohjsglK7d19GwLdGyLNSP/7Oy/7e'
WHERE email = 'admin@fortetourism.com' AND role = 'admin';
```

**New Login Credentials:**
- Email: `admin@fortetourism.com`
- Password: `ForteSecure2025!`

### 2. SMTP Configuration

**IMPORTANT:** Change the SMTP password on `corporate.forte.works` mail server:
- Current password in git history: `ForteTourism2025` (COMPROMISED)
- Update server password and GitHub secrets accordingly

### 3. Environment Variables

Ensure `.env` file contains secure values (not the exposed ones):
```bash
SMTP_PASS=[NEW_SECURE_PASSWORD_FROM_SERVER]
```

### 4. Verification

After running the SQL update, verify login works with new credentials at:
https://savings.forte.works/auth/login

## Security Notes

- ✅ All security fixes applied in code
- ✅ Hardcoded credentials removed 
- ✅ SSL verification enabled
- ⚠️ Database update required for admin password
- ⚠️ SMTP server password change required

Delete this file after setup completion.