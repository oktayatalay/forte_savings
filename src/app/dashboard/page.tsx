'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/theme-toggle';
import { ProjectsTable } from '@/components/projects-table';
import { ProjectForm } from '@/components/project-form';
import { Loader2, LogOut, Plus, FileText, Users, TrendingUp, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface DashboardStats {
  projects: {
    total: number;
    active: number;
    this_year: number;
    this_month: number;
  };
  savings: {
    total: number;
    this_year: number;
    this_month: number;
    records_count: number;
    actual_savings: number;
    cost_avoidance: number;
  };
  recent_activities: Array<{
    activity_type: string;
    project_id: number;
    frn: string;
    project_name: string;
    customer: string;
    activity_date: string;
    user_name: string;
    activity_description: string;
    formatted_date: string;
  }>;
  top_projects: Array<{
    id: number;
    frn: string;
    project_name: string;
    customer: string;
    total_savings: number;
    records_count: number;
  }>;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Kullanıcı bilgilerini localStorage'dan al
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('auth_token');

    if (!savedUser || !token) {
      router.push('/auth/login');
      return;
    }

    try {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      // Kullanıcı bilgileri yüklendikten sonra dashboard stats'ı fetch et
      fetchDashboardStats();
    } catch (err) {
      setError('Kullanıcı bilgileri okunamadı');
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const fetchDashboardStats = async () => {
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
        setDashboardStats(data.data);
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
    // Proje oluşturulduktan sonra sayfayı yenile veya listeyi güncelle
    window.location.reload(); // Basit çözüm - daha sonra optimize edilebilir
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
          <p className="text-muted-foreground">Yükleniyor...</p>
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Forte Savings</h1>
            <p className="text-sm text-muted-foreground">Tasarruf Yönetim Sistemi</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <ThemeToggle />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Çıkış
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Hoş geldiniz, {user?.first_name}!
          </h2>
          <p className="text-muted-foreground">
            Projelerinizi yönetin ve tasarruflarınızı takip edin.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Projeler</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="text-2xl font-bold animate-pulse">...</div>
              ) : (
                <div className="text-2xl font-bold">{dashboardStats?.projects.total || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {statsLoading ? 'Yükleniyor...' : 
                 dashboardStats?.projects.total === 0 ? 'Henüz proje bulunmuyor' :
                 `${dashboardStats?.projects.active || 0} aktif proje`}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bu Ay</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="text-2xl font-bold animate-pulse">...</div>
              ) : (
                <div className="text-2xl font-bold">{dashboardStats?.projects.this_month || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {statsLoading ? 'Yükleniyor...' : 'yeni proje'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Tasarruf</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="text-2xl font-bold animate-pulse">...</div>
              ) : (
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('tr-TR', {
                    style: 'currency',
                    currency: 'TRY',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(dashboardStats?.savings.total || 0)}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {statsLoading ? 'Yükleniyor...' : 
                 `${dashboardStats?.savings.records_count || 0} kayıt`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Hızlı İşlemler</CardTitle>
              <CardDescription>
                Sık kullanılan işlemleri buradan gerçekleştirebilirsiniz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Proje Listesi
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                Raporlar
              </Button>
              <Button 
                onClick={() => setShowProjectForm(true)}
                className="w-full justify-start" 
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Hızlı Proje Oluştur
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Son Aktiviteler</CardTitle>
              <CardDescription>
                Sistemimdeki son hareketler
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : dashboardStats?.recent_activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p>Henüz aktivite bulunmuyor</p>
                  <p className="text-sm">İlk projenizi oluşturarak başlayın</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardStats?.recent_activities.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3 pb-3 border-b border-border last:border-0">
                      <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {activity.activity_description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.project_name} • {activity.frn} • {activity.user_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.formatted_date}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(dashboardStats?.recent_activities.length || 0) > 5 && (
                    <div className="text-center pt-2">
                      <p className="text-xs text-muted-foreground">
                        +{(dashboardStats?.recent_activities.length || 0) - 5} daha fazla aktivite
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Projects Table */}
        <div className="mb-8">
          <ProjectsTable 
            onProjectUpdated={() => window.location.reload()} 
            onNewProject={() => setShowProjectForm(true)}
          />
        </div>

        {/* Admin Panel Link */}
        {user?.role === 'admin' && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10">
            <CardHeader>
              <CardTitle className="text-orange-800 dark:text-orange-200">
                Admin Paneli
              </CardTitle>
              <CardDescription className="text-orange-700 dark:text-orange-300">
                Sistem yönetimi ve kullanıcı kontrolü
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                Admin Paneline Git
              </Button>
            </CardContent>
          </Card>
        )}

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