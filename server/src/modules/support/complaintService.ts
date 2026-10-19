import mongoose from 'mongoose';
import {
  Complaint,
  IComplaint,
  ComplaintStatusLog,
  ComplaintResponse,
  ComplaintStatus,
} from '../../models/Complaint';
import { Booking } from '../../models/Booking';
import { IUser } from '../../models/User';
import { AppError } from '../../core/errorHandler';

export const VALID_COMPLAINT_STATUSES: readonly ComplaintStatus[] = [
  'Open',
  'InProgress',
  'Resolved',
  'Closed',
] as const;

export interface GetMyComplaintsQuery {
  status?: string;
  page?: number | string;
  limit?: number | string;
}

export interface TimelineActor {
  name: string;
  role: string;
}

export interface TimelineItem {
  type: 'status' | 'response';
  content: string;
  createdAt: Date;
  performedBy: TimelineActor;
  user: TimelineActor;
  status?: string;
  previousStatus?: string | null;
}

export interface FormattedBookingSummary {
  _id: string;
  bookingCode: string;
  vehicle: string;
  pickupDateTime?: Date;
  returnDateTime?: Date;
}

export interface FormattedComplaintDetail {
  _id: string;
  id: string;
  code: string;
  category: string;
  title: string;
  description: string;
  attachments: string[];
  status: ComplaintStatus;
  booking: FormattedBookingSummary | null;
  finalResolution?: string | null;
  createdAt: Date;
  closedAt: Date | null;
  updatedAt: Date;
  timeline: TimelineItem[];
}

/**
 * Format user display name without leaking employee PII
 */
const formatDisplayName = (user?: IUser | Record<string, unknown> | null): string => {
  if (!user) return 'Hệ thống';
  const firstName = (user as { firstName?: string }).firstName || '';
  const lastName = (user as { lastName?: string }).lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) return fullName;
  const username = (user as { username?: string }).username;
  if (username) return username;
  return 'Nhân viên hỗ trợ';
};

/**
 * Helper to build vehicle summary string from booking
 */
const buildVehicleSummary = (vehicleObj: unknown): string => {
  if (!vehicleObj || typeof vehicleObj !== 'object') return 'Chưa xác định';
  const v = vehicleObj as { vehicleModel?: string; brand?: string; licensePlate?: string };
  const model = v.vehicleModel || v.brand || 'Xe máy';
  const plate = v.licensePlate ? ` (${v.licensePlate})` : '';
  return `${model}${plate}`.trim();
};

/**
 * UC-43: List customer's own complaints
 * Rules:
 * - Only complaints with customerId = current user
 * - Filter status strictly by enum: Open | InProgress | Resolved | Closed (unknown -> 400)
 * - Sort: newest first (createdAt: -1)
 */
export const getMyComplaints = async (
  userId: string,
  query: GetMyComplaintsQuery
) => {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new AppError(401, 'Yêu cầu đăng nhập.');
  }

  // Validate status query if provided
  if (query.status !== undefined && query.status !== null && String(query.status).trim() !== '') {
    const rawStatus = String(query.status).trim();
    if (!VALID_COMPLAINT_STATUSES.includes(rawStatus as ComplaintStatus)) {
      throw new AppError(
        400,
        `Trạng thái khiếu nại không hợp lệ: "${rawStatus}". Các giá trị hợp lệ: Open, InProgress, Resolved, Closed.`
      );
    }
  }

  const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || '10'), 10) || 10));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {
    customerId: new mongoose.Types.ObjectId(userId),
  };

  if (query.status && String(query.status).trim() !== '') {
    filter.status = String(query.status).trim();
  }

  const [rawComplaints, total] = await Promise.all([
    Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'bookingId',
        select: 'bookingCode vehicleId pickupDateTime returnDateTime',
        populate: {
          path: 'vehicleId',
          select: 'vehicleModel licensePlate brand color',
        },
      })
      .lean(),
    Complaint.countDocuments(filter),
  ]);

  const items = rawComplaints.map((c: any) => {
    let bookingSummary: FormattedBookingSummary | null = null;
    if (c.bookingId && typeof c.bookingId === 'object') {
      bookingSummary = {
        _id: c.bookingId._id?.toString() || '',
        bookingCode: c.bookingId.bookingCode || `MV-${c.bookingId._id?.toString().slice(-6).toUpperCase()}`,
        vehicle: buildVehicleSummary(c.bookingId.vehicleId),
        pickupDateTime: c.bookingId.pickupDateTime,
        returnDateTime: c.bookingId.returnDateTime,
      };
    }

    const isResolvedOrClosed = c.status === 'Resolved' || c.status === 'Closed';
    const finalResolution = isResolvedOrClosed ? c.finalResolution || c.resolutionNotes || null : undefined;

    return {
      _id: c._id?.toString(),
      id: c._id?.toString(),
      code: c.code,
      category: c.category,
      title: c.title || '',
      description: c.description,
      attachments: c.attachments || [],
      status: c.status,
      booking: bookingSummary,
      finalResolution,
      createdAt: c.createdAt,
      closedAt: c.closedAt || null,
      updatedAt: c.updatedAt,
    };
  });

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

/**
 * UC-43: Get detailed complaint information and sanitized timeline
 * Rules:
 * - Only complaint belonging to current user (other user's complaint -> 404, never 403)
 * - Summary booking (booking code, vehicle)
 * - finalResolution ONLY visible when Resolved or Closed (hidden otherwise)
 * - Timeline: merged ComplaintStatusLog + ComplaintResponse, sorted by createdAt ASC
 * - Timeline actors ONLY have display name + role. NO email, phone, or employee IDs.
 */
export const getComplaintDetail = async (
  userId: string,
  complaintId: string
): Promise<FormattedComplaintDetail> => {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new AppError(401, 'Yêu cầu đăng nhập.');
  }

  if (!complaintId || !mongoose.isValidObjectId(complaintId)) {
    throw new AppError(404, 'Khiếu nại không tồn tại.');
  }

  const complaint: any = await Complaint.findById(complaintId)
    .populate({
      path: 'bookingId',
      select: 'bookingCode vehicleId pickupDateTime returnDateTime',
      populate: {
        path: 'vehicleId',
        select: 'vehicleModel licensePlate brand color',
      },
    })
    .populate('customerId', 'firstName lastName username roles')
    .lean();

  if (!complaint) {
    throw new AppError(404, 'Khiếu nại không tồn tại.');
  }

  // Security check: Only customer who filed the complaint can view it.
  // Other customer's complaint MUST return 404 (do not use 403 to avoid leaking existence)
  const complaintOwnerId =
    typeof complaint.customerId === 'object' && complaint.customerId?._id
      ? complaint.customerId._id.toString()
      : complaint.customerId?.toString();

  if (complaintOwnerId !== userId.toString()) {
    throw new AppError(404, 'Khiếu nại không tồn tại.');
  }

  // Fetch status logs and responses concurrently
  const [statusLogs, responses] = await Promise.all([
    ComplaintStatusLog.find({ complaintId: complaint._id })
      .populate('changedBy', 'firstName lastName roles username')
      .lean(),
    ComplaintResponse.find({ complaintId: complaint._id })
      .populate('authorId', 'firstName lastName roles username')
      .populate('respondedBy', 'firstName lastName roles username')
      .lean(),
  ]);

  // Build merged timeline
  const timeline: TimelineItem[] = [];

  // Add status logs
  for (const log of statusLogs as any[]) {
    const rawUser = log.changedBy && typeof log.changedBy === 'object' ? log.changedBy : null;
    const actorName = formatDisplayName(rawUser);
    const actorRole = rawUser?.roles || log.changedByRole || 'Staff';

    let content = log.note || '';
    if (!content) {
      if (log.fromStatus) {
        content = `Trạng thái chuyển từ ${log.fromStatus} sang ${log.toStatus || log.newStatus}`;
      } else {
        content = `Tiếp nhận khiếu nại với trạng thái ${log.toStatus || log.newStatus || 'Open'}`;
      }
    }

    timeline.push({
      type: 'status',
      status: log.toStatus || log.newStatus || 'Open',
      previousStatus: log.fromStatus || log.previousStatus || null,
      content,
      createdAt: log.createdAt,
      performedBy: {
        name: actorName,
        role: actorRole,
      },
      user: {
        name: actorName,
        role: actorRole,
      },
    });
  }

  // Add responses
  for (const resp of responses as any[]) {
    const rawUser =
      (resp.authorId && typeof resp.authorId === 'object' ? resp.authorId : null) ||
      (resp.respondedBy && typeof resp.respondedBy === 'object' ? resp.respondedBy : null);
    const actorName = formatDisplayName(rawUser);
    const actorRole = rawUser?.roles || resp.authorRole || 'Staff';

    timeline.push({
      type: 'response',
      content: resp.message || resp.content || '',
      createdAt: resp.createdAt,
      performedBy: {
        name: actorName,
        role: actorRole,
      },
      user: {
        name: actorName,
        role: actorRole,
      },
    });
  }

  // If no Open status log was created, add initial creation event at complaint.createdAt
  const hasOpenEvent = timeline.some((t) => t.type === 'status' && t.status === 'Open');
  if (!hasOpenEvent) {
    const customerUser = complaint.customerId;
    const actorName = formatDisplayName(customerUser);
    timeline.unshift({
      type: 'status',
      status: 'Open',
      content: 'Khách hàng gửi khiếu nại lên hệ thống',
      createdAt: complaint.createdAt,
      performedBy: {
        name: actorName,
        role: 'Customer',
      },
      user: {
        name: actorName,
        role: 'Customer',
      },
    });
  }

  // Sort timeline chronologically (createdAt ASC)
  timeline.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Format booking summary
  let bookingSummary: FormattedBookingSummary | null = null;
  if (complaint.bookingId && typeof complaint.bookingId === 'object') {
    bookingSummary = {
      _id: complaint.bookingId._id?.toString() || '',
      bookingCode:
        complaint.bookingId.bookingCode ||
        `MV-${complaint.bookingId._id?.toString().slice(-6).toUpperCase()}`,
      vehicle: buildVehicleSummary(complaint.bookingId.vehicleId),
      pickupDateTime: complaint.bookingId.pickupDateTime,
      returnDateTime: complaint.bookingId.returnDateTime,
    };
  }

  // Rule: finalResolution ONLY visible when Resolved or Closed
  const isResolvedOrClosed = complaint.status === 'Resolved' || complaint.status === 'Closed';
  const finalResolution = isResolvedOrClosed
    ? complaint.finalResolution || complaint.resolutionNotes || null
    : undefined;

  return {
    _id: complaint._id?.toString(),
    id: complaint._id?.toString(),
    code: complaint.code,
    category: complaint.category,
    title: complaint.title || '',
    description: complaint.description,
    attachments: complaint.attachments || [],
    status: complaint.status,
    booking: bookingSummary,
    finalResolution,
    createdAt: complaint.createdAt,
    closedAt: complaint.closedAt || null,
    updatedAt: complaint.updatedAt,
    timeline,
  };
};

export const VALID_COMPLAINT_CATEGORIES = [
  'Vehicle',
  'Service',
  'Payment',
  'Staff',
  'Other',
] as const;

export type ComplaintCategoryType = (typeof VALID_COMPLAINT_CATEGORIES)[number];

/**
 * UC-28 Stub: Verify if a booking belongs to a given customer
 */
export const getBookingForCustomer = async (
  bookingId: string,
  userId: string
) => {
  if (!bookingId || !userId) return null;
  if (!mongoose.isValidObjectId(bookingId) || !mongoose.isValidObjectId(userId)) {
    return null;
  }
  const booking = await Booking.findOne({
    _id: new mongoose.Types.ObjectId(bookingId),
    userId: new mongoose.Types.ObjectId(userId),
  });
  return booking;
};

/**
 * Generate unique complaint code: CMP-YYYYMMDD-XXXX
 */
export const generateUniqueComplaintCode = async (): Promise<string> => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (let attempt = 0; attempt < 10; attempt++) {
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `CMP-${dateStr}-${suffix}`;
    const existing = await Complaint.findOne({ code });
    if (!existing) {
      return code;
    }
  }

  // Fallback with millisecond timestamp suffix
  const tsSuffix = Date.now().toString(36).slice(-4).toUpperCase();
  return `CMP-${dateStr}-${tsSuffix}`;
};

export interface SubmitComplaintInput {
  bookingId: string;
  category: string;
  description: string;
  attachments?: string[];
  title?: string;
  // Ignore any status or customerId passed by client
  status?: unknown;
  customerId?: unknown;
}

/**
 * UC-42: Customer submits complaint
 */
export const submitComplaint = async (
  userId: string,
  input: SubmitComplaintInput
): Promise<IComplaint> => {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new AppError(401, 'Yêu cầu đăng nhập.');
  }

  // 1. Anti-spam check: max 5 complaints per user per day
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dailyCount = await Complaint.countDocuments({
    customerId: new mongoose.Types.ObjectId(userId),
    createdAt: { $gte: startOfDay },
  });

  const MAX_COMPLAINTS_PER_DAY = 5;
  if (dailyCount >= MAX_COMPLAINTS_PER_DAY) {
    throw new AppError(
      429,
      `Bạn đã gửi tối đa ${MAX_COMPLAINTS_PER_DAY} khiếu nại trong ngày hôm nay. Vui lòng quay lại vào ngày mai.`
    );
  }

  // 2. Validate booking ownership via getBookingForCustomer stub
  if (!input.bookingId) {
    throw new AppError(404, 'Vui lòng chọn đơn đặt xe cần khiếu nại.');
  }

  const booking = await getBookingForCustomer(input.bookingId, userId);
  if (!booking) {
    throw new AppError(
      404,
      'Không tìm thấy thông tin đơn đặt xe hoặc bạn không có quyền khiếu nại đơn này.'
    );
  }

  // 3. Validate category enum
  const trimmedCategory = (input.category || '').trim();
  if (!VALID_COMPLAINT_CATEGORIES.includes(trimmedCategory as ComplaintCategoryType)) {
    throw new AppError(
      400,
      `Danh mục khiếu nại không hợp lệ: "${trimmedCategory}". Các danh mục hợp lệ: ${VALID_COMPLAINT_CATEGORIES.join(', ')}.`
    );
  }

  // 4. Validate description
  const trimmedDescription = (input.description || '').trim();
  if (!trimmedDescription || trimmedDescription.length < 10) {
    throw new AppError(400, 'Nội dung khiếu nại phải có ít nhất 10 ký tự.');
  }
  if (trimmedDescription.length > 2000) {
    throw new AppError(400, 'Nội dung khiếu nại không được vượt quá 2000 ký tự.');
  }

  // 5. Generate unique code
  const code = await generateUniqueComplaintCode();

  // 6. Execute atomic transaction (with standalone MongoDB fallback)
  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch {
    session = null;
  }

  try {
    const complaintData = {
      code,
      customerId: new mongoose.Types.ObjectId(userId),
      bookingId: booking._id,
      branchId: booking.pickupBranchId || null,
      category: trimmedCategory,
      title: (input.title || `Khiếu nại đơn ${booking.bookingCode || booking._id}`).trim(),
      description: trimmedDescription,
      attachments: input.attachments || [],
      status: 'Open' as const, // Forced to Open, ignore client
      priority: 'Medium' as const,
      finalResolution: null,
      handledBy: null,
      resolvedBy: null,
      closedAt: null,
      createdAt: new Date(),
    };

    let complaint: IComplaint;
    if (session) {
      try {
        const created = await Complaint.create([complaintData], { session });
        complaint = created[0];

        await ComplaintStatusLog.create(
          [
            {
              complaintId: complaint._id,
              fromStatus: null,
              toStatus: 'Open',
              changedBy: new mongoose.Types.ObjectId(userId),
              changedByRole: 'Customer',
              note: 'Khách hàng gửi khiếu nại mới',
              createdAt: complaint.createdAt,
            },
          ],
          { session }
        );

        await session.commitTransaction();
        session.endSession();
        return complaint;
      } catch (txErr: any) {
        try {
          await session.abortTransaction();
          session.endSession();
        } catch {
          // ignore
        }
        session = null;
        if (!txErr?.message?.includes('replica set member')) {
          throw txErr;
        }
      }
    }

    complaint = await Complaint.create(complaintData);

    await ComplaintStatusLog.create({
      complaintId: complaint._id,
      fromStatus: null,
      toStatus: 'Open',
      changedBy: new mongoose.Types.ObjectId(userId),
      changedByRole: 'Customer',
      note: 'Khách hàng gửi khiếu nại mới',
      createdAt: complaint.createdAt,
    });

    return complaint;
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch {
        // Ignore rollback failure
      }
    }
    throw error;
  }
};

export const createComplaint = submitComplaint;
