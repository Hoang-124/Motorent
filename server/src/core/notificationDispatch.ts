import mongoose from 'mongoose';
import { Notification, NotificationType } from '../models/Notification';
import { User } from '../models/User';

type BranchId = string | mongoose.Types.ObjectId;

interface NotifyBranchOperationsInput {
  branchIds?: Array<BranchId | null | undefined>;
  title: string;
  body: string;
  type: NotificationType;
  relatedId?: string;
  data?: Record<string, unknown>;
}

/**
 * Persist and push an operational notification to active staff and managers
 * for the affected branch, plus active system administrators.
 */
export const notifyBranchOperations = async ({
  branchIds = [],
  title,
  body,
  type,
  relatedId,
  data,
}: NotifyBranchOperationsInput): Promise<void> => {
  const hasBranchScope = branchIds.some(Boolean);
  const scopedBranchIds = [...new Set(branchIds.filter(Boolean).map(String))]
    .filter(mongoose.isValidObjectId)
    .map((id) => new mongoose.Types.ObjectId(id));

  const staffRecipientFilter = hasBranchScope
    ? scopedBranchIds.length > 0
      ? { roles: { $in: ['BranchManager', 'Staff'] }, branchId: { $in: scopedBranchIds } }
      : null
    : { roles: { $in: ['BranchManager', 'Staff'] } };

  const recipients = await User.find({
    status: 'Active',
    $or: [
      { roles: 'SystemAdmin' },
      ...(staffRecipientFilter ? [staffRecipientFilter] : []),
    ],
  }).select('_id').lean();

  await Promise.all(recipients.map((recipient) => Notification.create({
    userId: recipient._id,
    title,
    body,
    type,
    relatedId,
    isRead: false,
    data,
  })));
};
