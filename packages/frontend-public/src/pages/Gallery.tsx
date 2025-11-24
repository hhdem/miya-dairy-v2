import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Masonry from 'react-masonry-css';
import { galleryApi } from '../api/gallery';
import { getImageUrl } from '../api/client';
import type { PhotoDto, CategoryDto, TagDto } from '@miya-dairy/shared';
import { cn, formatDate, groupPhotosByDate, groupPhotosByCategory } from '../lib/utils';
import { IconCalendar, IconFolder, IconTag, IconGrid3x3, IconMenu2, IconX, IconSortDescending, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

type GroupMode = 'date' | 'category' | 'none';
type SortMode = 'date-desc' | 'category-name';

export default function Gallery() {
  // Detect if device is mobile
  const isMobile = () => {
    return window.innerWidth < 768; // Tailwind's md breakpoint
  };

  const [photos, setPhotos] = useState<PhotoDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [tags, setTags] = useState<TagDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoDto | null>(null);
  const [groupMode, setGroupMode] = useState<GroupMode>('date');
  const [sortMode, setSortMode] = useState<SortMode>('date-desc');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mergedView, setMergedView] = useState(() => isMobile()); // Mobile: merged, Desktop: expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Use ref to track if we're currently loading to prevent duplicate requests
  const isLoadingRef = useRef(false);

  useEffect(() => {
    loadData();
  }, []);

  // Memoize loadMorePhotos to prevent recreating on every render
  const loadMorePhotos = useCallback(async () => {
    // Double-check with ref to prevent race conditions
    if (isLoadingRef.current || loadingMore || !hasMore) return;

    isLoadingRef.current = true;
    setLoadingMore(true);

    try {
      const nextPage = page + 1;
      const photosResponse = await galleryApi.getPhotos(nextPage);

      const publicPhotos = photosResponse.data.filter((p) => p.visibility === 'public');

      // Append new photos to existing ones
      setPhotos((prev) => [...prev, ...publicPhotos]);
      setPage(nextPage);
      setHasMore(photosResponse.meta.page < photosResponse.meta.totalPages);
    } catch (error) {
      console.error('Failed to load more photos:', error);
    } finally {
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [loadingMore, hasMore, page]);

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (isLoadingRef.current || loadingMore || !hasMore) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      // Load more when user scrolls to 80% of the page
      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
        loadMorePhotos();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMorePhotos, loadingMore, hasMore]);

  const loadData = async () => {
    try {
      const [photosResponse, categoriesData, tagsData] = await Promise.all([
        galleryApi.getPhotos(1, 50),
        galleryApi.getCategories(),
        galleryApi.getTags(),
      ]);

      const publicPhotos = photosResponse.data.filter((p) => p.visibility === 'public');
      setPhotos(publicPhotos);
      setCategories(categoriesData);
      setTags(tagsData);

      // Check if there are more photos to load
      setHasMore(photosResponse.meta.page < photosResponse.meta.totalPages);
      setPage(1);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tagId)) {
      newTags.delete(tagId);
    } else {
      newTags.add(tagId);
    }
    setSelectedTags(newTags);
  };

  const toggleGroupExpansion = (groupKey: string) => {
    const newExpandedGroups = new Set(expandedGroups);
    if (newExpandedGroups.has(groupKey)) {
      newExpandedGroups.delete(groupKey);
    } else {
      newExpandedGroups.add(groupKey);
    }
    setExpandedGroups(newExpandedGroups);
  };

  const filteredPhotos = photos.filter((photo) => {
    // Category filter
    if (selectedCategory && photo.category?.id !== selectedCategory) {
      return false;
    }

    // Tags filter - OR logic (union): show photos that have ANY of the selected tags
    if (selectedTags.size > 0) {
      const photoTagIds = photo.tags?.map((t) => t.tag.id) || [];
      const hasAnyTag = Array.from(selectedTags).some((tagId) =>
        photoTagIds.includes(tagId)
      );
      if (!hasAnyTag) return false;
    }

    return true;
  });

  // Apply sorting
  const sortedPhotos = [...filteredPhotos].sort((a, b) => {
    if (sortMode === 'date-desc') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortMode === 'category-name') {
      const catA = a.category?.name || 'Uncategorized';
      const catB = b.category?.name || 'Uncategorized';
      return catA.localeCompare(catB);
    }
    return 0;
  });

  const renderGroupedPhotos = () => {
    if (groupMode === 'none') {
      return (
        <MasonryGrid photos={sortedPhotos} onPhotoClick={setSelectedPhoto} />
      );
    }

    if (groupMode === 'date') {
      const groups = groupPhotosByDate(sortedPhotos);

      if (!mergedView) {
        // Show all groups expanded
        return (
          <div className="space-y-12">
            {Array.from(groups.entries()).map(([date, groupPhotos]) => (
              <div key={date}>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                  <IconCalendar className="w-6 h-6" />
                  {formatDate(groupPhotos[0].createdAt)}
                </h2>
                <MasonryGrid photos={groupPhotos} onPhotoClick={setSelectedPhoto} />
              </div>
            ))}
          </div>
        );
      }

      // Merged view mode
      return (
        <div className="space-y-8">
          {Array.from(groups.entries()).map(([date, groupPhotos]) => {
            const groupKey = `date-${date}`;
            const isExpanded = expandedGroups.has(groupKey);

            return (
              <div key={date}>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                  <IconCalendar className="w-6 h-6" />
                  {formatDate(groupPhotos[0].createdAt)}
                </h2>
                {isExpanded ? (
                  <MasonryGrid photos={groupPhotos} onPhotoClick={setSelectedPhoto} />
                ) : (
                  <MergedCard
                    photos={groupPhotos}
                    groupKey={groupKey}
                    onToggle={() => toggleGroupExpansion(groupKey)}
                    onPhotoClick={setSelectedPhoto}
                  />
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (groupMode === 'category') {
      const groups = groupPhotosByCategory(sortedPhotos);

      if (!mergedView) {
        // Show all groups expanded
        return (
          <div className="space-y-12">
            {Array.from(groups.entries()).map(([categoryName, groupPhotos]) => (
              <div key={categoryName}>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                  <IconFolder className="w-6 h-6" />
                  {categoryName}
                </h2>
                <MasonryGrid photos={groupPhotos} onPhotoClick={setSelectedPhoto} />
              </div>
            ))}
          </div>
        );
      }

      // Merged view mode
      return (
        <div className="space-y-8">
          {Array.from(groups.entries()).map(([categoryName, groupPhotos]) => {
            const groupKey = `category-${categoryName}`;
            const isExpanded = expandedGroups.has(groupKey);

            return (
              <div key={categoryName}>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                  <IconFolder className="w-6 h-6" />
                  {categoryName}
                </h2>
                {isExpanded ? (
                  <MasonryGrid photos={groupPhotos} onPhotoClick={setSelectedPhoto} />
                ) : (
                  <MergedCard
                    photos={groupPhotos}
                    groupKey={groupKey}
                    onToggle={() => toggleGroupExpansion(groupKey)}
                    onPhotoClick={setSelectedPhoto}
                  />
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // Default fallback
    return <MasonryGrid photos={sortedPhotos} onPhotoClick={setSelectedPhoto} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-xl text-gray-600 animate-pulse">Loading gallery...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/70 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Miya Dairy Gallery
              </h1>
              <p className="text-gray-600 mt-2">{sortedPhotos.length} photos</p>
            </div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-3 hover:bg-gray-100 rounded-lg transition-all group"
            >
              <IconMenu2 className="w-6 h-6 text-purple-500 group-hover:text-purple-600 transition-colors" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Photos Grid */}
        {sortedPhotos.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No photos match your filters</p>
          </div>
        ) : (
          <>
            {renderGroupedPhotos()}

            {/* Loading More Indicator */}
            {loadingMore && (
              <div className="flex justify-center items-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                  <p className="text-gray-600 text-sm">Loading more photos...</p>
                </div>
              </div>
            )}

            {/* End of Results */}
            {!hasMore && photos.length > 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">
                  🎉 You've reached the end! All {photos.length} photos loaded.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Filter Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-96 bg-white/95 backdrop-blur-lg shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Filters</h2>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <IconX className="w-6 h-6 text-gray-600" />
                  </button>
                </div>

                {/* Group Mode Selector */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <IconGrid3x3 className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Group by</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setGroupMode('date')}
                      className={cn(
                        'px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                        groupMode === 'date'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <IconCalendar className="w-4 h-4" />
                      Date
                    </button>
                    <button
                      onClick={() => setGroupMode('category')}
                      className={cn(
                        'px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                        groupMode === 'category'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <IconFolder className="w-4 h-4" />
                      Category
                    </button>
                    <button
                      onClick={() => setGroupMode('none')}
                      className={cn(
                        'px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                        groupMode === 'none'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <IconGrid3x3 className="w-4 h-4" />
                      All
                    </button>
                  </div>
                </div>

                {/* Merged View Toggle - Only show on mobile */}
                {groupMode !== 'none' && isMobile() && (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Merged View</span>
                      <button
                        onClick={() => {
                          setMergedView(!mergedView);
                          if (!mergedView) {
                            // When turning on merged view, clear all expanded groups
                            setExpandedGroups(new Set());
                          }
                        }}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          mergedView ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-300'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            mergedView ? 'translate-x-6' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* Sort Selector */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <IconSortDescending className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Sort by</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSortMode('date-desc')}
                      className={cn(
                        'px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                        sortMode === 'date-desc'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      Date (Newest First)
                    </button>
                    <button
                      onClick={() => setSortMode('category-name')}
                      className={cn(
                        'px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                        sortMode === 'category-name'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      Category Name (A-Z)
                    </button>
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <IconFolder className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Categories</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedCategory('')}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium transition-all',
                        selectedCategory === ''
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      )}
                    >
                      All
                    </motion.button>
                    {categories.map((cat) => (
                      <motion.button
                        key={cat.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={cn(
                          'px-4 py-2 rounded-full text-sm font-medium transition-all',
                          selectedCategory === cat.id
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        )}
                      >
                        {cat.name} ({cat.photoCount})
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Tags Filter */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <IconTag className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Tags</span>
                    {selectedTags.size > 0 && (
                      <button
                        onClick={() => setSelectedTags(new Set())}
                        className="text-xs text-gray-500 hover:text-gray-700 ml-auto"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <motion.button
                        key={tag.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleTag(tag.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                          selectedTags.has(tag.id)
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        )}
                      >
                        # {tag.name}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <PhotoModal
            photo={selectedPhoto}
            allPhotos={sortedPhotos}
            onClose={() => setSelectedPhoto(null)}
            onNavigate={setSelectedPhoto}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Merged Card Image Component - Individual image in merged card with skeleton
function MergedCardImage({ photo }: { photo: PhotoDto }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="relative aspect-square overflow-hidden rounded-lg">
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
      )}
      <img
        src={getImageUrl(photo.mediumUrl || photo.thumbnailUrl)}
        alt={photo.filename}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          imageLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageLoaded(true)}
        loading="lazy"
      />
    </div>
  );
}

// Merged Card Component - Compact inline card showing preview with count
function MergedCard({
  photos,
  onToggle,
}: {
  photos: PhotoDto[];
  groupKey: string;
  onToggle: () => void;
  onPhotoClick: (photo: PhotoDto) => void;
}) {
  const previewPhotos = photos.slice(0, 3); // Show 3 images
  const remainingCount = photos.length - previewPhotos.length;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onToggle}
      className="relative cursor-pointer rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all bg-white"
    >
      <div className="grid grid-cols-3 gap-1 p-1">
        {previewPhotos.map((photo) => (
          <MergedCardImage key={photo.id} photo={photo} />
        ))}
      </div>
      {remainingCount > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-sm">
          <div className="text-white text-3xl font-bold drop-shadow-lg">
            +{remainingCount}
          </div>
        </div>
      )}
      <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold text-gray-700 shadow-md">
        {photos.length} photos
      </div>
    </motion.div>
  );
}

// Masonry Grid Component
function MasonryGrid({
  photos,
  onPhotoClick,
}: {
  photos: PhotoDto[];
  onPhotoClick: (photo: PhotoDto) => void;
}) {
  // Breakpoint configuration for responsive columns
  const breakpointColumnsObj = {
    default: 4,  // 4 columns on extra large screens
    1536: 4,     // xl: 4 columns
    1280: 3,     // lg: 3 columns
    768: 2,      // md: 2 columns
    640: 1,      // sm: 1 column
  };

  return (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="flex -ml-4 w-auto"
      columnClassName="pl-4 bg-clip-padding"
    >
      {photos.map((photo, index) => (
        <motion.div
          key={photo.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="mb-4"
        >
          <PhotoCard photo={photo} onClick={() => onPhotoClick(photo)} />
        </motion.div>
      ))}
    </Masonry>
  );
}

// Photo Card Component
function PhotoCard({ photo, onClick }: { photo: PhotoDto; onClick: () => void }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative group cursor-pointer rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all bg-white"
      onClick={onClick}
    >
      <div className="relative">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse">
            {/* Skeleton content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-gray-300 border-t-purple-400 rounded-full animate-spin" />
            </div>
          </div>
        )}
        <img
          src={getImageUrl(photo.mediumUrl || photo.thumbnailUrl)}
          alt={photo.filename}
          className={cn(
            'w-full h-auto transition-opacity duration-500',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="space-y-2">
            {/* Category */}
            {photo.category && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-500/90 text-white text-xs rounded-full backdrop-blur-sm">
                  {photo.category.name}
                </span>
              </div>
            )}

            {/* Tags */}
            {photo.tags && photo.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {photo.tags.slice(0, 3).map((pt) => (
                  <span
                    key={pt.tag.id}
                    className="px-2 py-0.5 bg-green-500/90 text-white text-xs rounded-full backdrop-blur-sm"
                  >
                    #{pt.tag.name}
                  </span>
                ))}
                {photo.tags.length > 3 && (
                  <span className="px-2 py-0.5 bg-gray-500/90 text-white text-xs rounded-full backdrop-blur-sm">
                    +{photo.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Photo Modal Component
function PhotoModal({
  photo,
  allPhotos,
  onClose,
  onNavigate,
}: {
  photo: PhotoDto;
  allPhotos: PhotoDto[];
  onClose: () => void;
  onNavigate: (photo: PhotoDto) => void;
}) {
  const currentIndex = allPhotos.findIndex((p) => p.id === photo.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allPhotos.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      onNavigate(allPhotos[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onNavigate(allPhotos[currentIndex + 1]);
    }
  };

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };
    document.addEventListener('keydown', handleKeyboard);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyboard);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, currentIndex]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm"
        onClick={onClose}
      >
        ×
      </motion.button>

      {/* Previous button */}
      {hasPrevious && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            handlePrevious();
          }}
          className="absolute left-4 text-white hover:text-gray-300 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all"
        >
          <IconChevronLeft className="w-8 h-8" />
        </motion.button>
      )}

      {/* Next button */}
      {hasNext && (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-4 text-white hover:text-gray-300 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all"
        >
          <IconChevronRight className="w-8 h-8" />
        </motion.button>
      )}

      <motion.div
        key={photo.id}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative max-w-6xl max-h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={getImageUrl(photo.originalUrl || photo.mediumUrl)}
          alt={photo.filename}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />

        <div className="mt-6 bg-white/10 backdrop-blur-md rounded-lg p-6 text-white">
          <div className="flex flex-wrap gap-3">
            {/* Category */}
            {photo.category && (
              <span className="px-4 py-2 bg-blue-500/80 rounded-full text-sm font-medium">
                {photo.category.name}
              </span>
            )}

            {/* Tags */}
            {photo.tags?.map((pt) => (
              <span
                key={pt.tag.id}
                className="px-4 py-2 bg-green-500/80 rounded-full text-sm font-medium"
              >
                #{pt.tag.name}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
