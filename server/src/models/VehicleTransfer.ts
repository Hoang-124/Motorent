import mongoose, { Document, Schema } from 'mongoose';

export type TransferStatus = 'Pending' | 'Approved' | 'InTransit' | 'Completed' | 'Rejected';

export interface IVehicleTransfer extends Document {
  vehicleId: mongoose.Types.ObjectId;
  fromBranchId: mongoose.Types.ObjectId;
  toBranchId: mongoose.Types.ObjectId;
  transferReason: string;
  requestedBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  status: TransferStatus;
  departureTime?: Date;
  arrivalTime?: Date;
  notes?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleTransferSchema = new Schema<IVehicleTransfer>(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    fromBranchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    toBranchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    transferReason: { type: String, required: true, trim: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'InTransit', 'Completed', 'Rejected'],
      default: 'Pending',
    },
    departureTime: { type: Date },
    arrivalTime: { type: Date },
    notes: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
  },
  { timestamps: true }
);

VehicleTransferSchema.index({ fromBranchId: 1, toBranchId: 1, status: 1 });
VehicleTransferSchema.index({ vehicleId: 1 });

export const VehicleTransfer = mongoose.model<IVehicleTransfer>(
  'VehicleTransfer',
  VehicleTransferSchema
);
