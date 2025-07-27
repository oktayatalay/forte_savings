'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Euro, DollarSign, Banknote, TrendingUp, TrendingDown } from 'lucide-react';

interface CurrencyData {
  currency: string;
  savings: number;
  cost_avoidance: number;
  total: number;
  record_count: number;
}

interface CurrencyCardsProps {
  data: CurrencyData[];
  className?: string;
  showChange?: boolean;
  compact?: boolean;
}

const getCurrencyIcon = (currency: string) => {
  switch (currency.toUpperCase()) {
    case 'EUR':
      return Euro;
    case 'USD':
      return DollarSign;
    case 'TRY':
      return Banknote;
    default:
      return DollarSign;
  }
};

const getCurrencySymbol = (currency: string) => {
  switch (currency.toUpperCase()) {
    case 'EUR':
      return '€';
    case 'USD':
      return '$';
    case 'TRY':
      return '₺';
    default:
      return currency;
  }
};

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: 'compact'
  }).format(amount);
};

export function CurrencyCards({ data, className, showChange = false, compact = false }: CurrencyCardsProps) {
  if (!data || data.length === 0) {
    return (
      <Card className={cn("p-4 text-center text-muted-foreground", className)}>
        <CardContent className="p-0">
          <div className="text-sm">Henüz tasarruf kaydı bulunmuyor</div>
        </CardContent>
      </Card>
    );
  }

  const sortedData = data
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total);

  if (sortedData.length === 0) {
    return (
      <Card className={cn("p-4 text-center text-muted-foreground", className)}>
        <CardContent className="p-0">
          <div className="text-sm">Henüz tasarruf kaydı bulunmuyor</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("grid gap-3", className)}>
      {sortedData.map((item, index) => {
        const Icon = getCurrencyIcon(item.currency);
        const symbol = getCurrencySymbol(item.currency);
        const isPrimary = index === 0;
        
        return (
          <Card 
            key={item.currency}
            className={cn(
              "transition-all duration-300 hover:shadow-medium group relative overflow-hidden",
              isPrimary && "ring-2 ring-primary/20 shadow-glow",
              compact ? "p-3" : "p-4"
            )}
          >
            {/* Background gradient for primary currency */}
            {isPrimary && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}
            
            <CardContent className="p-0 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-2 rounded-lg transition-colors duration-200",
                    isPrimary ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{item.currency}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.record_count} kayıt
                    </div>
                  </div>
                </div>
                {isPrimary && (
                  <Badge variant="secondary" className="text-xs">
                    Ana Para Birimi
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                {/* Total Amount */}
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Toplam</span>
                  <span className={cn(
                    "font-bold transition-colors duration-200",
                    compact ? "text-lg" : "text-xl",
                    isPrimary ? "text-primary" : "text-foreground"
                  )}>
                    {symbol}{new Intl.NumberFormat('tr-TR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                      notation: compact ? 'compact' : 'standard'
                    }).format(item.total)}
                  </span>
                </div>
                
                {/* Breakdown */}
                {!compact && (
                  <div className="space-y-1 pt-1 border-t border-border/50">
                    {item.savings > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-green-600" />
                          <span className="text-muted-foreground">Tasarruf</span>
                        </div>
                        <span className="font-medium text-green-600">
                          {formatCurrency(item.savings, item.currency)}
                        </span>
                      </div>
                    )}
                    {item.cost_avoidance > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <TrendingDown className="w-3 h-3 text-blue-600" />
                          <span className="text-muted-foreground">Maliyet Eng.</span>
                        </div>
                        <span className="font-medium text-blue-600">
                          {formatCurrency(item.cost_avoidance, item.currency)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Compact horizontal layout for dashboard
export function CurrencyMiniCards({ data, className }: CurrencyCardsProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="text-sm text-muted-foreground">Henüz tasarruf kaydı bulunmuyor</div>
      </div>
    );
  }

  const sortedData = data
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3); // Show max 3 currencies

  if (sortedData.length === 0) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="text-sm text-muted-foreground">Henüz tasarruf kaydı bulunmuyor</div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {sortedData.map((item, index) => {
        const symbol = getCurrencySymbol(item.currency);
        const Icon = getCurrencyIcon(item.currency);
        const isPrimary = index === 0;
        
        return (
          <div 
            key={item.currency}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105",
              isPrimary ? "bg-primary/10 text-primary" : "bg-muted/50 text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            <div className="flex flex-col">
              <span className="font-bold text-sm">
                {symbol}{new Intl.NumberFormat('tr-TR', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                  notation: 'compact'
                }).format(item.total)}
              </span>
              <span className="text-xs opacity-70">{item.currency}</span>
            </div>
          </div>
        );
      })}
      {data.filter(item => item.total > 0).length > 3 && (
        <div className="text-xs text-muted-foreground">
          +{data.filter(item => item.total > 0).length - 3} daha
        </div>
      )}
    </div>
  );
}