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
  doc.fillColor('#101010').font(boldFont).fontSize(15).text('HỢP ĐỒNG THUÊ XE MÁY SONG PHƯƠNG & HÓA ĐƠN ĐIỆN TỬ', 40, 118, { align: 'center' });
  doc.fillColor('#666666').font(primaryFont).fontSize(9.5).text(`Mã hợp đồng: ${booking.bookingCode}  |  Ngày lập: ${new Date().toLocaleDateString('vi-VN')}  |  Hiệu lực: Cả 2 bên (Bên thuê & Bên cho thuê)`, 40, 140, { align: 'center' });

  // Divider
  doc.strokeColor('#DDDDDD').lineWidth(1).moveTo(40, 162).lineTo(555, 162).stroke();

  // --- Customer & Booking Information (2 columns) ---
  const userObj = (booking.userId as any) || {};
  const vehicleObj = (booking.vehicleId as any) || {};
  const pickupBranch = (booking.pickupBranchId as any) || {};
  const returnBranch = (booking.returnBranchId as any) || {};

  const customerName = booking.receiverName || `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || userObj.username || 'Khách hàng';
  const customerPhone = booking.receiverPhone || userObj.phoneNumber || 'N/A';
  const isDoorDelivery = booking.deliveryMode === 'DoorDelivery';

  // Left Column: Parties (Bên A & Bên B)
  doc.fillColor('#FF7A00').font(boldFont).fontSize(10.5).text('BÊN B (BÊN THUÊ XE) & BÊN A (CHO THUÊ)', 40, 174);
  doc.fillColor('#333333').font(primaryFont).fontSize(9);
  doc.text(`Bên B (Người thuê): ${customerName}`, 40, 192);
  doc.text(`SĐT / CCCD: ${customerPhone}${booking.receiverIdCard ? ` - ${booking.receiverIdCard}` : ''}`, 40, 207);
  doc.text(`Email: ${userObj.email || 'N/A'}`, 40, 222);
  doc.text(`Bên A (Cho thuê): ${pickupBranch.name || 'Công ty TNHH Motorent Việt Nam'}`, 40, 237);
  doc.text(`Hotline trạm: ${pickupBranch.phone || '1900 6868'}  |  Trạng thái: ${booking.status}`, 40, 252);

  // Right Column: Vehicle & Routing (supports DoorDelivery custom pickup/return)
  doc.fillColor('#FF7A00').font(boldFont).fontSize(10.5).text('PHƯƠNG TIỆN & ĐỊA ĐIỂM GIAO NHẬN', 300, 174);
  doc.fillColor('#333333').font(primaryFont).fontSize(9);
  doc.text(`Mẫu xe: ${vehicleObj.brand || ''} ${vehicleObj.vehicleModel || 'Xe Motorent'} (${vehicleObj.licensePlate || 'N/A'})`, 300, 192);
  doc.text(`Hình thức: ${isDoorDelivery ? 'Giao & Nhận xe tận nơi ngoài cửa hàng' : 'Nhận & Trả xe tại Cửa hàng (Chi nhánh)'}`, 300, 207);
  doc.text(
    `Điểm nhận: ${isDoorDelivery && booking.customPickupAddress ? booking.customPickupAddress : (pickupBranch.name || 'Chi nhánh Motorent')}`,
    300,
    222,
    { width: 255, ellipsis: true }
  );
  doc.text(
    `Điểm trả: ${isDoorDelivery && booking.customReturnAddress ? booking.customReturnAddress : (returnBranch.name || 'Chi nhánh Motorent')}`,
    300,
    237,
    { width: 255, ellipsis: true }
  );
  doc.text(`Thời hạn: ${new Date(booking.pickupDateTime).toLocaleDateString('vi-VN')} -> ${new Date(booking.returnDateTime).toLocaleDateString('vi-VN')}`, 300, 252);

  // Divider
  doc.strokeColor('#DDDDDD').lineWidth(1).moveTo(40, 276).lineTo(555, 276).stroke();

  // --- Pricing Table ---
  doc.fillColor('#FF7A00').font(boldFont).fontSize(10.5).text('CHI TIẾT THANH TOÁN & ĐỐI SOÁT HỢP ĐỒNG', 40, 288);

  // Table Header
  doc.rect(40, 306, 515, 22).fill('#F2F2F2');
  doc.fillColor('#222222').font(boldFont).fontSize(9);
  doc.text('HẠNG MỤC DỊCH VỤ', 50, 313);
  doc.text('ĐƠN GIÁ (VND)', 280, 313);
  doc.text('SỐ LƯỢNG', 380, 313);
  doc.text('THÀNH TIỀN (VND)', 460, 313, { align: 'right', width: 85 });

  // Table Rows
  let y = 335;
  const deliveryFee = booking.deliveryFee || 0;
  const baseRentalAmount =
    booking.baseRentalAmount ??
    Math.max(0, booking.totalAmount + (booking.discountAmount || 0) - deliveryFee);
  const seasonalSurcharge = booking.seasonalSurcharge || 0;

  // Row 1: Tiền thuê xe
  doc.fillColor('#333333').font(primaryFont).fontSize(9);
  doc.text(`Thuê xe ${vehicleObj.brand || ''} ${vehicleObj.vehicleModel || ''} (giá cơ bản)`, 50, y);
  doc.text('-', 280, y);
  doc.text('-', 380, y);
  doc.text(`${baseRentalAmount.toLocaleString('vi-VN')} đ`, 460, y, { align: 'right', width: 85 });
  y += 18;

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
    y += 18;
  }

  // Row: Phí giao nhận xe tận nơi ngoài cửa hàng (nếu có)
  if (deliveryFee > 0) {
    doc.text('Phí vận chuyển / giao nhận xe tận nơi (Door-to-Door)', 50, y);
    doc.text('40.000 đ/chiều', 280, y);
    doc.text(deliveryFee >= 80000 ? '2 chiều' : '1 chiều', 380, y);
    doc.fillColor('#1565C0').text(`+${deliveryFee.toLocaleString('vi-VN')} đ`, 460, y, { align: 'right', width: 85 });
    doc.fillColor('#333333');
    y += 18;
  }

  // Row 2: Khuyến mãi (nếu có)
  if (booking.discountAmount && booking.discountAmount > 0) {
    doc.text('Mã ưu đãi / Voucher giảm giá', 50, y);
    doc.text('-', 280, y);
    doc.text('1', 380, y);
    doc.fillColor('#2E7D32').text(`-${booking.discountAmount.toLocaleString('vi-VN')} đ`, 460, y, { align: 'right', width: 85 });
    doc.fillColor('#333333');
    y += 18;
  }

  // Row 3: Phí trễ hạn (nếu có)
  if (booking.lateFee && booking.lateFee > 0) {
    doc.text('Phụ phí trả trễ giờ (Overdue Fee)', 50, y);
    doc.text('30.000 đ/giờ', 280, y);
    doc.text('-', 380, y);
    doc.fillColor('#C62828').text(`+${booking.lateFee.toLocaleString('vi-VN')} đ`, 460, y, { align: 'right', width: 85 });
    doc.fillColor('#333333');
    y += 18;
  }

  // Row 4: Phí bồi thường hỏng hóc (nếu có)
  if (booking.damageFee && booking.damageFee > 0) {
    doc.text('Phí bồi thường trầy xước / hỏng hóc (Damage Fee)', 50, y);
    doc.text('-', 280, y);
    doc.text('-', 380, y);
    doc.fillColor('#C62828').text(`+${booking.damageFee.toLocaleString('vi-VN')} đ`, 460, y, { align: 'right', width: 85 });
    doc.fillColor('#333333');
    y += 18;
  }

  // Line before summary
  doc.strokeColor('#CCCCCC').lineWidth(0.5).moveTo(40, y + 4).lineTo(555, y + 4).stroke();
  y += 12;

  // Summary Box
  doc.font(boldFont).fontSize(10);
  doc.text('TỔNG CỘNG HỢP ĐỒNG:', 300, y);
  doc.text(`${(booking.totalAmount || 0).toLocaleString('vi-VN')} đ`, 460, y, { align: 'right', width: 85 });
  y += 16;

  doc.font(primaryFont).fontSize(9);
  doc.text('Mức cọc yêu cầu (gồm cọc gia hạn):', 300, y);
  doc.fillColor('#333333').text(`${(booking.depositAmount || 0).toLocaleString('vi-VN')} đ`, 460, y, { align: 'right', width: 85 });
  y += 15;

  doc.text('Đã thanh toán:', 300, y);
  const paidAmount = booking.paidAmount || (booking.depositPaid ? booking.depositAmount : 0);
  doc.fillColor('#2E7D32').text(`${paidAmount.toLocaleString('vi-VN')} đ`, 460, y, { align: 'right', width: 85 });
  doc.fillColor('#333333');
  y += 15;

  doc.text('Còn lại phải thanh toán:', 300, y);
  doc.fillColor(booking.isPaid ? '#2E7D32' : '#C62828').text(`${(booking.remainingAmount || 0).toLocaleString('vi-VN')} đ`, 460, y, { align: 'right', width: 85 });
  doc.fillColor('#333333');
  y += 18;

  // Payment status badge
  doc.rect(300, y, 245, 22).fill(booking.isPaid ? '#E8F5E9' : '#FFF3E0');
  doc.fillColor(booking.isPaid ? '#2E7D32' : '#E65100').font(boldFont).fontSize(8.5).text(
    booking.isPaid ? 'TRẠNG THÁI: ĐÃ HOÀN TẤT THANH TOÁN 100%' : 'TRẠNG THÁI: ĐÃ THANH TOÁN TIỀN CỌC (CÒN NỢ 70%)',
    305,
    y + 6,
    { align: 'center', width: 235 }
  );

  // --- Bilateral Contract Signatures (Chữ ký của cả Bên cho thuê & Bên thuê) ---
  const sigTop = Math.max(y + 34, 520);
  doc.strokeColor('#DDDDDD').lineWidth(0.8).moveTo(40, sigTop).lineTo(555, sigTop).stroke();
  doc.fillColor('#FF7A00').font(boldFont).fontSize(10).text(
    'XÁC NHẬN HỢP ĐỒNG SONG PHƯƠNG (MỖI BÊN GIỮ 01 BẢN CÓ GIÁ TRỊ PHÁP LÝ NHƯ NHAU)',
    40,
    sigTop + 8,
    { align: 'center', width: 515 }
  );

  const boxY = sigTop + 26;
  // Left Box: Bên A (Bên cho thuê)
  doc.rect(40, boxY, 245, 110).strokeColor('#CCCCCC').lineWidth(0.8).stroke();
  doc.fillColor('#101010').font(boldFont).fontSize(9.5).text('ĐẠI DIỆN BÊN CHO THUÊ (BÊN A)', 45, boxY + 8, { align: 'center', width: 235 });
  doc.fillColor('#666666').font(primaryFont).fontSize(8).text(pickupBranch.name || 'MOTORENT VIETNAM', 45, boxY + 22, { align: 'center', width: 235 });

  const renderDataUriSignature = (dataUri: string | undefined, x: number, yPos: number) => {
    if (!dataUri || !dataUri.startsWith('data:image/')) return false;
    try {
      const base64Part = dataUri.split(',')[1];
      if (!base64Part) return false;
      const imgBuffer = Buffer.from(base64Part, 'base64');
      doc.image(imgBuffer, x, yPos, { fit: [150, 48], align: 'center' });
      return true;
    } catch {
      return false;
    }
  };

  const drewLessorImg = renderDataUriSignature(booking.lessorSignatureUrl, 85, boxY + 36);
  if (!drewLessorImg) {
    doc.rect(85, boxY + 40, 155, 38).strokeColor('#E65100').lineWidth(1).stroke();
    doc.fillColor('#E65100').font(boldFont).fontSize(8).text('ĐÃ KÝ SỐ & ĐÓNG DẤU', 85, boxY + 48, { align: 'center', width: 155 });
    doc.fontSize(7.5).text('ĐẠI DIỆN MOTORENT VIỆT NAM', 85, boxY + 61, { align: 'center', width: 155 });
  }
  doc.fillColor('#2E7D32').font(boldFont).fontSize(8).text(
    `Đã xác nhận bởi Bên cho thuê (${new Date(booking.contractSignedAt || booking.createdAt || Date.now()).toLocaleDateString('vi-VN')})`,
    45,
    boxY + 92,
    { align: 'center', width: 235 }
  );

  // Right Box: Bên B (Bên thuê xe)
  doc.rect(310, boxY, 245, 110).strokeColor('#CCCCCC').lineWidth(0.8).stroke();
  doc.fillColor('#101010').font(boldFont).fontSize(9.5).text('ĐẠI DIỆN BÊN THUÊ XE (BÊN B)', 315, boxY + 8, { align: 'center', width: 235 });
  doc.fillColor('#666666').font(primaryFont).fontSize(8).text(customerName, 315, boxY + 22, { align: 'center', width: 235 });

  const drewRenterImg = renderDataUriSignature(booking.eSignatureUrl, 355, boxY + 36);
  if (!drewRenterImg) {
    if (booking.eSignatureUrl) {
      doc.fillColor('#1565C0').font(boldFont).fontSize(9).text(`[Chữ ký điện tử: ${customerName}]`, 315, boxY + 52, { align: 'center', width: 235 });
    } else {
      doc.fillColor('#999999').font(primaryFont).fontSize(8).text('(Khách hàng ký điện tử hoặc ký trực tiếp khi nhận xe)', 315, boxY + 52, { align: 'center', width: 235 });
    }
  }
  doc.fillColor(booking.eSignatureUrl ? '#2E7D32' : '#666666').font(boldFont).fontSize(8).text(
    booking.eSignatureUrl
      ? `Khách hàng ${customerName} đã ký xác nhận`
      : `Người thuê: ${customerName}`,
    315,
    boxY + 92,
    { align: 'center', width: 235 }
  );

  // Footer notes & terms
  doc.strokeColor('#DDDDDD').lineWidth(1).moveTo(40, 688).lineTo(555, 688).stroke();
  doc.fillColor('#666666').font(primaryFont).fontSize(8);
  doc.text('ĐIỀU KHOẢN HỢP ĐỒNG THUÊ XE SONG PHƯƠNG:', 40, 696);
  doc.text('1. Hợp đồng điện tử có chữ ký của cả Bên cho thuê (Bên A) và Bên thuê (Bên B); mỗi bên đều nắm giữ bản hợp đồng đồng nhất trên hệ thống.', 40, 708);
  doc.text('2. Bên B cam kết sử dụng phương tiện đúng mục đích, xuất trình CCCD/GPLX hợp lệ và hoàn trả xe đúng thời gian/địa điểm đã thỏa thuận.', 40, 720);
  doc.text('3. ĐIỀU KHOẢN KHÔNG HOÀN TIỀN: Áp dụng chính sách KHÔNG HOÀN TIỀN cọc hoặc tiền thuê trong mọi trường hợp (bao gồm trường hợp hủy đơn hoặc trả xe trước hạn). Mọi thắc mắc xin liên hệ Tổng đài 1900 6868.', 40, 732);

  // Stamp text
  doc.rect(420, 745, 130, 36).strokeColor('#FF7A00').lineWidth(1).stroke();
  doc.fillColor('#FF7A00').font(boldFont).fontSize(8).text('MOTORENT E-CONTRACT', 420, 752, { align: 'center', width: 130 });
  doc.fontSize(7).text('HỢP ĐỒNG 2 BÊN XÁC THỰC', 420, 765, { align: 'center', width: 130 });

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
