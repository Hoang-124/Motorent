export interface Branch {
  _id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email?: string;
  location_lng?: number;
  location_lat?: number;
  hours_open: string;
  hours_close: string;
  isActive: boolean;
  description?: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Vehicle {
  _id: string;
  branchId: string | Branch;
  category: string | Category;
  vehicleModel: string;
  brand: string;
  licensePlate: string;
  odometer: number;
  dailyPrice: number;
  hourlyPrice?: number;
  status: 'Available' | 'Rented' | 'Maintenance' | 'Transferring';
  transmissionType: 'Automatic' | 'Manual' | 'Semi-Auto';
  fuelType: 'Gasoline' | 'Electric';
  yearManufactured?: number;
  color?: string;
  requiresMaintenance: boolean;
  images: string[];
  ratingAverage?: number;
  reviewCount?: number;
}

export interface User {
  _id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  roles: 'SystemAdmin' | 'BranchManager' | 'Staff' | 'Customer';
  status: 'Active' | 'Suspended' | 'Unverified';
  branchId?: string | Branch;
  identityStatus: 'Unverified' | 'Pending' | 'Verified' | 'Rejected';
  loyaltyPoints: number;
  referralCode?: string;
  drivingLicenseUrl?: string;
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  isEmailVerified?: boolean;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string;
  createdAt?: string;
}

export interface Booking {
  _id: string;
  bookingCode: string;
  userId: string | User;
  vehicleId: string | Vehicle;
  pickupBranchId: string | Branch;
  returnBranchId: string | Branch;
  pickupDateTime: string;
  returnDateTime: string;
  actualReturnDateTime?: string;
  totalAmount: number;
  depositAmount: number;
  remainingAmount: number;
  discountId?: string;
  discountAmount: number;
  lateFee: number;
  damageFee: number;
  loyaltyPointsEarned: number;
  status: 'Pending' | 'Approved' | 'Confirmed' | 'Ongoing' | 'Completed' | 'Cancelled' | 'Rejected';
  paymentMethod: 'Banking' | 'Cash';
  isPaid: boolean;
  eSignatureUrl?: string;
  startOdometer: number;
  endOdometer?: number;
}

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  body: string;
  type: 'SYSTEM' | 'BOOKING' | 'REMINDER' | 'PROMO' | 'MAINTENANCE' | 'TRANSFER';
  relatedId?: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface Feedback {
  _id: string;
  bookingId?: string;
  userId: string | User;
  vehicleId?: string | Vehicle;
  rating: number;
  comment: string;
  isPublic: boolean;
  responseComment?: string;
  createdAt: string;
}

export interface VehicleReview {
  _id: string;
  userId: string | Pick<User, '_id' | 'username' | 'firstName' | 'lastName' | 'avatarUrl'>;
  rating: number;
  comment: string;
  imageUrls?: string[];
  response?: string;
  createdAt: string;
}

