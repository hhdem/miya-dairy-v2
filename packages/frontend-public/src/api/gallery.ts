import { apiClient } from './client';
import type {
  PhotoDto,
  PhotoListResponse,
  CategoryDto,
  TagDto,
} from '@miya-dairy/shared';

export const galleryApi = {
  getPhotos: async (
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

  getPhotoById: async (id: string): Promise<PhotoDto> => {
    const response = await apiClient.get<PhotoDto>(`/photos/${id}`);
    return response.data;
  },

  getCategories: async (): Promise<CategoryDto[]> => {
    const response = await apiClient.get<CategoryDto[]>('/categories');
    return response.data;
  },

  getTags: async (): Promise<TagDto[]> => {
    const response = await apiClient.get<TagDto[]>('/tags');
    return response.data;
  },
};
