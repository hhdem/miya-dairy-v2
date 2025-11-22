import { useEffect } from 'react';
import type { PhotoDto } from '@miya-dairy/shared';
import { getImageUrl } from '../api/client';

interface PhotoModalProps {
  photo: PhotoDto | null;
  onClose: () => void;
}

export default function PhotoModal({ photo, onClose }: PhotoModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (photo) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [photo, onClose]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 z-10"
        aria-label="Close"
      >
        ×
      </button>

      <div
        className="relative max-w-6xl max-h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={getImageUrl(photo.mediumUrl)}
          alt={photo.filename}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />

        <div className="mt-4 text-white bg-black bg-opacity-50 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">{photo.filename}</h2>

          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
            <div>
              <span className="text-gray-400">Dimensions:</span>{' '}
              {photo.width} × {photo.height}
            </div>
            <div>
              <span className="text-gray-400">Format:</span>{' '}
              {photo.originalFormat.toUpperCase()}
            </div>
            {photo.category && (
              <div>
                <span className="text-gray-400">Category:</span>{' '}
                {photo.category.name}
              </div>
            )}
            <div>
              <span className="text-gray-400">Uploaded:</span>{' '}
              {new Date(photo.uploadedAt).toLocaleDateString()}
            </div>
          </div>

          {photo.tags && photo.tags.length > 0 && (
            <div>
              <span className="text-gray-400 text-sm">Tags:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {photo.tags.map((photoTag) => (
                  <span
                    key={photoTag.id}
                    className="px-3 py-1 bg-blue-600 bg-opacity-80 rounded-full text-xs"
                  >
                    {photoTag.tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
