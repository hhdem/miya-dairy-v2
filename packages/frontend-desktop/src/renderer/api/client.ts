import axios, { AxiosInstance } from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  PhotoDto,
  PhotoListResponse,
  CategoryDto,
} from '@miya-dairy/shared';

export class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private backendBaseURL: string;

  constructor(baseURL: string = 'http://localhost:3000/api') {
    this.baseURL = baseURL;
    this.backendBaseURL = baseURL.replace('/api', '');
    this.client = axios.create({
      baseURL,
      timeout: 30000,
    });

    this.client.interceptors.request.use(
      async (config) => {
        const token = await window.electron.store.get('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await window.electron.store.delete('accessToken');
          await window.electron.store.delete('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/login', {
      username,
      password,
    } as LoginRequest);

    await window.electron.store.set('accessToken', response.data.accessToken);
    await window.electron.store.set('user', response.data.user);

    return response.data;
  }

  async logout(): Promise<void> {
    await window.electron.store.delete('accessToken');
    await window.electron.store.delete('user');
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await window.electron.store.get('accessToken');
    return !!token;
  }

  async getCurrentUser() {
    return await window.electron.store.get('user');
  }

  async getPhotos(
    page: number = 1,
    limit: number = 20,
    categoryId?: string
  ): Promise<PhotoListResponse> {
    const params: any = { page, limit };
    if (categoryId) {
      params.categoryId = categoryId;
    }

    const response = await this.client.get<PhotoListResponse>('/photos', {
      params,
    });
    return response.data;
  }

  async uploadPhoto(filePath: string): Promise<PhotoDto> {
    const fs = require('fs');
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = filePath.split('/').pop() || 'photo.jpg';
    const blob = new Blob([fileBuffer]);

    formData.append('photo', blob, fileName);

    const response = await this.client.post<PhotoDto>('/photos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  async getCategories(): Promise<CategoryDto[]> {
    const response = await this.client.get<CategoryDto[]>('/categories');
    return response.data;
  }

  async updatePhotoVisibility(
    photoId: string,
    visibility: 'public' | 'private'
  ): Promise<PhotoDto> {
    const response = await this.client.patch<PhotoDto>(
      `/photos/${photoId}/visibility`,
      { visibility }
    );
    return response.data;
  }

  async deletePhoto(photoId: string): Promise<void> {
    await this.client.delete(`/photos/${photoId}`);
  }

  // Helper method to convert relative image URLs to absolute URLs
  getImageUrl(relativePath: string): string {
    if (!relativePath) return '';
    if (relativePath.startsWith('http')) return relativePath;
    return `${this.backendBaseURL}${relativePath}`;
  }
}

export const apiClient = new ApiClient();
