import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemConfig extends Document {
  key: string;
  depositPercent: number;              // UC-114: Default deposit % (default 30)
  cancelFreeHours: number;             // UC-113: Free cancellation if > hours (default 24)
  cancelPartialRefundPercent: number;  // UC-113: Refund % if < cancelFreeHours (default 50)
  lateFeePerHour: number;              // UC-113: Late return fee per hour (default 30000)
  loyaltySpendPerPoint: number;        // UC-115: VND spent per loyalty point (default 10000)
  loyaltyPointValueVnd: number;        // UC-115: VND discount per loyalty point redeemed (default 1000)
  minPointsToRedeem: number;           // UC-115: Minimum points to redeem (default 50)
  supportHotline: string;
  supportEmail: string;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SystemConfigSchema = new Schema<ISystemConfig>(
  {
    key: { type: String, required: true, unique: true, default: 'GLOBAL_CONFIG' },
    depositPercent: { type: Number, required: true, default: 30, min: 10, max: 100 },
    cancelFreeHours: { type: Number, required: true, default: 24, min: 1 },
    cancelPartialRefundPercent: { type: Number, required: true, default: 50, min: 0, max: 100 },
    lateFeePerHour: { type: Number, required: true, default: 30000, min: 0 },
    loyaltySpendPerPoint: { type: Number, required: true, default: 10000, min: 1000 },
    loyaltyPointValueVnd: { type: Number, required: true, default: 1000, min: 100 },
    minPointsToRedeem: { type: Number, required: true, default: 50, min: 10 },
    supportHotline: { type: String, default: '1900 6868' },
    supportEmail: { type: String, default: 'support@motorent.vn' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const SystemConfig = mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);
