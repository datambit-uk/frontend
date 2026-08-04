import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthenticationContent';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Gates privileged pages using the server-backed isAdmin flag from AuthProvider.
 * Do not decode JWT role claims here — they are untrusted for authorization.
 */
const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, adminLoading } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminLoading || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-gray-400 text-sm">
        Checking permissions…
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

export default React.memo(AdminRoute);
