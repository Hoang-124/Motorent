import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import { AppError } from '../../core/errorHandler';
import * as notificationService from './notificationService';

const getUserId = (req: AuthenticatedRequest): string => {
  if (!req.user?._id) {
    throw new AppError(401, 'Yêu cầu đăng nhập.');
  }
  return req.user._id.toString();
};

/**
 * GET /notifications/unread-count
 * Lightweight endpoint — returns only the unread badge count for fast initial sync (UC-45)
 */
export const getUnreadCount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const count = await notificationService.getUnreadCount(getUserId(req));
    res.json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    next(error);
  }
};

export const listNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await notificationService.listNotifications(getUserId(req));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const notification = await notificationService.markNotificationRead(getUserId(req), req.params.id);
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const modifiedCount = await notificationService.markAllNotificationsRead(getUserId(req));
    res.json({ success: true, data: { modifiedCount } });
  } catch (error) {
    next(error);
  }
};
