import { apiClient } from './client';
import type {
  CategoryDto,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@miya-dairy/shared';

export const categoriesApi = {
  create: async (data: CreateCategoryRequest): Promise<CategoryDto> => {
    const response = await apiClient.post<CategoryDto>('/categories', data);
    return response.data;
  },

  list: async (): Promise<CategoryDto[]> => {
    const response = await apiClient.get<CategoryDto[]>('/categories');
    return response.data;
  },

  getById: async (id: string): Promise<CategoryDto> => {
    const response = await apiClient.get<CategoryDto>(`/categories/${id}`);
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateCategoryRequest,
  ): Promise<CategoryDto> => {
    const response = await apiClient.put<CategoryDto>(
      `/categories/${id}`,
      data,
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },
};
