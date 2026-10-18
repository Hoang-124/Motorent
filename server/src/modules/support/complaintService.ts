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
import {
  canTransition,
  getAllowedTransitions,
  isStaffOrManagerRole,
  isManagerRole,
} from './complaint-status';

export const VALID_COMPLAINT_STATUSES: readonly ComplaintStatus[] = [
  'Open',
  'InProgress',
  'Resolved',
  'Closed',
] as const;

export const VALID_COMPLAINT_CATEGORIES = [
  'Vehicle',
  'Service',
  'Payment',
  'Staff',
  'Other',
] as const;

export type ComplaintCategoryType = (typeof VALID_COMPLAINT_CATEGORIES)[number];

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

export interface GetMyComplaintsQuery {
  status?: string;
  page?: number | string;
  limit?: number | string;
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

export const getMyComplaints = async (
  userId: string,
  query: GetMyComplaintsQuery
) => {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new AppError(401, 'Yêu cầu đăng nhập.');
  }

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

  const complaintOwnerId =
    typeof complaint.customerId === 'object' && complaint.customerId?._id
      ? complaint.customerId._id.toString()
      : complaint.customerId?.toString();

  if (complaintOwnerId !== userId.toString()) {
    throw new AppError(404, 'Khiếu nại không tồn tại.');
  }

  const [statusLogs, responses] = await Promise.all([
    ComplaintStatusLog.find({ complaintId: complaint._id })
      .populate('changedBy', 'firstName lastName roles username')
      .lean(),
    ComplaintResponse.find({ complaintId: complaint._id })
      .populate('authorId', 'firstName lastName roles username')
      .populate('respondedBy', 'firstName lastName roles username')
      .lean(),
  ]);

  const timeline: TimelineItem[] = [];

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

  timeline.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

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

  const trimmedCategory = (input.category || '').trim();
  if (!VALID_COMPLAINT_CATEGORIES.includes(trimmedCategory as ComplaintCategoryType)) {
    throw new AppError(
      400,
      `Danh mục khiếu nại không hợp lệ: "${trimmedCategory}". Các danh mục hợp lệ: ${VALID_COMPLAINT_CATEGORIES.join(', ')}.`
    );
  }

  const trimmedDescription = (input.description || '').trim();
  if (!trimmedDescription || trimmedDescription.length < 10) {
    throw new AppError(400, 'Nội dung khiếu nại phải có ít nhất 10 ký tự.');
  }
  if (trimmedDescription.length > 2000) {
    throw new AppError(400, 'Nội dung khiếu nại không được vượt quá 2000 ký tự.');
  }

  const code = await generateUniqueComplaintCode();

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
      status: 'Open' as const,
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

/**
 * UC-65: Details for Staff/Manager
 */
export const getComplaintDetailsForStaffOrManager = async (
  complaintId: string,
  user: IUser
) => {
  if (!user) {
    throw new AppError(401, 'Yêu cầu đăng nhập.');
  }

  if (!mongoose.isValidObjectId(complaintId)) {
    throw new AppError(400, 'ID khiếu nại không hợp lệ.');
  }

  const complaint = (await Complaint.findById(complaintId)
    .populate('customerId', 'username firstName lastName email phoneNumber avatarUrl')
    .populate('bookingId', 'bookingCode pickupDateTime returnDateTime totalAmount vehicleId')
    .populate('branchId', 'name code address phone')
    .populate('resolvedBy', 'username firstName lastName email roles')
    .lean()) as any;

  if (!complaint) {
    throw new AppError(404, 'Không tìm thấy khiếu nại.');
  }

  if (user.roles === 'Customer') {
    const ownerId =
      typeof complaint.customerId === 'object' && (complaint.customerId as any)?._id
        ? (complaint.customerId as any)._id.toString()
        : complaint.customerId?.toString();
    if (ownerId !== user._id.toString()) {
      throw new AppError(404, 'Không tìm thấy khiếu nại.');
    }
  }

  const [statusLogs, responses] = await Promise.all([
    ComplaintStatusLog.find({ complaintId: complaint._id })
      .populate('changedBy', 'username firstName lastName roles avatarUrl')
      .sort({ createdAt: 1 })
      .lean(),
    ComplaintResponse.find({ complaintId: complaint._id })
      .populate('authorId', 'username firstName lastName roles avatarUrl')
      .populate('respondedBy', 'username firstName lastName roles avatarUrl')
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  return {
    ...complaint,
    statusLogs,
    responses,
  };
};

/**
 * UC-65: Add message response to complaint (staff/manager)
 */
export const addComplaintResponse = async (
  complaintId: string,
  message: string,
  user: IUser
) => {
  if (!user) {
    throw new AppError(401, 'Yêu cầu đăng nhập.');
  }

  if (!mongoose.isValidObjectId(complaintId)) {
    throw new AppError(400, 'ID khiếu nại không hợp lệ.');
  }

  const trimmedMessage = (message || '').trim();
  if (!trimmedMessage || trimmedMessage.length < 1) {
    throw new AppError(400, 'Nội dung phản hồi không được để trống.');
  }
  if (trimmedMessage.length > 2000) {
    throw new AppError(400, 'Nội dung phản hồi không được vượt quá 2000 ký tự.');
  }

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new AppError(404, 'Không tìm thấy khiếu nại.');
  }

  if (complaint.status === 'Closed') {
    throw new AppError(409, 'Khiếu nại đã đóng (Closed), không thể gửi thêm phản hồi.');
  }

  if (complaint.status === 'Open' && isStaffOrManagerRole(user.roles)) {
    if (canTransition('Open', 'InProgress', user.roles)) {
      complaint.status = 'InProgress';
      if (!complaint.handledBy) {
        complaint.handledBy = user._id;
      }

      await complaint.save();

      await ComplaintStatusLog.create({
        complaintId: complaint._id,
        fromStatus: 'Open',
        toStatus: 'InProgress',
        changedBy: user._id,
        changedByRole: user.roles,
        note: 'Nhân viên tiếp nhận và phản hồi khiếu nại',
        createdAt: new Date(),
      });
    }
  }

  const responseDoc = await ComplaintResponse.create({
    complaintId: complaint._id,
    authorId: user._id,
    authorRole: user.roles,
    message: trimmedMessage,
    content: trimmedMessage,
    createdAt: new Date(),
  });

  return responseDoc;
};

export interface GetStaffComplaintsQuery {
  status?: string;
  category?: string;
  q?: string;
  page?: number | string;
  limit?: number | string;
}

/**
 * UC-65: GET /staff/complaints?status&category&q&page&limit - Staff, Manager
 */
export const getStaffComplaints = async (query: GetStaffComplaintsQuery = {}) => {
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

  const matchStage: Record<string, any> = {};
  if (query.status && String(query.status).trim() !== '') {
    matchStage.status = String(query.status).trim();
  }
  if (query.category && String(query.category).trim() !== '') {
    matchStage.category = String(query.category).trim();
  }
  if (query.q && String(query.q).trim() !== '') {
    matchStage.code = { $regex: String(query.q).trim(), $options: 'i' };
  }

  const aggregateResult = await Complaint.aggregate([
    { $match: matchStage },
    {
      $addFields: {
        statusPriority: {
          $cond: [{ $eq: ['$status', 'Open'] }, 0, 1],
        },
      },
    },
    {
      $sort: {
        statusPriority: 1,
        createdAt: 1,
      },
    },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        ids: [{ $skip: skip }, { $limit: limit }, { $project: { _id: 1 } }],
      },
    },
  ]);

  const total = aggregateResult[0]?.metadata[0]?.total || 0;
  const ids = aggregateResult[0]?.ids?.map((item: any) => item._id) || [];

  const rawItems = await Complaint.find({ _id: { $in: ids } })
    .populate('customerId', 'firstName lastName username email phoneNumber avatarUrl roles')
    .populate({
      path: 'bookingId',
      select: 'bookingCode vehicleId pickupDateTime returnDateTime status totalAmount',
      populate: {
        path: 'vehicleId',
        select: 'vehicleModel licensePlate brand color',
      },
    })
    .populate('handledBy', 'firstName lastName username roles')
    .populate('branchId', 'name address code')
    .lean();

  const itemMap = new Map(rawItems.map((i: any) => [i._id.toString(), i]));
  const items = ids.map((id: any) => itemMap.get(id.toString())).filter(Boolean);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

/**
 * UC-65: GET /staff/complaints/:id - Staff, Manager
 */
export const getStaffComplaintById = async (
  complaintId: string,
  user: IUser
) => {
  if (!user) {
    throw new AppError(401, 'Yêu cầu đăng nhập.');
  }

  if (!complaintId || !mongoose.isValidObjectId(complaintId)) {
    throw new AppError(404, 'Khiếu nại không tồn tại.');
  }

  const complaint: any = await Complaint.findById(complaintId)
    .populate('customerId', 'firstName lastName username email phoneNumber avatarUrl roles')
    .populate({
      path: 'bookingId',
      select: 'bookingCode vehicleId pickupDateTime returnDateTime status totalAmount',
      populate: {
        path: 'vehicleId',
        select: 'vehicleModel licensePlate brand color',
      },
    })
    .populate('handledBy', 'firstName lastName username roles')
    .populate('branchId', 'name address code phone')
    .populate('resolvedBy', 'firstName lastName username roles')
    .lean();

  if (!complaint) {
    throw new AppError(404, 'Khiếu nại không tồn tại.');
  }

  const [statusLogs, responses] = await Promise.all([
    ComplaintStatusLog.find({ complaintId: complaint._id })
      .populate('changedBy', 'firstName lastName username roles avatarUrl')
      .sort({ createdAt: 1 })
      .lean(),
    ComplaintResponse.find({ complaintId: complaint._id })
      .populate('authorId', 'firstName lastName username roles avatarUrl')
      .populate('respondedBy', 'firstName lastName username roles avatarUrl')
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  const timeline: TimelineItem[] = [];

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

  timeline.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const allowedTransitions = getAllowedTransitions(complaint.status, user.roles);

  return {
    ...complaint,
    timeline,
    statusLogs,
    responses,
    allowedTransitions,
  };
};

/**
 * UC-65: PATCH /staff/complaints/:id/status body: { toStatus, note } - Staff, Manager
 */
export const updateComplaintStatus = async (
  complaintId: string,
  user: IUser,
  toStatus: string,
  note?: string
) => {
  if (!user) {
    throw new AppError(401, 'Yêu cầu đăng nhập.');
  }

  if (!complaintId || !mongoose.isValidObjectId(complaintId)) {
    throw new AppError(404, 'Khiếu nại không tồn tại.');
  }

  if (!toStatus || !VALID_COMPLAINT_STATUSES.includes(toStatus as ComplaintStatus)) {
    throw new AppError(400, `Trạng thái chuyển đổi không hợp lệ: "${toStatus}".`);
  }

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new AppError(404, 'Khiếu nại không tồn tại.');
  }

  const fromStatus = complaint.status;

  if (toStatus === 'Closed' && user.roles === 'Staff') {
    throw new AppError(403, 'Chỉ Quản lý (BranchManager, SystemAdmin) mới có quyền đóng khiếu nại.');
  }

  if (!canTransition(fromStatus, toStatus, user.roles)) {
    throw new AppError(
      409,
      `Không thể chuyển trạng thái khiếu nại từ "${fromStatus}" sang "${toStatus}".`
    );
  }

  if (user.roles === 'Staff' && complaint.handledBy) {
    const handledById =
      typeof complaint.handledBy === 'object' && (complaint.handledBy as any)._id
        ? (complaint.handledBy as any)._id.toString()
        : complaint.handledBy.toString();
    if (handledById !== user._id.toString()) {
      throw new AppError(
        403,
        'Bạn không có quyền thay đổi trạng thái khiếu nại do nhân viên khác đang phụ trách.'
      );
    }
  }

  if (fromStatus === 'InProgress' && toStatus === 'Resolved') {
    const staffResponseCount = await ComplaintResponse.countDocuments({
      complaintId: complaint._id,
      authorRole: { $in: ['Staff', 'BranchManager', 'SystemAdmin'] },
    });
    if (staffResponseCount === 0) {
      throw new AppError(
        400,
        'Cần có ít nhất 1 phản hồi từ nhân viên trước khi chuyển trạng thái sang Đã giải quyết (Resolved).'
      );
    }
  }

  const updatePayload: Record<string, any> = {
    status: toStatus,
    updatedAt: new Date(),
  };

  if (fromStatus === 'Open' && toStatus === 'InProgress' && !complaint.handledBy) {
    updatePayload.handledBy = user._id;
  }
  if (toStatus === 'Closed') {
    updatePayload.closedAt = new Date();
  }

  const updateResult = await Complaint.updateOne(
    { _id: complaint._id, status: fromStatus },
    { $set: updatePayload }
  );

  if (updateResult.matchedCount === 0 || updateResult.modifiedCount === 0) {
    throw new AppError(
      409,
      'Khiếu nại đã được cập nhật bởi người khác. Vui lòng tải lại.'
    );
  }

  const statusLog = await ComplaintStatusLog.create({
    complaintId: complaint._id,
    fromStatus,
    previousStatus: fromStatus,
    toStatus,
    newStatus: toStatus,
    changedBy: user._id,
    changedByRole: user.roles,
    note: (note || '').trim() || `Chuyển trạng thái từ ${fromStatus} sang ${toStatus}`,
    createdAt: new Date(),
  });

  const updatedComplaint = await Complaint.findById(complaint._id)
    .populate('customerId', 'firstName lastName username email phoneNumber avatarUrl roles')
    .populate({
      path: 'bookingId',
      select: 'bookingCode vehicleId pickupDateTime returnDateTime status totalAmount',
      populate: {
        path: 'vehicleId',
        select: 'vehicleModel licensePlate brand color',
      },
    })
    .populate('handledBy', 'firstName lastName username roles')
    .populate('branchId', 'name address code')
    .lean();

  return {
    complaint: updatedComplaint,
    statusLog,
  };
};

export interface GetPendingComplaintsQuery {
  page?: number | string;
  limit?: number | string;
  status?: string;
  branchId?: string;
}

/**
 * UC-85: GET /manager/complaints/pending
 * Manager retrieves pending complaints (InProgress or Resolved, not Closed)
 */
export const getPendingComplaintsForManager = async (
  user: IUser,
  query: GetPendingComplaintsQuery = {}
) => {
  if (!user || !isManagerRole(user.roles)) {
    throw new AppError(403, 'Chỉ Manager mới có quyền truy cập danh sách khiếu nại chờ xử lý.');
  }

  const page = Math.max(1, parseInt(String(query.page || 1), 10));
  const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 10), 10)));
  const skip = (page - 1) * limit;

  // Filter: status InProgress hoặc Resolved, chưa Closed
  const filter: Record<string, unknown> = {
    status: { $in: ['InProgress', 'Resolved'] },
  };

  // Branch isolation: BranchManager only views complaints for their assigned branch
  if (user.roles === 'BranchManager' && user.branchId) {
    filter.branchId = user.branchId;
  } else if (query.branchId && mongoose.isValidObjectId(query.branchId)) {
    filter.branchId = new mongoose.Types.ObjectId(query.branchId);
  }

  const [items, total] = await Promise.all([
    Complaint.find(filter)
      .populate('customerId', 'username firstName lastName email phoneNumber avatarUrl')
      .populate('branchId', 'name code address phone')
      .populate('bookingId', 'bookingCode vehicleId totalAmount pickupDateTime returnDateTime')
      .populate('resolvedBy', 'username firstName lastName email roles')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Complaint.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    items,
    total,
    page,
    limit,
    totalPages,
  };
};

/**
 * UC-85: POST /manager/complaints/:id/resolve
 * Manager provides final resolution
 * Rules:
 * - finalResolution is required, trimmed, 10-3000 chars -> 400
 * - complaint Open -> 409
 * - complaint Closed -> 409
 * - complaint InProgress -> Resolved (canTransition check, conditional update, log status change)
 * - complaint Resolved -> update finalResolution + resolvedBy (no status log)
 */
export const resolveComplaintByManager = async (
  complaintId: string,
  finalResolution: string,
  user: IUser
): Promise<IComplaint> => {
  if (!user || !isManagerRole(user.roles)) {
    throw new AppError(403, 'Chỉ Manager mới có quyền đưa ra kết luận giải quyết khiếu nại.');
  }

  if (!mongoose.isValidObjectId(complaintId)) {
    throw new AppError(400, 'ID khiếu nại không hợp lệ.');
  }

  if (!finalResolution || typeof finalResolution !== 'string') {
    throw new AppError(400, 'Nội dung kết luận cuối cùng (finalResolution) là bắt buộc.');
  }

  const trimmedResolution = finalResolution.trim();
  if (trimmedResolution.length < 10 || trimmedResolution.length > 3000) {
    throw new AppError(
      400,
      'Nội dung kết luận cuối cùng (finalResolution) phải có độ dài từ 10 đến 3000 ký tự.'
    );
  }

  const existing = await Complaint.findById(complaintId);
  if (!existing) {
    throw new AppError(404, 'Không tìm thấy thông tin khiếu nại.');
  }

  // Branch authorization check for BranchManager
  if (user.roles === 'BranchManager' && user.branchId && existing.branchId) {
    const userBranchStr = user.branchId.toString();
    const complaintBranchStr = existing.branchId.toString();
    if (userBranchStr !== complaintBranchStr) {
      throw new AppError(403, 'Bạn không có quyền xử lý khiếu nại của chi nhánh khác.');
    }
  }

  // Rule: Complaint Open -> 409 (phải qua bước xử lý của staff trước).
  if (existing.status === 'Open') {
    throw new AppError(
      409,
      'Khiếu nại đang ở trạng thái Open, phải qua bước xử lý của nhân viên trước khi đưa ra kết luận.'
    );
  }

  // Rule: Complaint Closed -> 409, finalResolution không được sửa nữa.
  if (existing.status === 'Closed') {
    throw new AppError(
      409,
      'Khiếu nại đã đóng (Closed), kết luận cuối cùng không thể chỉnh sửa nữa.'
    );
  }

  // If complaint is InProgress -> transition to Resolved via canTransition & log status change
  if (existing.status === 'InProgress') {
    if (!canTransition('InProgress', 'Resolved', user.roles)) {
      throw new AppError(409, 'Không thể chuyển trạng thái khiếu nại từ InProgress sang Resolved.');
    }

    const updated = await Complaint.findOneAndUpdate(
      { _id: complaintId, status: 'InProgress' },
      {
        $set: {
          status: 'Resolved',
          finalResolution: trimmedResolution,
          resolvedBy: user._id,
        },
      },
      { new: true }
    )
      .populate('customerId', 'username firstName lastName email phoneNumber')
      .populate('branchId', 'name code address')
      .populate('resolvedBy', 'username firstName lastName email roles');

    if (!updated) {
      const reCheck = await Complaint.findById(complaintId);
      if (reCheck?.status === 'Closed') {
        throw new AppError(409, 'Khiếu nại đã đóng (Closed), không thể cập nhật kết luận.');
      }
      throw new AppError(409, 'Xung đột trạng thái: Khiếu nại đã được cập nhật bởi phiên làm việc khác.');
    }

    // Record status log: InProgress -> Resolved
    await ComplaintStatusLog.create({
      complaintId: updated._id,
      fromStatus: 'InProgress',
      toStatus: 'Resolved',
      changedBy: user._id,
      changedByRole: user.roles,
      note: 'Manager đưa ra kết luận cuối cùng (finalResolution)',
      createdAt: new Date(),
    });

    return updated;
  }

  // If complaint is already Resolved (staff or previous manager resolve)
  if (existing.status === 'Resolved') {
    const updated = await Complaint.findOneAndUpdate(
      { _id: complaintId, status: 'Resolved' },
      {
        $set: {
          finalResolution: trimmedResolution,
          resolvedBy: user._id,
        },
      },
      { new: true }
    )
      .populate('customerId', 'username firstName lastName email phoneNumber')
      .populate('branchId', 'name code address')
      .populate('resolvedBy', 'username firstName lastName email roles');

    if (!updated) {
      const reCheck = await Complaint.findById(complaintId);
      if (reCheck?.status === 'Closed') {
        throw new AppError(409, 'Khiếu nại đã đóng (Closed), không thể cập nhật kết luận.');
      }
      throw new AppError(409, 'Xung đột trạng thái khiếu nại.');
    }

    return updated;
  }

  throw new AppError(409, `Không thể giải quyết khiếu nại ở trạng thái ${existing.status}.`);
};

/**
 * UC-85: POST /manager/complaints/:id/close
 * Manager officially closes the complaint (terminal action)
 * Rules:
 * - only from Resolved -> Closed
 * - finalResolution must already exist, else 400
 * - InProgress -> 409
 * - Closed -> 409
 * - Open -> 409
 * - Set closedAt = now(), log status change
 */
export const closeComplaintByManager = async (
  complaintId: string,
  user: IUser
): Promise<IComplaint> => {
  if (!user || !isManagerRole(user.roles)) {
    throw new AppError(403, 'Chỉ Manager mới có quyền đóng khiếu nại.');
  }

  if (!mongoose.isValidObjectId(complaintId)) {
    throw new AppError(400, 'ID khiếu nại không hợp lệ.');
  }

  const existing = await Complaint.findById(complaintId);
  if (!existing) {
    throw new AppError(404, 'Không tìm thấy thông tin khiếu nại.');
  }

  // Branch authorization check for BranchManager
  if (user.roles === 'BranchManager' && user.branchId && existing.branchId) {
    const userBranchStr = user.branchId.toString();
    const complaintBranchStr = existing.branchId.toString();
    if (userBranchStr !== complaintBranchStr) {
      throw new AppError(403, 'Bạn không có quyền đóng khiếu nại của chi nhánh khác.');
    }
  }

  if (existing.status === 'InProgress') {
    throw new AppError(
      409,
      'Khiếu nại đang ở trạng thái InProgress, chỉ có thể đóng sau khi đã ở trạng thái Resolved.'
    );
  }

  if (existing.status === 'Open') {
    throw new AppError(
      409,
      'Khiếu nại đang ở trạng thái Open, không thể đóng trực tiếp.'
    );
  }

  if (existing.status === 'Closed') {
    throw new AppError(409, 'Khiếu nại đã được đóng trước đó (không thể hoàn tác).');
  }

  if (!existing.finalResolution || !existing.finalResolution.trim()) {
    throw new AppError(
      400,
      'Khiếu nại chưa có kết luận giải quyết cuối cùng (finalResolution), không thể đóng.'
    );
  }

  if (!canTransition('Resolved', 'Closed', user.roles)) {
    throw new AppError(409, 'Không thể chuyển trạng thái khiếu nại sang Closed.');
  }

  const closedAt = new Date();
  const updated = await Complaint.findOneAndUpdate(
    {
      _id: complaintId,
      status: 'Resolved',
      finalResolution: { $exists: true, $ne: '' },
    },
    {
      $set: {
        status: 'Closed',
        closedAt,
      },
    },
    { new: true }
  )
    .populate('customerId', 'username firstName lastName email phoneNumber')
    .populate('branchId', 'name code address')
    .populate('resolvedBy', 'username firstName lastName email roles');

  if (!updated) {
    const reCheck = await Complaint.findById(complaintId);
    if (reCheck?.status === 'Closed') {
      throw new AppError(409, 'Khiếu nại đã được đóng trước đó.');
    }
    throw new AppError(409, 'Xung đột trạng thái khi đóng khiếu nại.');
  }

  await ComplaintStatusLog.create({
    complaintId: updated._id,
    fromStatus: 'Resolved',
    toStatus: 'Closed',
    changedBy: user._id,
    changedByRole: user.roles,
    note: 'Manager chính thức đóng khiếu nại (bước không thể hoàn tác)',
    createdAt: closedAt,
  });

  return updated;
};

