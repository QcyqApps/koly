export interface ChatMessage {
  id: string;
  userId: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface SendMessageResponse {
  sessionId: string;
  message: ChatMessage;
}

export interface ChatSession {
  sessionId: string;
  lastActivity: string;
  messageCount: number;
  preview: string;
}
