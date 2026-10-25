import { Request, Response, NextFunction } from 'express';
import { Discount, AuditLog } from '../../models';
import { AuthenticatedRequest } from '../../core/authMiddleware';

/**
 * Get all discounts with optional filtering (Admin / Manager / Staff)
 */
export const getDiscounts = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { activeOnly, search } = req.query;
    const query: Record<string, any> = {};

    if (activeOnly === 'true') {
      const now = new Date();
      query.isActive = true;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
      query.$expr = { $lt: ['$usedCount', '$usageLimit'] };
    }

    if (search) {
      const searchStr = String(search).trim();
      query.$or = [
        { code: { $regex: searchStr, $options: 'i' } },
        { description: { $regex: searchStr, $options: 'i' } },
      ];
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
      entityType: 'Discount',
      entityId: newDiscount._id,
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
      entityType: 'Discount',
      entityId: discount._id,
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
      entityType: 'Discount',
      entityId: id as any,
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
    let discountAmount = Math.round((amount * discount.discountPercent) / 100);
    if (discount.maxDiscountAmount && discount.maxDiscountAmount > 0 && discountAmount > discount.maxDiscountAmount) {
      discountAmount = discount.maxDiscountAmount;
    }

    res.json({
      success: true,
      message: `Áp dụng thành công mã ${discount.code}: Giảm ${discount.discountPercent}%!`,
      data: {
        code: discount.code,
        discountPercent: discount.discountPercent,
        discountAmount,
        maxDiscountAmount: discount.maxDiscountAmount,
        description: discount.description,
      },
    });
  } catch (error) {
    next(error);
  }
};
