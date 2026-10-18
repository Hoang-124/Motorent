import { Response, NextFunction } from 'express';
import fs from 'fs';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import * as authService from './authService';
import { AuditLog } from '../../models/AuditLog';
import { AppError } from '../../core/errorHandler';
import { validateImageMagicBytes } from '../../core/uploadMiddleware';
import { isCloudinaryConfigured, uploadFileToCloudinary } from '../../config/cloudinary';

// Zod schemas for input validation
const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
    .max(30, 'Tên đăng nhập tối đa 30 ký tự')
    .regex(/^[a-zA-Z0-9_.]+$/, 'Tên đăng nhập chỉ chứa chữ cái, số, dấu _ hoặc .'),
  email: z.string().trim().email('Địa chỉ email không đúng định dạng'),
  password: z.string().min(8, 'Mật khẩu phải có độ dài tối thiểu từ 8 ký tự'),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/, 'Số điện thoại di động không đúng định dạng Việt Nam')
    .optional()
    .or(z.literal('')),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Vui lòng nhập tên đăng nhập hoặc email'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Thiếu thông tin Google ID token'),
});

const verifyOtpSchema = z.object({
  email: z.string().trim().email('Địa chỉ email không hợp lệ'),
  otp: z.string().trim().length(6, 'Mã OTP phải có đúng 6 chữ số'),
});

const resendOtpSchema = z.object({
  email: z.string().trim().email('Địa chỉ email không hợp lệ'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Địa chỉ email không hợp lệ'),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Thiếu token đặt lại mật khẩu'),
  newPassword: z.string().min(8, 'Mật khẩu mới phải có tối thiểu 8 ký tự'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(8, 'Mật khẩu mới phải có tối thiểu 8 ký tự'),
});

const updateProfileSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/, 'Số điện thoại không đúng định dạng')
    .optional()
    .or(z.literal('')),
  idCardNumber: z
    .string()
    .trim()
    .regex(/^([0-9]{9}|[0-9]{12}|[A-Za-z][0-9]{7,8})$/, 'Số CCCD (12 số) hoặc Hộ chiếu không đúng định dạng')
    .optional()
    .or(z.literal('')),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dob: z.string().optional(),
});

export const register = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công! Vui lòng kiểm tra hộp thư email để kích hoạt tài khoản.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token =
      (typeof req.params.token === 'string' ? req.params.token : undefined) ||
      (typeof req.query.token === 'string' ? req.query.token : undefined) ||
      req.body?.token;
    const email = typeof req.query.email === 'string' ? req.query.email : req.body?.email;

    if (!token) {
      throw new AppError(400, 'Thiếu mã token xác thực email.');
    }

    const result = await authService.verifyEmail(token, email);
    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, otp } = verifyOtpSchema.parse(req.body);
    const result = await authService.verifyOtp(email, otp);

    res.json({
      success: true,
      message: 'Xác thực tài khoản thành công! Tài khoản của bạn đã được kích hoạt.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const resendOtp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = resendOtpSchema.parse(req.body);
    const result = await authService.resendOtp(email);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const identifier = req.body?.identifier || req.body?.username || req.body?.email;
    const password = req.body?.password;
    const { identifier: validId, password: validPassword } = loginSchema.parse({
      identifier,
      password,
    });

    const result = await authService.login(validId, validPassword);
    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const loginWithGoogle = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const credential = req.body?.credential || req.body?.idToken;
    const { credential: validToken } = googleAuthSchema.parse({ credential });

    const result = await authService.loginWithGoogle(validToken);
    res.json({
      success: true,
      message: 'Đăng nhập Google thành công!',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.user?._id) {
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';
      await authService.logout(req.user._id.toString(), { ipAddress, userAgent });
    }

    res.json({
      success: true,
      message: 'Đăng xuất thành công!',
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await authService.forgotPassword(email);

    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const result = await authService.resetPassword(token, newPassword);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Chưa xác thực người dùng.');
    }

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const result = await authService.changePassword(
      req.user._id.toString(),
      currentPassword,
      newPassword,
      { ipAddress, userAgent }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Chưa xác thực người dùng.');
    }

    const profile = await authService.getProfile(req.user._id.toString());
    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Chưa xác thực người dùng.');
    }

    const data = updateProfileSchema.parse(req.body);
    const updated = await authService.updateProfile(req.user._id.toString(), data);

    res.json({
      success: true,
      message: 'Cập nhật thông tin hồ sơ thành công!',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Chưa xác thực người dùng.');
    }

    if (!req.file) {
      throw new AppError(
        400,
        'Vui lòng chọn file ảnh để tải lên (tối đa 5MB, định dạng JPEG, PNG hoặc WebP).'
      );
    }

    const isValidMagic = await validateImageMagicBytes(req.file.path);
    if (!isValidMagic) {
      throw new AppError(
        400,
        'Nội dung file ảnh không hợp lệ (sai chữ ký định dạng JPEG, PNG hoặc WebP).'
      );
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    let avatarUrl = `/uploads/${req.file.filename}`;
    if (isCloudinaryConfigured()) {
      const uploaded = await uploadFileToCloudinary(req.file.path, {
        folder: 'motorent/avatars',
        type: 'upload',
      });
      avatarUrl = uploaded.secureUrl;
    }

    const updatedUser = await authService.updateAvatar(req.user._id.toString(), avatarUrl, {
      ipAddress,
      userAgent,
    });

    res.json({
      success: true,
      message: 'Cập nhật ảnh đại diện thành công!',
      data: {
        avatarUrl,
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

const processUploadedEkycFile = async (fileObj: Express.Multer.File): Promise<string> => {
  const isValidMagic = await validateImageMagicBytes(fileObj.path);
  if (!isValidMagic) {
    throw new AppError(
      400,
      'Nội dung file giấy tờ không hợp lệ (sai chữ ký định dạng JPEG, PNG hoặc WebP).'
    );
  }

  if (isCloudinaryConfigured()) {
    const uploaded = await uploadFileToCloudinary(fileObj.path, {
      folder: 'motorent/ekyc',
      type: 'authenticated',
    });
    return `cloudinary:${uploaded.publicId}.${uploaded.format}`;
  }

  return fileObj.filename;
};

export const uploadEkyc = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Chưa xác thực người dùng.');
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    let idCardFrontFile: string | undefined;
    let idCardBackFile: string | undefined;
    let selfieFile: string | undefined;
    let drivingLicenseFile: string | undefined;

    if (files) {
      if (files['idCardFront'] && files['idCardFront'][0]) {
        idCardFrontFile = await processUploadedEkycFile(files['idCardFront'][0]);
      }
      if (files['idCardBack'] && files['idCardBack'][0]) {
        idCardBackFile = await processUploadedEkycFile(files['idCardBack'][0]);
      }
      if (files['selfiePhoto'] && files['selfiePhoto'][0]) {
        selfieFile = await processUploadedEkycFile(files['selfiePhoto'][0]);
      }
      if (files['drivingLicense'] && files['drivingLicense'][0]) {
        drivingLicenseFile = await processUploadedEkycFile(files['drivingLicense'][0]);
      }
    }

    const bodyObj = (req.body && typeof req.body === 'object') ? (req.body as Record<string, unknown>) : {};
    const idCardFrontUrl = typeof bodyObj.idCardFrontUrl === 'string' ? bodyObj.idCardFrontUrl : undefined;
    const idCardBackUrl = typeof bodyObj.idCardBackUrl === 'string' ? bodyObj.idCardBackUrl : undefined;
    const selfieUrl = typeof bodyObj.selfieUrl === 'string' ? bodyObj.selfieUrl : undefined;
    const drivingLicenseUrl = typeof bodyObj.drivingLicenseUrl === 'string' ? bodyObj.drivingLicenseUrl : undefined;

    const consentAgreed = bodyObj.consentAgreed === 'true' || bodyObj.consentAgreed === true;
    const watermarked = bodyObj.watermarked === 'true' || bodyObj.watermarked === true;

    if (
      !idCardFrontFile &&
      !idCardBackFile &&
      !selfieFile &&
      !drivingLicenseFile &&
      !idCardFrontUrl &&
      !idCardBackUrl &&
      !selfieUrl &&
      !drivingLicenseUrl
    ) {
      throw new AppError(
        400,
        'Vui lòng chọn ảnh CCCD (mặt trước / mặt sau) và ảnh chân dung đối chiếu để tải lên.'
      );
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const updatedUser = await authService.submitEkyc(
      req.user._id.toString(),
      {
        idCardFrontFile,
        idCardBackFile,
        selfieFile,
        drivingLicenseFile,
        idCardFrontUrl,
        idCardBackUrl,
        selfieUrl,
        drivingLicenseUrl,
        consentAgreed,
        watermarked,
      },
      { ipAddress, userAgent }
    );

    res.json({
      success: true,
      message: 'Tải lên tài liệu eKYC thành công! Hồ sơ của bạn đã được chuyển tới bộ phận thẩm định.',
      data: {
        user: updatedUser,
        identityStatus: 'Pending',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Securely stream user's own eKYC document (Protected by JWT)
 */
export const getEkycDocumentMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Chưa xác thực người dùng.');
    }

    const docType = req.params.docType as 'idCardFront' | 'idCardBack' | 'selfiePhoto' | 'drivingLicense';
    if (!['idCardFront', 'idCardBack', 'selfiePhoto', 'drivingLicense'].includes(docType)) {
      throw new AppError(400, 'Loại tài liệu không hợp lệ.');
    }

    const { filePath, mimeType, filename, signedRedirectUrl } = await authService.getEkycDocumentFile(
      req.user._id.toString(),
      docType
    );

    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    if (signedRedirectUrl) {
      const upstream = await fetch(signedRedirectUrl);
      if (upstream.ok) {
        const buffer = Buffer.from(await upstream.arrayBuffer());
        res.setHeader('Content-Type', upstream.headers.get('content-type') || mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.send(buffer);
        return;
      }
      res.redirect(302, signedRedirectUrl);
      return;
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Securely stream customer's eKYC document for Staff / BranchManager / SystemAdmin review
 * Strictly logs an AuditLog entry as required by Decree 13/2023/ND-CP.
 */
export const getEkycDocumentAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Chưa xác thực người dùng.');
    }

    const { userId, docType } = req.params;
    if (!['idCardFront', 'idCardBack', 'selfiePhoto', 'drivingLicense'].includes(docType)) {
      throw new AppError(400, 'Loại tài liệu không hợp lệ.');
    }

    const { filePath, mimeType, filename, signedRedirectUrl } = await authService.getEkycDocumentFile(
      userId,
      docType as 'idCardFront' | 'idCardBack' | 'selfiePhoto' | 'drivingLicense'
    );

    // Decree 13/2023/ND-CP compliance: Audit log every staff access to sensitive customer identification
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    AuditLog.create({
      userId: req.user._id,
      action: 'VIEW_EKYC_DOCUMENT',
      entity: 'User',
      entityId: userId,
      details: {
        docType,
        viewerRole: req.user.roles,
        viewerUsername: req.user.username,
      },
      ipAddress,
      userAgent,
      timestamp: new Date(),
    }).catch((err: unknown) => console.error('Failed to log eKYC audit access:', err));

    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    if (signedRedirectUrl) {
      const upstream = await fetch(signedRedirectUrl);
      if (upstream.ok) {
        const buffer = Buffer.from(await upstream.arrayBuffer());
        res.setHeader('Content-Type', upstream.headers.get('content-type') || mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.send(buffer);
        return;
      }
      res.redirect(302, signedRedirectUrl);
      return;
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending eKYC requests queue (Staff, BranchManager, SystemAdmin)
 */
export const getPendingEkycQueue = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const list = await authService.getPendingEkycList();
    res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Review user eKYC decision (Staff, BranchManager, SystemAdmin)
 * When status === 'Verified', optionally receives sealed/watermarked CCCD files (idCardFront, idCardBack)
 * to replace the raw unwatermarked CCCD images while preserving the clean selfiePhoto.
 */
export const reviewUserEkyc = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Chưa xác thực người dùng.');
    }

    const { userId } = req.params;
    const { status, note } = req.body;

    if (!['Verified', 'Rejected'].includes(status)) {
      throw new AppError(400, 'Trạng thái xét duyệt phải là Verified hoặc Rejected.');
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let idCardFrontFile: string | undefined;
    let idCardBackFile: string | undefined;

    if (files && status === 'Verified') {
      if (files['idCardFront'] && files['idCardFront'][0]) {
        idCardFrontFile = await processUploadedEkycFile(files['idCardFront'][0]);
      }
      if (files['idCardBack'] && files['idCardBack'][0]) {
        idCardBackFile = await processUploadedEkycFile(files['idCardBack'][0]);
      }
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const updatedUser = await authService.reviewEkyc(
      userId,
      req.user._id.toString(),
      { status, note, idCardFrontFile, idCardBackFile },
      { ipAddress, userAgent }
    );

    res.json({
      success: true,
      message: `Xét duyệt eKYC thành công! Trạng thái mới: ${status}`,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};


