import mongoose from 'mongoose';
import { Review, IReview } from '../../models/Review';
import { Vehicle } from '../../models/Vehicle';
import { Booking, IBooking } from '../../models/Booking';
import { AppError } from '../../core/errorHandler';

export interface BookingReviewableResult {
  reviewable: boolean;
  statusCode?: number;
  message?: string;
  booking?: IBooking;
}

let isReplicaSetOrMongos: boolean | null = null;

export async function supportsTransactions(): Promise<boolean> {
  if (isReplicaSetOrMongos !== null) {
    return isReplicaSetOrMongos;
  }
  try {
    const admin = mongoose.connection.db?.admin();
    if (!admin) return false;
    const hello = await admin.command({ hello: 1 });
    isReplicaSetOrMongos = Boolean(hello?.setName || hello?.msg === 'isdbgrid');
    return isReplicaSetOrMongos;
  } catch {
    return false;
  }
}

/**
 * Transaction execution wrapper.
 * Uses a replica set session if available; gracefully falls back if standalone.
 */
export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession | null) => Promise<T>,
  maxRetries = 2
): Promise<T> {
  const canUseTx = await supportsTransactions();

  if (!canUseTx) {
    try {
      return await fn(null);
    } catch (err: any) {
      if (err?.code === 11000 || err?.message?.includes('E11000') || err?.message?.includes('duplicate key')) {
        throw new AppError(409, 'Đơn đặt xe này đã được đánh giá trước đó.');
      }
      throw err;
    }
  }

  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
  } catch {
    session = null;
  }

  if (!session) {
    try {
      return await fn(null);
    } catch (err: any) {
      if (err?.code === 11000 || err?.message?.includes('E11000') || err?.message?.includes('duplicate key')) {
        throw new AppError(409, 'Đơn đặt xe này đã được đánh giá trước đó.');
      }
      throw err;
    }
  }

  // Transactions are supported (Replica Set / Sharded / Atlas)
  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (!session.inTransaction()) {
          session.startTransaction();
        }
        const result = await fn(session);
        await session.commitTransaction();
        return result;
      } catch (error: any) {
        if (session.inTransaction()) {
          try {
            await session.abortTransaction();
          } catch {}
        }

        const isTransient =
          error?.hasErrorLabel?.('TransientTransactionError') ||
          error?.message?.includes('WriteConflict') ||
          error?.message?.includes('retry your operation') ||
          error?.code === 112;

        if (isTransient && attempt < maxRetries) {
          // Brief backoff before retry so the competing transaction finishes
          await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
          continue;
        }

        if (error?.code === 11000 || error?.message?.includes('E11000') || error?.message?.includes('duplicate key')) {
          throw new AppError(409, 'Đơn đặt xe này đã được đánh giá trước đó.');
        }

        throw error;
      }
    }
    throw new Error('Transaction failed after retries.');
  } finally {
    await session.endSession();
  }
}

/**
 * Checks whether a booking is eligible for a review by the current user.
 * Stub implementation (Ownership + Completed status check).
 * TODO: Replace with UC-57 integration when complete.
 */
export async function isBookingReviewable(
  bookingId: string | mongoose.Types.ObjectId,
  userId: string | mongoose.Types.ObjectId,
  session?: mongoose.ClientSession | null
): Promise<BookingReviewableResult> {
  const query = Booking.findById(bookingId);
  if (session) query.session(session);
  const booking = await query;

  if (!booking) {
    return {
      reviewable: false,
      statusCode: 404,
      message: 'Không tìm thấy thông tin đơn đặt xe.',
    };
  }

  // IDOR check: booking belongs to current user (return 404 to avoid enumeration)
  if (booking.userId.toString() !== userId.toString()) {
    return {
      reviewable: false,
      statusCode: 404,
      message: 'Không tìm thấy thông tin đơn đặt xe.',
    };
  }

  // Booking must be Completed
  if (booking.status !== 'Completed') {
    return {
      reviewable: false,
      statusCode: 400,
      message: 'Chỉ có thể đánh giá cho chuyến xe đã hoàn thành.',
    };
  }

  return {
    reviewable: true,
    booking,
  };
}

/**
 * Recalculate averageRating and reviewCount of a Vehicle in the given session.
 */
export async function recalculateVehicleRating(
  vehicleId: string | mongoose.Types.ObjectId,
  session: mongoose.ClientSession | null
): Promise<{ averageRating: number; reviewCount: number }> {
  const query = Review.find({ vehicleId, deletedAt: null });
  if (session) query.session(session);
  const activeReviews = await query;

  const reviewCount = activeReviews.length;
  const sum = activeReviews.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = reviewCount > 0 ? Math.round((sum / reviewCount) * 100) / 100 : 0;

  const updateQuery = Vehicle.findByIdAndUpdate(
    vehicleId,
    { averageRating, reviewCount },
    { new: true }
  );
  if (session) updateQuery.session(session);
  await updateQuery;

  return { averageRating, reviewCount };
}

/**
 * Format user display name for public review responses (e.g., "Nguyen V.")
 * Strips email and phone number completely.
 */
export function formatPublicDisplayName(user: any): string {
  if (!user) return 'Khách hàng';
  const lastName = (user.lastName || '').trim();
  const firstName = (user.firstName || '').trim();

  if (lastName && firstName) {
    return `${lastName} ${firstName.charAt(0).toUpperCase()}.`;
  }
  if (lastName) return lastName;
  if (firstName) return firstName;
  if (user.username) {
    const u = user.username.trim();
    if (u.length <= 4) return u;
    return `${u.slice(0, 3)}***`;
  }
  return 'Khách hàng';
}

export interface CreateReviewParams {
  bookingId: string;
  userId: string;
  rating: number;
  comment?: string;
  photos?: string[];
}

export async function createReview(params: CreateReviewParams): Promise<IReview> {
  const { bookingId, userId, rating, comment, photos = [] } = params;

  // Rating validation: integer between 1 and 5
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError(400, 'Điểm đánh giá phải là số nguyên từ 1 đến 5 sao.');
  }

  // Comment validation: max 1000 characters
  const trimmedComment = typeof comment === 'string' ? comment.trim() : '';
  if (trimmedComment.length > 1000) {
    throw new AppError(400, 'Nội dung nhận xét không được vượt quá 1000 ký tự.');
  }

  // Photos validation: max 5 photos
  if (!Array.isArray(photos) || photos.length > 5) {
    throw new AppError(400, 'Số lượng ảnh đánh giá tối đa là 5 ảnh.');
  }

  return await withTransaction(async (session) => {
    // 1. Verify booking is reviewable
    const check = await isBookingReviewable(bookingId, userId, session);
    if (!check.reviewable || !check.booking) {
      throw new AppError(check.statusCode || 400, check.message || 'Không thể đánh giá chuyến xe.');
    }

    // 2. Check if review already exists for this booking (including soft-deleted)
    const reviewQuery = Review.findOne({ bookingId });
    if (session) reviewQuery.session(session);
    const existing = await reviewQuery;
    if (existing) {
      throw new AppError(409, 'Đơn đặt xe này đã được đánh giá trước đó.');
    }

    // 3. Extract vehicleId directly from the booking (never trust client)
    const vehicleId = check.booking.vehicleId;

    // 4. Create and persist review
    try {
      const reviewDoc = new Review({
        bookingId,
        userId,
        vehicleId,
        rating,
        comment: trimmedComment,
        photos,
        deletedAt: null,
      });

      if (session) {
        await reviewDoc.save({ session });
      } else {
        await reviewDoc.save();
      }

      // 5. Recalculate vehicle ratings within the same transaction
      await recalculateVehicleRating(vehicleId, session);

      return reviewDoc;
    } catch (err: any) {
      if (err && (err.code === 11000 || err.message?.includes('E11000'))) {
        throw new AppError(409, 'Đơn đặt xe này đã được đánh giá trước đó.');
      }
      throw err;
    }
  });
}

export interface UpdateReviewParams {
  reviewId: string;
  userId: string;
  rating?: number;
  comment?: string;
  photos?: string[];
  existingPhotos?: string[];
}

export async function updateReview(params: UpdateReviewParams): Promise<IReview> {
  const { reviewId, userId, rating, comment, photos, existingPhotos } = params;

  if (rating !== undefined) {
    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new AppError(400, 'Điểm đánh giá phải là số nguyên từ 1 đến 5 sao.');
    }
  }

  if (comment !== undefined && typeof comment === 'string') {
    if (comment.trim().length > 1000) {
      throw new AppError(400, 'Nội dung nhận xét không được vượt quá 1000 ký tự.');
    }
  }

  return await withTransaction(async (session) => {
    // 1. Find active review
    const query = Review.findOne({ _id: reviewId, deletedAt: null });
    if (session) query.session(session);
    const review = await query;

    if (!review) {
      throw new AppError(404, 'Không tìm thấy đánh giá hoặc đánh giá đã bị xóa.');
    }

    // 2. IDOR check
    if (review.userId.toString() !== userId.toString()) {
      throw new AppError(404, 'Không tìm thấy đánh giá.');
    }

    // 3. Update rating & comment
    if (rating !== undefined) {
      review.rating = rating;
    }
    if (comment !== undefined) {
      review.comment = comment.trim();
    }

    // 4. Update photos (support removing existing and adding new)
    if (photos !== undefined || existingPhotos !== undefined) {
      let finalPhotos: string[] = [];

      if (existingPhotos !== undefined) {
        // Keep only existing photos that were originally in review.photos
        finalPhotos = existingPhotos.filter((p) => review.photos.includes(p));
      } else {
        finalPhotos = [...review.photos];
      }

      if (photos !== undefined && Array.isArray(photos)) {
        finalPhotos = [...finalPhotos, ...photos];
      }

      if (finalPhotos.length > 5) {
        throw new AppError(400, 'Số lượng ảnh đánh giá tối đa không được vượt quá 5 ảnh.');
      }

      review.photos = finalPhotos;
    }

    // 5. Save changes
    if (session) {
      await review.save({ session });
    } else {
      await review.save();
    }

    // 6. Recalculate vehicle ratings within the same transaction
    await recalculateVehicleRating(review.vehicleId, session);

    return review;
  });
}

export interface DeleteReviewParams {
  reviewId: string;
  userId: string;
}

export async function deleteReview(params: DeleteReviewParams): Promise<void> {
  const { reviewId, userId } = params;

  await withTransaction(async (session) => {
    // 1. Find active review
    const query = Review.findOne({ _id: reviewId, deletedAt: null });
    if (session) query.session(session);
    const review = await query;

    if (!review) {
      throw new AppError(404, 'Không tìm thấy đánh giá hoặc đánh giá đã bị xóa.');
    }

    // 2. IDOR check
    if (review.userId.toString() !== userId.toString()) {
      throw new AppError(404, 'Không tìm thấy đánh giá.');
    }

    // 3. Soft delete
    review.deletedAt = new Date();
    if (session) {
      await review.save({ session });
    } else {
      await review.save();
    }

    // 4. Recalculate vehicle ratings within the same transaction
    await recalculateVehicleRating(review.vehicleId, session);
  });
}

export interface GetVehicleReviewsParams {
  vehicleId: string;
  page?: number;
  limit?: number;
}

export async function getVehicleReviews(params: GetVehicleReviewsParams) {
  const { vehicleId } = params;
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params.limit) || 10));
  const skip = (page - 1) * limit;

  const filter = { vehicleId, deletedAt: null };

  const [total, reviews, vehicle] = await Promise.all([
    Review.countDocuments(filter),
    Review.find(filter)
      .populate('userId', 'firstName lastName username avatarUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Vehicle.findById(vehicleId).select('averageRating reviewCount vehicleModel brand').lean(),
  ]);

  // Aggregate star breakdown (1 to 5)
  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const allRatings = await Review.find(filter).select('rating').lean();
  for (const r of allRatings) {
    if (r.rating >= 1 && r.rating <= 5) {
      breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
    }
  }

  // Format reviews with sanitized user info (NO email, NO phone)
  const sanitizedReviews = reviews.map((r: any) => ({
    _id: r._id,
    bookingId: r.bookingId,
    vehicleId: r.vehicleId,
    rating: r.rating,
    comment: r.comment || '',
    photos: r.photos || [],
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    user: {
      _id: r.userId?._id,
      displayName: formatPublicDisplayName(r.userId),
      avatarUrl: r.userId?.avatarUrl || '',
    },
  }));

  return {
    reviews: sanitizedReviews,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    vehicleStats: {
      averageRating: vehicle?.averageRating || 0,
      reviewCount: vehicle?.reviewCount || 0,
      starBreakdown: breakdown,
    },
  };
}

export async function getMyReviews(userId: string) {
  const reviews = await Review.find({ userId, deletedAt: null })
    .populate('vehicleId', 'vehicleModel brand licensePlate images dailyPrice averageRating reviewCount')
    .populate('bookingId', 'bookingCode pickupDateTime returnDateTime status')
    .sort({ createdAt: -1 })
    .lean();

  return reviews;
}
