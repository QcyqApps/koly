import apiClient from './client';
import type {
  GalleryImage,
  GeneratedCaption,
  CreateGalleryImageDto,
  UpdateGalleryImageDto,
  GalleryFilter,
} from '@/types/gallery';

export const galleryApi = {
  upload: async (
    file: File,
    dto?: CreateGalleryImageDto,
  ): Promise<GalleryImage> => {
    const formData = new FormData();
    formData.append('file', file);

    if (dto?.description) {
      formData.append('description', dto.description);
    }
    if (dto?.visitId) {
      formData.append('visitId', dto.visitId);
    }
    if (dto?.isPortfolio !== undefined) {
      formData.append('isPortfolio', String(dto.isPortfolio));
    }

    const response = await apiClient.post<GalleryImage>(
      '/gallery/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data;
  },

  getAll: async (filter?: GalleryFilter): Promise<GalleryImage[]> => {
    const params = new URLSearchParams();
    if (filter?.isPortfolio !== undefined) {
      params.append('isPortfolio', String(filter.isPortfolio));
    }
    if (filter?.visitId) {
      params.append('visitId', filter.visitId);
    }

    const response = await apiClient.get<GalleryImage[]>('/gallery', {
      params,
    });
    return response.data;
  },

  getOne: async (id: string): Promise<GalleryImage> => {
    const response = await apiClient.get<GalleryImage>(`/gallery/${id}`);
    return response.data;
  },

  update: async (
    id: string,
    dto: UpdateGalleryImageDto,
  ): Promise<GalleryImage> => {
    const response = await apiClient.patch<GalleryImage>(`/gallery/${id}`, dto);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/gallery/${id}`);
  },

  generateCaption: async (id: string): Promise<GeneratedCaption> => {
    const response = await apiClient.post<GeneratedCaption>(
      `/gallery/${id}/caption`,
    );
    return response.data;
  },

  getCaptions: async (id: string): Promise<GeneratedCaption[]> => {
    const response = await apiClient.get<GeneratedCaption[]>(
      `/gallery/${id}/captions`,
    );
    return response.data;
  },

  linkToVisit: async (id: string, visitId: string): Promise<GalleryImage> => {
    const response = await apiClient.post<GalleryImage>(
      `/gallery/${id}/link-visit`,
      { visitId },
    );
    return response.data;
  },
};
