import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { SignInPage } from '@/pages/auth/signin';
import { RegisterPage } from '@/pages/auth/register';
import { OnboardingPage } from '@/pages/onboarding';
import { AppLayout } from '@/components/app-layout';
import { ChatPage } from '@/pages/app/chat';
import { VisitsPage } from '@/pages/app/visits';
import { DashboardPage } from '@/pages/app/dashboard';
import { SettingsPage } from '@/pages/app/settings';
import GalleryPage from '@/pages/app/gallery';
import { SimulatorPage } from '@/pages/app/simulator';
import { ProtectedRoute } from '@/components/protected-route';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth-store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function DemoModeHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClientHook = useQueryClient();
  const { setAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const demoParam = searchParams.get('demo');
    const alreadyInDemo = sessionStorage.getItem('demo_mode') === 'true';

    if (demoParam === 'true' && !alreadyInDemo && !isLoading) {
      setIsLoading(true);
      authApi
        .loginDemo()
        .then(() => {
          sessionStorage.setItem('demo_mode', 'true');
          setAuthenticated(true);
          queryClientHook.invalidateQueries({ queryKey: ['me'] });
          navigate('/app', { replace: true });
        })
        .catch((error) => {
          console.error('Demo login failed:', error);
          navigate('/auth/signin', { replace: true });
        })
        .finally(() => setIsLoading(false));
    }
  }, [searchParams, navigate, queryClientHook, setAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Uruchamianie trybu demo...</p>
        </div>
      </div>
    );
  }

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/koly">
        <DemoModeHandler />
        <Routes>
          {/* Public routes */}
          <Route path="/auth/signin" element={<SignInPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />

          {/* Onboarding */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Protected app routes with layout */}
          <Route
            path="/app"
            element={
              <ProtectedRoute requireOnboarding>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="visits" element={<VisitsPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="simulator" element={<SimulatorPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" duration={3000} />
    </QueryClientProvider>
  );
}

export default App;
