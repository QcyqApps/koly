export interface User {
  id: string;
  email: string;
  name: string | null;
  businessName: string | null;
  industry: string | null;
  city: string | null;
  taxForm: string;
  taxRate: number;
  zusMonthly: number;
  subscriptionStatus: string;
  trialEndsAt: string;
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}
