/**
 * Secure error handling utilities to prevent information disclosure
 */

export interface SecureError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Generic error messages for user display
 */
const GENERIC_MESSAGES = {
  NETWORK_ERROR: 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.',
  AUTHENTICATION_ERROR: 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.',
  AUTHORIZATION_ERROR: 'Bu işlem için yetkiniz bulunmuyor.',
  VALIDATION_ERROR: 'Girdiğiniz bilgilerde hata var. Lütfen kontrol edin.',
  SERVER_ERROR: 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
  NOT_FOUND_ERROR: 'Aranan kaynak bulunamadı.',
  RATE_LIMIT_ERROR: 'Çok fazla istek gönderildi. Lütfen bekleyin.',
  GENERIC_ERROR: 'Bir hata oluştu. Lütfen tekrar deneyin.',
} as const;

/**
 * Sanitize error messages for user display
 */
export function sanitizeErrorMessage(error: any): string {
  if (!error) return GENERIC_MESSAGES.GENERIC_ERROR;

  // If it's already a SecureError, return the message
  if (typeof error === 'object' && error.message && typeof error.message === 'string') {
    return error.message;
  }

  // Network errors
  if (error.name === 'TypeError' && error.message?.includes('fetch')) {
    return GENERIC_MESSAGES.NETWORK_ERROR;
  }

  // HTTP status based errors
  if (error.status || error.response?.status) {
    const status = error.status || error.response?.status;
    
    switch (status) {
      case 401:
        return GENERIC_MESSAGES.AUTHENTICATION_ERROR;
      case 403:
        return GENERIC_MESSAGES.AUTHORIZATION_ERROR;
      case 404:
        return GENERIC_MESSAGES.NOT_FOUND_ERROR;
      case 422:
        return GENERIC_MESSAGES.VALIDATION_ERROR;
      case 429:
        return GENERIC_MESSAGES.RATE_LIMIT_ERROR;
      case 500:
      case 502:
      case 503:
      case 504:
        return GENERIC_MESSAGES.SERVER_ERROR;
      default:
        return GENERIC_MESSAGES.GENERIC_ERROR;
    }
  }

  // Don't expose internal error details
  return GENERIC_MESSAGES.GENERIC_ERROR;
}

/**
 * Handle API response errors securely
 */
export async function handleApiResponse(response: Response): Promise<any> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // Only use server error message if it's a known safe message
    const safeServerMessage = errorData.error || errorData.message;
    const isSafeMessage = safeServerMessage && 
                          typeof safeServerMessage === 'string' && 
                          safeServerMessage.length < 200 && 
                          !safeServerMessage.includes('Error:') &&
                          !safeServerMessage.includes('Exception:') &&
                          !safeServerMessage.includes('Stack trace:');

    throw {
      status: response.status,
      message: isSafeMessage ? safeServerMessage : sanitizeErrorMessage({ status: response.status }),
      code: errorData.code,
    };
  }

  return response.json();
}

/**
 * Log errors securely (client-side logging)
 */
export function logError(error: any, context?: string): void {
  // In production, only log minimal information
  if (process.env.NODE_ENV === 'production') {
    // Log to error tracking service (e.g., Sentry) with sanitized data
    const sanitizedError = {
      message: 'Client error occurred',
      context,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };
    
    // Here you would send to your error tracking service
    console.error('Error logged:', sanitizedError);
  } else {
    // In development, log full error for debugging
    console.error('Development error:', error, context);
  }
}

/**
 * Create a secure error response
 */
export function createSecureError(
  message: string, 
  status: number = 500, 
  code?: string
): SecureError {
  return {
    message: sanitizeErrorMessage({ message, status }),
    status,
    code,
  };
}

/**
 * Async error boundary handler
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, fn.name);
      throw createSecureError(sanitizeErrorMessage(error));
    }
  };
}