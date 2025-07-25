'use client';

import { useState, useEffect } from 'react';
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
  Eye
} from 'lucide-react';

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
  user_permission: 'owner' | 'cc' | 'none';
  last_savings_date: string | null;
  savings_records_count: number;
}

interface ProjectsTableProps {
  className?: string;
}

export function ProjectsTable({ className }: ProjectsTableProps) {
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
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getPermissionBadge = (permission: string) => {
    switch (permission) {
      case 'owner':
        return <Badge variant="default">Sahip</Badge>;
      case 'cc':
        return <Badge variant="secondary">CC</Badge>;
      default:
        return <Badge variant="outline">Görüntüleyici</Badge>;
    }
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
          <div className="text-sm text-muted-foreground">
            Toplam: {totalRecords} proje
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
                  <TableHead className="cursor-pointer" onClick={() => handleSort('total_savings')}>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Tasarruf {getSortIcon('total_savings')}
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
                        <p className="font-medium text-green-600">
                          {formatCurrency(project.total_savings)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {project.savings_records_count} kayıt
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPermissionBadge(project.user_permission)}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Detay
                      </Button>
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
    </Card>
  );
}