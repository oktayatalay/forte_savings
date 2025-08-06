'use client';

/**
 * Client-side utilities for handling hydration mismatches and browser-specific code
 */

// Safe localStorage wrapper that prevents hydration mismatches
export const safeLocalStorage = {
  setItem: (key: string, value: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  },
  
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return null;
    }
  },
  
  removeItem: (key: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
      return false;
    }
  },
  
  clear: (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      window.localStorage.clear();
      return true;
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      return false;
    }
  }
};

// Safe sessionStorage wrapper
export const safeSessionStorage = {
  setItem: (key: string, value: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      window.sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Failed to save to sessionStorage:', error);
      return false;
    }
  },
  
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return window.sessionStorage.getItem(key);
    } catch (error) {
      console.error('Failed to read from sessionStorage:', error);
      return null;
    }
  },
  
  removeItem: (key: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      window.sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to remove from sessionStorage:', error);
      return false;
    }
  }
};

// Check if code is running in browser
export const isBrowser = typeof window !== 'undefined';

// Check if code is running in development mode
export const isDevelopment = process.env.NODE_ENV === 'development';

// Safe window navigation
export const safeNavigate = {
  reload: () => {
    if (isBrowser) {
      window.location.reload();
    }
  },
  
  redirect: (url: string) => {
    if (isBrowser) {
      window.location.href = url;
    }
  },
  
  back: () => {
    if (isBrowser && window.history.length > 1) {
      window.history.back();
    } else {
      safeNavigate.redirect('/');
    }
  }
};

// Safe JSON operations
export const safeJSON = {
  parse: <T = any>(str: string, fallback: T | null = null): T | null => {
    try {
      return JSON.parse(str);
    } catch (error) {
      console.error('JSON parse error:', error);
      return fallback;
    }
  },
  
  stringify: (obj: any, fallback: string = '{}'): string => {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      console.error('JSON stringify error:', error);
      return fallback;
    }
  }
};

// Debounce function for performance optimization
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle function for performance optimization
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

// Safe event listener management
export const safeEventListener = {
  add: <K extends keyof WindowEventMap>(
    type: K,
    listener: (ev: WindowEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ) => {
    if (isBrowser) {
      window.addEventListener(type, listener, options);
    }
  },
  
  remove: <K extends keyof WindowEventMap>(
    type: K,
    listener: (ev: WindowEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ) => {
    if (isBrowser) {
      window.removeEventListener(type, listener, options);
    }
  }
};

// Network status utilities
export const networkUtils = {
  isOnline: (): boolean => {
    if (!isBrowser) return true;
    return navigator.onLine;
  },
  
  getConnectionType: (): string => {
    if (!isBrowser) return 'unknown';
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection?.effectiveType || 'unknown';
  }
};

// Form validation utilities
export const validationUtils = {
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  isForteEmail: (email: string): boolean => {
    return email.toLowerCase().endsWith('@fortetourism.com');
  },
  
  isStrongPassword: (password: string): boolean => {
    // At least 6 characters, contains letters and numbers
    return password.length >= 6 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
  },
  
  sanitizeInput: (input: string): string => {
    return input.trim().replace(/[<>\"'&]/g, '');
  }
};

// Error classification utilities
export const errorUtils = {
  isHydrationError: (error: Error): boolean => {
    return error.message.includes('hydration') || 
           error.message.includes('Minified React error #31') ||
           error.message.includes('Text content does not match');
  },
  
  isNetworkError: (error: Error): boolean => {
    return error.message.includes('fetch') || 
           error.message.includes('network') ||
           error.message.includes('Failed to fetch');
  },
  
  isStorageError: (error: Error): boolean => {
    return error.message.includes('localStorage') || 
           error.message.includes('sessionStorage') ||
           error.message.includes('storage');
  },
  
  isAuthError: (error: Error): boolean => {
    return error.message.includes('401') || 
           error.message.includes('unauthorized') ||
           error.message.includes('authentication');
  }
};

// Performance monitoring utilities
export const performanceUtils = {
  measureTime: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    if (!isBrowser) return fn();
    
    const startTime = performance.now();
    try {
      const result = await fn();
      const endTime = performance.now();
      console.log(`${name} took ${endTime - startTime} milliseconds`);
      return result;
    } catch (error) {
      const endTime = performance.now();
      console.error(`${name} failed after ${endTime - startTime} milliseconds`, error);
      throw error;
    }
  },
  
  markPageLoad: (pageName: string) => {
    if (!isBrowser) return;
    
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`${pageName}-loaded`);
    }
  }
};

// Retry utilities for network operations
export const retryUtils = {
  withRetry: async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    let lastError: Error;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (i === maxRetries) break;
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    
    throw lastError!;
  }
};

export default {
  safeLocalStorage,
  safeSessionStorage,
  isBrowser,
  isDevelopment,
  safeNavigate,
  safeJSON,
  debounce,
  throttle,
  safeEventListener,
  networkUtils,
  validationUtils,
  errorUtils,
  performanceUtils,
  retryUtils,
};