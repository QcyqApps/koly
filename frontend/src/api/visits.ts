import apiClient from './client';
import type { Visit, CreateVisitDto, UpdateVisitDto, DaySummary } from '@/types/visit';

export const visitsApi = {
  getAll: async (): Promise<Visit[]> => {
    const response = await apiClient.get<Visit[]>('/visits');
    return response.data;
  },

  getByDate: async (date: string): Promise<Visit[]> => {
    const response = await apiClient.get<Visit[]>(`/visits/date/${date}`);
    return response.data;
  },

  getByDateRange: async (startDate: string, endDate: string): Promise<Visit[]> => {
    const response = await apiClient.get<Visit[]>('/visits/range', {
      params: { start: startDate, end: endDate },
    });
    return response.data;
  },

  getDaySummary: async (date: string): Promise<DaySummary> => {
    const response = await apiClient.get<DaySummary>(`/visits/summary/${date}`);
    return response.data;
  },

  getOne: async (id: string): Promise<Visit> => {
    const response = await apiClient.get<Visit>(`/visits/${id}`);
    return response.data;
  },

  create: async (data: CreateVisitDto): Promise<Visit> => {
    const response = await apiClient.post<Visit>('/visits', data);
    return response.data;
  },

  update: async (id: string, data: UpdateVisitDto): Promise<Visit> => {
    const response = await apiClient.patch<Visit>(`/visits/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/visits/${id}`);
  },
};
