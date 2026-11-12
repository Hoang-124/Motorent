import mongoose, { Document, Schema } from 'mongoose';
import { ShiftType } from './StaffSchedule';

export interface IStaffAvailabilitySlot {
  dayOfWeek: number; // 1 (Thứ 2) -> 7 (Chủ Nhật)
  dateKey: string; // YYYY-MM-DD
  availableShifts: ShiftType[]; // e.g. ['Morning', 'Afternoon'] (1, 2, 3)
  busyShifts: ShiftType[]; // e.g. ['Evening']
  isAllDayBusy: boolean;
  notes?: string;
}

export interface IStaffAvailability extends Document {
  staffId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  weekStartDate: Date; // Monday 00:00:00
  rawMessage: string; // Original text: "t2 2 3, t3 1 3, t4 1 2, t5 bận, t6 1, cn 2 3"
  slots: IStaffAvailabilitySlot[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StaffAvailabilitySchema = new Schema<IStaffAvailability>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    weekStartDate: { type: Date, required: true },
    rawMessage: { type: String, default: '' },
    slots: [
      {
        dayOfWeek: { type: Number, required: true },
        dateKey: { type: String, required: true },
        availableShifts: [{ type: String, enum: ['Morning', 'Afternoon', 'Evening'] }],
        busyShifts: [{ type: String, enum: ['Morning', 'Afternoon', 'Evening'] }],
        isAllDayBusy: { type: Boolean, default: false },
        notes: { type: String, default: '' },
      },
    ],
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

StaffAvailabilitySchema.index({ staffId: 1, weekStartDate: 1 }, { unique: true });
StaffAvailabilitySchema.index({ branchId: 1, weekStartDate: 1 });

export const StaffAvailability = mongoose.model<IStaffAvailability>(
  'StaffAvailability',
  StaffAvailabilitySchema
);
