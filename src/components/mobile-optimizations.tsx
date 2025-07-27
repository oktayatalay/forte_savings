'use client';

import { useState, useEffect, useRef, useCallback, TouchEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  Menu,
  X,
  Search,
  Home,
  FileText,
  BarChart3,
  Settings,
  User,
  Plus,
  Filter,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeGestureProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  children: React.ReactNode;
  threshold?: number;
  className?: string;
}

export function SwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  children,
  threshold = 50,
  className
}: SwipeGestureProps) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > threshold;
    const isRightSwipe = distanceX < -threshold;
    const isUpSwipe = distanceY > threshold;
    const isDownSwipe = distanceY < -threshold;

    // Only trigger swipe if horizontal movement is greater than vertical
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft();
      }
      if (isRightSwipe && onSwipeRight) {
        onSwipeRight();
      }
    } else {
      if (isUpSwipe && onSwipeUp) {
        onSwipeUp();
      }
      if (isDownSwipe && onSwipeDown) {
        onSwipeDown();
      }
    }
  };

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  threshold = 80,
  className 
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: TouchEvent) => {
    if (window.scrollY === 0) {
      setTouchStart(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (touchStart && window.scrollY === 0 && !isRefreshing) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - touchStart);
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    setTouchStart(0);
  };

  const pullProgress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 bg-background/90 backdrop-blur-sm transition-all duration-200"
          style={{ 
            height: Math.min(pullDistance, threshold),
            transform: `translateY(-${threshold - pullDistance}px)`
          }}
        >
          <div className="flex items-center gap-2 text-primary">
            <div 
              className={cn(
                "w-5 h-5 border-2 border-current rounded-full transition-transform duration-200",
                isRefreshing ? "animate-spin border-t-transparent" : "",
                pullProgress >= 1 && !isRefreshing ? "rotate-180" : ""
              )}
            >
              {!isRefreshing && (
                <ChevronDown 
                  className={cn(
                    "w-3 h-3 transition-transform duration-200",
                    pullProgress >= 1 ? "rotate-180" : ""
                  )} 
                />
              )}
            </div>
            <span className="text-sm font-medium">
              {isRefreshing ? "Yenileniyor..." : pullProgress >= 1 ? "Bırakın" : "Çekin"}
            </span>
          </div>
        </div>
      )}
      
      <div style={{ transform: `translateY(${Math.min(pullDistance, threshold)}px)` }}>
        {children}
      </div>
    </div>
  );
}

interface MobileBottomNavigationProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  className?: string;
}

export function MobileBottomNavigation({ 
  currentPath, 
  onNavigate, 
  className 
}: MobileBottomNavigationProps) {
  const navigationItems = [
    { path: '/dashboard', label: 'Ana Sayfa', icon: Home },
    { path: '/dashboard/projects', label: 'Projeler', icon: FileText },
    { path: '/dashboard/new', label: 'Yeni', icon: Plus, highlight: true },
    { path: '/dashboard/reports', label: 'Raporlar', icon: BarChart3 },
    { path: '/dashboard/profile', label: 'Profil', icon: User }
  ];

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-padding-bottom md:hidden",
      className
    )}>
      <div className="flex items-center justify-around py-2">
        {navigationItems.map((item) => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 min-w-[60px] transition-all duration-200 active:scale-95",
                isActive ? "text-primary" : "text-muted-foreground",
                item.highlight && "relative"
              )}
            >
              {item.highlight && (
                <div className="absolute -top-1 -inset-x-1 h-8 bg-primary/10 rounded-full" />
              )}
              <div className={cn(
                "flex items-center justify-center w-6 h-6 relative z-10",
                item.highlight && "text-primary"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={cn(
                "text-xs font-medium relative z-10",
                item.highlight && "text-primary"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  className?: string;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  icon: Icon,
  badge,
  className
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("border border-border rounded-lg overflow-hidden", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
          <span className="font-medium text-left">{title}</span>
          {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground transition-transform duration-200",
          isOpen ? "rotate-180" : ""
        )} />
      </button>
      
      <div className={cn(
        "transition-all duration-300 overflow-hidden",
        isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      )}>
        <Separator />
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

interface TouchOptimizedTableProps {
  data: Array<Record<string, any>>;
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any, row: any) => React.ReactNode;
  }>;
  onRowSelect?: (row: any) => void;
  className?: string;
}

export function TouchOptimizedTable({
  data,
  columns,
  onRowSelect,
  className
}: TouchOptimizedTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const handleRowTap = (rowIndex: number, row: any) => {
    if (onRowSelect) {
      onRowSelect(row);
    } else {
      setSelectedRows(prev => {
        const newSet = new Set(prev);
        if (newSet.has(rowIndex)) {
          newSet.delete(rowIndex);
        } else {
          newSet.add(rowIndex);
        }
        return newSet;
      });
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {data.map((row, rowIndex) => (
        <Card
          key={rowIndex}
          className={cn(
            "transition-all duration-200 active:scale-[0.98] cursor-pointer",
            selectedRows.has(rowIndex) ? "border-primary bg-primary/5" : "hover:shadow-soft"
          )}
          onClick={() => handleRowTap(rowIndex, row)}
        >
          <CardContent className="p-4 space-y-3">
            {columns.map((column, colIndex) => {
              const value = row[column.key];
              const displayValue = column.render ? column.render(value, row) : value;
              
              return (
                <div key={column.key} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    {column.label}
                  </span>
                  <span className="text-sm font-medium text-right max-w-[60%] truncate">
                    {displayValue}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actions: Array<{
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    variant?: 'default' | 'destructive';
    disabled?: boolean;
  }>;
  className?: string;
}

export function MobileActionSheet({
  isOpen,
  onClose,
  title,
  actions,
  className
}: MobileActionSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Action Sheet */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-background rounded-t-xl border-t border-border animate-slide-in-right safe-area-padding-bottom",
        className
      )}>
        {title && (
          <>
            <div className="flex items-center justify-between p-4">
              <h3 className="font-semibold text-lg">{title}</h3>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Separator />
          </>
        )}
        
        <div className="p-2 space-y-1">
          {actions.map((action, index) => {
            const Icon = action.icon;
            
            return (
              <button
                key={index}
                onClick={() => {
                  action.onClick();
                  onClose();
                }}
                disabled={action.disabled}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-lg transition-colors text-left active:scale-[0.98]",
                  action.variant === 'destructive' 
                    ? "text-destructive hover:bg-destructive/10" 
                    : "hover:bg-muted/50",
                  action.disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {Icon && <Icon className="w-5 h-5" />}
                <span className="font-medium">{action.label}</span>
              </button>
            );
          })}
        </div>
        
        <div className="p-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full"
          >
            İptal
          </Button>
        </div>
      </div>
    </div>
  );
}

// Hook to detect mobile device
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
}

// Safe area padding classes for devices with notches
export const safeAreaClasses = {
  top: 'pt-safe-top',
  bottom: 'pb-safe-bottom',
  left: 'pl-safe-left',
  right: 'pr-safe-right',
  x: 'px-safe-x',
  y: 'py-safe-y',
  all: 'p-safe'
};