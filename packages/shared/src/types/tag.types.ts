export interface TagDto {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export interface AddTagRequest {
  tagName: string;
}
