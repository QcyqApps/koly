import type { Visit } from './visit';

export interface GalleryImage {
  id: string;
  userId: string;
  visitId: string | null;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  thumbnailPath: string | null;
  description: string | null;
  isPortfolio: boolean;
  createdAt: string;
  updatedAt: string;
  imageUrl: string;
  thumbnailUrl: string;
  visit?: Visit | null;
  captions?: GeneratedCaption[];
}

export interface GeneratedCaption {
  id: string;
  userId: string;
  imageId: string;
  content: string;
  platform: string;
  createdAt: string;
}

export interface CreateGalleryImageDto {
  description?: string;
  visitId?: string;
  isPortfolio?: boolean;
}

export interface UpdateGalleryImageDto {
  description?: string;
  isPortfolio?: boolean;
}

export interface GalleryFilter {
  isPortfolio?: boolean;
  visitId?: string;
}
