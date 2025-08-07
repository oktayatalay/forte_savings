'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  ArrowLeft,
  Clock,
  Building2,
  Sparkles,
  Mail,
  Shield
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AuthErrorBoundary } from '@/components/auth-error-boundary';
import { safeLocalStorage, validationUtils, retryUtils } from '@/lib/client-utils';

// Verification status types
type VerificationStatus = 'loading' | 'success' | 'error' | 'already_verified' | 'expired' | 'invalid' | 'network_error';

interface VerificationResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    email_verified: boolean;
  };
  error?: string;
}

export default function VerifyEmailContent() {
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [message, setMessage] = useState('');
  const [userInfo, setUserInfo] = useState<VerificationResponse['user'] | null>(null);
  const [mounted, setMounted] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-redirect countdown for successful verification
  useEffect(() => {
    if (status === 'success' && mounted) {
      const interval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            router.push('/auth/login');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [status, mounted, router]);

  // Enhanced error handling with better user feedback
  const handleError = useCallback((error: unknown, defaultMessage: string): VerificationStatus => {
    console.error('Email verification error:', error);
    
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('failed to fetch') || errorMessage.includes('network')) {
        setMessage('Bağlantı hatası oluştu. İnternet bağlantınızı kontrol edin.');
        return 'network_error';
      }
    }
    
    setMessage(defaultMessage);
    return 'error';
  }, []);

  // Main verification function
  const verifyEmail = useCallback(async (verificationToken: string) => {
    if (!verificationToken || !mounted) return;

    setStatus('loading');
    setMessage('E-posta adresiniz doğrulanıyor...');

    try {
      // Validate token format (basic check)  
      if (!validationUtils.isAlphanumeric(verificationToken) || verificationToken.length < 10) {
        setStatus('invalid');
        setMessage('Geçersiz doğrulama linki formatı');
        return;
      }

      // Use retry mechanism for network reliability
      const response = await retryUtils.withRetry(
        () => fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: verificationToken }),
        }),
        3, // Max retries
        2000 // Delay between retries
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: 'Ağ bağlantısı hatası' };
        }

        // Enhanced error handling based on HTTP status codes
        switch (response.status) {
          case 400:
            setStatus('invalid');
            setMessage(errorData.error || 'Geçersiz doğrulama kodu');
            break;
          case 404:
            setStatus('expired');
            setMessage('Doğrulama kodu bulunamadı veya süresi dolmuş');
            break;
          case 409:
            setStatus('already_verified');
            setMessage('Bu e-posta adresi zaten doğrulandı');
            break;
          case 500:
          case 502:
          case 503:
            setStatus('error');
            setMessage('Sunucu geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
            break;
          default:
            setStatus('error');
            setMessage(errorData.error || 'Doğrulama işlemi başarısız oldu');
        }
        return;
      }

      const result: VerificationResponse = await response.json();
      
      // Handle successful verification
      if (result.success) {
        setStatus('success');
        setMessage('E-posta adresiniz başarıyla doğrulandı! Giriş sayfasına yönlendiriliyorsunuz...');
        setUserInfo(result.user);
        
        // Store verification success for potential dashboard welcome message
        safeLocalStorage.setItem('email_verified_success', JSON.stringify({
          timestamp: Date.now(),
          user: result.user,
          source: 'email_verification'
        }));
        
      } else if (result.error?.includes('already verified')) {
        setStatus('already_verified');
        setMessage('Bu e-posta adresi zaten doğrulandı. Giriş yapabilirsiniz.');
        setUserInfo(result.user);
      } else {
        setStatus('error');
        setMessage(result.error || 'E-posta doğrulama işlemi başarısız');
      }
      
    } catch (error: any) {
      const errorStatus = handleError(error, 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
      setStatus(errorStatus);
      setRetryCount(prev => prev + 1);
    }
  }, [mounted, handleError]);

  // Retry verification function
  const handleRetry = useCallback(() => {
    if (token && !isRetrying) {
      setIsRetrying(true);
      setTimeout(() => {
        setIsRetrying(false);
        verifyEmail(token);
      }, 1000);
    }
  }, [token, verifyEmail, isRetrying]);

  // Initialize verification on mount
  useEffect(() => {
    if (mounted && token) {
      verifyEmail(token);
    } else if (mounted && !token) {
      setStatus('invalid');
      setMessage('Doğrulama kodu bulunamadı. Lütfen e-postanızdaki linki kullanın.');
    }
  }, [mounted, token, verifyEmail]);

  // Icon based on status
  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case 'already_verified':
        return <Shield className="h-12 w-12 text-green-600" />;
      case 'invalid':
      case 'expired':
        return <XCircle className="h-12 w-12 text-red-600" />;
      case 'network_error':
        return <AlertTriangle className="h-12 w-12 text-orange-600" />;
      default:
        return <XCircle className="h-12 w-12 text-red-600" />;
    }
  };

  // Status color classes
  const getStatusClasses = () => {
    switch (status) {
      case 'loading':
        return 'border-blue-200 bg-blue-50';
      case 'success':
      case 'already_verified':
        return 'border-green-200 bg-green-50';
      case 'invalid':
      case 'expired':
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'network_error':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  // Main verification content
  const verificationContent = (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className={cn("w-full max-w-md", getStatusClasses())}>
        <CardHeader className="text-center space-y-4">
          {getStatusIcon()}
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">
              {status === 'loading' && 'E-posta Doğrulama'}
              {status === 'success' && 'Doğrulama Başarılı!'}
              {status === 'already_verified' && 'Zaten Doğrulandı'}
              {status === 'invalid' && 'Geçersiz Bağlantı'}
              {status === 'expired' && 'Süresi Dolmuş'}
              {status === 'network_error' && 'Bağlantı Hatası'}
              {status === 'error' && 'Doğrulama Hatası'}
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              {message}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* User info for successful verification */}
          {(status === 'success' || status === 'already_verified') && userInfo && (
            <Alert className="border-green-200 bg-green-50">
              <Building2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="font-medium text-green-800">
                  {userInfo.first_name} {userInfo.last_name}
                </div>
                <div className="text-green-700 text-sm">
                  {userInfo.email}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Success countdown */}
          {status === 'success' && (
            <Alert className="border-blue-200 bg-blue-50">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                {redirectCountdown} saniye sonra giriş sayfasına yönlendirileceksiniz...
              </AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            {status === 'success' || status === 'already_verified' ? (
              <div className="space-y-2">
                <Link href="/auth/login" className="w-full">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Giriş Yap
                  </Button>
                </Link>
                <Link href="/auth/register" className="w-full">
                  <Button variant="outline" className="w-full">
                    <Mail className="h-4 w-4 mr-2" />
                    Farklı Hesap Oluştur
                  </Button>
                </Link>
              </div>
            ) : status === 'network_error' || status === 'error' ? (
              <div className="space-y-2">
                <Button 
                  onClick={handleRetry} 
                  disabled={isRetrying || !token}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isRetrying ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Tekrar Dene
                </Button>
                {retryCount > 2 && (
                  <Link href="/auth/register" className="w-full">
                    <Button variant="outline" className="w-full">
                      <Mail className="h-4 w-4 mr-2" />
                      Yeni Hesap Oluştur
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Link href="/auth/register" className="w-full">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Mail className="h-4 w-4 mr-2" />
                    Yeni Hesap Oluştur
                  </Button>
                </Link>
                <Link href="/auth/login" className="w-full">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Giriş Sayfasına Dön
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <Alert className="border-gray-200 bg-gray-50">
              <AlertDescription className="text-xs text-gray-600">
                <strong>Debug:</strong> Status: {status}, Retries: {retryCount}, Token: {token ? 'Present' : 'Missing'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AuthErrorBoundary>
      {verificationContent}
    </AuthErrorBoundary>
  );
}