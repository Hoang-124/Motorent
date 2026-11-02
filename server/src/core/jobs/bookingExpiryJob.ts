import cron from 'node-cron';
import { Booking } from '../../models/Booking';
import { Discount } from '../../models/Discount';
import { BookingReminder } from '../../models/BookingReminder';
import { AuditLog } from '../../models/AuditLog';
import { emitBookingStatus } from '../../modules/booking/bookingEvents';
import { sendBookingStatusUpdateEmail } from '../../modules/booking/bookingEmailService';
import { createUserNotification } from '../../modules/notifications/notificationService';

let isJobRunning = false;
let cronTask: cron.ScheduledTask | null = null;

/**
 * Sweeps expired pending bookings and marks them Cancelled with audit trail.
 * Releases applied discount coupons and cancels scheduled pickup reminders.
 */
export const runBookingExpirySweep = async (): Promise<number> => {
  const now = new Date();
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

  // Find all pending bookings that have expired
  const expiredBookings = await Booking.find({
    status: 'Pending',
    $or: [
      { paymentExpiresAt: { $lt: now } },
      { paymentExpiresAt: { $exists: false }, createdAt: { $lt: thirtyMinutesAgo } },
      { paymentExpiresAt: null, createdAt: { $lt: thirtyMinutesAgo } },
    ],
  }).select('_id bookingCode userId discountId pickupDateTime totalAmount');

  if (expiredBookings.length === 0) {
    return 0;
  }

  const expiredIds = expiredBookings.map((b) => b._id);

  // Atomically update status only if still 'Pending'
  const updateResult = await Booking.updateMany(
    { _id: { $in: expiredIds }, status: 'Pending' },
    {
      $set: {
        status: 'Cancelled',
        cancelReason: 'Quá hạn giữ chỗ và thanh toán (Hệ thống tự động hủy)',
      },
    }
  );

  // Release discounts for cancelled bookings
  for (const b of expiredBookings) {
    b.status = 'Cancelled';
    b.cancelReason = 'Quá hạn giữ chỗ và thanh toán (Hệ thống tự động hủy)';
    if (b.discountId) {
      await Discount.findByIdAndUpdate(b.discountId, { $inc: { usedCount: -1 } }).catch(() => {});
    }

    // Cancel pending reminders
    await BookingReminder.updateMany(
      { bookingId: b._id, status: 'Pending' },
      { $set: { status: 'Cancelled' } }
    ).catch(() => {});

    // Create Audit Log
    await AuditLog.create({
      userId: b.userId,
      action: 'AUTO_CANCEL_EXPIRED_BOOKING',
      entity: 'Booking',
      entityId: b._id.toString(),
      details: {
        bookingCode: b.bookingCode,
        reason: 'Payment timeout 15 minutes',
      },
      timestamp: new Date(),
    }).catch(() => {});

    // Emit real-time status update to socket rooms (UC-37)
    emitBookingStatus({
      _id: b._id,
      bookingCode: b.bookingCode,
      status: 'Cancelled',
      userId: b.userId,
      isPaid: false,
      depositPaid: false,
      remainingAmount: 0,
      updatedAt: new Date(),
    } as unknown as import('../../models/Booking').IBooking);
    await sendBookingStatusUpdateEmail(b);
    await createUserNotification({
      userId: b.userId,
      title: `Đơn ${b.bookingCode} đã hết hạn`,
      body: 'Đơn giữ xe chưa hoàn tất thanh toán đúng hạn và đã được hệ thống tự động hủy.',
      type: 'BOOKING',
      relatedId: b._id.toString(),
      data: { bookingId: b._id.toString(), status: b.status },
    }).catch((error: unknown) => console.error('[Notification] Could not create expiry notification:', error));
  }

  return updateResult.modifiedCount;
};

/**
 * Initializes cron job running every minute to auto-expire stale bookings.
 * Protected against hot-reload double invocation.
 */
export const startBookingExpiryJob = (): void => {
  if (isJobRunning) {
    return;
  }

  isJobRunning = true;
  // Run every minute: '*/1 * * * *'
  cronTask = cron.schedule('*/1 * * * *', async () => {
    try {
      const expiredCount = await runBookingExpirySweep();
      if (expiredCount > 0 && process.env.NODE_ENV !== 'test') {
        console.log(`[CRON] Auto-cancelled ${expiredCount} expired pending booking(s).`);
      }
    } catch (error) {
      console.error('[CRON Error] Failed to sweep expired bookings:', error);
    }
  });

  if (process.env.NODE_ENV !== 'test') {
    console.log('[CRON] Booking expiry sweep job initialized (Interval: 1 min).');
  }
};

export const stopBookingExpiryJob = (): void => {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    isJobRunning = false;
  }
};
