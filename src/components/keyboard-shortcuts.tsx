'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Keyboard, 
  Command, 
  Plus, 
  Search, 
  Home, 
  FileText, 
  BarChart3, 
  Settings,
  LogOut,
  Moon,
  Sun,
  HelpCircle,
  X,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  action: () => void;
  category: 'navigation' | 'actions' | 'ui' | 'system';
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface KeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[];
  onClose?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const activeElement = document.activeElement;
    const isInputFocused = activeElement instanceof HTMLInputElement || 
                          activeElement instanceof HTMLTextAreaElement ||
                          activeElement?.getAttribute('contenteditable') === 'true';

    // Don't trigger shortcuts when user is typing in input fields
    if (isInputFocused) return;

    for (const shortcut of shortcuts) {
      if (shortcut.disabled) continue;

      const modifiersMatch = (
        (!shortcut.keys.includes('ctrl') || event.ctrlKey) &&
        (!shortcut.keys.includes('shift') || event.shiftKey) &&
        (!shortcut.keys.includes('alt') || event.altKey) &&
        (!shortcut.keys.includes('meta') || event.metaKey)
      );

      const keyMatch = shortcut.keys.some(key => 
        key !== 'ctrl' && key !== 'shift' && key !== 'alt' && key !== 'meta' && 
        key.toLowerCase() === event.key.toLowerCase()
      );

      if (modifiersMatch && keyMatch) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function KeyboardShortcutsProvider({ 
  children, 
  customShortcuts = [] 
}: { 
  children: React.ReactNode;
  customShortcuts?: KeyboardShortcut[];
}) {
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const [showHelp, setShowHelp] = useState(false);

  const defaultShortcuts: KeyboardShortcut[] = [
    // Navigation
    {
      id: 'goto-dashboard',
      keys: ['ctrl', 'd'],
      description: 'Dashboard\'a git',
      action: () => router.push('/dashboard'),
      category: 'navigation',
      icon: Home
    },
    {
      id: 'goto-projects',
      keys: ['ctrl', 'p'],
      description: 'Projeler sayfasına git',
      action: () => router.push('/dashboard/projects'),
      category: 'navigation',
      icon: FileText
    },
    {
      id: 'goto-reports',
      keys: ['ctrl', 'r'],
      description: 'Raporlar sayfasına git',
      action: () => router.push('/dashboard/reports'),
      category: 'navigation',
      icon: BarChart3
    },
    {
      id: 'goto-settings',
      keys: ['ctrl', ','],
      description: 'Ayarlar sayfasına git',
      action: () => router.push('/dashboard/settings'),
      category: 'navigation',
      icon: Settings
    },

    // Actions
    {
      id: 'new-project',
      keys: ['ctrl', 'n'],
      description: 'Yeni proje oluştur',
      action: () => {
        // This would trigger project creation modal
        const event = new CustomEvent('open-project-form');
        window.dispatchEvent(event);
      },
      category: 'actions',
      icon: Plus
    },
    {
      id: 'global-search',
      keys: ['ctrl', 'k'],
      description: 'Global arama',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Ara"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
      category: 'actions',
      icon: Search
    },
    {
      id: 'command-palette',
      keys: ['ctrl', 'shift', 'p'],
      description: 'Komut paletini aç',
      action: () => {
        const event = new CustomEvent('open-command-palette');
        window.dispatchEvent(event);
      },
      category: 'actions',
      icon: Command
    },

    // UI
    {
      id: 'toggle-theme',
      keys: ['ctrl', 'shift', 't'],
      description: 'Tema değiştir',
      action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      category: 'ui',
      icon: theme === 'dark' ? Sun : Moon
    },
    {
      id: 'show-shortcuts',
      keys: ['ctrl', '?'],
      description: 'Klavye kısayollarını göster',
      action: () => setShowHelp(true),
      category: 'ui',
      icon: HelpCircle
    },
    {
      id: 'escape',
      keys: ['escape'],
      description: 'Modal/dialog kapat',
      action: () => {
        const event = new CustomEvent('escape-pressed');
        window.dispatchEvent(event);
      },
      category: 'ui',
      icon: X
    },

    // System
    {
      id: 'logout',
      keys: ['ctrl', 'shift', 'l'],
      description: 'Çıkış yap',
      action: () => {
        const event = new CustomEvent('logout');
        window.dispatchEvent(event);
      },
      category: 'system',
      icon: LogOut
    }
  ];

  const allShortcuts = [...defaultShortcuts, ...customShortcuts];

  useKeyboardShortcuts(allShortcuts);

  return (
    <>
      {children}
      {showHelp && (
        <KeyboardShortcutsModal 
          shortcuts={allShortcuts}
          onClose={() => setShowHelp(false)}
        />
      )}
    </>
  );
}

function KeyboardShortcutsModal({ shortcuts, onClose }: KeyboardShortcutsProps) {
  const categorizedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const categoryLabels = {
    navigation: { label: 'Navigasyon', icon: Home },
    actions: { label: 'Eylemler', icon: Zap },
    ui: { label: 'Arayüz', icon: Command },
    system: { label: 'Sistem', icon: Settings }
  };

  const formatKeys = (keys: string[]) => {
    return keys.map(key => {
      switch (key) {
        case 'ctrl':
          return '⌃';
        case 'shift':
          return '⇧';
        case 'alt':
          return '⌥';
        case 'meta':
          return '⌘';
        case 'escape':
          return 'Esc';
        case ' ':
          return 'Space';
        default:
          return key.toUpperCase();
      }
    }).join(' + ');
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-strong">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                Klavye Kısayolları
              </CardTitle>
              <CardDescription>
                Uygulamayı daha hızlı kullanmak için klavye kısayolları
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
            {Object.entries(categorizedShortcuts).map(([category, categoryShortcuts], index) => {
              const categoryConfig = categoryLabels[category as keyof typeof categoryLabels];
              
              return (
                <div key={category} className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <categoryConfig.icon className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-lg">{categoryConfig.label}</h3>
                  </div>

                  <div className="space-y-3">
                    {categoryShortcuts.map((shortcut) => (
                      <div 
                        key={shortcut.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border bg-card/50 transition-all duration-200",
                          shortcut.disabled && "opacity-50",
                          !shortcut.disabled && "hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {shortcut.icon && (
                            <shortcut.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium truncate">
                            {shortcut.description}
                          </span>
                        </div>
                        
                        <Badge 
                          variant="outline" 
                          className="font-mono text-xs whitespace-nowrap ml-2"
                        >
                          {formatKeys(shortcut.keys)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>

        <div className="border-t p-4 bg-muted/20">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Toplam {shortcuts.length} kısayol</span>
              <span>•</span>
              <span>ESC ile kapat</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Powered by</span>
              <Keyboard className="w-4 h-4" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Helper component for showing shortcut hints
interface ShortcutHintProps {
  keys: string[];
  className?: string;
  size?: 'sm' | 'md';
}

export function ShortcutHint({ keys, className, size = 'sm' }: ShortcutHintProps) {
  const formatKeys = (keys: string[]) => {
    return keys.map(key => {
      switch (key) {
        case 'ctrl':
          return '⌃';
        case 'shift':
          return '⇧';
        case 'alt':
          return '⌥';
        case 'meta':
          return '⌘';
        case 'escape':
          return 'Esc';
        case ' ':
          return 'Space';
        default:
          return key.toUpperCase();
      }
    }).join(' + ');
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-mono",
        size === 'sm' ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1",
        className
      )}
    >
      {formatKeys(keys)}
    </Badge>
  );
}

// Custom hook for individual shortcut registration
export function useShortcut(
  keys: string[], 
  action: () => void, 
  dependencies: any[] = []
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement instanceof HTMLInputElement || 
                            activeElement instanceof HTMLTextAreaElement ||
                            activeElement?.getAttribute('contenteditable') === 'true';

      if (isInputFocused) return;

      const modifiersMatch = (
        (!keys.includes('ctrl') || event.ctrlKey) &&
        (!keys.includes('shift') || event.shiftKey) &&
        (!keys.includes('alt') || event.altKey) &&
        (!keys.includes('meta') || event.metaKey)
      );

      const keyMatch = keys.some(key => 
        key !== 'ctrl' && key !== 'shift' && key !== 'alt' && key !== 'meta' && 
        key.toLowerCase() === event.key.toLowerCase()
      );

      if (modifiersMatch && keyMatch) {
        event.preventDefault();
        action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, dependencies);
}