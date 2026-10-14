import { Response } from 'express';
import ExcelJS from 'exceljs';
import { Booking, IBooking } from '../../models/Booking';
import { Payment, IPayment } from '../../models/Payment';
import { Branch } from '../../models/Branch';

export interface ReconcileIssue {
  bookingId?: string;
  bookingCode?: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  type:
    | 'PAID_WITHOUT_PAYMENT_ROW'
    | 'AMOUNT_MISMATCH'
    | 'PAID_AFTER_CANCEL'
    | 'DUPLICATE_TRANSACTION_NUMBER';
  description: string;
  details?: Record<string, unknown>;
}

export interface ReconcileResult {
  totalBookingsChecked: number;
  totalPaymentsChecked: number;
  totalDiscrepancies: number;
  summary: {
    totalBookingsChecked: number;
    totalPaymentsChecked: number;
    totalDiscrepancies: number;
    totalBookingsPaidAmountVND: number;
    totalPaymentsSuccessAmountVND: number;
  };
  issues: ReconcileIssue[];
  discrepancies: ReconcileIssue[];
}

/**
 * UC-120 VNPay & Operational Payment Reconciliation
 * Compares transactions in Payment collection against Bookings
 */
export const reconcilePayments = async (from?: Date, to?: Date): Promise<ReconcileResult> => {
  const bookingFilter: Record<string, unknown> = {};
  const paymentFilter: Record<string, unknown> = {};

  if (from || to) {
    bookingFilter.createdAt = {};
    paymentFilter.createdAt = {};
    if (from) {
      (bookingFilter.createdAt as Record<string, unknown>).$gte = from;
      (paymentFilter.createdAt as Record<string, unknown>).$gte = from;
    }
    if (to) {
      (bookingFilter.createdAt as Record<string, unknown>).$lte = to;
      (paymentFilter.createdAt as Record<string, unknown>).$lte = to;
    }
  }

  const [bookings, payments] = await Promise.all([
    Booking.find(bookingFilter),
    Payment.find(paymentFilter),
  ]);

  const issues: ReconcileIssue[] = [];

  // Group payments by bookingId
  const paymentsByBooking = new Map<string, IPayment[]>();
  const txnNoCounts = new Map<string, number>();

  for (const payment of payments) {
    const bId = payment.bookingId.toString();
    const list = paymentsByBooking.get(bId) || [];
    list.push(payment);
    paymentsByBooking.set(bId, list);

    if (payment.vnpTransactionNo) {
      txnNoCounts.set(payment.vnpTransactionNo, (txnNoCounts.get(payment.vnpTransactionNo) || 0) + 1);
    }
  }

  // Check 1: Duplicate transaction numbers
  for (const [txnNo, count] of txnNoCounts.entries()) {
    if (count > 1) {
      issues.push({
        severity: 'HIGH',
        type: 'DUPLICATE_TRANSACTION_NUMBER',
        description: `Mã giao dịch VNPay ${txnNo} bị ghi nhận trùng lặp ${count} lần trên hệ thống.`,
        details: { vnpTransactionNo: txnNo, count },
      });
    }
  }

  let totalBookingsPaidAmountVND = 0;
  let totalPaymentsSuccessAmountVND = 0;

  for (const p of payments) {
    if (p.status === 'SUCCESS') {
      totalPaymentsSuccessAmountVND += Math.round(p.amount);
    }
  }

  // Check 2: Check each booking against its payment records
  for (const booking of bookings) {
    const bPaid = Math.round(booking.paidAmount || 0);
    totalBookingsPaidAmountVND += bPaid;

    const relatedPayments = paymentsByBooking.get(booking._id.toString()) || [];
    const successfulPayments = relatedPayments.filter((p) => p.status === 'SUCCESS');
    const paymentSum = successfulPayments.reduce((sum, p) => sum + Math.round(p.amount), 0);

    // Paid booking with no payment record
    if ((booking.isPaid || booking.depositPaid || bPaid > 0) && relatedPayments.length === 0) {
      issues.push({
        bookingId: booking._id.toString(),
        bookingCode: booking.bookingCode,
        severity: 'HIGH',
        type: 'PAID_WITHOUT_PAYMENT_ROW',
        description: `Đơn ${booking.bookingCode} ghi nhận đã thanh toán (${bPaid.toLocaleString('vi-VN')} đ) nhưng không tìm thấy bản ghi giao dịch trong bảng Payment.`,
        details: { paidAmount: bPaid, status: booking.status },
      });
    }

    // Amount mismatch between Booking.paidAmount and sum(Payment.amount)
    if (bPaid > 0 && paymentSum > 0 && bPaid !== paymentSum) {
      issues.push({
        bookingId: booking._id.toString(),
        bookingCode: booking.bookingCode,
        severity: 'HIGH',
        type: 'AMOUNT_MISMATCH',
        description: `Chênh lệch số tiền đã thu trên đơn ${booking.bookingCode}: Booking ghi nhận ${bPaid.toLocaleString('vi-VN')} đ, tổng giao dịch Payment thành công là ${paymentSum.toLocaleString('vi-VN')} đ.`,
        details: { bookingPaidAmount: bPaid, paymentsSum: paymentSum },
      });
    }

    // Paid after cancel edge case
    if (booking.status === 'Cancelled' && paymentSum > 0) {
      issues.push({
        bookingId: booking._id.toString(),
        bookingCode: booking.bookingCode,
        severity: 'MEDIUM',
        type: 'PAID_AFTER_CANCEL',
        description: `Đơn ${booking.bookingCode} đã bị hủy nhưng phát sinh giao dịch thanh toán thành công (${paymentSum.toLocaleString('vi-VN')} đ). Cần tiến hành hoàn tiền cho khách.`,
        details: { paidAmount: paymentSum, cancelReason: booking.cancelReason },
      });
    }
  }

  return {
    totalBookingsChecked: bookings.length,
    totalPaymentsChecked: payments.length,
    totalDiscrepancies: issues.length,
    discrepancies: issues,
    issues,
    summary: {
      totalBookingsChecked: bookings.length,
      totalPaymentsChecked: payments.length,
      totalDiscrepancies: issues.length,
      totalBookingsPaidAmountVND,
      totalPaymentsSuccessAmountVND,
    },
  };
};

/**
 * UC-121 Export Tax Report via Streaming ExcelJS
 * Outputs integer VND revenue, VAT calculations, per branch.
 */
export const streamTaxReportExcel = async (
  period: 'month' | 'quarter',
  year: number,
  n: number,
  vatRate: number,
  res: Response
): Promise<void> => {
  let startDate: Date;
  let endDate: Date;

  if (period === 'month') {
    const month = Math.max(1, Math.min(12, n)) - 1;
    startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  } else {
    const quarter = Math.max(1, Math.min(4, n));
    const startMonth = (quarter - 1) * 3;
    startDate = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0));
    endDate = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59, 999));
  }

  const branches = await Branch.find({ isActive: true });
  const branchMap = new Map<string, string>();
  branches.forEach((b) => branchMap.set(b._id.toString(), `${b.name} (${b.code})`));

  // Find completed bookings in the period
  const completedBookings = await Booking.find({
    status: 'Completed',
    actualReturnDateTime: { $gte: startDate, $lte: endDate },
  });

  // Calculate integer metrics per branch
  interface BranchMetric {
    name: string;
    completedTrips: number;
    grossRevenue: number;
    vatAmount: number;
    netRevenue: number;
  }

  const metricsByBranch = new Map<string, BranchMetric>();

  for (const b of branches) {
    metricsByBranch.set(b._id.toString(), {
      name: `${b.name} (${b.code})`,
      completedTrips: 0,
      grossRevenue: 0,
      vatAmount: 0,
      netRevenue: 0,
    });
  }

  for (const booking of completedBookings) {
    const bId = booking.pickupBranchId.toString();
    const metric = metricsByBranch.get(bId) || {
      name: 'Chi nhánh khác',
      completedTrips: 0,
      grossRevenue: 0,
      vatAmount: 0,
      netRevenue: 0,
    };

    const gross = Math.round(booking.paidAmount || booking.totalAmount || 0);
    const net = Math.round(gross / (1 + vatRate));
    const vat = gross - net;

    metric.completedTrips += 1;
    metric.grossRevenue += gross;
    metric.netRevenue += net;
    metric.vatAmount += vat;

    metricsByBranch.set(bId, metric);
  }

  // Set response headers for streaming XLSX file
  const filename = `Bao_Cao_Thue_Motorent_${period}_${n}_${year}.xlsx`;
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: res,
    useStyles: true,
  });

  const worksheet = workbook.addWorksheet('Báo Cáo Thuế');

  worksheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Chi Nhánh Hoạt Động', key: 'branch', width: 45 },
    { header: 'Số Lượt Thuê Hoàn Tất', key: 'trips', width: 22 },
    { header: 'Doanh Thu Trước Thuế (VNĐ)', key: 'net', width: 28 },
    { header: `Thuế GTGT (${Math.round(vatRate * 100)}%) (VNĐ)`, key: 'vat', width: 24 },
    { header: 'Tổng Doanh Thu Đã Thu (VNĐ)', key: 'gross', width: 28 },
  ];

  let stt = 1;
  let totalTrips = 0;
  let totalNet = 0;
  let totalVat = 0;
  let totalGross = 0;

  for (const item of metricsByBranch.values()) {
    worksheet.addRow({
      stt: stt++,
      branch: item.name,
      trips: item.completedTrips,
      net: item.netRevenue,
      vat: item.vatAmount,
      gross: item.grossRevenue,
    }).commit();

    totalTrips += item.completedTrips;
    totalNet += item.netRevenue;
    totalVat += item.vatAmount;
    totalGross += item.grossRevenue;
  }

  // Add summary total row
  worksheet.addRow({
    stt: 'TỔNG CỘNG',
    branch: 'Toàn bộ hệ thống MOTORENT',
    trips: totalTrips,
    net: totalNet,
    vat: totalVat,
    gross: totalGross,
  }).commit();

  await worksheet.commit();
  await workbook.commit();
};
