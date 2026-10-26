import mongoose from 'mongoose';
import { AppError } from '../../core/errorHandler';
import { Notification, NotificationType } from '../../models/Notification';

export const createUserNotification = async (input: {
  userId: mongoose.Types.ObjectId | string;
  title: string;
  body: string;
  type: NotificationType;
  relatedId?: string;
  data?: Record<string, unknown>;
}) => Notification.create({ ...input, isRead: false });

export const listNotifications = async (userId: string) => {
  const [items, unreadCount] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  return { items, unreadCount };
};

export const markNotificationRead = async (userId: string, notificationId: string) => {
  if (!mongoose.isValidObjectId(notificationId)) {
    throw new AppError(400, 'Mã thông báo không hợp lệ.');
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) {
    throw new AppError(404, 'Không tìm thấy thông báo.');
  }

  return notification;
};

export const markAllNotificationsRead = async (userId: string): Promise<number> => {
  const result = await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
  return result.modifiedCount;
};
