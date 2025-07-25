'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Calendar, Users, MapPin, Building, DollarSign, FileText, TrendingUp, Plus, Edit, Trash } from 'lucide-react';
import { SavingsRecordForm } from '@/components/savings-record-form';

interface ProjectDetail {
  id: number;
  frn: string;
  entity: string;
  customer: string;
  project_name: string;
  event_type: string;
  project_type: string;
  group_in: string;
  group_out: string;
  location: string;
  hotels: string;
  po_amount: number;
  forte_responsible: string;
  project_director: string;
  forte_cc_person: string;
  client_representative: string;
  customer_po_number: string;
  hcp_count: number;
  colleague_count: number;
  external_non_hcp_count: number;
  total_savings: number;
  created_by_name: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
}

interface SavingsRecord {
  id: number;
  date: string;
  type: 'Cost Avoidance' | 'Savings';
  explanation_category: string;
  explanation_custom: string;
  category: string;
  price: number;
  unit: number;
  currency: string;
  total_price: number;
  created_by_name: string;
  created_at: string;
}

interface ProjectTeam {
  permission_type: string;
  name: string;
  email: string;
}

interface Statistics {
  total_savings_records: number;
  total_cost_avoidance: number;
  total_savings: number;
  total_amount: number;
  last_record_date: string | null;
}

function ProjectDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');
  
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [savingsRecords, setSavingsRecords] = useState<SavingsRecord[]>([]);
  const [projectTeam, setProjectTeam] = useState<ProjectTeam[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [userPermission, setUserPermission] = useState<string>('viewer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SavingsRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchProjectDetail = async () => {
      try {
        if (!projectId) {
          setError('Proje ID\'si gerekli.');
          return;
        }

        const token = localStorage.getItem('auth_token');
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const response = await fetch(`/api/projects/detail.php?id=${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('auth_token');
            router.push('/auth/login');
            return;
          }
          if (response.status === 403) {
            setError('Bu projeyi görüntüleme yetkiniz yok.');
            return;
          }
          if (response.status === 404) {
            setError('Proje bulunamadı.');
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          setProject(data.data.project);
          setSavingsRecords(data.data.savings_records);
          setProjectTeam(data.data.project_team);
          setStatistics(data.data.statistics);
          setUserPermission(data.data.user_permission);
        } else {
          setError(data.error || 'Proje detayları yüklenirken hata oluştu.');
        }
      } catch (err) {
        console.error('Project detail fetch error:', err);
        setError('Proje detayları yüklenirken hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetail();
  }, [projectId, router]);

  const handleSavingsRecordAdded = (newRecord: SavingsRecord) => {
    // Yeni kayıt eklendikten sonra listeyi güncelle
    setSavingsRecords(prev => [newRecord, ...prev]);
    
    // İstatistikleri güncelle
    if (statistics) {
      const newStats = { ...statistics };
      newStats.total_savings_records += 1;
      
      if (newRecord.type === 'Savings') {
        newStats.total_savings += newRecord.total_price;
      } else {
        newStats.total_cost_avoidance += newRecord.total_price;
      }
      newStats.total_amount += newRecord.total_price;
      
      if (!newStats.last_record_date || newRecord.date > newStats.last_record_date) {
        newStats.last_record_date = newRecord.date;
      }
      
      setStatistics(newStats);
    }
  };

  const handleEdit = (record: SavingsRecord) => {
    setEditingRecord(record);
    setShowAddForm(true);
  };

  const handleSavingsRecordUpdated = (updatedRecord: SavingsRecord) => {
    // Güncellenen kayıt ile listeyi güncelle
    setSavingsRecords(prev => 
      prev.map(record => 
        record.id === updatedRecord.id ? updatedRecord : record
      )
    );
    
    // İstatistikleri yeniden hesapla
    if (statistics) {
      const totalSavings = savingsRecords.reduce((sum, record) => {
        if (record.id === updatedRecord.id) {
          return sum + (updatedRecord.type === 'Savings' ? updatedRecord.total_price : 0);
        }
        return sum + (record.type === 'Savings' ? record.total_price : 0);
      }, 0);
      
      const totalCostAvoidance = savingsRecords.reduce((sum, record) => {
        if (record.id === updatedRecord.id) {
          return sum + (updatedRecord.type === 'Cost Avoidance' ? updatedRecord.total_price : 0);
        }
        return sum + (record.type === 'Cost Avoidance' ? record.total_price : 0);
      }, 0);
      
      setStatistics({
        ...statistics,
        total_savings: totalSavings,
        total_cost_avoidance: totalCostAvoidance,
        total_amount: totalSavings + totalCostAvoidance
      });
    }
    
    setEditingRecord(null);
  };

  const handleDelete = async (recordId: number) => {
    if (!confirm('Bu tasarruf kaydını silmek istediğinizden emin misiniz?')) {
      return;
    }

    setDeletingId(recordId);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('/api/savings/delete.php', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: recordId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        // Silinen kaydı listeden kaldır
        const deletedRecord = savingsRecords.find(r => r.id === recordId);
        setSavingsRecords(prev => prev.filter(record => record.id !== recordId));
        
        // İstatistikleri güncelle
        if (statistics && deletedRecord) {
          const newStats = { ...statistics };
          newStats.total_savings_records -= 1;
          
          if (deletedRecord.type === 'Savings') {
            newStats.total_savings -= deletedRecord.total_price;
          } else {
            newStats.total_cost_avoidance -= deletedRecord.total_price;
          }
          newStats.total_amount -= deletedRecord.total_price;
          
          setStatistics(newStats);
        }
      } else {
        throw new Error(data.error || 'Kayıt silinirken hata oluştu');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert(err instanceof Error ? err.message : 'Kayıt silinirken hata oluştu');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFormClose = () => {
    setShowAddForm(false);
    setEditingRecord(null);
  };

  const formatCurrency = (amount: number, currency: string = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('tr-TR');
    } catch {
      return dateString;
    }
  };

  const getPermissionBadge = (permission: string) => {
    switch (permission) {
      case 'admin':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Admin</Badge>;
      case 'owner':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Sahip</Badge>;
      case 'cc':
        return <Badge className="bg-green-500 hover:bg-green-600">CC</Badge>;
      default:
        return <Badge variant="secondary">Görüntüleyici</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === 'Savings' ? (
      <Badge className="bg-green-500 hover:bg-green-600">Tasarruf</Badge>
    ) : (
      <Badge className="bg-blue-500 hover:bg-blue-600">Maliyet Engelleme</Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="text-red-600 text-lg font-medium">{error}</div>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard'a Dön
          </Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="text-gray-600 text-lg">Proje bulunamadı.</div>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard'a Dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={() => router.push('/dashboard')} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.project_name}</h1>
            <p className="text-gray-600">{project.customer} • {project.frn}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getPermissionBadge(userPermission)}
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Tasarruf</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(statistics.total_savings)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maliyet Engelleme</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(statistics.total_cost_avoidance)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Kayıt</CardTitle>
              <FileText className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_savings_records}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Son Kayıt</CardTitle>
              <Calendar className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.last_record_date ? formatDate(statistics.last_record_date) : 'Yok'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Proje Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">FRN</label>
                <p className="font-medium">{project.frn}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Müşteri</label>
                <p className="font-medium">{project.customer}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Etkinlik Türü</label>
                <p className="font-medium">{project.event_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Proje Türü</label>
                <p className="font-medium">{project.project_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Giriş Tarihi</label>
                <p className="font-medium">{formatDate(project.group_in)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Çıkış Tarihi</label>
                <p className="font-medium">{formatDate(project.group_out)}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Lokasyon</label>
              <p className="font-medium flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {project.location}
              </p>
            </div>
            {project.hotels && (
              <div>
                <label className="text-sm font-medium text-gray-600">Oteller</label>
                <p className="font-medium">{project.hotels}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-600">PO Tutarı</label>
              <p className="font-medium text-lg">{formatCurrency(project.po_amount)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Ekip ve İletişim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Forte Sorumlusu</label>
              <p className="font-medium">{project.forte_responsible}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Proje Direktörü</label>
              <p className="font-medium">{project.project_director}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Forte CC</label>
              <p className="font-medium">{project.forte_cc_person}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Müşteri Temsilcisi</label>
              <p className="font-medium">{project.client_representative}</p>
            </div>
            {project.customer_po_number && (
              <div>
                <label className="text-sm font-medium text-gray-600">Müşteri PO Numarası</label>
                <p className="font-medium">{project.customer_po_number}</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{project.hcp_count}</p>
                <p className="text-sm text-gray-600">HCP</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{project.colleague_count}</p>
                <p className="text-sm text-gray-600">Forte</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{project.external_non_hcp_count}</p>
                <p className="text-sm text-gray-600">Diğer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Savings Records Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tasarruf Kayıtları</CardTitle>
              <CardDescription>
                {savingsRecords.length} kayıt bulundu • Toplam: {formatCurrency(statistics?.total_amount || 0)}
              </CardDescription>
            </div>
            {(userPermission === 'admin' || userPermission === 'owner' || userPermission === 'cc') && (
              <Button 
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Yeni Kayıt Ekle
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {savingsRecords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-right">Birim Fiyat</TableHead>
                  <TableHead className="text-right">Adet</TableHead>
                  <TableHead className="text-right">Toplam</TableHead>
                  <TableHead>Oluşturan</TableHead>
                  <TableHead className="text-center">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savingsRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDate(record.date)}</TableCell>
                    <TableCell>{getTypeBadge(record.type)}</TableCell>
                    <TableCell>{record.category}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {record.explanation_custom || record.explanation_category}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(record.price, record.currency)}
                    </TableCell>
                    <TableCell className="text-right">{record.unit}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(record.total_price, record.currency)}
                    </TableCell>
                    <TableCell>{record.created_by_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        {(userPermission === 'admin' || userPermission === 'owner' || userPermission === 'cc') && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(record)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(record.id)}
                              disabled={deletingId === record.id}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Henüz tasarruf kaydı bulunmuyor.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Savings Record Form Modal */}
      {project && (
        <SavingsRecordForm
          open={showAddForm}
          onOpenChange={handleFormClose}
          projectId={project.id}
          onSuccess={editingRecord ? handleSavingsRecordUpdated : handleSavingsRecordAdded}
          editRecord={editingRecord}
        />
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    }>
      <ProjectDetailContent />
    </Suspense>
  );
}