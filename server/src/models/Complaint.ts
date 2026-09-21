import mongoose, { Document, Schema } from 'mongoose';

export type ComplaintStatus = 'Pending' | 'Investigating' | 'Resolved' | 'Rejected';
export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface IComplaint extends Document {
  customerId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  resolutionNotes?: string;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema = new Schema<IComplaint>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['Pending', 'Investigating', 'Resolved', 'Rejected'],
      default: 'Pending',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    resolutionNotes: { type: String, default: '' },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

ComplaintSchema.index({ customerId: 1, status: 1 });
ComplaintSchema.index({ branchId: 1 });

export const Complaint = mongoose.model<IComplaint>('Complaint', ComplaintSchema);
