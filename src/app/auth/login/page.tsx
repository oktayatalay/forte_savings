'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Building2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AuthErrorBoundary } from '@/components/auth-error-boundary';
import { safeLocalStorage, validationUtils, retryUtils, performanceUtils } from '@/lib/client-utils';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Hydration-safe mount effect
  useEffect(() => {
    setMounted(true);
    
    // Check for existing auth on mount (client-side only)
    const existingToken = safeLocalStorage.getItem('auth_token');
    if (existingToken) {
      // Redirect if already authenticated
      router.push('/dashboard');
    }
  }, [router]);

  // Enhanced error handling with better user feedback
  const handleError = useCallback((error: unknown, defaultMessage: string) => {
    console.error('Login error:', error);
    
    if (error instanceof Error) {
      setError(error.message.includes('Failed to fetch') 
        ? 'Sunucu bağlantısı kurulamadı. İnternet bağlantınızı kontrol edin.' 
        : defaultMessage);
    } else {
      setError(defaultMessage);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mounted) return; // Prevent submission before hydration
    
    setLoading(true);
    setError('');

    try {
      // Enhanced input validation
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      
      if (!trimmedEmail || !trimmedPassword) {
        setError('E-posta ve şifre alanları zorunludur');
        return;
      }
      
      if (!validationUtils.isValidEmail(trimmedEmail)) {
        setError('Geçerli bir e-posta adresi girin');
        return;
      }

      // Use retry mechanism for network reliability
      const response = await retryUtils.withRetry(async () => {
        return fetch('/api/auth/login.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ 
            email: validationUtils.sanitizeInput(trimmedEmail), 
            password: trimmedPassword 
          }),
        });
      }, 2, 1000);

      // Check if response is ok before parsing
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          setError(errorData.message || errorData.error || `Sunucu hatası (${response.status})`);
        } catch {
          setError(`Sunucu hatası (${response.status}). Lütfen tekrar deneyin.`);
        }
        return;
      }

      let data;
      try {
        const responseText = await response.text();
        if (!responseText.trim()) {
          setError('Sunucudan boş yanıt alındı. Lütfen tekrar deneyin.');
          return;
        }
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        setError('Sunucu yanıt formatı hatalı. Lütfen tekrar deneyin.');
        return;
      }

      // Validate response data
      if (!data.token || !data.user) {
        setError('Geçersiz sunucu yanıtı. Lütfen tekrar deneyin.');
        return;
      }

      // Success - store auth data safely
      safeLocalStorage.setItem('auth_token', data.token);
      if (data.refresh_token) {
        safeLocalStorage.setItem('refresh_token', data.refresh_token);
      }
      safeLocalStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect with a small delay to ensure storage is complete
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
      
    } catch (err) {
      handleError(err, 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // Prevent hydration mismatch by showing consistent loading state
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-glow border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
            <span className="text-muted-foreground">Yükleniyor...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const loginContent = (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
      </div>
      
      <Card className="w-full max-w-md shadow-glow border-border/50 bg-card/80 backdrop-blur-sm relative overflow-hidden animate-fade-in-up">
        {/* Sparkle effect */}
        <div className="absolute top-4 right-4">
          <Sparkles className="w-4 h-4 text-primary/30 animate-pulse" />
        </div>
        
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Forte Savings
          </CardTitle>
          <CardDescription className="text-base">
            Hesabınıza giriş yapın
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20 animate-shake">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@fortetourism.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className={cn(
                  "h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20",
                  "bg-background/50 border-border/60 focus:border-primary/50",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-medium">Şifre</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Şifrenizi girin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className={cn(
                    "h-11 pr-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20",
                    "bg-background/50 border-border/60 focus:border-primary/50",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent transition-all duration-200"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className={cn(
                "w-full h-11 shadow-md hover:shadow-lg transition-all duration-200",
                "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary",
                loading && "opacity-75 cursor-not-allowed"
              )}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </Button>
          </form>
          
          <div className="mt-8 text-center space-y-3">
            <Link 
              href="/auth/forgot-password"
              prefetch={false}
              className="inline-block text-sm text-muted-foreground hover:text-primary transition-colors duration-200 hover:underline"
            >
              Şifremi unuttum
            </Link>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">veya</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Hesabınız yok mu?{' '}
              <Link 
                href="/auth/register"
                prefetch={false}
                className="font-medium text-primary hover:text-primary/80 transition-colors duration-200 hover:underline"
              >
                Kayıt olun
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AuthErrorBoundary>
      {loginContent}
    </AuthErrorBoundary>
  );
}