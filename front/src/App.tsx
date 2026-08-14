import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserRole } from './types';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import Dashboard from './pages/Dashboard/Dashboard';
import SuperAdminDashboard from './pages/Dashboard/SuperAdminDashboard';
import ProfilePage from './pages/Profile/ProfilePage';
import './App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-screen">Chargement...</div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const RoleRoute: React.FC<{ children: React.ReactNode; roles: UserRole[] }> = ({ children, roles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-screen">Chargement...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  const storedUser = localStorage.getItem('user');
  const userData = user || (storedUser ? JSON.parse(storedUser) : null);
  if (!userData || !roles.includes(userData.role)) return <Navigate to="/dashboard" />;
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-screen">Chargement...</div>;
  return isAuthenticated ? <Navigate to="/dashboard" /> : <>{children}</>;
};

const DashboardRouter: React.FC<{ initialTab?: string }> = ({ initialTab }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-screen">Chargement...</div>;

  const storedUser = localStorage.getItem('user');
  const userData = user || (storedUser ? JSON.parse(storedUser) : null);

  if (userData?.role === UserRole.SUPER_ADMIN) {
    return <SuperAdminDashboard initialTab={initialTab} />;
  }

  return <Dashboard initialTab={initialTab} />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route
            path="/calendar"
            element={
              <RoleRoute roles={[UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN]}>
                <DashboardRouter initialTab="calendar" />
              </RoleRoute>
            }
          />
          <Route
            path="/my-tasks"
            element={
              <RoleRoute roles={[UserRole.AGENT_QUALITE]}>
                <Dashboard initialTab="my-tasks" />
              </RoleRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
