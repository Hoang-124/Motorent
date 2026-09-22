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
  const rawPass = process.env.SMTP_PASS?.trim() || '';
  // Google App Passwords often have spaces like "ghmz yryj ivhs mtwq", strip them
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
    tls: {
      rejectUnauthorized: false,
    },
  });
};

/**
 * Send account verification email with ultra-clear contrast header
 */
export const sendVerificationEmail = async (
  toEmail: string,
  username: string,
  otpCode: string
): Promise<boolean> => {
  const verifyUrl = `${clientUrl}/verify-email?token=${otpCode}&email=${encodeURIComponent(toEmail)}`;
  const realSmtp = isRealSmtpConfigured();

  // Log prominently to console
  console.log('----------------------------------------------------');
  console.log(`📧 [EMAIL OTP VERIFICATION] To: ${toEmail}`);
  console.log(`🔢 6-Digit OTP Code: ${otpCode}`);
  console.log(`🔗 Verification Link: ${verifyUrl}`);
  console.log(`🌐 Real SMTP Configured: ${realSmtp ? 'YES' : 'NO (Mock/Dev Preview)'}`);
  console.log('----------------------------------------------------');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Xác thực tài khoản Motorent</title>
    </head>
    <body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: 'Segoe UI', Arial, sans-serif;">
      <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06);">
        <!-- Ultra-High Contrast Brand Header (Never blends with background) -->
        <tr>
          <td align="center" style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 28px 20px; text-align: center;">
            <div style="display: inline-block; background-color: #059669; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; text-align: center; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(5,150,105,0.25);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; display: inline-block;">
                <circle cx="5.5" cy="17.5" r="3.5"/>
                <circle cx="18.5" cy="17.5" r="3.5"/>
                <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4"/>
              </svg>
            </div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 0.5px; line-height: 1.2;">
              <span style="color: #0f172a !important; font-weight: 900;">MOTO</span><span style="color: #059669 !important; font-weight: 900;">RENT</span>
            </h1>
            <p style="margin: 6px 0 0; font-size: 12px; color: #475569; font-weight: 600; letter-spacing: 0.3px;">
              Chuỗi Cho Thuê Xe Máy Tự Lái Đa Chi Nhánh • TP. Đà Nẵng
            </p>
          </td>
        </tr>

        <!-- Email Body -->
        <tr>
          <td style="padding: 36px 28px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #0f172a; font-weight: 800;">
              Chào bạn <span style="color: #059669;">${username}</span>,
            </h2>
            <p style="margin: 0 0 22px; font-size: 14px; line-height: 1.6; color: #334155;">
              Cảm ơn bạn đã đăng ký tài khoản tại Motorent. Dưới đây là <strong>mã OTP xác thực 6 chữ số</strong> để kích hoạt tài khoản của bạn:
            </p>

            <!-- Prominent OTP Code Box -->
            <div style="text-align: center; margin: 28px 0;">
              <div style="display: inline-block; font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #047857; padding: 18px 36px; background-color: #ecfdf5; border-radius: 16px; border: 2px dashed #059669; font-family: Consolas, Monaco, monospace; box-shadow: 0 2px 6px rgba(5,150,105,0.08);">
                ${otpCode}
              </div>
              <p style="margin: 12px 0 0; font-size: 12px; color: #64748b; font-weight: 500;">
                Mã OTP này có hiệu lực trong vòng <strong>15 phút</strong>.
              </p>
            </div>

            <p style="margin: 0 0 14px; font-size: 13px; color: #475569; text-align: center; font-weight: 500;">
              Hoặc bạn có thể bấm trực tiếp vào nút dưới đây để kích hoạt tức thì:
            </p>

            <!-- Direct Verification Button -->
            <div style="text-align: center; margin: 16px 0 24px;">
              <a href="${verifyUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);">
                Kích Hoạt Tài Khoản Ngay
              </a>
            </div>

            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; line-height: 1.5; text-align: center;">
              * Nếu bạn không thực hiện đăng ký tài khoản này, vui lòng bỏ qua email để đảm bảo an toàn.
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #f8fafc; padding: 18px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; line-height: 1.6;">
            © 2026 <strong>MOTORENT Systems</strong> • Hệ thống thuê xe máy tự lái tự doanh đa chi nhánh TP. Đà Nẵng.<br>
            Cơ sở Sân Bay Quốc Tế Đà Nẵng & Bãi Biển Mỹ Khê - Sơn Trà.
          </td>
        </tr>
      </table>
    </body>
    </html>
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
    return true;
  }
};

/**
 * Send password reset email with ultra-clear contrast header
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
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Yêu cầu đặt lại mật khẩu Motorent</title>
    </head>
    <body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: 'Segoe UI', Arial, sans-serif;">
      <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06);">
        <!-- Ultra-High Contrast Brand Header -->
        <tr>
          <td align="center" style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 28px 20px; text-align: center;">
            <div style="display: inline-block; background-color: #059669; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; text-align: center; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(5,150,105,0.25);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; display: inline-block;">
                <circle cx="5.5" cy="17.5" r="3.5"/>
                <circle cx="18.5" cy="17.5" r="3.5"/>
                <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4"/>
              </svg>
            </div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 0.5px; line-height: 1.2;">
              <span style="color: #0f172a !important; font-weight: 900;">MOTO</span><span style="color: #059669 !important; font-weight: 900;">RENT</span>
            </h1>
            <p style="margin: 6px 0 0; font-size: 12px; color: #475569; font-weight: 600; letter-spacing: 0.3px;">
              Chuỗi Cho Thuê Xe Máy Tự Lái Đa Chi Nhánh • TP. Đà Nẵng
            </p>
          </td>
        </tr>

        <!-- Email Body -->
        <tr>
          <td style="padding: 36px 28px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #0f172a; font-weight: 800;">
              Chào bạn <span style="color: #059669;">${username}</span>,
            </h2>
            <p style="margin: 0 0 22px; font-size: 14px; line-height: 1.6; color: #334155;">
              Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Motorent liên kết với địa chỉ email này. Vui lòng bấm vào nút dưới đây để thiết lập mật khẩu mới:
            </p>

            <!-- Reset Password Button -->
            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);">
                Đặt Lại Mật Khẩu Mới
              </a>
            </div>

            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; line-height: 1.5; text-align: center;">
              * Liên kết này chỉ có hiệu lực trong vòng 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này, mật khẩu hiện tại của bạn vẫn được bảo vệ an toàn tuyệt đối.
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #f8fafc; padding: 18px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; line-height: 1.6;">
            © 2026 <strong>MOTORENT Systems</strong> • Hệ thống thuê xe máy tự lái tự doanh đa chi nhánh TP. Đà Nẵng.
          </td>
        </tr>
      </table>
    </body>
    </html>
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
