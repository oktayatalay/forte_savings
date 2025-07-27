'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminProvider, AdminGuard } from './admin-auth';
import { AdminLayout } from './admin-layout';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface AdminPageWrapperProps {
  currentSection: string;
  children: React.ReactNode;
  requiredPermission?: string;
}

export function AdminPageWrapper({ 
  currentSection, 
  children, 
  requiredPermission 
}: AdminPageWrapperProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeUser = () => {
      try {
        const savedUser = localStorage.getItem('user');
        const token = localStorage.getItem('auth_token');

        if (!savedUser || !token) {
          router.push('/auth/login');
          return;
        }

        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (err) {
        console.error('Error loading user data:', err);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push('/auth/login');
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
      <AdminGuard {...(requiredPermission && { requiredPermission: requiredPermission as any })}>
        <AdminLayout
          user={user}
          currentSection={currentSection}
          onLogout={handleLogout}
        >
          {children}
        </AdminLayout>
      </AdminGuard>
    </AdminProvider>
  );
}