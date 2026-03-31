export interface FixedCost {
  id: string;
  userId: string;
  name: string;
  amount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFixedCostDto {
  name: string;
  amount: number;
  isActive?: boolean;
}

export interface UpdateFixedCostDto {
  name?: string;
  amount?: number;
  isActive?: boolean;
}
