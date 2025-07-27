'use client';

import { AdminPageWrapper } from '@/components/admin/admin-page-wrapper';
import { SystemSettings } from '@/components/admin/system-settings';

export default function AdminSettingsPage() {
  return (
    <AdminPageWrapper currentSection="settings" requiredPermission="canEditSystemSettings">
      <SystemSettings />
    </AdminPageWrapper>
  );
}