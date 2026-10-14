/**
 * Image helper utility for MOTORENT
 * Preserves photorealistic studio quality with high-performance CDN compression (f_auto,q_auto)
 */
export const getOptimizedVehicleImageUrl = (url: string | undefined): string => {
  if (!url || typeof url !== 'string') return '';
  
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    // Clean transformation to keep photorealistic quality with f_auto,q_auto
    return url.replace(
      /\/upload\/(?:(?:e_trim|e_make_transparent|f_auto|q_auto)[^/]*\/)?/,
      '/upload/f_auto,q_auto/'
    );
  }
  
  return url;
};

/**
 * Resolve full avatar URL for user profiles
 * Handles Google avatar URLs, uploaded local avatars, and CDN paths
 */
export const getUserAvatarUrl = (avatarUrl: string | undefined | null): string | null => {
  if (!avatarUrl || typeof avatarUrl !== 'string' || !avatarUrl.trim()) return null;
  const trimmed = avatarUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') as string;
  const baseUrl = apiBase.replace(/\/api\/?$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${baseUrl}${cleanPath}`;
};
