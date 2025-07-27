'use client';

import { AdminPageWrapper } from '@/components/admin/admin-page-wrapper';
import { AnalyticsReports } from '@/components/admin/analytics-reports';

export default function AdminAnalyticsPage() {
  return (
    <AdminPageWrapper currentSection="analytics" requiredPermission="canViewAnalytics">
      <AnalyticsReports />
    </AdminPageWrapper>
  );
}