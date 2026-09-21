import mongoose, { Document, Schema } from 'mongoose';

export interface IStaticPage extends Document {
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StaticPageSchema = new Schema<IStaticPage>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    isPublished: { type: Boolean, default: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const StaticPage = mongoose.model<IStaticPage>('StaticPage', StaticPageSchema);
