import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'SystemAdmin' | 'BranchManager' | 'Staff' | 'Customer';
export type UserStatus = 'Active' | 'Suspended' | 'Unverified';
export type IdentityStatus = 'Unverified' | 'Pending' | 'Verified' | 'Rejected';

export interface IUser extends Document {
  username: string;
  email?: string;
  passwordHash?: string;
  googleId?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: Date;
  roles: UserRole;
  status: UserStatus;
  branchId?: mongoose.Types.ObjectId;
  strikes: number;
  identityStatus: IdentityStatus;
  loyaltyPoints: number;
  referralCode?: string;
  drivingLicenseUrl?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    passwordHash: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    avatarUrl: { type: String, default: '' },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Other' },
    dob: { type: Date },
    roles: {
      type: String,
      enum: ['SystemAdmin', 'BranchManager', 'Staff', 'Customer'],
      default: 'Customer',
    },
    status: {
      type: String,
      enum: ['Active', 'Suspended', 'Unverified'],
      default: 'Active',
    },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    strikes: { type: Number, default: 0 },
    identityStatus: {
      type: String,
      enum: ['Unverified', 'Pending', 'Verified', 'Rejected'],
      default: 'Unverified',
    },
    loyaltyPoints: { type: Number, default: 0 },
    referralCode: { type: String, unique: true, sparse: true },
    drivingLicenseUrl: { type: String, default: '' },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, index: true },
    emailVerificationExpires: { type: Date },
    resetPasswordToken: { type: String, index: true },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ roles: 1 });
UserSchema.index({ branchId: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
