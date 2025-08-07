'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string | string[];
    backgroundColor?: string | string[];
    fill?: boolean;
    tension?: number;
    borderWidth?: number;
  }>;
}

interface SavingsTrendChartProps {
  data: ChartData;
  title: string;
  description?: string;
  className?: string;
}

export function SavingsTrendChart({ data, title, description, className }: SavingsTrendChartProps) {
  const chartRef = useRef(null);
  const { resolvedTheme } = useTheme();
  const [chartKey, setChartKey] = useState(0);
  
  // Force re-render when theme changes
  useEffect(() => {
    setChartKey(prev => prev + 1);
  }, [resolvedTheme]);

  // Theme-aware colors
  const getTextColor = () => {
    const isDark = resolvedTheme === 'dark';
    return isDark ? '#e5e7eb' : '#6b7280'; // gray-200 for dark, gray-500 for light
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        usePointStyle: true,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: getTextColor(),
        },
      },
      y: {
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6b7280',
          callback: function(value: any) {
            return new Intl.NumberFormat('tr-TR', {
              style: 'currency',
              currency: 'TRY',
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(value);
          },
        },
      },
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
        borderWidth: 2,
      },
      line: {
        borderWidth: 3,
      },
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart' as const,
    },
  };

  return (
    <Card className={cn("transition-all duration-300 hover:shadow-medium", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            Son 12 Ay
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <Line key={chartKey} ref={chartRef} data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}

interface SavingsComparisonChartProps {
  data: ChartData;
  title: string;
  description?: string;
  className?: string;
}

export function SavingsComparisonChart({ data, title, description, className }: SavingsComparisonChartProps) {
  const { resolvedTheme } = useTheme();
  const [chartKey, setChartKey] = useState(0);
  
  // Force re-render when theme changes
  useEffect(() => {
    setChartKey(prev => prev + 1);
  }, [resolvedTheme]);

  // Theme-aware colors
  const getTextColor = () => {
    const isDark = resolvedTheme === 'dark';
    return isDark ? '#e5e7eb' : '#6b7280'; // gray-200 for dark, gray-500 for light
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${new Intl.NumberFormat('tr-TR', {
              style: 'currency',
              currency: 'TRY',
              maximumFractionDigits: 0,
            }).format(context.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: getTextColor(),
        },
      },
      y: {
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6b7280',
          callback: function(value: any) {
            return new Intl.NumberFormat('tr-TR', {
              style: 'currency',
              currency: 'TRY',
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(value);
          },
        },
      },
    },
    animation: {
      duration: 1200,
      easing: 'easeInOutCubic' as const,
    },
  };

  return (
    <Card className={cn("transition-all duration-300 hover:shadow-medium", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <Bar key={chartKey} data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}

interface CurrencyDistributionChartProps {
  data: Array<{
    currency: string;
    total: number;
    color: string;
  }>;
  title: string;
  description?: string;
  className?: string;
}

export function CurrencyDistributionChart({ data, title, description, className }: CurrencyDistributionChartProps) {
  const { theme, resolvedTheme } = useTheme();
  const [chartKey, setChartKey] = useState(0);
  
  // Force re-render when theme changes
  useEffect(() => {
    setChartKey(prev => prev + 1);
  }, [theme, resolvedTheme]);

  const chartData = {
    labels: data.map(item => item.currency),
    datasets: [
      {
        data: data.map(item => item.total),
        backgroundColor: data.map(item => item.color),
        borderColor: data.map(item => item.color),
        borderWidth: 2,
        hoverBorderWidth: 3,
      },
    ],
  };

  // Theme-aware colors
  const getTextColor = () => {
    const isDark = resolvedTheme === 'dark';
    return isDark ? '#e5e7eb' : '#374151'; // gray-200 for dark, gray-700 for light
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
          color: getTextColor(),
          generateLabels: function(chart: any) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              const total = data.datasets[0].data.reduce((sum: number, value: number) => sum + value, 0);
              const textColor = getTextColor();
              return data.labels.map((label: string, i: number) => {
                const value = data.datasets[0].data[i];
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return {
                  text: `${label} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor[i],
                  lineWidth: data.datasets[0].borderWidth,
                  fontColor: textColor,
                  hidden: false,
                  index: i,
                };
              });
            }
            return [];
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            const total = context.dataset.data.reduce((sum: number, value: number) => sum + value, 0);
            const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0';
            return `${context.label}: ${new Intl.NumberFormat('tr-TR', {
              style: 'currency',
              currency: context.label,
              maximumFractionDigits: 0,
            }).format(context.parsed)} (${percentage}%)`;
          },
        },
      },
    },
    cutout: '60%',
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1500,
      easing: 'easeInOutQuart' as const,
    },
  };

  const totalValue = data.reduce((sum, item) => sum + item.total, 0);

  return (
    <Card className={cn("transition-all duration-300 hover:shadow-medium", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-80">
          <Doughnut key={chartKey} data={chartData} options={options} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('tr-TR', {
                  notation: 'compact',
                  maximumFractionDigits: 1,
                }).format(totalValue)}
              </div>
              <div className="text-sm text-muted-foreground">Toplam Değer</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface InteractiveChartWrapperProps {
  children: React.ReactNode;
  periods?: Array<{ label: string; value: string }>;
  onPeriodChange?: (period: string) => void;
  selectedPeriod?: string;
  className?: string;
}

export function InteractiveChartWrapper({
  children,
  periods = [
    { label: 'Son 7 Gün', value: '7d' },
    { label: 'Son 30 Gün', value: '30d' },
    { label: 'Son 3 Ay', value: '3m' },
    { label: 'Son 12 Ay', value: '12m' },
    { label: 'Tüm Zamanlar', value: 'all' },
  ],
  onPeriodChange,
  selectedPeriod = '30d',
  className,
}: InteractiveChartWrapperProps) {
  const [isChanging, setIsChanging] = useState(false);

  const handlePeriodChange = (period: string) => {
    if (period === selectedPeriod || !onPeriodChange) return;
    
    setIsChanging(true);
    onPeriodChange(period);
    
    // Reset loading state after animation
    setTimeout(() => {
      setIsChanging(false);
    }, 300);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {onPeriodChange && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Zaman Aralığı:</span>
          </div>
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className={cn(
              "w-40 transition-all duration-200",
              isChanging && "opacity-50"
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem 
                  key={period.value} 
                  value={period.value}
                  className="cursor-pointer hover:bg-accent"
                >
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className={cn(
        "transition-opacity duration-200",
        isChanging && "opacity-75"
      )}>
        {children}
      </div>
    </div>
  );
}

// Sample data generator for testing
export function generateSampleChartData(months: number = 12): ChartData {
  const labels = [];
  const savingsData = [];
  const costAvoidanceData = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    labels.push(date.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }));
    
    // Generate realistic sample data
    savingsData.push(Math.random() * 100000 + 50000);
    costAvoidanceData.push(Math.random() * 50000 + 25000);
  }

  return {
    labels,
    datasets: [
      {
        label: 'Tasarruf',
        data: savingsData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Maliyet Engelleme',
        data: costAvoidanceData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };
}