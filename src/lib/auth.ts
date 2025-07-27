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

// Client-side auth manager for static export compatibility
export class AuthManager {
  private static readonly TOKEN_NAME = 'auth_token';
  private static readonly REFRESH_TOKEN_NAME = 'refresh_token';
  private static readonly USER_DATA_NAME = 'user_data';
  
  // Store tokens securely via API endpoint
  static async setTokens(tokens: AuthTokens): Promise<void> {
    try {
      await fetch('/api/auth/set-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokens),
        credentials: 'include',
      });
    } catch (error) {
      console.error('Failed to set tokens:', error);
      throw error;
    }
  }
  
  // Clear all auth tokens via API endpoint
  static async clearTokens(): Promise<void> {
    try {
      await fetch('/api/auth/clear-tokens', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Failed to clear tokens:', error);
      throw error;
    }
  }
  
  // Check if user is authenticated (client-side)
  static async isAuthenticated(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  // Get user data (client-side)
  static async getUserData(): Promise<User | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      const response = await fetch('/api/auth/user', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.user;
      }
      return null;
    } catch {
      return null;
    }
  }
}

// Client-side auth hook
export function useAuth() {
  return {
    isAuthenticated: AuthManager.isAuthenticated,
    getUserData: AuthManager.getUserData,
    clearTokens: AuthManager.clearTokens,
  };
}