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
  data?: any;
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

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
