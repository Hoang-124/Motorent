import crypto from 'crypto';
import mongoose from 'mongoose';
import { AppError } from '../../core/errorHandler';
import { Discount } from '../../models/Discount';
import { Notification } from '../../models/Notification';
import { User } from '../../models/User';

const POINTS_PER_VOUCHER = 100;
const VND_PER_POINT = 100;
const REFERRAL_BONUS_POINTS = 100;

export const generateReferralCode = (): string => `MOTO${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

const ensureReferralCode = async (userId: mongoose.Types.ObjectId): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const user = await User.findById(userId).select('referralCode');
    if (!user) throw new AppError(404, 'Tài khoản không tồn tại.');
    if (user.referralCode) return user.referralCode;

    try {
      const updated = await User.findOneAndUpdate(
        { _id: userId, $or: [{ referralCode: { $exists: false } }, { referralCode: null }] },
        { $set: { referralCode: generateReferralCode() } },
        { new: true }
      ).select('referralCode');
      if (updated?.referralCode) return updated.referralCode;
    } catch (error) {
      if (!(error instanceof mongoose.mongo.MongoServerError) || error.code !== 11000) throw error;
    }
  }

  throw new AppError(503, 'Không thể cấp mã giới thiệu lúc này. Vui lòng thử lại.');
};

export const getLoyaltySummary = async (userId: string) => {
  if (!mongoose.isValidObjectId(userId)) throw new AppError(400, 'Tài khoản không hợp lệ.');
  const user = await User.findById(userId).select('loyaltyPoints referralCode promoSubscribed');
  if (!user) throw new AppError(404, 'Tài khoản không tồn tại.');

  const referralCode = await ensureReferralCode(user._id);
  const [referrals, vouchers] = await Promise.all([
    User.find({ referredBy: user._id })
      .select('username referralRewarded createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    Discount.find({ ownerUserId: user._id, isLoyaltyVoucher: true })
      .select('code fixedDiscountAmount redemptionPoints startDate endDate usedCount usageLimit isActive createdAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);

  return {
    points: user.loyaltyPoints,
    referralCode,
    promoSubscribed: user.promoSubscribed,
    referralBonusPoints: REFERRAL_BONUS_POINTS,
    referrals,
    vouchers,
  };
};

export const redeemPoints = async (userId: string, points: number) => {
  if (!Number.isSafeInteger(points) || points < POINTS_PER_VOUCHER || points % POINTS_PER_VOUCHER !== 0) {
    throw new AppError(400, `Số điểm đổi phải là bội số của ${POINTS_PER_VOUCHER} điểm trở lên.`);
  }

  if (!mongoose.isValidObjectId(userId)) throw new AppError(400, 'Tài khoản không hợp lệ.');
  const ownerId = new mongoose.Types.ObjectId(userId);
  const discountAmount = points * VND_PER_POINT;
  const voucherCode = `LOYALTY-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

  const voucher = await Discount.create({
    code: voucherCode,
    description: `Voucher đổi ${points} điểm thành ${discountAmount.toLocaleString('vi-VN')} VND`,
    discountPercent: 100,
    maxDiscountAmount: discountAmount,
    fixedDiscountAmount: discountAmount,
    ownerUserId: ownerId,
    isLoyaltyVoucher: true,
    redemptionPoints: points,
    minBookingAmount: 0,
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    usageLimit: 1,
    usedCount: 0,
    isActive: true,
  });

  const updatedUser = await User.findOneAndUpdate(
    { _id: ownerId, loyaltyPoints: { $gte: points } },
    { $inc: { loyaltyPoints: -points } },
    { new: true }
  ).select('loyaltyPoints');

  if (!updatedUser) {
    await Discount.deleteOne({ _id: voucher._id });
    throw new AppError(409, 'Số điểm hiện có không đủ để đổi voucher.');
  }

  return {
    code: voucher.code,
    pointsSpent: points,
    discountAmount,
    expiresAt: voucher.endDate,
    remainingPoints: updatedUser.loyaltyPoints,
  };
};

export const rewardReferralOnFirstCompletedBooking = async (referredUserId: mongoose.Types.ObjectId) => {
  const referredUser = await User.findOneAndUpdate(
    {
      _id: referredUserId,
      referredBy: { $exists: true, $ne: null },
      referralRewarded: false,
    },
    {
      $set: { referralRewarded: true },
      $inc: { loyaltyPoints: REFERRAL_BONUS_POINTS },
    },
    { new: true }
  ).select('referredBy username');

  if (!referredUser?.referredBy) return false;

  try {
    const referrer = await User.findByIdAndUpdate(
      referredUser.referredBy,
      { $inc: { loyaltyPoints: REFERRAL_BONUS_POINTS } },
      { new: true }
    ).select('_id');
    if (!referrer) throw new Error(`Referrer ${referredUser.referredBy.toString()} no longer exists.`);

  } catch (error) {
    const rollback = await User.updateOne(
      { _id: referredUserId, referralRewarded: true },
      {
        $set: { referralRewarded: false },
        $inc: { loyaltyPoints: -REFERRAL_BONUS_POINTS },
      }
    );
    if (rollback.modifiedCount !== 1) {
      console.error('[Loyalty] Could not roll back referral award after a failed credit:', error);
    }
    throw error;
  }

  try {
    await Notification.insertMany([
      {
        userId: referredUserId,
        title: 'Bạn nhận được điểm thưởng giới thiệu',
        body: `Bạn được cộng ${REFERRAL_BONUS_POINTS} điểm sau chuyến thuê xe hoàn tất đầu tiên.`,
        type: 'PROMO',
        isRead: false,
      },
      {
        userId: referredUser.referredBy,
        title: 'Bạn nhận được điểm thưởng giới thiệu',
        body: `Người được bạn giới thiệu đã hoàn tất chuyến thuê xe đầu tiên. Bạn được cộng ${REFERRAL_BONUS_POINTS} điểm.`,
        type: 'PROMO',
        isRead: false,
      },
    ]);
  } catch (error) {
    console.error('[Loyalty] Referral points were awarded, but notification delivery failed:', error);
  }
  return true;
};
