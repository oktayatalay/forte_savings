'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

interface AuthWrapperProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Authentication wrapper component that securely checks authentication status
 * and redirects unauthenticated users
 */
export function AuthWrapper({ children, redirectTo = '/auth/login' }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await auth.isAuthenticated();
        setIsAuthenticated(authenticated);
        
        if (!authenticated) {
          router.push(redirectTo);
        }
      } catch (error) {
        setIsAuthenticated(false);
        router.push(redirectTo);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [auth, router, redirectTo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
          <p className="text-muted-foreground">Kimlik doğrulanıyor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return <>{children}</>;
}

/**
 * Higher-order component for protecting pages
 */
export function withAuth<T extends object>(Component: React.ComponentType<T>, redirectTo?: string) {
  return function AuthenticatedComponent(props: T) {
    return (
      <AuthWrapper redirectTo={redirectTo}>
        <Component {...props} />
      </AuthWrapper>
    );
  };
}