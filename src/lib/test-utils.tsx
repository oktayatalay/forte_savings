import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '@/components/theme-provider'

// Mock user data for testing
export const mockUser = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'user',
}

export const mockAdminUser = {
  id: 2,
  email: 'admin@example.com',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin',
}

// Mock dashboard stats
export const mockDashboardStats = {
  projects: {
    total: 10,
    active: 5,
    this_year: 8,
    this_month: 3,
  },
  savings: {
    by_currency: [
      {
        currency: 'USD',
        savings: 50000,
        cost_avoidance: 25000,
        total: 75000,
        record_count: 15,
      },
      {
        currency: 'EUR',
        savings: 30000,
        cost_avoidance: 15000,
        total: 45000,
        record_count: 10,
      },
    ],
    total_records: 25,
    primary_currency_total: 120000,
  },
  recent_activities: [
    {
      activity_type: 'create',
      project_id: 1,
      frn: 'FRN001',
      project_name: 'Test Project',
      customer: 'Test Customer',
      activity_date: '2023-01-01',
      user_name: 'Test User',
      activity_description: 'Project created',
      formatted_date: '1 day ago',
    },
  ],
  top_projects: [
    {
      id: 1,
      frn: 'FRN001',
      project_name: 'Test Project',
      customer: 'Test Customer',
      total_savings: 75000,
      records_count: 15,
    },
  ],
}

// Mock project data
export const mockProject = {
  id: 1,
  frn: 'FRN001',
  customer: 'Test Customer',
  project_name: 'Test Project',
  forte_responsible: 'John Doe',
  project_director: 'Jane Smith',
  forte_cc_person: 'Bob Johnson',
  group_in: 'Engineering',
  group_out: 'Sales',
  total_savings: 75000,
  po_amount: 100000,
  location: 'New York',
  event_type: 'Implementation',
  project_type: 'Software',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-02T00:00:00Z',
  created_by_name: 'Test User',
}

// Custom wrapper for testing with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Mock localStorage utilities
export const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

// Mock fetch utilities
export const mockFetch = (data: any, ok = true, status = 200) => {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
  })
}

// Mock API responses
export const mockApiResponses = {
  success: (data: any) => ({
    success: true,
    data,
  }),
  error: (message: string) => ({
    success: false,
    error: message,
  }),
}

// Utility to wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock chart data
export const mockChartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Savings',
      data: [10000, 15000, 12000, 18000, 16000, 20000],
      backgroundColor: 'rgba(34, 197, 94, 0.8)',
    },
  ],
}

// Utility to mock router
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
}

// Setup localStorage mock for each test
export const setupLocalStorageMock = () => {
  beforeEach(() => {
    // Reset all mocks
    mockLocalStorage.getItem.mockClear()
    mockLocalStorage.setItem.mockClear()
    mockLocalStorage.removeItem.mockClear()
    mockLocalStorage.clear.mockClear()

    // Setup default localStorage behavior
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      switch (key) {
        case 'user':
          return JSON.stringify(mockUser)
        case 'auth_token':
          return 'mock-token'
        case 'refresh_token':
          return 'mock-refresh-token'
        default:
          return null
      }
    })

    // Assign mocks to window.localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })
  })
}

// Utility to create test component with error boundary
export const TestComponentWithErrorBoundary = ({ 
  children, 
  shouldThrow = false 
}: { 
  children: React.ReactNode
  shouldThrow?: boolean 
}) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <>{children}</>
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'

// Override render with our custom function
export { customRender as render }