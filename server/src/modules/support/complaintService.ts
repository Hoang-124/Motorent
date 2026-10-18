import mongoose from 'mongoose';
import { Complaint, ComplaintStatusLog, IComplaint } from '../../models/Complaint';
import { Booking } from '../../models/Booking';
import { AppError } from '../../core/errorHandler';

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
 * Rules:
 * - bookingId must belong to current user (via getBookingForCustomer stub) -> 404 if not owned/not found
 * - category must be one of ['Vehicle', 'Service', 'Payment', 'Staff', 'Other'] -> 400 if invalid
 * - description: required, trimmed, 10-2000 chars -> 400 if invalid
 * - attachments: optional array of url strings (max 5)
 * - status forced to 'Open', customerId from auth token
 * - code format CMP-YYYYMMDD-XXXX (unique)
 * - anti-spam: max 5 complaints per user per calendar day -> 429
 * - atomic transaction: creates Complaint + ComplaintStatusLog (fromStatus: null, toStatus: 'Open')
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

/**
 * Backward compatibility alias
 */
export const createComplaint = submitComplaint;
