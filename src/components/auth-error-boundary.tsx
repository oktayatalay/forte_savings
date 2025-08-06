'use client';

import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogIn, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuthErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface AuthErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

// Authentication-specific error boundary
export class AuthErrorBoundary extends React.Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log auth-specific errors
    console.error('Auth Error Boundary caught an error:', error, errorInfo);
    
    // Call onError prop if provided
    this.props.onError?.(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Send auth errors to monitoring service
    this.logAuthError(error, errorInfo);
  }

  private logAuthError = (error: Error, errorInfo: ErrorInfo) => {
    try {
      const authErrorData = {
        type: 'AUTH_ERROR',
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        // Auth-specific context
        isHydrationError: error.message.includes('hydration') || error.message.includes('Minified React error #31'),
        isNetworkError: error.message.includes('fetch') || error.message.includes('network'),
        isStorageError: error.message.includes('localStorage') || error.message.includes('storage'),
      };
      
      // In production, send to error monitoring service
      if (process.env.NODE_ENV === 'production') {
        // errorMonitoringService.captureAuthError(authErrorData);
      } else {
        console.log('Auth Error logged:', authErrorData);
      }
    } catch (loggingError) {
      console.error('Failed to log auth error:', loggingError);
    }
  };

  private resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private getErrorType = (error: Error) => {
    if (error.message.includes('hydration') || error.message.includes('Minified React error #31')) {
      return 'hydration';
    }
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'network';
    }
    if (error.message.includes('localStorage') || error.message.includes('storage')) {
      return 'storage';
    }
    return 'general';
  };

  private getErrorMessage = (errorType: string) => {
    switch (errorType) {
      case 'hydration':
        return {
          title: 'Sayfa Yükleme Hatası',
          description: 'Sayfa yüklenirken bir uyumsuzluk oluştu. Bu genellikle geçici bir sorundur.',
          suggestion: 'Sayfayı yenilemeyi deneyin veya birkaç saniye bekleyip tekrar deneyin.'
        };
      case 'network':
        return {
          title: 'Bağlantı Hatası',
          description: 'Sunucuya bağlanırken bir sorun oluştu.',
          suggestion: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.'
        };
      case 'storage':
        return {
          title: 'Veri Depolama Hatası',
          description: 'Yerel veri depolamada bir sorun oluştu.',
          suggestion: 'Tarayıcı ayarlarınızı kontrol edin ve çerezlerin etkin olduğundan emin olun.'
        };
      default:
        return {
          title: 'Beklenmeyen Hata',
          description: 'Kimlik doğrulama sırasında beklenmeyen bir hata oluştu.',
          suggestion: 'Bu sorun devam ederse lütfen sistem yöneticisi ile iletişime geçin.'
        };
    }
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children } = this.props;

    if (hasError && error) {
      const errorType = this.getErrorType(error);
      const { title, description, suggestion } = this.getErrorMessage(errorType);
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-destructive">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">{suggestion}</p>
                    {isDevelopment && (
                      <p className="text-sm opacity-75">Hata: {error.message}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={this.resetError}
                  className="flex items-center gap-2 flex-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  Tekrar Dene
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/auth/login'}
                  className="flex items-center gap-2 flex-1"
                >
                  <LogIn className="h-4 w-4" />
                  Giriş Sayfası
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/'}
                  className="flex items-center gap-2 flex-1"
                >
                  <Home className="h-4 w-4" />
                  Ana Sayfa
                </Button>
              </div>

              {isDevelopment && error && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    Geliştirici Bilgileri
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="text-xs font-medium">Hata Mesajı:</p>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto mt-1">
                        {error.message}
                      </pre>
                    </div>
                    {error.stack && (
                      <div>
                        <p className="text-xs font-medium">Stack Trace:</p>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto mt-1 max-h-40 overflow-y-auto">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div>
                        <p className="text-xs font-medium">Component Stack:</p>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto mt-1 max-h-40 overflow-y-auto">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

// HOC for wrapping auth components
export const withAuthErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = (props: P) => (
    <AuthErrorBoundary>
      <Component {...props} />
    </AuthErrorBoundary>
  );

  WrappedComponent.displayName = `withAuthErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default AuthErrorBoundary;