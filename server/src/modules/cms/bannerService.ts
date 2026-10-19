import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Banner, IBanner } from '../../models/Banner';
import { AppError } from '../../core/errorHandler';
import { uploadDir, validateImageMagicBytes } from '../../core/uploadMiddleware';
import { isCloudinaryConfigured, uploadFileToCloudinary } from '../../config/cloudinary';

class AsyncMutex {
  private queue: Promise<void> = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const current = this.queue;
    this.queue = next;
    await current;
    try {
      return await fn();
    } finally {
      release!();
    }
  }
}

const bannerOrderMutex = new AsyncMutex();

/**
 * Validate linkUrl according to UC-116 business rules:
 * - Optional
 * - If provided, must be a valid http(s) URL or an internal path starting with "/"
 * - Rejects "javascript:...", "data:...", "vbscript:...", or unsafe schemes
 */
export const validateLinkUrl = (rawUrl?: string | null): string | null => {
  if (!rawUrl || rawUrl.trim() === '') {
    return null;
  }

  const trimmed = rawUrl.trim();

  // Reject dangerous pseudo-protocols or relative protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('//') ||
    lower.startsWith('/\\')
  ) {
    throw new AppError(400, 'Đường dẫn linkUrl không an toàn hoặc chứa mã thực thi nguy hiểm.');
  }

  // Internal path: starts with single slash
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // External absolute URL: must be http: or https:
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
    throw new AppError(400, 'Đường dẫn linkUrl phải sử dụng giao thức http hoặc https.');
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(400, 'Đường dẫn linkUrl phải là URL http(s) hợp lệ hoặc đường dẫn nội bộ bắt đầu bằng "/".');
  }
};

export interface CreateBannerInput {
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string | null;
  order?: number;
  isActive?: boolean;
}

export const createBanner = async (input: CreateBannerInput): Promise<IBanner> => {
  if (!input.title || typeof input.title !== 'string') {
    throw new AppError(400, 'Tiêu đề banner là bắt buộc.');
  }

  const trimmedTitle = input.title.trim();
  if (trimmedTitle.length < 1 || trimmedTitle.length > 100) {
    throw new AppError(400, 'Tiêu đề banner phải có độ dài từ 1 đến 100 ký tự.');
  }

  if (!input.imageUrl || typeof input.imageUrl !== 'string' || input.imageUrl.trim() === '') {
    throw new AppError(400, 'Hình ảnh banner là bắt buộc.');
  }

  const validatedLink = validateLinkUrl(input.linkUrl);
  const isActive = input.isActive !== undefined ? Boolean(input.isActive) : true;

  // Use mutex lock to serialize order computation and prevent race conditions when 2 admins create simultaneously
  return await bannerOrderMutex.runExclusive(async () => {
    let finalOrder: number;

    if (input.order !== undefined && input.order !== null && !isNaN(Number(input.order))) {
      finalOrder = Math.floor(Number(input.order));
      if (finalOrder < 1) {
        throw new AppError(400, 'Thứ tự hiển thị (order) phải là số nguyên dương lớn hơn hoặc bằng 1.');
      }
    } else {
      const highest = await Banner.findOne({ deletedAt: null })
        .sort({ order: -1 })
        .select('order');
      finalOrder = highest && typeof highest.order === 'number' ? highest.order + 1 : 1;
    }

    const banner = await Banner.create({
      title: trimmedTitle,
      subtitle: input.subtitle?.trim() || '',
      imageUrl: input.imageUrl.trim(),
      linkUrl: validatedLink,
      order: finalOrder,
      isActive,
      deletedAt: null,
    });

    return banner;
  });
};

export interface GetAdminBannersQuery {
  page?: string | number;
  limit?: string | number;
  isActive?: string | boolean;
}

export interface PaginatedAdminBanners {
  items: IBanner[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const getAdminBanners = async (
  query: GetAdminBannersQuery = {}
): Promise<PaginatedAdminBanners> => {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || '10'), 10) || 10));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {
    deletedAt: null,
  };

  if (query.isActive !== undefined && query.isActive !== '') {
    if (query.isActive === 'true' || query.isActive === true) {
      filter.isActive = true;
    } else if (query.isActive === 'false' || query.isActive === false) {
      filter.isActive = false;
    }
  }

  const [items, total] = await Promise.all([
    Banner.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Banner.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

export const getPublicBanners = async (): Promise<IBanner[]> => {
  return await Banner.find({
    deletedAt: null,
    isActive: true,
  })
    .sort({ order: 1 })
    .limit(10)
    .select('title subtitle imageUrl linkUrl order isActive');
};
