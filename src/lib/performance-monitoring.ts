import React from 'react';
import { onCLS, onINP, onFCP, onLCP, onTTFB, Metric } from 'web-vitals';

// Performance thresholds based on Google's Core Web Vitals
export const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
  INP: { good: 200, needsImprovement: 500 },   // Interaction to Next Paint
  CLS: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
  TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte
};

// Performance event types
export type PerformanceEventType = 
  | 'page_load'
  | 'navigation'
  | 'user_interaction'
  | 'api_call'
  | 'error';

export interface PerformanceEvent {
  type: PerformanceEventType;
  name: string;
  value: number;
  timestamp: number;
  url: string;
  userAgent: string;
  metadata?: Record<string, any>;
}

export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  timestamp: number;
}

// Performance monitoring class
class PerformanceMonitor {
  private events: PerformanceEvent[] = [];
  private webVitalsMetrics: WebVitalsMetric[] = [];
  private isEnabled: boolean = true;
  private apiEndpoint: string = '/api/analytics/performance';

  constructor() {
    this.initializeWebVitals();
    this.initializePerformanceObserver();
  }

  // Initialize Web Vitals monitoring
  private initializeWebVitals() {
    if (typeof window === 'undefined') return;

    const handleMetric = (metric: Metric) => {
      const webVitalsMetric: WebVitalsMetric = {
        name: metric.name,
        value: metric.value,
        rating: this.getRating(metric.name, metric.value),
        delta: metric.delta,
        id: metric.id,
        timestamp: Date.now(),
      };

      this.webVitalsMetrics.push(webVitalsMetric);
      this.sendMetric(webVitalsMetric);

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${metric.name}:`, webVitalsMetric);
      }
    };

    // Register Web Vitals callbacks
    onCLS(handleMetric);
    onINP(handleMetric);
    onFCP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
  }

  // Initialize Performance Observer for custom metrics
  private initializePerformanceObserver() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.trackEvent({
              type: 'page_load',
              name: 'navigation_timing',
              value: navEntry.loadEventEnd - navEntry.startTime,
              metadata: {
                domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.startTime,
                domInteractive: navEntry.domInteractive - navEntry.startTime,
                loadComplete: navEntry.loadEventEnd - navEntry.startTime,
              },
            });
          }
        });
      });
      navObserver.observe({ entryTypes: ['navigation'] });

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource' && entry.duration > 100) {
            this.trackEvent({
              type: 'api_call',
              name: 'resource_load',
              value: entry.duration,
              metadata: {
                resourceName: entry.name,
                resourceType: (entry as PerformanceResourceTiming).initiatorType,
              },
            });
          }
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('[Performance] PerformanceObserver not supported:', error);
    }
  }

  // Get performance rating based on thresholds
  private getRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = PERFORMANCE_THRESHOLDS[metricName as keyof typeof PERFORMANCE_THRESHOLDS];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
  }

  // Track custom performance event
  public trackEvent(event: Omit<PerformanceEvent, 'timestamp' | 'url' | 'userAgent'>) {
    if (!this.isEnabled) return;

    const performanceEvent: PerformanceEvent = {
      ...event,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    this.events.push(performanceEvent);
    this.sendEvent(performanceEvent);
  }

  // Track page navigation
  public trackNavigation(fromPath: string, toPath: string, duration: number) {
    this.trackEvent({
      type: 'navigation',
      name: 'page_navigation',
      value: duration,
      metadata: {
        from: fromPath,
        to: toPath,
      },
    });
  }

  // Track user interaction
  public trackInteraction(interactionName: string, duration: number, metadata?: Record<string, any>) {
    this.trackEvent({
      type: 'user_interaction',
      name: interactionName,
      value: duration,
      metadata,
    });
  }

  // Track API call performance
  public trackApiCall(endpoint: string, method: string, duration: number, status: number) {
    this.trackEvent({
      type: 'api_call',
      name: 'api_request',
      value: duration,
      metadata: {
        endpoint,
        method,
        status,
      },
    });
  }

  // Send metric to analytics service
  private async sendMetric(metric: WebVitalsMetric) {
    if (process.env.NODE_ENV === 'development') return;

    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'web_vitals',
          metric,
        }),
      });
    } catch (error) {
      console.warn('[Performance] Failed to send metric:', error);
    }
  }

  // Send event to analytics service
  private async sendEvent(event: PerformanceEvent) {
    if (process.env.NODE_ENV === 'development') return;

    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'performance_event',
          event,
        }),
      });
    } catch (error) {
      console.warn('[Performance] Failed to send event:', error);
    }
  }

  // Get current performance summary
  public getPerformanceSummary() {
    return {
      webVitals: this.webVitalsMetrics,
      events: this.events,
      summary: {
        totalEvents: this.events.length,
        averagePageLoad: this.getAverageMetric('page_load'),
        averageApiResponse: this.getAverageMetric('api_call'),
        totalInteractions: this.events.filter(e => e.type === 'user_interaction').length,
      },
    };
  }

  // Get average metric value by type
  private getAverageMetric(type: PerformanceEventType): number {
    const events = this.events.filter(e => e.type === type);
    if (events.length === 0) return 0;
    return events.reduce((sum, event) => sum + event.value, 0) / events.length;
  }

  // Enable/disable monitoring
  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // Clear stored metrics (useful for testing)
  public clear() {
    this.events = [];
    this.webVitalsMetrics = [];
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitoring = () => {
  const trackInteraction = (name: string, metadata?: Record<string, any>) => {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      performanceMonitor.trackInteraction(name, duration, metadata);
    };
  };

  const trackApiCall = async <T>(
    promise: Promise<T>,
    endpoint: string,
    method: string
  ): Promise<T> => {
    const startTime = performance.now();
    let status = 200;
    
    try {
      const result = await promise;
      return result;
    } catch (error) {
      status = 500;
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      performanceMonitor.trackApiCall(endpoint, method, duration, status);
    }
  };

  const getPerformanceSummary = () => {
    return performanceMonitor.getPerformanceSummary();
  };

  return {
    trackInteraction,
    trackApiCall,
    getPerformanceSummary,
  };
};

// Higher-order component for automatic performance tracking
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  const WrappedComponent = (props: P) => {
    React.useEffect(() => {
      const startTime = performance.now();
      
      return () => {
        const duration = performance.now() - startTime;
        performanceMonitor.trackEvent({
          type: 'user_interaction',
          name: `${componentName}_render`,
          value: duration,
        });
      };
    }, []);

    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withPerformanceTracking(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default performanceMonitor;