'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  dateFormat?: string;
  required?: boolean;
  id?: string;
  name?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
  disabled = false,
  minDate,
  maxDate,
  dateFormat = 'DD/MM/YYYY',
  required = false,
  id,
  name,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Update input value when external value changes
  useEffect(() => {
    if (value) {
      setSelectedDate(value);
      setInputValue(formatDate(value, dateFormat));
    } else {
      setSelectedDate(undefined);
      setInputValue('');
    }
  }, [value, dateFormat]);

  // Format date based on the specified format
  const formatDate = (date: Date, format: string): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    
    switch (format) {
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'DD/MM/YYYY':
      default:
        return `${day}/${month}/${year}`;
    }
  };

  // Parse date from input string
  const parseDate = (dateString: string, format: string): Date | null => {
    if (!dateString.trim()) return null;
    
    let day, month, year;
    
    // Remove any non-digit characters except separators
    const cleaned = dateString.replace(/[^\d\/\-\.]/g, '');
    
    switch (format) {
      case 'MM/DD/YYYY':
        const mmddyyyy = cleaned.split(/[\/\-\.]/);
        if (mmddyyyy.length !== 3) return null;
        [month, day, year] = mmddyyyy.map(Number);
        break;
      case 'YYYY-MM-DD':
        const yyyymmdd = cleaned.split(/[\/\-\.]/);
        if (yyyymmdd.length !== 3) return null;
        [year, month, day] = yyyymmdd.map(Number);
        break;
      case 'DD/MM/YYYY':
      default:
        const ddmmyyyy = cleaned.split(/[\/\-\.]/);
        if (ddmmyyyy.length !== 3) return null;
        [day, month, year] = ddmmyyyy.map(Number);
        break;
    }

    // Validate date components
    if (!day || !month || !year || 
        day < 1 || day > 31 || 
        month < 1 || month > 12 || 
        year < 1900 || year > 2100) {
      return null;
    }

    const date = new Date(year, month - 1, day);
    
    // Check if the constructed date is valid
    if (date.getFullYear() !== year || 
        date.getMonth() !== month - 1 || 
        date.getDate() !== day) {
      return null;
    }

    return date;
  };

  // Validate date against min/max constraints
  const validateDate = (date: Date): string => {
    if (minDate && date < minDate) {
      return `Date must be after ${formatDate(minDate, dateFormat)}`;
    }
    if (maxDate && date > maxDate) {
      return `Date must be before ${formatDate(maxDate, dateFormat)}`;
    }
    return '';
  };

  // Handle manual input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setError('');

    if (!newValue.trim()) {
      setSelectedDate(undefined);
      onChange?.(undefined);
      return;
    }

    const parsedDate = parseDate(newValue, dateFormat);
    if (parsedDate) {
      const validationError = validateDate(parsedDate);
      if (validationError) {
        setError(validationError);
        return;
      }
      
      setSelectedDate(parsedDate);
      setCurrentMonth(parsedDate);
      onChange?.(parsedDate);
    } else {
      setError('Invalid date format');
    }
  };

  // Handle input blur - format the date if valid
  const handleInputBlur = () => {
    if (selectedDate && !error) {
      setInputValue(formatDate(selectedDate, dateFormat));
    } else if (!selectedDate && inputValue.trim()) {
      // Try one more time to parse on blur
      const parsedDate = parseDate(inputValue, dateFormat);
      if (parsedDate && !validateDate(parsedDate)) {
        setSelectedDate(parsedDate);
        setInputValue(formatDate(parsedDate, dateFormat));
        onChange?.(parsedDate);
        setError('');
      }
    }
  };

  // Handle calendar date selection
  const handleDateSelect = (date: Date) => {
    const validationError = validateDate(date);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedDate(date);
    setInputValue(formatDate(date, dateFormat));
    setError('');
    onChange?.(date);
    setIsOpen(false);
  };

  // Handle clear button
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(undefined);
    setInputValue('');
    setError('');
    onChange?.(undefined);
    inputRef.current?.focus();
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDate = firstDay.getDay(); // 0 = Sunday

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDate; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    if (!validateDate(today)) {
      handleDateSelect(today);
    }
  };

  const calendarDays = generateCalendarDays();
  const today = new Date();
  const monthYear = currentMonth.toLocaleDateString('tr-TR', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              id={id}
              name={name}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              className={cn(
                "pr-20",
                error && "border-red-500 focus-visible:ring-red-500",
                selectedDate && "pr-20"
              )}
            />
            <div className="absolute right-0 top-0 h-full flex items-center">
              {selectedDate && !disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-full px-2 text-muted-foreground hover:text-foreground"
                  onClick={handleClear}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-full px-3"
                disabled={disabled}
              >
                <Calendar className="h-4 w-4" />
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousMonth}
                className="p-0 h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="font-medium capitalize">{monthYear}</div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextMonth}
                className="p-0 h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground p-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={index} className="p-2" />;
                }

                const isSelected = selectedDate?.toDateString() === day.toDateString();
                const isToday = today.toDateString() === day.toDateString();
                const isDisabled = 
                  (minDate && day < minDate) || 
                  (maxDate && day > maxDate);

                return (
                  <Button
                    key={day.toISOString()}
                    variant={isSelected ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "p-0 h-8 w-8 text-sm",
                      isToday && !isSelected && "bg-accent",
                      isDisabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !isDisabled && handleDateSelect(day)}
                    disabled={isDisabled}
                  >
                    {day.getDate()}
                  </Button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                disabled={!!validateDate(today)}
              >
                Bugün
              </Button>
              <div className="text-xs text-muted-foreground">
                Format: {dateFormat}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Error message */}
      {error && (
        <div className="text-sm text-red-500 mt-1">{error}</div>
      )}
    </div>
  );
}