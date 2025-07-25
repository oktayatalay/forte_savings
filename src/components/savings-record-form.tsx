'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, Plus } from 'lucide-react';

interface SavingsRecordFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  onSuccess: (record: any) => void;
}

interface FormData {
  date: string;
  type: 'Savings' | 'Cost Avoidance' | '';
  explanation_category: string;
  explanation_custom: string;
  category: string;
  price: string;
  unit: string;
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
}

const SAVINGS_CATEGORIES = [
  'Accommodation',
  'Transportation', 
  'F&B',
  'Venue',
  'Speaker Fees',
  'Material & Equipment',
  'Personnel',
  'Other'
];

const EXPLANATION_OPTIONS = [
  'Negotiated discount',
  'Volume discount',
  'Early booking discount',
  'Package deal',
  'Alternative solution',
  'Cancelled/Reduced scope',
  'Sponsor contribution',
  'Internal resource usage',
  'Other'
];

export function SavingsRecordForm({ open, onOpenChange, projectId, onSuccess }: SavingsRecordFormProps) {
  const [formData, setFormData] = useState<FormData>({
    date: new Date().toISOString().split('T')[0],
    type: '',
    explanation_category: '',
    explanation_custom: '',
    category: '',
    price: '',
    unit: '1',
    currency: 'TRY'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const calculateTotal = () => {
    const price = parseFloat(formData.price) || 0;
    const unit = parseInt(formData.unit) || 1;
    return price * unit;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const validateForm = () => {
    const requiredFields: (keyof FormData)[] = ['date', 'type', 'category', 'price', 'unit'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setError(`Zorunlu alanlar eksik: ${missingFields.join(', ')}`);
      return false;
    }

    if (parseFloat(formData.price) <= 0) {
      setError('Birim fiyat 0\'dan büyük olmalıdır');
      return false;
    }

    if (parseInt(formData.unit) <= 0) {
      setError('Adet 0\'dan büyük olmalıdır');
      return false;
    }

    if (!formData.explanation_category && !formData.explanation_custom) {
      setError('Açıklama kategorisi seçin veya özel açıklama yazın');
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

      const submitData = {
        project_id: projectId,
        ...formData,
        price: parseFloat(formData.price),
        unit: parseInt(formData.unit)
      };

      const response = await fetch('/api/savings/create.php', {
        method: 'POST',
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
        // Form'u sıfırla
        setFormData({
          date: new Date().toISOString().split('T')[0],
          type: '',
          explanation_category: '',
          explanation_custom: '',
          category: '',
          price: '',
          unit: '1',
          currency: 'TRY'
        });
      } else {
        throw new Error(data.error || 'Kayıt oluştururken hata oluştu');
      }
    } catch (err) {
      console.error('Savings record creation error:', err);
      setError(err instanceof Error ? err.message : 'Kayıt oluştururken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const total = calculateTotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Yeni Tasarruf Kaydı Ekle
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-600">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarih */}
            <div className="space-y-2">
              <Label htmlFor="date">Tarih *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
            </div>

            {/* Tür */}
            <div className="space-y-2">
              <Label htmlFor="type">Tür *</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tür seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Savings">Tasarruf</SelectItem>
                  <SelectItem value="Cost Avoidance">Maliyet Engelleme</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Kategori */}
            <div className="space-y-2">
              <Label htmlFor="category">Kategori *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {SAVINGS_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Para Birimi */}
            <div className="space-y-2">
              <Label htmlFor="currency">Para Birimi</Label>
              <Select value={formData.currency} onValueChange={(value: 'TRY' | 'USD' | 'EUR' | 'GBP') => handleInputChange('currency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY (₺)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Açıklama Kategorisi */}
          <div className="space-y-2">
            <Label htmlFor="explanation_category">Açıklama Kategorisi</Label>
            <Select value={formData.explanation_category} onValueChange={(value) => handleInputChange('explanation_category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Açıklama kategorisi seçin" />
              </SelectTrigger>
              <SelectContent>
                {EXPLANATION_OPTIONS.map((explanation) => (
                  <SelectItem key={explanation} value={explanation}>
                    {explanation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Özel Açıklama */}
          <div className="space-y-2">
            <Label htmlFor="explanation_custom">Özel Açıklama</Label>
            <Textarea
              id="explanation_custom"
              placeholder="Detaylı açıklama yazın..."
              value={formData.explanation_custom}
              onChange={(e) => handleInputChange('explanation_custom', e.target.value)}
              rows={3}
            />
          </div>

          {/* Fiyat ve Adet */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Birim Fiyat *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Adet *</Label>
              <Input
                id="unit"
                type="number"
                min="1"
                value={formData.unit}
                onChange={(e) => handleInputChange('unit', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center">
                <Calculator className="w-4 h-4 mr-1" />
                Toplam Tutar
              </Label>
              <div className="h-10 px-3 py-2 border border-input rounded-md bg-muted flex items-center font-medium">
                {total > 0 ? formatCurrency(total, formData.currency) : '0.00'}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}