import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import * as wishlistService from './wishlistService';
import { AppError } from '../../core/errorHandler';

/**
 * POST /api/wishlist/:vehicleId
 * Customer adds a vehicle to wishlist (idempotent)
 */
export async function addToWishlist(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const { vehicleId } = req.params;
    const item = await wishlistService.addToWishlist(userId.toString(), vehicleId);

    res.status(200).json({
      success: true,
      message: 'Đã thêm phương tiện vào danh sách yêu thích.',
      data: item,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/wishlist/:vehicleId
 * Customer removes a vehicle from wishlist (idempotent, returns 204)
 */
export async function removeFromWishlist(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const { vehicleId } = req.params;
    await wishlistService.removeFromWishlist(userId.toString(), vehicleId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/wishlist?page&limit
 * Customer fetches their paginated wishlist with vehicle details and isAvailable flag
 */
export async function getWishlist(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const data = await wishlistService.getWishlist({
      userId: userId.toString(),
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/wishlist/ids
 * Customer fetches only the list of vehicle IDs in their wishlist (for card heart states)
 */
export async function getWishlistIds(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const ids = await wishlistService.getWishlistIds(userId.toString());

    res.status(200).json({
      success: true,
      data: ids,
    });
  } catch (error) {
    next(error);
  }
}
