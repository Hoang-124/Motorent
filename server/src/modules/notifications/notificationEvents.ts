import { io } from '../../server';

export interface NotificationPayload {
  _id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  relatedId?: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Emit real-time notification to user personal room (UC-45)
 */
export const emitNotificationNew = (notification: {
  _id: unknown;
  userId: unknown;
  title: string;
  body: string;
  type: string;
  relatedId?: string;
  isRead?: boolean;
  data?: Record<string, unknown>;
  createdAt?: unknown;
}): void => {
  try {
    if (!io || !notification?.userId) return;

    const userIdStr = String(notification.userId);
    const payload: NotificationPayload = {
      _id: String(notification._id),
      userId: userIdStr,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      relatedId: notification.relatedId,
      isRead: Boolean(notification.isRead),
      data: notification.data,
      createdAt:
        notification.createdAt instanceof Date
          ? notification.createdAt.toISOString()
          : typeof notification.createdAt === 'string'
            ? notification.createdAt
            : new Date().toISOString(),
    };

    io.to(`user:${userIdStr}`).emit('notification:new', payload);
  } catch (err) {
    console.error('[SOCKET ERROR] Failed to emit notification:new event:', err);
  }
};
