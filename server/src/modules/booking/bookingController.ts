import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import * as bookingService from './bookingService';
import * as invoiceService from './invoiceService';
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
  checklist: z.record(z.string(), z.boolean()).optional(),
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

const checkAvailabilitySchema = z.object({
  vehicleId: z.string().min(1, 'Thiếu ID phương tiện'),
  pickupDateTime: z.string().min(1, 'Thiếu thời gian nhận xe'),
  returnDateTime: z.string().min(1, 'Thiếu thời gian trả xe'),
  excludeBookingId: z.string().optional(),
});

export const checkAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = checkAvailabilitySchema.parse(req.body);
    const pickupDate = new Date(data.pickupDateTime);
    const returnDate = new Date(data.returnDateTime);

    if (isNaN(pickupDate.getTime()) || isNaN(returnDate.getTime())) {
      throw new AppError(400, 'Thời gian nhận hoặc trả xe không hợp lệ.');
    }

    if (pickupDate >= returnDate) {
      throw new AppError(400, 'Thời gian trả xe phải sau thời gian nhận xe ít nhất 2 giờ.');
    }

    const result = await bookingService.checkVehicleAvailability(
      data.vehicleId,
      pickupDate,
      returnDate,
      data.excludeBookingId
    );

    if (!result.available) {
      res.status(409).json({
        success: false,
        available: false,
        message: 'Phương tiện này đã có lịch đặt hoặc đang được sử dụng trong khung giờ bạn chọn.',
        conflictingBookingCode: result.conflictingBooking?.bookingCode,
      });
      return;
    }

    res.json({
      success: true,
      available: true,
      message: 'Phương tiện sẵn sàng cho thuê trong khung giờ đã chọn.',
    });
  } catch (error) {
    next(error);
  }
};

export const downloadInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập để tải hóa đơn.');
    }

    await invoiceService.streamBookingInvoicePdf(req.params.id, req.user, res);
  } catch (error) {
    next(error);
  }
};

const requestRefundSchema = z.object({
  bankName: z.string().trim().min(1, 'Vui lòng nhập tên ngân hàng'),
  bankAccountNumber: z.string().trim().min(1, 'Vui lòng nhập số tài khoản'),
  bankAccountName: z.string().trim().min(1, 'Vui lòng nhập tên chủ tài khoản'),
  reason: z.string().trim().optional(),
});

export const requestRefund = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập để gửi yêu cầu hoàn tiền.');
    }

    const data = requestRefundSchema.parse(req.body);
    const updated = await bookingService.requestRefund(req.params.id, req.user, data);

    res.json({
      success: true,
      message: 'Đã tiếp nhận yêu cầu hoàn tiền thành công. Bộ phận quản lý sẽ phê duyệt trong 24 giờ làm việc.',
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

export const calculatePenalty = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const simulatedReturnTime =
      typeof req.query.simulatedReturnTime === 'string'
        ? req.query.simulatedReturnTime
        : req.body?.simulatedReturnTime;

    const damageFee =
      req.query.damageFee !== undefined
        ? Number(req.query.damageFee)
        : req.body?.damageFee !== undefined
        ? Number(req.body.damageFee)
        : undefined;

    const result = await bookingService.calculateBookingPenalty(req.params.id, req.user, {
      simulatedReturnTime,
      damageFee,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const approveBookingSchema = z.object({
  notes: z.string().optional(),
});

export const approveBooking = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập quản lý.');
    }

    const { notes } = approveBookingSchema.parse(req.body || {});
    const approved = await bookingService.approveBooking(req.params.id, req.user, notes);

    res.json({
      success: true,
      message: 'Phê duyệt đơn đặt xe thành công!',
      data: approved,
    });
  } catch (error) {
    next(error);
  }
};

const rejectBookingSchema = z.object({
  reason: z.string().min(1, 'Lý do từ chối đơn đặt xe là bắt buộc'),
});

export const rejectBooking = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập quản lý.');
    }

    const { reason } = rejectBookingSchema.parse(req.body);
    const rejected = await bookingService.rejectBooking(req.params.id, req.user, reason);

    res.json({
      success: true,
      message: 'Từ chối đơn đặt xe thành công!',
      data: rejected,
    });
  } catch (error) {
    next(error);
  }
};

const approveRefundSchema = z.object({
  refundAmount: z.coerce.number().positive('Số tiền hoàn trả phải lớn hơn 0').optional(),
  note: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  bankAccount: z.string().trim().optional(),
  bankAccountName: z.string().trim().optional(),
});

export const approveRefund = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập quản lý.');
    }

    const data = approveRefundSchema.parse(req.body || {});
    const booking = await bookingService.approveRefund(req.params.id, req.user, data);

    res.json({
      success: true,
      message: `Đã phê duyệt hoàn tiền ${booking.refundAmount?.toLocaleString('vi-VN')} đ cho đơn đặt xe ${booking.bookingCode}.`,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

const rejectRefundSchema = z.object({
  reason: z.string().trim().min(3, 'Lý do từ chối hoàn tiền là bắt buộc (tối thiểu 3 ký tự)'),
});

export const rejectRefund = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập quản lý.');
    }

    const data = rejectRefundSchema.parse(req.body);
    const booking = await bookingService.rejectRefund(req.params.id, req.user, data);

    res.json({
      success: true,
      message: `Đã từ chối hoàn tiền cho đơn đặt xe ${booking.bookingCode}.`,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};
