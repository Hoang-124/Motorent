import cron from 'node-cron';
import { Booking, IBooking } from '../../models/Booking';
import { BookingReminder } from '../../models/BookingReminder';
import { User } from '../../models/User';
import { isSmsConfigured, sendSms } from '../../config/sms';

let isJobRunning = false;
let cronTask: cron.ScheduledTask | null = null;
let warnedSmsUnconfigured = false;

export const schedulePickupReminders = async (
  booking: Pick<IBooking, '_id' | 'pickupDateTime'>
): Promise<void> => {
  const now = Date.now();
  for (const reminderOffsetHours of [24, 2] as const) {
    let scheduledTime = new Date(
      booking.pickupDateTime.getTime() - reminderOffsetHours * 60 * 60 * 1000
    );
    if (scheduledTime.getTime() < now) {
      if (reminderOffsetHours === 24) continue;
      scheduledTime = new Date(now);
    }

    await BookingReminder.updateOne(
      {
        bookingId: booking._id,
        reminderType: 'PICKUP_UPCOMING',
        reminderOffsetHours,
        channel: 'SMS',
      },
      {
        $setOnInsert: {
          scheduledTime,
          status: 'Pending',
        },
      },
      { upsert: true }
    );
  }
};

export const runBookingReminderSweep = async (now = new Date()): Promise<number> => {
  const upcomingBookings = await Booking.find({
    status: { $in: ['Approved', 'Confirmed'] },
    pickupDateTime: { $gt: now, $lte: new Date(now.getTime() + 25 * 60 * 60 * 1000) },
  }).select('_id pickupDateTime');
  for (const booking of upcomingBookings) {
    await schedulePickupReminders(booking);
  }

  if (!isSmsConfigured()) {
    const dueCount = await BookingReminder.countDocuments({
      channel: 'SMS',
      status: 'Pending',
      scheduledTime: { $lte: now },
    });
    if (dueCount > 0 && !warnedSmsUnconfigured) {
      console.warn(`[CRON] ${dueCount} SMS reminder(s) are due, but Twilio is not configured. They remain queued.`);
      warnedSmsUnconfigured = true;
    }
    return 0;
  }

  warnedSmsUnconfigured = false;
  const dueReminders = await BookingReminder.find({
    channel: 'SMS',
    status: 'Pending',
    scheduledTime: { $lte: now },
  })
    .sort({ scheduledTime: 1 })
    .limit(100);

  let sentCount = 0;
  for (const reminder of dueReminders) {
    const booking = await Booking.findById(reminder.bookingId);
    if (
      !booking ||
      ['Cancelled', 'Rejected', 'Completed', 'Ongoing'].includes(booking.status) ||
      booking.pickupDateTime <= now
    ) {
      await BookingReminder.updateOne(
        { _id: reminder._id, status: 'Pending' },
        { $set: { status: 'Cancelled' } }
      );
      continue;
    }
    if (booking.status === 'Pending') continue;
    if (!['Approved', 'Confirmed'].includes(booking.status)) {
      await BookingReminder.updateOne(
        { _id: reminder._id, status: 'Pending' },
        { $set: { status: 'Cancelled' } }
      );
      continue;
    }

    const claimed = await BookingReminder.findOneAndUpdate(
      { _id: reminder._id, status: 'Pending' },
      { $set: { status: 'Sending' } },
      { new: true }
    );
    if (!claimed) continue;

    try {
      const customer = await User.findById(booking.userId).select('phoneNumber');
      if (!customer?.phoneNumber) throw new Error('Khách hàng chưa cập nhật số điện thoại nhận SMS.');

      const hours = reminder.reminderOffsetHours;
      await sendSms(
        customer.phoneNumber,
        `MOTORENT: Don ${booking.bookingCode} cua ban se nhan xe sau ${hours} gio. Vui long den dung gio tai chi nhanh da chon.`
      );
      await BookingReminder.updateOne({ _id: claimed._id, status: 'Sending' }, { $set: { status: 'Sent', sentTime: now } });
      sentCount += 1;
    } catch (error) {
      await BookingReminder.updateOne({ _id: claimed._id, status: 'Sending' }, { $set: { status: 'Failed' } });
      console.error(`[CRON] SMS reminder ${claimed._id.toString()} failed:`, error);
    }
  }

  return sentCount;
};

export const startBookingReminderJob = (): void => {
  if (isJobRunning) return;
  isJobRunning = true;
  cronTask = cron.schedule('*/1 * * * *', async () => {
    try {
      const sentCount = await runBookingReminderSweep();
      if (sentCount > 0 && process.env.NODE_ENV !== 'test') {
        console.log(`[CRON] Sent ${sentCount} pickup SMS reminder(s).`);
      }
    } catch (error) {
      console.error('[CRON Error] Failed to process booking SMS reminders:', error);
    }
  });

  if (process.env.NODE_ENV !== 'test') {
    console.log('[CRON] Booking SMS reminder job initialized (Interval: 1 min).');
  }
};

export const stopBookingReminderJob = (): void => {
  cronTask?.stop();
  cronTask = null;
  isJobRunning = false;
};
