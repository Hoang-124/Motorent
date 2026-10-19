import mongoose, { Document, Schema } from 'mongoose';

export interface IBanner extends Document {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl: string | null;
  order: number;
  position?: number;
  isActive: boolean;
  deletedAt: Date | null;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema = new Schema<IBanner>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    subtitle: {
      type: String,
      default: '',
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    linkUrl: {
      type: String,
      default: null,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId)?.toString();
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId)?.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Backward compatibility alias for position
BannerSchema.virtual('position')
  .get(function () {
    return this.order;
  })
  .set(function (val: number) {
    this.order = val;
  });

// Virtual for soft delete flag isDeleted
BannerSchema.virtual('isDeleted')
  .get(function () {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  })
  .set(function (val: boolean) {
    if (val) {
      this.deletedAt = new Date();
    } else {
      this.deletedAt = null;
    }
  });

BannerSchema.index({ deletedAt: 1, isActive: 1, order: 1 });

export const Banner = mongoose.model<IBanner>('Banner', BannerSchema);

