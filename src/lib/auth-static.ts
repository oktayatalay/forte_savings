export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface AuthTokens {
  token: string;
  refresh_token: string;
  user: User;
}

// Client-side auth manager optimized for static export + PHP backend
export class AuthManager {
  private static readonly TOKEN_NAME = 'auth_token';
  private static readonly REFRESH_TOKEN_NAME = 'refresh_token';
  private static readonly USER_DATA_NAME = 'user_data';

  // Store tokens in localStorage (static export compatible)
  static async setTokens(tokens: AuthTokens): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.TOKEN_NAME, tokens.token);
      localStorage.setItem(this.REFRESH_TOKEN_NAME, tokens.refresh_token);
      localStorage.setItem(this.USER_DATA_NAME, JSON.stringify(tokens.user));
    } catch (error) {
      console.error('Failed to set tokens:', error);
      throw error;
    }
  }

  // Clear all auth tokens from localStorage
  static async clearTokens(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.TOKEN_NAME);
      localStorage.removeItem(this.REFRESH_TOKEN_NAME);
      localStorage.removeItem(this.USER_DATA_NAME);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
      throw error;
    }
  }

  // Get stored token
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_NAME);
  }

  // Check if user is authenticated by verifying token with PHP backend
  static async isAuthenticated(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/auth/middleware.php', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get user data from localStorage
  static async getUserData(): Promise<User | null> {
    if (typeof window === 'undefined') return null;

    try {
      const userData = localStorage.getItem(this.USER_DATA_NAME);
      if (userData) {
        return JSON.parse(userData);
      }
      return null;
    } catch {
      return null;
    }
  }

  // Make authenticated API request
  static async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
      ...options,
      headers,
    });
  }
}

// Client-side auth hook
export function useAuth() {
  return {
    isAuthenticated: AuthManager.isAuthenticated,
    getUserData: AuthManager.getUserData,
    clearTokens: AuthManager.clearTokens,
    getToken: AuthManager.getToken,
    authenticatedFetch: AuthManager.authenticatedFetch,
  };
}