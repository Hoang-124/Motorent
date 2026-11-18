import { Response } from 'express';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import { Booking } from '../../models/Booking';
import { Payment, IPayment } from '../../models/Payment';
import { Branch } from '../../models/Branch';
import { effectivePaymentDate, paymentLedgerDateFilter } from '../../core/paymentLedger';

export interface ReconcileIssue {
  bookingId?: string;
  bookingCode: string;
  status: string;
  expectedPaid: number;
  recordedPaymentsTotal: number;
  difference: number;
  issue: string;
  createdAt?: string;
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
  range: { from: string | null; to: string | null };
  branchId?: string | null;
  totalBookingsChecked: number;
  totalPaymentsChecked: number;
  totalDiscrepancies: number;
  summary: {
    totalBookingsChecked: number;
    totalPaymentsChecked: number;
    totalDiscrepancies: number;
    totalBookingsPaidAmountVND: number;
    totalPaymentsSuccessAmountVND: number;
    totalRevenueRecorded: number;
    totalRefundsRecorded: number;
    netCashflow: number;
    matchedCount: number;
    discrepancyCount: number;
    pendingRefundsAmountVND: number;
    failedRefundsAmountVND: number;
  };
  issues: ReconcileIssue[];
  discrepancies: ReconcileIssue[];
}

/**
 * UC-120 VNPay & Operational Payment Reconciliation
 * Compares transactions in Payment collection against Bookings, scoped by branchId when requested.
 */
export const reconcilePayments = async (
  from?: Date,
  to?: Date,
  branchId?: string
): Promise<ReconcileResult> => {
  const bookingFilter: Record<string, unknown> = {};
  const paymentFilter: Record<string, unknown> = { ...paymentLedgerDateFilter(from, to) };

  if (branchId && mongoose.isValidObjectId(branchId)) {
    const branchObjId = new mongoose.Types.ObjectId(branchId);
    bookingFilter.pickupBranchId = branchObjId;
    const allBranchBookingIds = await Booking.find({ pickupBranchId: branchObjId }).distinct('_id');
    paymentFilter.bookingId = { $in: allBranchBookingIds };
  }

  if (from || to) {
    bookingFilter.createdAt = {};
    if (from) {
      (bookingFilter.createdAt as Record<string, unknown>).$gte = from;
    }
    if (to) {
      (bookingFilter.createdAt as Record<string, unknown>).$lte = to;
    }
  }

  const [bookings, payments] = await Promise.all([
    Booking.find(bookingFilter),
    Payment.find(paymentFilter),
  ]);

  // Fetch full lifetime payments for the checked bookings so cross-date 70% checkout settlements
  // do not trigger false-positive AMOUNT_MISMATCH warnings.
  const checkedBookingIds = bookings.map((b) => b._id);
  const lifetimePaymentsForBookings =
    checkedBookingIds.length > 0
      ? await Payment.find({ bookingId: { $in: checkedBookingIds } })
      : [];

  const issues: ReconcileIssue[] = [];

  // Group lifetime payments by bookingId for accurate per-booking ledger verification
  const paymentsByBooking = new Map<string, IPayment[]>();
  for (const payment of lifetimePaymentsForBookings) {
    const bId = payment.bookingId.toString();
    const list = paymentsByBooking.get(bId) || [];
    list.push(payment);
    paymentsByBooking.set(bId, list);
  }

  // Track duplicate VNPay transaction numbers within the selected window & branch
  const txnNoPayments = new Map<string, IPayment[]>();
  for (const payment of payments) {
    if (payment.vnpTransactionNo) {
      const existingList = txnNoPayments.get(payment.vnpTransactionNo) || [];
      existingList.push(payment);
      txnNoPayments.set(payment.vnpTransactionNo, existingList);
    }
  }

  // Check 1: Duplicate transaction numbers
  for (const [txnNo, dupList] of txnNoPayments.entries()) {
    if (dupList.length > 1) {
      const dupTotal = dupList.reduce((sum, p) => sum + Math.round(p.amount || 0), 0);
      const firstAmt = Math.round(dupList[0]?.amount || 0);
      const desc = `Mã giao dịch VNPay ${txnNo} bị ghi nhận trùng lặp ${dupList.length} lần trên hệ thống.`;
      issues.push({
        bookingId: dupList[0]?.bookingId?.toString(),
        bookingCode: `TXN-${txnNo}`,
        status: 'Trùng mã GD',
        expectedPaid: firstAmt,
        recordedPaymentsTotal: dupTotal,
        difference: dupTotal - firstAmt,
        issue: desc,
        createdAt: dupList[0]?.createdAt ? dupList[0].createdAt.toISOString() : undefined,
        severity: 'HIGH',
        type: 'DUPLICATE_TRANSACTION_NUMBER',
        description: desc,
        details: { vnpTransactionNo: txnNo, count: dupList.length },
      });
    }
  }

  let totalBookingsPaidAmountVND = 0;
  let totalPaymentsSuccessAmountVND = 0;
  let totalRefundsRecorded = 0;
  let pendingRefundsAmountVND = 0;
  let failedRefundsAmountVND = 0;

  for (const p of payments) {
    if (p.status === 'SUCCESS' && p.type === 'REFUND') {
      totalRefundsRecorded += Math.round(p.amount);
    } else if (p.status === 'SUCCESS') {
      totalPaymentsSuccessAmountVND += Math.round(p.amount);
    } else if (p.type === 'REFUND' && p.status === 'PENDING') {
      pendingRefundsAmountVND += Math.round(p.amount);
    } else if (p.type === 'REFUND' && p.status === 'FAILED') {
      failedRefundsAmountVND += Math.round(p.amount);
    }
  }

  // Check 2: Check each booking against its payment records
  for (const booking of bookings) {
    const bPaid = Math.round(booking.paidAmount || 0);
    totalBookingsPaidAmountVND += bPaid;

    const relatedPayments = paymentsByBooking.get(booking._id.toString()) || [];
    const successfulPayments = relatedPayments.filter(
      (p) => p.status === 'SUCCESS' && p.type !== 'REFUND'
    );
    const paymentSum = successfulPayments.reduce((sum, p) => sum + Math.round(p.amount), 0);
    const createdIso = booking.createdAt ? booking.createdAt.toISOString() : undefined;

    // Paid booking with no payment record
    if ((booking.isPaid || booking.depositPaid || bPaid > 0) && relatedPayments.length === 0) {
      const desc = `Đơn ${booking.bookingCode} ghi nhận đã thanh toán (${bPaid.toLocaleString('vi-VN')} đ) nhưng không tìm thấy bản ghi giao dịch trong bảng Payment.`;
      issues.push({
        bookingId: booking._id.toString(),
        bookingCode: booking.bookingCode,
        status: booking.status,
        expectedPaid: bPaid,
        recordedPaymentsTotal: 0,
        difference: -bPaid,
        issue: desc,
        createdAt: createdIso,
        severity: 'HIGH',
        type: 'PAID_WITHOUT_PAYMENT_ROW',
        description: desc,
        details: { paidAmount: bPaid, status: booking.status },
      });
    }

    // Amount mismatch between Booking.paidAmount and sum(Payment.amount)
    if (bPaid > 0 && paymentSum > 0 && bPaid !== paymentSum) {
      const desc = `Chênh lệch số tiền đã thu trên đơn ${booking.bookingCode}: Booking ghi nhận ${bPaid.toLocaleString('vi-VN')} đ, tổng giao dịch Payment thành công là ${paymentSum.toLocaleString('vi-VN')} đ.`;
      issues.push({
        bookingId: booking._id.toString(),
        bookingCode: booking.bookingCode,
        status: booking.status,
        expectedPaid: bPaid,
        recordedPaymentsTotal: paymentSum,
        difference: paymentSum - bPaid,
        issue: desc,
        createdAt: createdIso,
        severity: 'HIGH',
        type: 'AMOUNT_MISMATCH',
        description: desc,
        details: { bookingPaidAmount: bPaid, paymentsSum: paymentSum },
      });
    }

    // Paid after cancel edge case
    if (booking.status === 'Cancelled' && paymentSum > 0 && booking.refundStatus === 'Pending') {
      const desc = `Đơn ${booking.bookingCode} đã bị hủy sau khi phát sinh giao dịch thanh toán (${paymentSum.toLocaleString('vi-VN')} đ) và đang chờ đối soát hoàn tiền.`;
      issues.push({
        bookingId: booking._id.toString(),
        bookingCode: booking.bookingCode,
        status: booking.status,
        expectedPaid: bPaid,
        recordedPaymentsTotal: paymentSum,
        difference: paymentSum - bPaid,
        issue: desc,
        createdAt: createdIso,
        severity: 'MEDIUM',
        type: 'PAID_AFTER_CANCEL',
        description: desc,
        details: { paidAmount: paymentSum, cancelReason: booking.cancelReason },
      });
    }
  }

  return {
    range: {
      from: from ? from.toISOString() : null,
      to: to ? to.toISOString() : null,
    },
    branchId: branchId || null,
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
      totalRevenueRecorded: totalPaymentsSuccessAmountVND,
      totalRefundsRecorded,
      netCashflow: totalPaymentsSuccessAmountVND - totalRefundsRecorded,
      matchedCount: Math.max(
        0,
        bookings.length - new Set(issues.filter((issue) => issue.bookingId).map((issue) => issue.bookingId)).size
      ),
      discrepancyCount: issues.length,
      pendingRefundsAmountVND,
      failedRefundsAmountVND,
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
  const completedBookings = await Booking.find({
    status: 'Completed',
    actualReturnDateTime: { $gte: startDate, $lte: endDate },
  });

  const payments = await Payment.find(paymentLedgerDateFilter(startDate, endDate))
    .populate('bookingId', 'bookingCode pickupBranchId')
    .sort({ createdAt: 1 });

  // Calculate integer metrics per branch
  interface BranchMetric {
    name: string;
    completedTrips: number;
    cashIn: number;
    refunds: number;
    netCollected: number;
    vatAmount: number;
    netRevenue: number;
  }

  const metricsByBranch = new Map<string, BranchMetric>();

  for (const b of branches) {
    metricsByBranch.set(b._id.toString(), {
      name: `${b.name} (${b.code})`,
      completedTrips: 0,
      cashIn: 0,
      refunds: 0,
      netCollected: 0,
      vatAmount: 0,
      netRevenue: 0,
    });
  }

  for (const booking of completedBookings) {
    const bId = booking.pickupBranchId.toString();
    const metric = metricsByBranch.get(bId) || {
      name: 'Chi nhánh khác',
      completedTrips: 0,
      cashIn: 0,
      refunds: 0,
      netCollected: 0,
      vatAmount: 0,
      netRevenue: 0,
    };
    metric.completedTrips += 1;
    metricsByBranch.set(bId, metric);
  }

  for (const payment of payments) {
    const booking = payment.bookingId as unknown as {
      bookingCode?: string;
      pickupBranchId?: { _id?: unknown } | string;
    } | null;
    const pickupBranch =
      typeof booking?.pickupBranchId === 'object' && booking?.pickupBranchId !== null
        ? booking.pickupBranchId._id
        : booking?.pickupBranchId;
    const branchId = pickupBranch ? String(pickupBranch) : '';
    const metric = metricsByBranch.get(branchId) || {
      name: 'Chi nhánh khác',
      completedTrips: 0,
      cashIn: 0,
      refunds: 0,
      netCollected: 0,
      vatAmount: 0,
      netRevenue: 0,
    };

    if (payment.status === 'SUCCESS') {
      if (payment.type === 'REFUND') metric.refunds += Math.round(payment.amount || 0);
      else metric.cashIn += Math.round(payment.amount || 0);
    }
    metricsByBranch.set(branchId, metric);
  }

  for (const metric of metricsByBranch.values()) {
    metric.netCollected = metric.cashIn - metric.refunds;
    metric.netRevenue = Math.round(metric.netCollected / (1 + vatRate));
    metric.vatAmount = metric.netCollected - metric.netRevenue;
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
    { header: 'STT', key: 'stt', width: 8, style: { font: { name: 'Arial' } } },
    { header: 'Chi Nhánh Hoạt Động', key: 'branch', width: 45, style: { font: { name: 'Arial' } } },
    { header: 'Số Lượt Thuê Hoàn Tất', key: 'trips', width: 22, style: { font: { name: 'Arial' } } },
    { header: 'Tiền Vào Thành Công (VNĐ)', key: 'cashIn', width: 28, style: { font: { name: 'Arial' }, numFmt: '#,##0' } },
    { header: 'Hoàn Tiền Ra (VNĐ)', key: 'refunds', width: 24, style: { font: { name: 'Arial' }, numFmt: '#,##0' } },
    { header: 'Thuần Sau Hoàn Tiền (VNĐ)', key: 'collected', width: 29, style: { font: { name: 'Arial' }, numFmt: '#,##0' } },
    { header: 'Doanh Thu Trước Thuế (VNĐ)', key: 'net', width: 28, style: { font: { name: 'Arial' }, numFmt: '#,##0' } },
    { header: `Thuế GTGT (${Math.round(vatRate * 100)}%) (VNĐ)`, key: 'vat', width: 24, style: { font: { name: 'Arial' }, numFmt: '#,##0' } },
  ];

  const summaryRow = worksheet.getRow(1);
  summaryRow.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
  summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
  summaryRow.commit();

  let stt = 1;
  let totalTrips = 0;
  let totalNet = 0;
  let totalVat = 0;
  let totalCashIn = 0;
  let totalRefunds = 0;
  let totalCollected = 0;

  for (const item of metricsByBranch.values()) {
    worksheet.addRow({
      stt: stt++,
      branch: item.name,
      trips: item.completedTrips,
      cashIn: item.cashIn,
      refunds: item.refunds,
      collected: item.netCollected,
      net: item.netRevenue,
      vat: item.vatAmount,
    }).commit();

    totalTrips += item.completedTrips;
    totalNet += item.netRevenue;
    totalVat += item.vatAmount;
    totalCashIn += item.cashIn;
    totalRefunds += item.refunds;
    totalCollected += item.netCollected;
  }

  // Add summary total row
  worksheet.addRow({
    stt: 'TỔNG CỘNG',
    branch: 'Toàn bộ hệ thống MOTORENT',
    trips: totalTrips,
    cashIn: totalCashIn,
    refunds: totalRefunds,
    collected: totalCollected,
    net: totalNet,
    vat: totalVat,
  }).commit();

  await worksheet.commit();

  const transactionsSheet = workbook.addWorksheet('Sổ giao dịch');
  transactionsSheet.columns = [
    { header: 'Thời gian', key: 'createdAt', width: 22, style: { font: { name: 'Arial' }, numFmt: 'dd/mm/yyyy hh:mm' } },
    { header: 'Mã giao dịch', key: 'txnRef', width: 36, style: { font: { name: 'Arial' } } },
    { header: 'Mã đơn', key: 'bookingCode', width: 22, style: { font: { name: 'Arial' } } },
    { header: 'Chi nhánh', key: 'branch', width: 45, style: { font: { name: 'Arial' } } },
    { header: 'Loại giao dịch', key: 'type', width: 22, style: { font: { name: 'Arial' } } },
    { header: 'Trạng thái', key: 'status', width: 16, style: { font: { name: 'Arial' } } },
    { header: 'Tiền vào (VNĐ)', key: 'cashIn', width: 20, style: { font: { name: 'Arial' }, numFmt: '#,##0' } },
    { header: 'Tiền ra (VNĐ)', key: 'cashOut', width: 20, style: { font: { name: 'Arial' }, numFmt: '#,##0' } },
  ];
  const transactionHeader = transactionsSheet.getRow(1);
  transactionHeader.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
  transactionHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
  transactionHeader.commit();
  const branchNameById = new Map(branches.map((branch) => [branch._id.toString(), `${branch.name} (${branch.code})`]));
  for (const payment of payments) {
    const booking = payment.bookingId as unknown as {
      bookingCode?: string;
      pickupBranchId?: { _id?: unknown } | string;
    } | null;
    const pickupBranch =
      typeof booking?.pickupBranchId === 'object' && booking?.pickupBranchId !== null
        ? booking.pickupBranchId._id
        : booking?.pickupBranchId;
    const branchId = pickupBranch ? String(pickupBranch) : '';
    const isSuccessful = payment.status === 'SUCCESS';
    transactionsSheet.addRow({
      createdAt: effectivePaymentDate(payment),
      txnRef: payment.txnRef,
      bookingCode: booking?.bookingCode || 'Không rõ đơn',
      branch: branchNameById.get(branchId) || 'Chi nhánh khác',
      type: payment.type === 'REFUND' ? 'Hoàn tiền' : payment.type === 'COUNTER' ? 'Thu tại quầy' : payment.type === 'DEPOSIT' ? 'Cọc' : 'Thanh toán đủ',
      status: payment.status,
      cashIn: isSuccessful && payment.type !== 'REFUND' ? payment.amount : 0,
      cashOut: isSuccessful && payment.type === 'REFUND' ? payment.amount : 0,
    }).commit();
  }
  await transactionsSheet.commit();
  await workbook.commit();
};
