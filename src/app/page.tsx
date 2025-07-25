import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { PiggyBank, BarChart3, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Forte Savings</h1>
          <div className="flex gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Tasarruf Yönetim Sistemi
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Tasarruflarınızı profesyonelce yönetin
          </p>
          
          <div className="flex justify-center gap-4">
            <Button size="lg" asChild>
              <a href="/auth/login">
                Giriş Yap
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="/auth/register">
                Kayıt Ol
              </a>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <PiggyBank className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Tasarruf Takibi</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Tasarruflarınızı kolayca takip edin ve hedeflerinize ulaşın
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Raporlama</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Detaylı raporlarla tasarruf performansınızı analiz edin
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Hızlı İşlemler</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Tek tıkla tasarruf ekleme ve düzenleme işlemleri
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Database & API Test</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full" asChild>
                  <a href="/api/test/database.php" target="_blank">
                    Test Database Connection
                  </a>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/api/test/system.php" target="_blank">
                    Test API System
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}