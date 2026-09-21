import mongoose, { Document, Schema } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  code: string;
  address: string;
  phone: string;
  email?: string;
  location_lng?: number;
  location_lat?: number;
  hours_open: string;
  hours_close: string;
  managerId?: mongoose.Types.ObjectId;
  isActive: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    location_lng: { type: Number },
    location_lat: { type: Number },
    hours_open: { type: String, default: '08:00' },
    hours_close: { type: String, default: '22:00' },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

BranchSchema.index({ location_lng: 1, location_lat: 1 });

export const Branch = mongoose.model<IBranch>('Branch', BranchSchema);
