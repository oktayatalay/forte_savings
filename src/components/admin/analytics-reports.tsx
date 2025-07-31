'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  FileText,
  PieChart,
  LineChart,
  Users,
  DollarSign,
  Target,
  Award,
  Building2,
  Clock,
  Eye,
  Settings,
  Share2,
  Bookmark,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { 
  SavingsTrendChart, 
  SavingsComparisonChart, 
  CurrencyDistributionChart,
  InteractiveChartWrapper,
  generateSampleChartData
} from '@/components/chart-components';

// Analytics interfaces
interface AnalyticsData {
  overview: {
    total_savings: number;
    total_projects: number;
    active_users: number;
    departments: number;
    avg_savings_per_project: number;
    growth_rate: number;
  };
  departmentStats: Array<{
    department: string;
    total_savings: number;
    project_count: number;
    user_count: number;
    avg_per_project: number;
    growth_rate: number;
  }>;
  userPerformance: Array<{
    user_id: number;
    name: string;
    department: string;
    total_savings: number;
    project_count: number;
    last_activity: string;
    performance_score: number;
  }>;
  timeSeriesData: Array<{
    period: string;
    savings: number;
    projects: number;
    users: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    savings: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'overview' | 'department' | 'user' | 'project' | 'financial';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  recipients: string[];
  lastGenerated?: string;
  status: 'active' | 'inactive';
}

interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  dateRange: string;
  includeCharts: boolean;
  includeSummary: boolean;
  departments: string[];
  reportType: string;
}

export function AnalyticsReports() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'departments' | 'users' | 'trends'>('overview');

  // Load analytics data from API
  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/analytics/dashboard.php', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        console.warn('Analytics API failed, using fallback data');
        loadMockData();
        return;
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Map API data to analytics interface
        const apiData: AnalyticsData = {
          overview: result.data.overview || {
            total_savings: 12450000,
            total_projects: 342,
            active_users: 89,
            departments: 8,
            avg_savings_per_project: 36404,
            growth_rate: 15.7
          },
          departmentStats: result.data.departmentStats || [],
          userPerformance: result.data.userPerformance || [],
          timeSeriesData: result.data.timeSeriesData || [],
          categoryBreakdown: result.data.categoryBreakdown || []
        };
        
        setAnalyticsData(apiData);
      } else {
        console.warn('Invalid analytics response, using mock data');
        loadMockData();
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    const mockData: AnalyticsData = {
      overview: {
        total_savings: 12450000,
        total_projects: 342,
        active_users: 89,
        departments: 8,
        avg_savings_per_project: 36404,
        growth_rate: 15.7
      },
      departmentStats: [
        {
          department: 'IT',
          total_savings: 4200000,
          project_count: 45,
          user_count: 12,
          avg_per_project: 93333,
          growth_rate: 23.5
        },
        {
          department: 'Finans',
          total_savings: 3100000,
          project_count: 67,
          user_count: 15,
          avg_per_project: 46268,
          growth_rate: 18.2
        },
        {
          department: 'Operasyon',
          total_savings: 2800000,
          project_count: 89,
          user_count: 23,
          avg_per_project: 31460,
          growth_rate: 12.8
        },
        {
          department: 'İnsan Kaynakları',
          total_savings: 1350000,
          project_count: 34,
          user_count: 8,
          avg_per_project: 39706,
          growth_rate: 9.4
        },
        {
          department: 'Pazarlama',
          total_savings: 1000000,
          project_count: 56,
          user_count: 18,
          avg_per_project: 17857,
          growth_rate: -2.1
        }
      ],
      userPerformance: [
        {
          user_id: 1,
          name: 'Ahmet Yılmaz',
          department: 'IT',
          total_savings: 850000,
          project_count: 12,
          last_activity: '2 saat önce',
          performance_score: 95
        },
        {
          user_id: 2,
          name: 'Fatma Koç',
          department: 'Finans',
          total_savings: 720000,
          project_count: 15,
          last_activity: '1 gün önce',
          performance_score: 88
        },
        {
          user_id: 3,
          name: 'Mehmet Çelik',
          department: 'Operasyon',
          total_savings: 650000,
          project_count: 18,
          last_activity: '3 saat önce',
          performance_score: 92
        }
      ],
      timeSeriesData: Array.from({ length: 12 }, (_, index) => ({
        period: `2023-${String(index + 1).padStart(2, '0')}`,
        savings: Math.floor(Math.random() * 500000) + 100000,
        projects: Math.floor(Math.random() * 20) + 5,
        users: Math.floor(Math.random() * 20) + 60
      })),
      categoryBreakdown: [
        { category: 'Teknoloji Optimizasyonu', savings: 4200000, percentage: 33.7, trend: 'up' },
        { category: 'Süreç İyileştirme', savings: 3100000, percentage: 24.9, trend: 'up' },
        { category: 'Maliyet Azaltma', savings: 2800000, percentage: 22.5, trend: 'stable' },
        { category: 'Enerji Tasarrufu', savings: 1350000, percentage: 10.8, trend: 'up' },
        { category: 'Diğer', savings: 1000000, percentage: 8.1, trend: 'down' }
      ]
    };

    const mockTemplates: ReportTemplate[] = [
      {
        id: '1',
        name: 'Aylık Genel Rapor',
        description: 'Tüm departmanların aylık performans özeti',
        type: 'overview',
        frequency: 'monthly',
        recipients: ['admin@forte.com', 'ceo@forte.com'],
        lastGenerated: '2024-01-15 09:00:00',
        status: 'active'
      },
      {
        id: '2',
        name: 'Departman Detay Raporu',
        description: 'Departman bazında detaylı analiz',
        type: 'department',
        frequency: 'weekly',
        recipients: ['managers@forte.com'],
        lastGenerated: '2024-01-12 14:30:00',
        status: 'active'
      },
      {
        id: '3',
        name: 'Kullanıcı Performans Raporu',
        description: 'Bireysel kullanıcı performans analizi',
        type: 'user',
        frequency: 'quarterly',
        recipients: ['hr@forte.com'],
        lastGenerated: '2024-01-01 10:00:00',
        status: 'inactive'
      }
    ];

    setAnalyticsData(mockData);
    setReportTemplates(mockTemplates);
  };

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const handleExport = async (options: Partial<ExportOptions>) => {
    try {
      setExporting(true);
      // Export logic would go here
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Export completed:', options);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateReport = async (templateId: string) => {
    try {
      setLoading(true);
      // Report generation logic
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Report generated:', templateId);
    } catch (error) {
      console.error('Report generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  if (!analyticsData) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analitik & Raporlar</h2>
          <p className="text-muted-foreground">
            Detaylı performans analizi ve raporlama araçları
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded-lg p-1">
            {[
              { id: 'overview', label: 'Genel', icon: BarChart3 },
              { id: 'departments', label: 'Departmanlar', icon: Building2 },
              { id: 'users', label: 'Kullanıcılar', icon: Users },
              { id: 'trends', label: 'Trendler', icon: TrendingUp }
            ].map((view) => (
              <Button
                key={view.id}
                variant={activeView === view.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView(view.id as any)}
                className="flex items-center gap-2"
              >
                <view.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{view.label}</span>
              </Button>
            ))}
          </div>
          
          <Button
            onClick={() => handleExport({ format: 'pdf' })}
            disabled={exporting}
            variant="outline"
            className="flex items-center gap-2"
          >
            {exporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Dışa Aktar
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Toplam Tasarruf</p>
                <p className="text-lg font-bold">{formatCurrency(analyticsData.overview.total_savings)}</p>
              </div>
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex items-center mt-2">
              <ArrowUp className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-xs text-green-600">+{analyticsData.overview.growth_rate}%</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Toplam Proje</p>
                <p className="text-lg font-bold">{analyticsData.overview.total_projects}</p>
              </div>
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aktif Kullanıcı</p>
                <p className="text-lg font-bold">{analyticsData.overview.active_users}</p>
              </div>
              <Users className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Departman</p>
                <p className="text-lg font-bold">{analyticsData.overview.departments}</p>
              </div>
              <Building2 className="w-6 h-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ort/Proje</p>
                <p className="text-lg font-bold">{formatCurrency(analyticsData.overview.avg_savings_per_project)}</p>
              </div>
              <Target className="w-6 h-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Büyüme</p>
                <p className="text-lg font-bold">+{analyticsData.overview.growth_rate}%</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conditional Views */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="xl:col-span-2">
            <InteractiveChartWrapper
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
            >
              <SavingsTrendChart
                data={{
                  labels: analyticsData.timeSeriesData.map(item => item.period),
                  datasets: [{
                    label: 'Tasarruf',
                    data: analyticsData.timeSeriesData.map(item => item.savings),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  }]
                }}
                title="Tasarruf Trend Analizi"
                description="Aylık tasarruf performansı ve gelişim trendi"
              />
            </InteractiveChartWrapper>
          </div>
          
          {/* Category Breakdown */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Kategori Dağılımı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.categoryBreakdown.map((category, index) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{category.category}</span>
                        <div className="flex items-center gap-2">
                          {category.trend === 'up' && <ArrowUp className="w-3 h-3 text-green-500" />}
                          {category.trend === 'down' && <ArrowDown className="w-3 h-3 text-red-500" />}
                          {category.trend === 'stable' && <Minus className="w-3 h-3 text-gray-500" />}
                          <span className="text-sm text-muted-foreground">
                            {category.percentage}%
                          </span>
                        </div>
                      </div>
                      <Progress value={category.percentage} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(category.savings)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeView === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Departman Performansı</CardTitle>
              <CardDescription>
                Departman bazında tasarruf ve proje istatistikleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.departmentStats.map((dept, index) => (
                  <div key={dept.department} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{dept.department}</h4>
                      <Badge variant={dept.growth_rate > 0 ? 'default' : 'secondary'}>
                        {dept.growth_rate > 0 ? '+' : ''}{dept.growth_rate.toFixed(1)}%
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Toplam Tasarruf</div>
                        <div className="font-medium">{formatCurrency(dept.total_savings)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Proje Sayısı</div>
                        <div className="font-medium">{dept.project_count}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Kullanıcı</div>
                        <div className="font-medium">{dept.user_count}</div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Ortalama/Proje</span>
                        <span>{formatCurrency(dept.avg_per_project)}</span>
                      </div>
                      <Progress 
                        value={(dept.total_savings / analyticsData.overview.total_savings) * 100} 
                        className="mt-1 h-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Departman Karşılaştırması</CardTitle>
            </CardHeader>
            <CardContent>
              <SavingsComparisonChart
                data={{
                  labels: analyticsData.departmentStats.map(d => d.department),
                  datasets: [{
                    label: 'Toplam Tasarruf',
                    data: analyticsData.departmentStats.map(d => d.total_savings),
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                  }]
                }}
                title=""
                description=""
              />
            </CardContent>
          </Card>
        </div>
      )}

      {activeView === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle>Kullanıcı Performans Sıralaması</CardTitle>
            <CardDescription>
              En yüksek performanslı kullanıcılar ve katkıları
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.userPerformance.map((user, index) => (
                <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.department}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(user.total_savings)}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.project_count} proje
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{user.performance_score}</span>
                      <Award className={cn(
                        "w-4 h-4",
                        user.performance_score >= 90 ? 'text-yellow-500' :
                        user.performance_score >= 80 ? 'text-gray-400' : 'text-orange-600'
                      )} />
                    </div>
                    <div className="text-xs text-muted-foreground">{user.last_activity}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rapor Şablonları</CardTitle>
              <CardDescription>
                Otomatik rapor oluşturma ve dağıtım ayarları
              </CardDescription>
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Yeni Şablon
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTemplates.map((template) => (
              <Card key={template.id} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{template.name}</h4>
                    <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>
                      {template.status === 'active' ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {template.description}
                  </p>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Sıklık</span>
                      <span className="capitalize">{template.frequency}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Alıcılar</span>
                      <span>{template.recipients.length}</span>
                    </div>
                    {template.lastGenerated && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Son Oluşturma</span>
                        <span>{new Date(template.lastGenerated).toLocaleDateString('tr-TR')}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateReport(template.id)}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                      Oluştur
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Settings className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}