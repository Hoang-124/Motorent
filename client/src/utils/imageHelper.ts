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
