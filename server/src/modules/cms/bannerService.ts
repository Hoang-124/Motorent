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

/**
 * UC-117: GET /admin/banners/:id
 */
export const getBannerById = async (id: string): Promise<IBanner> => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, 'ID banner không hợp lệ.');
  }

  const banner = await Banner.findOne({ _id: id, deletedAt: null });
  if (!banner) {
    throw new AppError(404, 'Banner không tồn tại hoặc đã bị xóa.');
  }

  return banner;
};

/**
 * UC-117: Quick toggle banner status (isActive)
 */
export const updateBannerStatus = async (id: string, isActive: boolean): Promise<IBanner> => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, 'ID banner không hợp lệ.');
  }

  const banner = await Banner.findOne({ _id: id, deletedAt: null });
  if (!banner) {
    throw new AppError(404, 'Banner không tồn tại hoặc đã bị xóa.');
  }

  banner.isActive = isActive;
  await banner.save();
  return banner;
};

export interface ReorderItem {
  id: string;
  order: number;
}

/**
 * UC-117: Reorder banners atomically
 */
export const reorderBanners = async (items: ReorderItem[]): Promise<IBanner[]> => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(400, 'Danh sách thứ tự banner không được để trống.');
  }

  const orderSet = new Set<number>();
  const idSet = new Set<string>();

  for (const item of items) {
    if (!item || !item.id || item.order === undefined || item.order === null) {
      throw new AppError(400, 'Mỗi phần tử phải chứa id và order.');
    }

    if (!mongoose.isValidObjectId(item.id)) {
      throw new AppError(400, `ID banner không hợp lệ: ${item.id}`);
    }

    const orderNum = Number(item.order);
    if (!Number.isInteger(orderNum) || orderNum < 1) {
      throw new AppError(400, `Thứ tự hiển thị phải là số nguyên dương >= 1: ${item.order}`);
    }

    if (orderSet.has(orderNum)) {
      throw new AppError(400, `Thứ tự hiển thị (order) không được trùng lặp: ${orderNum}`);
    }
    orderSet.add(orderNum);

    const strId = String(item.id);
    if (idSet.has(strId)) {
      throw new AppError(400, `ID banner không được trùng lặp trong yêu cầu: ${strId}`);
    }
    idSet.add(strId);
  }

  // Verify all banners exist and are not soft-deleted
  const nonDeletedBanners = await Banner.find({ deletedAt: null });
  const dbIdMap = new Map<string, IBanner>(nonDeletedBanners.map((b) => [b._id.toString(), b]));

  for (const item of items) {
    if (!dbIdMap.has(String(item.id))) {
      throw new AppError(400, `Banner với ID ${item.id} không tồn tại hoặc đã bị xóa.`);
    }
  }

  // Must include all non-deleted banners and continuous 1..n
  if (items.length !== nonDeletedBanners.length) {
    throw new AppError(
      400,
      `Danh sách reorder phải bao gồm toàn bộ ${nonDeletedBanners.length} banner hiện có.`
    );
  }

  const sortedOrders = Array.from(orderSet).sort((a, b) => a - b);
  for (let i = 0; i < sortedOrders.length; i++) {
    if (sortedOrders[i] !== i + 1) {
      throw new AppError(400, 'Thứ tự banner sau khi reorder phải liên tục từ 1 đến n.');
    }
  }

  // Execute in a transaction (all-or-nothing)
  return await bannerOrderMutex.runExclusive(async () => {
    const session = await mongoose.startSession();
    let inTransaction = false;
    try {
      session.startTransaction();
      inTransaction = true;

      for (const item of items) {
        await Banner.updateOne(
          { _id: item.id },
          { $set: { order: Number(item.order) } },
          { session }
        );
      }

      await session.commitTransaction();
      inTransaction = false;
    } catch (err: unknown) {
      if (inTransaction) {
        try {
          await session.abortTransaction();
        } catch {}
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('Transaction numbers are only allowed on a replica set member') ||
        msg.includes('standalone')
      ) {
        for (const item of items) {
          await Banner.updateOne(
            { _id: item.id },
            { $set: { order: Number(item.order) } }
          );
        }
      } else {
        throw err;
      }
    } finally {
      await session.endSession();
    }

    return await Banner.find({ deletedAt: null }).sort({ order: 1 });
  });
};

export interface UpdateBannerInput {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  linkUrl?: string | null;
  order?: number;
  isActive?: boolean;
}

/**
 * UC-117: Update banner fields and/or replacement image
 */
export const updateBanner = async (
  id: string,
  input: UpdateBannerInput,
  uploadedFile?: Express.Multer.File
): Promise<IBanner> => {
  if (!mongoose.isValidObjectId(id)) {
    if (uploadedFile?.path && fs.existsSync(uploadedFile.path)) {
      await fs.promises.unlink(uploadedFile.path).catch(() => {});
    }
    throw new AppError(400, 'ID banner không hợp lệ.');
  }

  const hasFile = Boolean(uploadedFile);
  const hasProvidedFields =
    input.title !== undefined ||
    input.subtitle !== undefined ||
    input.linkUrl !== undefined ||
    input.order !== undefined ||
    input.isActive !== undefined ||
    input.imageUrl !== undefined;

  if (!hasFile && !hasProvidedFields) {
    throw new AppError(400, 'Dữ liệu cập nhật không được để trống.');
  }

  const banner = await Banner.findOne({ _id: id, deletedAt: null });
  if (!banner) {
    if (uploadedFile?.path && fs.existsSync(uploadedFile.path)) {
      await fs.promises.unlink(uploadedFile.path).catch(() => {});
    }
    throw new AppError(404, 'Banner không tồn tại hoặc đã bị xóa.');
  }

  if (uploadedFile) {
    const isValidMagic = await validateImageMagicBytes(uploadedFile.path);
    if (!isValidMagic) {
      throw new AppError(400, 'Tệp tải lên không phải là ảnh hợp lệ hoặc dữ liệu bị lỗi.');
    }
  }

  if (input.title !== undefined) {
    const trimmedTitle = input.title.trim();
    if (trimmedTitle.length < 1 || trimmedTitle.length > 100) {
      if (uploadedFile?.path && fs.existsSync(uploadedFile.path)) {
        await fs.promises.unlink(uploadedFile.path).catch(() => {});
      }
      throw new AppError(400, 'Tiêu đề banner phải có độ dài từ 1 đến 100 ký tự.');
    }
    banner.title = trimmedTitle;
  }

  if (input.subtitle !== undefined) {
    banner.subtitle = input.subtitle.trim();
  }

  if (input.linkUrl !== undefined) {
    banner.linkUrl = validateLinkUrl(input.linkUrl);
  }

  if (input.order !== undefined && input.order !== null) {
    const num = Number(input.order);
    if (!Number.isInteger(num) || num < 1) {
      if (uploadedFile?.path && fs.existsSync(uploadedFile.path)) {
        await fs.promises.unlink(uploadedFile.path).catch(() => {});
      }
      throw new AppError(400, 'Thứ tự hiển thị (order) phải là số nguyên dương lớn hơn hoặc bằng 1.');
    }
    banner.order = num;
  }

  if (input.isActive !== undefined) {
    banner.isActive = Boolean(input.isActive);
  }

  const oldImageUrl = banner.imageUrl;
  let newLocalUploadedPath: string | null = null;

  if (uploadedFile) {
    newLocalUploadedPath = uploadedFile.path;
    let newImageUrl = `/uploads/${uploadedFile.filename}`;
    if (isCloudinaryConfigured()) {
      try {
        const uploaded = await uploadFileToCloudinary(uploadedFile.path, {
          folder: 'motorent/banners',
          type: 'upload',
        });
        newImageUrl = uploaded.secureUrl;
      } catch (cloudErr) {
        console.error('[BANNER] Cloudinary upload fallback to local disk:', cloudErr);
      }
    }
    banner.imageUrl = newImageUrl;
  } else if (input.imageUrl !== undefined) {
    const trimmedImg = input.imageUrl.trim();
    if (!trimmedImg) {
      throw new AppError(400, 'URL hình ảnh không được để trống.');
    }
    banner.imageUrl = trimmedImg;
  }

  try {
    await banner.save();
  } catch (saveErr) {
    if (newLocalUploadedPath && fs.existsSync(newLocalUploadedPath)) {
      await fs.promises.unlink(newLocalUploadedPath).catch(() => {});
    }
    throw saveErr;
  }

  // After commit succeeded: clean up old image if it was a local file in uploadDir
  if (uploadedFile && oldImageUrl && oldImageUrl.startsWith('/uploads/')) {
    const oldFileName = path.basename(oldImageUrl);
    const oldFilePath = path.join(uploadDir, oldFileName);
    if (fs.existsSync(oldFilePath) && oldFilePath !== newLocalUploadedPath) {
      await fs.promises.unlink(oldFilePath).catch(() => {});
    }
  }

  return banner;
};

/**
 * Helper to check if current MongoDB connection supports multi-document transactions
 */
export const isReplicaSetDeployment = (): boolean => {
  try {
    const rawConn = mongoose.connection as unknown as {
      client?: {
        topology?: {
          description?: {
            type?: string;
            setName?: string;
            servers?: Map<string, { setName?: string; type?: string }>;
          };
        };
      };
    };
    const topology = rawConn.client?.topology?.description;
    if (!topology) return false;
    const type = String(topology.type || '');
    if (type.includes('ReplicaSet') || type === 'Sharded') {
      return true;
    }
    if (topology.setName) {
      return true;
    }
    for (const server of topology.servers?.values() || []) {
      if (server.setName || (server.type && String(server.type).startsWith('RS'))) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * UC-118: Delete Banner (Soft delete)
 */
export const deleteBanner = async (id: string): Promise<IBanner> => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(404, 'Banner không tồn tại hoặc đã bị xóa.');
  }

  return await bannerOrderMutex.runExclusive(async () => {
    const banner = await Banner.findById(id);
    if (!banner || banner.deletedAt !== null) {
      throw new AppError(404, 'Banner không tồn tại hoặc đã bị xóa.');
    }

    const isReplica = isReplicaSetDeployment();

    if (isReplica) {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        // 1. Soft delete: set deletedAt = now() (do NOT delete record, do NOT delete image)
        banner.deletedAt = new Date();
        await banner.save({ session });

        // 2. Fetch remaining non-deleted banners ordered by order ASC, then createdAt ASC
        const remainingBanners = await Banner.find(
          { deletedAt: null },
          null,
          { session }
        ).sort({ order: 1, createdAt: 1 });

        // 3. Normalize remaining banners' order to 1..n continuously
        for (let i = 0; i < remainingBanners.length; i++) {
          const expectedOrder = i + 1;
          if (remainingBanners[i].order !== expectedOrder) {
            remainingBanners[i].order = expectedOrder;
            await remainingBanners[i].save({ session });
          }
        }

        await session.commitTransaction();
        return banner;
      } catch (error) {
        if (session.inTransaction()) {
          try {
            await session.abortTransaction();
          } catch {}
        }
        throw error;
      } finally {
        await session.endSession();
      }
    } else {
      // Standalone MongoDB environment (mutex guarantees atomic in-process serialization)
      banner.deletedAt = new Date();
      await banner.save();

      const remainingBanners = await Banner.find({ deletedAt: null }).sort({ order: 1, createdAt: 1 });

      for (let i = 0; i < remainingBanners.length; i++) {
        const expectedOrder = i + 1;
        if (remainingBanners[i].order !== expectedOrder) {
          remainingBanners[i].order = expectedOrder;
          await remainingBanners[i].save();
        }
      }

      return banner;
    }
  });
};
