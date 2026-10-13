import mongoose, { Document, Schema } from 'mongoose';

export type ReminderType = 'PICKUP_UPCOMING' | 'RETURN_UPCOMING' | 'RETURN_OVERDUE';
export type ReminderStatus = 'Pending' | 'Sent' | 'Failed';
export type ReminderChannel = 'SMS' | 'Email';

export interface IBookingReminder extends Document {
  bookingId: mongoose.Types.ObjectId;
  reminderType: ReminderType;
  scheduledTime: Date;
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
    sentTime: { type: Date },
    status: {
      type: String,
      enum: ['Pending', 'Sent', 'Failed'],
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

export const BookingReminder = mongoose.model<IBookingReminder>(
  'BookingReminder',
  BookingReminderSchema
);
