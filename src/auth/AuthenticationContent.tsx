import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { isTokenExpired, apiCall, refreshAuthToken } from '../api/api';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  /** Server-backed platform admin flag. null while loading / unknown. */
  isAdmin: boolean | null;
  adminLoading: boolean;
  login: (accessToken: string, refreshToken: string, remember: boolean) => void;
  logout: () => void;
  refreshAdminStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken')
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!token && !isTokenExpired(token));
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState<boolean>(false);

  const logout = useCallback(() => {
    localStorage.removeItem('jwtToken');
    sessionStorage.removeItem('jwtToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('refreshToken');
    setToken(null);
    setRefreshToken(null);
    setIsAuthenticated(false);
    setIsAdmin(null);
    setAdminLoading(false);

    window.dispatchEvent(new Event('auth-change'));
  }, []);

  const refreshAdminStatus = useCallback(async () => {
    const currentToken = localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken');
    if (!currentToken || isTokenExpired(currentToken)) {
      setIsAdmin(false);
      setAdminLoading(false);
      return;
    }

    setAdminLoading(true);
    try {
      const res = await apiCall({ endpoint: '/auth/users/me', jwtToken: true });
      setIsAdmin(Boolean(res?.message?.is_admin));
    } catch {
      // Non-admin (403) or failed lookup — treat as not admin for UI gating.
      setIsAdmin(false);
    } finally {
      setAdminLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkToken = async () => {
      const currentToken = localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken');
      const currentRefreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
      
      setToken(currentToken);
      setRefreshToken(currentRefreshToken);

      if (currentToken && isTokenExpired(currentToken)) {
        if (currentRefreshToken) {
          const refreshed = await refreshAuthToken();
          if (refreshed) {
            const newToken = localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken');
            setToken(newToken);
            setIsAuthenticated(!!newToken);
            await refreshAdminStatus();
            return;
          }
        }
        logout();
      } else if (currentToken) {
        setIsAuthenticated(true);
        await refreshAdminStatus();
      } else {
        setIsAuthenticated(false);
        setIsAdmin(null);
      }
    };

    checkToken();

    window.addEventListener('auth-change', checkToken);
    window.addEventListener('storage', checkToken);

    // Check every minute
    const interval = setInterval(checkToken, 60000);
    return () => {
      window.removeEventListener('auth-change', checkToken);
      window.removeEventListener('storage', checkToken);
      clearInterval(interval);
    };
  }, [logout, refreshAdminStatus]);

  const login = (accessToken: string, refreshTokenValue: string, remember: boolean) => {
    const cookieConsent = localStorage.getItem("cookieConsent");
    // Prefer sessionStorage; only persist to localStorage when Remember-me + consent.
    const useSessionStorage = !(remember && cookieConsent === "accepted");
    
    const storage = useSessionStorage ? sessionStorage : localStorage;
    storage.setItem("jwtToken", accessToken);
    storage.setItem("refreshToken", refreshTokenValue);
    
    setToken(accessToken);
    setRefreshToken(refreshTokenValue);
    setIsAuthenticated(true);

    window.dispatchEvent(new Event('auth-change'));
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      token,
      refreshToken,
      isAdmin,
      adminLoading,
      login,
      logout,
      refreshAdminStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
