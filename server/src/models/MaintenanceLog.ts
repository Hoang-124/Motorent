import mongoose, { Document, Schema } from 'mongoose';

export type MaintenanceType = 'Routine' | 'Repair' | 'Inspection';
export type MaintenanceStatus = 'Scheduled' | 'InProgress' | 'Completed';

export interface IMaintenanceLog extends Document {
  vehicleId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  maintenanceType: MaintenanceType;
  description: string;
  cost: number;
  startDate?: Date;
  endDate?: Date;
  performedBy?: string;
  odometerAtMaintenance: number;
  status: MaintenanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceLogSchema = new Schema<IMaintenanceLog>(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    maintenanceType: {
      type: String,
      enum: ['Routine', 'Repair', 'Inspection'],
      default: 'Routine',
    },
    description: { type: String, required: true, trim: true },
    cost: { type: Number, default: 0 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    performedBy: { type: String, trim: true },
    odometerAtMaintenance: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Scheduled', 'InProgress', 'Completed'],
      default: 'Scheduled',
    },
  },
  { timestamps: true }
);

MaintenanceLogSchema.index({ vehicleId: 1, status: 1 });
MaintenanceLogSchema.index({ branchId: 1 });

export const MaintenanceLog = mongoose.model<IMaintenanceLog>(
  'MaintenanceLog',
  MaintenanceLogSchema
);
