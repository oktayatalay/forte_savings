'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProjectsTable } from '@/components/projects-table';
import { ProjectForm } from '@/components/project-form';
import { EnhancedStatsCard, StatsGrid } from '@/components/enhanced-stats-card';
import { SavingsTrendChart, SavingsComparisonChart, CurrencyDistributionChart, InteractiveChartWrapper, generateSampleChartData } from '@/components/chart-components';
import { EnhancedNavigation, Breadcrumbs, useBreadcrumbs } from '@/components/enhanced-navigation';
import { EnhancedSkeleton } from '@/components/loading-states';
import { CurrencyMiniCards, CurrencyCards } from '@/components/currency-cards';
import { Loader2, LogOut, Plus, FileText, Users, TrendingUp, Building, DollarSign, Clock, BarChart3, PieChart, Calendar } from 'lucide-react';
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
    by_currency: Array<{
      currency: string;
      savings: number;
      cost_avoidance: number;
      total: number;
      record_count: number;
    }>;
    total_records: number;
    primary_currency_total: number;
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
  const [chartPeriod, setChartPeriod] = useState('12months');
  const [chartData, setChartData] = useState(generateSampleChartData(12));
  const [realChartData, setRealChartData] = useState<any>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [periodLabel, setPeriodLabel] = useState('Son 12 Ay');
  const router = useRouter();

  useEffect(() => {
    // Kullanıcı bilgilerini localStorage'dan al
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
      
      // Load saved chart period preference
      const savedPeriod = localStorage.getItem('chart_period_preference') || '12months';
      setChartPeriod(savedPeriod);
      
      // Kullanıcı bilgileri yüklendikten sonra dashboard stats'ı ve chart data'sını fetch et
      fetchDashboardStats();
      fetchChartData(savedPeriod);
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

  const fetchChartData = async (period: string) => {
    setChartLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      // Fetch real trend data from API
      const response = await fetch(`/api/dashboard/trend-data.php?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setRealChartData(data.data.chart_data);
        setPeriodLabel(data.data.summary.period_label);
      } else {
        console.error('Failed to fetch trend data:', data.error);
        // Fallback to sample data
        setRealChartData(generateSampleChartData(12));
        setPeriodLabel('Son 12 Ay');
      }
      
      // Save period preference
      localStorage.setItem('chart_period_preference', period);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      // Fallback to sample data on error
      setRealChartData(generateSampleChartData(12));
      setPeriodLabel('Son 12 Ay');
    } finally {
      setChartLoading(false);
    }
  };

  const handlePeriodChange = (period: string) => {
    setChartPeriod(period);
    fetchChartData(period);
  };

  const handleProjectCreated = (newProject: any) => {
    // Proje oluşturulduktan sonra sayfayı yenile veya listeyi güncelle
    window.location.reload(); // Basit çözüm - daha sonra optimize edilebilir
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
          <StatsGrid>
            {[1, 2, 3, 4].map((i) => (
              <EnhancedStatsCard
                key={i}
                title=""
                value=""
                icon={FileText}
                loading={true}
              />
            ))}
          </StatsGrid>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EnhancedSkeleton className="h-96" />
            <EnhancedSkeleton className="h-96" />
          </div>
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

  const breadcrumbs = useBreadcrumbs();

  // Prepare currency chart data
  const currencyData = dashboardStats?.savings.by_currency.map((item, index) => ({
    currency: item.currency,
    total: item.total,
    color: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'][index % 4]
  })) || [];

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
        
        {/* Welcome Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">
              Hoş geldiniz, {user?.first_name}!
            </h2>
            <p className="text-muted-foreground">
              Projelerinizi yönetin ve tasarruflarınızı takip edin.
            </p>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <StatsGrid columns={4} className="mb-8">
          <EnhancedStatsCard
            title="Toplam Projeler"
            value={dashboardStats?.projects.total || 0}
            icon={FileText}
            iconColor="text-blue-600"
            description={statsLoading ? 'Yükleniyor...' : 
                        dashboardStats?.projects.total === 0 ? 'Henüz proje bulunmuyor' :
                        `${dashboardStats?.projects.active || 0} aktif proje`}
            loading={statsLoading}
            variant="gradient"
            change={{
              value: 12,
              type: 'increase',
              period: 'bu ay'
            }}
            interactive={true}
            onClick={() => {
              const projectsSection = document.querySelector('[data-projects-table]');
              if (projectsSection) {
                projectsSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          />
          
          <EnhancedStatsCard
            title="Bu Ay"
            value={dashboardStats?.projects.this_month || 0}
            icon={Calendar}
            iconColor="text-green-600"
            description={statsLoading ? 'Yükleniyor...' : 'yeni proje'}
            loading={statsLoading}
            variant="modern"
            progress={{
              value: dashboardStats?.projects.this_month || 0,
              max: 10,
              label: 'Aylık hedef'
            }}
          />
          
          <Card className="col-span-1 transition-all duration-300 hover:shadow-medium bg-gradient-to-br from-green-50 via-green-50 to-green-100 border-green-200 dark:from-green-900/20 dark:to-green-800/20 dark:border-green-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-600">
                <TrendingUp className="w-5 h-5" />
                Tasarruf
              </CardTitle>
              <CardDescription>
                {statsLoading ? 'Yükleniyor...' : 
                `Sadece tasarruf kayıtları`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-2">
                  <EnhancedSkeleton className="h-6 w-20" />
                  <EnhancedSkeleton className="h-4 w-16" />
                </div>
              ) : (
                <div className="space-y-1">
                  {dashboardStats?.savings.by_currency
                    ?.filter(item => item.savings > 0)
                    .map(item => (
                      <div key={item.currency} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{item.currency}</span>
                        <span className="font-bold text-green-600">
                          {new Intl.NumberFormat('tr-TR', {
                            style: 'currency',
                            currency: item.currency,
                            notation: 'compact',
                            maximumFractionDigits: 0
                          }).format(item.savings)}
                        </span>
                      </div>
                    )) || <div className="text-sm text-muted-foreground">Henüz tasarruf kaydı yok</div>}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="col-span-1 transition-all duration-300 hover:shadow-medium bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <DollarSign className="w-5 h-5" />
                Maliyet Engelleme
              </CardTitle>
              <CardDescription>
                {statsLoading ? 'Yükleniyor...' : 
                `Sadece maliyet engelleme kayıtları`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-2">
                  <EnhancedSkeleton className="h-6 w-20" />
                  <EnhancedSkeleton className="h-4 w-16" />
                </div>
              ) : (
                <div className="space-y-1">
                  {dashboardStats?.savings.by_currency
                    ?.filter(item => item.cost_avoidance > 0)
                    .map(item => (
                      <div key={item.currency} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{item.currency}</span>
                        <span className="font-bold text-blue-600">
                          {new Intl.NumberFormat('tr-TR', {
                            style: 'currency',
                            currency: item.currency,
                            notation: 'compact',
                            maximumFractionDigits: 0
                          }).format(item.cost_avoidance)}
                        </span>
                      </div>
                    )) || <div className="text-sm text-muted-foreground">Henüz maliyet engelleme kaydı yok</div>}
                </div>
              )}
            </CardContent>
          </Card>
        </StatsGrid>


        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <InteractiveChartWrapper
            onPeriodChange={handlePeriodChange}
            selectedPeriod={chartPeriod}
            periodLabel={periodLabel}
            periods={[
              { label: 'Son 7 Gün', value: '7days' },
              { label: 'Son 30 Gün', value: '30days' },
              { label: 'Son 3 Ay', value: '3months' },
              { label: 'Son 6 Ay', value: '6months' },
              { label: 'Son 12 Ay', value: '12months' },
            ]}
          >
            <div className="relative">
              {chartLoading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="text-sm text-muted-foreground">Yükleniyor...</div>
                </div>
              )}
              <SavingsTrendChart
                data={realChartData || chartData}
                title="Tasarruf Trendi"
                description="Currency bazında aylık tasarruf ve maliyet engelleme performansı"
              />
            </div>
          </InteractiveChartWrapper>
          
          {currencyData.length > 0 ? (
            <CurrencyDistributionChart
              data={currencyData}
              title="Para Birimi Dağılımı"
              description="Tasarrufların para birimlerine göre dağılımı"
            />
          ) : (
            <SavingsComparisonChart
              data={{
                labels: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran'],
                datasets: [{
                  label: 'Örnek Tasarruf',
                  data: [50000, 75000, 60000, 90000, 85000, 120000],
                  backgroundColor: 'rgba(34, 197, 94, 0.8)',
                }]
              }}
              title="Tasarruf Karşılaştırması"
              description="Aylık tasarruf performans karşılaştırması"
            />
          )}
        </div>

        {/* Quick Actions and Recent Activities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="transition-all duration-300 hover:shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Hızlı İşlemler
              </CardTitle>
              <CardDescription>
                Sık kullanılan işlemleri buradan gerçekleştirebilirsiniz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full justify-start transition-all duration-200 hover:scale-[1.02]" 
                variant="outline"
                onClick={() => {
                  const projectsSection = document.querySelector('[data-projects-table]');
                  if (projectsSection) {
                    projectsSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                Proje Listesi
              </Button>
              <Button 
                className="w-full justify-start transition-all duration-200 hover:scale-[1.02]" 
                variant="outline"
                onClick={() => router.push('/dashboard/reports')}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Raporlar
              </Button>
              <Button 
                onClick={() => setShowProjectForm(true)}
                className="w-full justify-start transition-all duration-200 hover:scale-[1.02]" 
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Hızlı Proje Oluştur
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Son Aktiviteler
              </CardTitle>
              <CardDescription>
                Sistemimdeki son hareketler
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <EnhancedSkeleton className="h-4 w-3/4" variant="shimmer" />
                      <EnhancedSkeleton className="h-3 w-1/2" variant="shimmer" />
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
                    <div key={index} className="flex items-start space-x-3 pb-3 border-b border-border last:border-0 transition-colors duration-200 hover:bg-muted/50 -mx-2 px-2 py-1 rounded">
                      <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2 animate-pulse"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {activity.activity_description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.project_name} • {activity.frn} • {activity.user_name}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
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
        <div className="mb-8" data-projects-table>
          <ProjectsTable 
            onProjectUpdated={() => window.location.reload()} 
            onNewProject={() => setShowProjectForm(true)}
          />
        </div>

        {/* Admin Panel Link */}
        {(user?.role === 'admin' || user?.role === 'super_admin' || user?.email?.includes('@fortetourism.com')) && (
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
              <Button 
                variant="outline" 
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
                onClick={() => router.push('/admin')}
              >
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