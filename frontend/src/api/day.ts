import apiClient from './client';
import type { DailySnapshot } from '@/types/visit';

interface CloseDayResponse extends DailySnapshot {
  breakdown: {
    revenue: number;
    materialCosts: number;
    fixedCostsDaily: number;
    zusDaily: number;
    estimatedTax: number;
    netProfit: number;
  };
}

interface MonthSummary {
  year: number;
  month: number;
  daysWorked: number;
  revenue: number;
  materialCosts: number;
  fixedCostsDaily: number;
  estimatedTax: number;
  netProfit: number;
  visitCount: number;
  noShowCount: number;
  noShowCost: number;
  snapshots: DailySnapshot[];
}

export const dayApi = {
  closeDay: async (date: string): Promise<CloseDayResponse> => {
    const response = await apiClient.post<CloseDayResponse>('/day/close', { date });
    return response.data;
  },

  reopenDay: async (date: string): Promise<{ success: boolean; date: string }> => {
    const response = await apiClient.post<{ success: boolean; date: string }>('/day/reopen', { date });
    return response.data;
  },

  getSnapshot: async (date: string): Promise<DailySnapshot | null> => {
    const response = await apiClient.get<DailySnapshot>(`/day/snapshot/${date}`);
    return response.data;
  },

  getSnapshots: async (startDate: string, endDate: string): Promise<DailySnapshot[]> => {
    const response = await apiClient.get<DailySnapshot[]>('/day/snapshots', {
      params: { start: startDate, end: endDate },
    });
    return response.data;
  },

  getMonthSummary: async (year: number, month: number): Promise<MonthSummary> => {
    const response = await apiClient.get<MonthSummary>(`/day/month/${year}/${month}`);
    return response.data;
  },

  getMonthlyTrend: async (months: number = 6): Promise<MonthlyTrendData[]> => {
    const response = await apiClient.get<MonthlyTrendData[]>('/day/monthly-trend', {
      params: { months },
    });
    return response.data;
  },

  getGoalProgress: async (): Promise<GoalProgress | null> => {
    const response = await apiClient.get<GoalProgress | null>('/day/goal-progress');
    return response.data;
  },

  getBenchmark: async (): Promise<BenchmarkData> => {
    const response = await apiClient.get<BenchmarkData>('/day/benchmark');
    return response.data;
  },

  setGoal: async (goal: number): Promise<{ success: boolean; goal: number }> => {
    const response = await apiClient.post<{ success: boolean; goal: number }>('/day/goal', { goal });
    return response.data;
  },
};

export interface MonthlyTrendData {
  year: number;
  month: number;
  netProfit: number;
  revenue: number;
  visits: number;
}

export interface GoalProgress {
  goal: number;
  current: number;
  remaining: number;
  daysLeft: number;
  dailyNeeded: number;
  projectedTotal: number;
  onTrack: boolean;
  percentComplete: number;
}

export interface BenchmarkData {
  hasData: boolean;
  industry: string;
  metrics: Array<{
    name: string;
    label: string;
    description?: string;
    user: number;
    industry: number;
    unit: string;
    better: boolean;
    lowerIsBetter: boolean;
  }>;
}
