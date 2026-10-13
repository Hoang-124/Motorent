import mongoose, { Document, Schema } from 'mongoose';

export interface IBanner extends Document {
  title: string;
  imageUrl: string;
  linkUrl?: string;
  position: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema = new Schema<IBanner>(
  {
    title: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true },
    linkUrl: { type: String, default: '' },
    position: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BannerSchema.index({ position: 1, isActive: 1 });

export const Banner = mongoose.model<IBanner>('Banner', BannerSchema);
