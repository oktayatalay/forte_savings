'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  Settings,
  Database,
  Mail,
  Shield,
  Globe,
  Palette,
  Clock,
  FileText,
  Download,
  Upload,
  RefreshCw,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Key,
  Server,
  HardDrive,
  Wifi,
  Bell,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Info,
  Zap,
  Archive,
  Users,
  Calendar,
  Filter
} from 'lucide-react';
import { useAdminAuth, PermissionCheck } from './admin-auth';

// System settings interfaces
interface SystemSettings {
  general: {
    site_name: string;
    site_description: string;
    admin_email: string;
    timezone: string;
    language: string;
    currency: string;
    date_format: string;
    time_format: string;
  };
  email: {
    smtp_host: string;
    smtp_port: number;
    smtp_username: string;
    smtp_password: string;
    smtp_encryption: string;
    from_email: string;
    from_name: string;
    reply_to: string;
    test_email: string;
  };
  security: {
    session_timeout: number;
    password_min_length: number;
    require_password_complexity: boolean;
    enable_two_factor: boolean;
    max_login_attempts: number;
    lockout_duration: number;
    enable_audit_log: boolean;
    enable_ip_whitelist: boolean;
    allowed_file_types: string[];
    max_file_size: number;
  };
  backup: {
    auto_backup_enabled: boolean;
    backup_frequency: string;
    backup_retention_days: number;
    backup_location: string;
    email_backup_reports: boolean;
  };
  notifications: {
    email_notifications: boolean;
    system_alerts: boolean;
    user_registration_alert: boolean;
    project_creation_alert: boolean;
    backup_status_alert: boolean;
    security_alert: boolean;
  };
  performance: {
    cache_enabled: boolean;
    cache_duration: number;
    compress_responses: boolean;
    enable_cdn: boolean;
    api_rate_limit: number;
    log_level: string;
  };
}

interface Category {
  id: number;
  name: string;
  description?: string;
  type: 'project_category' | 'department' | 'cost_center';
  status: 'active' | 'inactive';
  created_at: string;
  usage_count: number;
}

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  content: string;
  type: 'welcome' | 'password_reset' | 'notification' | 'reminder';
  variables: string[];
  status: 'active' | 'inactive';
}

export function SystemSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  
  // Dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  
  const { canEditSystemSettings } = useAdminAuth();

  // Mock data initialization
  useEffect(() => {
    const mockSettings: SystemSettings = {
      general: {
        site_name: 'Forte Savings',
        site_description: 'Tasarruf Yönetim Sistemi',
        admin_email: 'admin@forte.com',
        timezone: 'Europe/Istanbul',
        language: 'tr',
        currency: 'TRY',
        date_format: 'DD/MM/YYYY',
        time_format: '24h'
      },
      email: {
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        smtp_username: 'noreply@forte.com',
        smtp_password: '••••••••',
        smtp_encryption: 'tls',
        from_email: 'noreply@forte.com',
        from_name: 'Forte Savings',
        reply_to: 'support@forte.com',
        test_email: 'test@forte.com'
      },
      security: {
        session_timeout: 30,
        password_min_length: 8,
        require_password_complexity: true,
        enable_two_factor: false,
        max_login_attempts: 5,
        lockout_duration: 15,
        enable_audit_log: true,
        enable_ip_whitelist: false,
        allowed_file_types: ['pdf', 'docx', 'xlsx', 'jpg', 'png'],
        max_file_size: 10
      },
      backup: {
        auto_backup_enabled: true,
        backup_frequency: 'daily',
        backup_retention_days: 30,
        backup_location: '/backups',
        email_backup_reports: true
      },
      notifications: {
        email_notifications: true,
        system_alerts: true,
        user_registration_alert: true,
        project_creation_alert: false,
        backup_status_alert: true,
        security_alert: true
      },
      performance: {
        cache_enabled: true,
        cache_duration: 3600,
        compress_responses: true,
        enable_cdn: false,
        api_rate_limit: 1000,
        log_level: 'info'
      }
    };

    const mockCategories: Category[] = [
      {
        id: 1,
        name: 'IT Altyapı',
        description: 'Bilgi teknolojileri altyapı projeleri',
        type: 'project_category',
        status: 'active',
        created_at: '2023-01-15',
        usage_count: 45
      },
      {
        id: 2,
        name: 'Süreç İyileştirme',
        description: 'İş süreçlerinin iyileştirilmesi',
        type: 'project_category',
        status: 'active',
        created_at: '2023-02-20',
        usage_count: 23
      },
      {
        id: 3,
        name: 'Finans',
        type: 'department',
        status: 'active',
        created_at: '2023-01-01',
        usage_count: 67
      }
    ];

    const mockTemplates: EmailTemplate[] = [
      {
        id: 1,
        name: 'Hoş Geldiniz',
        subject: 'Forte Savings\'e Hoş Geldiniz',
        content: 'Merhaba {{first_name}}, hesabınız başarıyla oluşturuldu.',
        type: 'welcome',
        variables: ['first_name', 'last_name', 'email'],
        status: 'active'
      },
      {
        id: 2,
        name: 'Şifre Sıfırlama',
        subject: 'Şifre Sıfırlama Talebi',
        content: 'Şifrenizi sıfırlamak için linke tıklayın: {{reset_link}}',
        type: 'password_reset',
        variables: ['first_name', 'reset_link', 'expiry_time'],
        status: 'active'
      }
    ];

    setSettings(mockSettings);
    setCategories(mockCategories);
    setEmailTemplates(mockTemplates);
  }, []);

  const tabs = [
    { id: 'general', label: 'Genel', icon: Settings },
    { id: 'email', label: 'E-posta', icon: Mail },
    { id: 'security', label: 'Güvenlik', icon: Shield },
    { id: 'backup', label: 'Yedekleme', icon: Archive },
    { id: 'notifications', label: 'Bildirimler', icon: Bell },
    { id: 'performance', label: 'Performans', icon: Zap },
    { id: 'categories', label: 'Kategoriler', icon: Filter },
    { id: 'templates', label: 'E-posta Şablonları', icon: FileText }
  ];

  const handleSaveSettings = async () => {
    if (!canEditSystemSettings) return;
    
    try {
      setSaving(true);
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Settings saved:', settings);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      setTestingEmail(true);
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Test email sent');
    } catch (error) {
      console.error('Test email error:', error);
    } finally {
      setTestingEmail(false);
    }
  };

  const handleResetToDefaults = () => {
    // Reset logic would go here
    console.log('Reset to defaults');
  };

  const updateSetting = (category: keyof SystemSettings, key: string, value: any) => {
    if (!settings) return;
    
    setSettings(prev => ({
      ...prev!,
      [category]: {
        ...prev![category],
        [key]: value
      }
    }));
  };

  if (!settings) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sistem Ayarları</h2>
          <p className="text-muted-foreground">
            Sistem konfigürasyonunu yönetin ve ayarları düzenleyin
          </p>
        </div>
        
        <PermissionCheck permission="canEditSystemSettings">
          <div className="flex items-center gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Varsayılana Sıfırla
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ayarları Sıfırla</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tüm ayarları varsayılan değerlere sıfırlamak istediğinizden emin misiniz?
                    Bu işlem geri alınamaz.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetToDefaults}>
                    Sıfırla
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </PermissionCheck>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'general' && (
            <Card>
              <CardHeader>
                <CardTitle>Genel Ayarlar</CardTitle>
                <CardDescription>
                  Sitenin genel konfigürasyon ayarlarını düzenleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="site_name">Site Adı</Label>
                    <Input
                      id="site_name"
                      value={settings.general.site_name}
                      onChange={(e) => updateSetting('general', 'site_name', e.target.value)}
                      disabled={!canEditSystemSettings}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="admin_email">Admin E-posta</Label>
                    <Input
                      id="admin_email"
                      type="email"
                      value={settings.general.admin_email}
                      onChange={(e) => updateSetting('general', 'admin_email', e.target.value)}
                      disabled={!canEditSystemSettings}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="site_description">Site Açıklaması</Label>
                  <Textarea
                    id="site_description"
                    value={settings.general.site_description}
                    onChange={(e) => updateSetting('general', 'site_description', e.target.value)}
                    disabled={!canEditSystemSettings}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timezone">Zaman Dilimi</Label>
                    <select
                      id="timezone"
                      value={settings.general.timezone}
                      onChange={(e) => updateSetting('general', 'timezone', e.target.value)}
                      disabled={!canEditSystemSettings}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="Europe/Istanbul">Türkiye (UTC+3)</option>
                      <option value="UTC">UTC</option>
                      <option value="Europe/London">Londra (UTC+0)</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="currency">Para Birimi</Label>
                    <select
                      id="currency"
                      value={settings.general.currency}
                      onChange={(e) => updateSetting('general', 'currency', e.target.value)}
                      disabled={!canEditSystemSettings}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="TRY">Türk Lirası (₺)</option>
                      <option value="USD">Amerikan Doları ($)</option>
                      <option value="EUR">Euro (€)</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'email' && (
            <Card>
              <CardHeader>
                <CardTitle>E-posta Ayarları</CardTitle>
                <CardDescription>
                  SMTP sunucu ayarlarını ve e-posta konfigürasyonunu düzenleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtp_host">SMTP Sunucu</Label>
                    <Input
                      id="smtp_host"
                      value={settings.email.smtp_host}
                      onChange={(e) => updateSetting('email', 'smtp_host', e.target.value)}
                      disabled={!canEditSystemSettings}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="smtp_port">SMTP Port</Label>
                    <Input
                      id="smtp_port"
                      type="number"
                      value={settings.email.smtp_port}
                      onChange={(e) => updateSetting('email', 'smtp_port', parseInt(e.target.value))}
                      disabled={!canEditSystemSettings}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtp_username">Kullanıcı Adı</Label>
                    <Input
                      id="smtp_username"
                      value={settings.email.smtp_username}
                      onChange={(e) => updateSetting('email', 'smtp_username', e.target.value)}
                      disabled={!canEditSystemSettings}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="smtp_password">Şifre</Label>
                    <div className="relative">
                      <Input
                        id="smtp_password"
                        type={showPasswords ? 'text' : 'password'}
                        value={settings.email.smtp_password}
                        onChange={(e) => updateSetting('email', 'smtp_password', e.target.value)}
                        disabled={!canEditSystemSettings}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPasswords(!showPasswords)}
                      >
                        {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="from_email">Gönderen E-posta</Label>
                    <Input
                      id="from_email"
                      type="email"
                      value={settings.email.from_email}
                      onChange={(e) => updateSetting('email', 'from_email', e.target.value)}
                      disabled={!canEditSystemSettings}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="from_name">Gönderen Adı</Label>
                    <Input
                      id="from_name"
                      value={settings.email.from_name}
                      onChange={(e) => updateSetting('email', 'from_name', e.target.value)}
                      disabled={!canEditSystemSettings}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <Label htmlFor="test_email">Test E-posta Adresi</Label>
                  <div className="flex gap-2">
                    <Input
                      id="test_email"
                      type="email"
                      value={settings.email.test_email}
                      onChange={(e) => updateSetting('email', 'test_email', e.target.value)}
                      placeholder="test@example.com"
                    />
                    <Button
                      onClick={handleTestEmail}
                      disabled={testingEmail || !canEditSystemSettings}
                      variant="outline"
                    >
                      {testingEmail ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      {testingEmail ? 'Gönderiliyor...' : 'Test Gönder'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Güvenlik Ayarları</CardTitle>
                <CardDescription>
                  Sistem güvenlik politikalarını ve kurallarını düzenleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="session_timeout">Oturum Zaman Aşımı (dakika)</Label>
                    <Input
                      id="session_timeout"
                      type="number"
                      value={settings.security.session_timeout}
                      onChange={(e) => updateSetting('security', 'session_timeout', parseInt(e.target.value))}
                      disabled={!canEditSystemSettings}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password_min_length">Minimum Şifre Uzunluğu</Label>
                    <Input
                      id="password_min_length"
                      type="number"
                      value={settings.security.password_min_length}
                      onChange={(e) => updateSetting('security', 'password_min_length', parseInt(e.target.value))}
                      disabled={!canEditSystemSettings}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Karmaşık Şifre Zorunluluğu</Label>
                      <p className="text-sm text-muted-foreground">
                        Büyük/küçük harf, sayı ve özel karakter içermeli
                      </p>
                    </div>
                    <Switch
                      checked={settings.security.require_password_complexity}
                      onCheckedChange={(checked) => updateSetting('security', 'require_password_complexity', checked)}
                      disabled={!canEditSystemSettings}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>İki Faktörlü Kimlik Doğrulama</Label>
                      <p className="text-sm text-muted-foreground">
                        Kullanıcılar için 2FA zorunlu hale getir
                      </p>
                    </div>
                    <Switch
                      checked={settings.security.enable_two_factor}
                      onCheckedChange={(checked) => updateSetting('security', 'enable_two_factor', checked)}
                      disabled={!canEditSystemSettings}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Denetim Kaydı</Label>
                      <p className="text-sm text-muted-foreground">
                        Tüm sistem aktivitelerini kaydet
                      </p>
                    </div>
                    <Switch
                      checked={settings.security.enable_audit_log}
                      onCheckedChange={(checked) => updateSetting('security', 'enable_audit_log', checked)}
                      disabled={!canEditSystemSettings}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max_login_attempts">Maksimum Giriş Denemesi</Label>
                    <Input
                      id="max_login_attempts"
                      type="number"
                      value={settings.security.max_login_attempts}
                      onChange={(e) => updateSetting('security', 'max_login_attempts', parseInt(e.target.value))}
                      disabled={!canEditSystemSettings}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="lockout_duration">Kilitleme Süresi (dakika)</Label>
                    <Input
                      id="lockout_duration"
                      type="number"
                      value={settings.security.lockout_duration}
                      onChange={(e) => updateSetting('security', 'lockout_duration', parseInt(e.target.value))}
                      disabled={!canEditSystemSettings}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'categories' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Kategori Yönetimi</CardTitle>
                    <CardDescription>
                      Proje kategorileri, departmanlar ve maliyet merkezlerini yönetin
                    </CardDescription>
                  </div>
                  <PermissionCheck permission="canEditSystemSettings">
                    <Button
                      onClick={() => {
                        setEditingCategory(null);
                        setCategoryDialogOpen(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Yeni Kategori
                    </Button>
                  </PermissionCheck>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{category.name}</div>
                        {category.description && (
                          <div className="text-sm text-muted-foreground">{category.description}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">
                            {category.type === 'project_category' ? 'Proje Kategorisi' :
                             category.type === 'department' ? 'Departman' : 'Maliyet Merkezi'}
                          </Badge>
                          <Badge variant={category.status === 'active' ? 'default' : 'secondary'}>
                            {category.status === 'active' ? 'Aktif' : 'Pasif'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {category.usage_count} kullanım
                          </span>
                        </div>
                      </div>
                      
                      <PermissionCheck permission="canEditSystemSettings">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCategory(category);
                              setCategoryDialogOpen(true);
                            }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCategories(prev => prev.filter(c => c.id !== category.id));
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </PermissionCheck>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add other tab contents... */}
        </div>
      </div>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
            </DialogTitle>
          </DialogHeader>
          {/* Category form would go here */}
        </DialogContent>
      </Dialog>
    </div>
  );
}