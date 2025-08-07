'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { EnhancedNavigation, Breadcrumbs } from '@/components/enhanced-navigation';
import { EnhancedSkeleton } from '@/components/loading-states';
import { ThemeToggle } from '@/components/theme-toggle';
import { Settings, User, Bell, Shield, Globe, Palette, Save, Eye, EyeOff } from 'lucide-react';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
}

interface UserSettings {
  notifications_enabled: boolean;
  email_notifications: boolean;
  language: string;
  timezone: string;
  currency_preference: string;
  date_format: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    notifications_enabled: true,
    email_notifications: true,
    language: 'tr',
    timezone: 'Europe/Istanbul',
    currency_preference: 'TRY',
    date_format: 'DD/MM/YYYY',
  });
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Get user info from localStorage
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('auth_token');

    if (!savedUser || !token) {
      // Use window.location instead of router.push for static export compatibility
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
      return;
    }

    try {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setProfileData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      // Load user settings (could be from API)
      loadUserSettings();
    } catch (err) {
      setError('Kullanıcı bilgileri okunamadı');
      // Use window.location instead of router.push for static export compatibility
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadUserSettings = async () => {
    // In a real application, you would load settings from an API
    // For now, we'll use localStorage or default values
    const savedSettings = localStorage.getItem('user_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (err) {
        console.error('Error loading user settings:', err);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_settings');
    // Use window.location instead of router.push for static export compatibility
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Validate passwords if changing
      if (profileData.new_password) {
        if (profileData.new_password !== profileData.confirm_password) {
          throw new Error('Yeni şifreler eşleşmiyor');
        }
        if (profileData.new_password.length < 6) {
          throw new Error('Yeni şifre en az 6 karakter olmalıdır');
        }
        if (!profileData.current_password) {
          throw new Error('Mevcut şifrenizi girmeniz gerekiyor');
        }
      }

      const updateData: any = {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        email: profileData.email,
      };

      if (profileData.new_password) {
        updateData.current_password = profileData.current_password;
        updateData.new_password = profileData.new_password;
      }

      // In a real application, you would make an API call here
      // For now, we'll simulate the update
      const updatedUser = {
        ...user!,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        email: profileData.email,
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setSuccess('Profil bilgileriniz güncellendi');
      
      // Clear password fields
      setProfileData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: '',
      }));
    } catch (err: any) {
      setError(err.message || 'Profil güncellenirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsUpdate = async (newSettings: Partial<UserSettings>) => {
    setError('');
    setSuccess('');

    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      localStorage.setItem('user_settings', JSON.stringify(updatedSettings));
      setSuccess('Ayarlarınız kaydedildi');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Ayarlar kaydedilirken hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="space-y-6 p-6">
          <EnhancedSkeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <EnhancedSkeleton className="h-96" />
              <EnhancedSkeleton className="h-64" />
            </div>
            <EnhancedSkeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbs = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/settings', label: 'Ayarlar' }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Navigation */}
      <EnhancedNavigation 
        user={user!} 
        onLogout={handleLogout}
        notifications={3}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbs} />
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Ayarlar</h1>
          <p className="text-muted-foreground">
            Hesap bilgilerinizi ve uygulama ayarlarınızı yönetin
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profil Bilgileri
                </CardTitle>
                <CardDescription>
                  Kişisel bilgilerinizi ve şifrenizi güncelleyin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">Ad</Label>
                      <Input
                        id="first_name"
                        value={profileData.first_name}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          first_name: e.target.value
                        }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Soyad</Label>
                      <Input
                        id="last_name"
                        value={profileData.last_name}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          last_name: e.target.value
                        }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        email: e.target.value
                      }))}
                      required
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Şifre Değiştir (Opsiyonel)</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="current_password">Mevcut Şifre</Label>
                      <div className="relative">
                        <Input
                          id="current_password"
                          type={showPassword ? "text" : "password"}
                          value={profileData.current_password}
                          onChange={(e) => setProfileData(prev => ({
                            ...prev,
                            current_password: e.target.value
                          }))}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new_password">Yeni Şifre</Label>
                      <Input
                        id="new_password"
                        type="password"
                        value={profileData.new_password}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          new_password: e.target.value
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">Yeni Şifre (Tekrar)</Label>
                      <Input
                        id="confirm_password"
                        type="password"
                        value={profileData.confirm_password}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          confirm_password: e.target.value
                        }))}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Kaydediliyor...' : 'Profili Güncelle'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Bildirim Ayarları
                </CardTitle>
                <CardDescription>
                  Bildirim tercihlerinizi yönetin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Push Bildirimleri</Label>
                    <p className="text-sm text-muted-foreground">
                      Uygulama içi bildirimler alın
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications_enabled}
                    onCheckedChange={(checked) => 
                      handleSettingsUpdate({ notifications_enabled: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">E-posta Bildirimleri</Label>
                    <p className="text-sm text-muted-foreground">
                      Önemli güncellemeler için e-posta alın
                    </p>
                  </div>
                  <Switch
                    checked={settings.email_notifications}
                    onCheckedChange={(checked) => 
                      handleSettingsUpdate({ email_notifications: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Application Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Uygulama Ayarları
                </CardTitle>
                <CardDescription>
                  Dil, zaman dilimi ve görünüm tercihlerinizi ayarlayın
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Dil</Label>
                    <Select 
                      value={settings.language} 
                      onValueChange={(value) => handleSettingsUpdate({ language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tr">Türkçe</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Zaman Dilimi</Label>
                    <Select 
                      value={settings.timezone} 
                      onValueChange={(value) => handleSettingsUpdate({ timezone: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Istanbul">Istanbul (GMT+3)</SelectItem>
                        <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
                        <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Para Birimi Tercihi</Label>
                    <Select 
                      value={settings.currency_preference} 
                      onValueChange={(value) => handleSettingsUpdate({ currency_preference: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRY">TRY (₺)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_format">Tarih Formatı</Label>
                    <Select 
                      value={settings.date_format} 
                      onValueChange={(value) => handleSettingsUpdate({ date_format: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Theme Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Görünüm
                </CardTitle>
                <CardDescription>
                  Tema ve görünüm ayarları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Tema</Label>
                    <ThemeToggle />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Hesap Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Kullanıcı Rolü</Label>
                  <p className="text-sm text-muted-foreground capitalize">
                    {user?.role?.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Üyelik Tarihi</Label>
                  <p className="text-sm text-muted-foreground">
                    {user?.created_at ? 
                      new Date(user.created_at).toLocaleDateString('tr-TR') : 
                      'Bilinmiyor'
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Hesap ID</Label>
                  <p className="text-sm text-muted-foreground font-mono">
                    {user?.id}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}