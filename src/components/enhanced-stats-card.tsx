'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, LucideIcon, Sparkles, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  icon: LucideIcon;
  iconColor?: string;
  description?: string;
  loading?: boolean;
  className?: string;
  variant?: 'default' | 'gradient' | 'modern' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  progress?: {
    value: number;
    max: number;
    label?: string;
  };
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  onClick?: () => void;
  interactive?: boolean;
  highlight?: boolean;
}

export function EnhancedStatsCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  description,
  loading = false,
  className,
  variant = 'default',
  size = 'md',
  progress,
  badge,
  onClick,
  interactive = true,
  highlight = false
}: StatCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    if (typeof value === 'number') {
      const duration = 1000;
      const steps = 30;
      const increment = value / steps;
      const stepDuration = duration / steps;

      let currentValue = 0;
      const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= value) {
          setAnimatedValue(value);
          clearInterval(timer);
        } else {
          setAnimatedValue(Math.floor(currentValue));
        }
      }, stepDuration);

      return () => clearInterval(timer);
    }
  }, [value]);

  const getTrendIcon = () => {
    if (!change) return null;
    
    switch (change.type) {
      case 'increase':
        return <TrendingUp className="h-3 w-3 text-green-600 animate-bounce-gentle" />;
      case 'decrease':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    if (!change) return '';
    
    switch (change.type) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getCardVariantStyles = () => {
    switch (variant) {
      case 'gradient':
        return 'bg-gradient-to-br from-primary/5 via-primary/5 to-primary/10 border-primary/20 shadow-glow';
      case 'modern':
        return 'bg-card/50 backdrop-blur-sm border-border/50 shadow-soft';
      case 'minimal':
        return 'bg-transparent border-none shadow-none';
      default:
        return 'bg-card border-border shadow-sm';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'p-3';
      case 'lg':
        return 'p-6';
      default:
        return 'p-4';
    }
  };

  if (loading) {
    return (
      <Card className={cn(
        "transition-all duration-300",
        getCardVariantStyles(),
        getSizeStyles(),
        className
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-20 bg-muted animate-shimmer bg-gradient-to-r from-muted via-muted-foreground/20 to-muted bg-[length:200%_100%] rounded" />
          <div className="h-4 w-4 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-24 bg-muted animate-shimmer bg-gradient-to-r from-muted via-muted-foreground/20 to-muted bg-[length:200%_100%] rounded mb-2" />
          <div className="h-3 w-16 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const displayValue = typeof value === 'number' ? animatedValue : value;

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300 ease-out",
        getCardVariantStyles(),
        getSizeStyles(),
        interactive && "hover:shadow-medium hover:scale-[1.02] cursor-pointer",
        highlight && "ring-2 ring-primary/30 shadow-glow",
        isVisible && "animate-fade-in-up",
        className
      )}
      onClick={onClick}
    >
      {/* Background glow effect */}
      {variant === 'gradient' && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}

      {/* Highlight sparkle effect */}
      {highlight && (
        <div className="absolute top-2 right-2">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        </div>
      )}

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <CardTitle className={cn(
            "text-sm font-medium text-muted-foreground transition-colors duration-200",
            interactive && "group-hover:text-foreground"
          )}>
            {title}
          </CardTitle>
          {badge && (
            <Badge variant={badge.variant || 'secondary'} className="text-xs">
              {badge.text}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Icon className={cn(
            "h-4 w-4 transition-all duration-200",
            iconColor,
            interactive && "group-hover:scale-110"
          )} />
          {onClick && interactive && (
            <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className={cn(
          "font-bold mb-1 transition-all duration-300",
          size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-3xl' : 'text-2xl'
        )}>
          {displayValue}
        </div>
        
        {progress && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{progress.label || 'İlerleme'}</span>
              <span className="font-medium">{Math.round((progress.value / progress.max) * 100)}%</span>
            </div>
            <Progress 
              value={(progress.value / progress.max) * 100} 
              className="h-2 transition-all duration-300"
            />
          </div>
        )}

        {change && (
          <div className="flex items-center gap-1 text-xs mb-1">
            {getTrendIcon()}
            <span className={cn(getTrendColor(), "font-medium")}>
              {change.value > 0 ? '+' : ''}{change.value}%
            </span>
            <span className="text-muted-foreground">
              {change.period}
            </span>
          </div>
        )}
        
        {description && (
          <p className="text-xs text-muted-foreground transition-colors duration-200 group-hover:text-muted-foreground/80">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Grid layout component for stats cards
interface StatsGridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
  className?: string;
}

export function StatsGrid({ children, columns = 4, gap = 6, className }: StatsGridProps) {
  return (
    <div 
      className={cn(
        `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-${columns} gap-${gap}`,
        className
      )}
    >
      {children}
    </div>
  );
}