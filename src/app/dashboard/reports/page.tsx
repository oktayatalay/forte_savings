'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, FileText, TrendingUp, DollarSign, Calendar, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri Dön
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Raporlar</h1>
            <p className="text-muted-foreground">Proje ve tasarruf istatistikleri</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Projeler</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_projects || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.active_projects || 0} aktif proje
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasarruf Kayıtları</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_savings_records || 0}</div>
              <p className="text-xs text-muted-foreground">
                toplam kayıt
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Para Birimleri</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.savings_by_currency.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                farklı para birimi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Currency Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Para Birimine Göre Tasarruf Dağılımı
            </CardTitle>
            <CardDescription>
              Her para birimindeki tasarruf ve maliyet engelleme miktarları
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.savings_by_currency.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>Henüz tasarruf kaydı bulunmuyor</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats?.savings_by_currency
                  .sort((a, b) => b.total - a.total)
                  .map((currencyData) => (
                  <div key={currencyData.currency} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg">
                        {currencyData.currency}
                      </h3>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {formatCurrency(currencyData.total, currencyData.currency)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {currencyData.record_count} kayıt
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">
                          Tasarruf
                        </p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(currencyData.savings, currencyData.currency)}
                        </p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Maliyet Engelleme
                        </p>
                        <p className="text-lg font-bold text-blue-600">
                          {formatCurrency(currencyData.cost_avoidance, currencyData.currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Rapor Dışa Aktarma
            </CardTitle>
            <CardDescription>
              Raporları farklı formatlarda dışa aktarın
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="w-full" disabled>
                <FileText className="mr-2 h-4 w-4" />
                PDF Raporu
                <span className="ml-2 text-xs text-muted-foreground">(Yakında)</span>
              </Button>
              <Button variant="outline" className="w-full" disabled>
                <FileText className="mr-2 h-4 w-4" />
                Excel Raporu
                <span className="ml-2 text-xs text-muted-foreground">(Yakında)</span>
              </Button>
              <Button variant="outline" className="w-full" disabled>
                <Download className="mr-2 h-4 w-4" />
                CSV Dışa Aktarma
                <span className="ml-2 text-xs text-muted-foreground">(Yakında)</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}