import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth-store';

// Extend config type to include _retry flag
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Important: send cookies with every request
  withCredentials: true,
});

// Response interceptor - handle 401 and refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;

    // Only try to refresh if we think we're authenticated (have auth state)
    const { isAuthenticated } = useAuthStore.getState();

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login') &&
      isAuthenticated // Only refresh if we think we're logged in
    ) {
      // Mark request as retried to prevent infinite loop
      originalRequest._retry = true;

      // Try to refresh token (cookie is sent automatically)
      try {
        await axios.post('/api/auth/refresh', null, {
          withCredentials: true,
        });

        // Retry original request (new cookies are set automatically)
        return apiClient(originalRequest);
      } catch {
        // Refresh failed - logout and redirect to login
        useAuthStore.getState().logout();
        window.location.href = '/auth/signin';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
