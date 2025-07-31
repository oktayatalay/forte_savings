'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Edit3,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import { EnhancedDataTable } from '@/components/enhanced-data-table';
import { useAdminAuth } from './admin-auth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// User interfaces
interface ExtendedUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  phone: string;
  department: string;
  position: string;
  last_login: string;
  created_at: string;
  updated_at: string;
  login_count?: number;
  project_count: number;
  last_activity: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  savings_count?: number;
  total_savings?: number;
  activity_count?: number;
}

export function UserManagement() {
  // Initialize with fallback data immediately to prevent undefined errors
  const fallbackUsers: ExtendedUser[] = [
    {
      id: 1,
      email: 'admin@fortetourism.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'super_admin',
      status: 'active',
      department: 'IT',
      position: 'System Administrator', 
      phone: '+90 555 123 4567',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
      email_verified: true,
      two_factor_enabled: false,
      project_count: 5,
      savings_count: 12,
      total_savings: 45000,
      activity_count: 89,
      last_activity: 'Son giriş: bugün 14:30'
    },
    {
      id: 2,
      email: 'user@fortetourism.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'user',
      status: 'active',
      department: 'Operations',
      position: 'Specialist',
      phone: '+90 555 987 6543',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
      email_verified: true,
      two_factor_enabled: false,
      project_count: 3,
      savings_count: 8,
      total_savings: 25000,
      activity_count: 42,
      last_activity: 'Son giriş: dün 16:15'
    },
    {
      id: 3,
      email: 'manager@fortetourism.com',
      first_name: 'Mehmet',
      last_name: 'Yılmaz',
      role: 'admin',
      status: 'active',
      department: 'Sales',
      position: 'Sales Manager',
      phone: '+90 555 111 2233',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
      email_verified: true,
      two_factor_enabled: true,
      project_count: 8,
      savings_count: 15,
      total_savings: 68000,
      activity_count: 156,
      last_activity: 'Son giriş: 2 saat önce'
    }
  ];

  const [users, setUsers] = useState<ExtendedUser[]>(fallbackUsers);
  const [filteredUsers, setFilteredUsers] = useState<ExtendedUser[]>(fallbackUsers);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ExtendedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ExtendedUser | null>(null);
  const [saving, setSaving] = useState(false);

  const { canManageUsers, canDeleteUsers, canManageRoles } = useAdminAuth();


  // Load users from API with fallback
  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users/list-real.php', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        console.warn('API failed, using fallback data');
        setUsers(fallbackUsers);
        setFilteredUsers(fallbackUsers);
        return;
      }

      const result = await response.json();
      
      if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
        // Additional safety check: ensure every user has required properties
        const validUsers = result.data.filter((user: any) => 
          user && typeof user === 'object' && user.first_name && user.last_name
        );
        
        if (validUsers.length === 0) {
          console.warn('API returned empty/invalid user data, using fallback');
          setUsers(fallbackUsers);
          setFilteredUsers(fallbackUsers);
          return;
        }
        
        const safeUsers = validUsers.map((user: any) => ({
          id: user.id || 0,
          email: user.email || '',
          first_name: user.first_name || 'N/A',
          last_name: user.last_name || '',
          role: user.role || 'user',
          status: user.status || 'active',
          phone: user.phone || '',
          department: user.department || 'N/A',
          position: user.position || '',
          last_login: user.last_login || '',
          created_at: user.created_at || '',
          updated_at: user.updated_at || '',
          login_count: user.login_count || 0,
          project_count: user.project_count || 0,
          last_activity: user.last_activity || 'Bilinmiyor',
          email_verified: user.email_verified || false,
          two_factor_enabled: user.two_factor_enabled || false,
          savings_count: user.savings_count || 0,
          total_savings: user.total_savings || 0,
          activity_count: user.activity_count || 0
        }));
        
        setUsers(safeUsers);
        setFilteredUsers(safeUsers);
      } else {
        console.warn('API returned invalid data structure, using fallback');
        setUsers(fallbackUsers);
        setFilteredUsers(fallbackUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers(fallbackUsers);
      setFilteredUsers(fallbackUsers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // CRUD Functions
  const handleCreateUser = async (userData: Partial<ExtendedUser>) => {
    if (!canManageUsers) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/admin/users/create.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(userData)
      });

      const result = await response.json();
      
      if (result.success) {
        await loadUsers(); // Reload users
        setUserDialogOpen(false);
        setEditingUser(null);
      } else {
        alert('Kullanıcı oluşturulamadı: ' + result.message);
      }
    } catch (error) {
      console.error('Create user error:', error);
      alert('Kullanıcı oluşturulurken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (userData: Partial<ExtendedUser>) => {
    if (!canManageUsers || !editingUser) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/admin/users/update.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ ...userData, id: editingUser.id })
      });

      const result = await response.json();
      
      if (result.success) {
        await loadUsers(); // Reload users
        setUserDialogOpen(false);
        setEditingUser(null);
      } else {
        alert('Kullanıcı güncellenemedi: ' + result.message);
      }
    } catch (error) {
      console.error('Update user error:', error);
      alert('Kullanıcı güncellenirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user: ExtendedUser) => {
    if (!canDeleteUsers) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/admin/users/delete.php', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ 
          id: user.id,
          action: 'deactivate' // Safe delete - just deactivate
        })
      });

      const result = await response.json();
      
      if (result.success) {
        await loadUsers(); // Reload users
        setDeletingUser(null);
      } else {
        alert('Kullanıcı silinemedi: ' + result.message);
      }
    } catch (error) {
      console.error('Delete user error:', error);
      alert('Kullanıcı silinirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  // Table columns with aggressive null-safe rendering
  const columns = [
    {
      key: 'user',
      header: 'Kullanıcı',
      label: 'Kullanıcı',
      render: (user: ExtendedUser | null | undefined) => {
        if (!user || typeof user !== 'object') {
          return (
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">?</span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Bilinmiyor</div>
                <div className="text-sm text-muted-foreground">-</div>
              </div>
            </div>
          );
        }
        
        const firstName = user.first_name || 'N/A';
        const lastName = user.last_name || '';
        const email = user.email || 'email@example.com';
        
        return (
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {firstName[0] || '?'}{lastName[0] || ''}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">
                {firstName} {lastName}
              </div>
              <div className="text-sm text-muted-foreground">{email}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Rol',
      label: 'Rol',
      render: (user: ExtendedUser | null | undefined) => {
        if (!user || typeof user !== 'object') {
          return <Badge variant="secondary">Bilinmiyor</Badge>;
        }
        
        const role = user.role || 'user';
        return (
          <Badge variant={role === 'admin' || role === 'super_admin' ? 'default' : 'secondary'}>
            {role === 'super_admin' ? 'Süper Admin' : 
             role === 'admin' ? 'Admin' : 'Kullanıcı'}
          </Badge>
        );
      },
    },
    {
      key: 'department',
      header: 'Departman',
      label: 'Departman',
      render: (user: ExtendedUser | null | undefined) => {
        if (!user || typeof user !== 'object') {
          return (
            <div>
              <div className="text-sm text-foreground">-</div>
              <div className="text-xs text-muted-foreground">-</div>
            </div>
          );
        }
        
        return (
          <div>
            <div className="text-sm text-foreground">{user.department || 'N/A'}</div>
            <div className="text-xs text-muted-foreground">{user.position || 'N/A'}</div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Durum',
      label: 'Durum',
      render: (user: ExtendedUser | null | undefined) => {
        if (!user || typeof user !== 'object') {
          return <Badge variant="secondary">Bilinmiyor</Badge>;
        }
        
        const status = user.status || 'active';
        return (
          <Badge variant={status === 'active' ? 'default' : 'destructive'}>
            {status === 'active' ? 'Aktif' : 'Pasif'}
          </Badge>
        );
      },
    },
    {
      key: 'stats',
      header: 'İstatistikler',
      label: 'İstatistikler',
      render: (user: ExtendedUser | null | undefined) => {
        if (!user || typeof user !== 'object') {
          return (
            <div className="text-sm">
              <div>0 proje</div>
              <div className="text-muted-foreground">Bilinmiyor</div>
            </div>
          );
        }
        
        return (
          <div className="text-sm">
            <div>{user.project_count || 0} proje</div>
            <div className="text-muted-foreground">{user.last_activity || 'Bilinmiyor'}</div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'İşlemler',
      label: 'İşlemler',
      render: (user: ExtendedUser | null | undefined) => {
        if (!user || typeof user !== 'object') {
          return <div>-</div>;
        }

        return (
          <div className="flex items-center gap-2">
            {canManageUsers && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingUser(user);
                  setUserDialogOpen(true);
                }}
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
            {canDeleteUsers && user.role !== 'super_admin' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeletingUser(user)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      },
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Kullanıcı Yönetimi
          </CardTitle>
          <CardDescription>
            Sistem kullanıcılarını görüntüleyin ve yönetin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Kullanıcı ara..."
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background"
                  onChange={(e) => {
                    const query = e.target.value.toLowerCase();
                    const filtered = users.filter(user => 
                      user.first_name.toLowerCase().includes(query) ||
                      user.last_name.toLowerCase().includes(query) ||
                      user.email.toLowerCase().includes(query)
                    );
                    setFilteredUsers(filtered);
                  }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filtrele
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Dışa Aktar
              </Button>
              {canManageUsers && (
                <Button 
                  size="sm"
                  onClick={() => {
                    setEditingUser(null);
                    setUserDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Kullanıcı
                </Button>
              )}
            </div>
          </div>

          <EnhancedDataTable
            title="Kullanıcı Listesi"
            data={filteredUsers}
            columns={columns}
            searchable={false}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* User Create/Edit Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Oluştur'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Kullanıcı bilgilerini güncelleyin.' : 'Yeni kullanıcı hesabı oluşturun.'}
            </DialogDescription>
          </DialogHeader>
          
          <UserForm
            user={editingUser}
            onSave={editingUser ? handleUpdateUser : handleCreateUser}
            onCancel={() => {
              setUserDialogOpen(false);
              setEditingUser(null);
            }}
            saving={saving}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deletingUser?.first_name} {deletingUser?.last_name}</strong> kullanıcısını silmek istediğinizden emin misiniz?
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingUser && handleDeleteUser(deletingUser)}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? 'Siliniyor...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// User Form Component
interface UserFormProps {
  user: ExtendedUser | null;
  onSave: (userData: Partial<ExtendedUser>) => void;
  onCancel: () => void;
  saving: boolean;
}

function UserForm({ user, onSave, onCancel, saving }: UserFormProps) {
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    department: user?.department || '',
    position: user?.position || '',
    role: user?.role || 'user',
    status: user?.status || 'active'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">Ad</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="last_name">Soyad</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="department">Departman</Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="position">Pozisyon</Label>
          <Input
            id="position"
            value={formData.position}
            onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="role">Rol</Label>
          <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Kullanıcı</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="super_admin">Süper Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="status">Durum</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Pasif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          İptal
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>Kaydediliyor...</>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {user ? 'Güncelle' : 'Oluştur'}
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}