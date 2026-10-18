import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  bookingId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  photos: string[];
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true, // 1 Booking chỉ có 1 Review duy nhất (kể cả bản ghi đã soft-delete)
    },
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    photos: {
      type: [String],
      default: [],
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

ReviewSchema.index({ vehicleId: 1, deletedAt: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
