import mongoose from 'mongoose';
import { UserRole, IUser } from '../models/User';
import { AppError } from './errorHandler';

export type Permission =
  | 'USER_VIEW'
  | 'USER_MANAGE'
  | 'BRANCH_VIEW'
  | 'BRANCH_MANAGE'
  | 'VEHICLE_VIEW'
  | 'VEHICLE_MANAGE'
  | 'BOOKING_VIEW'
  | 'BOOKING_CREATE'
  | 'BOOKING_CHECKIN'
  | 'BOOKING_CHECKOUT'
  | 'BOOKING_CANCEL'
  | 'BOOKING_COUNTER_PAY'
  | 'EKYC_VIEW'
  | 'EKYC_REVIEW'
  | 'AUDIT_VIEW'
  | 'FINANCE_RECONCILE'
  | 'FINANCE_TAX_REPORT'
  | 'MAINTENANCE_VIEW'
  | 'MAINTENANCE_LOG'
  | 'STAFF_SCHEDULE'
  | 'CHAT_STAFF_CONSOLE';

/**
 * Single source of truth for Role-Based Access Control matrix
 */
export const PERMISSION_MATRIX: Record<Permission, readonly UserRole[]> = {
  USER_VIEW: ['SystemAdmin', 'BranchManager', 'Staff'],
  USER_MANAGE: ['SystemAdmin'],
  BRANCH_VIEW: ['SystemAdmin', 'BranchManager', 'Staff', 'Customer'],
  BRANCH_MANAGE: ['SystemAdmin'],
  VEHICLE_VIEW: ['SystemAdmin', 'BranchManager', 'Staff', 'Customer'],
  VEHICLE_MANAGE: ['SystemAdmin', 'BranchManager'],
  BOOKING_VIEW: ['SystemAdmin', 'BranchManager', 'Staff', 'Customer'],
  BOOKING_CREATE: ['SystemAdmin', 'BranchManager', 'Staff', 'Customer'],
  BOOKING_CHECKIN: ['SystemAdmin', 'BranchManager', 'Staff'],
  BOOKING_CHECKOUT: ['SystemAdmin', 'BranchManager', 'Staff'],
  BOOKING_CANCEL: ['SystemAdmin', 'BranchManager', 'Staff', 'Customer'],
  BOOKING_COUNTER_PAY: ['SystemAdmin', 'BranchManager', 'Staff'],
  EKYC_VIEW: ['SystemAdmin', 'BranchManager', 'Staff'],
  EKYC_REVIEW: ['SystemAdmin', 'BranchManager', 'Staff'],
  AUDIT_VIEW: ['SystemAdmin'],
  FINANCE_RECONCILE: ['SystemAdmin', 'BranchManager'],
  FINANCE_TAX_REPORT: ['SystemAdmin'],
  MAINTENANCE_VIEW: ['SystemAdmin', 'BranchManager', 'Staff'],
  MAINTENANCE_LOG: ['SystemAdmin', 'BranchManager', 'Staff'],
  STAFF_SCHEDULE: ['SystemAdmin', 'BranchManager'],
  CHAT_STAFF_CONSOLE: ['SystemAdmin', 'BranchManager', 'Staff'],
} as const;

/**
 * Check if a role possesses a specific permission
 */
export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  const allowed = PERMISSION_MATRIX[permission];
  return allowed ? allowed.includes(role) : false;
};

/**
 * Strict branch-level access control helper.
 * SystemAdmin has global access.
 * BranchManager and Staff are restricted strictly to their assigned branch.
 */
export const assertBranchAccess = (
  user: IUser | { roles: UserRole; branchId?: mongoose.Types.ObjectId | string },
  branchId: string | mongoose.Types.ObjectId | Array<string | mongoose.Types.ObjectId>
): void => {
  if (user.roles === 'SystemAdmin') {
    return;
  }

  if (!user.branchId) {
    throw new AppError(403, 'Tài khoản chưa được phân bổ chi nhánh công tác.');
  }

  const userBranchStr = user.branchId.toString();
  const allowedBranches = Array.isArray(branchId) ? branchId : [branchId];
  const isAllowed = allowedBranches.some((b) => b.toString() === userBranchStr);

  if (!isAllowed) {
    throw new AppError(
      403,
      'Bạn không có quyền thao tác trên dữ liệu của chi nhánh khác. Quyền chỉ áp dụng tại chi nhánh công tác.'
    );
  }
};
