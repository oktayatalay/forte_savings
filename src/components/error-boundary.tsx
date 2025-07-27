'use client';

import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo?: ErrorInfo;
  resetError: () => void;
}

// Default error fallback component
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  errorInfo, 
  resetError 
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-destructive">
            Bir şeyler yanlış gitti
          </CardTitle>
          <CardDescription>
            Beklenmeyen bir hata oluştu. Lütfen sayfayı yenilemeyi deneyin.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button 
              onClick={resetError}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Tekrar Dene
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/dashboard'}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Ana Sayfaya Dön
            </Button>
          </div>

          {isDevelopment && error && (
            <Alert variant="destructive" className="mt-6">
              <Bug className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div>
                    <strong>Hata:</strong> {error.message}
                  </div>
                  {error.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer font-medium">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap break-words">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                  {errorInfo?.componentStack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer font-medium">
                        Component Stack
                      </summary>
                      <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap break-words">
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Minimal error fallback for smaller components
export const MinimalErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetError 
}) => (
  <Alert variant="destructive" className="my-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription className="flex items-center justify-between">
      <span>Bir hata oluştu: {error.message}</span>
      <Button 
        size="sm" 
        variant="outline" 
        onClick={resetError}
        className="ml-2"
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
    </AlertDescription>
  </Alert>
);

// Main ErrorBoundary class component
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    this.logErrorToService(error, errorInfo);
    
    // Call onError prop if provided
    this.props.onError?.(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys } = this.props;
    const { hasError } = this.state;
    
    if (hasError && resetKeys) {
      const hasResetKeyChanged = resetKeys.some((key, index) => 
        prevProps.resetKeys?.[index] !== key
      );
      
      if (hasResetKeyChanged) {
        this.resetError();
      }
    }
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    // In production, you would send this to your error monitoring service
    // Example: Sentry, LogRocket, Bugsnag, etc.
    try {
      // Example error logging
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };
      
      // Send to error monitoring service
      // errorMonitoringService.captureException(errorData);
      console.log('Error logged:', errorData);
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  };

  private resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback: Fallback = DefaultErrorFallback } = this.props;

    if (hasError && error) {
      return (
        <Fallback 
          error={error} 
          errorInfo={errorInfo}
          resetError={this.resetError} 
        />
      );
    }

    return children;
  }
}

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};

// Higher-order component wrapper
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Specific error boundaries for different sections
export const DashboardErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      console.error('Dashboard Error:', error, errorInfo);
    }}
    fallback={({ error, resetError }) => (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <div className="font-medium">Dashboard Hatası</div>
              <div className="text-sm mt-1">
                Dashboard yüklenirken bir hata oluştu. Lütfen tekrar deneyin.
              </div>
            </div>
            <Button size="sm" onClick={resetError}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export const AdminErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      console.error('Admin Panel Error:', error, errorInfo);
    }}
    fallback={({ error, resetError }) => (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <div className="font-medium">Admin Panel Hatası</div>
              <div className="text-sm mt-1">
                Admin paneli yüklenirken bir hata oluştu. Lütfen tekrar deneyin.
              </div>
            </div>
            <Button size="sm" onClick={resetError}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;