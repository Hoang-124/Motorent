import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { UserRole } from '../models/User';

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập.' });
      return;
    }

    if (!allowedRoles.includes(req.user.roles)) {
      res.status(403).json({
        success: false,
        message: `Bạn không có quyền thực hiện thao tác này. Quyền yêu cầu: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
};
