import mongoose, { Document, Schema } from 'mongoose';

export type ReminderType = 'PICKUP_UPCOMING' | 'RETURN_UPCOMING' | 'RETURN_OVERDUE';
export type ReminderStatus = 'Pending' | 'Sending' | 'Sent' | 'Failed' | 'Cancelled';
export type ReminderChannel = 'SMS' | 'Email';

export interface IBookingReminder extends Document {
  bookingId: mongoose.Types.ObjectId;
  reminderType: ReminderType;
  scheduledTime: Date;
  reminderOffsetHours: 2 | 24;
  sentTime?: Date;
  status: ReminderStatus;
  channel: ReminderChannel;
  createdAt: Date;
  updatedAt: Date;
}

const BookingReminderSchema = new Schema<IBookingReminder>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    reminderType: {
      type: String,
      enum: ['PICKUP_UPCOMING', 'RETURN_UPCOMING', 'RETURN_OVERDUE'],
      required: true,
    },
    scheduledTime: { type: Date, required: true },
    reminderOffsetHours: { type: Number, enum: [2, 24], required: true },
    sentTime: { type: Date },
    status: {
      type: String,
      enum: ['Pending', 'Sending', 'Sent', 'Failed', 'Cancelled'],
      default: 'Pending',
    },
    channel: {
      type: String,
      enum: ['SMS', 'Email'],
      default: 'SMS',
    },
  },
  { timestamps: true }
);

BookingReminderSchema.index({ status: 1, scheduledTime: 1 });
BookingReminderSchema.index({ bookingId: 1 });
BookingReminderSchema.index(
  { bookingId: 1, reminderType: 1, reminderOffsetHours: 1, channel: 1 },
  {
    unique: true,
    partialFilterExpression: { reminderOffsetHours: { $exists: true } },
  }
);

export const BookingReminder = mongoose.model<IBookingReminder>(
  'BookingReminder',
  BookingReminderSchema
);
