import crypto from 'crypto';
import { Booking, IBooking } from '../../models/Booking';
import { User } from '../../models/User';
import { Vehicle } from '../../models/Vehicle';
import { Payment } from '../../models/Payment';
import { Discount } from '../../models/Discount';
import { Notification } from '../../models/Notification';
import { AuditLog } from '../../models/AuditLog';
import { AppError } from '../../core/errorHandler';
import { env } from '../../config/env';
import { sendBookingStatusEmail } from '../../config/mailer';
import { emitBookingStatus } from '../booking/bookingEvents';

export type VnpParams = Record<string, string | number | undefined>;

export interface CreatePaymentUrlOptions {
  bookingId?: string;
  bookingIds?: string[];
  userId: string;
  ipAddr: string;
  paymentType?: 'Deposit30' | 'Full100';
  bankCode?: string;
  locale?: 'vn' | 'en';
}

export interface VnPayIpnResult {
  RspCode: '00' | '01' | '02' | '04' | '97' | '99';
  Message: string;
}

export const getVnpSecretKey = (): string => {
  const secret = (env.VNP_HASHSECRET || (env.NODE_ENV !== 'production' ? 'DEMO_SECRET' : '')).trim();
  if (!secret) {
    throw new AppError(500, 'VNPay Hash Secret chưa được cấu hình.');
  }
  return secret;
};

export const getVnpTmnCode = (): string => {
  const code = (env.VNP_TMNCODE || (env.NODE_ENV !== 'production' ? 'DEMO_CODE' : '')).trim();
  if (!code) {
    throw new AppError(500, 'VNPay TMN Code chưa được cấu hình.');
  }
  return code;
};

/**
 * Format Date to VNPay format: yyyyMMddHHmmss in GMT+7 (Asia/Ho_Chi_Minh)
 * Guarantees correct GMT+7 regardless of host server local timezone.
 */
export const formatVnPayDate = (date: Date): string => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  return `${getPart('year')}${getPart('month')}${getPart('day')}${getPart('hour')}${getPart('minute')}${getPart('second')}`;
};

/**
 * Sorts object properties alphabetically and encodes them according to VNPay requirements (RFC 1738 urlencode)
 */
export const sortAndSignParams = (
  params: VnpParams,
  secretKey: string = getVnpSecretKey(),
  rfc1738Strict: boolean = true
): { sortedParams: Record<string, string>; signData: string; secureHash: string } => {
  const sortedKeys = Object.keys(params)
    .filter(
      (k) =>
        params[k] !== '' &&
        params[k] !== null &&
        params[k] !== undefined &&
        k !== 'vnp_SecureHash' &&
        k !== 'vnp_SecureHashType'
    )
    .sort();

  const sortedParams: Record<string, string> = {};
  const signParts: string[] = [];

  for (const key of sortedKeys) {
    const val = String(params[key]);
    sortedParams[key] = val;
    const encodedKey = encodeURIComponent(key);
    let encodedVal = encodeURIComponent(val).replace(/%20/g, '+');
    if (rfc1738Strict) {
      encodedVal = encodedVal.replace(
        /[!'()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
      );
    }
    signParts.push(`${encodedKey}=${encodedVal}`);
  }

  const signData = signParts.join('&');
  const secureHash = crypto
    .createHmac('sha512', secretKey)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  return { sortedParams, signData, secureHash };
};

/**
 * Verify checksum for VNPay query parameters (IPN or ReturnUrl)
 * Supports both strict RFC 1738 urlencode (PHP/Java VNPay standard) and standard JS encodeURIComponent
 */
export const verifyVnPayChecksum = (
  queryParams: VnpParams,
  secretKey: string = getVnpSecretKey()
): boolean => {
  const receivedHash = queryParams['vnp_SecureHash'];
  if (!receivedHash || typeof receivedHash !== 'string') {
    return false;
  }

  const target = receivedHash.toLowerCase();
  const { secureHash: strictHash } = sortAndSignParams(queryParams, secretKey, true);
  if (strictHash.toLowerCase() === target) {
    return true;
  }

  const { secureHash: compatHash } = sortAndSignParams(queryParams, secretKey, false);
  return compatHash.toLowerCase() === target;
};

/**
 * Create VNPay payment URL for 1 or multiple Bookings (30% deposit or 100% full payment)
 */
export const createPaymentUrl = async (
  options: CreatePaymentUrlOptions
): Promise<{
  paymentUrl: string;
  bookingCode: string;
  bookingCodes: string[];
  amount: number;
  paymentType: string;
}> => {
  const {
    bookingId,
    bookingIds,
    userId,
    ipAddr,
    paymentType = 'Deposit30',
    bankCode,
    locale = 'vn',
  } = options;

  const targetIds =
    Array.isArray(bookingIds) && bookingIds.length > 0
      ? bookingIds
      : bookingId
        ? [bookingId]
        : [];

  if (targetIds.length === 0) {
    throw new AppError(400, 'Thiếu thông tin đơn đặt xe để thanh toán.');
  }

  const bookings = await Booking.find({ _id: { $in: targetIds } });
  if (bookings.length === 0) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  for (const booking of bookings) {
    if (booking.userId.toString() !== userId) {
      throw new AppError(403, `Bạn không có quyền thanh toán cho đơn ${booking.bookingCode}.`);
    }
    if (booking.status === 'Cancelled' || booking.status === 'Rejected') {
      throw new AppError(400, `Đơn đặt xe ${booking.bookingCode} đã bị hủy hoặc từ chối.`);
    }
    if (booking.isPaid) {
      throw new AppError(400, `Đơn đặt xe ${booking.bookingCode} đã được thanh toán hoàn tất.`);
    }
    const currentPaid = booking.paidAmount || (booking.depositPaid ? booking.depositAmount : 0);
    if (paymentType === 'Deposit30' && currentPaid >= booking.depositAmount) {
      throw new AppError(
        400,
        `Đơn đặt xe ${booking.bookingCode} đã hoàn tất mức cọc yêu cầu. Vui lòng chọn thanh toán đầy đủ 100%.`
      );
    }
  }

  const calcSingleBookingAmount = (b: IBooking): number => {
    const currentPaid = b.paidAmount || (b.depositPaid ? b.depositAmount : 0);
    return paymentType === 'Full100'
      ? Math.max(0, b.totalAmount - currentPaid)
      : Math.max(0, b.depositAmount - currentPaid);
  };

  const amountToPay = bookings.reduce((sum, b) => sum + calcSingleBookingAmount(b), 0);

  if (amountToPay <= 0) {
    throw new AppError(
      400,
      paymentType === 'Full100'
        ? 'Đơn đã thanh toán đủ.'
        : 'Đơn đã đạt mức cọc yêu cầu hiện tại.'
    );
  }

  const now = new Date();
  const createDate = formatVnPayDate(now);
  const expireDateObj = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins expiry
  const expireDate = formatVnPayDate(expireDateObj);

  const tmnCode = getVnpTmnCode();
  const secretKey = getVnpSecretKey();
  const vnpUrl = env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const returnUrl = env.VNP_RETURNURL || 'http://localhost:5173/vnpay-return';

  const bookingCodes = bookings.map((b) => b.bookingCode);
  const combinedCodeLabel = bookingCodes.join(', ');

  // Suffix with timestamp to prevent duplicate TxnRef collisions on VNPay retry
  const txnRef =
    bookings.length === 1
      ? `${bookings[0].bookingCode}__${Date.now()}`
      : `CART-${bookings.length}XE-${bookings[0].bookingCode}__${Date.now()}`;

  // Sanitize IP address
  let clientIp = ipAddr || '127.0.0.1';
  if (clientIp.includes(',')) {
    clientIp = clientIp.split(',')[0].trim();
  }
  if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
    clientIp = '127.0.0.1';
  }

  const orderInfoText =
    bookings.length === 1
      ? `Thanh toan ${paymentType === 'Full100' ? '100%' : 'coc 30%'} don thue ${bookings[0].bookingCode}`
      : `Thanh toan ${paymentType === 'Full100' ? '100%' : 'coc 30%'} gop ${bookings.length} xe ${bookingCodes.join(' ')}`;

  const vnpParams: VnpParams = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: locale,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfoText,
    vnp_OrderType: 'other',
    vnp_Amount: Math.round(amountToPay * 100), // VNPay standard: amount in VND * 100
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: clientIp,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  if (bankCode && bankCode.trim()) {
    vnpParams['vnp_BankCode'] = bankCode.trim();
  }

  const { signData, secureHash } = sortAndSignParams(vnpParams, secretKey);
  const paymentUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${secureHash}`;

  // Update all bookings in the batch with payment metadata
  await Promise.all(
    bookings.map(async (b) => {
      b.paymentType = paymentType;
      b.lastTxnRef = txnRef;
      b.paymentExpiresAt = expireDateObj;
      await b.save();
    })
  );

  // Audit log payment creation
  AuditLog.create({
    userId: bookings[0].userId,
    action: 'CREATE_PAYMENT_URL',
    entity: 'Booking',
    entityId: bookings[0]._id.toString(),
    details: {
      bookingCodes,
      txnRef,
      amountToPay,
      paymentType,
      expiresAt: expireDateObj,
    },
    ipAddress: clientIp,
    timestamp: now,
  }).catch((err: unknown) => console.error('[AuditLog Error]', err));

  return {
    paymentUrl,
    bookingCode: combinedCodeLabel,
    bookingCodes,
    amount: amountToPay,
    paymentType,
  };
};

/**
 * Handle VNPay IPN Webhook (Server-to-Server callback)
 * Conforms to VNPay Merchant specification with standard RspCode
 * Supports both single-booking and multi-booking Cart batch transactions
 */
export const processVnPayIpn = async (queryParams: VnpParams): Promise<VnPayIpnResult> => {
  const secretKey = getVnpSecretKey();

  // 1. Verify Checksum
  const isValidChecksum = verifyVnPayChecksum(queryParams, secretKey);
  if (!isValidChecksum) {
    return { RspCode: '97', Message: 'Checksum failed' };
  }

  const txnRef = queryParams['vnp_TxnRef'];
  if (!txnRef || typeof txnRef !== 'string') {
    return { RspCode: '01', Message: 'Order not found' };
  }

  // Find all bookings sharing this batch txnRef, or fallback to single bookingCode
  let bookings = await Booking.find({ lastTxnRef: txnRef });
  if (bookings.length === 0) {
    const rawCode = txnRef.includes('__') ? txnRef.split('__')[0] : txnRef;
    const singleBooking = await Booking.findOne({ bookingCode: rawCode });
    if (singleBooking) {
      bookings = [singleBooking];
    }
  }

  if (bookings.length === 0) {
    return { RspCode: '01', Message: 'Order not found' };
  }

  const getExpectedForBooking = (b: IBooking): number => {
    const currentPaid = b.paidAmount || (b.depositPaid ? b.depositAmount : 0);
    return b.paymentType === 'Full100'
      ? Math.max(0, b.totalAmount - currentPaid)
      : Math.max(0, b.depositAmount - currentPaid);
  };

  // 2. Validate Total Amount across all bookings in this transaction
  const vnpAmount = Number(queryParams['vnp_Amount']);
  const existingSuccessfulPayment = await Payment.findOne({ txnRef: String(txnRef), status: 'SUCCESS' });
  if (existingSuccessfulPayment) {
    return { RspCode: '02', Message: 'Order already confirmed' };
  }

  const totalExpectedAmount = bookings.reduce((sum, b) => sum + getExpectedForBooking(b), 0);
  if (totalExpectedAmount <= 0) {
    return { RspCode: '02', Message: 'Order already confirmed' };
  }

  if (isNaN(vnpAmount) || Math.round(totalExpectedAmount * 100) !== vnpAmount) {
    return { RspCode: '04', Message: 'Invalid amount' };
  }

  const responseCode = queryParams['vnp_ResponseCode'];
  const transactionStatus = queryParams['vnp_TransactionStatus'];
  const vnpTransactionNo = queryParams['vnp_TransactionNo'] || '';
  const vnpBankCode = queryParams['vnp_BankCode'] || '';
  const vnpPayDateStr = queryParams['vnp_PayDate'];

  let vnpayPayDate = new Date();
  if (typeof vnpPayDateStr === 'string' && vnpPayDateStr.length === 14) {
    const yyyy = parseInt(vnpPayDateStr.substring(0, 4), 10);
    const MM = parseInt(vnpPayDateStr.substring(4, 6), 10) - 1;
    const dd = parseInt(vnpPayDateStr.substring(6, 8), 10);
    const HH = parseInt(vnpPayDateStr.substring(8, 10), 10);
    const mm = parseInt(vnpPayDateStr.substring(10, 12), 10);
    const ss = parseInt(vnpPayDateStr.substring(12, 14), 10);
    vnpayPayDate = new Date(Date.UTC(yyyy, MM, dd, HH - 7, mm, ss));
  }

  // 4. Process each booking in the transaction batch
  if (responseCode === '00' && transactionStatus === '00') {
    for (const booking of bookings) {
      const currentPaid = booking.paidAmount || (booking.depositPaid ? booking.depositAmount : 0);
      const expectedAmount = getExpectedForBooking(booking);
      const newPaidAmount = currentPaid + expectedAmount;
      const isFullPay = booking.paymentType === 'Full100' || newPaidAmount >= booking.totalAmount;

      if (booking.status === 'Cancelled') {
        await Booking.findByIdAndUpdate(booking._id, {
          vnpayTransactionNo: String(vnpTransactionNo),
          vnpayBankCode: String(vnpBankCode),
          vnpayPayDate,
          paidAmount: newPaidAmount,
          refundAmount: (booking.refundAmount || 0) + expectedAmount,
          refundStatus: 'Pending',
        });

        await Payment.create({
          bookingId: booking._id,
          txnRef: bookings.length === 1 ? String(txnRef) : `${txnRef}__${booking.bookingCode}`,
          vnpTransactionNo: vnpTransactionNo ? String(vnpTransactionNo) : undefined,
          amount: expectedAmount,
          type: isFullPay ? 'FULL' : 'DEPOSIT',
          status: 'SUCCESS',
          rawIpn: queryParams,
        }).catch((err: unknown) => console.error('[Payment Record Error]', err));
        continue;
      }

      const updatePayload: Record<string, unknown> = {
        vnpayTransactionNo: String(vnpTransactionNo),
        vnpayBankCode: String(vnpBankCode),
        vnpayPayDate,
        paidAmount: newPaidAmount,
        depositPaid: newPaidAmount >= booking.depositAmount,
        isPaid: isFullPay,
        status: booking.status === 'Pending' || booking.status === 'Approved' ? 'Confirmed' : booking.status,
        remainingAmount: isFullPay ? 0 : Math.max(0, booking.totalAmount - newPaidAmount),
      };

      const updatedBooking = await Booking.findOneAndUpdate(
        { _id: booking._id, status: { $in: ['Pending', 'Approved', 'Confirmed', 'Ongoing'] } },
        { $set: updatePayload },
        { new: true }
      );

      if (!updatedBooking) continue;

      const paymentRefKey = bookings.length === 1 ? String(txnRef) : `${txnRef}__${booking.bookingCode}`;

      await Payment.create({
        bookingId: booking._id,
        txnRef: paymentRefKey,
        vnpTransactionNo: vnpTransactionNo ? String(vnpTransactionNo) : undefined,
        amount: expectedAmount,
        type: isFullPay ? 'FULL' : 'DEPOSIT',
        status: 'SUCCESS',
        rawIpn: queryParams,
      }).catch((err: unknown) => console.error('[Payment Record Error]', err));

      emitBookingStatus(updatedBooking);

      Promise.all([
        User.findById(booking.userId).select('email firstName lastName username'),
        Vehicle.findById(booking.vehicleId).select('brand vehicleModel licensePlate'),
      ])
        .then(([cust, veh]) => {
          if (cust?.email) {
            sendBookingStatusEmail({
              toEmail: cust.email,
              customerName: [cust.lastName, cust.firstName].filter(Boolean).join(' ').trim() || cust.username,
              bookingCode: booking.bookingCode,
              event: 'CONFIRMED',
              vehicleName: veh ? `${veh.brand} ${veh.vehicleModel}` : undefined,
              licensePlate: veh?.licensePlate,
              totalAmount: updatedBooking.totalAmount,
              paidAmount: updatedBooking.paidAmount,
              remainingAmount: updatedBooking.remainingAmount,
            }).catch(() => {});
          }
        })
        .catch(() => {});

      await Notification.create({
        userId: booking.userId,
        title: isFullPay ? 'Thanh toán 100% thành công qua VNPay' : 'Xác nhận cọc 30% thành công qua VNPay',
        body: `Đơn thuê ${booking.bookingCode} đã nhận thanh toán số tiền ${expectedAmount.toLocaleString('vi-VN')} đ. Xe đã được khóa giữ cho bạn!`,
        type: 'BOOKING',
        relatedId: booking._id.toString(),
        isRead: false,
      }).catch((err: unknown) => console.error('[Notification Error]', err));

      await AuditLog.create({
        userId: booking.userId,
        action: 'VNPAY_PAYMENT_SUCCESS',
        entity: 'Booking',
        entityId: booking._id.toString(),
        details: {
          bookingCode: booking.bookingCode,
          vnpTransactionNo,
          vnpBankCode,
          amount: expectedAmount,
          paymentType: booking.paymentType,
          responseCode,
          transactionStatus,
          batchSize: bookings.length,
        },
        timestamp: new Date(),
      }).catch((err: unknown) => console.error('[AuditLog Error]', err));
    }

    return { RspCode: '00', Message: 'Confirm Success' };
  } else {
    // Payment Failed or Cancelled by customer on gateway
    for (const booking of bookings) {
      const expectedAmount = getExpectedForBooking(booking);
      const paymentRefKey = bookings.length === 1 ? String(txnRef) : `${txnRef}__${booking.bookingCode}`;

      const existingFailedPayment = await Payment.findOne({ txnRef: paymentRefKey, status: 'FAILED' });
      if (!existingFailedPayment) {
        await Payment.create({
          bookingId: booking._id,
          txnRef: paymentRefKey,
          vnpTransactionNo: vnpTransactionNo ? String(vnpTransactionNo) : undefined,
          amount: expectedAmount,
          type: booking.paymentType === 'Full100' ? 'FULL' : 'DEPOSIT',
          status: 'FAILED',
          rawIpn: queryParams,
        }).catch((err: unknown) => console.error('[Payment Record Error]', err));
      }

      if (booking.status === 'Pending' && !booking.depositPaid && !booking.isPaid) {
        const cancelReasonText =
          responseCode === '24'
            ? 'Khách hàng đã chủ động hủy thanh toán trên cổng VNPay Sandbox.'
            : `Giao dịch thanh toán VNPay không thành công (Mã lỗi: ${responseCode}).`;

        const cancelledBooking = await Booking.findByIdAndUpdate(
          booking._id,
          {
            $set: {
              status: 'Cancelled',
              cancelReason: cancelReasonText,
            },
          },
          { new: true }
        );

        if (booking.discountId) {
          await Discount.findByIdAndUpdate(booking.discountId, { $inc: { usedCount: -1 } }).catch(() => {});
        }

        await Notification.deleteMany({ relatedId: booking._id.toString() }).catch(() => {});

        if (cancelledBooking) {
          emitBookingStatus(cancelledBooking);
        }
      }

      await AuditLog.create({
        userId: booking.userId,
        action: 'VNPAY_PAYMENT_FAILED',
        entity: 'Booking',
        entityId: booking._id.toString(),
        details: {
          bookingCode: booking.bookingCode,
          vnpTransactionNo,
          responseCode,
          transactionStatus,
        },
        timestamp: new Date(),
      }).catch((err: unknown) => console.error('[AuditLog Error]', err));
    }

    return { RspCode: '00', Message: 'Confirm Success' };
  }
};

/**
 * Handle VNPay Return URL (Customer Browser Redirect)
 */
export const verifyReturnUrlData = async (
  queryParams: VnpParams
): Promise<{
  isValid: boolean;
  isSuccess: boolean;
  bookingCode: string;
  bookingCodes: string[];
  amount: number;
  message: string;
  booking?: IBooking | null;
  bookings?: IBooking[];
}> => {
  const secretKey = getVnpSecretKey();
  const isValid = verifyVnPayChecksum(queryParams, secretKey);

  const txnRef = String(queryParams['vnp_TxnRef'] || '');
  const rawCode = txnRef.includes('__') ? txnRef.split('__')[0] : txnRef;
  const responseCode = queryParams['vnp_ResponseCode'];
  const amount = Number(queryParams['vnp_Amount']) / 100 || 0;

  if (!isValid) {
    return {
      isValid: false,
      isSuccess: false,
      bookingCode: rawCode,
      bookingCodes: [rawCode],
      amount,
      message: 'Chữ ký xác thực thanh toán không hợp lệ.',
    };
  }

  // Process payment state idempotently (essential for localhost Sandbox where remote IPN cannot reach 127.0.0.1)
  await processVnPayIpn(queryParams).catch((err: unknown) =>
    console.error('[VNPay Return Sync Error]:', err)
  );

  let bookings = await Booking.find({ lastTxnRef: txnRef })
    .populate('pickupBranchId')
    .populate('returnBranchId')
    .populate('vehicleId');

  if (bookings.length === 0) {
    const single = await Booking.findOne({ bookingCode: rawCode })
      .populate('pickupBranchId')
      .populate('returnBranchId')
      .populate('vehicleId');
    if (single) {
      bookings = [single];
    }
  }

  const bookingCodes = bookings.length > 0 ? bookings.map((b) => b.bookingCode) : [rawCode];
  const bookingCode = bookingCodes.join(', ');

  if (responseCode === '00') {
    return {
      isValid: true,
      isSuccess: true,
      bookingCode,
      bookingCodes,
      amount,
      message:
        bookings.length > 1
          ? `Đã thanh toán gộp thành công cho ${bookings.length} xe (${bookingCode}).`
          : 'Giao dịch thanh toán thành công.',
      booking: bookings[0] || null,
      bookings,
    };
  }

  return {
    isValid: true,
    isSuccess: false,
    bookingCode,
    bookingCodes,
    amount,
    message: 'Giao dịch thanh toán không thành công hoặc đã bị hủy.',
    booking: bookings[0] || null,
    bookings,
  };
};

/**
 * Confirm VietQR 24/7 Bank Transfer Payment (Deposit 30% or Full 100%)
 * Transitions Booking from Pending -> Approved, records Payment & AuditLog, and emits Socket.IO event
 */
export const confirmVietQrPayment = async (options: {
  bookingId: string;
  userId: string;
  paymentType?: 'Deposit30' | 'Full100';
}): Promise<IBooking> => {
  const { bookingId, userId, paymentType = 'Deposit30' } = options;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe để xác nhận thanh toán QR.');
  }

  if (booking.userId.toString() !== userId) {
    throw new AppError(403, 'Bạn không có quyền xác nhận thanh toán cho đơn đặt xe này.');
  }

  if (booking.status === 'Cancelled' || booking.status === 'Rejected') {
    throw new AppError(400, 'Đơn đặt xe này đã bị hủy hoặc từ chối.');
  }

  const isFullPay = paymentType === 'Full100';
  const currentPaidAmount = booking.paidAmount || (booking.depositPaid ? booking.depositAmount : 0);
  const amountToPay = isFullPay
    ? Math.max(0, booking.totalAmount - currentPaidAmount)
    : Math.max(0, booking.depositAmount - currentPaidAmount);
  const paidAmount = currentPaidAmount + amountToPay;
  const txnRef = `${booking.bookingCode}__VIETQR_${Date.now()}`;

  const updatePayload: Record<string, unknown> = {
    status: booking.status === 'Pending' || booking.status === 'Approved' ? 'Confirmed' : booking.status,
    depositPaid: paidAmount >= booking.depositAmount,
    depositPaidAt: new Date(),
    paidAmount,
    remainingAmount: Math.max(0, booking.totalAmount - paidAmount),
    paymentMethod: 'Banking',
    paymentType: isFullPay ? 'Full100' : 'Deposit30',
    vnpayTxnRef: txnRef,
  };

  if (isFullPay) {
    updatePayload.isPaid = true;
    updatePayload.paidAt = new Date();
  }

  const updatedBooking = await Booking.findByIdAndUpdate(
    booking._id,
    { $set: updatePayload },
    { new: true }
  )
    .populate('vehicleId')
    .populate('pickupBranchId')
    .populate('returnBranchId');

  if (!updatedBooking) {
    throw new AppError(500, 'Không thể cập nhật trạng thái thanh toán đơn đặt xe.');
  }

  await Payment.create({
    bookingId: booking._id,
    txnRef,
    vnpTransactionNo: `MB_VIETQR_${Date.now().toString().slice(-8)}`,
    amount: paidAmount,
    type: isFullPay ? 'FULL' : 'DEPOSIT',
    status: 'SUCCESS',
    rawIpn: { channel: 'VietQR_247', bankCode: 'MBBANK', bookingCode: booking.bookingCode },
  }).catch((err: unknown) => console.error('[VietQR Payment Record Error]', err));

  emitBookingStatus(updatedBooking);

  await Notification.create({
    userId: booking.userId,
    title: isFullPay ? 'Thanh toán QR 100% thành công' : 'Xác nhận cọc QR 30% thành công',
    body: `Hệ thống đã nhận chuyển khoản QR ${paidAmount.toLocaleString('vi-VN')} đ cho mã đơn ${booking.bookingCode}. Biển số xe đã được khóa giữ cho bạn.`,
    type: 'BOOKING',
    relatedId: booking._id.toString(),
    isRead: false,
  }).catch((err: unknown) => console.error('[Notification Error]', err));

  await AuditLog.create({
    userId: booking.userId,
    action: 'VIETQR_PAYMENT_SUCCESS',
    entity: 'Booking',
    entityId: booking._id.toString(),
    details: {
      bookingCode: booking.bookingCode,
      txnRef,
      amount: paidAmount,
      paymentType: isFullPay ? 'Full100' : 'Deposit30',
    },
    timestamp: new Date(),
  }).catch((err: unknown) => console.error('[AuditLog Error]', err));

  return updatedBooking;
};

