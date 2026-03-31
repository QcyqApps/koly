import apiClient from './client';
import type { User } from '@/types/user';

interface UpdateUserDto {
  name?: string;
  businessName?: string;
  industry?: string;
  city?: string;
  taxForm?: string;
  taxRate?: number;
  zusMonthly?: number;
  onboardingCompleted?: boolean;
}

export const usersApi = {
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  },

  updateMe: async (data: UpdateUserDto): Promise<User> => {
    const response = await apiClient.patch<User>('/users/me', data);
    return response.data;
  },
};
