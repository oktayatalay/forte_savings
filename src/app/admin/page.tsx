'use client';

import { AdminPageWrapper } from '@/components/admin/admin-page-wrapper';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

export default function AdminPage() {
  const handleRefresh = async () => {
    // Refresh dashboard data
    console.log('Refreshing dashboard data...');
  };

  return (
    <AdminPageWrapper currentSection="dashboard">
      <AdminDashboard onRefresh={handleRefresh} />
    </AdminPageWrapper>
  );
}