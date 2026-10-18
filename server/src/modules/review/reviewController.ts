import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import * as reviewService from './reviewService';
import { AppError } from '../../core/errorHandler';

/**
 * Helper to extract photo URLs from Multer files and body
 */
function extractUploadedPhotoUrls(req: AuthenticatedRequest): string[] {
  const photoUrls: string[] = [];

  // Files from multer
  if (req.files && Array.isArray(req.files)) {
    for (const f of req.files as Express.Multer.File[]) {
      photoUrls.push(`/uploads/${f.filename}`);
    }
  }

  // URLs from body (if passed as array or JSON string)
  if (req.body.photos) {
    if (Array.isArray(req.body.photos)) {
      photoUrls.push(...req.body.photos.filter((p: any) => typeof p === 'string'));
    } else if (typeof req.body.photos === 'string') {
      try {
        const parsed = JSON.parse(req.body.photos);
        if (Array.isArray(parsed)) {
          photoUrls.push(...parsed.filter((p: any) => typeof p === 'string'));
        } else {
          photoUrls.push(req.body.photos);
        }
      } catch {
        photoUrls.push(req.body.photos);
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
    const photos = extractUploadedPhotoUrls(req);

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
      if (Array.isArray(req.body.existingPhotos)) {
        existingPhotos = req.body.existingPhotos.filter((p: any) => typeof p === 'string');
      } else if (typeof req.body.existingPhotos === 'string') {
        try {
          const parsed = JSON.parse(req.body.existingPhotos);
          if (Array.isArray(parsed)) {
            existingPhotos = parsed.filter((p: any) => typeof p === 'string');
          } else {
            existingPhotos = [req.body.existingPhotos];
          }
        } catch {
          existingPhotos = [req.body.existingPhotos];
        }
      }
    }

    // New uploaded files
    const newPhotos: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (const f of req.files as Express.Multer.File[]) {
        newPhotos.push(`/uploads/${f.filename}`);
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
