import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import PasswordReset from '../pages/ForgotPassword';
import AccessRequest from '../pages/AccessRequest';
import Home from '../pages/HomePage';
import Report from '../pages/ReportPage';
import MainLayout from '../components/MainLayout';
import { AuthProvider } from '../auth/AuthenticationContent';
import ProtectedRoute from './ProtectedRoute';
import ReportDetail from '../pages/ReportDetail';
import NotFoundPage from '../pages/NotFoundPage';
import SupportPage from '../pages/SupportPage';
import AnalysisPage from '../pages/AnalysisPage';
import RecentFileUploads from '../pages/RecentFileUploads';

const AppRouter: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/password-reset" element={<PasswordReset />} />
          <Route path="/access-request" element={<AccessRequest />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="home" element={<Home />} />
            <Route path="all-uploads" element={ <RecentFileUploads/>}/> 
            <Route path="recent-upload" element={<Report />} />
            <Route path="report/:uploadId" element={<ReportDetail />} />
            <Route path="report/:uploadId/:contentType" element={<ReportDetail />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="analysis" element={<AnalysisPage/>}/>
          </Route>

          {/* 404 Route - This will catch all unmatched routes */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default AppRouter;
