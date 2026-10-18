import mongoose, { Document, Schema } from 'mongoose';

export type BookingStatus =
  | 'Pending'
  | 'Approved'
  | 'Confirmed'
  | 'Ongoing'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected';

export interface IBooking extends Document {
  bookingCode: string;
  userId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  pickupBranchId: mongoose.Types.ObjectId;
  returnBranchId: mongoose.Types.ObjectId;
  pickupDateTime: Date;
  returnDateTime: Date;
  actualReturnDateTime?: Date;
  totalAmount: number;
  depositAmount: number;
  remainingAmount: number;
  discountId?: mongoose.Types.ObjectId;
  discountAmount: number;
  lateFee: number;
  damageFee: number;
  loyaltyPointsEarned: number;
  status: BookingStatus;
  paymentMethod: 'Banking' | 'Cash';
  isPaid: boolean;
  depositPaid: boolean;
  paidAmount: number;
  lastTxnRef?: string;
  settlementAmount?: number;
  counterPaidBy?: mongoose.Types.ObjectId;
  counterPaidAt?: Date;
  loyaltyAwarded?: boolean;
  paymentType?: 'Deposit30' | 'Full100';
  paymentExpiresAt?: Date;
  vnpayTransactionNo?: string;
  vnpayBankCode?: string;
  vnpayPayDate?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  eSignatureUrl?: string;
  startOdometer: number;
  endOdometer?: number;
  startFuelLevel?: string;
  endFuelLevel?: string;
  checkinImages?: string[];
  checkoutImages?: string[];
  cancelReason?: string;
  rejectReason?: string;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  refundAmount?: number;
  refundStatus?: 'Pending' | 'Approved' | 'Rejected' | 'None';
  refundForfeitAmount?: number;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    bookingCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    pickupBranchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    returnBranchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    pickupDateTime: { type: Date, required: true },
    returnDateTime: { type: Date, required: true },
    actualReturnDateTime: { type: Date },
    totalAmount: { type: Number, required: true },
    depositAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    discountId: { type: Schema.Types.ObjectId, ref: 'Discount' },
    discountAmount: { type: Number, default: 0 },
    lateFee: { type: Number, default: 0 },
    damageFee: { type: Number, default: 0 },
    loyaltyPointsEarned: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Confirmed', 'Ongoing', 'Completed', 'Cancelled', 'Rejected'],
      default: 'Pending',
    },
    paymentMethod: { type: String, enum: ['Banking', 'Cash'], default: 'Banking' },
    isPaid: { type: Boolean, default: false },
    depositPaid: { type: Boolean, default: false },
    paidAmount: { type: Number, default: 0 },
    lastTxnRef: { type: String, trim: true },
    settlementAmount: { type: Number, default: 0 },
    counterPaidBy: { type: Schema.Types.ObjectId, ref: 'User' },
    counterPaidAt: { type: Date },
    loyaltyAwarded: { type: Boolean, default: false },
    paymentType: { type: String, enum: ['Deposit30', 'Full100'], default: 'Deposit30' },
    paymentExpiresAt: { type: Date },
    vnpayTransactionNo: { type: String, default: '' },
    vnpayBankCode: { type: String, default: '' },
    vnpayPayDate: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    eSignatureUrl: { type: String, default: '' },
    startOdometer: { type: Number, default: 0 },
    endOdometer: { type: Number },
    startFuelLevel: { type: String, default: '100%' },
    endFuelLevel: { type: String },
    checkinImages: [{ type: String }],
    checkoutImages: [{ type: String }],
    cancelReason: { type: String, default: '' },
    rejectReason: { type: String, default: '' },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date },
    refundAmount: { type: Number, default: 0 },
    refundStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'None'],
      default: 'None',
    },
    refundForfeitAmount: { type: Number, default: 0 },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

BookingSchema.index({ userId: 1, status: 1 });
BookingSchema.index({ vehicleId: 1, pickupDateTime: 1, returnDateTime: 1, status: 1 });

export const Booking = mongoose.model<IBooking>('Booking', BookingSchema);
