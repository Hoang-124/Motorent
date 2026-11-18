import fs from 'fs';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import { validateImageMagicBytes } from '../../core/uploadMiddleware';
import { isCloudinaryConfigured, uploadFileToCloudinary } from '../../config/cloudinary';
import * as reviewService from './reviewService';
import { AppError } from '../../core/errorHandler';

const isAllowedPhotoReference = (url: string): boolean => {
  const trimmed = url.trim();
  return trimmed.startsWith('/uploads/') || /^https:\/\//i.test(trimmed);
};

const cleanupUploadedReviewFiles = async (req: AuthenticatedRequest): Promise<void> => {
  if (!req.files || !Array.isArray(req.files)) return;
  for (const file of req.files as Express.Multer.File[]) {
    if (file.path && fs.existsSync(file.path)) {
      await fs.promises.unlink(file.path).catch(() => {});
    }
  }
};

/**
 * Helper to validate & extract photo URLs from Multer files and body
 */
async function extractUploadedPhotoUrls(req: AuthenticatedRequest): Promise<string[]> {
  const photoUrls: string[] = [];

  if (req.files && Array.isArray(req.files)) {
    for (const f of req.files as Express.Multer.File[]) {
      const validMagic = await validateImageMagicBytes(f.path);
      if (!validMagic) {
        throw new AppError(400, 'Tệp ảnh đánh giá tải lên không hợp lệ hoặc bị hỏng.');
      }

      let resolvedUrl = `/uploads/${f.filename}`;
      if (isCloudinaryConfigured()) {
        try {
          const uploaded = await uploadFileToCloudinary(f.path, {
            folder: 'motorent/reviews',
            type: 'upload',
          });
          resolvedUrl = uploaded.secureUrl;
        } catch {
          // Keep local /uploads fallback when Cloudinary is unreachable
        }
      }
      photoUrls.push(resolvedUrl);
    }
  }

  if (req.body.photos) {
    const pushIfSafe = (candidate: unknown) => {
      if (typeof candidate === 'string' && isAllowedPhotoReference(candidate)) {
        photoUrls.push(candidate.trim());
      }
    };
    if (Array.isArray(req.body.photos)) {
      req.body.photos.forEach(pushIfSafe);
    } else if (typeof req.body.photos === 'string') {
      try {
        const parsed: unknown = JSON.parse(req.body.photos);
        if (Array.isArray(parsed)) {
          parsed.forEach(pushIfSafe);
        } else {
          pushIfSafe(req.body.photos);
        }
      } catch {
        pushIfSafe(req.body.photos);
      }
    }
  }

  return photoUrls;
}

/**
 * POST /api/bookings/:bookingId/reviews
 * Creates a review for a completed booking (Customer only)
 */
export async function createReview(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { bookingId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const rawRating = req.body.rating !== undefined ? Number(req.body.rating) : undefined;
    if (rawRating === undefined || isNaN(rawRating)) {
      throw new AppError(400, 'Điểm đánh giá (rating) là bắt buộc và phải là số nguyên từ 1 đến 5 sao.');
    }

    const comment = typeof req.body.comment === 'string' ? req.body.comment : '';
    const photos = await extractUploadedPhotoUrls(req);

    const review = await reviewService.createReview({
      bookingId,
      userId: userId.toString(),
      rating: rawRating,
      comment,
      photos,
    });

    res.status(201).json({
      success: true,
      message: 'Tạo đánh giá thành công.',
      data: review,
    });
  } catch (error) {
    await cleanupUploadedReviewFiles(req);
    next(error);
  }
}

/**
 * PATCH /api/reviews/:id
 * Updates an existing review (Author only)
 */
export async function updateReview(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reviewId = req.params.id;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    let rating: number | undefined;
    if (req.body.rating !== undefined) {
      rating = Number(req.body.rating);
      if (isNaN(rating)) {
        throw new AppError(400, 'Điểm đánh giá (rating) phải là số nguyên từ 1 đến 5.');
      }
    }

    const comment = typeof req.body.comment === 'string' ? req.body.comment : undefined;

    // Handle existing photos to keep
    let existingPhotos: string[] | undefined;
    if (req.body.existingPhotos !== undefined) {
      const keepSafe = (items: unknown[]) =>
        items
          .filter((p: unknown): p is string => typeof p === 'string' && isAllowedPhotoReference(p))
          .map((p) => p.trim());

      if (Array.isArray(req.body.existingPhotos)) {
        existingPhotos = keepSafe(req.body.existingPhotos);
      } else if (typeof req.body.existingPhotos === 'string') {
        try {
          const parsed: unknown = JSON.parse(req.body.existingPhotos);
          if (Array.isArray(parsed)) {
            existingPhotos = keepSafe(parsed);
          } else {
            existingPhotos = keepSafe([req.body.existingPhotos]);
          }
        } catch {
          existingPhotos = keepSafe([req.body.existingPhotos]);
        }
      }
    }

    // Validate & extract new uploaded files
    const newPhotos: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (const f of req.files as Express.Multer.File[]) {
        const validMagic = await validateImageMagicBytes(f.path);
        if (!validMagic) {
          throw new AppError(400, 'Tệp ảnh đánh giá tải lên không hợp lệ hoặc bị hỏng.');
        }

        let resolvedUrl = `/uploads/${f.filename}`;
        if (isCloudinaryConfigured()) {
          try {
            const uploaded = await uploadFileToCloudinary(f.path, {
              folder: 'motorent/reviews',
              type: 'upload',
            });
            resolvedUrl = uploaded.secureUrl;
          } catch {
            // Keep local /uploads fallback when Cloudinary is unreachable
          }
        }
        newPhotos.push(resolvedUrl);
      }
    }

    const updated = await reviewService.updateReview({
      reviewId,
      userId: userId.toString(),
      rating,
      comment,
      photos: newPhotos.length > 0 ? newPhotos : undefined,
      existingPhotos,
    });

    res.status(200).json({
      success: true,
      message: 'Cập nhật đánh giá thành công.',
      data: updated,
    });
  } catch (error) {
    await cleanupUploadedReviewFiles(req);
    next(error);
  }
}

/**
 * DELETE /api/reviews/:id
 * Soft deletes a review (Author only)
 */
export async function deleteReview(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reviewId = req.params.id;
    const userId = req.user?._id;

    if (!userId) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    await reviewService.deleteReview({
      reviewId,
      userId: userId.toString(),
    });

    res.status(200).json({
      success: true,
      message: 'Xóa đánh giá thành công.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/vehicles/:vehicleId/reviews
 * Public endpoint to view reviews for a vehicle (newest first, paginated)
 */
export async function getVehicleReviews(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { vehicleId } = req.params;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const result = await reviewService.getVehicleReviews({
      vehicleId,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/me/reviews
 * Returns reviews written by the currently logged-in customer
 */
export async function getMyReviews(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const reviews = await reviewService.getMyReviews(userId.toString());

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
}
