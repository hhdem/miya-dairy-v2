export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  photoCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string | null;
}
