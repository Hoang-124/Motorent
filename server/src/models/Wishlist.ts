import mongoose, { Document, Schema } from 'mongoose';

export interface IWishlist extends Document {
  userId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const WishlistSchema = new Schema<IWishlist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

// Unique constraint: Mỗi user chỉ thích 1 xe tối đa 1 lần
WishlistSchema.index({ userId: 1, vehicleId: 1 }, { unique: true });

// Sắp xếp mới thêm trước theo user
WishlistSchema.index({ userId: 1, createdAt: -1 });

export const Wishlist = mongoose.model<IWishlist>('Wishlist', WishlistSchema);
