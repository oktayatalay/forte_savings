import React from 'react';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ProjectsTable } from '../projects-table';
import { 
  render, 
  mockProject, 
  setupLocalStorageMock,
  mockRouter,
} from '@/lib/test-utils';
import { setupTestServer, mockErrorResponse, server } from '@/lib/test-mocks';
import { http, HttpResponse } from 'msw';

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

// Mock ProjectForm component
jest.mock('../project-form', () => ({
  ProjectForm: ({ open, onOpenChange, onSuccess, projectData }: any) => (
    <div data-testid="project-form" style={{ display: open ? 'block' : 'none' }}>
      <div>Project Form</div>
      <div data-testid="project-data">{projectData ? 'Edit Mode' : 'Create Mode'}</div>
      <button onClick={() => onOpenChange(false)}>Close</button>
      <button onClick={() => onSuccess({ id: 1, name: 'Test Project' })}>
        Save
      </button>
    </div>
  ),
}));

// Mock multiple projects response
const mockMultipleProjects = [
  { ...mockProject, id: 1, frn: 'FRN001', project_name: 'Project 1' },
  { ...mockProject, id: 2, frn: 'FRN002', project_name: 'Project 2' },
  { ...mockProject, id: 3, frn: 'FRN003', project_name: 'Project 3' },
];

describe('ProjectsTable Component', () => {
  const mockOnProjectUpdated = jest.fn();
  const mockOnNewProject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful projects list response
    server.use(
      http.get('/api/projects/list.php', () => {
        return HttpResponse.json({
          success: true,
          data: {
            projects: mockMultipleProjects,
            total: 3,
            page: 1,
            limit: 10,
            total_pages: 1,
          },
        });
      })
    );
  });

  describe('Loading and Data Fetching', () => {
    it('should show loading state initially', () => {
      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      expect(screen.getByText('Projeler yükleniyor...')).toBeInTheDocument();
    });

    it('should render projects table after loading', async () => {
      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Projeler')).toBeInTheDocument();
        expect(screen.getByText('Project 1')).toBeInTheDocument();
        expect(screen.getByText('Project 2')).toBeInTheDocument();
        expect(screen.getByText('Project 3')).toBeInTheDocument();
      });
    });

    it('should display correct project information', async () => {
      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('FRN001')).toBeInTheDocument();
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should render search input', async () => {
      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Proje ara/);
        expect(searchInput).toBeInTheDocument();
      });
    });

    it('should filter projects based on search term', async () => {
      const user = userEvent.setup();
      
      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Proje ara/);
      await user.type(searchInput, 'Project 1');

      // Wait for debounced search
      await waitFor(() => {
        expect(screen.getByText('Project 1')).toBeInTheDocument();
        expect(screen.queryByText('Project 2')).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should show no results message when search yields no results', async () => {
      const user = userEvent.setup();
      
      // Mock empty search result
      server.use(
        http.get('/api/projects/list.php', ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('search');
          
          if (search === 'nonexistent') {
            return HttpResponse.json({
              success: true,
              data: {
                projects: [],
                total: 0,
                page: 1,
                limit: 10,
                total_pages: 0,
              },
            });
          }
          
          return HttpResponse.json({
            success: true,
            data: {
              projects: mockMultipleProjects,
              total: 3,
              page: 1,
              limit: 10,
              total_pages: 1,
            },
          });
        })
      );

      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Proje ara/);
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText(/Proje bulunamadı/)).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Sorting Functionality', () => {
    it('should render sortable column headers', async () => {
      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('FRN')).toBeInTheDocument();
        expect(screen.getByText('Proje Adı')).toBeInTheDocument();
        expect(screen.getByText('Müşteri')).toBeInTheDocument();
      });
    });

    it('should handle column sorting', async () => {
      const user = userEvent.setup();
      
      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('FRN')).toBeInTheDocument();
      });

      // Click on FRN column to sort
      const frnHeader = screen.getByText('FRN');
      await user.click(frnHeader);

      // Verify sorting indicator is shown
      expect(screen.getByTestId('sort-asc')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should show pagination controls when needed', async () => {
      // Mock response with multiple pages
      server.use(
        http.get('/api/projects/list.php', () => {
          return HttpResponse.json({
            success: true,
            data: {
              projects: mockMultipleProjects,
              total: 25,
              page: 1,
              limit: 10,
              total_pages: 3,
            },
          });
        })
      );

      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Sayfa 1 / 3')).toBeInTheDocument();
        expect(screen.getByLabelText('Sonraki sayfa')).toBeInTheDocument();
      });
    });

    it('should handle page navigation', async () => {
      const user = userEvent.setup();
      
      // Mock response with multiple pages
      server.use(
        http.get('/api/projects/list.php', ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get('page') || '1';
          
          return HttpResponse.json({
            success: true,
            data: {
              projects: mockMultipleProjects,
              total: 25,
              page: parseInt(page),
              limit: 10,
              total_pages: 3,
            },
          });
        })
      );

      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Sayfa 1 / 3')).toBeInTheDocument();
      });

      const nextButton = screen.getByLabelText('Sonraki sayfa');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Sayfa 2 / 3')).toBeInTheDocument();
      });
    });
  });

  describe('Project Actions', () => {
    it('should show action buttons for each project', async () => {
      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        const actionButtons = screen.getAllByLabelText('Proje işlemleri');
        expect(actionButtons).toHaveLength(3);
      });
    });

    it('should open project detail when view button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project 1')).toBeInTheDocument();
      });

      const firstActionButton = screen.getAllByLabelText('Proje işlemleri')[0];
      await user.click(firstActionButton);

      const viewButton = screen.getByText('Detayları Görüntüle');
      await user.click(viewButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/project-detail?id=1');
    });

    it('should open edit form when edit button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project 1')).toBeInTheDocument();
      });

      const firstActionButton = screen.getAllByLabelText('Proje işlemleri')[0];
      await user.click(firstActionButton);

      const editButton = screen.getByText('Düzenle');
      await user.click(editButton);

      expect(screen.getByTestId('project-form')).toBeInTheDocument();
      expect(screen.getByTestId('project-data')).toHaveTextContent('Edit Mode');
    });

    it('should handle project deletion', async () => {
      const user = userEvent.setup();
      
      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project 1')).toBeInTheDocument();
      });

      const firstActionButton = screen.getAllByLabelText('Proje işlemleri')[0];
      await user.click(firstActionButton);

      const deleteButton = screen.getByText('Sil');
      await user.click(deleteButton);

      // Check if confirmation dialog appears
      expect(screen.getByText('Projeyi Sil')).toBeInTheDocument();
      expect(screen.getByText(/Bu işlem geri alınamaz/)).toBeInTheDocument();

      // Confirm deletion
      const confirmButton = screen.getByText('Sil', { selector: 'button' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnProjectUpdated).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when API fails', async () => {
      mockErrorResponse('/api/projects/list.php', 'Server error', 500);

      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Server error/)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      server.use(
        http.get('/api/projects/list.php', () => {
          return HttpResponse.error();
        })
      );

      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Bağlantı hatası/)).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no projects exist', async () => {
      server.use(
        http.get('/api/projects/list.php', () => {
          return HttpResponse.json({
            success: true,
            data: {
              projects: [],
              total: 0,
              page: 1,
              limit: 10,
              total_pages: 0,
            },
          });
        })
      );

      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Henüz proje bulunmuyor')).toBeInTheDocument();
        expect(screen.getByText('İlk Proje Oluştur')).toBeInTheDocument();
      });
    });

    it('should call onNewProject when create button is clicked in empty state', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.get('/api/projects/list.php', () => {
          return HttpResponse.json({
            success: true,
            data: {
              projects: [],
              total: 0,
              page: 1,
              limit: 10,
              total_pages: 0,
            },
          });
        })
      );

      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('İlk Proje Oluştur')).toBeInTheDocument();
      });

      const createButton = screen.getByText('İlk Proje Oluştur');
      await user.click(createButton);

      expect(mockOnNewProject).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Projeler')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper table structure', async () => {
      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getAllByRole('columnheader')).toHaveLength(7);
        expect(screen.getAllByRole('row')).toHaveLength(4); // 1 header + 3 data rows
      });
    });

    it('should have proper ARIA labels', async () => {
      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Projeler tablosu')).toBeInTheDocument();
        expect(screen.getByLabelText('Proje ara')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation for action buttons', async () => {
      const user = userEvent.setup();
      
      render(
        <ProjectsTable 
          onProjectUpdated={mockOnProjectUpdated}
          onNewProject={mockOnNewProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Project 1')).toBeInTheDocument();
      });

      const firstActionButton = screen.getAllByLabelText('Proje işlemleri')[0];
      
      // Focus the button
      firstActionButton.focus();
      expect(firstActionButton).toHaveFocus();

      // Open dropdown with Enter key
      await user.keyboard('{Enter}');
      
      expect(screen.getByText('Detayları Görüntüle')).toBeInTheDocument();
    });
  });
});