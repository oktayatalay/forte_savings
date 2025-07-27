'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Database,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Eye,
  UserCheck,
  Target,
  BarChart3,
  PieChart,
  Calendar,
  Award,
  Zap,
  Settings,
  Globe,
  Server,
  HardDrive,
  Cpu,
  Wifi,
  Mail
} from 'lucide-react';
import { EnhancedStatsCard, StatsGrid } from '@/components/enhanced-stats-card';
import { 
  SavingsTrendChart, 
  SavingsComparisonChart, 
  CurrencyDistributionChart,
  InteractiveChartWrapper,
  generateSampleChartData
} from '@/components/chart-components';

// Admin dashboard interfaces
interface AdminDashboardStats {
  users: {
    total: number;
    active: number;
    new_today: number;
    new_this_week: number;
    by_role: Array<{
      role: string;
      count: number;
    }>;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    this_month: number;
    total_savings: number;
  };
  system: {
    uptime: number;
    api_calls_today: number;
    storage_used: number;
    storage_total: number;
    active_sessions: number;
    avg_response_time: number;
  };
  security: {
    failed_logins_today: number;
    blocked_ips: number;
    active_sessions: number;
    last_backup: string;
  };
  activity: {
    logins_today: number;
    projects_created_today: number;
    savings_added_today: number;
    reports_generated_today: number;
  };
}

interface RecentActivity {
  id: number;
  type: 'user_login' | 'project_created' | 'savings_added' | 'user_registered' | 'admin_action';
  user_name: string;
  description: string;
  timestamp: string;
  ip_address?: string;
  status: 'success' | 'warning' | 'error';
}

interface AdminDashboardProps {
  loading?: boolean;
  onRefresh?: () => Promise<void>;
}

export function AdminDashboard({ loading = false, onRefresh }: AdminDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  // Mock data for demonstration
  useEffect(() => {
    const mockStats: AdminDashboardStats = {
      users: {
        total: 156,
        active: 89,
        new_today: 5,
        new_this_week: 23,
        by_role: [
          { role: 'user', count: 134 },
          { role: 'admin', count: 18 },
          { role: 'super_admin', count: 4 }
        ]
      },
      projects: {
        total: 342,
        active: 78,
        completed: 264,
        this_month: 45,
        total_savings: 2450000
      },
      system: {
        uptime: 99.8,
        api_calls_today: 15420,
        storage_used: 2.4,
        storage_total: 10,
        active_sessions: 47,
        avg_response_time: 145
      },
      security: {
        failed_logins_today: 12,
        blocked_ips: 3,
        active_sessions: 47,
        last_backup: '2024-01-15 03:00:00'
      },
      activity: {
        logins_today: 89,
        projects_created_today: 7,
        savings_added_today: 34,
        reports_generated_today: 12
      }
    };

    const mockActivities: RecentActivity[] = [
      {
        id: 1,
        type: 'user_login',
        user_name: 'Ahmet Yılmaz',
        description: 'Sisteme giriş yaptı',
        timestamp: '5 dakika önce',
        ip_address: '192.168.1.100',
        status: 'success'
      },
      {
        id: 2,
        type: 'project_created',
        user_name: 'Fatma Koç',
        description: 'Yeni proje oluşturdu: "2024 Q1 Savings"',
        timestamp: '12 dakika önce',
        status: 'success'
      },
      {
        id: 3,
        type: 'admin_action',
        user_name: 'Admin User',
        description: 'Kullanıcı rolü güncellendi',
        timestamp: '1 saat önce',
        status: 'warning'
      },
      {
        id: 4,
        type: 'user_registered',
        user_name: 'Mehmet Çelik',
        description: 'Yeni hesap oluşturdu',
        timestamp: '2 saat önce',
        status: 'success'
      }
    ];

    setStats(mockStats);
    setRecentActivities(mockActivities);
  }, []);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  // System health calculation
  const systemHealth = stats ? {
    overall: Math.round((stats.system.uptime + (100 - (stats.security.failed_logins_today / 100 * 100)) + 90) / 3),
    uptime: stats.system.uptime,
    security: Math.max(0, 100 - (stats.security.failed_logins_today * 2)),
    performance: stats.system.avg_response_time < 200 ? 95 : 85
  } : null;

  // Enhanced stats cards
  const statsCardsData = stats ? [
    {
      title: 'Toplam Kullanıcılar',
      value: stats.users.total,
      change: {
        value: 12.5,
        type: 'increase' as const,
        period: 'bu hafta'
      },
      icon: Users,
      iconColor: 'text-blue-600',
      description: `${stats.users.active} aktif kullanıcı`,
      variant: 'gradient' as const,
      progress: {
        value: stats.users.active,
        max: stats.users.total,
        label: 'Aktif kullanıcılar'
      }
    },
    {
      title: 'Sistem Performansı',
      value: `${systemHealth?.overall || 0}%`,
      change: {
        value: 2.3,
        type: 'increase' as const,
        period: 'son 24 saat'
      },
      icon: Activity,
      iconColor: 'text-green-600',
      description: `${stats.system.uptime}% uptime`,
      variant: 'modern' as const,
      highlight: true
    },
    {
      title: 'Toplam Projeler',
      value: stats.projects.total,
      change: {
        value: 8.7,
        type: 'increase' as const,
        period: 'bu ay'
      },
      icon: FileText,
      iconColor: 'text-purple-600',
      description: `${stats.projects.active} aktif proje`,
      variant: 'gradient' as const
    },
    {
      title: 'Güvenlik Durumu',
      value: `${systemHealth?.security || 0}%`,
      change: {
        value: stats.security.failed_logins_today > 20 ? -5.2 : 1.8,
        type: stats.security.failed_logins_today > 20 ? 'decrease' as const : 'increase' as const,
        period: 'bugün'
      },
      icon: Shield,
      iconColor: stats.security.failed_logins_today > 20 ? 'text-red-600' : 'text-green-600',
      description: `${stats.security.failed_logins_today} başarısız giriş`,
      variant: 'modern' as const
    }
  ] : [];

  const chartData = generateSampleChartData(30);

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Sistem genel görünümü ve yönetim araçları
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            Yenile
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Sistem Raporu
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Sistem Sağlık Durumu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  {systemHealth.overall}%
                </div>
                <div className="text-sm text-muted-foreground">Genel Durum</div>
                <Progress value={systemHealth.overall} className="mt-2" />
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {systemHealth.uptime}%
                </div>
                <div className="text-sm text-muted-foreground">Uptime</div>
                <Progress value={systemHealth.uptime} className="mt-2" />
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {systemHealth.security}%
                </div>
                <div className="text-sm text-muted-foreground">Güvenlik</div>
                <Progress value={systemHealth.security} className="mt-2" />
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {systemHealth.performance}%
                </div>
                <div className="text-sm text-muted-foreground">Performans</div>
                <Progress value={systemHealth.performance} className="mt-2" />
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
            loading={loading}
            className="animate-fade-in-up"
          />
        ))}
      </StatsGrid>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Activity Chart */}
          <InteractiveChartWrapper
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          >
            <SavingsTrendChart
              data={chartData}
              title="Kullanıcı Aktivitesi"
              description="Günlük aktif kullanıcı sayısı ve proje aktiviteleri"
            />
          </InteractiveChartWrapper>

          {/* System Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Sistem Metrikleri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">Depolama Kullanımı</span>
                    </div>
                    <span className="text-sm font-medium">
                      {stats?.system.storage_used || 0}GB / {stats?.system.storage_total || 0}GB
                    </span>
                  </div>
                  <Progress value={(stats?.system.storage_used || 0) / (stats?.system.storage_total || 1) * 100} />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Ortalama Yanıt Süresi</span>
                    </div>
                    <span className="text-sm font-medium">{stats?.system.avg_response_time || 0}ms</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-purple-500" />
                      <span className="text-sm">Aktif Oturumlar</span>
                    </div>
                    <span className="text-sm font-medium">{stats?.system.active_sessions || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">API Çağrıları (Bugün)</span>
                    </div>
                    <span className="text-sm font-medium">
                      {(stats?.system.api_calls_today || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* User Role Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Kullanıcı Rol Dağılımı
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats?.users.by_role.map((role, index) => (
                <div key={role.role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      role.role === 'super_admin' ? 'bg-red-500' :
                      role.role === 'admin' ? 'bg-orange-500' : 'bg-blue-500'
                    )} />
                    <span className="text-sm capitalize">
                      {role.role === 'super_admin' ? 'Süper Admin' :
                       role.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                    </span>
                  </div>
                  <Badge variant="secondary">{role.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Today's Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Bugünkü Aktiviteler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Giriş Yapan</span>
                </div>
                <span className="text-sm font-medium">{stats?.activity.logins_today || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Yeni Proje</span>
                </div>
                <span className="text-sm font-medium">{stats?.activity.projects_created_today || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">Tasarruf Kaydı</span>
                </div>
                <span className="text-sm font-medium">{stats?.activity.savings_added_today || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                  <span className="text-sm">Rapor Oluşturma</span>
                </div>
                <span className="text-sm font-medium">{stats?.activity.reports_generated_today || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Security Alerts */}
          <Card className={cn(
            "border-2",
            (stats?.security.failed_logins_today || 0) > 20 ? 
            "border-red-200 bg-red-50 dark:bg-red-900/10" : 
            "border-green-200 bg-green-50 dark:bg-green-900/10"
          )}>
            <CardHeader>
              <CardTitle className={cn(
                "flex items-center gap-2",
                (stats?.security.failed_logins_today || 0) > 20 ? 
                "text-red-800 dark:text-red-200" : 
                "text-green-800 dark:text-green-200"
              )}>
                {(stats?.security.failed_logins_today || 0) > 20 ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                Güvenlik Durumu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Başarısız Giriş</span>
                <Badge variant={
                  (stats?.security.failed_logins_today || 0) > 20 ? "destructive" : "secondary"
                }>
                  {stats?.security.failed_logins_today || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Engellenmiş IP</span>
                <Badge variant="secondary">{stats?.security.blocked_ips || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Son Yedekleme</span>
                <span className="text-xs text-muted-foreground">
                  {stats?.security.last_backup || 'Bilinmiyor'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Son Aktiviteler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{activity.user_name}</div>
                    <div className="text-sm text-muted-foreground">{activity.description}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {activity.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}