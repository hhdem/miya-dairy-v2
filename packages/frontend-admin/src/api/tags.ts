import { apiClient } from './client';
import type { TagDto, AddTagRequest } from '@miya-dairy/shared';

export const tagsApi = {
  list: async (): Promise<TagDto[]> => {
    const response = await apiClient.get<TagDto[]>('/tags');
    return response.data;
  },

  getById: async (id: string): Promise<TagDto> => {
    const response = await apiClient.get<TagDto>(`/tags/${id}`);
    return response.data;
  },

  addToPhoto: async (photoId: string, data: AddTagRequest): Promise<TagDto> => {
    const response = await apiClient.post<TagDto>(
      `/tags/photos/${photoId}`,
      data,
    );
    return response.data;
  },

  removeFromPhoto: async (photoId: string, tagId: string): Promise<void> => {
    await apiClient.delete(`/tags/photos/${photoId}/${tagId}`);
  },
};
