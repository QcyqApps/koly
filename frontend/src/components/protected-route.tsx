import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({ children, requireOnboarding = false }: ProtectedRouteProps) {
  const location = useLocation();
  const { user, isLoading, isAuthenticated, isHydrated } = useAuth();

  // Wait for hydration from localStorage
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  // Show loading while fetching user data
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  // No user data available (not authenticated) - redirect to login
  // Only redirect when we're done loading and truly have no user
  if (!user && !isAuthenticated) {
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }

  // Redirect to onboarding if not completed
  if (requireOnboarding && user && !user.onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Redirect away from onboarding if already completed
  if (location.pathname === '/onboarding' && user?.onboardingCompleted) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
