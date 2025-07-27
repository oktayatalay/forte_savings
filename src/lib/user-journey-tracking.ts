import { performanceMonitor } from './performance-monitoring';

// Define key user journeys in the application
export enum UserJourney {
  // Authentication journeys
  LOGIN = 'user_login',
  REGISTER = 'user_register',
  LOGOUT = 'user_logout',
  PASSWORD_RESET = 'password_reset',

  // Dashboard journeys
  DASHBOARD_LOAD = 'dashboard_load',
  DASHBOARD_STATS_LOAD = 'dashboard_stats_load',
  DASHBOARD_NAVIGATION = 'dashboard_navigation',

  // Project management journeys
  PROJECT_CREATE = 'project_create',
  PROJECT_EDIT = 'project_edit',
  PROJECT_DELETE = 'project_delete',
  PROJECT_VIEW = 'project_view',
  PROJECT_LIST_LOAD = 'project_list_load',
  PROJECT_SEARCH = 'project_search',

  // Savings management journeys
  SAVINGS_CREATE = 'savings_create',
  SAVINGS_EDIT = 'savings_edit',
  SAVINGS_DELETE = 'savings_delete',
  SAVINGS_BULK_IMPORT = 'savings_bulk_import',

  // Reports and analytics journeys
  REPORTS_GENERATE = 'reports_generate',
  REPORTS_EXPORT = 'reports_export',
  ANALYTICS_LOAD = 'analytics_load',

  // Admin journeys
  ADMIN_PANEL_ACCESS = 'admin_panel_access',
  USER_MANAGEMENT = 'user_management',
  SYSTEM_SETTINGS = 'system_settings',
  AUDIT_LOG_VIEW = 'audit_log_view',

  // Form interactions
  FORM_VALIDATION = 'form_validation',
  FORM_SUBMISSION = 'form_submission',
  FORM_AUTO_SAVE = 'form_auto_save',

  // Search and filtering
  GLOBAL_SEARCH = 'global_search',
  TABLE_FILTER = 'table_filter',
  TABLE_SORT = 'table_sort',

  // UI interactions
  MODAL_OPEN = 'modal_open',
  DROPDOWN_OPEN = 'dropdown_open',
  TAB_SWITCH = 'tab_switch',
  PAGE_SCROLL = 'page_scroll',

  // Error handling
  ERROR_RECOVERY = 'error_recovery',
  RETRY_ACTION = 'retry_action',
}

// Journey step definitions
export interface JourneyStep {
  name: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
  success?: boolean;
  error?: string;
}

export interface Journey {
  id: string;
  type: UserJourney;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  steps: JourneyStep[];
  success: boolean;
  userId?: string;
  sessionId: string;
  metadata: Record<string, any>;
}

// Journey tracking class
class UserJourneyTracker {
  private activeJourneys: Map<string, Journey> = new Map();
  private completedJourneys: Journey[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Start tracking a user journey
  public startJourney(
    type: UserJourney,
    metadata: Record<string, any> = {}
  ): string {
    const journeyId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    const journey: Journey = {
      id: journeyId,
      type,
      startTime,
      steps: [],
      success: false,
      sessionId: this.sessionId,
      metadata: {
        startUrl: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        ...metadata,
      },
    };

    this.activeJourneys.set(journeyId, journey);

    // Track the start event
    performanceMonitor.trackEvent({
      type: 'user_interaction',
      name: `${type}_start`,
      value: 0,
      metadata: {
        journeyId,
        ...metadata,
      },
    });

    return journeyId;
  }

  // Add a step to an active journey
  public addStep(
    journeyId: string,
    stepName: string,
    metadata: Record<string, any> = {},
    success: boolean = true,
    error?: string
  ): void {
    const journey = this.activeJourneys.get(journeyId);
    if (!journey) {
      console.warn(`Journey ${journeyId} not found`);
      return;
    }

    const timestamp = performance.now();
    const previousStep = journey.steps[journey.steps.length - 1];
    const duration = previousStep ? timestamp - previousStep.timestamp : 0;

    const step: JourneyStep = {
      name: stepName,
      timestamp,
      duration,
      metadata,
      success,
      error,
    };

    journey.steps.push(step);

    // Track the step event
    performanceMonitor.trackEvent({
      type: 'user_interaction',
      name: `${journey.type}_step_${stepName}`,
      value: duration,
      metadata: {
        journeyId,
        stepIndex: journey.steps.length,
        success,
        error,
        ...metadata,
      },
    });
  }

  // Complete a journey
  public completeJourney(
    journeyId: string,
    success: boolean = true,
    metadata: Record<string, any> = {}
  ): Journey | null {
    const journey = this.activeJourneys.get(journeyId);
    if (!journey) {
      console.warn(`Journey ${journeyId} not found`);
      return null;
    }

    const endTime = performance.now();
    journey.endTime = endTime;
    journey.totalDuration = endTime - journey.startTime;
    journey.success = success;
    journey.metadata = { ...journey.metadata, ...metadata };

    this.activeJourneys.delete(journeyId);
    this.completedJourneys.push(journey);

    // Track the completion event
    performanceMonitor.trackEvent({
      type: 'user_interaction',
      name: `${journey.type}_complete`,
      value: journey.totalDuration,
      metadata: {
        journeyId,
        success,
        stepCount: journey.steps.length,
        totalDuration: journey.totalDuration,
        ...metadata,
      },
    });

    // Send journey data to analytics
    this.sendJourneyData(journey);

    return journey;
  }

  // Abandon a journey (e.g., user navigates away)
  public abandonJourney(
    journeyId: string,
    reason: string = 'unknown',
    metadata: Record<string, any> = {}
  ): void {
    const journey = this.activeJourneys.get(journeyId);
    if (!journey) {
      return;
    }

    journey.endTime = performance.now();
    journey.totalDuration = journey.endTime - journey.startTime;
    journey.success = false;
    journey.metadata = { 
      ...journey.metadata, 
      abandonment: true, 
      abandonmentReason: reason,
      ...metadata 
    };

    this.activeJourneys.delete(journeyId);
    this.completedJourneys.push(journey);

    // Track the abandonment event
    performanceMonitor.trackEvent({
      type: 'user_interaction',
      name: `${journey.type}_abandoned`,
      value: journey.totalDuration,
      metadata: {
        journeyId,
        reason,
        stepCount: journey.steps.length,
        ...metadata,
      },
    });
  }

  // Get journey statistics
  public getJourneyStats(type?: UserJourney): {
    totalJourneys: number;
    successRate: number;
    averageDuration: number;
    medianDuration: number;
    abandonmentRate: number;
  } {
    const journeys = type 
      ? this.completedJourneys.filter(j => j.type === type)
      : this.completedJourneys;

    if (journeys.length === 0) {
      return {
        totalJourneys: 0,
        successRate: 0,
        averageDuration: 0,
        medianDuration: 0,
        abandonmentRate: 0,
      };
    }

    const successfulJourneys = journeys.filter(j => j.success);
    const durations = journeys.map(j => j.totalDuration || 0).sort((a, b) => a - b);

    return {
      totalJourneys: journeys.length,
      successRate: (successfulJourneys.length / journeys.length) * 100,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      medianDuration: durations[Math.floor(durations.length / 2)],
      abandonmentRate: ((journeys.length - successfulJourneys.length) / journeys.length) * 100,
    };
  }

  // Get all active journeys
  public getActiveJourneys(): Journey[] {
    return Array.from(this.activeJourneys.values());
  }

  // Get completed journeys
  public getCompletedJourneys(limit?: number): Journey[] {
    return limit 
      ? this.completedJourneys.slice(-limit)
      : this.completedJourneys;
  }

  // Send journey data to analytics service
  private async sendJourneyData(journey: Journey): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log('Journey completed:', journey);
      return;
    }

    try {
      await fetch('/api/analytics/journey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(journey),
      });
    } catch (error) {
      console.warn('Failed to send journey data:', error);
    }
  }

  // Clear all data (useful for testing)
  public clear(): void {
    this.activeJourneys.clear();
    this.completedJourneys = [];
  }
}

// Create singleton instance
export const journeyTracker = new UserJourneyTracker();

// React hook for journey tracking
export const useJourneyTracking = () => {
  const startJourney = (type: UserJourney, metadata?: Record<string, any>) => {
    return journeyTracker.startJourney(type, metadata);
  };

  const addStep = (
    journeyId: string, 
    stepName: string, 
    metadata?: Record<string, any>, 
    success?: boolean, 
    error?: string
  ) => {
    journeyTracker.addStep(journeyId, stepName, metadata, success, error);
  };

  const completeJourney = (
    journeyId: string, 
    success?: boolean, 
    metadata?: Record<string, any>
  ) => {
    return journeyTracker.completeJourney(journeyId, success, metadata);
  };

  const abandonJourney = (
    journeyId: string, 
    reason?: string, 
    metadata?: Record<string, any>
  ) => {
    journeyTracker.abandonJourney(journeyId, reason, metadata);
  };

  return {
    startJourney,
    addStep,
    completeJourney,
    abandonJourney,
  };
};

// Higher-order component for automatic journey tracking
export const withJourneyTracking = <P extends object>(
  Component: React.ComponentType<P>,
  journeyType: UserJourney,
  autoComplete: boolean = true
) => {
  const WrappedComponent = (props: P) => {
    const [journeyId, setJourneyId] = React.useState<string>('');

    React.useEffect(() => {
      const id = journeyTracker.startJourney(journeyType, {
        component: Component.displayName || Component.name,
      });
      setJourneyId(id);

      return () => {
        if (autoComplete) {
          journeyTracker.completeJourney(id, true);
        } else {
          journeyTracker.abandonJourney(id, 'component_unmount');
        }
      };
    }, []);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withJourneyTracking(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Predefined journey tracking functions for common flows
export const trackLoginJourney = () => {
  const journeyId = journeyTracker.startJourney(UserJourney.LOGIN);
  
  return {
    addCredentialsEntered: () => journeyTracker.addStep(journeyId, 'credentials_entered'),
    addValidationStep: (success: boolean, error?: string) => 
      journeyTracker.addStep(journeyId, 'validation', {}, success, error),
    addAuthenticationStep: (success: boolean, error?: string) => 
      journeyTracker.addStep(journeyId, 'authentication', {}, success, error),
    addRedirectStep: () => journeyTracker.addStep(journeyId, 'redirect'),
    complete: (success: boolean) => journeyTracker.completeJourney(journeyId, success),
  };
};

export const trackProjectCreationJourney = () => {
  const journeyId = journeyTracker.startJourney(UserJourney.PROJECT_CREATE);
  
  return {
    addFormOpened: () => journeyTracker.addStep(journeyId, 'form_opened'),
    addDataEntered: (fieldsCompleted: number) => 
      journeyTracker.addStep(journeyId, 'data_entered', { fieldsCompleted }),
    addValidation: (success: boolean, errors?: string[]) => 
      journeyTracker.addStep(journeyId, 'validation', { errors }, success),
    addSubmission: () => journeyTracker.addStep(journeyId, 'submission'),
    addApiCall: (duration: number, success: boolean) => 
      journeyTracker.addStep(journeyId, 'api_call', { duration }, success),
    complete: (success: boolean, projectId?: string) => 
      journeyTracker.completeJourney(journeyId, success, { projectId }),
  };
};

export const trackDashboardLoadJourney = () => {
  const journeyId = journeyTracker.startJourney(UserJourney.DASHBOARD_LOAD);
  
  return {
    addAuthCheck: () => journeyTracker.addStep(journeyId, 'auth_check'),
    addStatsLoad: (duration: number, success: boolean) => 
      journeyTracker.addStep(journeyId, 'stats_load', { duration }, success),
    addChartsRender: () => journeyTracker.addStep(journeyId, 'charts_render'),
    addTableLoad: (recordCount: number) => 
      journeyTracker.addStep(journeyId, 'table_load', { recordCount }),
    complete: (success: boolean) => journeyTracker.completeJourney(journeyId, success),
  };
};

export default journeyTracker;