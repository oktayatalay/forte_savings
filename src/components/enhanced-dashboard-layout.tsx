'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  FileText, 
  Calendar,
  Target,
  Zap,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  LineChart,
  Filter,
  Download,
  Maximize2,
  RefreshCw,
  Settings,
  Bell,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedStatsCard, StatsGrid } from './enhanced-stats-card';
import { 
  SavingsTrendChart, 
  SavingsComparisonChart, 
  CurrencyDistributionChart,
  InteractiveChartWrapper,
  generateSampleChartData
} from './chart-components';
import { AnalyticsDashboard } from './analytics-dashboard';
import { GlobalSearch } from './global-search';
import { EnhancedNavigation, Breadcrumbs, useBreadcrumbs } from './enhanced-navigation';

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

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface EnhancedDashboardLayoutProps {
  user: User;
  dashboardStats: DashboardStats | null;
  loading: boolean;
  onLogout: () => void;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function EnhancedDashboardLayout({
  user,
  dashboardStats,
  loading,
  onLogout,
  onRefresh,
  className
}: EnhancedDashboardLayoutProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [dashboardView, setDashboardView] = useState<'overview' | 'detailed' | 'analytics'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const breadcrumbs = useBreadcrumbs();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate performance metrics
  const performanceMetrics = dashboardStats ? {
    totalSavings: dashboardStats.savings.by_currency.reduce((sum, item) => sum + item.total, 0),
    avgSavingsPerProject: dashboardStats.projects.total > 0 
      ? dashboardStats.savings.by_currency.reduce((sum, item) => sum + item.total, 0) / dashboardStats.projects.total 
      : 0,
    completionRate: dashboardStats.projects.total > 0 
      ? ((dashboardStats.projects.total - dashboardStats.projects.active) / dashboardStats.projects.total) * 100 
      : 0,
    monthlyGrowth: Math.floor(Math.random() * 20) + 5 // Mock data
  } : null;

  // Enhanced stats cards data
  const statsCardsData = dashboardStats ? [
    {
      title: 'Toplam Projeler',
      value: dashboardStats.projects.total,
      change: {
        value: 12.5,
        type: 'increase' as const,
        period: 'son 30 gün'
      },
      icon: FileText,
      iconColor: 'text-blue-600',
      description: `${dashboardStats.projects.active} aktif proje`,
      variant: 'gradient' as const,
      progress: {
        value: dashboardStats.projects.active,
        max: dashboardStats.projects.total,
        label: 'Aktif projeler'
      }
    },
    {
      title: 'Bu Ay Yeni',
      value: dashboardStats.projects.this_month,
      change: {
        value: 8.3,
        type: 'increase' as const,
        period: 'geçen aya göre'
      },
      icon: Calendar,
      iconColor: 'text-green-600',
      description: 'yeni proje',
      variant: 'modern' as const
    },
    {
      title: 'Toplam Tasarruf',
      value: performanceMetrics ? new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(performanceMetrics.totalSavings) : '₺0',
      change: {
        value: performanceMetrics?.monthlyGrowth || 0,
        type: 'increase' as const,
        period: 'bu ay'
      },
      icon: DollarSign,
      iconColor: 'text-yellow-600',
      description: `${dashboardStats.savings.total_records} kayıt`,
      variant: 'gradient' as const,
      highlight: true
    },
    {
      title: 'Ortalama/Proje',
      value: performanceMetrics ? new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(performanceMetrics.avgSavingsPerProject) : '₺0',
      change: {
        value: 15.2,
        type: 'increase' as const,
        period: 'geçen çeyreğe göre'
      },
      icon: Target,
      iconColor: 'text-purple-600',
      description: 'proje başına tasarruf',
      variant: 'modern' as const
    }
  ] : [];

  // Sample chart data for demonstrations
  const chartData = generateSampleChartData(12);
  const currencyData = dashboardStats ? dashboardStats.savings.by_currency.map((item, index) => ({
    currency: item.currency,
    total: item.total,
    color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]
  })) : [];

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Enhanced Navigation */}
      <EnhancedNavigation 
        user={user} 
        onLogout={onLogout}
        notifications={3}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <Breadcrumbs items={breadcrumbs} />
        )}

        {/* Dashboard Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Hoş geldiniz, {user.first_name}!
            </h1>
            <p className="text-muted-foreground">
              İşte projelerinizin ve tasarruflarınızın özeti
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Dashboard View Toggle */}
            <div className="flex items-center border rounded-lg p-1">
              {[
                { id: 'overview', label: 'Genel', icon: BarChart3 },
                { id: 'detailed', label: 'Detaylı', icon: LineChart },
                { id: 'analytics', label: 'Analitik', icon: PieChart }
              ].map((view) => (
                <Button
                  key={view.id}
                  variant={dashboardView === view.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDashboardView(view.id as any)}
                  className="flex items-center gap-2"
                >
                  <view.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{view.label}</span>
                </Button>
              ))}
            </div>

            {/* Action Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              <span className="hidden sm:inline">Yenile</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Dışa Aktar</span>
            </Button>
          </div>
        </div>

        {/* Key Performance Indicators */}
        {performanceMetrics && (
          <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Performans Göstergeleri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {performanceMetrics.completionRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Tamamlanma Oranı</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    +{performanceMetrics.monthlyGrowth}%
                  </div>
                  <div className="text-sm text-muted-foreground">Aylık Büyüme</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {dashboardStats?.projects.active || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Aktif Projeler</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    ₺{(performanceMetrics.totalSavings / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-sm text-muted-foreground">Toplam Değer</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Stats Grid */}
        <StatsGrid columns={4} className="mb-8">
          {statsCardsData.map((cardData, index) => (
            <EnhancedStatsCard
              key={index}
              {...cardData}
              onClick={() => {
                // Handle card click navigation
                console.log('Navigate to:', cardData.title);
              }}
              loading={loading}
              className="animate-fade-in-up"
            />
          ))}
        </StatsGrid>

        {/* Conditional Dashboard Views */}
        {dashboardView === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Charts Section */}
            <div className="lg:col-span-2 space-y-6">
              <InteractiveChartWrapper
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
              >
                <SavingsTrendChart
                  data={chartData}
                  title="Tasarruf Trendi"
                  description="Zaman içindeki tasarruf performansı"
                />
              </InteractiveChartWrapper>

              {currencyData.length > 0 && (
                <SavingsComparisonChart
                  data={{
                    labels: currencyData.map(item => item.currency),
                    datasets: [{
                      label: 'Toplam Tasarruf',
                      data: currencyData.map(item => item.total),
                      backgroundColor: currencyData.map(item => item.color + '40'),
                      borderColor: currencyData.map(item => item.color),
                      borderWidth: 2
                    }]
                  }}
                  title="Para Birimi Karşılaştırması"
                  description="Para birimlerine göre tasarruf dağılımı"
                />
              )}
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Hızlı İşlemler
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Yeni Proje Oluştur
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Rapor Oluştur
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Ayarları Düzenle
                  </Button>
                </CardContent>
              </Card>

              {/* Top Projects */}
              {dashboardStats?.top_projects && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      En Başarılı Projeler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dashboardStats.top_projects.slice(0, 5).map((project, index) => (
                      <div key={project.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <div className="font-medium text-sm">{project.project_name}</div>
                          <div className="text-xs text-muted-foreground">{project.customer}</div>
                        </div>
                        <Badge variant="secondary">
                          ₺{(project.total_savings / 1000).toFixed(0)}K
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Recent Activities */}
              {dashboardStats?.recent_activities && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Son Aktiviteler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dashboardStats.recent_activities.slice(0, 5).map((activity, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{activity.activity_description}</div>
                          <div className="text-xs text-muted-foreground">
                            {activity.project_name} • {activity.formatted_date}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {dashboardView === 'detailed' && currencyData.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <CurrencyDistributionChart
              data={currencyData}
              title="Para Birimi Dağılımı"
              description="Toplam tasarrufların para birimlerine göre yüzdelik dağılımı"
            />
            <SavingsTrendChart
              data={chartData}
              title="Detaylı Trend Analizi"
              description="Aylık tasarruf ve maliyet engelleme trendi"
            />
          </div>
        )}

        {dashboardView === 'analytics' && dashboardStats && (
          <AnalyticsDashboard
            savingsData={dashboardStats.savings.by_currency}
            topProjects={dashboardStats.top_projects}
            totalProjects={dashboardStats.projects.total}
            totalRecords={dashboardStats.savings.total_records}
            loading={loading}
          />
        )}

        {/* System Status */}
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="w-5 h-5" />
              Sistem Durumu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">API Servisleri: Çalışıyor</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Veritabanı: Çalışıyor</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-sm">Yedekleme: Devam Ediyor</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}