import apiClient from './client';
import type { ChatMessage, SendMessageResponse, ChatSession } from '@/types/chat';

export const chatApi = {
  sendMessage: async (message: string, sessionId?: string): Promise<SendMessageResponse> => {
    const response = await apiClient.post<SendMessageResponse>('/chat/send', {
      message,
      sessionId,
    });
    return response.data;
  },

  getHistory: async (sessionId: string): Promise<ChatMessage[]> => {
    const response = await apiClient.get<ChatMessage[]>(`/chat/history/${sessionId}`);
    return response.data;
  },

  getSessions: async (): Promise<ChatSession[]> => {
    const response = await apiClient.get<ChatSession[]>('/chat/sessions');
    return response.data;
  },
};
