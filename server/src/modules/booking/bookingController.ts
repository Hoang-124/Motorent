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

    const { status, page, limit, search } = req.query;

    const result = await bookingService.getMyBookings(req.user._id.toString(), {
      status: typeof status === 'string' ? status : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      search: typeof search === 'string' ? search : undefined,
    });

    res.json({
      success: true,
      count: result.bookings.length,
      data: result.bookings,
      pagination: result.pagination,
      counts: result.counts,
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

    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const queue = typeof req.query.queue === 'string' ? (req.query.queue as 'all' | 'today') : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : undefined;
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;

    const result = await bookingService.getBranchBookings(req.user, {
      status,
      queue,
      search,
      branchId,
      page,
      limit,
    });

    res.json({
      success: true,
      count: result.bookings.length,
      data: result.bookings,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        counts: result.counts,
      },
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

const extendSchema = z.object({
  newReturnDateTime: z.string().min(1, 'Vui lòng chọn thời gian trả xe mới.'),
});

export const estimateExtension = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const data = extendSchema.parse(req.body);
    const estimate = await bookingService.estimateBookingExtension(req.params.id, req.user, data);

    res.json({
      success: true,
      message: 'Ước tính chi phí gia hạn thành công.',
      data: estimate,
    });
  } catch (error) {
    next(error);
  }
};

export const extend = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const data = extendSchema.parse(req.body);
    const updated = await bookingService.extendBooking(req.params.id, req.user, data);

    res.json({
      success: true,
      message: 'Gia hạn thời gian thuê xe thành công!',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};


