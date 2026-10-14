import { io } from '../../server';
import { IBooking } from '../../models/Booking';

export interface BookingStatusPayload {
  bookingId: string;
  bookingCode: string;
  status: string;
  isPaid: boolean;
  depositPaid: boolean;
  remainingAmount: number;
  updatedAt: string;
}

/**
 * Emit real-time status update to booking room and customer user room (UC-37)
 * Strictly minimal payload without sensitive personal information (PII).
 */
export const emitBookingStatus = (booking: IBooking): void => {
  try {
    if (!io) return;

    const payload: BookingStatusPayload = {
      bookingId: booking._id.toString(),
      bookingCode: booking.bookingCode,
      status: booking.status,
      isPaid: Boolean(booking.isPaid),
      depositPaid: Boolean(booking.depositPaid),
      remainingAmount: booking.remainingAmount || 0,
      updatedAt: (booking.updatedAt || new Date()).toISOString(),
    };

    // Emit to booking room (subscribed by customer viewing the booking or branch staff)
    io.to(`booking:${booking._id.toString()}`).emit('booking:status', payload);

    // Emit to customer's personal user room
    if (booking.userId) {
      const userIdStr =
        typeof booking.userId === 'object' && '_id' in booking.userId
          ? String((booking.userId as { _id: unknown })._id)
          : String(booking.userId);
      io.to(`user:${userIdStr}`).emit('booking:status', payload);
    }
  } catch (err) {
    console.error('[SOCKET ERROR] Failed to emit booking:status event:', err);
  }
};
