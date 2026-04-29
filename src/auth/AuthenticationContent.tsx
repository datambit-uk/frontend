import React, { createContext, useState, useEffect, useContext } from 'react';
import { isTokenExpired } from '../api/api';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  login: (accessToken: string, refreshToken: string, remember: boolean) => void;
  logout: () => void;
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


  useEffect(() => {
    const checkToken = () => {
      const currentToken = localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken');
      const currentRefreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
      
      setToken(currentToken);
      setRefreshToken(currentRefreshToken);

      if (currentToken && isTokenExpired(currentToken)) {
        logout();
      } else if (currentToken) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
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
  }, []);

  const login = (accessToken: string, refreshToken: string, remember: boolean) => {
    const cookieConsent = localStorage.getItem("cookieConsent");
    const useSessionStorage = !(remember && cookieConsent === "accepted");
    
    const storage = useSessionStorage ? sessionStorage : localStorage;
    storage.setItem("jwtToken", accessToken);
    storage.setItem("refreshToken", refreshToken);
    
    setToken(accessToken);
    setRefreshToken(refreshToken);
    setIsAuthenticated(true);

    window.dispatchEvent(new Event('auth-change'));
  };

  const logout = () => {
    localStorage.removeItem('jwtToken');
    sessionStorage.removeItem('jwtToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('refreshToken');
    setToken(null);
    setRefreshToken(null);
    setIsAuthenticated(false);

    window.dispatchEvent(new Event('auth-change'));
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, refreshToken, login, logout }}>
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