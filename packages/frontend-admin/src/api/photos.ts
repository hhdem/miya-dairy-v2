import { apiClient } from './client';
import type {
  PhotoDto,
  PhotoListResponse,
  UpdatePhotoRequest,
} from '@miya-dairy/shared';

export const photosApi = {
  upload: async (file: File): Promise<PhotoDto> => {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await apiClient.post<PhotoDto>('/photos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  list: async (
    page = 1,
    limit = 20,
    categoryId?: string,
  ): Promise<PhotoListResponse> => {
    const params: Record<string, string | number> = { page, limit };
    if (categoryId) {
      params.categoryId = categoryId;
    }

    const response = await apiClient.get<PhotoListResponse>('/photos', {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<PhotoDto> => {
    const response = await apiClient.get<PhotoDto>(`/photos/${id}`);
    return response.data;
  },

  update: async (id: string, data: UpdatePhotoRequest): Promise<PhotoDto> => {
    const response = await apiClient.put<PhotoDto>(`/photos/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/photos/${id}`);
  },
};
