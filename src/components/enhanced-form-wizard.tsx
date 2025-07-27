'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  Save, 
  FileText,
  Building,
  DollarSign,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: FormField[];
  validation?: (data: Record<string, any>) => string[];
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'date';
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: (value: any) => string | null;
  description?: string;
}

interface EnhancedFormWizardProps {
  steps: Step[];
  onSubmit: (data: Record<string, any>) => Promise<void>;
  onSave?: (data: Record<string, any>) => Promise<void>;
  initialData?: Record<string, any>;
  title?: string;
  description?: string;
  autoSave?: boolean;
  allowSkipSteps?: boolean;
  className?: string;
}

export function EnhancedFormWizard({
  steps,
  onSubmit,
  onSave,
  initialData = {},
  title = "Form Wizard",
  description,
  autoSave = false,
  allowSkipSteps = false,
  className
}: EnhancedFormWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && onSave && Object.keys(formData).length > 0) {
      const saveTimeout = setTimeout(() => {
        handleAutoSave();
      }, 2000);

      return () => clearTimeout(saveTimeout);
    }
  }, [formData, autoSave, onSave]);

  const handleAutoSave = async () => {
    if (isSaving || !onSave) return;
    
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const validateStep = useCallback((stepIndex: number): boolean => {
    const step = steps[stepIndex];
    const stepErrors: string[] = [];

    // Field validation
    step.fields.forEach(field => {
      const value = formData[field.name];
      
      if (field.required && (!value || value === '')) {
        stepErrors.push(`${field.label} gereklidir`);
      }

      if (value && field.validation) {
        const fieldError = field.validation(value);
        if (fieldError) {
          stepErrors.push(fieldError);
        }
      }
    });

    // Custom step validation
    if (step.validation) {
      const customErrors = step.validation(formData);
      stepErrors.push(...customErrors);
    }

    setErrors(prev => ({
      ...prev,
      [step.id]: stepErrors
    }));

    const isValid = stepErrors.length === 0;
    if (isValid) {
      setCompletedSteps(prev => new Set([...prev, stepIndex]));
    }

    return isValid;
  }, [formData, steps]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear field-specific errors
    setErrors(prev => {
      const stepId = steps[currentStep].id;
      const stepErrors = prev[stepId] || [];
      const filteredErrors = stepErrors.filter(error => 
        !error.toLowerCase().includes(fieldName.toLowerCase())
      );
      
      return {
        ...prev,
        [stepId]: filteredErrors
      };
    });
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (allowSkipSteps || stepIndex <= currentStep || completedSteps.has(stepIndex)) {
      setCurrentStep(stepIndex);
    }
  };

  const handleSubmit = async () => {
    // Validate all steps
    let allValid = true;
    for (let i = 0; i < steps.length; i++) {
      if (!validateStep(i)) {
        allValid = false;
      }
    }

    if (!allValid) {
      // Find first invalid step
      for (let i = 0; i < steps.length; i++) {
        if (errors[steps[i].id]?.length > 0) {
          setCurrentStep(i);
          break;
        }
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const currentStepData = steps[currentStep];
  const currentStepErrors = errors[currentStepData.id] || [];

  return (
    <div className={cn("w-full max-w-4xl mx-auto space-y-6", className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">{title}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
        {autoSave && isSaving && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Save className="w-4 h-4 animate-spin" />
            Otomatik kayıt ediliyor...
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Adım {currentStep + 1} / {steps.length}</span>
          <span>%{Math.round(progress)} tamamlandı</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Navigation */}
      <div className="flex items-center justify-center space-x-4 overflow-x-auto pb-4">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = completedSteps.has(index);
          const hasErrors = errors[step.id]?.length > 0;
          const isClickable = allowSkipSteps || index <= currentStep || isCompleted;

          return (
            <div key={step.id} className="flex items-center space-x-2">
              <button
                onClick={() => isClickable && handleStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  "flex items-center space-x-2 p-3 rounded-lg border transition-all duration-200",
                  isActive && "border-primary bg-primary/5 shadow-glow",
                  isCompleted && !isActive && "border-green-500 bg-green-50 dark:bg-green-900/20",
                  hasErrors && "border-red-500 bg-red-50 dark:bg-red-900/20",
                  !isActive && !isCompleted && !hasErrors && "border-border hover:border-border/80",
                  !isClickable && "opacity-50 cursor-not-allowed",
                  isClickable && "hover:shadow-soft cursor-pointer"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && !isActive && "bg-green-500 text-white",
                  hasErrors && "bg-red-500 text-white",
                  !isActive && !isCompleted && !hasErrors && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : hasErrors ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <step.icon className="w-4 h-4" />
                  )}
                </div>
                <div className="text-left">
                  <div className={cn(
                    "font-medium text-sm",
                    isActive && "text-primary",
                    isCompleted && !isActive && "text-green-600",
                    hasErrors && "text-red-600"
                  )}>
                    {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </div>
                </div>
              </button>
              {index < steps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>

      {/* Current Step Content */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <currentStepData.icon className="w-5 h-5" />
            {currentStepData.title}
          </CardTitle>
          <CardDescription>{currentStepData.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step Errors */}
          {currentStepErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="space-y-1">
                  {currentStepErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentStepData.fields.map((field) => (
              <div key={field.name} className={cn(
                "space-y-2",
                field.type === 'textarea' && "md:col-span-2"
              )}>
                <Label htmlFor={field.name} className="flex items-center gap-1">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                </Label>
                
                {field.type === 'select' ? (
                  <Select 
                    value={formData[field.name] || ''} 
                    onValueChange={(value) => handleFieldChange(field.name, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'textarea' ? (
                  <Textarea
                    id={field.name}
                    placeholder={field.placeholder}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    rows={4}
                  />
                ) : (
                  <Input
                    id={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  />
                )}

                {field.description && (
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Önceki
        </Button>

        <div className="flex items-center gap-2">
          {onSave && (
            <Button
              variant="outline"
              onClick={handleAutoSave}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          )}

          {currentStep === steps.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {isSubmitting ? 'Gönderiliyor...' : 'Tamamla'}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="flex items-center gap-2"
            >
              Sonraki
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Pre-configured wizard for project creation
export function ProjectCreationWizard({ 
  onSubmit, 
  onSave, 
  initialData = {} 
}: {
  onSubmit: (data: Record<string, any>) => Promise<void>;
  onSave?: (data: Record<string, any>) => Promise<void>;
  initialData?: Record<string, any>;
}) {
  const steps: Step[] = [
    {
      id: 'basic-info',
      title: 'Temel Bilgiler',
      description: 'Proje hakkında genel bilgiler',
      icon: FileText,
      fields: [
        {
          name: 'project_name',
          label: 'Proje Adı',
          type: 'text',
          required: true,
          placeholder: 'Proje adını girin',
          validation: (value) => {
            if (value && value.length < 3) {
              return 'Proje adı en az 3 karakter olmalıdır';
            }
            return null;
          }
        },
        {
          name: 'frn',
          label: 'FRN Numarası',
          type: 'text',
          required: true,
          placeholder: 'FRN-XXXX-XXXX',
          validation: (value) => {
            if (value && !/^FRN-\d{4}-\d{4}$/.test(value)) {
              return 'FRN formatı: FRN-XXXX-XXXX olmalıdır';
            }
            return null;
          }
        },
        {
          name: 'customer',
          label: 'Müşteri',
          type: 'text',
          required: true,
          placeholder: 'Müşteri adını girin'
        },
        {
          name: 'description',
          label: 'Açıklama',
          type: 'textarea',
          placeholder: 'Proje açıklaması...',
          description: 'Projenin kısa açıklaması'
        }
      ]
    },
    {
      id: 'technical-details',
      title: 'Teknik Detaylar',
      description: 'Proje teknolojisi ve kapsamı',
      icon: Building,
      fields: [
        {
          name: 'technology',
          label: 'Teknoloji',
          type: 'select',
          required: true,
          options: [
            { value: 'mobile', label: 'Mobil' },
            { value: 'web', label: 'Web' },
            { value: 'desktop', label: 'Masaüstü' },
            { value: 'cloud', label: 'Bulut' },
            { value: 'ai', label: 'Yapay Zeka' },
            { value: 'iot', label: 'IoT' }
          ]
        },
        {
          name: 'complexity',
          label: 'Karmaşıklık Seviyesi',
          type: 'select',
          required: true,
          options: [
            { value: 'low', label: 'Düşük' },
            { value: 'medium', label: 'Orta' },
            { value: 'high', label: 'Yüksek' },
            { value: 'critical', label: 'Kritik' }
          ]
        },
        {
          name: 'team_size',
          label: 'Takım Büyüklüğü',
          type: 'number',
          placeholder: '1-50',
          validation: (value) => {
            const num = parseInt(value);
            if (value && (isNaN(num) || num < 1 || num > 50)) {
              return 'Takım büyüklüğü 1-50 arasında olmalıdır';
            }
            return null;
          }
        },
        {
          name: 'estimated_duration',
          label: 'Tahmini Süre (Ay)',
          type: 'number',
          placeholder: '1-24',
          validation: (value) => {
            const num = parseInt(value);
            if (value && (isNaN(num) || num < 1 || num > 24)) {
              return 'Süre 1-24 ay arasında olmalıdır';
            }
            return null;
          }
        }
      ]
    },
    {
      id: 'financial',
      title: 'Mali Bilgiler',
      description: 'Bütçe ve maliyet bilgileri',
      icon: DollarSign,
      fields: [
        {
          name: 'budget',
          label: 'Toplam Bütçe',
          type: 'number',
          placeholder: '0.00',
          description: 'Türk Lirası cinsinden'
        },
        {
          name: 'currency',
          label: 'Para Birimi',
          type: 'select',
          required: true,
          options: [
            { value: 'TRY', label: 'Türk Lirası (₺)' },
            { value: 'USD', label: 'Dolar ($)' },
            { value: 'EUR', label: 'Euro (€)' },
            { value: 'GBP', label: 'İngiliz Sterlini (£)' }
          ]
        },
        {
          name: 'cost_center',
          label: 'Maliyet Merkezi',
          type: 'text',
          placeholder: 'CC-XXX'
        },
        {
          name: 'billing_type',
          label: 'Faturalandırma Tipi',
          type: 'select',
          options: [
            { value: 'fixed', label: 'Sabit Fiyat' },
            { value: 'hourly', label: 'Saatlik' },
            { value: 'milestone', label: 'Kilometre Taşı Bazlı' },
            { value: 'maintenance', label: 'Bakım ve Destek' }
          ]
        }
      ]
    },
    {
      id: 'timeline',
      title: 'Zaman Çizelgesi',
      description: 'Proje başlangıç ve bitiş tarihleri',
      icon: Calendar,
      fields: [
        {
          name: 'start_date',
          label: 'Başlangıç Tarihi',
          type: 'date',
          required: true
        },
        {
          name: 'end_date',
          label: 'Bitiş Tarihi',
          type: 'date',
          validation: (value) => {
            // This would need access to start_date from form data
            // Implementation would check if end_date > start_date
            return null;
          }
        },
        {
          name: 'milestone_count',
          label: 'Kilometre Taşı Sayısı',
          type: 'number',
          placeholder: '1-10',
          description: 'Ana proje kilometre taşlarının sayısı'
        },
        {
          name: 'priority',
          label: 'Öncelik',
          type: 'select',
          required: true,
          options: [
            { value: 'low', label: 'Düşük' },
            { value: 'medium', label: 'Orta' },
            { value: 'high', label: 'Yüksek' },
            { value: 'urgent', label: 'Acil' }
          ]
        }
      ],
      validation: (data) => {
        const errors: string[] = [];
        if (data.start_date && data.end_date) {
          const start = new Date(data.start_date);
          const end = new Date(data.end_date);
          if (end <= start) {
            errors.push('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
          }
        }
        return errors;
      }
    }
  ];

  return (
    <EnhancedFormWizard
      steps={steps}
      onSubmit={onSubmit}
      onSave={onSave}
      initialData={initialData}
      title="Yeni Proje Oluştur"
      description="Adım adım yeni proje oluşturma sihirbazı"
      autoSave={true}
      allowSkipSteps={false}
    />
  );
}