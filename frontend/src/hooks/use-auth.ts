import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth-store';
import type { LoginCredentials, RegisterCredentials } from '@/types/user';

export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setUser, setAuthenticated, logout: storeLogout, isAuthenticated, user, isHydrated } = useAuthStore();

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    // Only fetch when hydrated AND we think we're authenticated (have stored auth state)
    // This prevents loops after logout
    enabled: isHydrated && isAuthenticated,
    retry: 1, // Retry once for transient errors
    staleTime: 30 * 1000, // 30 seconds
  });

  // Update user in store when fetched - in useEffect to avoid side effects during render
  useEffect(() => {
    if (meQuery.data && (!user || user.id !== meQuery.data.id)) {
      setUser(meQuery.data);
    }
  }, [meQuery.data, user, setUser]);

  // Note: We do NOT logout on meQuery.isError here - the interceptor handles 401 errors
  // and will logout only after refresh token fails

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: async () => {
      // Cookies are set by the server, just fetch user
      setAuthenticated(true);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      navigate('/app');
    },
  });

  const registerMutation = useMutation({
    mutationFn: (credentials: RegisterCredentials) => authApi.register(credentials),
    onSuccess: async () => {
      // Cookies are set by the server, just fetch user
      setAuthenticated(true);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      navigate('/onboarding');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      storeLogout();
      queryClient.clear();
      navigate('/auth/signin');
    },
    onError: () => {
      storeLogout();
      queryClient.clear();
      navigate('/auth/signin');
    },
  });

  const refreshUser = () => {
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  return {
    user: meQuery.data ?? user,
    isAuthenticated,
    isLoading: !isHydrated || meQuery.isLoading,
    isHydrated,
    login: loginMutation.mutate,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    registerError: registerMutation.error,
    isRegistering: registerMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    refreshUser,
  };
}
