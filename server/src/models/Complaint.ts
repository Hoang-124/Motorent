import mongoose, { Document, Schema } from 'mongoose';

export type ComplaintCategory = 'Vehicle' | 'Service' | 'Payment' | 'Staff' | 'Other';
export type ComplaintStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';

export interface IComplaint extends Document {
  id: string;
  code: string;
  customerId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId | null;
  branchId?: mongoose.Types.ObjectId | null;
  category: ComplaintCategory | string;
  title?: string;
  description: string;
  attachments: string[];
  status: ComplaintStatus;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  finalResolution: string | null;
  resolutionNotes?: string;
  handledBy: mongoose.Types.ObjectId | null;
  resolvedBy: mongoose.Types.ObjectId | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IComplaintResponse extends Document {
  id: string;
  complaintId: mongoose.Types.ObjectId;
  authorId?: mongoose.Types.ObjectId;
  respondedBy?: mongoose.Types.ObjectId;
  authorRole?: string;
  message?: string;
  content?: string;
  attachments?: string[];
  createdAt: Date;
}

export interface IComplaintStatusLog extends Document {
  id: string;
  complaintId: mongoose.Types.ObjectId;
  fromStatus?: ComplaintStatus | string | null;
  previousStatus?: ComplaintStatus | string | null;
  toStatus: ComplaintStatus | string;
  newStatus?: ComplaintStatus | string;
  changedBy: mongoose.Types.ObjectId;
  changedByRole?: string;
  note?: string;
  createdAt: Date;
}

const ComplaintSchema = new Schema<IComplaint>(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    category: {
      type: String,
      required: true,
      enum: ['Vehicle', 'Service', 'Payment', 'Staff', 'Other'],
      trim: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },
    attachments: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['Open', 'InProgress', 'Resolved', 'Closed'],
      default: 'Open',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    finalResolution: {
      type: String,
      default: null,
      trim: true,
    },
    resolutionNotes: {
      type: String,
      default: '',
      trim: true,
    },
    handledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    closedAt: {
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

// Indexes
ComplaintSchema.index({ customerId: 1, status: 1, createdAt: -1 });
ComplaintSchema.index({ status: 1, category: 1, createdAt: -1 });
ComplaintSchema.index({ code: 1 }, { unique: true });

const ComplaintResponseSchema = new Schema<IComplaintResponse>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    authorRole: {
      type: String,
      default: 'Staff',
    },
    message: {
      type: String,
      default: '',
      trim: true,
    },
    content: {
      type: String,
      default: '',
      trim: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId)?.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

const ComplaintStatusLogSchema = new Schema<IComplaintStatusLog>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      index: true,
    },
    fromStatus: {
      type: String,
      default: null,
    },
    previousStatus: {
      type: String,
      default: null,
    },
    toStatus: {
      type: String,
      default: 'Open',
    },
    newStatus: {
      type: String,
      default: 'Open',
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changedByRole: {
      type: String,
      default: 'Staff',
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId)?.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Complaint =
  mongoose.models.Complaint || mongoose.model<IComplaint>('Complaint', ComplaintSchema);
export const ComplaintResponse =
  mongoose.models.ComplaintResponse ||
  mongoose.model<IComplaintResponse>('ComplaintResponse', ComplaintResponseSchema);
export const ComplaintStatusLog =
  mongoose.models.ComplaintStatusLog ||
  mongoose.model<IComplaintStatusLog>('ComplaintStatusLog', ComplaintStatusLogSchema);
