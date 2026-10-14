import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { UserRole } from '../models/User';
import { Permission, PERMISSION_MATRIX } from './permissions';

export type AuthorizeTarget = UserRole | Permission;

const ALL_ROLES: readonly string[] = ['SystemAdmin', 'BranchManager', 'Staff', 'Customer'];

/**
 * RBAC authorization middleware supporting both explicit Roles and semantic Permissions
 */
export const authorize = (...targets: AuthorizeTarget[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập.' });
      return;
    }

    const userRole = req.user.roles;

    const hasAccess = targets.some((target) => {
      if (ALL_ROLES.includes(target)) {
        return target === userRole;
      }
      const allowedRoles = PERMISSION_MATRIX[target as Permission];
      return allowedRoles ? allowedRoles.includes(userRole) : false;
    });

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: `Bạn không có quyền thực hiện thao tác này. Quyền yêu cầu: [${targets.join(', ')}]`,
      });
      return;
    }

    next();
  };
};
