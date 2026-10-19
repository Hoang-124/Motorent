import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { AppError } from '../../core/errorHandler';
import { validateImageMagicBytes } from '../../core/uploadMiddleware';
import { isCloudinaryConfigured, uploadFileToCloudinary } from '../../config/cloudinary';
import * as bannerService from './bannerService';

export const createBanner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      throw new AppError(400, 'Hình ảnh banner là bắt buộc.');
    }

    // Validate magic bytes to guard against disguised files / polyglots
    const isValidMagic = await validateImageMagicBytes(req.file.path);
    if (!isValidMagic) {
      throw new AppError(400, 'Tệp tải lên không phải là ảnh hợp lệ hoặc dữ liệu bị lỗi.');
    }

    let imageUrl = `/uploads/${req.file.filename}`;
    if (isCloudinaryConfigured()) {
      try {
        const uploaded = await uploadFileToCloudinary(req.file.path, {
          folder: 'motorent/banners',
          type: 'upload',
        });
        imageUrl = uploaded.secureUrl;
      } catch (cloudErr) {
        // If Cloudinary fails, keep local file path as reliable fallback
        console.error('[BANNER] Cloudinary upload fallback to local disk:', cloudErr);
      }
    }

    const { title, subtitle, linkUrl, order, isActive } = req.body;

    let parsedOrder: number | undefined = undefined;
    if (order !== undefined && order !== null && String(order).trim() !== '') {
      const num = Number(order);
      if (isNaN(num)) {
        throw new AppError(400, 'Thứ tự hiển thị (order) phải là số nguyên.');
      }
      parsedOrder = num;
    }

    let parsedIsActive: boolean | undefined = undefined;
    if (isActive !== undefined && isActive !== null && String(isActive).trim() !== '') {
      parsedIsActive = isActive === 'true' || isActive === true || isActive === '1' || isActive === 1;
    }

    const banner = await bannerService.createBanner({
      title,
      subtitle,
      imageUrl,
      linkUrl,
      order: parsedOrder,
      isActive: parsedIsActive,
    });

    res.status(201).json({
      success: true,
      message: 'Thêm banner mới thành công!',
      data: banner,
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

export const getAdminBanners = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await bannerService.getAdminBanners(req.query);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicBanners = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const banners = await bannerService.getPublicBanners();
    res.json({
      success: true,
      data: banners,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-117: GET /admin/banners/:id
 */
export const getBannerById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const banner = await bannerService.getBannerById(req.params.id);
    res.json({
      success: true,
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-117: PATCH /admin/banners/reorder
 */
export const reorderBanners = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.body || (Array.isArray(req.body) && req.body.length === 0)) {
      throw new AppError(400, 'Danh sách thứ tự banner không được để trống.');
    }

    const banners = await bannerService.reorderBanners(req.body);
    res.json({
      success: true,
      message: 'Cập nhật thứ tự banner thành công!',
      data: banners,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-117: PATCH /admin/banners/:id/status
 */
export const updateBannerStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.body.isActive === undefined || req.body.isActive === null || req.body.isActive === '') {
      throw new AppError(400, 'Trường isActive là bắt buộc.');
    }

    const isActive =
      req.body.isActive === true ||
      req.body.isActive === 'true' ||
      req.body.isActive === 1 ||
      req.body.isActive === '1';

    const banner = await bannerService.updateBannerStatus(req.params.id, isActive);
    res.json({
      success: true,
      message: 'Cập nhật trạng thái banner thành công!',
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-117: PATCH /admin/banners/:id (multipart, mọi field và ảnh đều optional)
 */
export const updateBanner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hasFile = Boolean(req.file);
    const bodyKeys = req.body ? Object.keys(req.body) : [];
    if (!hasFile && bodyKeys.length === 0) {
      throw new AppError(400, 'Dữ liệu cập nhật không được để trống.');
    }

    const { title, subtitle, linkUrl, order, isActive, imageUrl } = req.body;

    let parsedOrder: number | undefined = undefined;
    if (order !== undefined && order !== null && String(order).trim() !== '') {
      const num = Number(order);
      if (isNaN(num)) {
        throw new AppError(400, 'Thứ tự hiển thị (order) phải là số nguyên.');
      }
      parsedOrder = num;
    }

    let parsedIsActive: boolean | undefined = undefined;
    if (isActive !== undefined && isActive !== null && String(isActive).trim() !== '') {
      parsedIsActive = isActive === 'true' || isActive === true || isActive === '1' || isActive === 1;
    }

    const banner = await bannerService.updateBanner(
      req.params.id,
      {
        title,
        subtitle,
        linkUrl,
        order: parsedOrder,
        isActive: parsedIsActive,
        imageUrl,
      },
      req.file
    );

    res.json({
      success: true,
      message: 'Cập nhật thông tin banner thành công!',
      data: banner,
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

