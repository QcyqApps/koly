import apiClient from './client';
import type { FixedCost, CreateFixedCostDto, UpdateFixedCostDto } from '@/types/fixed-cost';

export const fixedCostsApi = {
  getAll: async (): Promise<FixedCost[]> => {
    const response = await apiClient.get<FixedCost[]>('/fixed-costs');
    return response.data;
  },

  getTotal: async (): Promise<{ total: number }> => {
    const response = await apiClient.get<{ total: number }>('/fixed-costs/total');
    return response.data;
  },

  getOne: async (id: string): Promise<FixedCost> => {
    const response = await apiClient.get<FixedCost>(`/fixed-costs/${id}`);
    return response.data;
  },

  create: async (data: CreateFixedCostDto): Promise<FixedCost> => {
    const response = await apiClient.post<FixedCost>('/fixed-costs', data);
    return response.data;
  },

  update: async (id: string, data: UpdateFixedCostDto): Promise<FixedCost> => {
    const response = await apiClient.patch<FixedCost>(`/fixed-costs/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/fixed-costs/${id}`);
  },
};
