import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import useAuth from './hooks/useAuth.js';
import useAppStore from './store/appStore.js';
import { getUnreadCount } from './api/notifications.js';

// Layout
import AppLayout from './components/layout/AppLayout.jsx';
import ToastContainer from './components/ui/Toast.jsx';

// Pages
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AttendancePage from './pages/AttendancePage.jsx';
import LeavePage from './pages/LeavePage.jsx';
import ApplyLeavePage from './pages/ApplyLeavePage.jsx';
import PayrollPage from './pages/PayrollPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import ProjectDetailPage from './pages/ProjectDetailPage.jsx';
import ApprovalsPage from './pages/ApprovalsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import TeamPage from './pages/TeamPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import DocumentsPage from './pages/DocumentsPage.jsx';
import OrgSettingsPage from './pages/OrgSettingsPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';

// Protected route wrapper
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

// Notification count syncer
const NotificationSync = () => {
  const { isAuthenticated } = useAuth();
  const setNotificationCount = useAppStore(s => s.setNotificationCount);

  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: 30000, // every 30 seconds
  });

  useEffect(() => {
    if (data?.data?.count !== undefined) {
      setNotificationCount(data.data.count);
    }
  }, [data, setNotificationCount]);

  return null;
};

const App = () => {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <NotificationSync />
      <ToastContainer />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/leave" element={<LeavePage />} />
          <Route path="/leave/apply" element={<ApplyLeavePage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route
            path="/approvals"
            element={
              <ProtectedRoute roles={['MANAGER', 'HR', 'ADMIN']}>
                <ApprovalsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/team"
            element={
              <ProtectedRoute roles={['MANAGER', 'HR', 'ADMIN']}>
                <TeamPage />
              </ProtectedRoute>
            }
          />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route
            path="/org-settings"
            element={
              <ProtectedRoute roles={['ADMIN', 'HR']}>
                <OrgSettingsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Onboarding (authenticated but no layout) */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
};

export default App;
