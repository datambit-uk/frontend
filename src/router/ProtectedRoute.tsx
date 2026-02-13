import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth} from '../auth/AuthenticationContent';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

export default React.memo(ProtectedRoute);