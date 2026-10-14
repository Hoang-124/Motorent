import crypto from 'crypto';
import { Booking, IBooking } from '../../models/Booking';
import { User } from '../../models/User';
import { Notification } from '../../models/Notification';
import { AuditLog } from '../../models/AuditLog';
import { AppError } from '../../core/errorHandler';
import { env } from '../../config/env';

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

/**
 * Format Date to VNPay format: yyyyMMddHHmmss in GMT+7
 */
export const formatVnPayDate = (date: Date): string => {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 7 * 3600000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = vnTime.getFullYear();
  const MM = pad(vnTime.getMonth() + 1);
  const dd = pad(vnTime.getDate());
  const HH = pad(vnTime.getHours());
  const mm = pad(vnTime.getMinutes());
  const ss = pad(vnTime.getSeconds());
  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
};

/**
 * Sorts object properties alphabetically and encodes them according to VNPay requirements
 */
export const sortAndSignParams = (
  params: Record<string, any>,
  secretKey: string
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
  queryParams: Record<string, any>,
  secretKey: string = env.VNP_HASHSECRET || 'DEMO_SECRET'
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

  // Calculate amount to pay: Deposit 30% vs Full 100%
  const amountToPay = paymentType === 'Full100' ? booking.totalAmount : booking.depositAmount;

  if (amountToPay <= 0) {
    throw new AppError(400, 'Số tiền thanh toán phải lớn hơn 0 VNĐ.');
  }

  const now = new Date();
  const createDate = formatVnPayDate(now);
  const expireDate = formatVnPayDate(new Date(now.getTime() + 15 * 60 * 1000)); // 15 mins expiry

  const tmnCode = env.VNP_TMNCODE || 'DEMO_CODE';
  const secretKey = env.VNP_HASHSECRET || 'DEMO_SECRET';
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

  const vnpParams: Record<string, any> = {
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
  booking.paymentExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
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
  }).catch((err: unknown) => console.error('AuditLog error:', err));

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
export const processVnPayIpn = async (queryParams: Record<string, any>): Promise<VnPayIpnResult> => {
  const secretKey = env.VNP_HASHSECRET || 'DEMO_SECRET';

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
    booking.paymentType === 'Full100' ? booking.totalAmount : booking.depositAmount;

  if (isNaN(vnpAmount) || Math.round(expectedAmount * 100) !== vnpAmount) {
    return { RspCode: '04', Message: 'Invalid amount' };
  }

  // 3. Idempotency Check: Already confirmed
  if (booking.isPaid || booking.status === 'Confirmed' || booking.status === 'Approved') {
    return { RspCode: '02', Message: 'Order already confirmed' };
  }

  const responseCode = queryParams['vnp_ResponseCode'];
  const transactionStatus = queryParams['vnp_TransactionStatus'];
  const vnpTransactionNo = queryParams['vnp_TransactionNo'] || '';
  const vnpBankCode = queryParams['vnp_BankCode'] || '';
  const vnpPayDateStr = queryParams['vnp_PayDate'];

  let vnpPayDate = new Date();
  if (typeof vnpPayDateStr === 'string' && vnpPayDateStr.length === 14) {
    const yyyy = parseInt(vnpPayDateStr.substring(0, 4), 10);
    const MM = parseInt(vnpPayDateStr.substring(4, 6), 10) - 1;
    const dd = parseInt(vnpPayDateStr.substring(6, 8), 10);
    const HH = parseInt(vnpPayDateStr.substring(8, 10), 10);
    const mm = parseInt(vnpPayDateStr.substring(10, 12), 10);
    const ss = parseInt(vnpPayDateStr.substring(12, 14), 10);
    vnpPayDate = new Date(Date.UTC(yyyy, MM, dd, HH - 7, mm, ss));
  }

  // 4. Check if transaction was successful
  if (responseCode === '00' && transactionStatus === '00') {
    // Payment Successful
    booking.isPaid = true;
    booking.status = 'Confirmed';
    booking.vnpayTransactionNo = String(vnpTransactionNo);
    booking.vnpayBankCode = String(vnpBankCode);
    booking.vnpayPayDate = vnpPayDate;
    await booking.save();

    // Notify user
    await Notification.create({
      userId: booking.userId,
      title: 'Xác nhận cọc 30% thành công qua VNPay',
      body: `Đơn thuê ${booking.bookingCode} đã nhận cọc thành công số tiền ${expectedAmount.toLocaleString('vi-VN')} đ. Xe đã được khóa giữ cho bạn!`,
      type: 'BOOKING',
      relatedId: booking._id.toString(),
      isRead: false,
    }).catch((err: unknown) => console.error('Notification error:', err));

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
        responseCode,
        transactionStatus,
      },
      timestamp: new Date(),
    }).catch((err: unknown) => console.error('AuditLog error:', err));

    return { RspCode: '00', Message: 'Confirm Success' };
  } else {
    // Payment Failed or Cancelled by customer on gateway
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
    }).catch((err: unknown) => console.error('AuditLog error:', err));

    return { RspCode: '00', Message: 'Confirm Success' };
  }
};

/**
 * Handle VNPay Return URL (Customer Browser Redirect)
 */
export const verifyReturnUrlData = async (
  queryParams: Record<string, any>
): Promise<{
  isValid: boolean;
  isSuccess: boolean;
  bookingCode: string;
  amount: number;
  message: string;
  booking?: IBooking | null;
}> => {
  const secretKey = env.VNP_HASHSECRET || 'DEMO_SECRET';
  const isValid = verifyVnPayChecksum(queryParams, secretKey);

  const txnRef = queryParams['vnp_TxnRef'] || '';
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

  const booking = await Booking.findOne({ bookingCode });

  if (responseCode === '00') {
    // If IPN has not arrived yet, we can also ensure booking is updated safely
    if (booking && !booking.isPaid) {
      booking.isPaid = true;
      booking.status = 'Confirmed';
      booking.vnpayTransactionNo = String(queryParams['vnp_TransactionNo'] || '');
      booking.vnpayBankCode = String(queryParams['vnp_BankCode'] || '');
      await booking.save();
    }

    return {
      isValid: true,
      isSuccess: true,
      bookingCode,
      amount,
      message: 'Giao dịch thanh toán cọc thành công.',
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
