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

const bookingStatusCopy: Record<string, { subject: string; heading: string; detail: string }> = {
  Pending: {
    subject: 'Đã nhận yêu cầu đặt xe',
    heading: 'Yêu cầu đặt xe đã được ghi nhận',
    detail: 'Vui lòng hoàn tất thanh toán cọc để xác nhận đơn đặt xe.',
  },
  Approved: {
    subject: 'Đơn đặt xe đã được duyệt',
    heading: 'Đơn đặt xe đã được duyệt',
    detail: 'Đơn đang chờ xác nhận thanh toán hoặc hoàn tất bước tiếp theo.',
  },
  Confirmed: {
    subject: 'Đơn đặt xe đã được xác nhận',
    heading: 'Đơn đặt xe đã được xác nhận',
    detail: 'Xe đã được giữ cho bạn. Vui lòng đến chi nhánh đúng giờ nhận xe.',
  },
  Ongoing: {
    subject: 'Bạn đã nhận xe thành công',
    heading: 'Chúc bạn có hành trình an toàn',
    detail: 'Đơn thuê xe đang diễn ra. Hãy trả xe tại chi nhánh và thời gian đã hẹn.',
  },
  Completed: {
    subject: 'Đơn thuê xe đã hoàn tất',
    heading: 'Cảm ơn bạn đã sử dụng MOTORENT',
    detail: 'Đơn thuê đã hoàn tất. Điểm thành viên (nếu có) đã được cập nhật vào tài khoản.',
  },
  Cancelled: {
    subject: 'Đơn đặt xe đã bị hủy',
    heading: 'Đơn đặt xe đã bị hủy',
    detail: 'Nếu đơn đã thanh toán, vui lòng theo dõi trạng thái hoàn tiền trong hồ sơ.',
  },
  Rejected: {
    subject: 'Đơn đặt xe chưa được chấp nhận',
    heading: 'Đơn đặt xe chưa được chấp nhận',
    detail: 'Vui lòng kiểm tra lý do trong hồ sơ hoặc liên hệ bộ phận hỗ trợ.',
  },
};

export const sendBookingStatusEmail = async (input: {
  toEmail?: string;
  username: string;
  bookingCode: string;
  status: string;
  pickupDateTime: Date;
  totalAmount: number;
}): Promise<boolean> => {
  if (!input.toEmail) return false;
  const statusCopy = bookingStatusCopy[input.status];
  if (!statusCopy) return false;
  if (!isRealSmtpConfigured() || !isDeliverableRecipientEmail(input.toEmail)) {
    if (env.NODE_ENV === 'development') {
      console.info(`[EMAIL] Booking ${input.bookingCode} (${input.status}) not sent: SMTP or recipient is not configured.`);
    }
    return false;
  }

  const pickupTime = input.pickupDateTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17211d">
      <h1 style="color:#047857">MOTORENT</h1>
      <h2>${escapeHtml(statusCopy.heading)}</h2>
      <p>Xin chào ${escapeHtml(input.username)},</p>
      <p>${escapeHtml(statusCopy.detail)}</p>
      <dl>
        <dt>Mã đơn</dt><dd>${escapeHtml(input.bookingCode)}</dd>
        <dt>Trạng thái</dt><dd>${escapeHtml(input.status)}</dd>
        <dt>Giờ nhận xe</dt><dd>${escapeHtml(pickupTime)}</dd>
        <dt>Tổng tiền</dt><dd>${Math.max(0, input.totalAmount).toLocaleString('vi-VN')} VND</dd>
      </dl>
      <p><a href="${env.CLIENT_URL}/profile?tab=bookings">Xem đơn đặt xe</a></p>
    </div>
  `;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"MOTORENT Đà Nẵng" <${env.SMTP_USER}>`,
      to: input.toEmail,
      subject: `[MOTORENT] ${statusCopy.subject} ${input.bookingCode}`,
      html,
    });
    return true;
  } catch (error) {
    console.error(`[SMTP ERROR] Could not send booking ${input.bookingCode} status email:`, error);
    return false;
  }
};
