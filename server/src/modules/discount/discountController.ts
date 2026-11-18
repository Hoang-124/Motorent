import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Discount, AuditLog } from '../../models';
import { UserRole } from '../../models/User';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import { env } from '../../config/env';

const escapeRegex = (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractOptionalJwtAuth = (req: Request): { userId?: string; role?: UserRole } => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {};
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return {};
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId?: unknown; role?: UserRole };
    return {
      userId: typeof decoded.userId === 'string' ? decoded.userId : undefined,
      role: decoded.role,
    };
  } catch {
    return {};
  }
};

const isPrivateLoyaltyDiscount = (discount: {
  code?: string;
  isLoyaltyVoucher?: boolean;
  ownerUserId?: unknown;
}): boolean =>
  Boolean(
    discount.isLoyaltyVoucher ||
      discount.ownerUserId ||
      (discount.code && /^LOYALTY-/i.test(discount.code))
  );

/**
 * Get all discounts with optional filtering (Admin / Manager / Staff / Public)
 */
export const getDiscounts = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { activeOnly, search } = req.query;
    const query: Record<string, unknown> = {};
    const andConditions: Record<string, unknown>[] = [];
    const optionalAuth = extractOptionalJwtAuth(req);
    const isSystemAdmin = req.user?.roles === 'SystemAdmin' || optionalAuth.role === 'SystemAdmin';

    if (activeOnly === 'true') {
      const now = new Date();
      query.isActive = true;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
      query.$expr = { $lt: ['$usedCount', '$usageLimit'] };
    }

    if (activeOnly === 'true' || !isSystemAdmin) {
      andConditions.push({
        isLoyaltyVoucher: { $ne: true },
        code: { $not: /^LOYALTY-/i },
        $or: [{ ownerUserId: { $exists: false } }, { ownerUserId: null }],
      });
    }

    if (search) {
      const escapedSearch = escapeRegex(String(search).trim());
      if (escapedSearch) {
        andConditions.push({
          $or: [
            { code: { $regex: escapedSearch, $options: 'i' } },
            { description: { $regex: escapedSearch, $options: 'i' } },
          ],
        });
      }
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const discounts = await Discount.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: discounts.length,
      data: discounts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single discount by ID or Code
 */
export const getDiscountById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const discount = await Discount.findById(id);

    if (!discount) {
      res.status(404).json({ success: false, message: 'Không tìm thấy mã giảm giá.' });
      return;
    }

    if (isPrivateLoyaltyDiscount(discount)) {
      const auth = extractOptionalJwtAuth(req);
      const isOwner = Boolean(
        auth.userId && discount.ownerUserId && String(discount.ownerUserId) === String(auth.userId)
      );
      if (auth.role !== 'SystemAdmin' && !isOwner) {
        res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập mã voucher đổi điểm cá nhân này.',
        });
        return;
      }
    }

    res.json({ success: true, data: discount });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new discount code (UC-110)
 * Role: SystemAdmin
 */
export const createDiscount = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      code,
      description,
      discountPercent,
      maxDiscountAmount,
      minBookingAmount,
      startDate,
      endDate,
      usageLimit,
      isActive,
    } = req.body;

    if (!code || !discountPercent || !startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng điền các trường bắt buộc: mã code, tỷ lệ giảm (%), ngày bắt đầu và ngày kết thúc.',
      });
      return;
    }

    const formattedCode = String(code).trim().toUpperCase();

    // Check code uniqueness
    const existing = await Discount.findOne({ code: formattedCode });
    if (existing) {
      res.status(409).json({ success: false, message: `Mã giảm giá "${formattedCode}" đã tồn tại.` });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      res.status(400).json({ success: false, message: 'Ngày kết thúc phải sau ngày bắt đầu.' });
      return;
    }

    const newDiscount = await Discount.create({
      code: formattedCode,
      description: description || '',
      discountPercent: Number(discountPercent),
      maxDiscountAmount: Number(maxDiscountAmount) || 0,
      minBookingAmount: Number(minBookingAmount) || 0,
      startDate: start,
      endDate: end,
      usageLimit: Number(usageLimit) || 100,
      usedCount: 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    await AuditLog.create({
      userId: req.user?._id,
      action: 'CREATE_DISCOUNT',
      entity: 'Discount',
      entityId: String(newDiscount._id),
      details: {
        code: formattedCode,
        discountPercent: newDiscount.discountPercent,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: `Khởi tạo mã giảm giá ${formattedCode} thành công.`,
      data: newDiscount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing discount (UC-111)
 * Role: SystemAdmin
 */
export const updateDiscount = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      code,
      description,
      discountPercent,
      maxDiscountAmount,
      minBookingAmount,
      startDate,
      endDate,
      usageLimit,
      isActive,
    } = req.body;

    const discount = await Discount.findById(id);
    if (!discount) {
      res.status(404).json({ success: false, message: 'Không tìm thấy mã giảm giá.' });
      return;
    }

    if (code) {
      const formattedCode = String(code).trim().toUpperCase();
      if (formattedCode !== discount.code) {
        const existing = await Discount.findOne({ code: formattedCode, _id: { $ne: id } });
        if (existing) {
          res.status(409).json({ success: false, message: `Mã code "${formattedCode}" đã được sử dụng.` });
          return;
        }
        discount.code = formattedCode;
      }
    }

    if (description !== undefined) discount.description = description;
    if (discountPercent !== undefined) discount.discountPercent = Number(discountPercent);
    if (maxDiscountAmount !== undefined) discount.maxDiscountAmount = Number(maxDiscountAmount);
    if (minBookingAmount !== undefined) discount.minBookingAmount = Number(minBookingAmount);
    if (startDate) discount.startDate = new Date(startDate);
    if (endDate) discount.endDate = new Date(endDate);
    if (usageLimit !== undefined) discount.usageLimit = Number(usageLimit);
    if (isActive !== undefined) discount.isActive = Boolean(isActive);

    await discount.save();

    await AuditLog.create({
      userId: req.user?._id,
      action: 'UPDATE_DISCOUNT',
      entity: 'Discount',
      entityId: String(discount._id),
      details: { code: discount.code, isActive: discount.isActive },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Cập nhật mã giảm giá thành công.',
      data: discount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete discount (UC-112)
 * Role: SystemAdmin
 */
export const deleteDiscount = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const discount = await Discount.findById(id);
    if (!discount) {
      res.status(404).json({ success: false, message: 'Không tìm thấy mã giảm giá.' });
      return;
    }

    await Discount.findByIdAndDelete(id);

    await AuditLog.create({
      userId: req.user?._id,
      action: 'DELETE_DISCOUNT',
      entity: 'Discount',
      entityId: String(id),
      details: { code: discount.code },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Đã xóa mã giảm giá ${discount.code}.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate discount code for booking (Public / Checkout / Counter)
 */
export const validateDiscount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, bookingAmount } = req.body;

    if (!code) {
      res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá.' });
      return;
    }

    const formattedCode = String(code).trim().toUpperCase();
    const discount = await Discount.findOne({ code: formattedCode });

    if (!discount) {
      res.status(404).json({ success: false, message: 'Mã giảm giá không tồn tại.' });
      return;
    }

    if (isPrivateLoyaltyDiscount(discount)) {
      const auth = extractOptionalJwtAuth(req);
      const isOwner = Boolean(
        auth.userId && discount.ownerUserId && String(discount.ownerUserId) === String(auth.userId)
      );
      if (!isOwner) {
        res.status(403).json({
          success: false,
          message: 'Mã voucher đổi điểm này chỉ thuộc quyền sử dụng của tài khoản chủ sở hữu.',
        });
        return;
      }
    }

    if (!discount.isActive) {
      res.status(400).json({ success: false, message: 'Mã giảm giá này đã tạm ngưng áp dụng.' });
      return;
    }

    const now = new Date();
    if (now < discount.startDate) {
      res.status(400).json({ success: false, message: 'Chương trình khuyến mãi chưa bắt đầu.' });
      return;
    }

    if (now > discount.endDate) {
      res.status(400).json({ success: false, message: 'Mã giảm giá đã hết hạn sử dụng.' });
      return;
    }

    if (discount.usedCount >= discount.usageLimit) {
      res.status(400).json({ success: false, message: 'Mã giảm giá đã hết lượt sử dụng.' });
      return;
    }

    const amount = Number(bookingAmount) || 0;
    if (discount.minBookingAmount && amount < discount.minBookingAmount) {
      res.status(400).json({
        success: false,
        message: `Đơn hàng tối thiểu ${discount.minBookingAmount.toLocaleString('vi-VN')} VND để áp dụng mã này.`,
      });
      return;
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.fixedDiscountAmount && discount.fixedDiscountAmount > 0) {
      discountAmount = Math.min(amount, discount.fixedDiscountAmount);
    } else {
      discountAmount = Math.round((amount * discount.discountPercent) / 100);
      if (discount.maxDiscountAmount && discount.maxDiscountAmount > 0 && discountAmount > discount.maxDiscountAmount) {
        discountAmount = discount.maxDiscountAmount;
      }
    }

    const benefitLabel =
      discount.fixedDiscountAmount && discount.fixedDiscountAmount > 0
        ? `Giảm ${discount.fixedDiscountAmount.toLocaleString('vi-VN')} VND!`
        : `Giảm ${discount.discountPercent}%!`;

    res.json({
      success: true,
      message: `Áp dụng thành công mã ${discount.code}: ${benefitLabel}`,
      data: {
        code: discount.code,
        discountPercent: discount.discountPercent,
        fixedDiscountAmount: discount.fixedDiscountAmount,
        discountAmount,
        maxDiscountAmount: discount.maxDiscountAmount,
        description: discount.description,
      },
    });
  } catch (error) {
    next(error);
  }
};
