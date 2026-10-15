import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { env } from './env';

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  format: string;
}

/**
 * Checks whether full Cloudinary API credentials are configured for authenticated/signed uploads
 */
export const isCloudinaryConfigured = (): boolean => {
  if (process.env.NODE_ENV === 'test') return false;
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET &&
      env.CLOUDINARY_API_KEY.trim().length > 0 &&
      env.CLOUDINARY_API_SECRET.trim().length > 0
  );
};

/**
 * Sign parameters according to Cloudinary SHA-1 signature specification
 */
const signCloudinaryParams = (params: Record<string, string | number>, apiSecret: string): string => {
  const sortedQuery = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto
    .createHash('sha1')
    .update(`${sortedQuery}${apiSecret.trim()}`)
    .digest('hex');
};

/**
 * Upload a local file to Cloudinary (supports 'authenticated' private mode for eKYC or 'upload' for Avatars)
 * and automatically remove the temporary local file on completion.
 */
export const uploadFileToCloudinary = async (
  localFilePath: string,
  options: {
    folder: string;
    type?: 'upload' | 'authenticated';
    publicId?: string;
  }
): Promise<CloudinaryUploadResult> => {
  const cloudName = env.CLOUDINARY_CLOUD_NAME.trim();
  const apiKey = (env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (env.CLOUDINARY_API_SECRET || '').trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Chưa cấu hình đầy đủ thông tin xác thực Cloudinary.');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const deliveryType = options.type || 'authenticated';
  const signParams: Record<string, string | number> = {
    folder: options.folder,
    timestamp,
    type: deliveryType,
  };
  if (options.publicId) {
    signParams.public_id = options.publicId;
  }

  const signature = signCloudinaryParams(signParams, apiSecret);
  const fileBuffer = await fs.promises.readFile(localFilePath);
  const ext = path.extname(localFilePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer], { type: mimeType }), path.basename(localFilePath));
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('folder', options.folder);
  formData.append('type', deliveryType);
  if (options.publicId) {
    formData.append('public_id', options.publicId);
  }
  formData.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cloudinary upload failed (${response.status}): ${errText}`);
  }

  const result = (await response.json()) as {
    public_id: string;
    secure_url: string;
    format: string;
  };

  // Remove local temporary file so local disk stays completely clean
  await fs.promises.unlink(localFilePath).catch(() => {});

  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    format: result.format || 'webp',
  };
};

/**
 * Delete an asset from Cloudinary when replaced or cleaned up
 */
export const deleteFromCloudinary = async (
  publicIdWithFormat: string,
  type: 'upload' | 'authenticated' = 'authenticated'
): Promise<void> => {
  if (!isCloudinaryConfigured()) return;

  const cloudName = env.CLOUDINARY_CLOUD_NAME.trim();
  const apiKey = (env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (env.CLOUDINARY_API_SECRET || '').trim();

  // Strip extension if stored as publicId.ext
  const publicId = publicIdWithFormat.replace(/^cloudinary:/, '').replace(/\.[^/.]+$/, '');
  const timestamp = Math.floor(Date.now() / 1000);

  const signParams: Record<string, string | number> = {
    invalidate: 'true',
    public_id: publicId,
    timestamp,
    type,
  };
  const signature = signCloudinaryParams(signParams, apiSecret);

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('type', type);
  formData.append('invalidate', 'true');
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);

  await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: 'POST',
    body: formData,
  }).catch(() => {});
};

/**
 * Generate a signed authenticated delivery URL for a private eKYC asset on Cloudinary
 */
export const getSignedCloudinaryEkycUrl = (storedRef: string): string => {
  const cloudName = env.CLOUDINARY_CLOUD_NAME.trim();
  const apiSecret = (env.CLOUDINARY_API_SECRET || '').trim();
  const cleanRef = storedRef.replace(/^cloudinary:/, '');

  // Cloudinary authenticated URL signature: first 8 chars of URL-safe base64 SHA-1 of "<public_id_with_ext><api_secret>"
  const rawDigest = crypto
    .createHash('sha1')
    .update(`${cleanRef}${apiSecret}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .slice(0, 8);

  return `https://res.cloudinary.com/${cloudName}/image/authenticated/s--${rawDigest}--/${cleanRef}`;
};
