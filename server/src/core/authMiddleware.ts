import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../models/User';
import { env } from '../config/env';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  userId: string;
  role: UserRole;
  tokenVersion?: number;
}

/**
 * Standard API JWT Authentication Middleware.
 * Enforces strict Authorization Bearer token header.
 * Disallows query parameter tokens to prevent URL/log leaking.
 */
export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Yêu cầu token xác thực hợp lệ qua Authorization header.' });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(401).json({ success: false, message: 'Tài khoản không tồn tại.' });
      return;
    }

    if (user.status === 'Suspended') {
      res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị tạm khóa.' });
      return;
    }

    // Require tokenVersion on token and enforce match to user.tokenVersion
    if (decoded.tokenVersion === undefined || user.tokenVersion !== decoded.tokenVersion) {
      res.status(401).json({
        success: false,
        message: 'Phiên làm việc đã hết hạn do đăng xuất hoặc đổi mật khẩu. Vui lòng đăng nhập lại.',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};

/**
 * Specialized JWT Authentication Middleware for Protected Media Streaming.
 * Allows query parameter token ONLY for browser <img> requests where custom headers cannot be attached.
 */
export const authenticateJWTFromQuery = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Yêu cầu token xác thực hợp lệ.' });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(401).json({ success: false, message: 'Tài khoản không tồn tại.' });
      return;
    }

    if (user.status === 'Suspended') {
      res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị tạm khóa.' });
      return;
    }

    if (decoded.tokenVersion === undefined || user.tokenVersion !== decoded.tokenVersion) {
      res.status(401).json({ success: false, message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};
