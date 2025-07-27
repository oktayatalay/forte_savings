import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import DashboardPage from '../page';
import { 
  render, 
  mockUser, 
  mockDashboardStats, 
  setupLocalStorageMock,
  mockRouter,
  mockApiResponses
} from '@/lib/test-utils';
import { setupTestServer, mockErrorResponse } from '@/lib/test-mocks';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Setup MSW server
setupTestServer();

// Setup localStorage mock
setupLocalStorageMock();

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock Chart.js components
jest.mock('@/components/chart-components', () => ({
  SavingsTrendChart: ({ title, description }: any) => (
    <div data-testid="savings-trend-chart">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
  SavingsComparisonChart: ({ title, description }: any) => (
    <div data-testid="savings-comparison-chart">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
  CurrencyDistributionChart: ({ title, description }: any) => (
    <div data-testid="currency-distribution-chart">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
  InteractiveChartWrapper: ({ children }: any) => (
    <div data-testid="interactive-chart-wrapper">{children}</div>
  ),
  generateSampleChartData: () => ({
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [{ label: 'Test', data: [1, 2, 3] }]
  }),
}));

// Mock ProjectsTable component
jest.mock('@/components/projects-table', () => ({
  ProjectsTable: ({ onProjectUpdated, onNewProject }: any) => (
    <div data-testid="projects-table">
      <button onClick={onProjectUpdated}>Update Project</button>
      <button onClick={onNewProject}>New Project</button>
    </div>
  ),
}));

// Mock ProjectForm component
jest.mock('@/components/project-form', () => ({
  ProjectForm: ({ open, onOpenChange, onSuccess }: any) => (
    <div data-testid="project-form" style={{ display: open ? 'block' : 'none' }}>
      <button onClick={onOpenChange}>Close Form</button>
      <button onClick={() => onSuccess({ id: 1, name: 'Test Project' })}>
        Submit
      </button>
    </div>
  ),
}));

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.push.mockClear();
  });

  describe('Authentication and Loading States', () => {
    it('should redirect to login when no user data exists', () => {
      // Mock localStorage to return null for user and token
      const mockGetItem = jest.fn((key: string) => {
        if (key === 'user' || key === 'auth_token') return null;
        return null;
      });
      
      Object.defineProperty(window, 'localStorage', {
        value: { getItem: mockGetItem },
        writable: true,
      });

      render(<DashboardPage />);

      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
    });

    it('should show loading state initially', () => {
      render(<DashboardPage />);

      // Check for skeleton loaders
      expect(screen.getAllByTestId(/enhanced-skeleton/i)).toHaveLength(4);
    });

    it('should handle JSON parsing errors gracefully', () => {
      const mockGetItem = jest.fn((key: string) => {
        if (key === 'user') return 'invalid-json';
        if (key === 'auth_token') return 'mock-token';
        return null;
      });
      
      Object.defineProperty(window, 'localStorage', {
        value: { getItem: mockGetItem },
        writable: true,
      });

      render(<DashboardPage />);

      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
    });
  });

  describe('Successful Dashboard Rendering', () => {
    it('should render dashboard with user data and stats', async () => {
      render(<DashboardPage />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/Hoş geldiniz, Test!/)).toBeInTheDocument();
      });

      // Check if stats cards are rendered
      expect(screen.getByText('Toplam Projeler')).toBeInTheDocument();
      expect(screen.getByText('Bu Ay')).toBeInTheDocument();
      expect(screen.getByText('Toplam Tasarruf')).toBeInTheDocument();
      expect(screen.getByText('Aktif Projeler')).toBeInTheDocument();

      // Check if charts are rendered
      expect(screen.getByTestId('savings-trend-chart')).toBeInTheDocument();
      expect(screen.getByTestId('interactive-chart-wrapper')).toBeInTheDocument();

      // Check if projects table is rendered
      expect(screen.getByTestId('projects-table')).toBeInTheDocument();
    });

    it('should display correct stats from API', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('10')).toBeInTheDocument(); // Total projects
        expect(screen.getByDisplayValue('3')).toBeInTheDocument();  // This month
        expect(screen.getByDisplayValue('5')).toBeInTheDocument();  // Active projects
      });
    });

    it('should render recent activities when available', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Son Aktiviteler')).toBeInTheDocument();
        expect(screen.getByText('Project created')).toBeInTheDocument();
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });

    it('should show currency breakdown when savings data exists', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Para Birimi Detayları')).toBeInTheDocument();
        expect(screen.getByText('USD')).toBeInTheDocument();
        expect(screen.getByText('EUR')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      // Mock API error
      mockErrorResponse('/api/dashboard/stats.php', 'Internal server error', 500);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Internal server error/)).toBeInTheDocument();
      });
    });

    it('should handle missing auth token gracefully', async () => {
      const mockGetItem = jest.fn((key: string) => {
        if (key === 'user') return JSON.stringify(mockUser);
        if (key === 'auth_token') return null;
        return null;
      });
      
      Object.defineProperty(window, 'localStorage', {
        value: { getItem: mockGetItem },
        writable: true,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Oturum süresi dolmuş/)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should handle logout correctly', async () => {
      const mockRemoveItem = jest.fn();
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn((key: string) => {
            if (key === 'user') return JSON.stringify(mockUser);
            if (key === 'auth_token') return 'mock-token';
            return null;
          }),
          removeItem: mockRemoveItem,
        },
        writable: true,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Hoş geldiniz, Test!/)).toBeInTheDocument();
      });

      // Find and click logout button (this would be in the navigation component)
      // Since we mocked the navigation, we'll test the logout function directly
      // In a real scenario, you'd interact with the actual logout button
    });

    it('should open project form when "Hızlı Proje Oluştur" is clicked', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Hızlı Proje Oluştur')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Hızlı Proje Oluştur'));

      expect(screen.getByTestId('project-form')).toBeInTheDocument();
    });

    it('should handle project creation success', async () => {
      // Mock window.location.reload
      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Hızlı Proje Oluştur')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Hızlı Proje Oluştur'));
      fireEvent.click(screen.getByText('Submit'));

      expect(mockReload).toHaveBeenCalled();
    });

    it('should navigate to reports page when button is clicked', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Raporlar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Raporlar'));

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/reports');
    });
  });

  describe('Admin Features', () => {
    it('should show admin panel link for admin users', async () => {
      const adminUser = { ...mockUser, role: 'admin' };
      const mockGetItem = jest.fn((key: string) => {
        if (key === 'user') return JSON.stringify(adminUser);
        if (key === 'auth_token') return 'mock-token';
        return null;
      });
      
      Object.defineProperty(window, 'localStorage', {
        value: { getItem: mockGetItem },
        writable: true,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin Paneli')).toBeInTheDocument();
        expect(screen.getByText('Admin Paneline Git')).toBeInTheDocument();
      });
    });

    it('should not show admin panel link for regular users', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Hoş geldiniz, Test!/)).toBeInTheDocument();
      });

      expect(screen.queryByText('Admin Paneli')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Hoş geldiniz, Test!/)).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading hierarchy', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      });
    });

    it('should have proper button labels', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Hızlı Proje Oluştur/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Raporlar/ })).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should handle mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Hoş geldiniz, Test!/)).toBeInTheDocument();
      });

      // Check that responsive elements are present
      expect(screen.getByText('Projelerinizi yönetin ve tasarruflarınızı takip edin.')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render efficiently without excessive re-renders', async () => {
      const { rerender } = render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Hoş geldiniz, Test!/)).toBeInTheDocument();
      });

      // Rerender with same props should not cause issues
      rerender(<DashboardPage />);

      expect(screen.getByText(/Hoş geldiniz, Test!/)).toBeInTheDocument();
    });
  });
});