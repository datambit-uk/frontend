import React, { createContext, useState, useEffect, useContext } from 'react';

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!token);


  useEffect(() => {
    if (token) {
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem('jwtToken');
      sessionStorage.removeItem('jwtToken');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('refreshToken');
      setIsAuthenticated(false);
    }
  }, [token]);

  const login = (accessToken: string, refreshToken: string, remember: boolean) => {
    const cookieConsent = localStorage.getItem("cookieConsent");
    
    if (remember && cookieConsent === "accepted") {
      localStorage.setItem("jwtToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
    } else {
      sessionStorage.setItem("jwtToken", accessToken);
      sessionStorage.setItem("refreshToken", refreshToken);
    }
    
    setToken(accessToken);
    setRefreshToken(refreshToken);
  };

  const logout = () => {
    localStorage.removeItem('jwtToken');
    sessionStorage.removeItem('jwtToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('refreshToken');
    setToken(null);
    setRefreshToken(null);
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