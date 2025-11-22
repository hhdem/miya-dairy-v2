import { apiClient } from './client';
import type { LoginRequest, LoginResponse } from '@miya-dairy/shared';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
      '/auth/login',
      credentials,
    );
    return response.data;
  },

  setToken: (token: string) => {
    localStorage.setItem('accessToken', token);
  },

  getToken: (): string | null => {
    return localStorage.getItem('accessToken');
  },

  clearToken: () => {
    localStorage.removeItem('accessToken');
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('accessToken');
  },
};
