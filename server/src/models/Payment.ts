import mongoose, { Document, Schema } from 'mongoose';

export type PaymentType = 'DEPOSIT' | 'FULL' | 'COUNTER' | 'REFUND';
export type PaymentStatus = 'SUCCESS' | 'FAILED' | 'PENDING';

export interface IPayment extends Document {
  bookingId: mongoose.Types.ObjectId;
  txnRef: string;
  vnpTransactionNo?: string;
  amount: number; // Integer VND
  type: PaymentType;
  status: PaymentStatus;
  rawIpn?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    txnRef: { type: String, required: true, trim: true },
    vnpTransactionNo: { type: String, trim: true },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ['DEPOSIT', 'FULL', 'COUNTER', 'REFUND'],
      required: true,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'PENDING'],
      required: true,
    },
    rawIpn: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Indexes
PaymentSchema.index({ vnpTransactionNo: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ bookingId: 1 });
PaymentSchema.index({ txnRef: 1 });
PaymentSchema.index({ createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
