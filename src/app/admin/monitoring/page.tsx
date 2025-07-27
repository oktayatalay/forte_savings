'use client';

import { AdminPageWrapper } from '@/components/admin/admin-page-wrapper';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Server, 
  Database, 
  Activity, 
  Clock, 
  MemoryStick, 
  HardDrive,
  Cpu,
  Wifi,
  RefreshCw,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_status: 'healthy' | 'warning' | 'critical';
  database_status: 'connected' | 'disconnected' | 'slow';
  api_response_time: number;
  active_users: number;
  system_uptime: string;
  last_backup: string;
}

function MonitoringContent() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    // Mock data for system metrics
    const mockMetrics: SystemMetrics = {
      cpu_usage: 34,
      memory_usage: 67,
      disk_usage: 45,
      network_status: 'healthy',
      database_status: 'connected',
      api_response_time: 145,
      active_users: 23,
      system_uptime: '15 gün 4 saat',
      last_backup: '2 saat önce'
    };

    setMetrics(mockMetrics);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'warning':
      case 'slow':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'critical':
      case 'disconnected':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'default';
      case 'warning':
      case 'slow':
        return 'secondary';
      case 'critical':
      case 'disconnected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sistem İzleme</h2>
          <p className="text-muted-foreground">
            Sistem durumu, performans metrikleri ve altyapı izleme
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

      {metrics && (
        <>
          {/* System Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">CPU Kullanımı</p>
                    <p className="text-2xl font-bold">{metrics.cpu_usage}%</p>
                  </div>
                  <Cpu className="w-8 h-8 text-blue-500" />
                </div>
                <Progress value={metrics.cpu_usage} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bellek Kullanımı</p>
                    <p className="text-2xl font-bold">{metrics.memory_usage}%</p>
                  </div>
                  <MemoryStick className="w-8 h-8 text-green-500" />
                </div>
                <Progress value={metrics.memory_usage} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Disk Kullanımı</p>
                    <p className="text-2xl font-bold">{metrics.disk_usage}%</p>
                  </div>
                  <HardDrive className="w-8 h-8 text-orange-500" />
                </div>
                <Progress value={metrics.disk_usage} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Aktif Kullanıcı</p>
                    <p className="text-2xl font-bold">{metrics.active_users}</p>
                  </div>
                  <Activity className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  Servis Durumu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    <span>Veritabanı</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(metrics.database_status)}
                    <Badge variant={getStatusVariant(metrics.database_status) as any}>
                      {metrics.database_status === 'connected' ? 'Bağlı' : 
                       metrics.database_status === 'slow' ? 'Yavaş' : 'Bağlantısız'}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    <span>Ağ Durumu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(metrics.network_status)}
                    <Badge variant={getStatusVariant(metrics.network_status) as any}>
                      {metrics.network_status === 'healthy' ? 'Sağlıklı' : 
                       metrics.network_status === 'warning' ? 'Uyarı' : 'Kritik'}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>API Yanıt Süresi</span>
                  </div>
                  <span className="font-medium">{metrics.api_response_time}ms</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Sistem Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sistem Çalışma Süresi</span>
                  <span className="font-medium">{metrics.system_uptime}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Son Yedekleme</span>
                  <span className="font-medium">{metrics.last_backup}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Toplam Aktif Kullanıcı</span>
                  <span className="font-medium">{metrics.active_users}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminMonitoringPage() {
  return (
    <AdminPageWrapper currentSection="monitoring">
      <MonitoringContent />
    </AdminPageWrapper>
  );
}