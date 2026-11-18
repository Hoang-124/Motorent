import mongoose, { Document, Schema } from 'mongoose';
import { emitUserRealtimeEvent } from '../core/socketRegistry';

export type NotificationType =
  | 'SYSTEM'
  | 'BOOKING'
  | 'REMINDER'
  | 'PROMO'
  | 'MAINTENANCE'
  | 'TRANSFER';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  type: NotificationType;
  relatedId?: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['SYSTEM', 'BOOKING', 'REMINDER', 'PROMO', 'MAINTENANCE', 'TRANSFER'],
      default: 'SYSTEM',
    },
    relatedId: { type: String, trim: true },
    isRead: { type: Boolean, default: false },
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

NotificationSchema.pre('validate', function (next) {
  this.$locals.wasNew = this.isNew;
  const callStack = new Error().stack || '';
  this.$locals.dispatchedExternally =
    callStack.includes('notificationDispatch') || callStack.includes('notifyBranchOperations');

  if (!this.body && (this as unknown as { message?: string }).message) {
    this.body = (this as unknown as { message: string }).message;
  }
  const validTypes = ['SYSTEM', 'BOOKING', 'REMINDER', 'PROMO', 'MAINTENANCE', 'TRANSFER'];
  if (this.type && !validTypes.includes(this.type)) {
    if (this.type.startsWith('BOOKING')) {
      this.type = 'BOOKING';
    } else {
      this.type = 'SYSTEM';
    }
  }
  next();
});

NotificationSchema.post('save', (doc: INotification) => {
  if (!doc || !doc.userId) return;
  if (doc.$locals?.wasNew === false || doc.$locals?.dispatchedExternally) {
    return;
  }

  const userIdStr = doc.userId.toString();
  emitUserRealtimeEvent(userIdStr, 'notification:new', {
    _id: doc._id.toString(),
    userId: userIdStr,
    title: doc.title,
    body: doc.body,
    type: doc.type,
    relatedId: doc.relatedId,
    isRead: doc.isRead,
    data: doc.data,
    createdAt: doc.createdAt || new Date(),
  });

  if (mongoose.connection.readyState === 1) {
    Notification.countDocuments({ userId: doc.userId, isRead: false })
      .then((count) => {
        emitUserRealtimeEvent(userIdStr, 'notification:badge', { unreadCount: count });
      })
      .catch(() => {
        // Non-fatal badge push
      });
  }
});

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
