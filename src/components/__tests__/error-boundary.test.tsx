import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { 
  ErrorBoundary, 
  DashboardErrorBoundary, 
  AdminErrorBoundary,
  MinimalErrorFallback,
  withErrorBoundary,
  useErrorHandler
} from '../error-boundary';
import { render, TestComponentWithErrorBoundary } from '@/lib/test-utils';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock console.error to avoid error output in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

// Test component that throws an error
const ThrowingComponent = ({ shouldThrow = false, message = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>Working component</div>;
};

// Test component that uses useErrorHandler hook
const ComponentWithErrorHandler = ({ shouldTriggerError = false }) => {
  const { captureError, resetError } = useErrorHandler();

  React.useEffect(() => {
    if (shouldTriggerError) {
      captureError(new Error('Hook error'));
    }
  }, [shouldTriggerError, captureError]);

  return (
    <div>
      <div>Component with error handler</div>
      <button onClick={() => captureError(new Error('Manual error'))}>
        Trigger Error
      </button>
      <button onClick={resetError}>Reset Error</button>
    </div>
  );
};

describe('ErrorBoundary Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (console.error as jest.Mock).mockClear();
  });

  describe('Basic ErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should catch and display error with default fallback', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Bir şeyler yanlış gitti')).toBeInTheDocument();
      expect(screen.getByText('Beklenmeyen bir hata oluştu. Lütfen sayfayı yenilemeyi deneyin.')).toBeInTheDocument();
      expect(screen.getByText('Tekrar Dene')).toBeInTheDocument();
      expect(screen.getByText('Ana Sayfaya Dön')).toBeInTheDocument();
    });

    it('should display error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} message="Development error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Development error')).toBeInTheDocument();
      expect(screen.getByText('Stack Trace')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('should hide error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} message="Production error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Bir şeyler yanlış gitti')).toBeInTheDocument();
      expect(screen.queryByText('Stack Trace')).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('should reset error when reset button is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Bir şeyler yanlış gitti')).toBeInTheDocument();

      const resetButton = screen.getByText('Tekrar Dene');
      fireEvent.click(resetButton);

      // Rerender with working component
      rerender(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent shouldThrow={true} message="Callback error" />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should use custom fallback component', () => {
      const CustomFallback = ({ error, resetError }: any) => (
        <div>
          <div>Custom error: {error.message}</div>
          <button onClick={resetError}>Custom Reset</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowingComponent shouldThrow={true} message="Custom fallback error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error: Custom fallback error')).toBeInTheDocument();
      expect(screen.getByText('Custom Reset')).toBeInTheDocument();
    });

    it('should reset on props change when resetKeys are provided', () => {
      let resetKey = 'key1';
      const { rerender } = render(
        <ErrorBoundary resetKeys={[resetKey]}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Bir şeyler yanlış gitti')).toBeInTheDocument();

      // Change reset key
      resetKey = 'key2';
      rerender(
        <ErrorBoundary resetKeys={[resetKey]}>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
    });
  });

  describe('MinimalErrorFallback', () => {
    it('should render minimal error message', () => {
      const error = new Error('Minimal error');
      const resetError = jest.fn();

      render(
        <MinimalErrorFallback error={error} resetError={resetError} />
      );

      expect(screen.getByText('Bir hata oluştu: Minimal error')).toBeInTheDocument();
      
      const resetButton = screen.getByRole('button');
      fireEvent.click(resetButton);
      
      expect(resetError).toHaveBeenCalled();
    });
  });

  describe('DashboardErrorBoundary', () => {
    it('should render dashboard-specific error message', () => {
      render(
        <DashboardErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </DashboardErrorBoundary>
      );

      expect(screen.getByText('Dashboard Hatası')).toBeInTheDocument();
      expect(screen.getByText('Dashboard yüklenirken bir hata oluştu. Lütfen tekrar deneyin.')).toBeInTheDocument();
    });

    it('should log dashboard errors to console', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <DashboardErrorBoundary>
          <ThrowingComponent shouldThrow={true} message="Dashboard error" />
        </DashboardErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Dashboard Error:',
        expect.any(Error),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('AdminErrorBoundary', () => {
    it('should render admin-specific error message', () => {
      render(
        <AdminErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </AdminErrorBoundary>
      );

      expect(screen.getByText('Admin Panel Hatası')).toBeInTheDocument();
      expect(screen.getByText('Admin paneli yüklenirken bir hata oluştu. Lütfen tekrar deneyin.')).toBeInTheDocument();
    });

    it('should log admin panel errors to console', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <AdminErrorBoundary>
          <ThrowingComponent shouldThrow={true} message="Admin error" />
        </AdminErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Admin Panel Error:',
        expect.any(Error),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('withErrorBoundary HOC', () => {
    it('should wrap component with error boundary', () => {
      const WrappedComponent = withErrorBoundary(ThrowingComponent);

      render(<WrappedComponent shouldThrow={false} />);

      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    it('should catch errors in wrapped component', () => {
      const WrappedComponent = withErrorBoundary(ThrowingComponent);

      render(<WrappedComponent shouldThrow={true} />);

      expect(screen.getByText('Bir şeyler yanlış gitti')).toBeInTheDocument();
    });

    it('should pass error boundary props to HOC', () => {
      const onError = jest.fn();
      const WrappedComponent = withErrorBoundary(ThrowingComponent, { onError });

      render(<WrappedComponent shouldThrow={true} />);

      expect(onError).toHaveBeenCalled();
    });

    it('should maintain component display name', () => {
      const TestComponent = () => <div>Test</div>;
      TestComponent.displayName = 'TestComponent';
      
      const WrappedComponent = withErrorBoundary(TestComponent);

      expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
    });
  });

  describe('useErrorHandler Hook', () => {
    it('should handle errors programmatically', () => {
      render(
        <ErrorBoundary>
          <ComponentWithErrorHandler shouldTriggerError={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Bir şeyler yanlış gitti')).toBeInTheDocument();
    });

    it('should allow manual error triggering', () => {
      render(
        <ErrorBoundary>
          <ComponentWithErrorHandler />
        </ErrorBoundary>
      );

      expect(screen.getByText('Component with error handler')).toBeInTheDocument();

      const triggerButton = screen.getByText('Trigger Error');
      fireEvent.click(triggerButton);

      expect(screen.getByText('Bir şeyler yanlış gitti')).toBeInTheDocument();
    });
  });

  describe('Navigation Functionality', () => {
    it('should navigate to home when home button is clicked', () => {
      // Mock window.location
      delete (window as any).location;
      window.location = { href: '' } as any;

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const homeButton = screen.getByText('Ana Sayfaya Dön');
      fireEvent.click(homeButton);

      expect(window.location.href).toBe('/dashboard');
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations in error state', async () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels and roles', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /Tekrar Dene/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Ana Sayfaya Dön/ })).toBeInTheDocument();
    });
  });

  describe('Error Logging', () => {
    it('should log errors with proper metadata', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} message="Logging test error" />
        </ErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error logged:',
        expect.objectContaining({
          message: 'Logging test error',
          timestamp: expect.any(String),
          userAgent: expect.any(String),
          url: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle component stack errors', () => {
      const ComponentWithStack = () => {
        throw new Error('Stack error');
      };

      render(
        <ErrorBoundary>
          <div>
            <ComponentWithStack />
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Bir şeyler yanlış gitti')).toBeInTheDocument();
    });

    it('should handle async errors gracefully', async () => {
      const AsyncComponent = () => {
        React.useEffect(() => {
          // Simulate async error
          setTimeout(() => {
            throw new Error('Async error');
          }, 0);
        }, []);

        return <div>Async component</div>;
      };

      render(
        <ErrorBoundary>
          <AsyncComponent />
        </ErrorBoundary>
      );

      // Note: Error boundaries don't catch async errors by default
      // This test demonstrates the limitation
      expect(screen.getByText('Async component')).toBeInTheDocument();
    });
  });
});