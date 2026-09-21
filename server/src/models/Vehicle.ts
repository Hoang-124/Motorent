import mongoose, { Document, Schema } from 'mongoose';

export type VehicleStatus = 'Available' | 'Rented' | 'Maintenance' | 'Transferring';
export type TransmissionType = 'Automatic' | 'Manual' | 'Semi-Auto';
export type FuelType = 'Gasoline' | 'Electric';

export interface IVehicle extends Document {
  branchId: mongoose.Types.ObjectId;
  category: mongoose.Types.ObjectId;
  vehicleModel: string;
  brand: string;
  licensePlate: string;
  odometer: number;
  dailyPrice: number;
  hourlyPrice?: number;
  status: VehicleStatus;
  transmissionType: TransmissionType;
  fuelType: FuelType;
  yearManufactured?: number;
  requiresMaintenance: boolean;
  isDeleted: boolean;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    vehicleModel: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    licensePlate: { type: String, required: true, unique: true, uppercase: true, trim: true },
    odometer: { type: Number, default: 0 },
    dailyPrice: { type: Number, required: true },
    hourlyPrice: { type: Number },
    status: {
      type: String,
      enum: ['Available', 'Rented', 'Maintenance', 'Transferring'],
      default: 'Available',
    },
    transmissionType: {
      type: String,
      enum: ['Automatic', 'Manual', 'Semi-Auto'],
      default: 'Automatic',
    },
    fuelType: {
      type: String,
      enum: ['Gasoline', 'Electric'],
      default: 'Gasoline',
    },
    yearManufactured: { type: Number },
    requiresMaintenance: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    images: [{ type: String }],
  },
  { timestamps: true }
);

VehicleSchema.index({ branchId: 1, status: 1 });
VehicleSchema.index({ category: 1 });

export const Vehicle = mongoose.model<IVehicle>('Vehicle', VehicleSchema);
