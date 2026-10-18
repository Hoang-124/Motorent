import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import * as wishlistController from './wishlistController';

const router = Router();

// Tất cả các route wishlist yêu cầu xác thực JWT (Customer role)
router.use(authenticateJWT, authorize('Customer', 'BranchManager', 'Staff', 'SystemAdmin'));

// GET /api/wishlist/ids - Lấy mảng vehicleId trong wishlist
router.get('/ids', wishlistController.getWishlistIds);

// GET /api/wishlist - Lấy danh sách xe yêu thích có phân trang
router.get('/', wishlistController.getWishlist);

// POST /api/wishlist/:vehicleId - Thêm xe vào danh sách yêu thích (idempotent)
router.post('/:vehicleId', wishlistController.addToWishlist);

// DELETE /api/wishlist/:vehicleId - Xóa xe khỏi danh sách yêu thích (idempotent, 204)
router.delete('/:vehicleId', wishlistController.removeFromWishlist);

export default router;
