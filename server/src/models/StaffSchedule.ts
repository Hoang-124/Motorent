import mongoose, { Document, Schema } from 'mongoose';

export type ShiftType = 'Morning' | 'Afternoon' | 'Evening' | 'FullDay';
export type ShiftStatus = 'Assigned' | 'Present' | 'Absent' | 'OnLeave';

export interface IStaffSchedule extends Document {
  staffId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  shiftDate: Date;
  shiftType: ShiftType;
  checkInTime?: Date;
  checkOutTime?: Date;
  status: ShiftStatus;
  assignedBy?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StaffScheduleSchema = new Schema<IStaffSchedule>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    shiftDate: { type: Date, required: true },
    shiftType: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Evening', 'FullDay'],
      default: 'Morning',
    },
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    status: {
      type: String,
      enum: ['Assigned', 'Present', 'Absent', 'OnLeave'],
      default: 'Assigned',
    },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

StaffScheduleSchema.index({ staffId: 1, shiftDate: 1 });
StaffScheduleSchema.index({ branchId: 1, shiftDate: 1 });

export const StaffSchedule = mongoose.model<IStaffSchedule>(
  'StaffSchedule',
  StaffScheduleSchema
);
