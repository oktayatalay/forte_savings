'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { Calculator, Plus, Building } from 'lucide-react';

interface Project {
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
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (project: Project) => void;
  editProject?: Project | null;
}

interface FormData {
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
  po_amount: string;
  forte_responsible: string;
  project_director: string;
  forte_cc_person: string;
  client_representative: string;
  customer_po_number: string;
  hcp_count: string;
  colleague_count: string;
  external_non_hcp_count: string;
}

const EVENT_TYPES = [
  'Conference',
  'Training',
  'Advisory Board',
  'Workshop',
  'Symposium',
  'Congress',
  'Meeting',
  'Other'
];

const PROJECT_TYPES = [
  'Medical Education',
  'Market Research',
  'Promotional',
  'Scientific',
  'Regulatory',
  'Other'
];

const ENTITIES = [
  'Forte Tourism',
  'Forte Medical',
  'Forte Events',
  'Other'
];

export function ProjectForm({ open, onOpenChange, onSuccess, editProject }: ProjectFormProps) {
  const [formData, setFormData] = useState<FormData>({
    frn: '',
    entity: '',
    customer: '',
    project_name: '',
    event_type: '',
    project_type: '',
    group_in: '',
    group_out: '',
    location: '',
    hotels: '',
    po_amount: '',
    forte_responsible: '',
    project_director: '',
    forte_cc_person: '',
    client_representative: '',
    customer_po_number: '',
    hcp_count: '0',
    colleague_count: '0',
    external_non_hcp_count: '0'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Düzenleme projesı değiştiğinde form'u initialize et
  useEffect(() => {
    if (editProject) {
      setFormData({
        frn: editProject.frn || '',
        entity: editProject.entity || '',
        customer: editProject.customer || '',
        project_name: editProject.project_name || '',
        event_type: editProject.event_type || '',
        project_type: editProject.project_type || '',
        group_in: editProject.group_in || '',
        group_out: editProject.group_out || '',
        location: editProject.location || '',
        hotels: editProject.hotels || '',
        po_amount: (editProject.po_amount ?? 0).toString(),
        forte_responsible: editProject.forte_responsible || '',
        project_director: editProject.project_director || '',
        forte_cc_person: editProject.forte_cc_person || '',
        client_representative: editProject.client_representative || '',
        customer_po_number: editProject.customer_po_number || '',
        hcp_count: (editProject.hcp_count ?? 0).toString(),
        colleague_count: (editProject.colleague_count ?? 0).toString(),
        external_non_hcp_count: (editProject.external_non_hcp_count ?? 0).toString()
      });
    } else {
      // Yeni proje için form'u sıfırla
      setFormData({
        frn: '',
        entity: '',
        customer: '',
        project_name: '',
        event_type: '',
        project_type: '',
        group_in: '',
        group_out: '',
        location: '',
        hotels: '',
        po_amount: '',
        forte_responsible: '',
        project_director: '',
        forte_cc_person: '',
        client_representative: '',
        customer_po_number: '',
        hcp_count: '0',
        colleague_count: '0',
        external_non_hcp_count: '0'
      });
    }
    setError(null);
  }, [editProject]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const validateForm = () => {
    const requiredFields: (keyof FormData)[] = [
      'frn', 'entity', 'customer', 'project_name', 'event_type', 'project_type',
      'group_in', 'group_out', 'location', 'po_amount', 'forte_responsible',
      'project_director', 'forte_cc_person', 'client_representative'
    ];
    const missingFields = requiredFields.filter(field => !formData[field].trim());
    
    if (missingFields.length > 0) {
      setError(`Zorunlu alanlar eksik: ${missingFields.join(', ')}`);
      return false;
    }

    if (parseFloat(formData.po_amount) <= 0) {
      setError('PO tutarı 0\'dan büyük olmalıdır');
      return false;
    }

    if (formData.group_out <= formData.group_in) {
      setError('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
      return false;
    }

    const counts = [
      parseInt(formData.hcp_count),
      parseInt(formData.colleague_count),
      parseInt(formData.external_non_hcp_count)
    ];

    if (counts.some(count => count < 0 || isNaN(count))) {
      setError('Katılımcı sayıları negatif olamaz');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const submitData: any = {
        ...formData,
        po_amount: parseFloat(formData.po_amount),
        hcp_count: parseInt(formData.hcp_count),
        colleague_count: parseInt(formData.colleague_count),
        external_non_hcp_count: parseInt(formData.external_non_hcp_count)
      };

      // Düzenleme modunda ise ID'yi ekle
      if (editProject) {
        submitData.id = editProject.id;
      }

      const apiUrl = editProject ? '/api/projects/update.php' : '/api/projects/create.php';
      const method = editProject ? 'PUT' : 'POST';

      const response = await fetch(apiUrl, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        onSuccess(data.data);
        onOpenChange(false);
      } else {
        throw new Error(data.error || 'Proje oluştururken hata oluştu');
      }
    } catch (err) {
      console.error('Project creation error:', err);
      setError(err instanceof Error ? err.message : 'Proje oluştururken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const totalParticipants = (parseInt(formData.hcp_count) || 0) + 
                           (parseInt(formData.colleague_count) || 0) + 
                           (parseInt(formData.external_non_hcp_count) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Building className="w-5 h-5 mr-2" />
            {editProject ? 'Projeyi Düzenle' : 'Yeni Proje Oluştur'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-600">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Temel Bilgiler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frn">FRN *</Label>
                <Input
                  id="frn"
                  placeholder="Proje referans numarası"
                  value={formData.frn}
                  onChange={(e) => handleInputChange('frn', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entity">Entity *</Label>
                <Select value={formData.entity} onValueChange={(value) => handleInputChange('entity', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Entity seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITIES.map((entity) => (
                      <SelectItem key={entity} value={entity}>
                        {entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer">Müşteri *</Label>
                <Input
                  id="customer"
                  placeholder="Müşteri adı"
                  value={formData.customer}
                  onChange={(e) => handleInputChange('customer', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_name">Proje Adı *</Label>
                <Input
                  id="project_name"
                  placeholder="Proje adı"
                  value={formData.project_name}
                  onChange={(e) => handleInputChange('project_name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_type">Etkinlik Türü *</Label>
                <Select value={formData.event_type} onValueChange={(value) => handleInputChange('event_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Etkinlik türü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_type">Proje Türü *</Label>
                <Select value={formData.project_type} onValueChange={(value) => handleInputChange('project_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Proje türü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Dates and Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Tarih ve Lokasyon</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="group_in">Başlangıç Tarihi *</Label>
                <DatePicker
                  id="group_in"
                  value={formData.group_in ? new Date(formData.group_in) : undefined}
                  onChange={(date) => handleInputChange('group_in', date ? date.toISOString().split('T')[0] : '')}
                  placeholder="Başlangıç tarihini seçin"
                  dateFormat="DD/MM/YYYY"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group_out">Bitiş Tarihi *</Label>
                <DatePicker
                  id="group_out"
                  value={formData.group_out ? new Date(formData.group_out) : undefined}
                  onChange={(date) => handleInputChange('group_out', date ? date.toISOString().split('T')[0] : '')}
                  placeholder="Bitiş tarihini seçin"
                  dateFormat="DD/MM/YYYY"
                  minDate={formData.group_in ? new Date(formData.group_in) : undefined}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Lokasyon *</Label>
                <Input
                  id="location"
                  placeholder="Şehir, Ülke"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="po_amount">PO Tutarı (TRY) *</Label>
                <Input
                  id="po_amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={formData.po_amount}
                  onChange={(e) => handleInputChange('po_amount', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hotels">Oteller</Label>
              <Textarea
                id="hotels"
                placeholder="Konaklama yapılacak oteller (opsiyonel)"
                value={formData.hotels}
                onChange={(e) => handleInputChange('hotels', e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Responsible People */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Sorumlu Kişiler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="forte_responsible">Forte Sorumlusu *</Label>
                <Input
                  id="forte_responsible"
                  placeholder="Forte sorumlusu"
                  value={formData.forte_responsible}
                  onChange={(e) => handleInputChange('forte_responsible', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_director">Proje Direktörü *</Label>
                <Input
                  id="project_director"
                  placeholder="Proje direktörü"
                  value={formData.project_director}
                  onChange={(e) => handleInputChange('project_director', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="forte_cc_person">Forte CC *</Label>
                <Input
                  id="forte_cc_person"
                  placeholder="Forte CC kişisi"
                  value={formData.forte_cc_person}
                  onChange={(e) => handleInputChange('forte_cc_person', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_representative">Müşteri Temsilcisi *</Label>
                <Input
                  id="client_representative"
                  placeholder="Müşteri temsilcisi"
                  value={formData.client_representative}
                  onChange={(e) => handleInputChange('client_representative', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_po_number">Müşteri PO Numarası</Label>
                <Input
                  id="customer_po_number"
                  placeholder="Müşteri PO numarası (opsiyonel)"
                  value={formData.customer_po_number}
                  onChange={(e) => handleInputChange('customer_po_number', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Participant Counts */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Katılımcı Sayıları</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hcp_count">HCP Sayısı</Label>
                <Input
                  id="hcp_count"
                  type="number"
                  min="0"
                  value={formData.hcp_count}
                  onChange={(e) => handleInputChange('hcp_count', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="colleague_count">Forte Personeli</Label>
                <Input
                  id="colleague_count"
                  type="number"
                  min="0"
                  value={formData.colleague_count}
                  onChange={(e) => handleInputChange('colleague_count', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="external_non_hcp_count">Diğer Katılımcılar</Label>
                <Input
                  id="external_non_hcp_count"
                  type="number"
                  min="0"
                  value={formData.external_non_hcp_count}
                  onChange={(e) => handleInputChange('external_non_hcp_count', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center">
                  <Calculator className="w-4 h-4 mr-1" />
                  Toplam Katılımcı
                </Label>
                <div className="h-10 px-3 py-2 border border-input rounded-md bg-muted flex items-center font-medium">
                  {totalParticipants}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (editProject ? 'Güncelleniyor...' : 'Oluşturuluyor...') : (editProject ? 'Güncelle' : 'Oluştur')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}