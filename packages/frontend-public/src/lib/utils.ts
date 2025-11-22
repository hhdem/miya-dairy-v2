import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function groupPhotosByDate(photos: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();

  photos.forEach((photo) => {
    const date = new Date(photo.createdAt).toDateString();
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(photo);
  });

  return groups;
}

export function groupPhotosByCategory(photos: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();

  photos.forEach((photo) => {
    const categoryName = photo.category?.name || 'Uncategorized';
    if (!groups.has(categoryName)) {
      groups.set(categoryName, []);
    }
    groups.get(categoryName)!.push(photo);
  });

  return groups;
}
