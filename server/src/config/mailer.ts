import nodemailer from 'nodemailer';

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * Check whether real production SMTP credentials have been configured
 */
export const isRealSmtpConfigured = (): boolean => {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  return Boolean(
    user &&
    pass &&
    user !== 'test@motorent.vn' &&
    pass !== 'password' &&
    pass !== 'your_smtp_password'
  );
};

/**
 * Get configured nodemailer transporter
 */
const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER?.trim() || '';
  const pass = process.env.SMTP_PASS?.trim() || '';

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
    tls: {
      rejectUnauthorized: false,
    },
  });
};

/**
 * Send account verification email
 */
export const sendVerificationEmail = async (
  toEmail: string,
  username: string,
  otpCode: string
): Promise<boolean> => {
  const verifyUrl = `${clientUrl}/verify-email?token=${otpCode}`;
  const realSmtp = isRealSmtpConfigured();

  // Log prominently to console
  console.log('----------------------------------------------------');
  console.log(`📧 [EMAIL OTP VERIFICATION] To: ${toEmail}`);
  console.log(`🔢 6-Digit OTP Code: ${otpCode}`);
  console.log(`🔗 Verification Link: ${verifyUrl}`);
  console.log(`🌐 Real SMTP Configured: ${realSmtp ? 'YES' : 'NO (Mock/Dev Preview)'}`);
  console.log('----------------------------------------------------');

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #065f46 0%, #059669 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">MOTO<span style="color: #6ee7b7;">RENT</span></h1>
        <p style="margin: 8px 0 0; font-size: 13px; color: #d1fae5;">Chuỗi Cho Thuê Xe Máy Tự Lái Đa Chi Nhánh</p>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="margin: 0 0 16px; font-size: 18px; color: #0f172a;">Chào bạn ${username},</h2>
        <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
          Cảm ơn bạn đã đăng ký tài khoản tại Motorent. Dưới đây là <strong>mã OTP xác thực tài khoản 6 chữ số</strong> của bạn:
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #059669; padding: 18px 36px; background: #ecfdf5; border-radius: 16px; border: 2px dashed #059669; font-family: monospace;">
            ${otpCode}
          </div>
          <p style="margin: 12px 0 0; font-size: 12px; color: #64748b;">
            Mã OTP này có hiệu lực trong vòng <strong>15 phút</strong>.
          </p>
        </div>
        <p style="margin: 0 0 12px; font-size: 13px; color: #475569; text-align: center;">
          Hoặc bạn có thể bấm vào liên kết dưới đây để kích hoạt nhanh:
        </p>
        <div style="text-align: center; margin: 16px 0 24px;">
          <a href="${verifyUrl}" target="_blank" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 13px;">
            Kích Hoạt Tài Khoản Ngay
          </a>
        </div>
        <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5; text-align: center;">
          * Nếu bạn không thực hiện yêu cầu đăng ký này, vui lòng bỏ qua email để đảm bảo an toàn.
        </p>
      </div>
      <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
        © 2026 MOTORENT Systems. Hệ thống thuê xe máy tự lái tự doanh đa chi nhánh.
      </div>
    </div>
  `;

  try {
    if (realSmtp) {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"MOTORENT Support" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `[MOTORENT] Mã OTP xác thực tài khoản: ${otpCode}`,
        html: htmlContent,
      });
      console.log(`✅ [SMTP] Đã gửi thành công email OTP tới: ${toEmail}`);
    } else {
      console.log(`ℹ️ [DEV/LOCAL] Chưa cấu hình SMTP thực tế trong .env. Sử dụng mã OTP console/UI: ${otpCode}`);
    }
    return true;
  } catch (error) {
    console.error('❌ Lỗi khi gửi email xác thực qua SMTP (đã log mã OTP ra console):', error);
    return true; // Keep true so registration flow is not completely blocked
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  toEmail: string,
  username: string,
  token: string
): Promise<boolean> => {
  const resetUrl = `${clientUrl}/reset-password?token=${token}`;
  const realSmtp = isRealSmtpConfigured();

  console.log('----------------------------------------------------');
  console.log(`🔑 [PASSWORD RESET] To: ${toEmail}`);
  console.log(`🔗 Reset Password Link: ${resetUrl}`);
  console.log(`🔑 Token: ${token}`);
  console.log(`🌐 Real SMTP Configured: ${realSmtp ? 'YES' : 'NO'}`);
  console.log('----------------------------------------------------');

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #065f46 0%, #059669 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">MOTO<span style="color: #6ee7b7;">RENT</span></h1>
        <p style="margin: 8px 0 0; font-size: 13px; color: #d1fae5;">Yêu Cầu Đặt Lại Mật Khẩu</p>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="margin: 0 0 16px; font-size: 18px; color: #0f172a;">Chào bạn ${username},</h2>
        <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
          Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Motorent liên kết với địa chỉ email này. Vui lòng bấm vào nút dưới đây để thiết lập mật khẩu mới:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" target="_blank" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);">
            Đặt Lại Mật Khẩu Mới
          </a>
        </div>
        <p style="margin: 0 0 8px; font-size: 12px; color: #64748b;">
          Hoặc sao chép đường dẫn sau vào trình duyệt nếu nút bấm không phản hồi:
        </p>
        <p style="margin: 0 0 24px; font-size: 12px; word-break: break-all; color: #059669; background: #f0fdf4; padding: 10px 14px; border-radius: 8px; border: 1px solid #bbf7d0;">
          ${resetUrl}
        </p>
        <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
          * Liên kết này chỉ có hiệu lực trong vòng 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này, mật khẩu hiện tại của bạn vẫn được bảo vệ an toàn.
        </p>
      </div>
      <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
        © 2026 MOTORENT Systems. Hệ thống thuê xe máy tự lái tự doanh đa chi nhánh.
      </div>
    </div>
  `;

  try {
    if (realSmtp) {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"MOTORENT Support" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: '[MOTORENT] Hướng dẫn đặt lại mật khẩu tài khoản',
        html: htmlContent,
      });
      console.log(`✅ [SMTP] Đã gửi thành công email reset mật khẩu tới: ${toEmail}`);
    }
    return true;
  } catch (error) {
    console.error('❌ Lỗi khi gửi email reset mật khẩu qua SMTP (đã log link ra console):', error);
    return true;
  }
};
