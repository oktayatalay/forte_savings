'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Shield,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MoreVertical,
  Eye,
  UserCheck,
  UserX,
  Settings,
  History,
  FileText,
  Send
} from 'lucide-react';
import { EnhancedDataTable } from '@/components/enhanced-data-table';
import { useAdminAuth, PermissionCheck } from './admin-auth';

// User management interfaces
interface ExtendedUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'user' | 'admin' | 'super_admin';
  status: 'active' | 'inactive' | 'suspended';
  phone?: string;
  department?: string;
  position?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
  login_count: number;
  project_count: number;
  last_activity?: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
}

interface UserFilters {
  search: string;
  role: string;
  status: string;
  department: string;
  dateRange: string;
}

interface BulkAction {
  id: string;
  label: string;
  icon: any;
  action: (userIds: number[]) => void;
  requiresConfirmation?: boolean;
  permission?: string;
  variant?: 'default' | 'destructive';
}

interface UserFormData {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department: string;
  position: string;
  phone: string;
  status: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ExtendedUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: '',
    status: '',
    department: '',
    dateRange: ''
  });
  
  // Modal states
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ExtendedUser | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState<ExtendedUser | null>(null);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<UserFormData>({
    first_name: '',
    last_name: '',
    email: '',
    role: 'user',
    department: '',
    position: '',
    phone: '',
    status: 'active'
  });

  const { canManageUsers, canDeleteUsers, canManageRoles } = useAdminAuth();

  // Load users from API
  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users/list-final.php', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const result = await response.json();
      
      if (result.success) {
        // Ensure data structure with fallbacks
        const safeUsers = (result.data || []).map((user: any) => ({
          id: user.id || 0,
          email: user.email || '',
          first_name: user.first_name || 'Bilinmiyor',
          last_name: user.last_name || '',
          role: user.role || 'user',
          status: user.status || 'active',
          phone: user.phone || '',
          department: user.department || 'Belirtilmemiş',
          position: user.position || '',
          last_login: user.last_login || 'Hiç giriş yapmadı',
          created_at: user.created_at || '',
          updated_at: user.updated_at || '',
          login_count: user.activity_count || 0,
          project_count: user.project_count || 0,
          last_activity: user.last_activity || 'Bilinmiyor',
          email_verified: user.email_verified || false,
          two_factor_enabled: user.two_factor_enabled || false
        }));
        
        setUsers(safeUsers);
        setFilteredUsers(safeUsers);
      } else {
        throw new Error(result.message || 'Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      // Fallback to mock data if API fails
      const mockUsers: ExtendedUser[] = [
      {
        id: 1,
        email: 'ahmet.yilmaz@forte.com',
        first_name: 'Ahmet',
        last_name: 'Yılmaz',
        role: 'user',
        status: 'active',
        phone: '+90 532 123 4567',
        department: 'Finans',
        position: 'Finans Uzmanı',
        last_login: '2024-01-15 14:30:00',
        created_at: '2023-06-15 09:00:00',
        updated_at: '2024-01-15 14:30:00',
        login_count: 245,
        project_count: 12,
        last_activity: '2 dakika önce',
        email_verified: true,
        two_factor_enabled: false
      },
      {
        id: 2,
        email: 'fatma.koc@forte.com',
        first_name: 'Fatma',
        last_name: 'Koç',
        role: 'admin',
        status: 'active',
        phone: '+90 533 987 6543',
        department: 'IT',
        position: 'IT Yöneticisi',
        last_login: '2024-01-15 09:15:00',
        created_at: '2023-03-20 10:00:00',
        updated_at: '2024-01-15 09:15:00',
        login_count: 456,
        project_count: 28,
        last_activity: '1 saat önce',
        email_verified: true,
        two_factor_enabled: true
      },
      {
        id: 3,
        email: 'mehmet.celik@forte.com',
        first_name: 'Mehmet',
        last_name: 'Çelik',
        role: 'user',
        status: 'inactive',
        phone: '+90 534 555 1234',
        department: 'Operasyon',
        position: 'Operasyon Uzmanı',
        last_login: '2024-01-10 16:45:00',
        created_at: '2023-08-12 11:30:00',
        updated_at: '2024-01-10 16:45:00',
        login_count: 89,
        project_count: 5,
        last_activity: '5 gün önce',
        email_verified: true,
        two_factor_enabled: false
      },
      {
        id: 4,
        email: 'ayse.demir@forte.com',
        first_name: 'Ayşe',
        last_name: 'Demir',
        role: 'super_admin',
        status: 'active',
        phone: '+90 535 111 2222',
        department: 'Yönetim',
        position: 'Genel Müdür',
        last_login: '2024-01-15 08:00:00',
        created_at: '2023-01-01 00:00:00',
        updated_at: '2024-01-15 08:00:00',
        login_count: 1234,
        project_count: 45,
        last_activity: '3 saat önce',
        email_verified: true,
        two_factor_enabled: true
      }
      ];
      
      setUsers(mockUsers);
      setFilteredUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filter users based on current filters
  useEffect(() => {
    let filtered = users;
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(user =>
        user.first_name.toLowerCase().includes(searchLower) ||
        user.last_name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.department?.toLowerCase().includes(searchLower) ||
        user.position?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }
    
    if (filters.status) {
      filtered = filtered.filter(user => user.status === filters.status);
    }
    
    if (filters.department) {
      filtered = filtered.filter(user => user.department === filters.department);
    }
    
    setFilteredUsers(filtered);
  }, [users, filters]);

  // Bulk actions configuration
  const bulkActions: BulkAction[] = [
    {
      id: 'activate',
      label: 'Aktif Et',
      icon: CheckCircle2,
      action: (userIds) => handleBulkStatusChange(userIds, 'active'),
      requiresConfirmation: true
    },
    {
      id: 'deactivate',
      label: 'Pasif Et',
      icon: XCircle,
      action: (userIds) => handleBulkStatusChange(userIds, 'inactive'),
      requiresConfirmation: true
    },
    {
      id: 'reset_password',
      label: 'Şifre Sıfırla',
      icon: Lock,
      action: (userIds) => handleBulkPasswordReset(userIds),
      requiresConfirmation: true
    },
    {
      id: 'send_email',
      label: 'E-posta Gönder',
      icon: Send,
      action: (userIds) => handleBulkEmailSend(userIds)
    },
    {
      id: 'delete',
      label: 'Sil',
      icon: Trash2,
      action: (userIds) => handleBulkDelete(userIds),
      requiresConfirmation: true,
      permission: 'canDeleteUsers',
      variant: 'destructive'
    }
  ];

  // Table columns configuration
  const columns = [
    {
      key: 'user',
      label: 'Kullanıcı',
      sortable: true,
      render: (user: ExtendedUser) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
            {user.first_name[0]}{user.last_name[0]}
          </div>
          <div>
            <div className="font-medium">{user.first_name} {user.last_name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Rol',
      sortable: true,
      render: (user: ExtendedUser) => (
        <Badge variant={
          user.role === 'super_admin' ? 'destructive' :
          user.role === 'admin' ? 'default' : 'secondary'
        }>
          {user.role === 'super_admin' ? 'Süper Admin' :
           user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
        </Badge>
      )
    },
    {
      key: 'department',
      label: 'Departman',
      sortable: true,
      render: (user: ExtendedUser) => user.department || '-'
    },
    {
      key: 'status',
      label: 'Durum',
      sortable: true,
      render: (user: ExtendedUser) => (
        <Badge variant={
          user.status === 'active' ? 'default' :
          user.status === 'inactive' ? 'secondary' : 'destructive'
        }>
          <div className={cn(
            "w-2 h-2 rounded-full mr-2",
            user.status === 'active' ? 'bg-green-500' :
            user.status === 'inactive' ? 'bg-gray-500' : 'bg-red-500'
          )} />
          {user.status === 'active' ? 'Aktif' :
           user.status === 'inactive' ? 'Pasif' : 'Askıda'}
        </Badge>
      )
    },
    {
      key: 'last_activity',
      label: 'Son Aktivite',
      sortable: true,
      render: (user: ExtendedUser) => (
        <div className="text-sm">
          <div>{user.last_activity || '-'}</div>
          <div className="text-muted-foreground">
            {user.login_count} giriş
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'İşlemler',
      render: (user: ExtendedUser) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewUser(user)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <PermissionCheck permission="canManageUsers">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditUser(user)}
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          </PermissionCheck>
          <PermissionCheck permission="canDeleteUsers">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
                  <AlertDialogDescription>
                    {user.first_name} {user.last_name} kullanıcısını silmek istediğinizden emin misiniz?
                    Bu işlem geri alınamaz.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                    Sil
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </PermissionCheck>
        </div>
      )
    }
  ];

  // Event handlers
  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      role: 'user',
      department: '',
      position: '',
      phone: '',
      status: 'active'
    });
    setUserFormOpen(true);
  };

  const handleEditUser = (user: ExtendedUser) => {
    setEditingUser(user);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      department: user.department || '',
      position: user.position || '',
      phone: user.phone || '',
      status: user.status
    });
    setUserFormOpen(true);
  };

  const handleViewUser = (user: ExtendedUser) => {
    setSelectedUserDetails(user);
    setUserDetailsOpen(true);
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      setLoading(true);
      // API call would go here
      setUsers(prev => prev.filter(u => u.id !== userId));
      console.log('User deleted:', userId);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async () => {
    try {
      setLoading(true);
      
      if (editingUser) {
        // Update existing user
        setUsers(prev => prev.map(u => 
          u.id === editingUser.id 
            ? { 
                ...u, 
                ...formData, 
                role: formData.role as 'user' | 'admin' | 'super_admin', 
                status: formData.status as 'active' | 'inactive' | 'suspended',
                updated_at: new Date().toISOString() 
              }
            : u
        ));
      } else {
        // Create new user
        const newUser: ExtendedUser = {
          id: Math.max(...users.map(u => u.id)) + 1,
          ...formData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          login_count: 0,
          project_count: 0,
          email_verified: false,
          two_factor_enabled: false
        } as ExtendedUser;
        setUsers(prev => [...prev, newUser]);
      }
      
      setUserFormOpen(false);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusChange = async (userIds: number[], status: string) => {
    try {
      setLoading(true);
      setUsers(prev => prev.map(u => 
        userIds.includes(u.id) 
          ? { ...u, status: status as any, updated_at: new Date().toISOString() }
          : u
      ));
      setSelectedUsers([]);
    } catch (error) {
      console.error('Bulk status change error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPasswordReset = async (userIds: number[]) => {
    console.log('Password reset for users:', userIds);
    // Implementation would go here
  };

  const handleBulkEmailSend = async (userIds: number[]) => {
    console.log('Send email to users:', userIds);
    // Implementation would go here
  };

  const handleBulkDelete = async (userIds: number[]) => {
    try {
      setLoading(true);
      setUsers(prev => prev.filter(u => !userIds.includes(u.id)));
      setSelectedUsers([]);
    } catch (error) {
      console.error('Bulk delete error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportUsers = () => {
    // Export functionality
    console.log('Exporting users...');
  };

  const departments = Array.from(new Set(users.map(u => u.department).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kullanıcı Yönetimi</h2>
          <p className="text-muted-foreground">
            Sistem kullanıcılarını yönetin, roller atayın ve aktiviteleri izleyin
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportUsers}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Dışa Aktar
          </Button>
          <PermissionCheck permission="canManageUsers">
            <Button
              onClick={handleCreateUser}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Yeni Kullanıcı
            </Button>
          </PermissionCheck>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Toplam Kullanıcı</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aktif Kullanıcı</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.status === 'active').length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admin Kullanıcı</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'admin' || u.role === 'super_admin').length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bu Hafta Yeni</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <Plus className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Kullanıcı ara..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <select
              value={filters.role}
              onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="">Tüm Roller</option>
              <option value="user">Kullanıcı</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Süper Admin</option>
            </select>
            
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
              <option value="suspended">Askıda</option>
            </select>
            
            <select
              value={filters.department}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="">Tüm Departmanlar</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <EnhancedDataTable
        title="Kullanıcı Listesi"
        data={filteredUsers}
        columns={columns}
        loading={loading}
        searchPlaceholder="Kullanıcı ara..."
        emptyState={{
          title: "Kullanıcı bulunamadı",
          description: "Arama kriterlerinize uygun kullanıcı bulunamadı"
        }}
        className="mt-6"
      />

      {/* User Form Dialog */}
      <Dialog open={userFormOpen} onOpenChange={setUserFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Kullanıcı bilgilerini güncelleyin' : 'Yeni bir kullanıcı hesabı oluşturun'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Ad</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="last_name">Soyad</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="role">Rol</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                disabled={!canManageRoles}
              >
                <option value="user">Kullanıcı</option>
                <option value="admin">Admin</option>
                {canManageRoles && <option value="super_admin">Süper Admin</option>}
              </select>
            </div>
            
            <div>
              <Label htmlFor="status">Durum</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
                <option value="suspended">Askıda</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="department">Departman</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="position">Pozisyon</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setUserFormOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSaveUser} disabled={loading}>
              {loading ? 'Kaydediliyor...' : editingUser ? 'Güncelle' : 'Oluştur'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Kullanıcı Detayları</DialogTitle>
          </DialogHeader>
          
          {selectedUserDetails && (
            <div className="space-y-6">
              {/* User Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground text-xl font-bold">
                  {selectedUserDetails.first_name[0]}{selectedUserDetails.last_name[0]}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedUserDetails.first_name} {selectedUserDetails.last_name}
                  </h3>
                  <p className="text-muted-foreground">{selectedUserDetails.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={
                      selectedUserDetails.role === 'super_admin' ? 'destructive' :
                      selectedUserDetails.role === 'admin' ? 'default' : 'secondary'
                    }>
                      {selectedUserDetails.role === 'super_admin' ? 'Süper Admin' :
                       selectedUserDetails.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                    </Badge>
                    <Badge variant={selectedUserDetails.status === 'active' ? 'default' : 'secondary'}>
                      {selectedUserDetails.status === 'active' ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* User Info Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Kişisel Bilgiler</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{selectedUserDetails.email}</span>
                    </div>
                    {selectedUserDetails.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{selectedUserDetails.phone}</span>
                      </div>
                    )}
                    {selectedUserDetails.department && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{selectedUserDetails.department}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Aktivite İstatistikleri</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Toplam Giriş</span>
                      <span className="text-sm font-medium">{selectedUserDetails.login_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Proje Sayısı</span>
                      <span className="text-sm font-medium">{selectedUserDetails.project_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Son Aktivite</span>
                      <span className="text-sm font-medium">{selectedUserDetails.last_activity}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Security Info */}
              <div>
                <h4 className="font-medium mb-3">Güvenlik</h4>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {selectedUserDetails.email_verified ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      E-posta {selectedUserDetails.email_verified ? 'Doğrulandı' : 'Doğrulanmadı'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedUserDetails.two_factor_enabled ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      2FA {selectedUserDetails.two_factor_enabled ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}