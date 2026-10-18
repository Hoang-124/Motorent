import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import * as bookingService from './bookingService';
import { AppError } from '../../core/errorHandler';

const createBookingSchema = z.object({
  vehicleId: z.string().min(1, 'Thiếu ID phương tiện'),
  pickupBranchId: z.string().min(1, 'Thiếu ID chi nhánh nhận xe'),
  returnBranchId: z.string().min(1, 'Thiếu ID chi nhánh trả xe'),
  pickupDateTime: z.string().min(1, 'Thiếu thời gian nhận xe'),
  returnDateTime: z.string().min(1, 'Thiếu thời gian trả xe'),
  paymentMethod: z.enum(['Banking', 'Cash']).default('Banking'),
  discountCode: z.string().trim().optional(),
});

const estimateBookingSchema = z.object({
  vehicleId: z.string().min(1, 'Thiếu ID phương tiện'),
  pickupBranchId: z.string().min(1, 'Thiếu ID chi nhánh nhận xe'),
  returnBranchId: z.string().min(1, 'Thiếu ID chi nhánh trả xe'),
  pickupDateTime: z.string().min(1, 'Thiếu thời gian nhận xe'),
  returnDateTime: z.string().min(1, 'Thiếu thời gian trả xe'),
  discountCode: z.string().trim().optional(),
});

const checkinSchema = z.object({
  startOdometer: z.coerce.number().min(0, 'Chỉ số ODO phải là số không âm'),
  startFuelLevel: z.union([z.string(), z.number()]).optional().transform((v) => v !== undefined ? String(v) : undefined),
  checkinImages: z.array(z.string()).optional(),
  eSignatureUrl: z.string().optional(),
});

const checkoutSchema = z.object({
  endOdometer: z.coerce.number().min(0, 'Chỉ số ODO phải là số không âm'),
  endFuelLevel: z.union([z.string(), z.number()]).optional().transform((v) => v !== undefined ? String(v) : undefined),
  checkoutImages: z.array(z.string()).optional(),
  damageFee: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  returnNotes: z.string().optional(),
});

const cancelSchema = z.object({
  cancelReason: z.string().trim().optional(),
});

export const createBooking = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Vui lòng đăng nhập để tiến hành đặt giữ xe.');
    }

    const data = createBookingSchema.parse(req.body);
    const booking = await bookingService.createBooking(req.user._id.toString(), data);

    res.status(201).json({
      success: true,
      message: 'Đặt giữ xe thành công! Vui lòng hoàn tất cọc 30% để xác nhận đơn.',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

export const estimateBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = estimateBookingSchema.parse(req.body);
    const estimate = await bookingService.estimateBooking(data);

    res.json({
      success: true,
      data: estimate,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyBookings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const bookings = await bookingService.getMyBookings(req.user._id.toString());
    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

export const getBranchBookings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;
    const bookings = await bookingService.getBranchBookings(req.user, statusFilter);

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingByCode = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const booking = await bookingService.getBookingByCode(req.params.code, req.user);
    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const booking = await bookingService.getBookingById(req.params.id, req.user);
    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

export const checkin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập nhân sự.');
    }

    const data = checkinSchema.parse(req.body);
    const updated = await bookingService.checkinBooking(req.params.id, req.user, data);

    res.json({
      success: true,
      message: 'Check-in bàn giao xe thành công! Hợp đồng đã chuyển sang trạng thái lưu thông.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const checkout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập nhân sự.');
    }

    const data = checkoutSchema.parse(req.body);
    const result = await bookingService.checkoutBooking(req.params.id, req.user, data);

    res.json({
      success: true,
      message: 'Check-out thu hồi xe và tất toán thành công!',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const cancel = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const { cancelReason } = cancelSchema.parse(req.body || {});
    const cancelled = await bookingService.cancelBooking(req.params.id, req.user, cancelReason);
    const policyNotice = (cancelled as unknown as { policySummary?: { policyNotice?: string } })
      .policySummary?.policyNotice;

    res.json({
      success: true,
      message: policyNotice || 'Đã hủy đơn đặt xe thành công.',
      data: cancelled,
    });
  } catch (error) {
    next(error);
  }
};

const counterPaySchema = z.object({
  amount: z.coerce.number().min(1, 'Số tiền thanh toán phải lớn hơn 0'),
  notes: z.string().optional(),
});

export const counterPay = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập nhân sự.');
    }

    const data = counterPaySchema.parse(req.body);
    const updated = await bookingService.recordCounterPayment(req.params.id, req.user, data.amount, data.notes);

    res.json({
      success: true,
      message: 'Ghi nhận thanh toán tiền mặt/POS tại quầy thành công!',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

const recordDamageSchema = z.object({
  description: z.string().min(1, 'Vui lòng nhập mô tả chi tiết hư hại'),
  damageFee: z.coerce.number().min(0, 'Chi phí bồi thường hư hại không thể là số âm'),
  photos: z.array(z.string()).optional(),
  severity: z.enum(['Minor', 'Moderate', 'Severe']).optional(),
  partsReplaced: z.array(z.string()).optional(),
});

export const recordDamage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập nhân sự.');
    }

    const data = recordDamageSchema.parse(req.body);
    const updated = await bookingService.recordBookingDamage(req.params.id, req.user, data);

    res.json({
      success: true,
      message: 'Ghi nhận hư hỏng phương tiện và cập nhật chi phí bồi thường thành công!',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

