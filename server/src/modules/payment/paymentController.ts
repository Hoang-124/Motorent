import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import { AppError } from '../../core/errorHandler';
import * as vnpayService from './vnpayService';

/**
 * POST /api/payments/vnpay/create
 * UC-29 & UC-30: Create VNPay Payment URL (Deposit 30% or Full 100%)
 */
export const createPaymentUrl = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Yêu cầu đăng nhập để thanh toán.');
    }

    const { bookingId, paymentType, bankCode, locale } = req.body;
    if (!bookingId) {
      throw new AppError(400, 'Thiếu thông tin bookingId để thanh toán.');
    }

    const ipAddr =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    const result = await vnpayService.createPaymentUrl({
      bookingId,
      userId: req.user._id.toString(),
      ipAddr,
      paymentType: paymentType === 'Full100' ? 'Full100' : 'Deposit30',
      bankCode,
      locale,
    });

    res.json({
      success: true,
      message: 'Tạo liên kết thanh toán VNPay thành công.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET / POST /api/payments/vnpay/ipn
 * VNPay IPN Webhook (Server-to-Server Instant Payment Notification)
 */
export const handleVnPayIpn = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const queryParams = Object.keys(req.query).length > 0 ? req.query : req.body;
    const result = await vnpayService.processVnPayIpn(queryParams);
    res.status(200).json(result);
  } catch (error) {
    res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};

/**
 * GET /api/payments/vnpay/return
 * Browser redirect verification after VNPay gateway payment
 */
export const handleVnPayReturn = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await vnpayService.verifyReturnUrlData(req.query);
    res.json({
      success: result.isValid && result.isSuccess,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
