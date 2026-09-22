import { Response } from 'express';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import * as authService from './authService';

export const register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { username, email, password, firstName, lastName, phoneNumber } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ tên đăng nhập, email và mật khẩu.',
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có độ dài tối thiểu từ 6 ký tự.',
      });
      return;
    }

    const result = await authService.register({
      username,
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
    });

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công! Vui lòng kiểm tra hộp thư email để kích hoạt tài khoản.',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const verifyEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const token = (req.query.token as string) || req.body.token;
    if (!token) {
      res.status(400).json({ success: false, message: 'Thiếu mã token xác thực email.' });
      return;
    }

    const user = await authService.verifyEmail(token);
    res.json({
      success: true,
      message: 'Xác thực địa chỉ email thành công! Tài khoản của bạn đã được kích hoạt.',
      data: user,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const verifyOtp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ địa chỉ email và mã OTP 6 chữ số.',
      });
      return;
    }

    const result = await authService.verifyOtp(email, otp);
    res.json({
      success: true,
      message: 'Xác thực mã OTP thành công! Tài khoản của bạn đã được kích hoạt.',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const resendOtp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp địa chỉ email để gửi lại mã OTP.',
      });
      return;
    }

    const result = await authService.resendOtp(email);
    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { identifier, username, email, password } = req.body;
    const loginId = identifier || username || email;

    if (!loginId || !password) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên đăng nhập/email và mật khẩu.',
      });
      return;
    }

    const result = await authService.login(loginId, password);
    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: result,
    });
  } catch (error: any) {
    res.status(401).json({ success: false, message: error.message });
  }
};

export const loginWithGoogle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { credential, idToken } = req.body;
    const token = credential || idToken;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Thiếu thông tin Google credential token.',
      });
      return;
    }

    const result = await authService.loginWithGoogle(token);
    res.json({
      success: true,
      message: 'Đăng nhập Google thành công!',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      message: 'Đăng xuất thành công!',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const forgotPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Vui lòng nhập địa chỉ email.' });
      return;
    }

    const result = await authService.forgotPassword(email);
    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ mã token và mật khẩu mới.',
      });
      return;
    }

    const result = await authService.resetPassword(token, newPassword);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực người dùng.' });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.',
      });
      return;
    }

    const result = await authService.changePassword(userId.toString(), currentPassword, newPassword);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực người dùng.' });
      return;
    }

    const profile = await authService.getProfile(userId.toString());
    res.json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực người dùng.' });
      return;
    }

    const { firstName, lastName, phoneNumber, gender, dob } = req.body;
    const updated = await authService.updateProfile(userId.toString(), {
      firstName,
      lastName,
      phoneNumber,
      gender,
      dob,
    });

    res.json({
      success: true,
      message: 'Cập nhật thông tin hồ sơ thành công!',
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const uploadAvatar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực người dùng.' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh tải lên.' });
      return;
    }

    // Build URL relative to server static folder
    const avatarUrl = `/uploads/${req.file.filename}`;
    const updatedUser = await authService.updateAvatar(userId.toString(), avatarUrl);

    res.json({
      success: true,
      message: 'Cập nhật ảnh đại diện thành công!',
      data: {
        avatarUrl,
        user: updatedUser,
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
