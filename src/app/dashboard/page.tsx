'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/theme-toggle';
import { ProjectsTable } from '@/components/projects-table';
import { ProjectForm } from '@/components/project-form';
import { Loader2, LogOut, Plus, FileText, Users, TrendingUp, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Kullanıcı bilgilerini localStorage'dan al
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('auth_token');

    if (!savedUser || !token) {
      router.push('/auth/login');
      return;
    }

    try {
      const userData = JSON.parse(savedUser);
      setUser(userData);
    } catch (err) {
      setError('Kullanıcı bilgileri okunamadı');
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleProjectCreated = (newProject: any) => {
    // Proje oluşturulduktan sonra sayfayı yenile veya listeyi güncelle
    window.location.reload(); // Basit çözüm - daha sonra optimize edilebilir
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Forte Savings</h1>
            <p className="text-sm text-muted-foreground">Tasarruf Yönetim Sistemi</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <ThemeToggle />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Çıkış
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Hoş geldiniz, {user?.first_name}!
          </h2>
          <p className="text-muted-foreground">
            Projelerinizi yönetin ve tasarruflarınızı takip edin.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Projeler</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Henüz proje bulunmuyor</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktif Projeler</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Bu ay</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Tasarruf</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₺0</div>
              <p className="text-xs text-muted-foreground">Bu yıl</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Hızlı İşlemler</CardTitle>
              <CardDescription>
                Sık kullanılan işlemleri buradan gerçekleştirebilirsiniz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Proje Listesi
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                Raporlar
              </Button>
              <Button 
                onClick={() => setShowProjectForm(true)}
                className="w-full justify-start" 
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Hızlı Proje Oluştur
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Son Aktiviteler</CardTitle>
              <CardDescription>
                Sistemimdeki son hareketler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>Henüz aktivite bulunmuyor</p>
                <p className="text-sm">İlk projenizi oluşturarak başlayın</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Table */}
        <div className="mb-8">
          <ProjectsTable 
            onProjectUpdated={() => window.location.reload()} 
            onNewProject={() => setShowProjectForm(true)}
          />
        </div>

        {/* Admin Panel Link */}
        {user?.role === 'admin' && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10">
            <CardHeader>
              <CardTitle className="text-orange-800 dark:text-orange-200">
                Admin Paneli
              </CardTitle>
              <CardDescription className="text-orange-700 dark:text-orange-300">
                Sistem yönetimi ve kullanıcı kontrolü
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                Admin Paneline Git
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Project Form Modal */}
        <ProjectForm 
          open={showProjectForm}
          onOpenChange={setShowProjectForm}
          onSuccess={handleProjectCreated}
        />
      </main>
    </div>
  );
}