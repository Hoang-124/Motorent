import { api } from './api';
import type { StaticPage, StaticPageType } from '../types';

export interface PageListResponse {
  pages: StaticPage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const pageService = {
  /**
   * Public: Fetch published static page by slug
   */
  async getPublicPage(slug: string): Promise<StaticPage> {
    const res = await api.get(`/pages/${slug}`);
    return res.data.data;
  },

  /**
   * Admin: List pages with filters and pagination
   */
  async getAdminPages(params?: {
    page?: number;
    limit?: number;
    type?: string;
    isPublished?: string;
    search?: string;
  }): Promise<PageListResponse> {
    const res = await api.get('/admin/pages', { params });
    return {
      pages: res.data.data,
      pagination: res.data.pagination,
    };
  },

  /**
   * Admin: Get page details by ID
   */
  async getAdminPageById(id: string): Promise<StaticPage> {
    const res = await api.get(`/admin/pages/${id}`);
    return res.data.data;
  },

  /**
   * Admin: Create new page
   */
  async createAdminPage(data: {
    title: string;
    slug?: string;
    content: string;
    type?: StaticPageType;
    isPublished?: boolean;
  }): Promise<StaticPage> {
    const res = await api.post('/admin/pages', data);
    return res.data.data;
  },

  /**
   * Admin: Update existing page
   */
  async updateAdminPage(
    id: string,
    data: Partial<{
      title: string;
      slug: string;
      content: string;
      type: StaticPageType;
      isPublished: boolean;
    }>
  ): Promise<StaticPage> {
    const res = await api.patch(`/admin/pages/${id}`, data);
    return res.data.data;
  },

  /**
   * Admin: Delete static page
   */
  async deleteAdminPage(id: string): Promise<void> {
    await api.delete(`/admin/pages/${id}`);
  },
};
