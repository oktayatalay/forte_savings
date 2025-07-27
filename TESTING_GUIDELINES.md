# Testing Guidelines and Best Practices

## Overview

This document outlines the testing standards, practices, and guidelines for the Forte Savings frontend application. Our testing strategy focuses on ensuring code quality, accessibility, performance, and user experience.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Testing Stack](#testing-stack)
3. [Test Structure](#test-structure)
4. [Testing Best Practices](#testing-best-practices)
5. [Component Testing](#component-testing)
6. [Accessibility Testing](#accessibility-testing)
7. [Performance Testing](#performance-testing)
8. [Error Boundary Testing](#error-boundary-testing)
9. [API Mocking](#api-mocking)
10. [Running Tests](#running-tests)
11. [Coverage Requirements](#coverage-requirements)
12. [Troubleshooting](#troubleshooting)

## Testing Philosophy

Our testing approach follows the testing pyramid:

1. **Unit Tests (70%)**: Test individual components and functions in isolation
2. **Integration Tests (20%)**: Test component interactions and API integrations
3. **End-to-End Tests (10%)**: Test complete user workflows

### Key Principles

- **Test behavior, not implementation**: Focus on what the user experiences
- **Accessibility first**: Every component should pass accessibility tests
- **Performance conscious**: Monitor and test performance impacts
- **User-centric**: Write tests from the user's perspective
- **Maintainable**: Tests should be easy to read and maintain

## Testing Stack

### Core Testing Libraries

- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **jest-axe**: Accessibility testing
- **MSW (Mock Service Worker)**: API mocking
- **@testing-library/user-event**: User interaction simulation

### Supporting Tools

- **web-vitals**: Performance monitoring
- **TypeScript**: Type safety in tests
- **ESLint**: Code quality for test files

## Test Structure

### File Organization

```
src/
├── components/
│   ├── Component.tsx
│   └── __tests__/
│       ├── Component.test.tsx
│       └── Component.accessibility.test.tsx
├── pages/
│   ├── page.tsx
│   └── __tests__/
│       └── page.test.tsx
├── lib/
│   ├── utility.ts
│   └── __tests__/
│       └── utility.test.ts
└── __tests__/
    ├── setup.ts
    └── helpers/
```

### Test File Naming

- **Unit tests**: `Component.test.tsx`
- **Integration tests**: `Component.integration.test.tsx`
- **Accessibility tests**: `Component.accessibility.test.tsx`
- **Performance tests**: `Component.performance.test.tsx`

### Test Structure Template

```typescript
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@/lib/test-utils';
import { ComponentName } from '../ComponentName';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup for each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      // Test basic rendering
    });

    it('should render with custom props', () => {
      // Test with different prop combinations
    });
  });

  describe('User Interactions', () => {
    it('should handle click events', async () => {
      // Test user interactions
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      // Accessibility tests
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', () => {
      // Error scenarios
    });
  });
});
```

## Testing Best Practices

### 1. Use Descriptive Test Names

```typescript
// ❌ Bad
it('should work', () => {});

// ✅ Good
it('should display error message when API call fails', () => {});
```

### 2. Test User Behavior

```typescript
// ❌ Bad - Testing implementation
expect(component.state.isLoading).toBe(true);

// ✅ Good - Testing behavior
expect(screen.getByText('Loading...')).toBeInTheDocument();
```

### 3. Use Custom Render Function

```typescript
import { render } from '@/lib/test-utils';

// This includes theme providers and other context
render(<MyComponent />);
```

### 4. Mock External Dependencies

```typescript
// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock API calls with MSW
setupTestServer();
```

### 5. Test Async Operations

```typescript
it('should load data on mount', async () => {
  render(<DataComponent />);
  
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

### 6. Group Related Tests

```typescript
describe('Authentication', () => {
  describe('when user is logged in', () => {
    beforeEach(() => {
      mockAuthState(true);
    });

    it('should show user menu', () => {
      // Test authenticated state
    });
  });

  describe('when user is not logged in', () => {
    beforeEach(() => {
      mockAuthState(false);
    });

    it('should show login button', () => {
      // Test unauthenticated state
    });
  });
});
```

## Component Testing

### Testing Components with Props

```typescript
it('should display project name', () => {
  const project = {
    id: 1,
    name: 'Test Project',
    customer: 'Test Customer'
  };

  render(<ProjectCard project={project} />);
  
  expect(screen.getByText('Test Project')).toBeInTheDocument();
  expect(screen.getByText('Test Customer')).toBeInTheDocument();
});
```

### Testing Form Components

```typescript
it('should submit form with valid data', async () => {
  const user = userEvent.setup();
  const onSubmit = jest.fn();

  render(<ProjectForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText('Project Name'), 'New Project');
  await user.type(screen.getByLabelText('Customer'), 'Customer Name');
  await user.click(screen.getByRole('button', { name: 'Submit' }));

  expect(onSubmit).toHaveBeenCalledWith({
    projectName: 'New Project',
    customer: 'Customer Name'
  });
});
```

### Testing Error States

```typescript
it('should display error message on API failure', async () => {
  // Mock API error
  mockErrorResponse('/api/projects', 'Server error', 500);

  render(<ProjectsList />);

  await waitFor(() => {
    expect(screen.getByText('Server error')).toBeInTheDocument();
  });
});
```

## Accessibility Testing

### Basic Accessibility Test

```typescript
it('should not have accessibility violations', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Comprehensive Accessibility Testing

```typescript
import { runAccessibilityTestSuite } from '@/lib/accessibility-utils';

it('should pass comprehensive accessibility tests', async () => {
  const renderResult = render(<ComplexComponent />);
  await runAccessibilityTestSuite(renderResult, {
    testDescription: 'ComplexComponent'
  });
});
```

### Testing Keyboard Navigation

```typescript
it('should support keyboard navigation', async () => {
  const user = userEvent.setup();
  
  render(<NavigationMenu />);

  // Tab through focusable elements
  await user.tab();
  expect(screen.getByText('Home')).toHaveFocus();

  await user.tab();
  expect(screen.getByText('Projects')).toHaveFocus();

  // Test arrow key navigation
  await user.keyboard('{ArrowDown}');
  expect(screen.getByText('New Project')).toHaveFocus();
});
```

### Testing Screen Reader Content

```typescript
it('should provide appropriate screen reader content', () => {
  render(<DataTable />);

  expect(screen.getByLabelText('Projects table')).toBeInTheDocument();
  expect(screen.getByText('Sort by project name')).toBeInTheDocument();
});
```

## Performance Testing

### Testing Component Render Performance

```typescript
import { withPerformanceTracking } from '@/lib/performance-monitoring';

it('should render within performance threshold', () => {
  const startTime = performance.now();
  
  render(<LargeDataTable data={largeDataset} />);
  
  const renderTime = performance.now() - startTime;
  expect(renderTime).toBeLessThan(100); // 100ms threshold
});
```

### Testing User Journey Performance

```typescript
import { trackDashboardLoadJourney } from '@/lib/user-journey-tracking';

it('should complete dashboard load journey efficiently', async () => {
  const journey = trackDashboardLoadJourney();
  
  render(<DashboardPage />);
  
  journey.addAuthCheck();
  
  await waitFor(() => {
    journey.addStatsLoad(50, true);
    journey.addChartsRender();
    journey.complete(true);
  });

  // Verify journey completed within acceptable time
  const stats = journeyTracker.getJourneyStats(UserJourney.DASHBOARD_LOAD);
  expect(stats.averageDuration).toBeLessThan(2000); // 2 seconds
});
```

## Error Boundary Testing

### Testing Error Boundaries

```typescript
import { ErrorBoundary } from '@/components/error-boundary';

const ThrowingComponent = () => {
  throw new Error('Test error');
};

it('should catch and display errors', () => {
  render(
    <ErrorBoundary>
      <ThrowingComponent />
    </ErrorBoundary>
  );

  expect(screen.getByText('Bir şeyler yanlış gitti')).toBeInTheDocument();
  expect(screen.getByText('Tekrar Dene')).toBeInTheDocument();
});

it('should reset error on retry', () => {
  const { rerender } = render(
    <ErrorBoundary>
      <ThrowingComponent />
    </ErrorBoundary>
  );

  fireEvent.click(screen.getByText('Tekrar Dene'));

  rerender(
    <ErrorBoundary>
      <div>Working component</div>
    </ErrorBoundary>
  );

  expect(screen.getByText('Working component')).toBeInTheDocument();
});
```

## API Mocking

### Setting Up MSW

```typescript
import { setupTestServer } from '@/lib/test-mocks';

// In test files
setupTestServer();
```

### Mocking Specific Endpoints

```typescript
import { server, mockErrorResponse } from '@/lib/test-mocks';

it('should handle API errors', async () => {
  mockErrorResponse('/api/projects', 'Network error', 500);

  render(<ProjectsList />);

  await waitFor(() => {
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });
});
```

### Custom Response Mocking

```typescript
import { http, HttpResponse } from 'msw';

it('should handle custom API response', async () => {
  server.use(
    http.get('/api/projects', () => {
      return HttpResponse.json({
        success: true,
        data: { projects: mockProjects }
      });
    })
  );

  render(<ProjectsList />);

  await waitFor(() => {
    expect(screen.getByText('Project 1')).toBeInTheDocument();
  });
});
```

## Running Tests

### Development Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only accessibility tests
npm run test:accessibility

# Run tests for CI
npm run test:ci
```

### Running Specific Tests

```bash
# Run tests for specific file
npm test -- ProjectsList.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="accessibility"

# Run tests in specific directory
npm test -- src/components/ui/
```

### Debug Mode

```bash
# Run tests with Node debugger
npm test -- --inspect-brk

# Run single test file in debug mode
npm test -- --inspect-brk ProjectsList.test.tsx
```

## Coverage Requirements

### Minimum Coverage Thresholds

- **Statements**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%

### Critical Components

These components require 90%+ coverage:

- Authentication components
- Form components
- Error boundaries
- Security-related utilities

### Coverage Exclusions

- Type definition files (`.d.ts`)
- Configuration files
- Test utilities
- Third-party library wrappers

### Viewing Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Open HTML coverage report
open coverage/lcov-report/index.html
```

## Troubleshooting

### Common Issues

#### 1. Tests Timing Out

```typescript
// Increase timeout for slow tests
it('should load large dataset', async () => {
  // ... test code
}, 10000); // 10 second timeout
```

#### 2. Async Test Issues

```typescript
// Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Wait for element to disappear
await waitForElementToBeRemoved(() => screen.queryByText('Loading...'));
```

#### 3. Mock Issues

```typescript
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Reset MSW handlers
afterEach(() => {
  server.resetHandlers();
});
```

#### 4. Memory Leaks

```typescript
// Clean up after tests
afterEach(() => {
  cleanup();
  jest.clearAllTimers();
});
```

### Debug Techniques

#### 1. Debug Component State

```typescript
// Use screen.debug() to see rendered output
render(<Component />);
screen.debug();
```

#### 2. Debug Queries

```typescript
// Use logRoles to see available roles
render(<Component />);
logRoles(container);
```

#### 3. Debug Events

```typescript
// Log user events
const user = userEvent.setup({ delay: null });
await user.click(button);
```

## Best Practices Summary

1. **Write tests first** (TDD approach)
2. **Test user behavior**, not implementation
3. **Keep tests simple** and focused
4. **Use descriptive test names**
5. **Mock external dependencies**
6. **Test error scenarios**
7. **Include accessibility tests**
8. **Monitor performance**
9. **Maintain high coverage**
10. **Keep tests fast** and reliable

## Resources

- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [MSW Documentation](https://mswjs.io/docs/)
- [jest-axe Documentation](https://github.com/nickcolley/jest-axe)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## Contributing

When adding new tests:

1. Follow the established patterns
2. Include accessibility tests
3. Add performance considerations
4. Update documentation if needed
5. Ensure tests pass CI pipeline

For questions or suggestions, please reach out to the development team.