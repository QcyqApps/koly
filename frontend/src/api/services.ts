import apiClient from './client';
import type { Service, CreateServiceDto, UpdateServiceDto } from '@/types/service';

export const servicesApi = {
  getAll: async (): Promise<Service[]> => {
    const response = await apiClient.get<Service[]>('/services');
    return response.data;
  },

  getActive: async (): Promise<Service[]> => {
    const response = await apiClient.get<Service[]>('/services/active');
    return response.data;
  },

  getOne: async (id: string): Promise<Service> => {
    const response = await apiClient.get<Service>(`/services/${id}`);
    return response.data;
  },

  create: async (data: CreateServiceDto): Promise<Service> => {
    const response = await apiClient.post<Service>('/services', data);
    return response.data;
  },

  update: async (id: string, data: UpdateServiceDto): Promise<Service> => {
    const response = await apiClient.patch<Service>(`/services/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/services/${id}`);
  },

  toggleFavorite: async (id: string): Promise<Service> => {
    const response = await apiClient.patch<Service>(`/services/${id}/favorite`);
    return response.data;
  },
};
