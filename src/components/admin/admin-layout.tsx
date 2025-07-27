'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Settings,
  Users,
  BarChart3,
  Shield,
  Database,
  Activity,
  FileText,
  Download,
  Bell,
  Search,
  Menu,
  X,
  Home,
  Eye,
  UserCheck,
  Cog,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Plus,
  MoreVertical
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface AdminLayoutProps {
  user: User;
  children: React.ReactNode;
  currentSection?: string;
  onLogout: () => void;
  className?: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: any;
  href: string;
  badge?: string | number;
  description?: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    href: '/admin',
    description: 'Sistem genel görünümü'
  },
  {
    id: 'users',
    label: 'Kullanıcı Yönetimi',
    icon: Users,
    href: '/admin/users',
    description: 'Kullanıcıları yönet ve roller ata'
  },
  {
    id: 'analytics',
    label: 'Analitik & Raporlar',
    icon: BarChart3,
    href: '/admin/analytics',
    description: 'Detaylı analitik ve raporlama'
  },
  {
    id: 'audit',
    label: 'Denetim Kayıtları',
    icon: Eye,
    href: '/admin/audit',
    badge: 'Yeni',
    description: 'Sistem aktivite kayıtları'
  },
  {
    id: 'settings',
    label: 'Sistem Ayarları',
    icon: Cog,
    href: '/admin/settings',
    description: 'Sistem konfigürasyonu'
  },
  {
    id: 'monitoring',
    label: 'Sistem İzleme',
    icon: Activity,
    href: '/admin/monitoring',
    description: 'Performans ve sağlık durumu'
  }
];

export function AdminLayout({
  user,
  children,
  currentSection = 'dashboard',
  onLogout,
  className
}: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState(3);

  // Check if user is admin
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="w-5 h-5" />
              Yetkisiz Erişim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Bu sayfaya erişim yetkiniz bulunmamaktadır. Admin paneline erişmek için yönetici yetkilerine sahip olmanız gerekir.
            </p>
            <Button onClick={() => window.location.href = '/dashboard'} className="w-full">
              Ana Sayfaya Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Admin Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Admin Panel</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Forte Savings Yönetim Sistemi
                </p>
              </div>
            </div>
          </div>

          {/* Center - Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Kullanıcı, proje veya ayar ara..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-4 h-4" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </Button>

            {/* Quick Actions */}
            <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Hızlı İşlem
            </Button>

            {/* User Menu */}
            <div className="flex items-center gap-3 pl-3 border-l">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium">{user.first_name} {user.last_name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {user.role === 'super_admin' ? 'Süper Admin' : 'Admin'}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                Çıkış
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="h-full p-4 pt-20 lg:pt-4 overflow-y-auto">
            {/* System Status */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Sistem Durumu</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-green-600">Çalışıyor</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Performans</span>
                    <span>98%</span>
                  </div>
                  <Progress value={98} className="h-1" />
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <nav className="space-y-2">
              {navigationItems.map((item) => {
                const isActive = currentSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <item.icon className={cn(
                      "w-4 h-4",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    <div className="flex-1">
                      <div className="font-medium">{item.label}</div>
                      {item.description && (
                        <div className={cn(
                          "text-xs",
                          isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}>
                          {item.description}
                        </div>
                      )}
                    </div>
                    {item.badge && (
                      <Badge variant={isActive ? "secondary" : "outline"} className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </a>
                );
              })}
            </nav>

            {/* Quick Stats */}
            <Card className="mt-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Bugünkü Özet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Aktif Kullanıcılar</span>
                  </div>
                  <span className="text-sm font-medium">47</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Yeni Projeler</span>
                  </div>
                  <span className="text-sm font-medium">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="text-sm">Uyarılar</span>
                  </div>
                  <span className="text-sm font-medium">3</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}