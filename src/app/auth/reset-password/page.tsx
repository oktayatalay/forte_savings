'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    token: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // URL'den token parametresini al
    const token = searchParams.get('token');
    if (token) {
      setFormData(prev => ({ ...prev, token }));
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.token.trim()) {
      setError('Sıfırlama token\'ı gereklidir');
      return false;
    }
    
    if (formData.newPassword.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalıdır');
      return false;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: formData.token,
          new_password: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // 3 saniye sonra login sayfasına yönlendir
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      } else {
        setError(data.error || 'Şifre sıfırlama başarısız');
      }
    } catch (err) {
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Şifre Sıfırlandı!</CardTitle>
            <CardDescription>
              Şifreniz başarıyla güncellendi
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Yeni şifrenizle giriş yapabilirsiniz. 3 saniye sonra giriş sayfasına yönlendirileceksiniz.
            </p>
            <Link href="/auth/login">
              <Button className="w-full">
                Hemen Giriş Yap
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Şifre Sıfırla</CardTitle>
          <CardDescription>
            Yeni şifrenizi belirleyin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="token">Sıfırlama Token'ı</Label>
              <Input
                id="token"
                name="token"
                type="text"
                placeholder="E-posta ile gelen token'ı girin"
                value={formData.token}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                E-posta adresinize gönderilen token'ı buraya yapıştırın
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">Yeni Şifre</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="En az 6 karakter"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Yeni Şifre Tekrar</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Yeni şifrenizi tekrar girin"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Şifre sıfırlanıyor...
                </>
              ) : (
                'Şifreyi Sıfırla'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Link 
              href="/auth/login" 
              className="text-sm text-muted-foreground hover:text-primary inline-flex items-center"
            >
              <ArrowLeft className="mr-1 h-3 w-3" />
              Giriş sayfasına dön
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}