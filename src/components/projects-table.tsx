'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  FileText, 
  Calendar,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Building,
  DollarSign
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ProjectForm } from '@/components/project-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Project {
  id: number;
  frn: string;
  customer: string;
  project_name: string;
  forte_responsible: string;
  project_director: string;
  forte_cc_person: string;
  group_in: string;
  group_out: string;
  total_savings: number;
  po_amount: number;
  location: string;
  event_type: string;
  project_type: string;
  created_at: string;
  updated_at: string;
  created_by_name: string;
  user_permission: 'owner' | 'cc' | 'none' | 'admin';
  last_savings_date: string | null;
  savings_records_count: number;
  actual_savings: number;
  cost_avoidance: number;
  savings_by_currency: Array<{
    currency: string;
    savings: number;
    cost_avoidance: number;
    total: number;
  }>;
}

interface ProjectsTableProps {
  className?: string;
  onProjectUpdated?: () => void;
  onNewProject?: () => void;
}

interface DeleteConfirmation {
  project: Project;
  show: boolean;
  loading: boolean;
}

export function ProjectsTable({ className, onProjectUpdated, onNewProject }: ProjectsTableProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Sayfalama
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [perPage] = useState(10);
  
  // Filtreleme ve sıralama
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  
  // Edit/Delete states
  const [editProject, setEditProject] = useState<any>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    project: {} as Project,
    show: false,
    loading: false
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setError('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }

      const params = {
        page: currentPage,
        limit: perPage,
        search: searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder
      };

      const response = await fetch('/api/projects/list-simple.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Projeler yüklenirken hata oluştu.');
      }

      if (data.success) {
        setProjects(data.data.projects || []);
        // Basit endpoint için pagination bilgileri olmayabilir
        setCurrentPage(data.data.pagination?.current_page || 1);
        setTotalPages(data.data.pagination?.total_pages || 1);
        setTotalRecords(data.data.pagination?.total_records || data.data.count || 0);
        setError('');
      } else {
        setError(data.error || 'Beklenmeyen bir hata oluştu.');
      }
    } catch (err: any) {
      setError(err.message || 'Bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [currentPage, sortBy, sortOrder]);

  // Arama işlemi (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        fetchProjects();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortOrder === 'ASC' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Geçersiz Tarih';
      return date.toLocaleDateString('tr-TR');
    } catch (error) {
      return 'Geçersiz Tarih';
    }
  };

  const getPermissionBadge = (permission: string) => {
    switch (permission) {
      case 'admin':
        return <Badge className="bg-orange-500 text-white">Admin</Badge>;
      case 'owner':
        return <Badge variant="default">Sahip</Badge>;
      case 'cc':
        return <Badge variant="secondary">CC</Badge>;
      default:
        return <Badge variant="outline">Görüntüleyici</Badge>;
    }
  };

  const handleEdit = (project: Project) => {
    setEditProject(project);
    setShowEditForm(true);
  };

  const handleProjectUpdated = (updatedProject: any) => {
    // Listeyi güncelle - API'den gelen temel proje bilgilerini mevcut proje ile merge et
    setProjects(prev => prev.map(p => {
      if (p.id === updatedProject.id) {
        return {
          ...p,
          ...updatedProject,
          user_permission: p.user_permission, // Mevcut permission'ı koru
          last_savings_date: p.last_savings_date, // Mevcut değerleri koru
          savings_records_count: p.savings_records_count
        };
      }
      return p;
    }));
    setShowEditForm(false);
    setEditProject(null);
    if (onProjectUpdated) {
      onProjectUpdated();
    }
  };

  const handleDeleteRequest = (project: Project) => {
    setDeleteConfirmation({
      project,
      show: true,
      loading: false
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirmation.project.id) return;
    
    setDeleteConfirmation(prev => ({ ...prev, loading: true }));
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('/api/projects/delete.php', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: deleteConfirmation.project.id,
          confirm: true 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        // Projeyi listeden kaldır
        setProjects(prev => prev.filter(p => p.id !== deleteConfirmation.project.id));
        setDeleteConfirmation({ project: {} as Project, show: false, loading: false });
        if (onProjectUpdated) {
          onProjectUpdated();
        }
      } else {
        throw new Error(data.error || 'Proje silinirken hata oluştu');
      }
    } catch (err) {
      console.error('Project delete error:', err);
      setError(err instanceof Error ? err.message : 'Proje silinirken hata oluştu');
      setDeleteConfirmation(prev => ({ ...prev, loading: false }));
    }
  };

  const canEditProject = (project: Project) => {
    return project.user_permission === 'owner' || project.user_permission === 'admin';
  };

  const canDeleteProject = (project: Project) => {
    return project.user_permission === 'owner' || project.user_permission === 'admin';
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Projelerim
            </CardTitle>
            <CardDescription>
              Sahip olduğunuz ve CC olarak atandığınız projeler
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Toplam: {totalRecords} proje
            </div>
            {onNewProject && (
              <Button 
                onClick={onNewProject}
                className="flex items-center gap-2"
              >
                <Building className="w-4 h-4" />
                Yeni Proje
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Arama çubuğu */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="FRN, müşteri, proje adı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tablo */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Projeler yükleniyor...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Henüz proje bulunmuyor</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Arama kriterlerinize uygun proje bulunamadı.' : 'İlk projenizi oluşturarak başlayın.'}
            </p>
            {!searchTerm && (
              <Button>
                Yeni Proje Oluştur
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('frn')}>
                    <div className="flex items-center gap-2">
                      FRN {getSortIcon('frn')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('customer')}>
                    <div className="flex items-center gap-2">
                      Müşteri {getSortIcon('customer')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('project_name')}>
                    <div className="flex items-center gap-2">
                      Proje Adı {getSortIcon('project_name')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('forte_responsible')}>
                    <div className="flex items-center gap-2">
                      Sorumlu {getSortIcon('forte_responsible')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('group_in')}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Başlangıç {getSortIcon('group_in')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('actual_savings')}>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      Tasarruf {getSortIcon('actual_savings')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('cost_avoidance')}>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      Maliyet Eng. {getSortIcon('cost_avoidance')}
                    </div>
                  </TableHead>
                  <TableHead>Yetki</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      {project.frn}
                    </TableCell>
                    <TableCell>{project.customer}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{project.project_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.location} • {project.event_type}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{project.forte_responsible}</p>
                        <p className="text-xs text-muted-foreground">
                          Direktör: {project.project_director}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{formatDate(project.group_in)}</p>
                        <p className="text-xs text-muted-foreground">
                          Bitiş: {formatDate(project.group_out)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {project.savings_by_currency.length === 0 ? (
                          <p className="font-medium text-green-600">₺0</p>
                        ) : (
                          <div className="space-y-0.5">
                            {project.savings_by_currency
                              .filter(c => c.savings > 0)
                              .map(currencyData => (
                              <p key={currencyData.currency} className="text-sm font-medium text-green-600">
                                {new Intl.NumberFormat('tr-TR', {
                                  style: 'currency',
                                  currency: currencyData.currency,
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }).format(currencyData.savings)}
                              </p>
                            ))}
                            {project.savings_by_currency.every(c => c.savings === 0) && (
                              <p className="font-medium text-green-600">₺0</p>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">Tasarruf</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {project.savings_by_currency.length === 0 ? (
                          <p className="font-medium text-blue-600">₺0</p>
                        ) : (
                          <div className="space-y-0.5">
                            {project.savings_by_currency
                              .filter(c => c.cost_avoidance > 0)
                              .map(currencyData => (
                              <p key={currencyData.currency} className="text-sm font-medium text-blue-600">
                                {new Intl.NumberFormat('tr-TR', {
                                  style: 'currency',
                                  currency: currencyData.currency,
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }).format(currencyData.cost_avoidance)}
                              </p>
                            ))}
                            {project.savings_by_currency.every(c => c.cost_avoidance === 0) && (
                              <p className="font-medium text-blue-600">₺0</p>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">Maliyet Eng.</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPermissionBadge(project.user_permission)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/dashboard/project-detail?id=${project.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Detay
                        </Button>
                        
                        {(canEditProject(project) || canDeleteProject(project)) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canEditProject(project) && (
                                <DropdownMenuItem onClick={() => handleEdit(project)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Düzenle
                                </DropdownMenuItem>
                              )}
                              {canDeleteProject(project) && (
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteRequest(project)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Sil
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Sayfalama */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  {totalRecords} kayıttan {((currentPage - 1) * perPage) + 1}-{Math.min(currentPage * perPage, totalRecords)} arası gösteriliyor
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Önceki
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-10 h-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Sonraki
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
      
      {/* Edit Project Modal */}
      <ProjectForm
        open={showEditForm}
        onOpenChange={setShowEditForm}
        onSuccess={handleProjectUpdated}
        editProject={editProject}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmation.show} onOpenChange={(open) => 
        !deleteConfirmation.loading && setDeleteConfirmation(prev => ({ ...prev, show: open }))
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projeyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteConfirmation.project.project_name}</strong> projesini silmek istediğinizden emin misiniz?
              <br /><br />
              <strong>FRN:</strong> {deleteConfirmation.project.frn}<br />
              <strong>Müşteri:</strong> {deleteConfirmation.project.customer}<br />
              <strong>Toplam Tasarruf:</strong> {formatCurrency(deleteConfirmation.project.total_savings || 0)}<br />
              <br />
              Bu işlem geri alınamaz ve proje ile ilgili tüm kayıtlar silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteConfirmation.loading}>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={deleteConfirmation.loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteConfirmation.loading ? 'Siliniyor...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}