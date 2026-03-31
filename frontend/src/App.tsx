import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './store/authStore';
import { authService } from './services/auth.service';

// Layout
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ScoutPage } from './pages/ScoutPage';
import { JobDetailPage } from './pages/JobDetailPage';

function PublicRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const authBootstrapped = useAuthStore((s) => s.authBootstrapped);

  if (!authBootstrapped) {
    return null;
  }

  if (accessToken) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function AuthBootstrap() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const authBootstrapped = useAuthStore((s) => s.authBootstrapped);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setAuthBootstrapped = useAuthStore((s) => s.setAuthBootstrapped);

  useEffect(() => {
    if (authBootstrapped) return;

    const bootstrap = async () => {
      if (!accessToken) {
        setAuthBootstrapped(true);
        return;
      }

      try {
        if (!user) {
          const me = await authService.getMe();
          setAuth(me, accessToken);
        }
      } catch {
        clearAuth();
      } finally {
        setAuthBootstrapped(true);
      }
    };

    void bootstrap();
  }, [accessToken, authBootstrapped, clearAuth, setAuth, setAuthBootstrapped, user]);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthBootstrap />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

          {/* Onboarding — protected but no sidebar */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Authenticated routes with layout */}
            <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/jobs/:jobId" element={<JobDetailPage />} />
            <Route path="/scout" element={<ScoutPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
