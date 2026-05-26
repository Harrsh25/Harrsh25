import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import useAuth from './hooks/useAuth';
import useAppStore from './store/appStore';
import { getUnreadCount } from './api/notifications';
import ErrorBoundary from './components/ErrorBoundary';

// Layout
import AppLayout from './components/layout/AppLayout';
import ToastContainer from './components/ui/Toast';
import OfflineIndicator from './components/ui/OfflineIndicator';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AttendancePage from './pages/AttendancePage';
import LeavePage from './pages/LeavePage';
import ApplyLeavePage from './pages/ApplyLeavePage';
import PayrollPage from './pages/PayrollPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ApprovalsPage from './pages/ApprovalsPage';
import ProfilePage from './pages/ProfilePage';
import TeamPage from './pages/TeamPage';
import NotificationsPage from './pages/NotificationsPage';
import NotFoundPage from './pages/NotFoundPage';
import DocumentsPage from './pages/DocumentsPage';
import OrgSettingsPage from './pages/OrgSettingsPage';
import OnboardingPage from './pages/OnboardingPage';
import ReportsPage from './pages/ReportsPage';

// Protected route wrapper
interface ProtectedRouteProps {
  children: ReactNode;
  roles?: string[];
}
const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role || '')) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

// Notification count syncer + SSE listener
const NotificationSync = () => {
  const { isAuthenticated, accessToken } = useAuth();
  const setNotificationCount = useAppStore((s) => s.setNotificationCount);
  const addToast = useAppStore((s) => s.addToast);

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

  // SSE connection for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const es = new EventSource(`${apiBase}/api/v1/sse/events?token=${accessToken}`);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'notification') {
          addToast(data.message || data.notification?.message || 'New notification', 'info');
          setNotificationCount((prev) => (prev || 0) + 1);
        }
      } catch (_e) {
        /* ignore malformed SSE payloads */
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [isAuthenticated, accessToken, addToast, setNotificationCount]);

  return null;
};

const App = () => {
  const { isAuthenticated } = useAuth();

  return (
    <ErrorBoundary>
      <NotificationSync />
      <ToastContainer />
      <OfflineIndicator />
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />

        {/* Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
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
          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={['MANAGER', 'HR', 'ADMIN']}>
                <ReportsPage />
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
    </ErrorBoundary>
  );
};

export default App;
