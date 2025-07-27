'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Command, 
  FileText, 
  Building, 
  Users, 
  DollarSign, 
  Calendar,
  TrendingUp,
  Settings,
  Clock,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'project' | 'customer' | 'savings' | 'user' | 'report' | 'setting';
  url: string;
  metadata?: Record<string, any>;
  score?: number;
}

interface SearchCategory {
  type: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface GlobalSearchProps {
  placeholder?: string;
  className?: string;
  shortcut?: string;
  onResultSelect?: (result: SearchResult) => void;
  recentSearches?: boolean;
  categories?: SearchCategory[];
}

const defaultCategories: SearchCategory[] = [
  {
    type: 'project',
    label: 'Projeler',
    icon: FileText,
    color: 'bg-blue-500'
  },
  {
    type: 'customer',
    label: 'Müşteriler',
    icon: Building,
    color: 'bg-green-500'
  },
  {
    type: 'savings',
    label: 'Tasarruflar',
    icon: DollarSign,
    color: 'bg-yellow-500'
  },
  {
    type: 'user',
    label: 'Kullanıcılar',
    icon: Users,
    color: 'bg-purple-500'
  },
  {
    type: 'report',
    label: 'Raporlar',
    icon: TrendingUp,
    color: 'bg-orange-500'
  },
  {
    type: 'setting',
    label: 'Ayarlar',
    icon: Settings,
    color: 'bg-gray-500'
  }
];

export function GlobalSearch({
  placeholder = "Ara... (Ctrl+K)",
  className,
  shortcut = "⌘K",
  onResultSelect,
  recentSearches = true,
  categories = defaultCategories
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load recent searches from localStorage
  useEffect(() => {
    if (recentSearches) {
      const saved = localStorage.getItem('forte-search-recent');
      if (saved) {
        try {
          setRecentQueries(JSON.parse(saved));
        } catch (error) {
          console.error('Failed to load recent searches:', error);
        }
      }
    }
  }, [recentSearches]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }

      if (isOpen) {
        if (e.key === 'Escape') {
          setIsOpen(false);
          setQuery('');
          setSelectedIndex(-1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, -1));
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
          e.preventDefault();
          handleResultSelect(results[selectedIndex]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search function
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        // Simulate API call with mock data
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const mockResults: SearchResult[] = [
          {
            id: '1',
            title: 'Mobile Banking App',
            description: 'FRN-2024-0001 • ABC Bank',
            type: 'project',
            url: '/dashboard/project-detail/1',
            metadata: { customer: 'ABC Bank', status: 'active' },
            score: 0.95
          },
          {
            id: '2',
            title: 'E-commerce Platform',
            description: 'FRN-2024-0002 • XYZ Corp',
            type: 'project',
            url: '/dashboard/project-detail/2',
            metadata: { customer: 'XYZ Corp', status: 'completed' },
            score: 0.87
          },
          {
            id: '3',
            title: 'ABC Bank',
            description: '15 aktif proje • ₺2.5M toplam tasarruf',
            type: 'customer',
            url: '/dashboard/customers/abc-bank',
            metadata: { projectCount: 15, totalSavings: 2500000 },
            score: 0.82
          },
          {
            id: '4',
            title: 'Sunucu Optimizasyonu',
            description: '₺450,000 maliyet tasarrufu • Ocak 2024',
            type: 'savings',
            url: '/dashboard/savings/server-optimization',
            metadata: { amount: 450000, currency: 'TRY' },
            score: 0.75
          },
          {
            id: '5',
            title: 'Aylık Performans Raporu',
            description: 'Ocak 2024 tasarruf analizi',
            type: 'report',
            url: '/dashboard/reports/monthly-performance',
            metadata: { period: '2024-01' },
            score: 0.68
          }
        ];

        // Filter results based on query
        const filtered = mockResults.filter(result =>
          result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          result.description.toLowerCase().includes(searchQuery.toLowerCase())
        );

        setResults(filtered);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleResultSelect = (result: SearchResult) => {
    // Save to recent searches
    if (recentSearches && query) {
      const newRecent = [query, ...recentQueries.filter(q => q !== query)].slice(0, 5);
      setRecentQueries(newRecent);
      localStorage.setItem('forte-search-recent', JSON.stringify(newRecent));
    }

    // Close search
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(-1);

    // Handle result selection
    if (onResultSelect) {
      onResultSelect(result);
    } else {
      router.push(result.url);
    }
  };

  const getCategoryConfig = (type: string) => {
    return categories.find(cat => cat.type === type) || categories[0];
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <div className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-16"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <Badge variant="secondary" className="text-xs font-mono">
            {shortcut}
          </Badge>
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-strong z-50 max-h-96 overflow-hidden"
        >
          {isLoading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Aranıyor...</span>
            </div>
          )}

          {!isLoading && !query && recentSearches && recentQueries.length > 0 && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Son Aramalar</span>
              </div>
              <div className="space-y-1">
                {recentQueries.map((recentQuery, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(recentQuery)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                  >
                    {recentQuery}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isLoading && query && results.length === 0 && (
            <div className="flex items-center justify-center p-8 text-center">
              <div>
                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  "{query}" için sonuç bulunamadı
                </p>
              </div>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="max-h-80 overflow-y-auto">
              {Object.entries(groupedResults).map(([type, typeResults], categoryIndex) => {
                const categoryConfig = getCategoryConfig(type);
                
                return (
                  <div key={type}>
                    {categoryIndex > 0 && <Separator />}
                    <div className="p-2">
                      <div className="flex items-center gap-2 px-2 py-1 mb-1">
                        <div className={cn("w-2 h-2 rounded-full", categoryConfig.color)} />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {categoryConfig.label}
                        </span>
                      </div>
                      
                      {typeResults.map((result, index) => {
                        const globalIndex = results.indexOf(result);
                        const isSelected = globalIndex === selectedIndex;
                        
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleResultSelect(result)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={cn(
                              "w-full text-left p-3 rounded-md transition-all duration-150 group",
                              isSelected ? "bg-primary/10 border-primary/20" : "hover:bg-muted/50"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <categoryConfig.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium text-sm truncate">
                                    {result.title}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {result.description}
                                </p>
                              </div>
                              <ArrowUpRight className={cn(
                                "w-4 h-4 text-muted-foreground transition-all duration-150 flex-shrink-0 ml-2",
                                isSelected ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
                              )} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              {/* Search Footer */}
              <Separator />
              <div className="p-3 bg-muted/20">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>Enter ile seç</span>
                    <span>↑↓ ile gezin</span>
                    <span>Esc ile kapat</span>
                  </div>
                  <span>{results.length} sonuç</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Command Palette Component
export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl">
        <div className="bg-background border border-border rounded-lg shadow-strong">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Command className="w-5 h-5" />
              <span className="font-medium">Komut Paleti</span>
              <Badge variant="outline" className="ml-auto">Ctrl+Shift+P</Badge>
            </div>
          </div>
          
          <div className="p-4">
            <GlobalSearch
              placeholder="Komut veya eylem ara..."
              shortcut="Enter"
              onResultSelect={(result) => {
                setIsOpen(false);
                // Handle command execution
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}