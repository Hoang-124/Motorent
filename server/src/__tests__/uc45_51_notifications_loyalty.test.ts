import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { disconnectDatabase } from '../config/database';
import { normalizeVietnamesePhoneNumber } from '../config/sms';
import { Discount } from '../models/Discount';
import { Notification } from '../models/Notification';
import { BookingReminder } from '../models/BookingReminder';
import { IBooking } from '../models/Booking';
import { User } from '../models/User';
import { markNotificationRead, listNotifications } from '../modules/notifications/notificationService';
import {
  redeemPoints,
  rewardReferralOnFirstCompletedBooking,
} from '../modules/loyalty/loyaltyService';
import { updatePreferences } from '../modules/auth/authService';
import { schedulePickupReminders } from '../core/jobs/bookingReminderJob';
import { setupTestEnvironment } from './testHelper';

describe('UC-45 to UC-51 notifications and loyalty', () => {
  const testUserIds: mongoose.Types.ObjectId[] = [];
  const testDiscountIds: mongoose.Types.ObjectId[] = [];
  const testNotificationIds: mongoose.Types.ObjectId[] = [];
  const testReminderBookingIds: mongoose.Types.ObjectId[] = [];

  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({ _id: { $in: testUserIds } }),
      Discount.deleteMany({ _id: { $in: testDiscountIds } }),
      BookingReminder.deleteMany({ bookingId: { $in: testReminderBookingIds } }),
      Notification.deleteMany({
        $or: [{ _id: { $in: testNotificationIds } }, { userId: { $in: testUserIds } }],
      }),
    ]);
    await disconnectDatabase();
  });

  const createCustomer = async (username: string, loyaltyPoints = 0) => {
    const user = await User.create({
      username: `${username}_${new mongoose.Types.ObjectId().toString().slice(-8)}`,
      email: `${username}_${new mongoose.Types.ObjectId().toString().slice(-8)}@example.net`,
      roles: 'Customer',
      status: 'Active',
      loyaltyPoints,
      isEmailVerified: true,
    });
    testUserIds.push(user._id);
    return user;
  };

  it('lists only the signed-in user notifications and marks reads by owner', async () => {
    const owner = await createCustomer('notification_owner');
    const other = await createCustomer('notification_other');
    const [ownedNotification, otherNotification] = await Notification.create([
      { userId: owner._id, title: 'Booking', body: 'Booking update', type: 'BOOKING' },
      { userId: other._id, title: 'Private', body: 'Private update', type: 'SYSTEM' },
    ]);
    testNotificationIds.push(ownedNotification._id, otherNotification._id);

    const result = await listNotifications(owner._id.toString());
    expect(result.items.map((item) => item._id.toString())).toEqual([ownedNotification._id.toString()]);
    expect(result.unreadCount).toBe(1);
    await expect(markNotificationRead(other._id.toString(), ownedNotification._id.toString())).rejects.toThrow(
      'Không tìm thấy thông báo.'
    );
    await markNotificationRead(owner._id.toString(), ownedNotification._id.toString());
    expect((await listNotifications(owner._id.toString())).unreadCount).toBe(0);
  });

  it('redeems points once into an owner-only fixed-value discount voucher', async () => {
    const owner = await createCustomer('loyalty_owner', 500);
    const result = await redeemPoints(owner._id.toString(), 200);
    const voucher = await Discount.findOne({ code: result.code });
    testDiscountIds.push(voucher!._id);

    expect(result.discountAmount).toBe(20_000);
    expect(result.remainingPoints).toBe(300);
    expect(voucher?.ownerUserId?.toString()).toBe(owner._id.toString());
    expect(voucher?.fixedDiscountAmount).toBe(20_000);
    expect((await User.findById(owner._id))?.loyaltyPoints).toBe(300);
  });

  it('rejects invalid or unaffordable redemptions without charging points', async () => {
    const owner = await createCustomer('loyalty_insufficient', 50);
    await expect(redeemPoints(owner._id.toString(), 100)).rejects.toThrow('Số điểm hiện có không đủ');
    expect((await User.findById(owner._id))?.loyaltyPoints).toBe(50);
    await expect(redeemPoints(owner._id.toString(), 150)).rejects.toThrow('bội số của 100');
  });

  it('awards referral points once when the referred customer completes their first booking', async () => {
    const referrer = await createCustomer('referrer');
    const referred = await User.create({
      username: `referred_${new mongoose.Types.ObjectId().toString().slice(-8)}`,
      email: `referred_${new mongoose.Types.ObjectId().toString().slice(-8)}@example.net`,
      roles: 'Customer',
      status: 'Active',
      loyaltyPoints: 0,
      referredBy: referrer._id,
      referralRewarded: false,
      isEmailVerified: true,
    });
    testUserIds.push(referred._id);

    expect(await rewardReferralOnFirstCompletedBooking(referred._id)).toBe(true);
    expect(await rewardReferralOnFirstCompletedBooking(referred._id)).toBe(false);
    expect((await User.findById(referrer._id))?.loyaltyPoints).toBe(100);
    expect((await User.findById(referred._id))?.loyaltyPoints).toBe(100);
  });

  it('persists the marketing preference independently of transactional emails', async () => {
    const user = await createCustomer('promo_optin');
    const updated = await updatePreferences(user._id.toString(), { promoSubscribed: true });
    expect(updated.promoSubscribed).toBe(true);
    expect((await User.findById(user._id))?.promoSubscribed).toBe(true);
  });

  it('normalizes Vietnamese mobile numbers to E.164 for Twilio', () => {
    expect(normalizeVietnamesePhoneNumber('0912 345 678')).toBe('+84912345678');
    expect(normalizeVietnamesePhoneNumber('+84912345678')).toBe('+84912345678');
  });

  it('schedules distinct 24-hour and 2-hour pickup reminders', async () => {
    const bookingId = new mongoose.Types.ObjectId();
    testReminderBookingIds.push(bookingId);
    const pickupDateTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await schedulePickupReminders({ _id: bookingId, pickupDateTime } as IBooking);

    const reminders = await BookingReminder.find({ bookingId }).sort({ reminderOffsetHours: -1 });
    expect(reminders.map((reminder) => reminder.reminderOffsetHours)).toEqual([24, 2]);
    expect(reminders.map((reminder) => reminder.status)).toEqual(['Pending', 'Pending']);
    expect(reminders[0].scheduledTime.getTime()).toBe(pickupDateTime.getTime() - 24 * 60 * 60 * 1000);
    expect(reminders[1].scheduledTime.getTime()).toBe(pickupDateTime.getTime() - 2 * 60 * 60 * 1000);
  });
});
