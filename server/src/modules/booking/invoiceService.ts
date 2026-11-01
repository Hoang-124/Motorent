import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { Booking, IBooking } from '../../models/Booking';
import { Payment } from '../../models/Payment';
import { AppError } from '../../core/errorHandler';
import { assertBranchAccess } from '../../core/permissions';
import { registerUnicodePdfFonts } from '../../core/pdfFonts';
import { effectivePaymentDate } from '../../core/paymentLedger';

export const streamBookingInvoicePdf = async (
  bookingId: string,
  requestingUser: { _id: unknown; roles: string; fullName?: string; email?: string; branchId?: unknown },
  res: Response
): Promise<void> => {
  const booking = await Booking.findById(bookingId)
    .populate('userId', 'firstName lastName username email phoneNumber')
    .populate('vehicleId', 'vehicleModel brand licensePlate transmissionType fuelType dailyPrice')
    .populate('pickupBranchId', 'name code address phone email')
    .populate('returnBranchId', 'name code address phone email');

  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  const paymentRows = (await Payment.find({ bookingId: booking._id })).sort(
    (a, b) => effectivePaymentDate(a).getTime() - effectivePaymentDate(b).getTime()
  );

  // Permission check
  if (requestingUser.roles === 'Customer') {
    const customerId = (booking.userId as any)?._id?.toString() || booking.userId?.toString();
    if (customerId !== String(requestingUser._id)) {
      throw new AppError(403, 'Bạn không có quyền truy cập hóa đơn của khách hàng khác.');
    }
  } else if (['BranchManager', 'Staff'].includes(requestingUser.roles)) {
    const pickupBranchId = (booking.pickupBranchId as any)?._id?.toString() || booking.pickupBranchId?.toString();
    const returnBranchId = (booking.returnBranchId as any)?._id?.toString() || booking.returnBranchId?.toString();
    assertBranchAccess(requestingUser as any, [pickupBranchId, returnBranchId]);
  }

  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: `Invoice - ${booking.bookingCode}`,
      Author: 'MOTORENT VIETNAM',
      Subject: 'Rental Booking Invoice & Payment Receipt',
    },
  });

  // Set response headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="MOTORENT-INVOICE-${booking.bookingCode}.pdf"`
  );

  doc.pipe(res);

  const fonts = registerUnicodePdfFonts(doc);
  const primaryFont = fonts.regular;
  const boldFont = fonts.bold;

  // --- Header & Branding ---
  doc.rect(40, 40, 515, 60).fill('#161616');
  doc.fillColor('#FFC799').font(boldFont).fontSize(20).text('MOTORENT VIETNAM', 55, 52);
  doc.fillColor('#A0A0A0').font(primaryFont).fontSize(9).text('Hệ thống cho thuê xe máy du lịch & liên trạm thông minh', 55, 78);
  doc.fillColor('#F5F5F5').font(primaryFont).fontSize(9).text('Hotline: 1900 6868  |  support@motorent.vn  |  www.motorent.vn', 280, 78, { align: 'right', width: 260 });

  // --- Document Title ---
  doc.fillColor('#101010').font(boldFont).fontSize(16).text('HÓA ĐƠN THUÊ XE & BIÊN LAI ĐIỆN TỬ', 40, 120, { align: 'center' });
  doc.fillColor('#666666').font(primaryFont).fontSize(10).text(`Mã hợp đồng: ${booking.bookingCode}  •  Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 40, 142, { align: 'center' });

  // Divider
  doc.strokeColor('#DDDDDD').lineWidth(1).moveTo(40, 165).lineTo(555, 165).stroke();

  // --- Customer & Booking Information (2 columns) ---
  const userObj = (booking.userId as any) || {};
  const vehicleObj = (booking.vehicleId as any) || {};
  const pickupBranch = (booking.pickupBranchId as any) || {};
  const returnBranch = (booking.returnBranchId as any) || {};

  const customerName = `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || userObj.username || 'Khách hàng';

  // Left Column: Customer
  doc.fillColor('#FF7A00').font(boldFont).fontSize(11).text('THÔNG TIN KHÁCH HÀNG', 40, 180);
  doc.fillColor('#333333').font(primaryFont).fontSize(10);
  doc.text(`Họ và tên: ${customerName}`, 40, 200);
  doc.text(`Số điện thoại: ${userObj.phoneNumber || 'N/A'}`, 40, 217);
  doc.text(`Email: ${userObj.email || 'N/A'}`, 40, 234);
  doc.text(`Trạng thái đơn: ${booking.status}`, 40, 251);

  // Right Column: Vehicle & Routing
  doc.fillColor('#FF7A00').font(boldFont).fontSize(11).text('PHƯƠNG TIỆN & HÀNH TRÌNH', 300, 180);
  doc.fillColor('#333333').font(primaryFont).fontSize(10);
  doc.text(`Mẫu xe: ${vehicleObj.brand || ''} ${vehicleObj.vehicleModel || 'Xe Motorent'}`, 300, 200);
  doc.text(`Biển số: ${vehicleObj.licensePlate || 'N/A'}  (${vehicleObj.transmissionType || 'Tự động'}, ${vehicleObj.fuelType || 'Xăng'})`, 300, 217);
  doc.text(`Trạm nhận: ${pickupBranch.name || 'Chi nhánh Motorent'}`, 300, 234);
  doc.text(`Trạm trả: ${returnBranch.name || 'Chi nhánh Motorent'}`, 300, 251);
  doc.text(`Thời gian: ${new Date(booking.pickupDateTime).toLocaleDateString('vi-VN')} -> ${new Date(booking.returnDateTime).toLocaleDateString('vi-VN')}`, 300, 268);

  // Divider
  doc.strokeColor('#DDDDDD').lineWidth(1).moveTo(40, 295).lineTo(555, 295).stroke();

  // --- Pricing Table ---
  doc.fillColor('#FF7A00').font(boldFont).fontSize(11).text('CHI TIẾT THANH TOÁN & ĐỐI SOÁT HỢP ĐỒNG', 40, 310);

  // Table Header
  doc.rect(40, 330, 515, 24).fill('#F2F2F2');
  doc.fillColor('#222222').font(boldFont).fontSize(9);
  doc.text('HẠNG MỤC DỊCH VỤ', 50, 337);
  doc.text('ĐƠN GIÁ (VND)', 280, 337);
  doc.text('SỐ LƯỢNG', 380, 337);
  doc.text('THÀNH TIỀN (VND)', 460, 337, { align: 'right', width: 85 });

  // Table Rows
  let y = 360;
  const baseRentalAmount = booking.baseRentalAmount ?? booking.totalAmount + (booking.discountAmount || 0);
  const seasonalSurcharge = booking.seasonalSurcharge || 0;

  // Row 1: Tiền thuê xe
  doc.fillColor('#333333').font(primaryFont).fontSize(9);
  doc.text(`Thuê xe ${vehicleObj.brand || ''} ${vehicleObj.vehicleModel || ''} (giá cơ bản)`, 50, y);
  doc.text('-', 280, y);
  doc.text('-', 380, y);
  doc.text(`${baseRentalAmount.toLocaleString('vi-VN')} đ`, 460, y, { align: 'right', width: 85 });
  y += 20;

  if (seasonalSurcharge !== 0) {
    doc.text(
      seasonalSurcharge > 0 ? 'Phụ thu giá theo mùa (bao gồm gia hạn)' : 'Điều chỉnh giá theo mùa (bao gồm gia hạn)',
      50,
      y
    );
    doc.text('-', 280, y);
    doc.text('-', 380, y);
    doc.fillColor(seasonalSurcharge < 0 ? '#2E7D32' : '#333333').text(
      `${seasonalSurcharge > 0 ? '+' : ''}${seasonalSurcharge.toLocaleString('vi-VN')} đ`,
      460,
      y,
      { align: 'right', width: 85 }
    );
    doc.fillColor('#333333');
    y += 20;
  }

  // Row 2: Khuyến mãi (nếu có)
  if (booking.discountAmount && booking.discountAmount > 0) {
    doc.text('Mã ưu đãi / Voucher giảm giá', 50, y);
    doc.text('-', 280, y);
    doc.text('1', 380, y);
    doc.fillColor('#2E7D32').text(`-${booking.discountAmount.toLocaleString('vi-VN')} đ`, 460, y, { align: 'right', width: 85 });
    doc.fillColor('#333333');
    y += 20;
  }

  // Row 3: Phí trễ hạn (nếu có)
  if (booking.lateFee && booking.lateFee > 0) {
    doc.text('Phụ phí trả trễ giờ (Overdue Fee)', 50, y);
    doc.text('30.000 đ/giờ', 280, y);
    doc.text('-', 380, y);
    doc.fillColor('#C62828').text(`+${booking.lateFee.toLocaleString('vi-VN')} đ`, 460, y, { align: 'right', width: 85 });
    doc.fillColor('#333333');
    y += 20;
  }

  // Row 4: Phí bồi thường hỏng hóc (nếu có)
  if (booking.damageFee && booking.damageFee > 0) {
    doc.text('Phí bồi thường trầy xước / hỏng hóc (Damage Fee)', 50, y);
    doc.text('-', 280, y);
    doc.text('-', 380, y);
    doc.fillColor('#C62828').text(`+${booking.damageFee.toLocaleString('vi-VN')} đ`, 460, y, { align: 'right', width: 85 });
    doc.fillColor('#333333');
    y += 20;
  }

  // Line before summary
  doc.strokeColor('#CCCCCC').lineWidth(0.5).moveTo(40, y + 5).lineTo(555, y + 5).stroke();
  y += 15;

  // Summary Box
  doc.font(boldFont).fontSize(10);
  doc.text('TỔNG CỘNG HỢP ĐỒNG:', 300, y);
  doc.text(`${(booking.totalAmount || 0).toLocaleString('vi-VN')} đ`, 460, y, { align: 'right', width: 85 });
  y += 18;

  doc.font(primaryFont).fontSize(9);
  doc.text('Mức cọc yêu cầu (gồm cọc gia hạn):', 300, y);
  doc.fillColor('#333333').text(`${(booking.depositAmount || 0).toLocaleString('vi-VN')} đ`, 460, y, { align: 'right', width: 85 });
  y += 16;

  doc.text('Đã thanh toán:', 300, y);
  const paidAmount = booking.paidAmount || (booking.depositPaid ? booking.depositAmount : 0);
  doc.fillColor('#2E7D32').text(`${paidAmount.toLocaleString('vi-VN')} đ`, 460, y, { align: 'right', width: 85 });
  doc.fillColor('#333333');
  y += 16;

  doc.text('Còn lại phải thanh toán:', 300, y);
  doc.fillColor(booking.isPaid ? '#2E7D32' : '#C62828').text(`${(booking.remainingAmount || 0).toLocaleString('vi-VN')} đ`, 460, y, { align: 'right', width: 85 });
  doc.fillColor('#333333');
  y += 22;

  // Payment status badge
  doc.rect(300, y, 245, 24).fill(booking.isPaid ? '#E8F5E9' : '#FFF3E0');
  doc.fillColor(booking.isPaid ? '#2E7D32' : '#E65100').font(boldFont).fontSize(9).text(
    booking.isPaid ? 'TRẠNG THÁI: ĐÃ HOÀN TẤT THANH TOÁN 100%' : 'TRẠNG THÁI: ĐÃ THANH TOÁN TIỀN CỌC (CÒN NỢ 70%)',
    305,
    y + 7,
    { align: 'center', width: 235 }
  );

  // Footer notes & terms
  doc.strokeColor('#DDDDDD').lineWidth(1).moveTo(40, 680).lineTo(555, 680).stroke();
  doc.fillColor('#666666').font(primaryFont).fontSize(8);
  doc.text('ĐIỀU KHOẢN & LƯU Ý QUAN TRỌNG:', 40, 690);
  doc.text('1. Hóa đơn và biên lai điện tử này được xuất tự động từ hệ thống quản lý MOTORENT ERP.', 40, 702);
  doc.text('2. Quý khách vui lòng xuất trình mã hợp đồng và CCCD / Hộ chiếu hợp lệ khi nhận xe tại chi nhánh đã chọn.', 40, 714);
  doc.text('3. Mọi thắc mắc về cước phí, hoàn trả cọc (BR-06) hoặc sự cố xin liên hệ Tổng đài 1900 6868 để được trợ giúp 24/7.', 40, 726);

  // Stamp text
  doc.rect(420, 740, 130, 40).strokeColor('#FF7A00').lineWidth(1).stroke();
  doc.fillColor('#FF7A00').font(boldFont).fontSize(8).text('MOTORENT E-INVOICE', 420, 748, { align: 'center', width: 130 });
  doc.fontSize(7).text('HỆ THỐNG XÁC THỰC', 420, 762, { align: 'center', width: 130 });

  if (paymentRows.length > 0) {
    doc.addPage();
    doc.rect(40, 40, 515, 60).fill('#161616');
    doc.fillColor('#FFC799').font(boldFont).fontSize(18).text('MOTORENT VIETNAM', 55, 52);
    doc.fillColor('#A0A0A0').font(primaryFont).fontSize(9).text('SỔ GIAO DỊCH CỦA HỢP ĐỒNG', 55, 78);
    doc.fillColor('#101010').font(boldFont).fontSize(14).text(`Mã hợp đồng: ${booking.bookingCode}`, 40, 120);

    const cashIn = paymentRows.reduce(
      (sum, payment) => sum + (payment.status === 'SUCCESS' && payment.type !== 'REFUND' ? payment.amount : 0),
      0
    );
    const cashOut = paymentRows.reduce(
      (sum, payment) => sum + (payment.status === 'SUCCESS' && payment.type === 'REFUND' ? payment.amount : 0),
      0
    );
    const pendingRefund = paymentRows.reduce(
      (sum, payment) => sum + (payment.status === 'PENDING' && payment.type === 'REFUND' ? payment.amount : 0),
      0
    );

    let ledgerY = 155;
    const drawLedgerHeader = () => {
      doc.rect(40, ledgerY, 515, 24).fill('#374151');
      doc.fillColor('#FFFFFF').font(boldFont).fontSize(8);
      doc.text('Mã giao dịch', 46, ledgerY + 8, { width: 165 });
      doc.text('Thời gian', 216, ledgerY + 8, { width: 88 });
      doc.text('Loại / trạng thái', 308, ledgerY + 8, { width: 100 });
      doc.text('Tiền vào', 414, ledgerY + 8, { width: 65, align: 'right' });
      doc.text('Tiền ra', 483, ledgerY + 8, { width: 65, align: 'right' });
      ledgerY += 24;
    };

    drawLedgerHeader();
    for (let i = 0; i < paymentRows.length; i++) {
      if (ledgerY > 735) {
        doc.addPage();
        ledgerY = 45;
        drawLedgerHeader();
      }
      const payment = paymentRows[i];
      const isSuccessful = payment.status === 'SUCCESS';
      const rowFill = i % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
      doc.rect(40, ledgerY, 515, 22).fill(rowFill);
      doc.fillColor('#1F2937').font(primaryFont).fontSize(7.5);
      doc.text(payment.txnRef, 46, ledgerY + 7, { width: 165, ellipsis: true });
      doc.text(effectivePaymentDate(payment).toLocaleString('vi-VN'), 216, ledgerY + 7, { width: 88 });
      const typeLabel = payment.type === 'REFUND'
        ? 'Hoàn tiền'
        : payment.type === 'COUNTER'
          ? 'Thu tại quầy'
          : payment.type === 'DEPOSIT'
            ? 'Tiền cọc'
            : 'Thanh toán đủ';
      doc.text(`${typeLabel} · ${payment.status}`, 308, ledgerY + 7, { width: 100 });
      doc.text(
        isSuccessful && payment.type !== 'REFUND' ? `${payment.amount.toLocaleString('vi-VN')} đ` : '—',
        414,
        ledgerY + 7,
        { width: 65, align: 'right' }
      );
      doc.text(
        isSuccessful && payment.type === 'REFUND' ? `${payment.amount.toLocaleString('vi-VN')} đ` : '—',
        483,
        ledgerY + 7,
        { width: 65, align: 'right' }
      );
      ledgerY += 22;
    }

    ledgerY += 14;
    if (ledgerY > 720) {
      doc.addPage();
      ledgerY = 50;
    }
    doc.strokeColor('#DDDDDD').moveTo(40, ledgerY).lineTo(555, ledgerY).stroke();
    ledgerY += 14;
    doc.fillColor('#1F2937').font(boldFont).fontSize(10);
    doc.text(`Tổng tiền vào thành công: ${cashIn.toLocaleString('vi-VN')} đ`, 55, ledgerY);
    ledgerY += 18;
    doc.text(`Tổng hoàn tiền thành công: ${cashOut.toLocaleString('vi-VN')} đ`, 55, ledgerY);
    ledgerY += 18;
    doc.text(`Dòng tiền ròng: ${(cashIn - cashOut).toLocaleString('vi-VN')} đ`, 55, ledgerY);
    if (pendingRefund > 0) {
      ledgerY += 18;
      doc.fillColor('#E65100').text(`Hoàn tiền đang chờ xử lý: ${pendingRefund.toLocaleString('vi-VN')} đ`, 55, ledgerY);
    }
  }

  doc.end();
};
