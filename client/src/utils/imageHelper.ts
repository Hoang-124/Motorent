const DEFAULT_VEHICLE_IMAGE_WIDTH = 960;
const MAX_VEHICLE_IMAGE_WIDTH = 1920;
const deliveryTransform = /^f_webp,q_auto,c_limit,w_\d+$/;
const transformationKey = /^(?:a|ar|b|bo|c|co|cs|d|dl|dn|dpr|du|e|eo|f|fl|fn|fps|g|h|if|ki|l|o|p|pg|q|r|so|sp|t|u|vc|vs|w|x|y|z)_/;

const imageWidth = (width: number): number => Number.isFinite(width)
  ? Math.max(1, Math.min(MAX_VEHICLE_IMAGE_WIDTH, Math.round(width)))
  : DEFAULT_VEHICLE_IMAGE_WIDTH;

const safeVehicleImageUrl = (value: string | undefined): string => {
  if (!value || typeof value !== 'string') return '';
  const url = value.trim();
  if (!url || /[\u0000-\u001f\u007f\\]/.test(url)) return '';
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? url : '';
  } catch {
    return '';
  }
};

const cloudinaryImage = (url: string): { parsed: URL; prefix: string; segments: string[] } | null => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') return null;
    const match = parsed.pathname.match(/^(\/[^/]+\/image\/upload\/)(.+)$/);
    if (!match) return null;
    const segments = match[2].split('/');
    // Rewriting a signed asset invalidates its signature. Keep its original URL.
    if (segments.some((segment) => /^s--[\w-]+--$/.test(segment)) || parsed.searchParams.has('__cld_token__')) return null;
    return { parsed, prefix: match[1], segments };
  } catch {
    return null;
  }
};

/** Limit CDN bytes at the requested display width and deliver WebP. */
export const getOptimizedVehicleImageUrl = (value: string | undefined, width = DEFAULT_VEHICLE_IMAGE_WIDTH): string => {
  const url = safeVehicleImageUrl(value);
  const image = cloudinaryImage(url);
  if (!image) return url;

  const { parsed, prefix, segments } = image;
  let assetStart = 0;
  // Versioned assets have an unambiguous boundary. For unversioned URLs, consume
  // only known transformation syntax and preserve the original asset path.
  const version = segments.findIndex((segment) => /^v\d+$/.test(segment));
  if (version >= 0) assetStart = version;
  else while (assetStart < segments.length - 1 && segments[assetStart].split(',').every((part) => transformationKey.test(part))) assetStart++;

  const transforms = segments.slice(0, assetStart).filter((segment) => !deliveryTransform.test(segment));
  const asset = segments.slice(assetStart);
  parsed.pathname = `${prefix}${[...transforms, `f_webp,q_auto,c_limit,w_${imageWidth(width)}`, ...asset].join('/')}`;
  return parsed.toString();
};

export interface VehicleImageOptions {
  width?: number;
  widths?: readonly number[];
  sizes?: string;
  priority?: boolean;
}

/** Spread these props onto a vehicle img; reserve priority for a visible hero. */
export const getVehicleImageProps = (url: string | undefined, options: VehicleImageOptions = {}) => {
  const src = getOptimizedVehicleImageUrl(url, options.width);
  const widths = [...new Set((options.widths ?? [320, 480, 640, 960, 1280])
    .filter((width) => Number.isFinite(width) && width > 0)
    .map(imageWidth))].sort((left, right) => left - right);
  const responsive = Boolean(src && cloudinaryImage(src) && widths.length);
  return {
    src,
    ...(responsive ? {
      srcSet: widths.map((width) => `${getOptimizedVehicleImageUrl(url, width)} ${width}w`).join(', '),
      sizes: options.sizes ?? '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
    } : {}),
    loading: options.priority ? 'eager' as const : 'lazy' as const,
    decoding: 'async' as const,
    // React 18 forwards the lowercase HTML attribute without an unknown-prop warning.
    fetchpriority: options.priority ? 'high' as const : 'auto' as const,
  };
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

/**
 * Resolve full banner image URL for banners on Home Page and Admin
 */
export const getBannerImageUrl = (imageUrl: string | undefined | null): string => {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) return '';
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') as string;
  const baseUrl = apiBase.replace(/\/api\/?$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${baseUrl}${cleanPath}`;
};
