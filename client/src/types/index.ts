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
  averageRating?: number;
  ratingAverage?: number;
  reviewCount?: number;
}

export interface VehicleReview {
  _id: string;
  userId: string | {
    _id?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  rating: number;
  comment?: string;
  imageUrls?: string[];
  response?: string;
  createdAt: string;
}

export interface User {
  _id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  idCardNumber?: string;
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
  updatedAt?: string;
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
  checkinImages?: string[];
  checkoutImages?: string[];
  receiverName?: string;
  receiverPhone?: string;
  receiverIdCard?: string;
  verifiedAtCounter?: boolean;
  cancelReason?: string;
  rejectReason?: string;
  refundAmount?: number;
  refundStatus?: 'Pending' | 'Approved' | 'Rejected' | 'None';
  refundForfeitAmount?: number;
  cancelledAt?: string;
  refundBankInfo?: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
    reason?: string;
    requestedAt?: string;
  };
  extensionCount?: number;
  lastExtendedAt?: string;
  originalReturnDateTime?: string;
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

export interface Banner {
  _id?: string;
  id?: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string | null;
  order: number;
  position?: number;
  isActive: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
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

export interface WishlistItem {
  _id: string;
  vehicleId: string;
  vehicle: Vehicle | null;
  isAvailable: boolean;
  createdAt: string;
}

export interface WishlistResponse {
  items: WishlistItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReviewUser {
  _id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Review {
  _id: string;
  bookingId: string | Booking;
  userId: string | ReviewUser | User;
  vehicleId: string | Vehicle;
  rating: number;
  comment?: string;
  photos: string[];
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: ReviewUser;
}

export interface VehicleReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  vehicleStats: {
    averageRating: number;
    reviewCount: number;
    starBreakdown: Record<number, number>;
  };
}

// UC-42 & UC-43: Complaint Tracking Types
export type ComplaintStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';

export interface ComplaintBookingSummary {
  _id: string;
  bookingCode: string;
  vehicle: string;
  pickupDateTime?: string;
  returnDateTime?: string;
}

export interface ComplaintTimelineActor {
  name: string;
  role: string;
}

export interface ComplaintTimelineItem {
  type: 'status' | 'response';
  content: string;
  createdAt: string;
  performedBy: ComplaintTimelineActor;
  user?: ComplaintTimelineActor;
  status?: ComplaintStatus;
  previousStatus?: ComplaintStatus | null;
}

export interface Complaint {
  _id: string;
  id?: string;
  code: string;
  category: string;
  title?: string;
  description: string;
  attachments: string[];
  status: ComplaintStatus;
  booking?: ComplaintBookingSummary | null;
  finalResolution?: string | null;
  createdAt: string;
  closedAt?: string | null;
  updatedAt?: string;
  timeline?: ComplaintTimelineItem[];
}

export interface ComplaintListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: Complaint[];
}

// UC-65 & UC-85: Staff & Manager Complaint Handling Types
export interface StaffComplaintCustomer {
  _id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  roles?: string;
}

export interface StaffComplaintBooking {
  _id: string;
  bookingCode?: string;
  pickupDateTime?: string;
  returnDateTime?: string;
  status?: string;
  totalAmount?: number;
  vehicleId?: {
    _id: string;
    vehicleModel?: string;
    licensePlate?: string;
    brand?: string;
    color?: string;
  } | string;
}

export interface StaffComplaintHandledBy {
  _id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  roles?: string;
}

export interface StaffComplaint {
  _id: string;
  id?: string;
  code: string;
  category: string;
  title?: string;
  description: string;
  attachments: string[];
  status: ComplaintStatus;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  customerId: StaffComplaintCustomer;
  bookingId?: StaffComplaintBooking | null;
  handledBy?: StaffComplaintHandledBy | null;
  resolvedBy?: StaffComplaintHandledBy | null;
  branchId?: {
    _id: string;
    name?: string;
    address?: string;
    code?: string;
  } | null;
  finalResolution?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  timeline?: ComplaintTimelineItem[];
  allowedTransitions?: ComplaintStatus[];
}

export interface StaffComplaintQueueResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: StaffComplaint[];
}

export interface ManagerPendingComplaintsResponse {
  success: boolean;
  data: StaffComplaint[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==========================================
// HR Shift Scheduling & Attendance Types (UC-84)
// ==========================================
export type ShiftType = 'Morning' | 'Afternoon' | 'Evening' | 'FullDay';
export type ShiftStatus = 'Assigned' | 'Present' | 'Absent' | 'Cancelled';

export interface StaffSchedule {
  _id: string;
  staffId: User;
  branchId: Branch;
  shiftDate: string;
  shiftType: ShiftType;
  status: ShiftStatus;
  checkInTime?: string;
  checkOutTime?: string;
  assignedBy?: User;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Voucher / Discount Types (UC-110 - UC-112)
// ==========================================
export interface Discount {
  _id: string;
  code: string;
  description?: string;
  discountPercent: number;
  maxDiscountAmount?: number;
  minBookingAmount?: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// System Policies & Config Types (UC-113 - UC-115)
// ==========================================
export interface SystemConfig {
  _id: string;
  key: string;
  depositPercent: number;
  cancelFreeHours: number;
  cancelPartialRefundPercent: number;
  lateFeePerHour: number;
  loyaltySpendPerPoint: number;
  loyaltyPointValueVnd: number;
  minPointsToRedeem: number;
  supportHotline: string;
  supportEmail: string;
  updatedBy?: User;
  createdAt: string;
  updatedAt: string;
}

