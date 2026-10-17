import mongoose, { Document, Schema } from 'mongoose';

export interface ISeasonalPricingRule extends Document {
  vehicleId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  name: string;
  /** Inclusive Vietnam calendar dates, YYYY-MM-DD. */
  startDate: string;
  endDate: string;
  multiplier: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ISeasonalPricingRule>({
  vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  multiplier: { type: Number, required: true, min: 0.01, max: 10 },
}, { timestamps: true });

schema.index({ vehicleId: 1, startDate: 1, endDate: 1 });

export const SeasonalPricingRule = mongoose.model<ISeasonalPricingRule>('SeasonalPricingRule', schema);
