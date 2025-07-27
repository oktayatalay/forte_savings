import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { mockDashboardStats, mockProject, mockApiResponses } from './test-utils'

// Define mock API handlers
export const handlers = [
  // Dashboard stats endpoint
  http.get('/api/dashboard/stats.php', () => {
    return HttpResponse.json(mockApiResponses.success(mockDashboardStats))
  }),

  // Projects list endpoint
  http.get('/api/projects/list.php', ({ request }) => {
    const url = new URL(request.url)
    const page = url.searchParams.get('page') || '1'
    const limit = url.searchParams.get('limit') || '10'
    
    return HttpResponse.json(mockApiResponses.success({
      projects: [mockProject],
      total: 1,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: 1,
    }))
  }),

  // Project create endpoint
  http.post('/api/projects/create.php', async ({ request }) => {
    const body = await request.json() as Record<string, any> as Record<string, any>
    return HttpResponse.json(mockApiResponses.success({
      ...mockProject,
      ...body,
      id: Math.floor(Math.random() * 1000),
    }))
  }),

  // Project update endpoint
  http.put('/api/projects/update.php', async ({ request }) => {
    const body = await request.json() as Record<string, any>
    return HttpResponse.json(mockApiResponses.success({
      ...mockProject,
      ...body,
    }))
  }),

  // Project delete endpoint
  http.delete('/api/projects/delete.php', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('id')
    
    if (!projectId) {
      return HttpResponse.json(mockApiResponses.error('Project ID is required'), { status: 400 })
    }
    
    return HttpResponse.json(mockApiResponses.success({ message: 'Project deleted successfully' }))
  }),

  // Project detail endpoint
  http.get('/api/projects/detail.php', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('id')
    
    if (!projectId) {
      return HttpResponse.json(mockApiResponses.error('Project ID is required'), { status: 400 })
    }
    
    return HttpResponse.json(mockApiResponses.success(mockProject))
  }),

  // Savings create endpoint
  http.post('/api/savings/create.php', async ({ request }) => {
    const body = await request.json() as Record<string, any>
    return HttpResponse.json(mockApiResponses.success({
      id: Math.floor(Math.random() * 1000),
      ...body,
      created_at: new Date().toISOString(),
    }))
  }),

  // Savings update endpoint
  http.put('/api/savings/update.php', async ({ request }) => {
    const body = await request.json() as Record<string, any>
    return HttpResponse.json(mockApiResponses.success(body))
  }),

  // Savings delete endpoint
  http.delete('/api/savings/delete.php', ({ request }) => {
    const url = new URL(request.url)
    const savingsId = url.searchParams.get('id')
    
    if (!savingsId) {
      return HttpResponse.json(mockApiResponses.error('Savings ID is required'), { status: 400 })
    }
    
    return HttpResponse.json(mockApiResponses.success({ message: 'Savings deleted successfully' }))
  }),

  // Auth endpoints
  http.post('/api/auth/login.php', async ({ request }) => {
    const body = await request.json() as Record<string, any>
    const { email, password } = body as { email: string; password: string }
    
    if (email === 'test@example.com' && password === 'password') {
      return HttpResponse.json(mockApiResponses.success({
        user: {
          id: 1,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'user',
        },
        token: 'mock-token',
        refresh_token: 'mock-refresh-token',
      }))
    }
    
    return HttpResponse.json(mockApiResponses.error('Invalid credentials'), { status: 401 })
  }),

  http.post('/api/auth/register.php', async ({ request }) => {
    const body = await request.json() as Record<string, any>
    return HttpResponse.json(mockApiResponses.success({
      user: {
        id: Math.floor(Math.random() * 1000),
        ...body,
        role: 'user',
      },
      message: 'User registered successfully',
    }))
  }),

  // Admin endpoints
  http.get('/api/admin/users/list.php', () => {
    return HttpResponse.json(mockApiResponses.success([
      {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        status: 'active',
        department: 'IT',
        project_count: 5,
        activity_count: 10,
        last_activity: '2 hours ago',
        email_verified: true,
        two_factor_enabled: false,
        created_at: '2023-01-01T00:00:00Z',
      }
    ]))
  }),

  http.get('/api/admin/audit/logs.php', () => {
    return HttpResponse.json(mockApiResponses.success([
      {
        id: 1,
        user_id: 1,
        user_name: 'Test User',
        user_email: 'test@example.com',
        action: 'login',
        action_type: 'login',
        resource_type: 'system',
        description: 'User logged in successfully',
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0',
        device_type: 'desktop',
        location: 'Test Location',
        status: 'success',
        risk_level: 'low',
        created_at: '2024-01-01T12:00:00Z',
        timestamp: '2024-01-01T12:00:00Z',
        metadata: null,
        session_id: 'test-session',
        changes: null
      }
    ]))
  }),

  http.get('/api/admin/users.php', () => {
    return HttpResponse.json(mockApiResponses.success({
      users: [
        {
          id: 1,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'user',
          created_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          email: 'admin@example.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          created_at: '2023-01-01T00:00:00Z',
        },
      ],
    }))
  }),

  http.get('/api/admin/analytics.php', () => {
    return HttpResponse.json(mockApiResponses.success({
      user_count: 10,
      project_count: 25,
      savings_total: 500000,
      monthly_growth: 15,
    }))
  }),

  http.get('/api/admin/audit.php', () => {
    return HttpResponse.json(mockApiResponses.success({
      logs: [
        {
          id: 1,
          user_id: 1,
          action: 'login',
          details: 'User logged in',
          timestamp: '2023-01-01T00:00:00Z',
          ip_address: '192.168.1.1',
        },
      ],
    }))
  }),
]

// Create test server
export const server = setupServer(...handlers)

// Helper functions for test setup
export const setupTestServer = () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())
}

// Mock specific endpoints for testing error scenarios
export const mockErrorResponse = (endpoint: string, errorMessage: string, status = 500) => {
  server.use(
    http.get(endpoint, () => {
      return HttpResponse.json(mockApiResponses.error(errorMessage), { status })
    }),
    http.post(endpoint, () => {
      return HttpResponse.json(mockApiResponses.error(errorMessage), { status })
    }),
    http.put(endpoint, () => {
      return HttpResponse.json(mockApiResponses.error(errorMessage), { status })
    }),
    http.delete(endpoint, () => {
      return HttpResponse.json(mockApiResponses.error(errorMessage), { status })
    })
  )
}

// Mock network error
export const mockNetworkError = (endpoint: string) => {
  server.use(
    http.get(endpoint, () => {
      return HttpResponse.error()
    }),
    http.post(endpoint, () => {
      return HttpResponse.error()
    }),
    http.put(endpoint, () => {
      return HttpResponse.error()
    }),
    http.delete(endpoint, () => {
      return HttpResponse.error()
    })
  )
}