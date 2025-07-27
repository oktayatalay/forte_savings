'use client';

import { AdminPageWrapper } from '@/components/admin/admin-page-wrapper';
import { UserManagement } from '@/components/admin/user-management';

export default function AdminUsersPage() {
  return (
    <AdminPageWrapper currentSection="users" requiredPermission="canManageUsers">
      <UserManagement />
    </AdminPageWrapper>
  );
}