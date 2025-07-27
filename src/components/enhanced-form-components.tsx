'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Calendar,
  Calculator,
  Save,
  X,
  Plus,
  Minus,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormStepProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  completed?: boolean;
  active?: boolean;
}

export function FormStep({ title, description, children, completed, active }: FormStepProps) {
  return (
    <div className={cn(
      "relative pl-8 pb-8",
      !active && "opacity-60"
    )}>
      {/* Step Indicator */}
      <div className={cn(
        "absolute left-0 top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium",
        completed ? "bg-green-500 border-green-500 text-white" :
        active ? "bg-primary border-primary text-primary-foreground" :
        "bg-background border-muted-foreground"
      )}>
        {completed ? <CheckCircle className="w-4 h-4" /> : null}
      </div>
      
      {/* Step Content */}
      <div className="ml-4">
        <h3 className={cn(
          "text-lg font-medium mb-1",
          active ? "text-foreground" : "text-muted-foreground"
        )}>
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
        )}
        {active && (
          <div className="space-y-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

interface MultiStepFormProps {
  steps: Array<{
    id: string;
    title: string;
    description?: string;
    component: React.ReactNode;
    validation?: () => boolean;
  }>;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function MultiStepForm({ steps, onSubmit, onCancel, loading }: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    const currentStepData = steps[currentStep];
    if (currentStepData.validation && !currentStepData.validation()) {
      return;
    }
    
    setCompletedSteps(prev => new Set(prev).add(currentStep));
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep || completedSteps.has(stepIndex)) {
      setCurrentStep(stepIndex);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Form İşlemi</CardTitle>
            <CardDescription>
              Adım {currentStep + 1} / {steps.length}: {steps[currentStep].title}
            </CardDescription>
          </div>
          <Badge variant="secondary">
            %{Math.round(progress)} Tamamlandı
          </Badge>
        </div>
        <Progress value={progress} className="w-full" />
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Step Navigator */}
          <div className="lg:col-span-1">
            <div className="space-y-2">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(index)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all",
                    index === currentStep ? "border-primary bg-primary/5" :
                    completedSteps.has(index) ? "border-green-200 bg-green-50 dark:bg-green-900/20" :
                    index < currentStep ? "border-muted bg-muted/50 hover:bg-muted" :
                    "border-muted opacity-50 cursor-not-allowed"
                  )}
                  disabled={index > currentStep && !completedSteps.has(index)}
                >
                  <div className="flex items-center space-x-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center text-xs",
                      index === currentStep ? "border-primary bg-primary text-primary-foreground" :
                      completedSteps.has(index) ? "border-green-500 bg-green-500 text-white" :
                      "border-muted-foreground"
                    )}>
                      {completedSteps.has(index) ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <span className="text-sm font-medium">{step.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="lg:col-span-3">
            <div className="min-h-[400px]">
              {steps[currentStep].component}
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                Önceki
              </Button>
              
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                >
                  İptal
                </Button>
                
                {currentStep === steps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={onSubmit}
                    disabled={loading}
                  >
                    {loading ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleNext}
                  >
                    Sonraki
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SmartInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel';
  placeholder?: string;
  required?: boolean;
  validation?: (value: string) => string | null;
  suggestions?: string[];
  helpText?: string;
  icon?: React.ElementType;
  formatValue?: (value: string) => string;
  className?: string;
}

export function SmartInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  validation,
  suggestions,
  helpText,
  icon: Icon,
  formatValue,
  className
}: SmartInputProps) {
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const displayValue = formatValue ? formatValue(value) : value;
  const filteredSuggestions = suggestions?.filter(s => 
    s.toLowerCase().includes(value.toLowerCase())
  ).slice(0, 5);

  useEffect(() => {
    if (validation && value) {
      const validationError = validation(value);
      setError(validationError);
    } else {
      setError(null);
    }
  }, [value, validation]);

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="flex items-center space-x-1">
        {Icon && <Icon className="w-4 h-4" />}
        <span>{label}</span>
        {required && <span className="text-red-500">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          type={type}
          value={focused ? value : displayValue}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setFocused(true);
            setShowSuggestions(!!suggestions);
          }}
          onBlur={() => {
            setFocused(false);
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder={placeholder}
          className={cn(
            "transition-all",
            error ? "border-red-500 focus:border-red-500" :
            "focus:border-primary"
          )}
        />
        
        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm"
                onClick={() => {
                  onChange(suggestion);
                  setShowSuggestions(false);
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Help Text or Error */}
      {error ? (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      ) : helpText ? (
        <p className="text-xs text-muted-foreground flex items-center space-x-1">
          <Info className="w-3 h-3" />
          <span>{helpText}</span>
        </p>
      ) : null}
    </div>
  );
}

interface CalculatorInputProps {
  label: string;
  baseValue: number;
  multiplier: number;
  onBaseChange: (value: number) => void;
  onMultiplierChange: (value: number) => void;
  currency?: string;
  showCalculation?: boolean;
}

export function CalculatorInput({
  label,
  baseValue,
  multiplier,
  onBaseChange,
  onMultiplierChange,
  currency = 'TRY',
  showCalculation = true
}: CalculatorInputProps) {
  const total = baseValue * multiplier;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center space-x-2">
        <Calculator className="w-4 h-4" />
        <span>{label}</span>
      </Label>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Birim Fiyat</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="number"
              step="0.01"
              value={baseValue || ''}
              onChange={(e) => onBaseChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Adet</Label>
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onMultiplierChange(Math.max(0, multiplier - 1))}
              className="w-8 h-8 p-0"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Input
              type="number"
              min="0"
              value={multiplier || ''}
              onChange={(e) => onMultiplierChange(parseInt(e.target.value) || 0)}
              placeholder="0"
              className="text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onMultiplierChange(multiplier + 1)}
              className="w-8 h-8 p-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Toplam</Label>
          <div className="h-10 px-3 py-2 border border-input rounded-md bg-muted flex items-center font-bold text-lg">
            {formatCurrency(total)}
          </div>
        </div>
      </div>
      
      {showCalculation && (
        <div className="text-sm text-muted-foreground text-center">
          {formatCurrency(baseValue)} × {multiplier} = {formatCurrency(total)}
        </div>
      )}
    </div>
  );
}