import crypto from 'crypto';
import { Booking, IBooking } from '../../models/Booking';
import { Vehicle } from '../../models/Vehicle';
import { Payment } from '../../models/Payment';
import { Discount } from '../../models/Discount';
import { Notification } from '../../models/Notification';
import { AuditLog } from '../../models/AuditLog';
import { AppError } from '../../core/errorHandler';
import { env } from '../../config/env';
import { emitBookingStatus } from '../booking/bookingEvents';

export type VnpParams = Record<string, string | number | undefined>;

export interface CreatePaymentUrlOptions {
  bookingId: string;
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
 * Sorts object properties alphabetically and encodes them according to VNPay requirements
 */
export const sortAndSignParams = (
  params: VnpParams,
  secretKey: string = getVnpSecretKey()
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
    // VNPay standard encoding: spaces converted to "+"
    const encodedKey = encodeURIComponent(key);
    const encodedVal = encodeURIComponent(val).replace(/%20/g, '+');
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
 */
export const verifyVnPayChecksum = (
  queryParams: VnpParams,
  secretKey: string = getVnpSecretKey()
): boolean => {
  const receivedHash = queryParams['vnp_SecureHash'];
  if (!receivedHash || typeof receivedHash !== 'string') {
    return false;
  }

  const { secureHash: calculatedHash } = sortAndSignParams(queryParams, secretKey);
  return calculatedHash.toLowerCase() === receivedHash.toLowerCase();
};

/**
 * Create VNPay payment URL for Booking (30% deposit or 100% full payment)
 */
export const createPaymentUrl = async (
  options: CreatePaymentUrlOptions
): Promise<{ paymentUrl: string; bookingCode: string; amount: number; paymentType: string }> => {
  const { bookingId, userId, ipAddr, paymentType = 'Deposit30', bankCode, locale = 'vn' } = options;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  // Ensure caller is the owner of the booking
  if (booking.userId.toString() !== userId) {
    throw new AppError(403, 'Bạn không có quyền thanh toán cho đơn đặt xe này.');
  }

  if (booking.status === 'Cancelled' || booking.status === 'Rejected') {
    throw new AppError(400, 'Đơn đặt xe đã bị hủy hoặc từ chối.');
  }

  if (booking.isPaid) {
    throw new AppError(400, 'Đơn đặt xe này đã được thanh toán hoàn tất.');
  }

  if (paymentType === 'Deposit30' && booking.depositPaid) {
    throw new AppError(400, 'Đơn đặt xe này đã hoàn tất cọc 30%. Vui lòng tất toán tại quầy hoặc chọn thanh toán đầy đủ.');
  }

  // Calculate amount to pay: Deposit 30% vs Full 100%
  const amountToPay =
    paymentType === 'Full100'
      ? booking.depositPaid && booking.remainingAmount
        ? booking.remainingAmount
        : booking.totalAmount
      : booking.depositAmount;

  if (amountToPay <= 0) {
    throw new AppError(400, 'Số tiền thanh toán phải lớn hơn 0 VNĐ.');
  }

  const now = new Date();
  const createDate = formatVnPayDate(now);
  const expireDateObj = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins expiry
  const expireDate = formatVnPayDate(expireDateObj);

  const tmnCode = getVnpTmnCode();
  const secretKey = getVnpSecretKey();
  const vnpUrl = env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const returnUrl = env.VNP_RETURNURL || 'http://localhost:5173/vnpay-return';

  // Suffix with timestamp to prevent duplicate TxnRef collisions on VNPay retry
  const txnRef = `${booking.bookingCode}__${Date.now()}`;

  // Sanitize IP address
  let clientIp = ipAddr || '127.0.0.1';
  if (clientIp.includes(',')) {
    clientIp = clientIp.split(',')[0].trim();
  }
  if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
    clientIp = '127.0.0.1';
  }

  const vnpParams: VnpParams = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: locale,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: `Thanh toan ${paymentType === 'Full100' ? '100%' : 'coc 30%'} don thue ${booking.bookingCode}`,
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

  // Update booking with payment metadata
  booking.paymentType = paymentType;
  booking.lastTxnRef = txnRef;
  booking.paymentExpiresAt = expireDateObj;
  await booking.save();

  // Audit log payment creation
  AuditLog.create({
    userId: booking.userId,
    action: 'CREATE_PAYMENT_URL',
    entity: 'Booking',
    entityId: booking._id.toString(),
    details: {
      bookingCode: booking.bookingCode,
      txnRef,
      amountToPay,
      paymentType,
      expiresAt: booking.paymentExpiresAt,
    },
    ipAddress: clientIp,
    timestamp: now,
  }).catch((err: unknown) => console.error('[AuditLog Error]', err));

  return {
    paymentUrl,
    bookingCode: booking.bookingCode,
    amount: amountToPay,
    paymentType,
  };
};

/**
 * Handle VNPay IPN Webhook (Server-to-Server callback)
 * Conforms to VNPay Merchant specification with standard RspCode
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

  // Extract bookingCode from txnRef (handles "MV-XXXXXX__timestamp" format)
  const bookingCode = txnRef.includes('__') ? txnRef.split('__')[0] : txnRef;

  const booking = await Booking.findOne({ bookingCode });
  if (!booking) {
    return { RspCode: '01', Message: 'Order not found' };
  }

  // 2. Validate Amount
  const vnpAmount = Number(queryParams['vnp_Amount']);
  const expectedAmount =
    booking.paymentType === 'Full100'
      ? booking.depositPaid && booking.remainingAmount
        ? booking.remainingAmount
        : booking.totalAmount
      : booking.depositAmount;

  if (isNaN(vnpAmount) || Math.round(expectedAmount * 100) !== vnpAmount) {
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

  // 3. Handle Edge Case: Booking was cancelled by timeout job, but payment arrived
  if (booking.status === 'Cancelled') {
    if (responseCode === '00' && transactionStatus === '00') {
      await Booking.findByIdAndUpdate(booking._id, {
        vnpayTransactionNo: String(vnpTransactionNo),
        vnpayBankCode: String(vnpBankCode),
        vnpayPayDate,
        paidAmount: expectedAmount,
      });

      // Record transaction row in Payment collection
      await Payment.create({
        bookingId: booking._id,
        txnRef: String(txnRef),
        vnpTransactionNo: vnpTransactionNo ? String(vnpTransactionNo) : undefined,
        amount: expectedAmount,
        type: booking.paymentType === 'Full100' ? 'FULL' : 'DEPOSIT',
        status: 'SUCCESS',
        rawIpn: queryParams,
      }).catch((err: unknown) => console.error('[Payment Record Error]', err));

      await AuditLog.create({
        userId: booking.userId,
        action: 'VNPAY_PAID_AFTER_CANCEL_REFUND_NEEDED',
        entity: 'Booking',
        entityId: booking._id.toString(),
        details: {
          bookingCode: booking.bookingCode,
          vnpTransactionNo,
          amount: expectedAmount,
          note: 'Khách hàng thanh toán sau khi đơn bị quá hạn tự hủy. Cần hoàn tiền!',
        },
        timestamp: new Date(),
      }).catch((err: unknown) => console.error('[AuditLog Error]', err));

      return { RspCode: '00', Message: 'Confirm Success' };
    }
    return { RspCode: '00', Message: 'Confirm Success' };
  }

  // 4. Idempotency Check: Already confirmed
  if (booking.isPaid || booking.depositPaid || booking.status === 'Confirmed' || booking.status === 'Ongoing' || booking.status === 'Completed') {
    return { RspCode: '02', Message: 'Order already confirmed' };
  }

  // 5. Check if transaction was successful on gateway
  if (responseCode === '00' && transactionStatus === '00') {
    const isFullPay = booking.paymentType === 'Full100';
    const updatePayload: Record<string, unknown> = {
      vnpayTransactionNo: String(vnpTransactionNo),
      vnpayBankCode: String(vnpBankCode),
      vnpayPayDate,
      paidAmount: expectedAmount,
      depositPaid: true,
      isPaid: isFullPay,
      status: 'Confirmed',
      remainingAmount: isFullPay ? 0 : Math.max(0, booking.totalAmount - expectedAmount),
    };

    // Atomic compare-and-swap: transition if status is 'Pending' or 'Confirmed'
    const updatedBooking = await Booking.findOneAndUpdate(
      { _id: booking._id, status: { $in: ['Pending', 'Confirmed'] } },
      { $set: updatePayload },
      { new: true }
    );

    if (!updatedBooking) {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    // Lock vehicle status to Rented so it is hidden from public available fleet
    await Vehicle.findByIdAndUpdate(booking.vehicleId, { status: 'Rented' }).catch(() => {});

    // Record transaction row in Payment collection
    await Payment.create({
      bookingId: booking._id,
      txnRef: String(txnRef),
      vnpTransactionNo: vnpTransactionNo ? String(vnpTransactionNo) : undefined,
      amount: expectedAmount,
      type: isFullPay ? 'FULL' : 'DEPOSIT',
      status: 'SUCCESS',
      rawIpn: queryParams,
    }).catch((err: unknown) => console.error('[Payment Record Error]', err));

    // Emit real-time status update to socket rooms (UC-37)
    emitBookingStatus(updatedBooking);

    // Notify user
    await Notification.create({
      userId: booking.userId,
      title: isFullPay ? 'Thanh toán 100% thành công qua VNPay' : 'Xác nhận cọc 30% thành công qua VNPay',
      body: `Đơn thuê ${booking.bookingCode} đã nhận thanh toán số tiền ${expectedAmount.toLocaleString('vi-VN')} đ. Xe đã được khóa giữ cho bạn!`,
      type: 'BOOKING',
      relatedId: booking._id.toString(),
      isRead: false,
    }).catch((err: unknown) => console.error('[Notification Error]', err));

    // Audit log
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
      },
      timestamp: new Date(),
    }).catch((err: unknown) => console.error('[AuditLog Error]', err));

    return { RspCode: '00', Message: 'Confirm Success' };
  } else {
    // Payment Failed or Cancelled by customer on gateway
    const existingFailedPayment = await Payment.findOne({ txnRef: String(txnRef), status: 'FAILED' });
    if (!existingFailedPayment) {
      await Payment.create({
        bookingId: booking._id,
        txnRef: String(txnRef),
        vnpTransactionNo: vnpTransactionNo ? String(vnpTransactionNo) : undefined,
        amount: expectedAmount,
        type: booking.paymentType === 'Full100' ? 'FULL' : 'DEPOSIT',
        status: 'FAILED',
        rawIpn: queryParams,
      }).catch((err: unknown) => console.error('[Payment Record Error]', err));
    }

    // Automatically cancel unpaid Pending booking so vehicle is unlocked and not shown as active/successful
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

      // Remove any premature hold notification for this booking
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

    return { RspCode: '00', Message: 'Confirm Success' };
  }
};

/**
 * Handle VNPay Return URL (Customer Browser Redirect)
 * STRICT READ-ONLY: Never update database state on browser redirect!
 */
export const verifyReturnUrlData = async (
  queryParams: VnpParams
): Promise<{
  isValid: boolean;
  isSuccess: boolean;
  bookingCode: string;
  amount: number;
  message: string;
  booking?: IBooking | null;
}> => {
  const secretKey = getVnpSecretKey();
  const isValid = verifyVnPayChecksum(queryParams, secretKey);

  const txnRef = String(queryParams['vnp_TxnRef'] || '');
  const bookingCode = txnRef.includes('__') ? txnRef.split('__')[0] : txnRef;
  const responseCode = queryParams['vnp_ResponseCode'];
  const amount = Number(queryParams['vnp_Amount']) / 100 || 0;

  if (!isValid) {
    return {
      isValid: false,
      isSuccess: false,
      bookingCode,
      amount,
      message: 'Chữ ký xác thực thanh toán không hợp lệ.',
    };
  }

  // Process payment state idempotently (essential for localhost Sandbox where remote IPN cannot reach 127.0.0.1)
  await processVnPayIpn(queryParams).catch((err: unknown) =>
    console.error('[VNPay Return Sync Error]:', err)
  );

  const booking = await Booking.findOne({ bookingCode })
    .populate('pickupBranchId')
    .populate('returnBranchId');

  if (responseCode === '00') {
    return {
      isValid: true,
      isSuccess: true,
      bookingCode,
      amount,
      message: 'Giao dịch thanh toán thành công.',
      booking,
    };
  }

  return {
    isValid: true,
    isSuccess: false,
    bookingCode,
    amount,
    message: 'Giao dịch thanh toán không thành công hoặc đã bị hủy.',
    booking,
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
  const paidAmount = isFullPay ? booking.totalAmount : booking.depositAmount;
  const txnRef = `${booking.bookingCode}__VIETQR_${Date.now()}`;

  const updatePayload: Record<string, unknown> = {
    status: 'Confirmed',
    depositPaid: true,
    depositPaidAt: new Date(),
    paidAmount,
    remainingAmount: isFullPay ? 0 : Math.max(0, booking.totalAmount - paidAmount),
    paymentMethod: 'Banking',
    paymentType: isFullPay ? 'Full100' : 'Deposit30',
    vnpayTxnRef: txnRef,
  };

  if (isFullPay) {
    updatePayload.isPaid = true;
    updatePayload.paidAt = new Date();
  }

  // Lock vehicle status to Rented BEFORE populating so populated vehicleId reflects status: 'Rented'
  await Vehicle.findByIdAndUpdate(booking.vehicleId, { status: 'Rented' }).catch(() => {});

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

  // Lock vehicle status to Rented so it is hidden from public available fleet
  await Vehicle.findByIdAndUpdate(booking.vehicleId, { status: 'Rented' }).catch(() => {});

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

