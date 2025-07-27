'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
}

interface Action {
  label: string;
  icon: React.ElementType;
  onClick: (row: any) => void;
  variant?: 'default' | 'destructive';
  show?: (row: any) => boolean;
}

interface EnhancedDataTableProps {
  title: string;
  description?: string;
  data: any[];
  columns: Column[];
  actions?: Action[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  onSort?: (field: string) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    perPage: number;
    onPageChange: (page: number) => void;
  };
  onSearch?: (term: string) => void;
  emptyState?: {
    title: string;
    description: string;
    action?: React.ReactNode;
  };
  headerActions?: React.ReactNode;
  className?: string;
}

export function EnhancedDataTable({
  title,
  description,
  data,
  columns,
  actions,
  loading = false,
  searchable = true,
  searchPlaceholder = "Ara...",
  sortBy,
  sortOrder,
  onSort,
  pagination,
  onSearch,
  emptyState,
  headerActions,
  className
}: EnhancedDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch?.(value);
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    return sortOrder === 'ASC' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const LoadingRow = () => (
    <TableRow>
      {columns.map((column, index) => (
        <TableCell key={index}>
          <div className="h-4 bg-muted animate-pulse rounded w-full" />
        </TableCell>
      ))}
      {actions && <TableCell><div className="h-4 bg-muted animate-pulse rounded w-16" /></TableCell>}
    </TableRow>
  );

  const EmptyState = () => (
    <TableRow>
      <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="h-32">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="text-muted-foreground mb-2">
            {emptyState?.title || "Veri bulunamadı"}
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            {emptyState?.description || "Görüntülenecek kayıt yok"}
          </div>
          {emptyState?.action}
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {headerActions}
          </div>
        </div>
        
        {/* Search and Filters */}
        {searchable && (
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtrele
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Dışa Aktar
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead 
                    key={column.key}
                    className={cn(
                      column.sortable && "cursor-pointer hover:bg-muted/50 transition-colors",
                      column.className
                    )}
                    onClick={() => column.sortable && onSort?.(column.key)}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{column.label}</span>
                      {column.sortable && getSortIcon(column.key)}
                    </div>
                  </TableHead>
                ))}
                {actions && <TableHead className="text-center w-20">İşlemler</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <LoadingRow key={index} />
                ))
              ) : data.length === 0 ? (
                <EmptyState />
              ) : (
                data.map((row, rowIndex) => (
                  <TableRow 
                    key={rowIndex}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    {columns.map((column) => (
                      <TableCell 
                        key={column.key}
                        className={column.className}
                      >
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </TableCell>
                    ))}
                    {actions && (
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {actions
                              .filter(action => !action.show || action.show(row))
                              .map((action, actionIndex) => (
                              <DropdownMenuItem 
                                key={actionIndex}
                                onClick={() => action.onClick(row)}
                                className={cn(
                                  action.variant === 'destructive' && "text-red-600 hover:text-red-700"
                                )}
                              >
                                <action.icon className="w-4 h-4 mr-2" />
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {pagination.totalRecords} kayıttan {((pagination.currentPage - 1) * pagination.perPage) + 1}-{Math.min(pagination.currentPage * pagination.perPage, pagination.totalRecords)} arası gösteriliyor
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Önceki
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.currentPage - 2)) + i;
                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => pagination.onPageChange(pageNum)}
                      className="w-10 h-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
              >
                Sonraki
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}