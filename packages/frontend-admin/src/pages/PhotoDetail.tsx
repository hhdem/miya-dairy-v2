import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { photosApi } from '../api/photos';
import { categoriesApi } from '../api/categories';
import { tagsApi } from '../api/tags';
import { getImageUrl } from '../api/client';
import type { PhotoDto, CategoryDto } from '@miya-dairy/shared';

export default function PhotoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<PhotoDto | null>(null);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    try {
      const [photoData, categoriesData] = await Promise.all([
        photosApi.getById(id),
        categoriesApi.list(),
      ]);

      setPhoto(photoData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load photo:', error);
      toast.error('Failed to load photo');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = async (categoryId: string) => {
    if (!id) return;

    try {
      await photosApi.update(id, {
        categoryId: categoryId || null,
      });
      toast.success('Category updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update category');
    }
  };

  const handleVisibilityChange = async (visibility: 'public' | 'private') => {
    if (!id) return;

    try {
      await photosApi.update(id, { visibility });
      toast.success(`Photo set to ${visibility}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update visibility');
    }
  };

  const handleAddTag = async () => {
    if (!id || !newTagName.trim()) return;

    try {
      await tagsApi.addToPhoto(id, { tagName: newTagName.trim() });
      toast.success(`Tag "${newTagName}" added`);
      setNewTagName('');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add tag');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!id) return;

    try {
      await tagsApi.removeFromPhoto(id, tagId);
      toast.success('Tag removed');
      loadData();
    } catch (error) {
      toast.error('Failed to remove tag');
    }
  };

  const handleDelete = () => {
    if (!id) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!id) return;
    setShowDeleteConfirm(false);

    try {
      await photosApi.delete(id);
      toast.success('Photo deleted');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to delete photo');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!photo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image */}
          <div>
            <img
              src={getImageUrl(photo.mediumUrl)}
              alt={photo.filename}
              className="w-full rounded-lg shadow-lg"
            />
            <div className="mt-4 text-sm text-gray-600">
              <p>
                <strong>Filename:</strong> {photo.filename}
              </p>
              <p>
                <strong>Size:</strong>{' '}
                {Math.round(photo.fileSizeBytes / 1024)} KB
              </p>
              <p>
                <strong>Dimensions:</strong> {photo.width} × {photo.height}
              </p>
              <p>
                <strong>Format:</strong> {photo.originalFormat.toUpperCase()}
              </p>
              <p>
                <strong>Uploaded:</strong>{' '}
                {new Date(photo.uploadedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Details & Controls */}
          <div className="space-y-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={photo.category?.id || ''}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => handleVisibilityChange('public')}
                  className={`px-4 py-2 rounded-md ${
                    photo.visibility === 'public'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Public
                </button>
                <button
                  onClick={() => handleVisibilityChange('private')}
                  className={`px-4 py-2 rounded-md ${
                    photo.visibility === 'private'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Private
                </button>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {photo.tags?.map((photoTag) => (
                  <span
                    key={photoTag.id}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {photoTag.tag.name}
                    {photoTag.source === 'auto' && (
                      <span className="text-xs opacity-75">
                        ({Math.round((photoTag.confidence || 0) * 100)}%)
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveTag(photoTag.tag.id)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Add new tag"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Delete */}
            <div className="pt-6 border-t">
              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete Photo
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Photo"
        message="Are you sure you want to delete this photo? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
