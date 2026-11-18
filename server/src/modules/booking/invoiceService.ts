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

  const extractRefId = (val: unknown): string => {
    if (val && typeof val === 'object' && '_id' in val) {
      return String((val as { _id?: unknown })._id || '');
    }
    return val ? String(val) : '';
  };

  // Permission check
  if (requestingUser.roles === 'Customer') {
    const customerId = extractRefId(booking.userId);
    if (customerId !== String(requestingUser._id)) {
      throw new AppError(403, 'Bạn không có quyền truy cập hóa đơn của khách hàng khác.');
    }
  } else if (['BranchManager', 'Staff'].includes(requestingUser.roles)) {
    const pickupBranchId = extractRefId(booking.pickupBranchId);
    const returnBranchId = extractRefId(booking.returnBranchId);
    assertBranchAccess(requestingUser, [pickupBranchId, returnBranchId]);
  }

  const resolveSignatureBuffer = async (sigSource: string | undefined): Promise<Buffer | null> => {
    if (!sigSource) return null;
    if (sigSource.startsWith('data:image/')) {
      const base64Part = sigSource.split(',')[1];
      if (!base64Part) return null;
      try {
        return Buffer.from(base64Part, 'base64');
      } catch {
        return null;
      }
    }
    if (sigSource.startsWith('http://') || sigSource.startsWith('https://')) {
      try {
        const resp = await fetch(sigSource, { signal: AbortSignal.timeout(5000) });
        if (!resp.ok) return null;
        const arrayBuf = await resp.arrayBuffer();
        return Buffer.from(arrayBuf);
      } catch {
        return null;
      }
    }
    return null;
  };

  const [lessorSigBuffer, renterSigBuffer] = await Promise.all([
    resolveSignatureBuffer(booking.lessorSignatureUrl),
    resolveSignatureBuffer(booking.eSignatureUrl),
  ]);

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
  const userObj = (typeof booking.userId === 'object' && booking.userId !== null
    ? (booking.userId as unknown as { firstName?: string; lastName?: string; username?: string; phoneNumber?: string; email?: string })
    : {});
  const vehicleObj = (typeof booking.vehicleId === 'object' && booking.vehicleId !== null
    ? (booking.vehicleId as unknown as { brand?: string; vehicleModel?: string; licensePlate?: string; dailyPrice?: number })
    : {});
  const pickupBranch = (typeof booking.pickupBranchId === 'object' && booking.pickupBranchId !== null
    ? (booking.pickupBranchId as unknown as { name?: string; phone?: string; address?: string })
    : {});
  const returnBranch = (typeof booking.returnBranchId === 'object' && booking.returnBranchId !== null
    ? (booking.returnBranchId as unknown as { name?: string; phone?: string; address?: string })
    : {});

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
    booking.isPaid
      ? 'TRẠNG THÁI: ĐÃ HOÀN TẤT THANH TOÁN 100%'
      : paidAmount > 0
        ? 'TRẠNG THÁI: ĐÃ THANH TOÁN TIỀN CỌC (CÒN LẠI TẠI QUẦY)'
        : 'TRẠNG THÁI: CHƯA THANH TOÁN (THU 100% TẠI QUẦY)',
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

  const renderSignatureBuffer = (imgBuffer: Buffer | null, x: number, yPos: number) => {
    if (!imgBuffer) return false;
    try {
      doc.image(imgBuffer, x, yPos, { fit: [150, 48], align: 'center' });
      return true;
    } catch {
      return false;
    }
  };

  const drewLessorImg = renderSignatureBuffer(lessorSigBuffer, 85, boxY + 36);
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

  const drewRenterImg = renderSignatureBuffer(renterSigBuffer, 355, boxY + 36);
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

/**
 * Stream a combined invoice PDF for an entire group booking (multi-vehicle)
 */
export const streamGroupInvoicePdf = async (
  groupBookingCode: string,
  requestingUser: { _id: unknown; roles: string; fullName?: string; email?: string; branchId?: unknown },
  res: Response
): Promise<void> => {
  const code = groupBookingCode.trim().toUpperCase();
  const bookings = await Booking.find({ groupBookingCode: code })
    .populate('userId', 'firstName lastName username email phoneNumber')
    .populate('vehicleId', 'vehicleModel brand licensePlate transmissionType fuelType dailyPrice')
    .populate('pickupBranchId', 'name code address phone email')
    .populate('returnBranchId', 'name code address phone email')
    .sort({ createdAt: 1 });

  if (!bookings || bookings.length === 0) {
    throw new AppError(404, `Không tìm thấy nhóm đơn đặt xe ${code}.`);
  }

  const extractRefId = (val: unknown): string => {
    if (val && typeof val === 'object' && '_id' in val) {
      return String((val as { _id?: unknown })._id || '');
    }
    return val ? String(val) : '';
  };

  // Permission check
  if (requestingUser.roles === 'Customer') {
    const isOwner = bookings.every((b) => {
      const cId = extractRefId(b.userId);
      return cId === String(requestingUser._id);
    });
    if (!isOwner) {
      throw new AppError(403, 'Bạn không có quyền truy cập hóa đơn nhóm xe của khách hàng khác.');
    }
  }

  const firstBooking = bookings[0];
  const customer = firstBooking.userId as {
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
    phoneNumber?: string;
  } | null;

  const totalAmount = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const depositAmount = bookings.reduce((sum, b) => sum + (b.depositAmount || 0), 0);
  const paidAmount = bookings.reduce(
    (sum, b) => sum + (b.paidAmount || (b.depositPaid ? b.depositAmount : 0)),
    0
  );
  const remainingAmount = bookings.reduce((sum, b) => sum + (b.remainingAmount || 0), 0);
  const isAllDepositPaid = bookings.every((b) => b.depositPaid || b.isPaid);
  const isAllPaid = bookings.every((b) => b.isPaid || b.remainingAmount === 0);

  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: `Group Invoice - ${code}`,
      Author: 'MOTORENT VIETNAM',
      Subject: 'Multi-Vehicle Rental Combined Invoice & Payment Receipt',
    },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="MOTORENT-GROUP-INVOICE-${code}.pdf"`
  );

  doc.pipe(res);

  const fonts = registerUnicodePdfFonts(doc);
  const primaryFont = fonts.regular;
  const boldFont = fonts.bold;

  // --- Header & Company Branding ---
  doc.rect(40, 40, 515, 60).fill('#0F172A');
  doc.fillColor('#FFFFFF').font(boldFont).fontSize(20).text('MOTORENT VIETNAM', 55, 52);
  doc
    .fillColor('#94A3B8')
    .font(primaryFont)
    .fontSize(8.5)
    .text('Hệ Thống Cho Thuê Xe Máy Trực Tuyến & Tự Động Hóa · Hotline: 1900 633 633', 55, 78);

  // Document Title
  doc.fillColor('#0F172A').font(boldFont).fontSize(16).text('HÓA ĐƠN ĐẶT THUÊ GỘP NHIỀU XE', 40, 115);
  doc.fillColor('#64748B').font(primaryFont).fontSize(8.5).text('BIÊN LAI ĐẶT CỌC & BÀN GIAO TOÀN ĐOÀN', 40, 134);

  // Top Info Box (Group Code & Date)
  doc.rect(40, 150, 515, 62).fill('#F8FAFC');
  doc.strokeColor('#E2E8F0').lineWidth(1).rect(40, 150, 515, 62).stroke();

  doc.fillColor('#334155').font(boldFont).fontSize(9);
  doc.text(`MÃ NHÓM ĐƠN: ${code}`, 55, 160);
  doc.text(`SỐ LƯỢNG XE: ${bookings.length} phương tiện`, 250, 160);
  doc.text(`NGÀY LẬP BIÊN LAI: ${new Date().toLocaleDateString('vi-VN')}`, 400, 160);

  const customerName = customer ? `${customer.lastName || ''} ${customer.firstName || customer.username || ''}`.trim() : 'Khách vãng lai';
  doc.font(primaryFont).fontSize(8.5).fillColor('#475569');
  doc.text(`Khách hàng đại diện: ${customerName}`, 55, 178);
  doc.text(`Số điện thoại: ${customer?.phoneNumber || 'N/A'}`, 250, 178);
  doc.text(`Email: ${customer?.email || 'N/A'}`, 400, 178);

  const deliveryText = firstBooking.deliveryMode === 'DoorDelivery'
    ? `Giao tận nơi: ${firstBooking.customPickupAddress || 'Theo yêu cầu khách'}`
    : 'Nhận trực tiếp tại trạm';
  doc.text(`Hình thức nhận: ${deliveryText}`, 55, 194, { width: 480, ellipsis: true });

  // Vehicles Table Header
  let tableY = 225;
  doc.rect(40, tableY, 515, 24).fill('#1E293B');
  doc.fillColor('#FFFFFF').font(boldFont).fontSize(8);
  doc.text('STT', 45, tableY + 8, { width: 25, align: 'center' });
  doc.text('Mã đơn / Biển số', 75, tableY + 8, { width: 100 });
  doc.text('Dòng xe & Phân loại', 180, tableY + 8, { width: 110 });
  doc.text('Thời gian thuê', 295, tableY + 8, { width: 90 });
  doc.text('Tổng tiền', 390, tableY + 8, { width: 55, align: 'right' });
  doc.text('Đã cọc 30%', 450, tableY + 8, { width: 50, align: 'right' });
  doc.text('Còn lại', 505, tableY + 8, { width: 45, align: 'right' });
  tableY += 24;

  // Vehicles Table Rows
  bookings.forEach((b, idx) => {
    if (tableY > 710) {
      doc.addPage();
      tableY = 40;
    }
    const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F1F5F9';
    doc.rect(40, tableY, 515, 30).fill(rowBg);

    const vehicle = b.vehicleId as {
      vehicleModel?: string;
      brand?: string;
      licensePlate?: string;
      transmissionType?: string;
    } | null;

    doc.fillColor('#1E293B').font(boldFont).fontSize(8);
    doc.text(String(idx + 1), 45, tableY + 6, { width: 25, align: 'center' });

    doc.fillColor('#0F172A').font(boldFont).fontSize(8);
    doc.text(b.bookingCode, 75, tableY + 5, { width: 100 });
    doc.fillColor('#059669').font(boldFont).fontSize(7.5);
    doc.text(vehicle?.licensePlate || 'Chưa gán xe', 75, tableY + 16, { width: 100 });

    doc.fillColor('#334155').font(boldFont).fontSize(8);
    doc.text(`${vehicle?.brand || ''} ${vehicle?.vehicleModel || 'Xe máy'}`, 180, tableY + 5, { width: 110, ellipsis: true });
    doc.fillColor('#64748B').font(primaryFont).fontSize(7);
    doc.text(vehicle?.transmissionType || 'Tự động', 180, tableY + 16, { width: 110 });

    const pickupStr = new Date(b.pickupDateTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    const returnStr = new Date(b.returnDateTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    doc.fillColor('#475569').font(primaryFont).fontSize(7.5);
    doc.text(`${pickupStr} - ${returnStr}`, 295, tableY + 10, { width: 90 });

    doc.fillColor('#0F172A').font(boldFont).fontSize(7.5);
    doc.text(`${(b.totalAmount || 0).toLocaleString('vi-VN')} đ`, 390, tableY + 10, { width: 55, align: 'right' });
    doc.text(`${(b.depositAmount || 0).toLocaleString('vi-VN')} đ`, 450, tableY + 10, { width: 50, align: 'right' });
    doc.text(`${(b.remainingAmount || 0).toLocaleString('vi-VN')} đ`, 505, tableY + 10, { width: 45, align: 'right' });

    tableY += 30;
  });

  // Financial Summary Box
  tableY += 15;
  if (tableY > 640) {
    doc.addPage();
    tableY = 40;
  }

  doc.rect(260, tableY, 295, 95).fill('#F8FAFC');
  doc.strokeColor('#CBD5E1').lineWidth(1).rect(260, tableY, 295, 95).stroke();

  doc.fillColor('#475569').font(primaryFont).fontSize(8.5);
  doc.text('Tổng chi phí toàn đoàn (A):', 275, tableY + 12);
  doc.fillColor('#0F172A').font(boldFont).fontSize(9);
  doc.text(`${totalAmount.toLocaleString('vi-VN')} VNĐ`, 425, tableY + 12, { width: 120, align: 'right' });

  doc.fillColor('#475569').font(primaryFont).fontSize(8.5);
  doc.text('Tổng tiền cọc đã thu 30% (B):', 275, tableY + 30);
  doc.fillColor('#059669').font(boldFont).fontSize(9);
  doc.text(`${paidAmount.toLocaleString('vi-VN')} VNĐ`, 425, tableY + 30, { width: 120, align: 'right' });

  doc.fillColor('#475569').font(primaryFont).fontSize(8.5);
  doc.text('Số dư còn lại khi nhận xe (C = A - B):', 275, tableY + 48);
  doc.fillColor('#D97706').font(boldFont).fontSize(9.5);
  doc.text(`${remainingAmount.toLocaleString('vi-VN')} VNĐ`, 425, tableY + 48, { width: 120, align: 'right' });

  doc.fillColor('#475569').font(primaryFont).fontSize(8.5);
  doc.text('Trạng thái thanh toán:', 275, tableY + 70);
  doc.fillColor(isAllPaid ? '#059669' : isAllDepositPaid ? '#2563EB' : '#DC2626').font(boldFont).fontSize(9);
  doc.text(
    isAllPaid ? 'ĐÃ TẤT TOÁN 100%' : isAllDepositPaid ? 'ĐÃ ĐẶT CỌC 30% (CHỜ QUẦY)' : 'CHƯA HOÀN TẤT CỌC',
    400,
    tableY + 70,
    { width: 145, align: 'right' }
  );

  // Signatures section
  tableY += 120;
  if (tableY > 720) {
    doc.addPage();
    tableY = 40;
  }

  doc.fillColor('#334155').font(boldFont).fontSize(9);
  doc.text('ĐẠI DIỆN KHÁCH HÀNG', 80, tableY);
  doc.text('ĐẠI DIỆN MOTORENT VIETNAM', 370, tableY);

  doc.fillColor('#94A3B8').font(primaryFont).fontSize(7.5);
  doc.text('(Ký và ghi rõ họ tên)', 80, tableY + 12);
  doc.text('(Xác nhận bàn giao & đóng dấu)', 370, tableY + 12);

  doc.fillColor('#64748B').font(primaryFont).fontSize(7);
  doc.text(
    'Biên lai được tạo tự động bởi Hệ thống Quản trị Đội xe MOTORENT. Hợp đồng có giá trị pháp lý đầy đủ.',
    40,
    tableY + 65,
    { width: 515, align: 'center' }
  );

  doc.end();
};

