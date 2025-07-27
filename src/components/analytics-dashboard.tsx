'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  BarChart3,
  PieChart,
  Target,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SavingsData {
  currency: string;
  savings: number;
  cost_avoidance: number;
  total: number;
  record_count: number;
}

interface ProjectData {
  id: number;
  project_name: string;
  customer: string;
  total_savings: number;
  records_count: number;
  frn: string;
}

interface AnalyticsDashboardProps {
  savingsData: SavingsData[];
  topProjects: ProjectData[];
  totalProjects: number;
  totalRecords: number;
  loading?: boolean;
}

export function AnalyticsDashboard({
  savingsData,
  topProjects,
  totalProjects,
  totalRecords,
  loading = false
}: AnalyticsDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  const analytics = useMemo(() => {
    const totalSavings = savingsData.reduce((sum, item) => sum + item.savings, 0);
    const totalCostAvoidance = savingsData.reduce((sum, item) => sum + item.cost_avoidance, 0);
    const grandTotal = totalSavings + totalCostAvoidance;
    
    const avgSavingsPerProject = totalProjects > 0 ? grandTotal / totalProjects : 0;
    const avgRecordsPerProject = totalProjects > 0 ? totalRecords / totalProjects : 0;
    
    return {
      totalSavings,
      totalCostAvoidance,
      grandTotal,
      avgSavingsPerProject,
      avgRecordsPerProject,
      dominantCurrency: savingsData.reduce((max, item) => 
        item.total > max.total ? item : max, savingsData[0] || { currency: 'TRY', total: 0 }
      )
    };
  }, [savingsData, totalProjects, totalRecords]);

  const formatCurrency = (amount: number, currency: string = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatCompactNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-bl-full" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Toplam Tasarruf
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(analytics.totalSavings, analytics.dominantCurrency?.currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {savingsData.filter(d => d.savings > 0).length} para biriminde
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Maliyet Engelleme
              </CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(analytics.totalCostAvoidance, analytics.dominantCurrency?.currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {savingsData.filter(d => d.cost_avoidance > 0).length} para biriminde
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-bl-full" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Proje Başına Ort.
              </CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(analytics.avgSavingsPerProject, analytics.dominantCurrency?.currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.avgRecordsPerProject.toFixed(1)} kayıt/proje
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Toplam Değer
              </CardTitle>
              <Zap className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(analytics.grandTotal, analytics.dominantCurrency?.currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalRecords} toplam kayıt
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Currency Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Para Birimi Dağılımı
            </CardTitle>
            <CardDescription>
              Toplam değere göre para birimi yüzdeleri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {savingsData
                .sort((a, b) => b.total - a.total)
                .map((item, index) => {
                  const percentage = analytics.grandTotal > 0 
                    ? ((item.total / analytics.grandTotal) * 100) 
                    : 0;
                  
                  return (
                    <div key={item.currency} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className={cn(
                            "w-3 h-3 rounded-full",
                            index === 0 ? "bg-blue-500" :
                            index === 1 ? "bg-green-500" :
                            index === 2 ? "bg-yellow-500" :
                            "bg-gray-400"
                          )}
                        />
                        <div>
                          <p className="font-medium">{item.currency}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.record_count} kayıt
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(item.total, item.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          %{percentage.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              En Başarılı Projeler
            </CardTitle>
            <CardDescription>
              Toplam tasarruf miktarına göre sıralama
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProjects.slice(0, 5).map((project, index) => (
                <div key={project.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm truncate max-w-[200px]">
                        {project.project_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {project.customer} • {project.frn}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {formatCurrency(project.total_savings)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {project.records_count} kayıt
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Savings vs Cost Avoidance Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Tasarruf Türleri Analizi
              </CardTitle>
              <CardDescription>
                Para birimlerine göre tasarruf ve maliyet engelleme karşılaştırması
              </CardDescription>
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Zamanlar</SelectItem>
                <SelectItem value="year">Bu Yıl</SelectItem>
                <SelectItem value="quarter">Bu Çeyrek</SelectItem>
                <SelectItem value="month">Bu Ay</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {savingsData.map((item) => {
              const totalForCurrency = item.savings + item.cost_avoidance;
              const savingsPercentage = totalForCurrency > 0 ? (item.savings / totalForCurrency) * 100 : 0;
              const costAvoidancePercentage = totalForCurrency > 0 ? (item.cost_avoidance / totalForCurrency) * 100 : 0;
              
              return (
                <div key={item.currency} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold">{item.currency}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {item.record_count} kayıt
                      </Badge>
                    </div>
                    <p className="font-semibold text-lg">
                      {formatCurrency(totalForCurrency, item.currency)}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Savings Bar */}
                    <div className="flex items-center space-x-3">
                      <div className="w-20 text-sm text-green-600 font-medium">Tasarruf</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${savingsPercentage}%` }}
                        />
                      </div>
                      <div className="w-24 text-sm text-right">
                        {formatCurrency(item.savings, item.currency)}
                      </div>
                    </div>
                    
                    {/* Cost Avoidance Bar */}
                    <div className="flex items-center space-x-3">
                      <div className="w-20 text-sm text-blue-600 font-medium">Maliyet Eng.</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${costAvoidancePercentage}%` }}
                        />
                      </div>
                      <div className="w-24 text-sm text-right">
                        {formatCurrency(item.cost_avoidance, item.currency)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}