import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { User, IUser } from '../../models/User';
import { AuditLog } from '../../models/AuditLog';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../config/mailer';
import { env } from '../../config/env';
import { AppError } from '../../core/errorHandler';

/**
 * Generate JWT token for user including tokenVersion
 */
export const generateToken = (user: IUser): string => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.roles,
      tokenVersion: user.tokenVersion || 0,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
};

/**
 * Sanitize user object to remove sensitive credentials
 */
export const sanitizeUser = (user: IUser): Record<string, unknown> => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.passwordHash;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.failedLoginAttempts;
  delete obj.lockUntil;
  delete obj.otpAttempts;
  return obj;
};

/**
 * Helper to hash a token with SHA-256 for secure DB storage
 */
const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
};

/**
 * Helper to constant-time compare two hex hashes
 */
const timingSafeEqualHashes = (a: string, b: string): boolean => {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
};

/**
 * Register a new user with password hashing and email verification
 */
export const register = async (data: {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}) => {
  const { username, email, password, firstName, lastName, phoneNumber } = data;

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  // Disallow registering password account with Google email domain
  if (/@(gmail\.com|googlemail\.com)$/i.test(normalizedEmail)) {
    throw new AppError(400, 'Email của Google (@gmail.com). Vui lòng đăng nhập bằng Google.');
  }

  // Check existing username
  const existingUsername = await User.findOne({ username: normalizedUsername });
  if (existingUsername) {
    throw new AppError(409, 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.');
  }

  // Check existing email
  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    throw new AppError(409, 'Địa chỉ email này đã được đăng ký trong hệ thống.');
  }

  // Check existing phone if provided
  if (phoneNumber) {
    const existingPhone = await User.findOne({ phoneNumber: phoneNumber.trim() });
    if (existingPhone) {
      throw new AppError(409, 'Số điện thoại này đã được liên kết với một tài khoản khác.');
    }
  }

  if (password.length < 8) {
    throw new AppError(400, 'Mật khẩu phải có độ dài tối thiểu từ 8 ký tự.');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Generate 6-digit OTP code using crypto.randomInt
  const verificationOtp = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = hashToken(verificationOtp);
  const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  const newUser = await User.create({
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash,
    firstName: firstName?.trim(),
    lastName: lastName?.trim(),
    phoneNumber: phoneNumber?.trim(),
    roles: 'Customer',
    status: 'Unverified',
    isEmailVerified: false,
    emailVerificationToken: hashedOtp,
    emailVerificationExpires: verificationExpires,
    otpAttempts: 0,
    lastOtpSentAt: new Date(),
    tokenVersion: 0,
    failedLoginAttempts: 0,
  });

  // Send verification email with 6-digit OTP
  await sendVerificationEmail(normalizedEmail, normalizedUsername, verificationOtp);

  // Never return verification tokens or dev OTP in the response
  return {
    user: sanitizeUser(newUser),
    email: normalizedEmail,
  };
};

/**
 * Verify account using 6-digit OTP code with attempt limiting and timing-safe comparison
 */
export const verifyOtp = async (email: string, otp: string) => {
  if (!email || !otp) {
    throw new AppError(400, 'Vui lòng cung cấp địa chỉ email và mã OTP 6 chữ số.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedOtp = otp.trim();

  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new AppError(404, 'Không tìm thấy tài khoản với email này.');
  }

  if (user.isEmailVerified) {
    throw new AppError(400, 'Tài khoản của bạn đã được xác thực trước đó. Vui lòng đăng nhập.');
  }

  // Maximum 5 wrong attempts
  if (user.otpAttempts >= 5) {
    throw new AppError(
      400,
      'Bạn đã nhập sai mã OTP quá 5 lần. Mã này đã bị vô hiệu, vui lòng bấm "Gửi lại mã OTP" để nhận mã mới.'
    );
  }

  if (!user.emailVerificationToken || !user.emailVerificationExpires) {
    throw new AppError(400, 'Mã OTP không hợp lệ hoặc chưa được yêu cầu. Vui lòng gửi lại mã mới.');
  }

  if (user.emailVerificationExpires < new Date()) {
    throw new AppError(400, 'Mã OTP đã hết thời gian hiệu lực (15 phút). Vui lòng yêu cầu gửi lại mã mới.');
  }

  const inputHash = hashToken(normalizedOtp);
  const isMatch = timingSafeEqualHashes(user.emailVerificationToken, inputHash);

  if (!isMatch) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    if (user.otpAttempts >= 5) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
    }
    await user.save();

    const remainingAttempts = Math.max(0, 5 - user.otpAttempts);
    if (remainingAttempts === 0) {
      throw new AppError(400, 'Bạn đã nhập sai mã OTP 5 lần. Mã OTP đã bị hủy. Vui lòng gửi lại mã mới.');
    }
    throw new AppError(400, `Mã OTP không chính xác. Bạn còn ${remainingAttempts} lần thử.`);
  }

  user.isEmailVerified = true;
  user.status = 'Active';
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  user.otpAttempts = 0;
  await user.save();

  const token = generateToken(user);

  return {
    token,
    user: sanitizeUser(user),
  };
};

/**
 * Resend a new 6-digit OTP code to user's email with 60-second cooldown
 */
export const resendOtp = async (email: string) => {
  if (!email) {
    throw new AppError(400, 'Vui lòng cung cấp địa chỉ email.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new AppError(404, 'Không tìm thấy tài khoản với email này.');
  }

  if (user.isEmailVerified) {
    throw new AppError(400, 'Tài khoản này đã được xác thực trước đó. Vui lòng đăng nhập.');
  }

  // Cooldown check (60 seconds)
  if (user.lastOtpSentAt && Date.now() - user.lastOtpSentAt.getTime() < 60 * 1000) {
    const waitSeconds = Math.ceil((60 * 1000 - (Date.now() - user.lastOtpSentAt.getTime())) / 1000);
    throw new AppError(429, `Vui lòng đợi ${waitSeconds} giây trước khi yêu cầu gửi lại mã OTP.`);
  }

  const newOtp = crypto.randomInt(100000, 1000000).toString();
  user.emailVerificationToken = hashToken(newOtp);
  user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
  user.otpAttempts = 0;
  user.lastOtpSentAt = new Date();
  await user.save();

  await sendVerificationEmail(normalizedEmail, user.username, newOtp);

  return {
    success: true,
    message: 'Mã OTP mới đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư.',
  };
};

/**
 * Verify email address with token from email link (exact match, no JWT leak)
 */
export const verifyEmail = async (token: string, email?: string) => {
  if (!token) {
    throw new AppError(400, 'Token xác thực không hợp lệ.');
  }

  const normalizedToken = token.trim();
  const hashedInput = hashToken(normalizedToken);

  // If email is provided, check user directly
  let user: IUser | null = null;
  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    user = await User.findOne({ email: normalizedEmail });
  } else {
    user = await User.findOne({ emailVerificationToken: hashedInput });
  }

  if (!user) {
    throw new AppError(400, 'Liên kết xác thực không hợp lệ hoặc đã hết hạn.');
  }

  if (user.isEmailVerified) {
    return {
      alreadyVerified: true,
      message: 'Tài khoản của bạn đã được kích hoạt thành công trước đó. Vui lòng đăng nhập để tiếp tục.',
    };
  }

  if (!user.emailVerificationToken || !user.emailVerificationExpires) {
    throw new AppError(400, 'Mã xác thực không hợp lệ hoặc đã hết hạn.');
  }

  if (user.emailVerificationExpires < new Date()) {
    throw new AppError(400, 'Liên kết xác thực đã hết hạn (15 phút). Vui lòng yêu cầu gửi lại mã mới.');
  }

  const isMatch = timingSafeEqualHashes(user.emailVerificationToken, hashedInput);
  if (!isMatch) {
    throw new AppError(400, 'Mã xác thực không chính xác.');
  }

  user.isEmailVerified = true;
  user.status = 'Active';
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  user.otpAttempts = 0;
  await user.save();

  return {
    alreadyVerified: false,
    message: 'Xác thực địa chỉ email thành công! Tài khoản của bạn đã được kích hoạt. Vui lòng đăng nhập.',
  };
};

/**
 * Standard login (Username/Email + Password) with lockout protection
 */
export const login = async (identifier: string, password: string) => {
  const normalized = identifier.trim().toLowerCase();
  const invalidCredentialsMsg = 'Tên đăng nhập hoặc mật khẩu không chính xác.';

  const user = await User.findOne({
    $or: [{ username: normalized }, { email: normalized }],
  });

  if (!user) {
    throw new AppError(401, invalidCredentialsMsg);
  }

  // Check lockout
  if (user.lockUntil && user.lockUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
    throw new AppError(
      403,
      `Tài khoản đang tạm thời bị khóa do nhập sai mật khẩu 6 lần liên tiếp. Vui lòng thử lại sau ${minutesLeft} phút.`
    );
  }

  if (user.status === 'Suspended') {
    throw new AppError(403, 'Tài khoản của bạn hiện đang bị tạm khóa. Vui lòng liên hệ ban quản trị.');
  }

  if (!user.passwordHash) {
    if (user.googleId) {
      throw new AppError(400, 'Tài khoản này được đăng ký qua Google. Vui lòng chọn "Đăng nhập bằng Google".');
    }
    throw new AppError(401, invalidCredentialsMsg);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= 6) {
      user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes lockout
      await user.save();
      throw new AppError(403, 'Tài khoản đã bị tạm khóa 30 phút do nhập sai mật khẩu 6 lần liên tiếp.');
    }
    await user.save();
    throw new AppError(401, invalidCredentialsMsg);
  }

  // Reset failed login attempts on successful authentication
  if (user.failedLoginAttempts > 0 || user.lockUntil) {
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
  }

  const token = generateToken(user);

  return {
    token,
    user: sanitizeUser(user),
  };
};

/**
 * Login with Google OAuth2 ID Token strictly verified via google-auth-library
 */
export const loginWithGoogle = async (googleIdToken: string) => {
  if (!googleIdToken || typeof googleIdToken !== 'string') {
    throw new AppError(400, 'Yêu cầu Google ID token hợp lệ.');
  }

  const parts = googleIdToken.trim().split('.');
  if (parts.length !== 3) {
    throw new AppError(401, 'Google ID token phải có cấu trúc JWT 3 phần hợp lệ.');
  }

  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken: googleIdToken.trim(),
      audience: env.GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    throw new AppError(401, 'Xác thực Google ID Token không thành công. Chữ ký hoặc token không hợp lệ.');
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new AppError(401, 'Không thể đọc thông tin email từ tài khoản Google.');
  }

  if (!payload.email_verified) {
    throw new AppError(401, 'Địa chỉ email từ tài khoản Google chưa được xác thực.');
  }

  const { email, sub, name, given_name, family_name, picture } = payload;
  const googleId = sub;
  const normalizedEmail = email.toLowerCase();

  let user = await User.findOne({
    $or: [{ googleId }, { email: normalizedEmail }],
  });

  if (user) {
    if (user.status === 'Suspended') {
      throw new AppError(403, 'Tài khoản của bạn hiện đang bị tạm khóa.');
    }

    if (!user.googleId) user.googleId = googleId;
    user.isEmailVerified = true;
    if (!user.avatarUrl && picture) user.avatarUrl = picture;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
  } else {
    // Create new customer account via Google
    const baseUsername = normalizedEmail.split('@')[0]?.replace(/[^a-z0-9]/g, '') || 'user';
    let uniqueUsername = `${baseUsername}_${crypto.randomBytes(2).toString('hex')}`.toLowerCase();

    // Ensure username uniqueness
    let existingUser = await User.findOne({ username: uniqueUsername });
    while (existingUser) {
      uniqueUsername = `${baseUsername}_${crypto.randomBytes(2).toString('hex')}`.toLowerCase();
      existingUser = await User.findOne({ username: uniqueUsername });
    }

    user = await User.create({
      username: uniqueUsername,
      email: normalizedEmail,
      googleId,
      firstName: given_name || name || 'Google User',
      lastName: family_name || '',
      avatarUrl: picture || '',
      roles: 'Customer',
      status: 'Active',
      isEmailVerified: true,
      tokenVersion: 0,
      failedLoginAttempts: 0,
    });
  }

  const token = generateToken(user);

  return {
    token,
    user: sanitizeUser(user),
  };
};

/**
 * Invalidate token and record logout
 */
export const logout = async (userId: string, meta?: { ipAddress?: string; userAgent?: string }) => {
  const user = await User.findById(userId);
  if (user) {
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await AuditLog.create({
      userId: user._id,
      action: 'LOGOUT',
      entity: 'User',
      entityId: user._id.toString(),
      ipAddress: meta?.ipAddress || '',
      userAgent: meta?.userAgent || '',
      timestamp: new Date(),
    }).catch((err: unknown) => console.error('Error logging logout:', err));
  }
};

/**
 * Forgot password handler with SHA-256 hashed reset token
 */
export const forgotPassword = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const isGoogleDomain = /@(gmail\.com|googlemail\.com)$/i.test(normalizedEmail);

  const user = await User.findOne({ email: normalizedEmail });

  if (isGoogleDomain || (user && user.googleId && !user.passwordHash)) {
    return {
      isGoogleAccount: true,
      message: 'Tài khoản này sử dụng liên kết Google. Bạn không cần đặt lại mật khẩu, vui lòng đăng nhập trực tiếp bằng Google.',
    };
  }

  if (!user) {
    return {
      isGoogleAccount: false,
      message: 'Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi tới hòm thư của bạn.',
    };
  }

  const rawResetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = hashToken(rawResetToken);
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  await sendPasswordResetEmail(normalizedEmail, user.username, rawResetToken);

  return {
    isGoogleAccount: false,
    message: 'Hướng dẫn đặt lại mật khẩu đã được gửi tới địa chỉ email của bạn. Vui lòng kiểm tra hộp thư.',
  };
};

/**
 * Reset password with SHA-256 token verification
 */
export const resetPassword = async (token: string, newPassword: string) => {
  if (!token) {
    throw new AppError(400, 'Token đặt lại mật khẩu không hợp lệ.');
  }

  if (!newPassword || newPassword.length < 8) {
    throw new AppError(400, 'Mật khẩu mới phải có độ dài tối thiểu từ 8 ký tự.');
  }

  const hashedToken = hashToken(token);
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError(
      400,
      'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết thời gian sử dụng (1 giờ). Vui lòng yêu cầu lại.'
    );
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  return {
    success: true,
    message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.',
  };
};

/**
 * Change password for authenticated user
 */
export const changePassword = async (
  userId: string,
  oldPass: string,
  newPass: string,
  meta?: { ipAddress?: string; userAgent?: string }
) => {
  if (!newPass || newPass.length < 8) {
    throw new AppError(400, 'Mật khẩu mới phải có độ dài tối thiểu từ 8 ký tự.');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'Không tìm thấy tài khoản người dùng.');
  }

  if (user.passwordHash) {
    const isMatch = await bcrypt.compare(oldPass, user.passwordHash);
    if (!isMatch) {
      throw new AppError(400, 'Mật khẩu hiện tại không chính xác.');
    }
  }

  if (oldPass === newPass) {
    throw new AppError(400, 'Mật khẩu mới không được trùng với mật khẩu cũ.');
  }

  user.passwordHash = await bcrypt.hash(newPass, 10);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  AuditLog.create({
    userId: user._id,
    action: 'CHANGE_PASSWORD',
    entity: 'User',
    entityId: user._id.toString(),
    ipAddress: meta?.ipAddress || '',
    userAgent: meta?.userAgent || '',
    timestamp: new Date(),
  }).catch((err: unknown) => console.error('Error logging change password:', err));

  return {
    success: true,
    message: 'Đổi mật khẩu thành công! Các phiên đăng nhập khác đã được đăng xuất an toàn.',
  };
};

/**
 * Get profile details
 */
export const getProfile = async (userId: string) => {
  const user = await User.findById(userId).populate('branchId', 'name address phone');
  if (!user) {
    throw new AppError(404, 'Tài khoản không tồn tại.');
  }
  return sanitizeUser(user);
};

/**
 * Update personal profile
 */
export const updateProfile = async (
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    gender?: 'Male' | 'Female' | 'Other';
    dob?: string;
  }
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'Tài khoản không tồn tại.');
  }

  if (data.phoneNumber && data.phoneNumber.trim() !== user.phoneNumber) {
    const existing = await User.findOne({
      phoneNumber: data.phoneNumber.trim(),
      _id: { $ne: user._id },
    });
    if (existing) {
      throw new AppError(409, 'Số điện thoại này đã được sử dụng bởi một tài khoản khác.');
    }
    user.phoneNumber = data.phoneNumber.trim();
  }

  if (data.firstName !== undefined) user.firstName = data.firstName.trim();
  if (data.lastName !== undefined) user.lastName = data.lastName.trim();
  if (data.gender !== undefined) user.gender = data.gender;
  if (data.dob) user.dob = new Date(data.dob);

  await user.save();
  return sanitizeUser(user);
};

/**
 * Update user avatar
 */
export const updateAvatar = async (
  userId: string,
  avatarUrl: string,
  meta?: { ipAddress?: string; userAgent?: string }
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'Tài khoản không tồn tại.');
  }

  user.avatarUrl = avatarUrl;
  await user.save();

  AuditLog.create({
    userId: user._id,
    action: 'UPDATE_AVATAR',
    entity: 'User',
    entityId: user._id.toString(),
    details: { avatarUrl },
    ipAddress: meta?.ipAddress || '',
    userAgent: meta?.userAgent || '',
    timestamp: new Date(),
  }).catch((err: unknown) => console.error('Error logging avatar update:', err));

  return sanitizeUser(user);
};

/**
 * Submit eKYC Identity Documents
 */
export const submitEkyc = async (
  userId: string,
  docs: {
    idCardFrontUrl?: string;
    idCardBackUrl?: string;
    drivingLicenseUrl?: string;
  },
  meta?: { ipAddress?: string; userAgent?: string }
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'Tài khoản không tồn tại.');
  }

  if (!docs.idCardFrontUrl && !docs.idCardBackUrl && !docs.drivingLicenseUrl) {
    throw new AppError(400, 'Vui lòng tải lên ít nhất một ảnh giấy tờ tùy thân (CCCD hoặc GPLX) để tiếp tục.');
  }

  if (docs.idCardFrontUrl) user.idCardFrontUrl = docs.idCardFrontUrl;
  if (docs.idCardBackUrl) user.idCardBackUrl = docs.idCardBackUrl;
  if (docs.drivingLicenseUrl) user.drivingLicenseUrl = docs.drivingLicenseUrl;

  user.identityStatus = 'Pending';
  await user.save();

  AuditLog.create({
    userId: user._id,
    action: 'SUBMIT_EKYC',
    entity: 'User',
    entityId: user._id.toString(),
    details: {
      hasIdCardFront: Boolean(docs.idCardFrontUrl),
      hasIdCardBack: Boolean(docs.idCardBackUrl),
      hasDrivingLicense: Boolean(docs.drivingLicenseUrl),
      identityStatus: 'Pending',
    },
    ipAddress: meta?.ipAddress || '',
    userAgent: meta?.userAgent || '',
    timestamp: new Date(),
  }).catch((err: unknown) => console.error('Error logging ekyc submission:', err));

  return sanitizeUser(user);
};
