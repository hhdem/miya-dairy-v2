import { useState, useEffect } from 'react';
import { galleryApi } from '../api/gallery';
import PhotoCard from '../components/PhotoCard';
import PhotoModal from '../components/PhotoModal';
import type { PhotoDto, CategoryDto } from '@miya-dairy/shared';

export default function Gallery() {
  const [photos, setPhotos] = useState<PhotoDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [page, selectedCategory]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [photosResponse, categoriesData] = await Promise.all([
        galleryApi.getPhotos(page, 20, selectedCategory || undefined),
        page === 1 ? galleryApi.getCategories() : Promise.resolve(categories),
      ]);

      // Filter only public photos
      const publicPhotos = photosResponse.data.filter(
        (p) => p.visibility === 'public',
      );

      setPhotos(publicPhotos);
      setTotalPages(photosResponse.meta.totalPages);

      if (page === 1) {
        setCategories(categoriesData);
      }
    } catch (err) {
      console.error('Failed to load gallery:', err);
      setError('Failed to load photos. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setPage(1);
  };

  const handlePhotoClick = async (photo: PhotoDto) => {
    try {
      // Load full photo details
      const fullPhoto = await galleryApi.getPhotoById(photo.id);
      setSelectedPhoto(fullPhoto);
    } catch (err) {
      console.error('Failed to load photo details:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-4xl font-bold text-gray-900 text-center">
            Miya Dairy Gallery
          </h1>
          <p className="text-center text-gray-600 mt-2">
            Explore our photo collection
          </p>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="bg-white border-b sticky top-[104px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Filter by category:
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.photoCount})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-xl text-gray-500">Loading photos...</div>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-20">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-4 text-xl font-medium text-gray-900">
              No photos found
            </h3>
            <p className="mt-2 text-gray-500">
              {selectedCategory
                ? 'Try selecting a different category'
                : 'Check back later for new photos!'}
            </p>
          </div>
        ) : (
          <>
            {/* Photos Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {photos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  onClick={() => handlePhotoClick(photo)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-gray-700 font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Photo Modal */}
      <PhotoModal
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-600">
          <p>&copy; 2024 Miya Dairy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
