import apiClient from './client';
import type { LoginCredentials, RegisterCredentials, User } from '@/types/user';

interface AuthResponse {
  message: string;
}

export const authApi = {
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', credentials);
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  refresh: async (): Promise<AuthResponse> => {
    // Cookies are sent automatically with withCredentials: true
    const response = await apiClient.post<AuthResponse>('/auth/refresh');
    return response.data;
  },

  loginDemo: async (): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/demo');
    return response.data;
  },
};
