import apiClient from './client';

export interface SuggestionResponse {
  suggestion: string;
  category: 'finance' | 'marketing' | 'operations' | 'growth';
  generatedAt: string;
}

export const dashboardApi = {
  getSuggestion: async (): Promise<SuggestionResponse> => {
    const response = await apiClient.get('/dashboard/suggestion');
    return response.data;
  },
};
