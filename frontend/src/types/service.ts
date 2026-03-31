export interface ServiceCategory {
  id: string;
  userId: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  services?: Service[];
}

export interface Service {
  id: string;
  userId: string;
  categoryId: string | null;
  name: string;
  price: number;
  durationMinutes: number;
  materialCost: number;
  isActive: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  category?: ServiceCategory | null;
}

export interface CreateServiceDto {
  name: string;
  price: number;
  durationMinutes: number;
  materialCost?: number;
  isActive?: boolean;
  categoryId?: string | null;
}

export interface UpdateServiceDto {
  name?: string;
  price?: number;
  durationMinutes?: number;
  materialCost?: number;
  isActive?: boolean;
  categoryId?: string | null;
}

export interface CreateCategoryDto {
  name: string;
  order?: number;
}

export interface UpdateCategoryDto {
  name?: string;
  order?: number;
}
