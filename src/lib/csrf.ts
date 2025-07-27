import { randomBytes, createHash } from 'crypto';

/**
 * CSRF protection utilities
 */
export class CSRFProtection {
  private static readonly TOKEN_NAME = 'csrf_token';
  private static readonly HEADER_NAME = 'X-CSRF-Token';
  
  /**
   * Generate a secure CSRF token
   */
  static generateToken(): string {
    return randomBytes(32).toString('hex');
  }
  
  /**
   * Create CSRF token hash for verification
   */
  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  
  /**
   * Verify CSRF token
   */
  static verifyToken(token: string, hashedToken: string): boolean {
    if (!token || !hashedToken) return false;
    return this.hashToken(token) === hashedToken;
  }
  
  /**
   * Get CSRF token from client-side (for forms)
   */
  static getTokenFromDocument(): string | null {
    if (typeof window === 'undefined') return null;
    
    const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
    return metaTag?.content || null;
  }
  
  /**
   * Add CSRF token to request headers
   */
  static addTokenToHeaders(headers: HeadersInit = {}): HeadersInit {
    const token = this.getTokenFromDocument();
    if (!token) return headers;
    
    return {
      ...headers,
      [this.HEADER_NAME]: token,
    };
  }
}

/**
 * Secure fetch wrapper with CSRF protection and error handling
 */
export async function secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Add CSRF token to headers for state-changing requests
  const method = options.method?.toUpperCase() || 'GET';
  const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  
  if (isStateChanging) {
    options.headers = CSRFProtection.addTokenToHeaders(options.headers);
  }
  
  // Ensure credentials are included for auth
  options.credentials = 'include';
  
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    // Handle network errors securely
    throw {
      status: 0,
      message: 'Bağlantı hatası oluştu. Lütfen internet bağlantınızı kontrol edin.',
      originalError: error,
    };
  }
}