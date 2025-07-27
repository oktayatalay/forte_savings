'use client';

import { AdminPageWrapper } from '@/components/admin/admin-page-wrapper';
import { AuditLogs } from '@/components/admin/audit-logs';

export default function AdminAuditPage() {
  return (
    <AdminPageWrapper currentSection="audit" requiredPermission="canViewAuditLogs">
      <AuditLogs />
    </AdminPageWrapper>
  );
}