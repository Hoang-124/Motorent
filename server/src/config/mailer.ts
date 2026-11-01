import nodemailer from 'nodemailer';
import { env } from './env';

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Check whether real production SMTP credentials have been configured
 * Never send real SMTP emails during automated test runs (NODE_ENV === 'test')
 */
export const isRealSmtpConfigured = (): boolean => {
  if (process.env.NODE_ENV === 'test' || env.NODE_ENV === 'test') {
    return false;
  }
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS?.trim();
  return Boolean(
    user &&
      pass &&
      user !== 'test@motorent.vn' &&
      pass !== 'password' &&
      pass !== 'your_smtp_password' &&
      pass !== 'your_smtp_app_password'
  );
};

/**
 * Prevent sending real SMTP emails to dummy/internal/test domains (e.g. @motorent.vn, @example.com)
 * which have no MX server and would cause Gmail's Mail Delivery Subsystem to retry & bounce for 72h.
 */
export const isDeliverableRecipientEmail = (email: string): boolean => {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) return false;

  const domain = normalized.split('@')[1] || '';
  const blockedDomains = [
    'motorent.vn',
    'example.com',
    'test.com',
    'localhost',
    'invalid',
    'local',
  ];

  if (
    blockedDomains.some((d) => domain === d || domain.endsWith(`.${d}`)) ||
    /^user_\d+@/i.test(normalized) ||
    /^admin_\d+@/i.test(normalized) ||
    /^test_/i.test(normalized)
  ) {
    return false;
  }

  return true;
};

/**
 * Get configured nodemailer transporter
 */
const getTransporter = () => {
  const host = env.SMTP_HOST || 'smtp.gmail.com';
  const port = env.SMTP_PORT || 587;
  const user = env.SMTP_USER?.trim() || '';
  const rawPass = env.SMTP_PASS?.trim() || '';
  const pass = host.includes('gmail') ? rawPass.replace(/\s+/g, '') : rawPass;

  if (host.includes('gmail')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

/**
 * Send account verification email with Vesper Design System styling
 */
export const sendVerificationEmail = async (
  toEmail: string,
  username: string,
  otpCode: string
): Promise<boolean> => {
  const safeUsername = escapeHtml(username);
  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${otpCode}&email=${encodeURIComponent(toEmail)}`;
  const canDeliverViaSmtp = isRealSmtpConfigured() && isDeliverableRecipientEmail(toEmail);

  if (env.NODE_ENV === 'development') {
    console.log('----------------------------------------------------');
    console.log(`[EMAIL OTP VERIFICATION] To: ${toEmail}`);
    console.log(`[OTP] 6-Digit Code: ${otpCode}`);
    console.log(`[LINK] Verification Link: ${verifyUrl}`);
    console.log(`[SMTP] Will Send Real Email: ${canDeliverViaSmtp ? 'YES' : 'NO (Skipped dummy/test domain or dev console)'}`);
    console.log('----------------------------------------------------');
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Xác thực tài khoản Motorent Đà Nẵng</title>
    </head>
    <body style="margin: 0; padding: 24px 12px; background-color: #101010; font-family: 'Segoe UI', Arial, sans-serif; color: #F5F5F5;">
      <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #161616; border: 1px solid #282828; border-radius: 20px; overflow: hidden;">
        <tr>
          <td align="center" style="background-color: #101010; border-bottom: 1px solid #282828; padding: 28px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 3px; line-height: 1.2; color: #F5F5F5;">
              MOTORENT <span style="color: #FFC799; font-style: italic; font-weight: 600; letter-spacing: 0;">Đà Nẵng</span>
            </h1>
            <p style="margin: 6px 0 0; font-size: 12px; color: #A0A0A0; font-weight: 500;">
              Hệ Thống Thuê Xe Máy Tự Lái Đô Thị &amp; Ven Biển Đà Nẵng
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 36px 28px;">
            <h2 style="margin: 0 0 16px; font-size: 19px; color: #F5F5F5; font-weight: 700;">
              Chào bạn <span style="color: #FFC799;">${safeUsername}</span>,
            </h2>
            <p style="margin: 0 0 22px; font-size: 14px; line-height: 1.6; color: #A0A0A0;">
              Cảm ơn bạn đã đăng ký tài khoản tại Motorent. Dưới đây là <strong style="color: #F5F5F5;">mã OTP xác thực 6 chữ số</strong> để kích hoạt tài khoản của bạn:
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <div style="display: inline-block; font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #FFC799; padding: 18px 36px; background-color: #101010; border-radius: 16px; border: 1px solid #FFC799; font-family: Consolas, Monaco, monospace;">
                ${otpCode}
              </div>
              <p style="margin: 12px 0 0; font-size: 12px; color: #6E6E6E; font-weight: 500;">
                Mã OTP này có hiệu lực trong vòng <strong style="color: #A0A0A0;">15 phút</strong>.
              </p>
            </div>
            <p style="margin: 0 0 14px; font-size: 13px; color: #A0A0A0; text-align: center;">
              Hoặc nhấn trực tiếp vào nút dưới đây để kích hoạt tức thì:
            </p>
            <div style="text-align: center; margin: 16px 0 24px;">
              <a href="${verifyUrl}" target="_blank" style="display: inline-block; background-color: #FFC799; color: #101010; text-decoration: none; padding: 14px 34px; border-radius: 12px; font-weight: 700; font-size: 14px;">
                Kích Hoạt Tài Khoản Ngay
              </a>
            </div>
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #282828; font-size: 11px; color: #6E6E6E; line-height: 1.5; text-align: center;">
              * Nếu bạn không thực hiện đăng ký tài khoản này, vui lòng bỏ qua email để đảm bảo an toàn.
            </div>
          </td>
        </tr>
        <tr>
          <td style="background-color: #101010; padding: 18px 24px; border-top: 1px solid #282828; font-size: 11px; color: #6E6E6E; text-align: center; line-height: 1.6;">
            © 2026 <strong style="color: #A0A0A0;">MOTORENT Đà Nẵng</strong> • Trạm Sân Bay Quốc Tế Đà Nẵng • Trạm Biển Mỹ Khê • Trạm Sơn Trà.
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  if (canDeliverViaSmtp) {
    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"MOTORENT Đà Nẵng" <${env.SMTP_USER}>`,
        to: toEmail,
        subject: `[MOTORENT] Mã OTP xác thực tài khoản: ${otpCode}`,
        html: htmlContent,
      });
      return true;
    } catch (error) {
      console.error('[SMTP ERROR] Lỗi khi gửi email xác thực qua SMTP:', error);
      throw new Error('Không thể gửi email xác thực qua máy chủ SMTP. Vui lòng thử lại sau.');
    }
  }

  return true;
};

/**
 * Send password reset email with Vesper Design System styling
 */
export const sendPasswordResetEmail = async (
  toEmail: string,
  username: string,
  token: string
): Promise<boolean> => {
  const safeUsername = escapeHtml(username);
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;
  const canDeliverViaSmtp = isRealSmtpConfigured() && isDeliverableRecipientEmail(toEmail);

  if (env.NODE_ENV === 'development') {
    console.log('----------------------------------------------------');
    console.log(`[PASSWORD RESET] To: ${toEmail}`);
    console.log(`[LINK] Reset Password Link: ${resetUrl}`);
    console.log(`[SMTP] Will Send Real Email: ${canDeliverViaSmtp ? 'YES' : 'NO (Skipped dummy/test domain or dev console)'}`);
    console.log('----------------------------------------------------');
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Yêu cầu đặt lại mật khẩu Motorent Đà Nẵng</title>
    </head>
    <body style="margin: 0; padding: 24px 12px; background-color: #101010; font-family: 'Segoe UI', Arial, sans-serif; color: #F5F5F5;">
      <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #161616; border: 1px solid #282828; border-radius: 20px; overflow: hidden;">
        <tr>
          <td align="center" style="background-color: #101010; border-bottom: 1px solid #282828; padding: 28px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 3px; line-height: 1.2; color: #F5F5F5;">
              MOTORENT <span style="color: #FFC799; font-style: italic; font-weight: 600; letter-spacing: 0;">Đà Nẵng</span>
            </h1>
            <p style="margin: 6px 0 0; font-size: 12px; color: #A0A0A0; font-weight: 500;">
              Hệ Thống Thuê Xe Máy Tự Lái Đô Thị &amp; Ven Biển Đà Nẵng
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 36px 28px;">
            <h2 style="margin: 0 0 16px; font-size: 19px; color: #F5F5F5; font-weight: 700;">
              Chào bạn <span style="color: #FFC799;">${safeUsername}</span>,
            </h2>
            <p style="margin: 0 0 22px; font-size: 14px; line-height: 1.6; color: #A0A0A0;">
              Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Motorent liên kết với địa chỉ email này. Vui lòng bấm vào nút dưới đây để thiết lập mật khẩu mới:
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #FFC799; color: #101010; text-decoration: none; padding: 14px 34px; border-radius: 12px; font-weight: 700; font-size: 14px;">
                Đặt Lại Mật Khẩu Mới
              </a>
            </div>
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #282828; font-size: 11px; color: #6E6E6E; line-height: 1.5; text-align: center;">
              * Liên kết này chỉ có hiệu lực trong vòng 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
            </div>
          </td>
        </tr>
        <tr>
          <td style="background-color: #101010; padding: 18px 24px; border-top: 1px solid #282828; font-size: 11px; color: #6E6E6E; text-align: center; line-height: 1.6;">
            © 2026 <strong style="color: #A0A0A0;">MOTORENT Đà Nẵng</strong> • Hệ thống thuê xe máy tự lái tự doanh đa chi nhánh TP. Đà Nẵng.
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  if (canDeliverViaSmtp) {
    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"MOTORENT Đà Nẵng" <${env.SMTP_USER}>`,
        to: toEmail,
        subject: '[MOTORENT] Hướng dẫn đặt lại mật khẩu tài khoản',
        html: htmlContent,
      });
      return true;
    } catch (error) {
      console.error('[SMTP ERROR] Lỗi khi gửi email reset mật khẩu qua SMTP:', error);
      throw new Error('Không thể gửi email đặt lại mật khẩu qua máy chủ SMTP. Vui lòng thử lại sau.');
    }
  }

  return true;
};

export interface BookingEmailPayload {
  toEmail?: string;
  customerName: string;
  bookingCode: string;
  event: 'CONFIRMED' | 'APPROVED' | 'REJECTED' | 'CHECKIN' | 'COMPLETED' | 'CANCELLED';
  vehicleName?: string;
  licensePlate?: string;
  pickupBranchName?: string;
  totalAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  note?: string;
}

/**
 * Send non-blocking booking lifecycle notification email (UC-46)
 * Safely skips dummy/internal domains and test runs without throwing.
 */
export const sendBookingStatusEmail = async (payload: BookingEmailPayload): Promise<boolean> => {
  const toEmail = (payload.toEmail || '').trim();
  if (!toEmail) return false;

  const canDeliverViaSmtp = isRealSmtpConfigured() && isDeliverableRecipientEmail(toEmail);
  const safeName = escapeHtml(payload.customerName || 'Quý khách');
  const safeCode = escapeHtml(payload.bookingCode);
  const safeVehicle = escapeHtml(payload.vehicleName || 'Xe máy Motorent');
  const safePlate = payload.licensePlate ? ` (${escapeHtml(payload.licensePlate)})` : '';
  const safeBranch = escapeHtml(payload.pickupBranchName || 'Chi nhánh Motorent Đà Nẵng');
  const safeNote = payload.note ? escapeHtml(payload.note) : '';
  const profileUrl = `${env.CLIENT_URL}/profile?tab=bookings`;

  const eventMeta: Record<BookingEmailPayload['event'], { badge: string; color: string; title: string; summary: string }> = {
    CONFIRMED: {
      badge: 'ĐÃ XÁC NHẬN GIỮ XE',
      color: '#99FFE4',
      title: `Xác nhận đặt giữ xe thành công #${safeCode}`,
      summary: 'Hệ thống đã ghi nhận khoản thanh toán và khóa biển số xe theo lịch trình của bạn.',
    },
    APPROVED: {
      badge: 'ĐÃ PHÊ DUYỆT ĐƠN',
      color: '#FFC799',
      title: `Đơn đặt xe #${safeCode} đã được phê duyệt`,
      summary: 'Chi nhánh đã kiểm tra và chuẩn bị phương tiện sẵn sàng đón bạn nhận xe tại quầy.',
    },
    CHECKIN: {
      badge: 'ĐANG LƯU HÀNH',
      color: '#99FFE4',
      title: `Bàn giao xe thành công #${safeCode}`,
      summary: 'Biên bản bàn giao điện tử đã kích hoạt. Chúc bạn có hành trình an toàn tại Đà Nẵng!',
    },
    COMPLETED: {
      badge: 'HOÀN TẤT HỢP ĐỒNG',
      color: '#FFC799',
      title: `Hoàn tất trả xe & tất toán #${safeCode}`,
      summary: 'Hợp đồng thuê xe đã khép lại thành công. Cảm ơn bạn đã đồng hành cùng Motorent Đà Nẵng.',
    },
    REJECTED: {
      badge: 'TỪ CHỐI ĐƠN ĐẶT XE',
      color: '#FFA8A8',
      title: `Thông báo từ chối đơn #${safeCode}`,
      summary: 'Rất tiếc chi nhánh chưa thể đáp ứng đơn đặt xe này. Mọi khoản cọc đã thanh toán (nếu có) được hoàn trả 100%.',
    },
    CANCELLED: {
      badge: 'ĐÃ HỦY ĐƠN',
      color: '#A0A0A0',
      title: `Xác nhận hủy đơn đặt xe #${safeCode}`,
      summary: 'Đơn đặt xe của bạn đã chuyển sang trạng thái đã hủy trên hệ thống.',
    },
  };

  const meta = eventMeta[payload.event];

  if (env.NODE_ENV === 'development') {
    console.log(`[BOOKING EMAIL - ${payload.event}] To: ${toEmail} | Code: ${payload.bookingCode} | SMTP: ${canDeliverViaSmtp ? 'YES' : 'SKIPPED'}`);
  }

  if (!canDeliverViaSmtp) {
    return true;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${meta.title}</title>
    </head>
    <body style="margin: 0; padding: 24px 12px; background-color: #101010; font-family: 'Segoe UI', Arial, sans-serif; color: #F5F5F5;">
      <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #161616; border: 1px solid #282828; border-radius: 20px; overflow: hidden;">
        <tr>
          <td align="center" style="background-color: #101010; border-bottom: 1px solid #282828; padding: 26px 20px;">
            <span style="display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 1px; background-color: #202020; color: ${meta.color}; margin-bottom: 10px;">
              ${meta.badge}
            </span>
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #F5F5F5;">
              MOTORENT <span style="color: #FFC799; font-style: italic;">Đà Nẵng</span>
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 28px;">
            <h2 style="margin: 0 0 12px; font-size: 18px; color: #F5F5F5;">Chào ${safeName},</h2>
            <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #A0A0A0;">${meta.summary}</p>
            <div style="background-color: #101010; border: 1px solid #282828; border-radius: 14px; padding: 18px; margin-bottom: 22px; font-size: 13px; line-height: 1.8;">
              <div><span style="color: #888;">Mã hợp đồng:</span> <strong style="color: #FFC799; font-family: Consolas, monospace;">${safeCode}</strong></div>
              <div><span style="color: #888;">Phương tiện:</span> <strong style="color: #F5F5F5;">${safeVehicle}${safePlate}</strong></div>
              <div><span style="color: #888;">Trạm giao nhận:</span> <span style="color: #E0E0E0;">${safeBranch}</span></div>
              ${payload.totalAmount !== undefined ? `<div><span style="color: #888;">Tổng giá trị đơn:</span> <strong style="color: #F5F5F5;">${payload.totalAmount.toLocaleString('vi-VN')} đ</strong></div>` : ''}
              ${payload.paidAmount !== undefined ? `<div><span style="color: #888;">Đã thanh toán:</span> <strong style="color: #99FFE4;">${payload.paidAmount.toLocaleString('vi-VN')} đ</strong></div>` : ''}
              ${payload.remainingAmount !== undefined ? `<div><span style="color: #888;">Còn lại:</span> <strong style="color: #FFC799;">${payload.remainingAmount.toLocaleString('vi-VN')} đ</strong></div>` : ''}
              ${safeNote ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #242424;"><span style="color: #888;">Ghi chú:</span> <span style="color: #E0E0E0;">${safeNote}</span></div>` : ''}
            </div>
            <div style="text-align: center;">
              <a href="${profileUrl}" target="_blank" style="display: inline-block; background-color: #FFC799; color: #101010; text-decoration: none; padding: 13px 30px; border-radius: 12px; font-weight: 700; font-size: 13px;">
                Xem Chi Tiết Đơn Thuê Xe
              </a>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"MOTORENT Đà Nẵng" <${env.SMTP_USER}>`,
      to: toEmail,
      subject: `[MOTORENT] ${meta.title}`,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('[SMTP ERROR] Lỗi gửi email thông báo trạng thái đơn thuê:', error);
    return false;
  }
};
