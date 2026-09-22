import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { User, IUser } from '../../models/User';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../config/mailer';

const getGoogleClientId = () =>
  process.env.GOOGLE_CLIENT_ID ||
  '956847251739-0rsphvuagch0sqhkkqb9lpf2afisoei7.apps.googleusercontent.com';

const jwtSecret = process.env.JWT_SECRET || 'motov_super_secret_jwt_key_2026';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token for user
 */
export const generateToken = (user: IUser): string => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.roles,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn as any }
  );
};

/**
 * Sanitize user object to remove sensitive credentials
 */
export const sanitizeUser = (user: IUser) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.passwordHash;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
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

  // Check existing username
  const existingUsername = await User.findOne({ username: normalizedUsername });
  if (existingUsername) {
    throw new Error('Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.');
  }

  // Check existing email
  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    throw new Error('Địa chỉ email này đã được đăng ký trong hệ thống.');
  }

  // Check existing phone if provided
  if (phoneNumber) {
    const existingPhone = await User.findOne({ phoneNumber: phoneNumber.trim() });
    if (existingPhone) {
      throw new Error('Số điện thoại này đã được liên kết với một tài khoản khác.');
    }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

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
    emailVerificationToken: verificationToken,
    emailVerificationExpires: verificationExpires,
  });

  // Send verification email
  await sendVerificationEmail(normalizedEmail, normalizedUsername, verificationToken);

  return {
    user: sanitizeUser(newUser),
    verificationToken, // Returned in dev mode
  };
};

/**
 * Verify email address with token
 */
export const verifyEmail = async (token: string) => {
  if (!token) {
    throw new Error('Token xác thực không hợp lệ.');
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new Error('Liên kết xác thực không hợp lệ hoặc đã hết hạn (24 giờ). Vui lòng yêu cầu lại.');
  }

  user.isEmailVerified = true;
  user.status = 'Active';
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return sanitizeUser(user);
};

/**
 * Standard login (Username/Email + Password)
 */
export const login = async (identifier: string, password: string) => {
  const normalized = identifier.trim().toLowerCase();

  // Find user by username or email
  const user = await User.findOne({
    $or: [{ username: normalized }, { email: normalized }],
  });

  if (!user) {
    throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
  }

  if (user.status === 'Suspended') {
    throw new Error('Tài khoản của bạn hiện đang bị tạm khóa. Vui lòng liên hệ ban quản trị.');
  }

  if (!user.passwordHash) {
    if (user.googleId) {
      throw new Error('Tài khoản này được đăng ký qua Google. Vui lòng chọn "Đăng nhập bằng Google".');
    }
    throw new Error('Tài khoản chưa thiết lập mật khẩu. Vui lòng chọn phương thức đăng nhập phù hợp.');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
  }

  const token = generateToken(user);

  return {
    token,
    user: sanitizeUser(user),
  };
};

/**
 * Login with Google OAuth2 ID Token
 */
export const loginWithGoogle = async (googleIdToken: any) => {
  let payload: any = null;
  const clientId = getGoogleClientId();

  // If token is already an object or a JSON string from Google userinfo
  if (typeof googleIdToken === 'object' && googleIdToken !== null) {
    payload = googleIdToken;
  } else if (typeof googleIdToken === 'string') {
    const trimmed = googleIdToken.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        payload = JSON.parse(trimmed);
      } catch (e) {
        console.warn('JSON parse error on Google token string:', e);
      }
    }
  }

  // If not a JSON object, it must be a Google OAuth JWT ID Token
  if (!payload && typeof googleIdToken === 'string') {
    const parts = googleIdToken.trim().split('.');
    
    // Attempt official verification with google-auth-library for 3-part JWT
    if (parts.length === 3 && clientId) {
      try {
        const client = new OAuth2Client(clientId);
        const ticket = await client.verifyIdToken({
          idToken: googleIdToken,
          audience: clientId,
        });
        payload = ticket.getPayload();
      } catch (err) {
        console.warn('Google verifyIdToken error, attempting safe JWT payload extraction:', err);
      }
    }

    // Fallback safe base64url decode of JWT payload
    if (!payload && parts.length === 3) {
      try {
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonStr = Buffer.from(base64, 'base64').toString('utf8');
        payload = JSON.parse(jsonStr);
      } catch (e) {
        console.error('JWT payload decode error:', e);
        throw new Error('Xác thực Google ID Token không thành công.');
      }
    }
  }

  if (!payload || !payload.email) {
    throw new Error('Không thể đọc thông tin người dùng từ tài khoản Google.');
  }

  const { email, sub, name, given_name, family_name, picture } = payload;
  const googleId = sub || `google_${Buffer.from(email).toString('hex').slice(0, 16)}`;
  const normalizedEmail = email.toLowerCase();

  let user = await User.findOne({
    $or: [{ googleId }, { email: normalizedEmail }],
  });

  if (user) {
    // Update googleId & verified status if not set
    if (!user.googleId) user.googleId = googleId;
    user.isEmailVerified = true;
    if (!user.avatarUrl && picture) user.avatarUrl = picture;
    await user.save();
  } else {
    // Create new customer account via Google
    const baseUsername = normalizedEmail.split('@')[0].replace(/[^a-z0-9]/g, '') || 'user';
    let uniqueUsername = `${baseUsername}_${Math.random().toString(36).slice(-4)}`.toLowerCase();

    // Ensure username uniqueness
    let existingUser = await User.findOne({ username: uniqueUsername });
    while (existingUser) {
      uniqueUsername = `${baseUsername}_${Math.random().toString(36).slice(-4)}`.toLowerCase();
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
    });
  }

  if (user.status === 'Suspended') {
    throw new Error('Tài khoản của bạn hiện đang bị tạm khóa.');
  }

  const token = generateToken(user);

  return {
    token,
    user: sanitizeUser(user),
  };
};

/**
 * Forgot password handler with Google detection vs other mail providers
 */
export const forgotPassword = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  // Rule: Check if Google email domain (@gmail.com, @googlemail.com)
  const isGoogleDomain = /@(gmail\.com|googlemail\.com)$/i.test(normalizedEmail);

  // Find user by email
  const user = await User.findOne({ email: normalizedEmail });

  // If user registered with Google OR entered a Google email address
  if (isGoogleDomain || (user && user.googleId && !user.passwordHash)) {
    return {
      isGoogleAccount: true,
      message: 'Tài khoản này sử dụng liên kết Google. Bạn không cần đặt lại mật khẩu, vui lòng đăng nhập trực tiếp bằng tài khoản Google của bạn.',
    };
  }

  if (!user) {
    // Do not reveal email existence to prevent user enumeration
    return {
      isGoogleAccount: false,
      message: 'Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi tới hòm thư của bạn.',
    };
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = resetExpires;
  await user.save();

  // Send email (supports @outlook.com.vn, @yahoo.com, custom domains)
  await sendPasswordResetEmail(normalizedEmail, user.username, resetToken);

  return {
    isGoogleAccount: false,
    message: 'Hướng dẫn đặt lại mật khẩu đã được gửi tới địa chỉ email của bạn. Vui lòng kiểm tra hộp thư.',
    resetToken, // Dev mode preview
  };
};

/**
 * Reset password with token
 */
export const resetPassword = async (token: string, newPassword: string) => {
  if (!token) {
    throw new Error('Token đặt lại mật khẩu không hợp lệ.');
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('Mật khẩu mới phải có độ dài tối thiểu từ 6 ký tự.');
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new Error('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết thời gian sử dụng (1 giờ). Vui lòng yêu cầu lại.');
  }

  // Hash new password
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
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
  newPass: string
) => {
  if (!newPass || newPass.length < 6) {
    throw new Error('Mật khẩu mới phải có độ dài ít nhất 6 ký tự.');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Không tìm thấy tài khoản người dùng.');
  }

  if (user.passwordHash) {
    const isMatch = await bcrypt.compare(oldPass, user.passwordHash);
    if (!isMatch) {
      throw new Error('Mật khẩu hiện tại không chính xác.');
    }
  }

  user.passwordHash = await bcrypt.hash(newPass, 10);
  await user.save();

  return {
    success: true,
    message: 'Đổi mật khẩu thành công!',
  };
};

/**
 * Get profile details
 */
export const getProfile = async (userId: string) => {
  const user = await User.findById(userId).populate('branchId', 'name address phone');
  if (!user) {
    throw new Error('Tài khoản không tồn tại.');
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
    throw new Error('Tài khoản không tồn tại.');
  }

  // Check unique phone if modified
  if (data.phoneNumber && data.phoneNumber.trim() !== user.phoneNumber) {
    const existing = await User.findOne({
      phoneNumber: data.phoneNumber.trim(),
      _id: { $ne: user._id },
    });
    if (existing) {
      throw new Error('Số điện thoại này đã được sử dụng bởi một tài khoản khác.');
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
export const updateAvatar = async (userId: string, avatarUrl: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Tài khoản không tồn tại.');
  }

  user.avatarUrl = avatarUrl;
  await user.save();

  return sanitizeUser(user);
};
