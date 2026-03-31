import type { Service } from './service';

export interface Visit {
  id: string;
  userId: string;
  serviceId: string;
  visitDate: string;
  status: 'completed' | 'no_show' | 'cancelled';
  actualPrice: number | null;
  notes: string | null;
  createdAt: string;
  service: Service;
  images?: Array<{
    id: string;
    thumbnailUrl: string;
  }>;
}

export interface CreateVisitDto {
  serviceId: string;
  visitDate: string;
  status?: 'completed' | 'no_show' | 'cancelled';
  actualPrice?: number;
  notes?: string;
}

export interface UpdateVisitDto {
  status?: 'completed' | 'no_show' | 'cancelled';
  actualPrice?: number;
  notes?: string;
}

export interface DaySummary {
  date: string;
  visitCount: number;
  noShowCount: number;
  revenue: number;
  materialCosts: number;
  noShowCost: number;
  visits: Visit[];
}

export interface DailySnapshot {
  id: string;
  userId: string;
  snapshotDate: string;
  revenue: number;
  materialCosts: number;
  fixedCostsDaily: number;
  estimatedTax: number;
  netProfit: number;
  visitCount: number;
  noShowCount: number;
  noShowCost: number;
  servicesRanking: Array<{
    name: string;
    count: number;
    revenue: number;
    profit: number;
  }> | null;
  aiSuggestions: unknown | null;
  aiSummary: string | null;
  createdAt: string;
}
