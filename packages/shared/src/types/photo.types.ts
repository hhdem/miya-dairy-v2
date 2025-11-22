import { CategoryDto } from './category.types';
import { TagDto } from './tag.types';

export interface PhotoDto {
  id: string;
  filename: string;
  originalFormat: 'jpeg' | 'png' | 'webp' | 'heic';
  fileHash: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  originalUrl: string;
  thumbnailUrl: string;
  mediumUrl: string;
  visibility: 'public' | 'private';
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  category?: CategoryDto;
  tags?: PhotoTagDto[];
}

export interface PhotoListResponse {
  data: PhotoDto[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UpdatePhotoRequest {
  categoryId?: string | null;
  visibility?: 'public' | 'private';
}

export interface PhotoTagDto {
  id: string;
  tag: TagDto;
  confidence?: number;
  source: 'auto' | 'manual';
  createdAt: Date;
}

export type { CategoryDto, TagDto };
