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
 * Uses per-booking atomic compare-and-swap so concurrently paid bookings never trigger cancellation side-effects.
 */
export const runBookingExpirySweep = async (): Promise<number> => {
  if (isJobRunning) {
    return 0;
  }

  isJobRunning = true;
  try {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // Find candidate unpaid pending bookings that have passed expiry
    const expiredBookings = await Booking.find({
      status: 'Pending',
      depositPaid: { $ne: true },
      isPaid: { $ne: true },
      $or: [
        { paymentExpiresAt: { $lt: now } },
        { paymentExpiresAt: { $exists: false }, createdAt: { $lt: thirtyMinutesAgo } },
        { paymentExpiresAt: null, createdAt: { $lt: thirtyMinutesAgo } },
      ],
    }).select('_id bookingCode userId discountId pickupDateTime totalAmount');

    if (expiredBookings.length === 0) {
      return 0;
    }

    let cancelledCount = 0;

    for (const b of expiredBookings) {
      const cancelled = await Booking.findOneAndUpdate(
        {
          _id: b._id,
          status: 'Pending',
          depositPaid: { $ne: true },
          isPaid: { $ne: true },
        },
        {
          $set: {
            status: 'Cancelled',
            cancelledAt: now,
            cancelReason: 'Quá hạn giữ chỗ và thanh toán (Hệ thống tự động hủy)',
          },
        },
        { new: true }
      );

      if (!cancelled) {
        continue;
      }

      cancelledCount += 1;

      if (cancelled.discountId) {
        await Discount.updateOne(
          { _id: cancelled.discountId, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } }
        ).catch(() => {});
      }

      // Cancel pending reminders
      await BookingReminder.updateMany(
        { bookingId: cancelled._id, status: 'Pending' },
        { $set: { status: 'Cancelled' } }
      ).catch(() => {});

      // Create Audit Log
      await AuditLog.create({
        userId: cancelled.userId,
        action: 'AUTO_CANCEL_EXPIRED_BOOKING',
        entity: 'Booking',
        entityId: cancelled._id.toString(),
        details: {
          bookingCode: cancelled.bookingCode,
          reason: 'Payment timeout 15 minutes',
        },
        timestamp: new Date(),
      }).catch(() => {});

      // Emit real-time status update to socket rooms (UC-37)
      emitBookingStatus(cancelled);
      await sendBookingStatusUpdateEmail(cancelled);
      await createUserNotification({
        userId: cancelled.userId,
        title: `Đơn ${cancelled.bookingCode} đã hết hạn`,
        body: 'Đơn giữ xe chưa hoàn tất thanh toán đúng hạn và đã được hệ thống tự động hủy.',
        type: 'BOOKING',
        relatedId: cancelled._id.toString(),
        data: { bookingId: cancelled._id.toString(), status: cancelled.status },
      }).catch((error: unknown) => console.error('[Notification] Could not create expiry notification:', error));
    }

    return cancelledCount;
  } finally {
    isJobRunning = false;
  }
};

/**
 * Initializes cron job running every minute to auto-expire stale bookings.
 * Protected against hot-reload double invocation.
 */
export const startBookingExpiryJob = (): void => {
  if (cronTask) {
    return;
  }

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
  }
};
