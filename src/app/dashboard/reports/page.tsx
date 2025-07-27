'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, FileText, TrendingUp, DollarSign, Calendar, Download, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { EnhancedStatsCard, StatsGrid } from '@/components/enhanced-stats-card';
import { CurrencyCards } from '@/components/currency-cards';
import { cn } from '@/lib/utils';

interface ReportsStats {
  total_projects: number;
  active_projects: number;
  total_savings_records: number;
  savings_by_currency: Array<{
    currency: string;
    savings: number;
    cost_avoidance: number;
    total: number;
    record_count: number;
  }>;
  monthly_stats: Array<{
    month: string;
    projects_created: number;
    savings_records_created: number;
    total_savings: number;
  }>;
}

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<ReportsStats | null>(null);

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/auth/login');
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
        throw new Error(data.error || 'Raporlar yüklenirken hata oluştu.');
      }

      if (data.success) {
        setStats({
          total_projects: data.data.projects.total,
          active_projects: data.data.projects.active,
          total_savings_records: data.data.savings.total_records,
          savings_by_currency: data.data.savings.by_currency,
          monthly_stats: [] // Bu API'den gelmediği için boş bırakıyoruz
        });
      } else {
        setError(data.error || 'Beklenmeyen bir hata oluştu.');
      }
    } catch (err: any) {
      setError(err.message || 'Bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Raporlar yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive" className="max-w-md mx-auto">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <Card className="transition-all duration-300 hover:shadow-medium border-none bg-gradient-to-r from-primary/5 via-background to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Geri Dön
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent flex items-center gap-2">
                  <BarChart3 className="w-8 h-8 text-primary" />
                  Raporlar
                </h1>
                <p className="text-muted-foreground">Proje ve tasarruf istatistikleri</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <StatsGrid columns={3} className="mb-8">
          <EnhancedStatsCard
            title="Toplam Projeler"
            value={stats?.total_projects || 0}
            icon={FileText}
            iconColor="text-blue-600"
            description={`${stats?.active_projects || 0} aktif proje`}
            variant="gradient"
            interactive={true}
          />
          
          <EnhancedStatsCard
            title="Tasarruf Kayıtları"
            value={stats?.total_savings_records || 0}
            icon={Calendar}
            iconColor="text-green-600"
            description="toplam kayıt"
            variant="modern"
          />
          
          <EnhancedStatsCard
            title="Para Birimleri"
            value={stats?.savings_by_currency.length || 0}
            icon={DollarSign}
            iconColor="text-emerald-600"
            description="farklı para birimi"
            variant="gradient"
            highlight={true}
          />
        </StatsGrid>

        {/* Currency Breakdown */}
        <Card className="transition-all duration-300 hover:shadow-medium">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <TrendingUp className="w-5 h-5" />
              Para Birimine Göre Tasarruf Dağılımı
            </CardTitle>
            <CardDescription>
              Her para birimindeki tasarruf ve maliyet engelleme miktarları
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.savings_by_currency.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="mx-auto h-16 w-16 mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Henüz tasarruf kaydı bulunmuyor</h3>
                <p className="text-muted-foreground">Projelerinize tasarruf kayıtları eklendiğinde burada görüntülenecek.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CurrencyCards 
                  data={stats?.savings_by_currency || []}
                  compact={false}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Actions */}
        <Card className="transition-all duration-300 hover:shadow-medium">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Download className="w-5 h-5" />
              Rapor Dışa Aktarma
            </CardTitle>
            <CardDescription>
              Raporları farklı formatlarda dışa aktarın
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all duration-200" 
                disabled
              >
                <FileText className="h-6 w-6 text-red-500" />
                <div className="text-center">
                  <div className="font-medium">PDF Raporu</div>
                  <div className="text-xs text-muted-foreground">(Yakında)</div>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all duration-200" 
                disabled
              >
                <FileText className="h-6 w-6 text-green-500" />
                <div className="text-center">
                  <div className="font-medium">Excel Raporu</div>
                  <div className="text-xs text-muted-foreground">(Yakında)</div>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all duration-200" 
                disabled
              >
                <Download className="h-6 w-6 text-blue-500" />
                <div className="text-center">
                  <div className="font-medium">CSV Dışa Aktarma</div>
                  <div className="text-xs text-muted-foreground">(Yakında)</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}