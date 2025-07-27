'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/admin-layout';
import { SystemSettings } from '@/components/admin/system-settings';
import { AdminProvider, AdminGuard } from '@/components/admin/admin-auth';
import { useAuth, AuthManager } from '@/lib/auth';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export default function AdminSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const userData = await AuthManager.getUserData();
        if (userData) {
          setUser(userData);
        } else {
          window.location.href = '/auth/login';
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        window.location.href = '/auth/login';
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  const handleLogout = async () => {
    try {
      await AuthManager.clearTokens();
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Oturum Bulunamadı</h2>
          <p className="text-muted-foreground mb-4">Lütfen giriş yapın.</p>
          <a href="/auth/login" className="text-primary underline">
            Giriş Sayfasına Git
          </a>
        </div>
      </div>
    );
  }

  return (
    <AdminProvider user={user}>
      <AdminGuard requiredPermission="canEditSystemSettings">
        <AdminLayout
          user={user}
          currentSection="settings"
          onLogout={handleLogout}
        >
          <SystemSettings />
        </AdminLayout>
      </AdminGuard>
    </AdminProvider>
  );
}