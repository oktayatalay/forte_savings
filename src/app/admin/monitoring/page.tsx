'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/admin-layout';
import { AdminProvider, AdminGuard } from '@/components/admin/admin-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useAuth, AuthManager } from '@/lib/auth';
import {
  Monitor,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  Globe,
  Users,
  Zap
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface SystemMetrics {
  server: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    uptime: number;
    load_average: number[];
  };
  database: {
    connections: number;
    max_connections: number;
    query_time: number;
    slow_queries: number;
    size: number;
  };
  application: {
    active_sessions: number;
    api_requests_per_minute: number;
    error_rate: number;
    avg_response_time: number;
    cache_hit_rate: number;
  };
  network: {
    bandwidth_usage: number;
    latency: number;
    packet_loss: number;
  };
}

export default function AdminMonitoringPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const userData = await AuthManager.getUserData();
        if (userData) {
          setUser(userData);
        } else {
          window.location.href = '/auth/login';
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        window.location.href = '/auth/login';
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  useEffect(() => {
    // Mock metrics data
    const mockMetrics: SystemMetrics = {
      server: {
        cpu_usage: 45.2,
        memory_usage: 68.5,
        disk_usage: 72.1,
        uptime: 2592000, // 30 days in seconds
        load_average: [1.2, 1.4, 1.1]
      },
      database: {
        connections: 35,
        max_connections: 100,
        query_time: 1.2,
        slow_queries: 3,
        size: 2.4 // GB
      },
      application: {
        active_sessions: 47,
        api_requests_per_minute: 245,
        error_rate: 0.8,
        avg_response_time: 145,
        cache_hit_rate: 94.2
      },
      network: {
        bandwidth_usage: 56.3,
        latency: 12,
        packet_loss: 0.1
      }
    };
    
    setMetrics(mockMetrics);
  }, []);

  const handleLogout = async () => {
    try {
      await AuthManager.clearTokens();
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}g ${hours}s ${minutes}d`;
  };

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user || !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Veri Yüklenemedi</h2>
          <p className="text-muted-foreground mb-4">Sistem verileri alınamadı.</p>
          <Button onClick={() => window.location.reload()}>
            Yeniden Dene
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AdminProvider user={user}>
      <AdminGuard>
        <AdminLayout
          user={user}
          currentSection="monitoring"
          onLogout={handleLogout}
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Sistem İzleme</h2>
                <p className="text-muted-foreground">
                  Gerçek zamanlı sistem performansı ve sağlık durumu
                </p>
              </div>
              
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
            </div>

            {/* System Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Sistem Durumu</p>
                      <p className="text-2xl font-bold text-green-600">Çalışıyor</p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="mt-2">
                    <div className="text-xs text-muted-foreground">
                      Uptime: {formatUptime(metrics.server.uptime)}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">CPU Kullanımı</p>
                      <p className={`text-2xl font-bold ${getStatusColor(metrics.server.cpu_usage, { warning: 70, critical: 90 })}`}>
                        {metrics.server.cpu_usage.toFixed(1)}%
                      </p>
                    </div>
                    <Cpu className="w-8 h-8 text-blue-500" />
                  </div>
                  <Progress value={metrics.server.cpu_usage} className="mt-2" />
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Bellek Kullanımı</p>
                      <p className={`text-2xl font-bold ${getStatusColor(metrics.server.memory_usage, { warning: 80, critical: 95 })}`}>
                        {metrics.server.memory_usage.toFixed(1)}%
                      </p>
                    </div>
                    <Database className="w-8 h-8 text-purple-500" />
                  </div>
                  <Progress value={metrics.server.memory_usage} className="mt-2" />
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Disk Kullanımı</p>
                      <p className={`text-2xl font-bold ${getStatusColor(metrics.server.disk_usage, { warning: 80, critical: 95 })}`}>
                        {metrics.server.disk_usage.toFixed(1)}%
                      </p>
                    </div>
                    <HardDrive className="w-8 h-8 text-orange-500" />
                  </div>
                  <Progress value={metrics.server.disk_usage} className="mt-2" />
                </CardContent>
              </Card>
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Server Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Sunucu Metrikleri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Load Average</div>
                      <div className="text-lg font-semibold">
                        {metrics.server.load_average.join(', ')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Uptime</div>
                      <div className="text-lg font-semibold">
                        {formatUptime(metrics.server.uptime)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>CPU Kullanımı</span>
                        <span>{metrics.server.cpu_usage.toFixed(1)}%</span>
                      </div>
                      <Progress value={metrics.server.cpu_usage} className="mt-1" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>RAM Kullanımı</span>
                        <span>{metrics.server.memory_usage.toFixed(1)}%</span>
                      </div>
                      <Progress value={metrics.server.memory_usage} className="mt-1" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Disk Kullanımı</span>
                        <span>{metrics.server.disk_usage.toFixed(1)}%</span>
                      </div>
                      <Progress value={metrics.server.disk_usage} className="mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Database Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Veritabanı Metrikleri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Aktif Bağlantı</div>
                      <div className="text-lg font-semibold">
                        {metrics.database.connections}/{metrics.database.max_connections}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Veritabanı Boyutu</div>
                      <div className="text-lg font-semibold">
                        {metrics.database.size.toFixed(1)} GB
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Bağlantı Kullanımı</span>
                        <span>{((metrics.database.connections / metrics.database.max_connections) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={(metrics.database.connections / metrics.database.max_connections) * 100} className="mt-1" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Ortalama Sorgu Süresi</div>
                        <div className="font-medium">{metrics.database.query_time.toFixed(1)}ms</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Yavaş Sorgular</div>
                        <div className="font-medium">{metrics.database.slow_queries}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Application Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Uygulama Metrikleri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Aktif Oturum</div>
                      <div className="text-lg font-semibold flex items-center gap-1">
                        {metrics.application.active_sessions}
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">API İstekleri/dk</div>
                      <div className="text-lg font-semibold flex items-center gap-1">
                        {metrics.application.api_requests_per_minute}
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Hata Oranı</div>
                        <div className={`font-medium ${metrics.application.error_rate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                          {metrics.application.error_rate.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Ortalama Yanıt</div>
                        <div className="font-medium">{metrics.application.avg_response_time}ms</div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Cache Hit Rate</span>
                        <span>{metrics.application.cache_hit_rate.toFixed(1)}%</span>
                      </div>
                      <Progress value={metrics.application.cache_hit_rate} className="mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Network Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wifi className="w-5 h-5" />
                    Ağ Metrikleri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Latency</div>
                      <div className="text-lg font-semibold">
                        {metrics.network.latency}ms
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Packet Loss</div>
                      <div className={`text-lg font-semibold ${metrics.network.packet_loss > 1 ? 'text-red-600' : 'text-green-600'}`}>
                        {metrics.network.packet_loss.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Bandwidth Kullanımı</span>
                      <span>{metrics.network.bandwidth_usage.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.network.bandwidth_usage} className="mt-1" />
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      <span>Ağ bağlantısı stabil</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alerts and Warnings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Sistem Uyarıları
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.server.disk_usage > 70 && (
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <div>
                        <div className="font-medium text-yellow-800">Disk Kullanımı Yüksek</div>
                        <div className="text-sm text-yellow-700">
                          Disk kullanımı %{metrics.server.disk_usage.toFixed(1)} seviyesinde. Temizlik yapılması önerilir.
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {metrics.database.slow_queries > 5 && (
                    <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <div>
                        <div className="font-medium text-orange-800">Yavaş Sorgular Tespit Edildi</div>
                        <div className="text-sm text-orange-700">
                          {metrics.database.slow_queries} adet yavaş sorgu tespit edildi. Optimizasyon gerekebilir.
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {(metrics.server.cpu_usage < 70 && metrics.server.memory_usage < 80 && metrics.server.disk_usage < 70) && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-medium text-green-800">Sistem Sağlıklı</div>
                        <div className="text-sm text-green-700">
                          Tüm sistem metrikleri normal aralıkta. Herhangi bir müdahale gerekmiyor.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </AdminLayout>
      </AdminGuard>
    </AdminProvider>
  );
}