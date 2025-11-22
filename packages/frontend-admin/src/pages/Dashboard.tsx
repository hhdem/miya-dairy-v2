import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { photosApi } from '../api/photos';
import { categoriesApi } from '../api/categories';
import { tagsApi } from '../api/tags';
import { authApi } from '../api/auth';
import { getImageUrl } from '../api/client';
import type { PhotoDto, CategoryDto } from '@miya-dairy/shared';

export default function Dashboard() {
  const [photos, setPhotos] = useState<PhotoDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [showBatchMenu, setShowBatchMenu] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [batchCategoryId, setBatchCategoryId] = useState<string>('');
  const [batchTagName, setBatchTagName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [page, selectedCategory]);

  const loadData = async () => {
    try {
      const [photosResponse, categoriesData] = await Promise.all([
        photosApi.list(page, 20, selectedCategory || undefined),
        categoriesApi.list(),
      ]);

      setPhotos(photosResponse.data);
      setTotalPages(photosResponse.meta.totalPages);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authApi.clearToken();
    navigate('/login');
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        try {
          await photosApi.upload(files[i]);
          successCount++;
        } catch (error) {
          console.error(`Failed to upload ${files[i].name}:`, error);
          failCount++;
        }
      }

      loadData();
      alert(
        `Upload complete!\n✓ Success: ${successCount}\n✗ Failed: ${failCount}`
      );
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  const selectAllPhotos = () => {
    setSelectedPhotos(new Set(photos.map((p) => p.id)));
  };

  const clearSelection = () => {
    setSelectedPhotos(new Set());
  };

  const handleBatchSetVisibility = async (visibility: 'public' | 'private') => {
    if (selectedPhotos.size === 0) return;

    try {
      await Promise.all(
        Array.from(selectedPhotos).map((photoId) =>
          photosApi.updateVisibility(photoId, visibility)
        )
      );
      alert(`Set ${selectedPhotos.size} photos to ${visibility}`);
      clearSelection();
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Batch update failed');
    }
  };

  const handleBatchSetCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPhotos.size === 0) return;

    try {
      await Promise.all(
        Array.from(selectedPhotos).map((photoId) =>
          photosApi.update(photoId, {
            categoryId: batchCategoryId || null,
          })
        )
      );
      alert(`Updated ${selectedPhotos.size} photos`);
      clearSelection();
      setShowCategoryModal(false);
      setBatchCategoryId('');
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Batch update failed');
    }
  };

  const handleBatchAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPhotos.size === 0 || !batchTagName.trim()) return;

    try {
      await Promise.all(
        Array.from(selectedPhotos).map((photoId) =>
          tagsApi.addToPhoto(photoId, batchTagName)
        )
      );
      alert(`Added tag "${batchTagName}" to ${selectedPhotos.size} photos`);
      clearSelection();
      setShowTagModal(false);
      setBatchTagName('');
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Batch tag failed');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedPhotos.size === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedPhotos.size} photos? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedPhotos).map((photoId) => photosApi.delete(photoId))
      );
      alert(`Deleted ${selectedPhotos.size} photos`);
      clearSelection();
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Batch delete failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Miya Dairy Admin
            </h1>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/categories')}
                className="px-4 py-2 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200"
              >
                Manage Categories
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions Bar */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          {/* Upload Button */}
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleBatchUpload}
              disabled={uploading}
              className="hidden"
            />
            <span
              className={`inline-block px-4 py-2 rounded-md ${
                uploading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {uploading ? 'Uploading...' : 'Upload Photos'}
            </span>
          </label>

          {/* Batch Mode Toggle */}
          <button
            onClick={() => {
              setBatchMode(!batchMode);
              clearSelection();
            }}
            className={`px-4 py-2 rounded-md ${
              batchMode
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {batchMode ? 'Exit Batch Mode' : 'Batch Mode'}
          </button>

          {/* Batch Actions */}
          {batchMode && selectedPhotos.size > 0 && (
            <>
              <span className="text-sm text-gray-600">
                {selectedPhotos.size} selected
              </span>
              <button
                onClick={selectAllPhotos}
                className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
              >
                Clear
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowBatchMenu(!showBatchMenu)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Batch Actions ▼
                </button>

                {showBatchMenu && (
                  <div className="absolute top-full mt-2 bg-white shadow-lg rounded-md border z-10 min-w-[200px]">
                    <button
                      onClick={() => {
                        handleBatchSetVisibility('public');
                        setShowBatchMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                      Set Public
                    </button>
                    <button
                      onClick={() => {
                        handleBatchSetVisibility('private');
                        setShowBatchMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                      Set Private
                    </button>
                    <button
                      onClick={() => {
                        setShowCategoryModal(true);
                        setShowBatchMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                      Change Category
                    </button>
                    <button
                      onClick={() => {
                        setShowTagModal(true);
                        setShowBatchMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                      Add Tag
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        handleBatchDelete();
                        setShowBatchMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                    >
                      Delete Selected
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.photoCount})
              </option>
            ))}
          </select>
        </div>

        {/* Photos Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={`relative aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 ${
                selectedPhotos.has(photo.id) ? 'ring-4 ring-blue-500' : ''
              }`}
              onClick={() => {
                if (batchMode) {
                  togglePhotoSelection(photo.id);
                } else {
                  navigate(`/photos/${photo.id}`);
                }
              }}
            >
              <img
                src={getImageUrl(photo.thumbnailUrl)}
                alt={photo.filename}
                className="w-full h-full object-cover"
              />
              {batchMode && (
                <div className="absolute top-2 right-2">
                  <input
                    type="checkbox"
                    checked={selectedPhotos.has(photo.id)}
                    onChange={() => togglePhotoSelection(photo.id)}
                    className="w-5 h-5"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-xs">
                <p className="truncate">{photo.filename}</p>
                <p className="text-xs opacity-75">
                  {photo.visibility === 'public' ? '🌐 Public' : '🔒 Private'}
                </p>
              </div>
            </div>
          ))}
        </div>

        {photos.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No photos yet. Upload your first photo!
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border rounded-md disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </main>

      {/* Batch Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">
              Change Category ({selectedPhotos.size} photos)
            </h2>
            <form onSubmit={handleBatchSetCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Category
                </label>
                <select
                  value={batchCategoryId}
                  onChange={(e) => setBatchCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setBatchCategoryId('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">
              Add Tag ({selectedPhotos.size} photos)
            </h2>
            <form onSubmit={handleBatchAddTag} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag Name
                </label>
                <input
                  type="text"
                  value={batchTagName}
                  onChange={(e) => setBatchTagName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., nature"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Tag
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTagModal(false);
                    setBatchTagName('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
