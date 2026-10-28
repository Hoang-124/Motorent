import mongoose, { Document, Schema } from 'mongoose';

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
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['SYSTEM', 'BOOKING', 'REMINDER', 'PROMO', 'MAINTENANCE', 'TRANSFER'],
      default: 'SYSTEM',
    },
    relatedId: { type: String },
    isRead: { type: Boolean, default: false },
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

NotificationSchema.pre('validate', function (next) {
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

NotificationSchema.post('save', function (doc) {
  try {
    // Dynamic emission to prevent circular import issues during module initialization
    const { emitNotificationNew } = require('../modules/notifications/notificationEvents');
    emitNotificationNew(doc);
  } catch {
    // Socket emission failure should never break database save
  }
});

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
