import { useState } from 'react';
import type { PhotoDto } from '@miya-dairy/shared';
import { getImageUrl } from '../api/client';

interface PhotoCardProps {
  photo: PhotoDto;
  onClick: () => void;
}

export default function PhotoCard({ photo, onClick }: PhotoCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div
      className="group relative aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105"
      onClick={onClick}
    >
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      )}
      <img
        src={getImageUrl(photo.thumbnailUrl)}
        alt={photo.filename}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setImageLoaded(true)}
        loading="lazy"
      />
      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 flex items-end">
        <div className="p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <p className="text-sm font-medium truncate">{photo.filename}</p>
          {photo.category && (
            <p className="text-xs opacity-90">{photo.category.name}</p>
          )}
        </div>
      </div>
    </div>
  );
}
