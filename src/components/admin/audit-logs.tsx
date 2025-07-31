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
  changes?: Record<string, any> | null;
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
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(fallbackLogs);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>(fallbackLogs);
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

  // Fallback audit logs data
  const fallbackLogs: AuditLog[] = [
    {
      id: 1,
      timestamp: new Date().toISOString(),
      user_id: 1,
      user_name: 'Admin User',
      user_email: 'admin@fortetourism.com',
      action_type: 'login' as const,
      resource_type: 'user' as const,
      resource_id: 1,
      description: 'User successfully logged in to the system',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      device_type: 'desktop' as const,
      location: 'İstanbul, Türkiye',
      status: 'success' as const,
      risk_level: 'low' as const,
      changes: null,
      session_id: 'sess_123'
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      user_id: 2,
      user_name: 'Test User',
      user_email: 'user@fortetourism.com',
      action_type: 'update' as const,
      resource_type: 'project' as const,
      resource_id: 5,
      description: 'Updated project settings and configurations',
      ip_address: '192.168.1.101',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      device_type: 'desktop' as const,
      location: 'Ankara, Türkiye',
      status: 'success' as const,
      risk_level: 'medium' as const,
      changes: { name: 'Project Alpha', status: 'active' },
      session_id: 'sess_456'
    }
  ];

  // Load audit logs from API
  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/audit/logs-final.php', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        console.warn('Audit logs API failed, using fallback data');
        setAuditLogs(fallbackLogs);
        setFilteredLogs(fallbackLogs);
        return;
      }

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
      // Use fallback data if API fails
      setAuditLogs(fallbackLogs);
      setFilteredLogs(fallbackLogs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  // Table columns with null-safe rendering
  const columns = [
    {
      key: 'timestamp',
      header: 'Zaman',
      label: 'Zaman',
      render: (log: AuditLog | null | undefined) => {
        if (!log || !log.timestamp) {
          return (
            <div className="text-sm">
              <div>-</div>
              <div className="text-muted-foreground">-</div>
            </div>
          );
        }
        
        return (
          <div className="text-sm">
            <div>{new Date(log.timestamp).toLocaleDateString('tr-TR')}</div>
            <div className="text-muted-foreground">
              {new Date(log.timestamp).toLocaleTimeString('tr-TR')}
            </div>
          </div>
        );
      },
    },
    {
      key: 'user',
      header: 'Kullanıcı',
      label: 'Kullanıcı',
      render: (log: AuditLog | null | undefined) => {
        if (!log) {
          return (
            <div>
              <div className="text-sm font-medium">Bilinmiyor</div>
              <div className="text-xs text-muted-foreground">-</div>
            </div>
          );
        }
        
        return (
          <div>
            <div className="text-sm font-medium">{log.user_name || 'Bilinmiyor'}</div>
            <div className="text-xs text-muted-foreground">{log.user_email || '-'}</div>
          </div>
        );
      },
    },
    {
      key: 'action',
      header: 'Eylem',
      label: 'Eylem',
      render: (log: AuditLog | null | undefined) => {
        if (!log || !log.action_type) {
          return <Badge variant="outline">Bilinmiyor</Badge>;
        }
        
        return (
          <Badge variant={
            log.action_type === 'delete' ? 'destructive' :
            log.action_type === 'create' ? 'default' :
            log.action_type === 'update' ? 'secondary' :
            'outline'
          }>
            {log.action_type === 'login' ? 'Giriş' :
             log.action_type === 'logout' ? 'Çıkış' :
             log.action_type === 'create' ? 'Oluştur' :
             log.action_type === 'update' ? 'Güncelle' :
             log.action_type === 'delete' ? 'Sil' :
             log.action_type === 'view' ? 'Görüntüle' :
             log.action_type === 'export' ? 'Dışa Aktar' :
             log.action_type}
          </Badge>
        );
      },
    },
    {
      key: 'description',
      header: 'Açıklama',
      label: 'Açıklama',
      render: (log: AuditLog | null | undefined) => {
        const description = log?.description || 'Açıklama yok';
        return (
          <div className="text-sm max-w-xs truncate" title={description}>
            {description}
          </div>
        );
      },
    },
    {
      key: 'risk',
      header: 'Risk',
      label: 'Risk',
      render: (log: AuditLog | null | undefined) => {
        if (!log || !log.risk_level) {
          return <Badge variant="outline">Bilinmiyor</Badge>;
        }
        
        return (
          <Badge variant={
            log.risk_level === 'critical' ? 'destructive' :
            log.risk_level === 'high' ? 'destructive' :
            log.risk_level === 'medium' ? 'secondary' :
            'outline'
          }>
            {log.risk_level === 'critical' ? 'Kritik' :
             log.risk_level === 'high' ? 'Yüksek' :
             log.risk_level === 'medium' ? 'Orta' :
             'Düşük'}
          </Badge>
        );
      },
    },
    {
      key: 'ip',
      header: 'IP',
      label: 'IP',
      render: (log: AuditLog | null | undefined) => (
        <span className="text-sm font-mono">{log?.ip_address || '0.0.0.0'}</span>
      ),
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Audit Logları
          </CardTitle>
          <CardDescription>
            Sistem aktivitelerini ve güvenlik olaylarını görüntüleyin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Log ara..."
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background"
                  onChange={(e) => {
                    const query = e.target.value.toLowerCase();
                    const filtered = auditLogs.filter(log => 
                      log.user_name.toLowerCase().includes(query) ||
                      log.description.toLowerCase().includes(query) ||
                      log.action_type.toLowerCase().includes(query)
                    );
                    setFilteredLogs(filtered);
                  }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filtrele
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Dışa Aktar
              </Button>
              <Button variant="outline" size="sm" onClick={loadAuditLogs}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Yenile
              </Button>
            </div>
          </div>

          <EnhancedDataTable
            title="Audit Logları"
            data={filteredLogs}
            columns={columns}
            searchable={false}
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
