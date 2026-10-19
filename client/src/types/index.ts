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
  managerId?: string | User;
  isActive: boolean;
  description?: string;
  availableVehiclesCount?: number;
  totalVehiclesCount?: number;
  distanceKm?: number;
  createdAt?: string;
  updatedAt?: string;
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
  ekycRejectionReason?: string;
  loyaltyPoints: number;
  referralCode?: string;
  drivingLicenseUrl?: string;
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  selfieUrl?: string;
  ekycWatermarked?: boolean;
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
  depositPaid?: boolean;
  paidAmount?: number;
  counterPaidAt?: string;
  counterPaidBy?: string | User;
  eSignatureUrl?: string;
  startOdometer: number;
  endOdometer?: number;
  cancelReason?: string;
  refundAmount?: number;
  refundStatus?: 'Pending' | 'Approved' | 'Rejected' | 'None';
  refundForfeitAmount?: number;
  cancelledAt?: string;
  createdAt?: string;
  updatedAt?: string;
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

export interface ChatSender {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  email?: string;
  roles?: 'SystemAdmin' | 'BranchManager' | 'Staff' | 'Customer';
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: string | ChatSender;
  clientMsgId?: string;
  content: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatConversation {
  _id: string;
  participants: string[];
  customerId: string | ChatSender;
  assignedStaffId?: string | ChatSender;
  branchId?: string | Branch;
  status: 'Open' | 'Closed';
  lastMessageId?: string;
  lastMessageText?: string;
  lastMessageAt?: string;
  unreadCustomerCount: number;
  unreadStaffCount: number;
  closedAt?: string;
  closedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  _id: string;
  userId?: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    roles?: string;
    avatarUrl?: string;
  } | null;
  action: string;
  entity: string;
  entityId?: string;
  method?: string;
  path?: string;
  changes?: Record<string, unknown>;
  details?: Record<string, unknown>;
  status: 'SUCCESS' | 'FAILED';
  statusCode: number;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export type StaticPageType = 'FAQ' | 'Terms' | 'Privacy' | 'Other';

export interface StaticPage {
  _id: string;
  title: string;
  slug: string;
  content: string;
  type: StaticPageType;
  isPublished: boolean;
  updatedBy?: {
    _id: string;
    username: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  } | string;
  createdAt: string;
  updatedAt: string;
}
