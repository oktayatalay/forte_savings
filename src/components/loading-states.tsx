'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface EnhancedSkeletonProps {
  className?: string;
  variant?: 'default' | 'shimmer' | 'pulse' | 'wave';
  speed?: 'slow' | 'normal' | 'fast';
  style?: React.CSSProperties;
}

export function EnhancedSkeleton({ className, variant = 'shimmer', speed = 'normal', style }: EnhancedSkeletonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'shimmer':
        return 'bg-gradient-to-r from-muted via-muted-foreground/20 to-muted bg-[length:200%_100%] animate-shimmer';
      case 'pulse':
        return 'bg-muted animate-pulse';
      case 'wave':
        return 'bg-muted animate-pulse-slow';
      default:
        return 'bg-muted animate-pulse';
    }
  };

  const getSpeedClass = () => {
    switch (speed) {
      case 'slow':
        return 'animation-duration-[3s]';
      case 'fast':
        return 'animation-duration-[0.8s]';
      default:
        return 'animation-duration-[2s]';
    }
  };

  return (
    <div
      className={cn(
        "rounded-md",
        getVariantStyles(),
        getSpeedClass(),
        className
      )}
      style={style}
    />
  );
}

interface CardSkeletonProps {
  className?: string;
  showDescription?: boolean;
  variant?: 'default' | 'detailed' | 'compact';
}

export function CardSkeleton({ className, showDescription = true, variant = 'default' }: CardSkeletonProps) {
  if (variant === 'compact') {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <EnhancedSkeleton className="h-4 w-2/3" />
              <EnhancedSkeleton className="h-6 w-1/3" />
            </div>
            <EnhancedSkeleton className="h-8 w-8 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'detailed') {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <EnhancedSkeleton className="h-5 w-2/3" />
              {showDescription && <EnhancedSkeleton className="h-4 w-1/2" />}
            </div>
            <EnhancedSkeleton className="h-6 w-6 rounded-full" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <EnhancedSkeleton className="h-3 w-16" />
                <EnhancedSkeleton className="h-6 w-20" />
              </div>
              <div className="space-y-2">
                <EnhancedSkeleton className="h-3 w-20" />
                <EnhancedSkeleton className="h-6 w-24" />
              </div>
            </div>
            <div className="space-y-2">
              <EnhancedSkeleton className="h-3 w-full" />
              <EnhancedSkeleton className="h-3 w-4/5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="space-y-2">
          <EnhancedSkeleton className="h-5 w-2/3" />
          {showDescription && <EnhancedSkeleton className="h-4 w-1/2" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <EnhancedSkeleton className="h-4 w-full" />
          <EnhancedSkeleton className="h-4 w-4/5" />
          <EnhancedSkeleton className="h-4 w-3/5" />
        </div>
      </CardContent>
    </Card>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
  showHeader?: boolean;
  variant?: 'default' | 'striped' | 'bordered';
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  className, 
  showHeader = true,
  variant = 'default' 
}: TableSkeletonProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="space-y-4">
        {/* Header */}
        {showHeader && (
          <div className="flex space-x-4 pb-2 border-b">
            {Array.from({ length: columns }).map((_, i) => (
              <EnhancedSkeleton key={i} className="h-6 flex-1" variant="shimmer" />
            ))}
          </div>
        )}
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div 
            key={rowIndex} 
            className={cn(
              "flex space-x-4 py-2",
              variant === 'striped' && rowIndex % 2 === 0 && "bg-muted/20 rounded px-2",
              variant === 'bordered' && "border-b border-border/50"
            )}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <EnhancedSkeleton 
                key={colIndex} 
                className={cn(
                  "h-4 flex-1",
                  colIndex === 0 && "max-w-[120px]", // First column is typically shorter
                  colIndex === columns - 1 && "max-w-[80px]" // Last column is typically shorter
                )} 
                variant="shimmer"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface StatsSkeletonProps {
  count?: number;
  className?: string;
  layout?: 'grid' | 'row';
  size?: 'sm' | 'md' | 'lg';
}

export function StatsSkeleton({ count = 4, className, layout = 'grid', size = 'md' }: StatsSkeletonProps) {
  const getLayoutClass = () => {
    if (layout === 'row') {
      return "flex flex-wrap gap-4";
    }
    return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6";
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'p-3';
      case 'lg':
        return 'p-8';
      default:
        return 'p-6';
    }
  };

  return (
    <div className={cn(getLayoutClass(), className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className={cn(getSizeClass(), layout === 'row' && 'flex-1 min-w-[200px]')}>
          <div className="flex items-center justify-between mb-4">
            <EnhancedSkeleton className="h-4 w-20" variant="shimmer" />
            <EnhancedSkeleton className="h-5 w-5 rounded-full" variant="pulse" />
          </div>
          <EnhancedSkeleton className="h-8 w-16 mb-2" variant="shimmer" />
          <div className="flex items-center gap-2">
            <EnhancedSkeleton className="h-3 w-3 rounded-full" />
            <EnhancedSkeleton className="h-3 w-12" />
            <EnhancedSkeleton className="h-3 w-16" />
          </div>
        </Card>
      ))}
    </div>
  );
}

interface ChartSkeletonProps {
  className?: string;
  height?: number;
  type?: 'line' | 'bar' | 'pie' | 'area';
}

export function ChartSkeleton({ className, height = 300, type = 'line' }: ChartSkeletonProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <EnhancedSkeleton className="h-6 w-32" />
            <EnhancedSkeleton className="h-4 w-48" />
          </div>
          <EnhancedSkeleton className="h-8 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height }}>
          {type === 'pie' ? (
            <div className="flex items-center justify-center h-full">
              <EnhancedSkeleton className="w-48 h-48 rounded-full" variant="shimmer" />
            </div>
          ) : (
            <div className="space-y-4 h-full flex flex-col justify-end">
              {/* Y-axis labels */}
              <div className="flex items-end h-full space-x-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end space-y-1">
                    <EnhancedSkeleton 
                      className="w-full" 
                      style={{ height: `${20 + Math.random() * 80}%` }}
                      variant="shimmer"
                    />
                    <EnhancedSkeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardSkeletonProps {
  className?: string;
  includeCharts?: boolean;
}

export function DashboardSkeleton({ className, includeCharts = true }: DashboardSkeletonProps) {
  return (
    <div className={cn("space-y-8 animate-fade-in", className)}>
      {/* Header */}
      <div className="space-y-4">
        <div className="space-y-2">
          <EnhancedSkeleton className="h-8 w-64" variant="shimmer" />
          <EnhancedSkeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center gap-4">
          <EnhancedSkeleton className="h-10 w-32" />
          <EnhancedSkeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      {/* Stats Cards */}
      <StatsSkeleton />

      {/* Charts Section */}
      {includeCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton type="line" />
          <ChartSkeleton type="bar" />
        </div>
      )}

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton variant="detailed" />
        <CardSkeleton variant="detailed" />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <EnhancedSkeleton className="h-6 w-32" />
              <EnhancedSkeleton className="h-4 w-48" />
            </div>
            <EnhancedSkeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <TableSkeleton variant="striped" rows={8} />
        </CardContent>
      </Card>
    </div>
  );
}

interface ListSkeletonProps {
  items?: number;
  className?: string;
  showAvatar?: boolean;
  variant?: 'simple' | 'detailed' | 'card';
}

export function ListSkeleton({ 
  items = 5, 
  className, 
  showAvatar = false,
  variant = 'simple' 
}: ListSkeletonProps) {
  if (variant === 'card') {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: items }).map((_, i) => (
          <CardSkeleton key={i} variant="compact" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-3 rounded-lg border">
          {showAvatar && <EnhancedSkeleton className="h-10 w-10 rounded-full" />}
          <div className="flex-1 space-y-2">
            <EnhancedSkeleton className="h-4 w-2/3" />
            {variant === 'detailed' && (
              <>
                <EnhancedSkeleton className="h-3 w-1/2" />
                <div className="flex space-x-2">
                  <EnhancedSkeleton className="h-3 w-16" />
                  <EnhancedSkeleton className="h-3 w-20" />
                </div>
              </>
            )}
          </div>
          <EnhancedSkeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

interface FormSkeletonProps {
  fields?: number;
  className?: string;
  showButtons?: boolean;
}

export function FormSkeleton({ fields = 5, className, showButtons = true }: FormSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <EnhancedSkeleton className="h-4 w-24" />
          <EnhancedSkeleton className="h-10 w-full" />
        </div>
      ))}
      
      {showButtons && (
        <div className="flex items-center gap-3 pt-4">
          <EnhancedSkeleton className="h-10 w-24" />
          <EnhancedSkeleton className="h-10 w-20" />
        </div>
      )}
    </div>
  );
}

// Legacy components for backward compatibility
export function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <EnhancedSkeleton className="h-4 w-24" />
        <EnhancedSkeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <EnhancedSkeleton className="h-8 w-20 mb-2" />
        <EnhancedSkeleton className="h-3 w-16" />
      </CardContent>
    </Card>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <EnhancedSkeleton className="h-10 w-20" />
          <div>
            <EnhancedSkeleton className="h-9 w-80 mb-2" />
            <EnhancedSkeleton className="h-5 w-60" />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <EnhancedSkeleton className="h-10 w-32" />
          <EnhancedSkeleton className="h-6 w-16" />
        </div>
      </div>

      {/* Statistics Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Project Details Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <EnhancedSkeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(6)].map((_, j) => (
                <div key={j}>
                  <EnhancedSkeleton className="h-3 w-24 mb-2" />
                  <EnhancedSkeleton className="h-5 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Savings Records Table Skeleton */}
      <TableSkeleton rows={3} />
    </div>
  );
}