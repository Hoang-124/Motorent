import mongoose from 'mongoose';
import { Conversation, IConversation } from '../../models/Conversation';
import { Message, IMessage } from '../../models/Message';
import { User, IUser } from '../../models/User';
import { Branch } from '../../models/Branch';
import { AppError } from '../../core/errorHandler';
import { io } from '../../server';

const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>?/gm, '').trim();
};

const emitChatEvent = (room: string, event: string, payload: unknown): void => {
  if (!io || !room) return;
  io.to(room).emit(event, payload);
  try {
    io.of('/chat').to(room).emit(event, payload);
  } catch {
    // Ignore if namespace not initialized yet
  }
};

const emitBranchStaffEvent = (
  branchId: mongoose.Types.ObjectId | string | undefined,
  event: string,
  payload: unknown
): void => {
  if (!branchId) return;
  const idStr =
    typeof branchId === 'object' && '_id' in branchId
      ? String((branchId as { _id: unknown })._id)
      : String(branchId);
  emitChatEvent(`staff:branch:${idStr}`, event, payload);
};

/**
 * Find the dedicated Staff member (or BranchManager fallback) for a given branchId
 */
const findBranchSupportStaff = async (
  branchId: mongoose.Types.ObjectId | string
): Promise<IUser | null> => {
  const staff = await User.findOne({
    branchId,
    roles: 'Staff',
    status: 'Active',
  });
  if (staff) return staff;

  return User.findOne({
    branchId,
    roles: 'BranchManager',
    status: 'Active',
  });
};

/**
 * Clean up any invalid self-conversations created by Staff/Manager/Admin
 * and ensure existing conversations have a valid branchId and branch-matched assignedStaffId
 */
export const ensureInitialConversations = async (): Promise<void> => {
  const staffUsers = await User.find({
    roles: { $in: ['Staff', 'BranchManager', 'SystemAdmin'] },
  }).select('_id');
  const staffIds = staffUsers.map((u) => u._id);
  if (staffIds.length > 0) {
    const invalidConvs = await Conversation.find({ customerId: { $in: staffIds } }).select('_id');
    if (invalidConvs.length > 0) {
      const invalidIds = invalidConvs.map((c) => c._id);
      await Message.deleteMany({ conversationId: { $in: invalidIds } });
      await Conversation.deleteMany({ _id: { $in: invalidIds } });
    }
  }

  // Ensure every existing conversation has a branchId and an assignedStaffId belonging to that branch
  const existingConvs = await Conversation.find({});
  const defaultBranch = await Branch.findOne({ isActive: true });
  for (const conv of existingConvs) {
    let changed = false;
    if (!conv.branchId && defaultBranch?._id) {
      conv.branchId = defaultBranch._id as mongoose.Types.ObjectId;
      changed = true;
    }
    if (conv.branchId) {
      const branchStaff = await findBranchSupportStaff(conv.branchId);
      if (branchStaff) {
        const currentStaff = conv.assignedStaffId
          ? await User.findById(conv.assignedStaffId).select('branchId')
          : null;
        if (
          !currentStaff ||
          !currentStaff.branchId ||
          currentStaff.branchId.toString() !== conv.branchId.toString()
        ) {
          conv.assignedStaffId = branchStaff._id as mongoose.Types.ObjectId;
          changed = true;
        }
      }
    }
    if (changed) {
      await conv.save();
    }
  }
};

/**
 * Get active open conversation for a Customer with a SPECIFIC Branch (branchId),
 * or create a new one dedicated to that branch so messages only go to that branch's Staff.
 */
export const getOrCreateCustomerConversation = async (
  customerId: string,
  branchId?: string
): Promise<IConversation | null> => {
  const customer = await User.findById(customerId);
  if (!customer) {
    throw new AppError(404, 'Tài khoản người dùng không tồn tại.');
  }

  // Staff / Manager / Admin do NOT create customer conversations
  if (['Staff', 'BranchManager', 'SystemAdmin'].includes(customer.roles)) {
    return null;
  }

  await ensureInitialConversations();

  // Resolve target branch:
  // 1. Explicit branchId passed by Customer
  // 2. Branch of Customer's most recent Open conversation
  // 3. First active Branch in DB
  let targetBranch =
    branchId && mongoose.isValidObjectId(branchId) ? await Branch.findById(branchId) : null;

  if (!targetBranch) {
    const recentConv = await Conversation.findOne({ customerId, status: 'Open' }).sort({
      lastMessageAt: -1,
    });
    if (recentConv?.branchId) {
      targetBranch = await Branch.findById(recentConv.branchId);
    }
  }

  if (!targetBranch) {
    targetBranch = (await Branch.findOne({ isActive: true })) || (await Branch.findOne());
  }

  if (!targetBranch) {
    throw new AppError(404, 'Hệ thống chưa có chi nhánh hoạt động.');
  }

  // Find active open conversation for THIS (customerId + branchId) pair
  let conv = await Conversation.findOne({
    customerId,
    branchId: targetBranch._id,
    status: 'Open',
  })
    .populate('customerId', 'username firstName lastName avatarUrl phoneNumber email roles')
    .populate('assignedStaffId', 'username firstName lastName avatarUrl roles branchId')
    .populate('branchId', 'name code address phone');

  if (!conv) {
    const supportStaff = await findBranchSupportStaff(targetBranch._id as mongoose.Types.ObjectId);

    const participants: mongoose.Types.ObjectId[] = [new mongoose.Types.ObjectId(customerId)];
    if (supportStaff?._id && supportStaff._id.toString() !== customerId) {
      participants.push(supportStaff._id as mongoose.Types.ObjectId);
    }

    const created = await Conversation.create({
      customerId: new mongoose.Types.ObjectId(customerId),
      assignedStaffId:
        supportStaff?._id && supportStaff._id.toString() !== customerId
          ? (supportStaff._id as mongoose.Types.ObjectId)
          : undefined,
      participants,
      branchId: targetBranch._id,
      status: 'Open',
      unreadCustomerCount: 0,
      unreadStaffCount: 0,
    });

    conv = await Conversation.findById(created._id)
      .populate('customerId', 'username firstName lastName avatarUrl phoneNumber email roles')
      .populate('assignedStaffId', 'username firstName lastName avatarUrl roles branchId')
      .populate('branchId', 'name code address phone');
  }

  return conv!;
};

/**
 * List all open conversations of a customer across branches (so customer sees unread counts per branch)
 */
export const getCustomerBranchConversations = async (
  customerId: string
): Promise<IConversation[]> => {
  return Conversation.find({ customerId, status: 'Open' })
    .sort({ lastMessageAt: -1 })
    .populate('assignedStaffId', 'username firstName lastName avatarUrl roles branchId')
    .populate('branchId', 'name code address phone');
};

/**
 * List paginated message history of a conversation
 */
export const getConversationMessages = async (
  conversationId: string,
  userId: string,
  limit = 50,
  before?: string
): Promise<{ messages: IMessage[]; hasMore: boolean }> => {
  if (!mongoose.isValidObjectId(conversationId)) {
    throw new AppError(400, 'ID hội thoại không hợp lệ.');
  }

  const conv = await Conversation.findById(conversationId);
  if (!conv) {
    throw new AppError(404, 'Không tìm thấy cuộc hội thoại.');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'Người dùng không tồn tại.');
  }

  // Authorization check: Customer owner, or Staff/BranchManager of the SAME branch, or SystemAdmin
  const isCustomerOwner = conv.customerId.toString() === userId;
  const isSameBranchStaff =
    ['Staff', 'BranchManager'].includes(user.roles) &&
    Boolean(
      user.branchId &&
        conv.branchId &&
        conv.branchId.toString() === user.branchId.toString()
    );
  const isAdmin = user.roles === 'SystemAdmin';

  if (!isCustomerOwner && !isSameBranchStaff && !isAdmin) {
    throw new AppError(403, 'Hội thoại này thuộc chi nhánh khác, bạn không có quyền truy cập.');
  }

  const query: Record<string, unknown> = { conversationId: conv._id };
  if (before && mongoose.isValidObjectId(before)) {
    const beforeMsg = await Message.findById(before);
    if (beforeMsg) {
      query.createdAt = { $lt: beforeMsg.createdAt };
    }
  }

  const safeLimit = Math.min(Math.max(1, limit), 100);

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(safeLimit + 1)
    .populate('senderId', 'username firstName lastName avatarUrl roles');

  const hasMore = messages.length > safeLimit;
  if (hasMore) {
    messages.pop();
  }

  return {
    messages: messages.reverse(),
    hasMore,
  };
};

/**
 * Send a message with deduplication by clientMsgId, HTML sanitization, and Branch-Scoped Socket broadcast
 */
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  rawContent: string,
  clientMsgId?: string
): Promise<IMessage> => {
  if (!mongoose.isValidObjectId(conversationId)) {
    throw new AppError(400, 'ID hội thoại không hợp lệ.');
  }

  const content = stripHtml(rawContent);
  if (!content) {
    throw new AppError(400, 'Nội dung tin nhắn không thể để trống.');
  }

  if (content.length > 2000) {
    throw new AppError(400, 'Độ dài tin nhắn không được vượt quá 2000 ký tự.');
  }

  const conv = await Conversation.findById(conversationId);
  if (!conv) {
    throw new AppError(404, 'Cuộc trò chuyện không tồn tại.');
  }

  const sender = await User.findById(senderId);
  if (!sender) {
    throw new AppError(404, 'Người gửi không tồn tại.');
  }

  const isStaff = ['Staff', 'BranchManager', 'SystemAdmin'].includes(sender.roles);
  const isSenderCustomerOwner = conv.customerId.toString() === senderId;

  // Enforce branch boundary for Staff/BranchManager
  if (
    ['Staff', 'BranchManager'].includes(sender.roles) &&
    !isSenderCustomerOwner &&
    sender.branchId &&
    conv.branchId &&
    sender.branchId.toString() !== conv.branchId.toString()
  ) {
    throw new AppError(403, 'Bạn chỉ có thể phản hồi khách hàng thuộc chi nhánh của mình.');
  }

  // Auto-reopen if previously closed
  if (conv.status === 'Closed') {
    conv.status = 'Open';
    conv.closedAt = undefined;
    conv.closedBy = undefined;
  }

  // Idempotency: Check if message with clientMsgId was already stored
  if (clientMsgId) {
    const existing = await Message.findOne({ conversationId: conv._id, clientMsgId }).populate(
      'senderId',
      'username firstName lastName avatarUrl roles'
    );
    if (existing) {
      return existing;
    }
  }

  if (!conv.participants.some((p) => p.toString() === senderId)) {
    conv.participants.push(new mongoose.Types.ObjectId(senderId));
  }

  // Assign staff of this branch if unassigned or replied by branch staff
  if (isStaff && !isSenderCustomerOwner) {
    conv.assignedStaffId = new mongoose.Types.ObjectId(senderId);
    if (!conv.branchId && sender.branchId) {
      conv.branchId = sender.branchId;
    }
  }

  const message = await Message.create({
    conversationId: conv._id,
    senderId: sender._id,
    clientMsgId,
    content,
    isRead: false,
  });

  // Update conversation last message and unread counters
  conv.lastMessageId = message._id as mongoose.Types.ObjectId;
  conv.lastMessageText = content.slice(0, 100);
  conv.lastMessageAt = new Date();

  if (isStaff && !isSenderCustomerOwner) {
    conv.unreadCustomerCount = (conv.unreadCustomerCount || 0) + 1;
    conv.unreadStaffCount = 0;
  } else {
    conv.unreadStaffCount = (conv.unreadStaffCount || 0) + 1;
  }

  await conv.save();

  const populatedMessage = await Message.findById(message._id).populate(
    'senderId',
    'username firstName lastName avatarUrl roles'
  );

  const updatedConv = await Conversation.findById(conv._id)
    .populate('customerId', 'username firstName lastName avatarUrl phoneNumber email roles')
    .populate('assignedStaffId', 'username firstName lastName avatarUrl roles branchId')
    .populate('branchId', 'name code address phone');

  // Broadcast ONLY to the specific conversation room and the specific Branch's staff room
  emitChatEvent(`conversation:${conv._id.toString()}`, 'chat:receive', populatedMessage);
  emitBranchStaffEvent(conv.branchId, 'chat:receive', populatedMessage);
  emitBranchStaffEvent(conv.branchId, 'chat:conversation_updated', updatedConv);
  emitChatEvent(`user:${conv.customerId.toString()}`, 'chat:conversation_updated', updatedConv);
  emitChatEvent(`user:${conv.customerId.toString()}`, 'chat:notify', {
    conversationId: conv._id.toString(),
    branchId: conv.branchId?.toString(),
    senderName: `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.username,
    content: content.slice(0, 100),
    createdAt: message.createdAt,
  });

  return populatedMessage || message;
};

/**
 * Mark messages in conversation as read and reset counters
 */
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  if (!mongoose.isValidObjectId(conversationId)) return;
  const conv = await Conversation.findById(conversationId);
  if (!conv) return;

  const user = await User.findById(userId);
  if (!user) return;

  const isStaff = ['Staff', 'BranchManager', 'SystemAdmin'].includes(user.roles);
  const isCustomerOwner = conv.customerId.toString() === userId;

  if (isStaff && !isCustomerOwner) {
    conv.unreadStaffCount = 0;
  } else {
    conv.unreadCustomerCount = 0;
  }

  await conv.save();

  await Message.updateMany(
    { conversationId: conv._id, senderId: { $ne: user._id }, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  emitChatEvent(`conversation:${conv._id.toString()}`, 'chat:read', {
    conversationId: conv._id.toString(),
    readBy: userId,
    readAt: new Date().toISOString(),
  });
};

/**
 * Staff console: List conversations strictly scoped to the Staff/BranchManager's own branchId
 */
export const getStaffConversations = async (
  staffUser: IUser,
  status: 'Open' | 'Closed' | 'All' = 'Open',
  requestedBranchId?: string
): Promise<IConversation[]> => {
  await ensureInitialConversations();

  const filter: Record<string, unknown> = {
    lastMessageText: { $exists: true, $nin: [null, ''] },
  };
  if (status === 'Open' || status === 'Closed') {
    filter.status = status;
  }

  if (['Staff', 'BranchManager'].includes(staffUser.roles)) {
    if (!staffUser.branchId) {
      return [];
    }
    filter.branchId = staffUser.branchId;
  } else if (staffUser.roles === 'SystemAdmin') {
    if (requestedBranchId && mongoose.isValidObjectId(requestedBranchId)) {
      filter.branchId = new mongoose.Types.ObjectId(requestedBranchId);
    }
  }

  return Conversation.find(filter)
    .sort({ lastMessageAt: -1 })
    .populate('customerId', 'username firstName lastName avatarUrl phoneNumber email roles')
    .populate('assignedStaffId', 'username firstName lastName avatarUrl roles branchId')
    .populate('branchId', 'name code address phone');
};

/**
 * Staff claim/assign conversation (scoped to branch)
 */
export const claimConversation = async (
  conversationId: string,
  staffUser: IUser
): Promise<IConversation> => {
  const conv = await Conversation.findById(conversationId);
  if (!conv) {
    throw new AppError(404, 'Không tìm thấy cuộc trò chuyện.');
  }

  if (
    ['Staff', 'BranchManager'].includes(staffUser.roles) &&
    staffUser.branchId &&
    conv.branchId &&
    staffUser.branchId.toString() !== conv.branchId.toString()
  ) {
    throw new AppError(403, 'Không thể nhận hội thoại thuộc chi nhánh khác.');
  }

  conv.assignedStaffId = staffUser._id as mongoose.Types.ObjectId;
  if (!conv.participants.some((p) => p.toString() === staffUser._id.toString())) {
    conv.participants.push(staffUser._id as mongoose.Types.ObjectId);
  }
  if (!conv.branchId && staffUser.branchId) {
    conv.branchId = staffUser.branchId;
  }
  await conv.save();

  const populated = await Conversation.findById(conv._id)
    .populate('customerId', 'username firstName lastName avatarUrl phoneNumber email roles')
    .populate('assignedStaffId', 'username firstName lastName avatarUrl roles branchId')
    .populate('branchId', 'name code address phone');

  emitChatEvent(`conversation:${conv._id.toString()}`, 'chat:conversation_updated', populated);
  emitBranchStaffEvent(conv.branchId, 'chat:conversation_updated', populated);

  return populated || conv;
};

/**
 * Close completed conversation
 */
export const closeConversation = async (
  conversationId: string,
  staffUser: IUser
): Promise<IConversation> => {
  const conv = await Conversation.findById(conversationId);
  if (!conv) {
    throw new AppError(404, 'Không tìm thấy cuộc trò chuyện.');
  }

  conv.status = 'Closed';
  conv.closedAt = new Date();
  conv.closedBy = staffUser._id as mongoose.Types.ObjectId;
  await conv.save();

  const populated = await Conversation.findById(conv._id)
    .populate('customerId', 'username firstName lastName avatarUrl phoneNumber email roles')
    .populate('assignedStaffId', 'username firstName lastName avatarUrl roles branchId')
    .populate('branchId', 'name code address phone');

  emitChatEvent(`conversation:${conv._id.toString()}`, 'chat:closed', {
    conversationId: conv._id.toString(),
    closedBy: staffUser.username,
    closedAt: conv.closedAt.toISOString(),
  });
  emitBranchStaffEvent(conv.branchId, 'chat:conversation_updated', populated);

  return populated || conv;
};

/**
 * Reopen a closed conversation
 */
export const reopenConversation = async (
  conversationId: string,
  user: IUser
): Promise<IConversation> => {
  const conv = await Conversation.findById(conversationId);
  if (!conv) {
    throw new AppError(404, 'Không tìm thấy cuộc trò chuyện.');
  }

  conv.status = 'Open';
  conv.closedAt = undefined;
  conv.closedBy = undefined;
  if (!conv.participants.some((p) => p.toString() === user._id.toString())) {
    conv.participants.push(user._id as mongoose.Types.ObjectId);
  }
  await conv.save();

  const populated = await Conversation.findById(conv._id)
    .populate('customerId', 'username firstName lastName avatarUrl phoneNumber email roles')
    .populate('assignedStaffId', 'username firstName lastName avatarUrl roles branchId')
    .populate('branchId', 'name code address phone');

  emitChatEvent(`conversation:${conv._id.toString()}`, 'chat:conversation_updated', populated);
  emitBranchStaffEvent(conv.branchId, 'chat:conversation_updated', populated);

  return populated || conv;
};
