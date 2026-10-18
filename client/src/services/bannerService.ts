import { api } from './api';
import type { Banner } from '../types';

export interface AdminBannersResponse {
  items: Banner[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Fetch banners for Admin table with pagination & status filter
 */
export const getAdminBanners = async (
  page = 1,
  limit = 10,
  isActive?: boolean
): Promise<AdminBannersResponse> => {
  const params: Record<string, unknown> = { page, limit };
  if (isActive !== undefined) {
    params.isActive = isActive;
  }
  const response = await api.get('/admin/banners', { params });
  return response.data.data;
};

/**
 * Fetch active non-deleted banners for public display
 */
export const getPublicBanners = async (): Promise<Banner[]> => {
  const response = await api.get('/banners');
  return response.data.data;
};

/**
 * UC-117: Quick toggle banner active status
 */
export const toggleBannerStatus = async (id: string, isActive: boolean): Promise<Banner> => {
  const response = await api.patch(`/admin/banners/${id}/status`, { isActive });
  return response.data.data;
};

/**
 * UC-116: Create a new promotional banner (multipart)
 */
export const createBanner = async (formData: FormData): Promise<Banner> => {
  const response = await api.post('/admin/banners', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};
