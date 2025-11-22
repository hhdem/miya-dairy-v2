import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { PhotoDto, CategoryDto } from '@miya-dairy/shared';

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [photos, setPhotos] = useState<PhotoDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
    loadData();
  }, [page, selectedCategory]);

  const loadUser = async () => {
    const userData = await apiClient.getCurrentUser();
    setUser(userData);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [photosResponse, categoriesData] = await Promise.all([
        apiClient.getPhotos(page, 20, selectedCategory || undefined),
        page === 1 ? apiClient.getCategories() : Promise.resolve(categories),
      ]);

      setPhotos(photosResponse.data);
      setTotalPages(photosResponse.meta.totalPages);
      if (page === 1) {
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    try {
      const filePaths = await window.electron.dialog.openFiles();
      if (filePaths.length === 0) return;

      setUploading(true);

      for (const filePath of filePaths) {
        await apiClient.uploadPhoto(filePath);
      }

      alert(`Successfully uploaded ${filePaths.length} photo(s)!`);
      setPage(1);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      await apiClient.deletePhoto(photoId);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Delete failed');
    }
  };

  const handleToggleVisibility = async (photo: PhotoDto) => {
    try {
      const newVisibility = photo.visibility === 'public' ? 'private' : 'public';
      await apiClient.updatePhotoVisibility(photo.id, newVisibility);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: '#f7fafc'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '60px'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1a202c' }}>
          Miya Dairy - Dashboard
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#718096' }}>Welcome, {user?.username}</span>
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              padding: '8px 16px',
              background: uploading ? '#a0aec0' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            {uploading ? 'Uploading...' : 'Upload Photos'}
          </button>
          <button
            onClick={onLogout}
            style={{
              padding: '8px 16px',
              background: '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setSelectedCategory('');
              setPage(1);
            }}
            style={{
              padding: '6px 12px',
              background: selectedCategory === '' ? '#667eea' : '#edf2f7',
              color: selectedCategory === '' ? 'white' : '#2d3748',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            All Photos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setPage(1);
              }}
              style={{
                padding: '6px 12px',
                background: selectedCategory === cat.id ? '#667eea' : '#edf2f7',
                color: selectedCategory === cat.id ? 'white' : '#2d3748',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {cat.name} ({cat.photoCount})
            </button>
          ))}
        </div>
      </div>

      {/* Photo Grid */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
            Loading photos...
          </div>
        ) : photos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
            No photos found. Upload some photos to get started!
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            {photos.map((photo) => (
              <div
                key={photo.id}
                style={{
                  background: 'white',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: '100%',
                  height: '250px',
                  overflow: 'hidden',
                  background: '#edf2f7'
                }}>
                  <img
                    src={apiClient.getImageUrl(photo.mediumUrl || photo.thumbnailUrl)}
                    alt={photo.filename}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
                <div style={{ padding: '12px' }}>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    color: '#2d3748',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {photo.filename}
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '8px'
                  }}>
                    <button
                      onClick={() => handleToggleVisibility(photo)}
                      style={{
                        flex: 1,
                        padding: '6px',
                        background: photo.visibility === 'public' ? '#48bb78' : '#ed8936',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {photo.visibility === 'public' ? 'Public' : 'Private'}
                    </button>
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#e53e3e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          background: 'white',
          borderTop: '1px solid #e2e8f0',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            style={{
              padding: '8px 16px',
              background: page === 1 ? '#edf2f7' : '#667eea',
              color: page === 1 ? '#a0aec0' : 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: page === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>
          <span style={{
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            color: '#2d3748'
          }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            style={{
              padding: '8px 16px',
              background: page === totalPages ? '#edf2f7' : '#667eea',
              color: page === totalPages ? '#a0aec0' : 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: page === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
