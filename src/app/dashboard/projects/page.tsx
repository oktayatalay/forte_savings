'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ProjectsTable } from '@/components/projects-table';
import { ProjectForm } from '@/components/project-form';
import { EnhancedNavigation, Breadcrumbs, useBreadcrumbs } from '@/components/enhanced-navigation';
import { EnhancedSkeleton } from '@/components/loading-states';
import { GlobalSearch } from '@/components/global-search';
import { Plus, FileText, Building, TrendingUp, Users } from 'lucide-react';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface ProjectStats {
  total: number;
  active: number;
  this_month: number;
  this_year: number;
  total_savings: number;
}

export default function ProjectsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get user info from localStorage
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('auth_token');

    if (!savedUser || !token) {
      // Use window.location instead of router.push for static export compatibility
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
      return;
    }

    try {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      fetchProjectStats();
    } catch (err) {
      setError('Kullanıcı bilgileri okunamadı');
      // Use window.location instead of router.push for static export compatibility
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    // Use window.location instead of router.push for static export compatibility
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const fetchProjectStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }

      const response = await fetch('/api/dashboard/stats.php', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'İstatistikler yüklenirken hata oluştu.');
      }

      if (data.success) {
        setProjectStats({
          total: data.data.projects.total || 0,
          active: data.data.projects.active || 0,
          this_month: data.data.projects.this_month || 0,
          this_year: data.data.projects.this_year || 0,
          total_savings: data.data.savings.primary_currency_total || 0,
        });
      } else {
        setError(data.error || 'Beklenmeyen bir hata oluştu.');
      }
    } catch (err: any) {
      setError(err.message || 'Bağlantı hatası oluştu.');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleProjectCreated = (newProject: any) => {
    // Refresh the page after project creation
    window.location.reload();
  };

  const handleProjectUpdated = () => {
    // Refresh stats and project list
    fetchProjectStats();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <EnhancedSkeleton className="h-8 w-48" />
              <EnhancedSkeleton className="h-4 w-32" />
            </div>
            <EnhancedSkeleton className="h-10 w-24" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <EnhancedSkeleton key={i} className="h-32" />
            ))}
          </div>
          <EnhancedSkeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const breadcrumbs = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/projects', label: 'Projeler' }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Navigation */}
      <EnhancedNavigation 
        user={user!} 
        onLogout={handleLogout}
        notifications={3}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbs} />
        
        {/* Header Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Projeler</h1>
            <p className="text-muted-foreground">
              Tüm projelerinizi görüntüleyin ve yönetin
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden lg:block">
              <GlobalSearch placeholder="Proje ara..." />
            </div>
            <Button onClick={() => setShowProjectForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Proje
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="transition-all duration-300 hover:shadow-medium">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <FileText className="w-5 h-5" />
                Toplam Projeler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {statsLoading ? (
                  <EnhancedSkeleton className="h-8 w-16" />
                ) : (
                  projectStats?.total || 0
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {statsLoading ? 'Yükleniyor...' : 'tüm zamanlar'}
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-medium">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Building className="w-5 h-5" />
                Aktif Projeler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {statsLoading ? (
                  <EnhancedSkeleton className="h-8 w-16" />
                ) : (
                  projectStats?.active || 0
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {statsLoading ? 'Yükleniyor...' : 'devam eden'}
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-medium">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-purple-600">
                <Users className="w-5 h-5" />
                Bu Ay
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {statsLoading ? (
                  <EnhancedSkeleton className="h-8 w-16" />
                ) : (
                  projectStats?.this_month || 0
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {statsLoading ? 'Yükleniyor...' : 'yeni proje'}
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-medium">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-emerald-600">
                <TrendingUp className="w-5 h-5" />
                Toplam Tasarruf
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <EnhancedSkeleton className="h-8 w-20" />
                ) : (
                  new Intl.NumberFormat('tr-TR', {
                    style: 'currency',
                    currency: 'TRY',
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(projectStats?.total_savings || 0)
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {statsLoading ? 'Yükleniyor...' : 'birikmiş toplam'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Projects Table */}
        <Card className="transition-all duration-300 hover:shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Proje Listesi
            </CardTitle>
            <CardDescription>
              Tüm projelerinizi görüntüleyebilir, düzenleyebilir ve yeni kayıtlar ekleyebilirsiniz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectsTable 
              onProjectUpdated={handleProjectUpdated} 
              onNewProject={() => setShowProjectForm(true)}
            />
          </CardContent>
        </Card>

        {/* Project Form Modal */}
        <ProjectForm 
          open={showProjectForm}
          onOpenChange={setShowProjectForm}
          onSuccess={handleProjectCreated}
        />
      </main>
    </div>
  );
}