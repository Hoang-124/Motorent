import mongoose, { Document, Schema } from 'mongoose';

export type PageType = 'FAQ' | 'Terms' | 'Privacy' | 'Other';

export interface IStaticPage extends Document {
  slug: string;
  title: string;
  content: string;
  type: PageType;
  isPublished: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StaticPageSchema = new Schema<IStaticPage>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ['FAQ', 'Terms', 'Privacy', 'Other'],
      default: 'Other',
      index: true,
    },
    isPublished: { type: Boolean, default: false, index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const StaticPage = mongoose.model<IStaticPage>('StaticPage', StaticPageSchema);

