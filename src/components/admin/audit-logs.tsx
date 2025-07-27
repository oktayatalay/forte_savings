'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Eye,
  Shield,
  Activity,
  Clock,
  User,
  FileText,
  Download,
  Filter,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Settings,
  Calendar,
  MapPin,
  Monitor,
  Smartphone,
  Globe,
  Key,
  Lock,
  Unlock,
  Edit3,
  Trash2,
  Plus,
  Database
} from 'lucide-react';
import { EnhancedDataTable } from '@/components/enhanced-data-table';

// Audit log interfaces
interface AuditLog {
  id: number;
  timestamp: string;
  user_id: number;
  user_name: string;
  user_email: string;
  action_type: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'export' | 'admin_action' | 'security_event';
  resource_type: 'user' | 'project' | 'savings' | 'report' | 'settings' | 'system';
  resource_id?: number;
  description: string;
  ip_address: string;
  user_agent: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  location?: string;
  status: 'success' | 'failed' | 'warning';
  changes?: Record<string, any>;
  session_id?: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

interface SecurityEvent {
  id: number;
  timestamp: string;
  event_type: 'failed_login' | 'suspicious_activity' | 'unauthorized_access' | 'data_breach_attempt' | 'policy_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: number;
  ip_address: string;
  description: string;
  auto_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  actions_taken: string[];
}

interface AuditFilters {
  search: string;
  user: string;
  action_type: string;
  resource_type: string;
  status: string;
  risk_level: string;
  date_from: string;
  date_to: string;
  ip_address: string;
}

export function AuditLogs() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'audit' | 'security' | 'monitoring'>('audit');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  const [filters, setFilters] = useState<AuditFilters>({
    search: '',
    user: '',
    action_type: '',
    resource_type: '',
    status: '',
    risk_level: '',
    date_from: '',
    date_to: '',
    ip_address: ''
  });

  // Load audit logs from API
  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/audit/logs.php', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const result = await response.json();
      
      if (result.success) {
        // Ensure data structure with fallbacks
        const safeLogs = (result.data || []).map((log: any) => ({
          id: log.id || 0,
          timestamp: log.created_at || log.timestamp || new Date().toISOString(),
          user_id: log.user_id || 0,
          user_name: log.user_name || `${log.first_name || 'Bilinmiyor'} ${log.last_name || ''}`.trim(),
          user_email: log.user_email || log.email || '',
          action_type: log.action || log.action_type || 'view',
          resource_type: log.resource_type || 'system',
          resource_id: log.resource_id || undefined,
          description: log.description || 'Eylem açıklaması yok',
          ip_address: log.ip_address || '0.0.0.0',
          user_agent: log.user_agent || 'Bilinmiyor',
          device_type: log.device_type || 'desktop',
          location: log.location || 'Bilinmiyor',
          status: log.status || 'success',
          changes: log.metadata ? JSON.parse(log.metadata) : undefined,
          session_id: log.session_id || undefined,
          risk_level: log.risk_level || 'low'
        }));
        
        setAuditLogs(safeLogs);
        setFilteredLogs(safeLogs);
      } else {
        throw new Error(result.message || 'Failed to load audit logs');
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      // Fallback to mock data if API fails
      const mockAuditLogs: AuditLog[] = [
      {
        id: 1,
        timestamp: '2024-01-15 14:30:22',
        user_id: 1,
        user_name: 'Ahmet Yılmaz',
        user_email: 'ahmet.yilmaz@forte.com',
        action_type: 'login',
        resource_type: 'system',
        description: 'Kullanıcı sisteme giriş yaptı',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        device_type: 'desktop',
        location: 'İstanbul, Türkiye',
        status: 'success',
        session_id: 'sess_1234567890',
        risk_level: 'low'
      },
      {
        id: 2,
        timestamp: '2024-01-15 14:25:15',
        user_id: 2,
        user_name: 'Fatma Koç',
        user_email: 'fatma.koc@forte.com',
        action_type: 'create',
        resource_type: 'project',
        resource_id: 123,
        description: 'Yeni proje oluşturuldu: "2024 Q1 Savings Initiative"',
        ip_address: '192.168.1.105',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        device_type: 'desktop',
        location: 'Ankara, Türkiye',
        status: 'success',
        changes: {
          project_name: '2024 Q1 Savings Initiative',
          customer: 'Internal',
          category: 'Process Improvement'
        },
        session_id: 'sess_9876543210',
        risk_level: 'low'
      },
      {
        id: 3,
        timestamp: '2024-01-15 14:20:30',
        user_id: 0,
        user_name: 'Unknown User',
        user_email: 'unknown@suspicious.com',
        action_type: 'login',
        resource_type: 'system',
        description: 'Başarısız giriş denemesi - geçersiz kimlik bilgileri',
        ip_address: '203.45.67.89',
        user_agent: 'curl/7.68.0',
        device_type: 'desktop',
        location: 'Moscow, Russia',
        status: 'failed',
        session_id: 'sess_suspicious_123',
        risk_level: 'high'
      },
      {
        id: 4,
        timestamp: '2024-01-15 14:15:45',
        user_id: 3,
        user_name: 'Admin User',
        user_email: 'admin@forte.com',
        action_type: 'admin_action',
        resource_type: 'user',
        resource_id: 5,
        description: 'Kullanıcı rolü güncellendi: user -> admin',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        device_type: 'desktop',
        location: 'İstanbul, Türkiye',
        status: 'success',
        changes: {
          role: { from: 'user', to: 'admin' },
          updated_by: 'admin@forte.com'
        },
        session_id: 'sess_admin_456',
        risk_level: 'medium'
      },
      {
        id: 5,
        timestamp: '2024-01-15 14:10:12',
        user_id: 4,
        user_name: 'Mehmet Çelik',
        user_email: 'mehmet.celik@forte.com',
        action_type: 'export',
        resource_type: 'report',
        description: 'Aylık tasarruf raporu dışa aktarıldı (PDF)',
        ip_address: '192.168.1.150',
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X)',
        device_type: 'mobile',
        location: 'İzmir, Türkiye',
        status: 'success',
        session_id: 'sess_mobile_789',
        risk_level: 'low'
      }
    ];

    const mockSecurityEvents: SecurityEvent[] = [
      {
        id: 1,
        timestamp: '2024-01-15 14:20:30',
        event_type: 'failed_login',
        severity: 'high',
        ip_address: '203.45.67.89',
        description: 'Şüpheli IP adresinden çoklu başarısız giriş denemesi',
        auto_resolved: true,
        resolved_at: '2024-01-15 14:25:00',
        actions_taken: ['IP adresi engellendi', 'Güvenlik ekibi bilgilendirildi']
      },
      {
        id: 2,
        timestamp: '2024-01-15 13:45:15',
        event_type: 'suspicious_activity',
        severity: 'medium',
        user_id: 7,
        ip_address: '192.168.1.200',
        description: 'Olağandışı veri erişim paterni tespit edildi',
        auto_resolved: false,
        actions_taken: ['Kullanıcı hesabı geçici olarak kısıtlandı']
      },
      {
        id: 3,
        timestamp: '2024-01-15 12:30:00',
        event_type: 'unauthorized_access',
        severity: 'critical',
        ip_address: '45.123.67.89',
        description: 'Admin paneline yetkisiz erişim denemesi',
        auto_resolved: false,
        resolved_by: 'security_team',
        resolved_at: '2024-01-15 13:00:00',
        actions_taken: ['IP adresi kalıcı olarak engellendi', 'Sistem güvenlik duvarı güncellendi', 'Incident raporu oluşturuldu']
      }
      ];

      setAuditLogs(mockAuditLogs);
      setSecurityEvents(mockSecurityEvents);
      setFilteredLogs(mockAuditLogs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  // Filter logs based on current filters
  useEffect(() => {
    let filtered = auditLogs;
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(log =>
        log.user_name.toLowerCase().includes(searchLower) ||
        log.description.toLowerCase().includes(searchLower) ||
        log.ip_address.includes(searchLower)
      );
    }
    
    if (filters.action_type) {
      filtered = filtered.filter(log => log.action_type === filters.action_type);
    }
    
    if (filters.resource_type) {
      filtered = filtered.filter(log => log.resource_type === filters.resource_type);
    }
    
    if (filters.status) {
      filtered = filtered.filter(log => log.status === filters.status);
    }
    
    if (filters.risk_level) {
      filtered = filtered.filter(log => log.risk_level === filters.risk_level);
    }
    
    if (filters.ip_address) {
      filtered = filtered.filter(log => log.ip_address.includes(filters.ip_address));
    }
    
    setFilteredLogs(filtered);
  }, [auditLogs, filters]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'login':
      case 'logout':
        return <Key className="w-4 h-4" />;
      case 'create':
        return <Plus className="w-4 h-4" />;
      case 'update':
        return <Edit3 className="w-4 h-4" />;
      case 'delete':
        return <Trash2 className="w-4 h-4" />;
      case 'view':
        return <Eye className="w-4 h-4" />;
      case 'export':
        return <Download className="w-4 h-4" />;
      case 'admin_action':
        return <Settings className="w-4 h-4" />;
      case 'security_event':
        return <Shield className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const columns = [
    {
      key: 'timestamp',
      label: 'Zaman',
      sortable: true,
      render: (log: AuditLog) => (
        <div className="text-sm">
          <div>{new Date(log.timestamp).toLocaleDateString('tr-TR')}</div>
          <div className="text-muted-foreground">
            {new Date(log.timestamp).toLocaleTimeString('tr-TR')}
          </div>
        </div>
      )
    },
    {
      key: 'user',
      label: 'Kullanıcı',
      sortable: true,
      render: (log: AuditLog) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground text-xs font-medium">
            {log.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-sm">{log.user_name}</div>
            <div className="text-xs text-muted-foreground">{log.user_email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'action',
      label: 'İşlem',
      sortable: true,
      render: (log: AuditLog) => (
        <div className="flex items-center gap-2">
          {getActionIcon(log.action_type)}
          <div>
            <div className="text-sm font-medium capitalize">{log.action_type}</div>
            <div className="text-xs text-muted-foreground capitalize">{log.resource_type}</div>
          </div>
        </div>
      )
    },
    {
      key: 'description',
      label: 'Açıklama',
      render: (log: AuditLog) => (
        <div className="max-w-xs">
          <div className="text-sm truncate" title={log.description}>
            {log.description}
          </div>
        </div>
      )
    },
    {
      key: 'location',
      label: 'Konum',
      render: (log: AuditLog) => (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {log.ip_address}
          </div>
          {log.location && (
            <div className="text-xs text-muted-foreground">{log.location}</div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Durum',
      sortable: true,
      render: (log: AuditLog) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(log.status)}
          <Badge variant={log.status === 'success' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}>
            {log.status === 'success' ? 'Başarılı' : log.status === 'failed' ? 'Başarısız' : 'Uyarı'}
          </Badge>
        </div>
      )
    },
    {
      key: 'risk',
      label: 'Risk',
      sortable: true,
      render: (log: AuditLog) => (
        <Badge className={cn('text-xs', getRiskLevelColor(log.risk_level))}>
          {log.risk_level === 'low' ? 'Düşük' :
           log.risk_level === 'medium' ? 'Orta' :
           log.risk_level === 'high' ? 'Yüksek' : 'Kritik'}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'İşlemler',
      render: (log: AuditLog) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedLog(log);
            setDetailsOpen(true);
          }}
        >
          <Eye className="w-4 h-4" />
        </Button>
      )
    }
  ];

  const handleExport = () => {
    console.log('Exporting audit logs...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Denetim Kayıtları</h2>
          <p className="text-muted-foreground">
            Sistem aktiviteleri, güvenlik olayları ve kullanıcı işlemleri
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded-lg p-1">
            {[
              { id: 'audit', label: 'Denetim Kayıtları', icon: FileText },
              { id: 'security', label: 'Güvenlik Olayları', icon: Shield },
              { id: 'monitoring', label: 'Sistem İzleme', icon: Monitor }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className="flex items-center gap-2"
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Button>
            ))}
          </div>
          
          <Button
            onClick={handleExport}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Dışa Aktar
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bugün Toplam</p>
                <p className="text-2xl font-bold">{filteredLogs.length}</p>
              </div>
              <Activity className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Başarılı</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredLogs.filter(l => l.status === 'success').length}
                </p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Başarısız</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredLogs.filter(l => l.status === 'failed').length}
                </p>
              </div>
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Yüksek Risk</p>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredLogs.filter(l => l.risk_level === 'high' || l.risk_level === 'critical').length}
                </p>
              </div>
              <AlertTriangle className="w-6 h-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Benzersiz IP</p>
                <p className="text-2xl font-bold">
                  {new Set(filteredLogs.map(l => l.ip_address)).size}
                </p>
              </div>
              <Globe className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Kullanıcı, açıklama veya IP ara..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <select
              value={filters.action_type}
              onChange={(e) => setFilters(prev => ({ ...prev, action_type: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="">Tüm İşlemler</option>
              <option value="login">Giriş</option>
              <option value="logout">Çıkış</option>
              <option value="create">Oluşturma</option>
              <option value="update">Güncelleme</option>
              <option value="delete">Silme</option>
              <option value="view">Görüntüleme</option>
              <option value="export">Dışa Aktarma</option>
              <option value="admin_action">Admin İşlemi</option>
            </select>
            
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="">Tüm Durumlar</option>
              <option value="success">Başarılı</option>
              <option value="failed">Başarısız</option>
              <option value="warning">Uyarı</option>
            </select>
            
            <select
              value={filters.risk_level}
              onChange={(e) => setFilters(prev => ({ ...prev, risk_level: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="">Tüm Risk Seviyeleri</option>
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
              <option value="critical">Kritik</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Content based on active tab */}
      {activeTab === 'audit' && (
        <EnhancedDataTable
          title="Denetim Kayıtları"
          data={filteredLogs}
          columns={columns}
          loading={loading}
          searchPlaceholder="Denetim kayıtlarında ara..."
          className="mt-6"
        />
      )}

      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle>Güvenlik Olayları</CardTitle>
            <CardDescription>
              Sistemde tespit edilen güvenlik tehditleri ve olayları
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {securityEvents.map((event) => (
                <div key={event.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-3 h-3 rounded-full mt-2",
                        event.severity === 'critical' ? 'bg-red-500' :
                        event.severity === 'high' ? 'bg-orange-500' :
                        event.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                      )} />
                      <div>
                        <div className="font-medium">{event.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString('tr-TR')} • IP: {event.ip_address}
                        </div>
                        {event.actions_taken.length > 0 && (
                          <div className="mt-2">
                            <div className="text-sm font-medium">Alınan Önlemler:</div>
                            <ul className="text-sm text-muted-foreground list-disc list-inside">
                              {event.actions_taken.map((action, index) => (
                                <li key={index}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Badge variant={
                        event.severity === 'critical' ? 'destructive' :
                        event.severity === 'high' ? 'destructive' :
                        event.severity === 'medium' ? 'secondary' : 'outline'
                      }>
                        {event.severity === 'critical' ? 'Kritik' :
                         event.severity === 'high' ? 'Yüksek' :
                         event.severity === 'medium' ? 'Orta' : 'Düşük'}
                      </Badge>
                      {event.auto_resolved && (
                        <div className="text-xs text-green-600 mt-1">Otomatik Çözüldü</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Details Dialog */}
      {selectedLog && detailsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDetailsOpen(false)}>
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Denetim Kaydı Detayları</h3>
                <Button variant="ghost" size="sm" onClick={() => setDetailsOpen(false)}>
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Zaman</Label>
                    <div className="text-sm">
                      {new Date(selectedLog.timestamp).toLocaleString('tr-TR')}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Kullanıcı</Label>
                    <div className="text-sm">
                      {selectedLog.user_name} ({selectedLog.user_email})
                    </div>
                  </div>
                  
                  <div>
                    <Label>İşlem Türü</Label>
                    <div className="text-sm capitalize">{selectedLog.action_type}</div>
                  </div>
                  
                  <div>
                    <Label>Kaynak Türü</Label>
                    <div className="text-sm capitalize">{selectedLog.resource_type}</div>
                  </div>
                  
                  <div>
                    <Label>IP Adresi</Label>
                    <div className="text-sm">{selectedLog.ip_address}</div>
                  </div>
                  
                  <div>
                    <Label>Konum</Label>
                    <div className="text-sm">{selectedLog.location || 'Bilinmiyor'}</div>
                  </div>
                </div>
                
                <div>
                  <Label>Açıklama</Label>
                  <div className="text-sm">{selectedLog.description}</div>
                </div>
                
                <div>
                  <Label>User Agent</Label>
                  <div className="text-sm break-all">{selectedLog.user_agent}</div>
                </div>
                
                {selectedLog.changes && (
                  <div>
                    <Label>Değişiklikler</Label>
                    <pre className="text-sm bg-muted p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}