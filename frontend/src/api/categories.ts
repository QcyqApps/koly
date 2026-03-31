import apiClient from './client';
import type { ServiceCategory, CreateCategoryDto, UpdateCategoryDto } from '@/types/service';

export const categoriesApi = {
  getAll: async (): Promise<ServiceCategory[]> => {
    const response = await apiClient.get<ServiceCategory[]>('/categories');
    return response.data;
  },

  getOne: async (id: string): Promise<ServiceCategory> => {
    const response = await apiClient.get<ServiceCategory>(`/categories/${id}`);
    return response.data;
  },

  create: async (data: CreateCategoryDto): Promise<ServiceCategory> => {
    const response = await apiClient.post<ServiceCategory>('/categories', data);
    return response.data;
  },

  update: async (id: string, data: UpdateCategoryDto): Promise<ServiceCategory> => {
    const response = await apiClient.patch<ServiceCategory>(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },

  reorder: async (categoryIds: string[]): Promise<ServiceCategory[]> => {
    const response = await apiClient.patch<ServiceCategory[]>('/categories/reorder', { categoryIds });
    return response.data;
  },
};
