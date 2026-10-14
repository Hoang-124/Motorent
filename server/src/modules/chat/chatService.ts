import mongoose from 'mongoose';
import { Conversation, IConversation } from '../../models/Conversation';
import { Message, IMessage } from '../../models/Message';
import { User, IUser } from '../../models/User';
import { AppError } from '../../core/errorHandler';
import { io } from '../../server';
import { assertBranchAccess } from '../../core/permissions';

const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>?/gm, '').trim();
};

/**
 * Get active open conversation for customer or create a new one
 */
export const getOrCreateCustomerConversation = async (
  customerId: string,
  branchId?: string
): Promise<IConversation> => {
  const customer = await User.findById(customerId);
  if (!customer) {
    throw new AppError(404, 'Tài khoản khách hàng không tồn tại.');
  }

  // A customer can have at most 1 open conversation at a time
  let conv = await Conversation.findOne({ customerId, status: 'Open' })
    .populate('assignedStaffId', 'username firstName lastName avatarUrl')
    .populate('branchId', 'name code address');

  if (!conv) {
    const participants = [new mongoose.Types.ObjectId(customerId)];
    conv = await Conversation.create({
      customerId: new mongoose.Types.ObjectId(customerId),
      participants,
      branchId: branchId && mongoose.isValidObjectId(branchId) ? new mongoose.Types.ObjectId(branchId) : undefined,
      status: 'Open',
      unreadCustomerCount: 0,
      unreadStaffCount: 0,
    });
  }

  return conv;
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

  // Authorization check: Must be participant or Staff/Manager/Admin
  const isParticipant = conv.participants.some((p) => p.toString() === userId);
  const isStaff = ['Staff', 'BranchManager', 'SystemAdmin'].includes(user.roles);
  if (!isParticipant && !isStaff) {
    throw new AppError(403, 'Bạn không có quyền truy cập vào hội thoại này.');
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

  // Return in chronological order
  return {
    messages: messages.reverse(),
    hasMore,
  };
};

/**
 * Send a message with deduplication by clientMsgId, HTML sanitization, and real-time Socket broadcast
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

  if (conv.status === 'Closed') {
    throw new AppError(400, 'Cuộc trò chuyện này đã kết thúc. Vui lòng mở phiên hỗ trợ mới.');
  }

  const sender = await User.findById(senderId);
  if (!sender) {
    throw new AppError(404, 'Người gửi không tồn tại.');
  }

  // Idempotency: Check if message with clientMsgId was already stored
  if (clientMsgId) {
    const existing = await Message.findOne({ conversationId: conv._id, clientMsgId })
      .populate('senderId', 'username firstName lastName avatarUrl roles');
    if (existing) {
      return existing;
    }
  }

  const isStaff = ['Staff', 'BranchManager', 'SystemAdmin'].includes(sender.roles);

  // Add sender to participants if not present
  if (!conv.participants.some((p) => p.toString() === senderId)) {
    conv.participants.push(new mongoose.Types.ObjectId(senderId));
  }

  // Auto-assign staff if unassigned and sender is staff
  if (isStaff && !conv.assignedStaffId) {
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

  if (isStaff) {
    conv.unreadCustomerCount = (conv.unreadCustomerCount || 0) + 1;
  } else {
    conv.unreadStaffCount = (conv.unreadStaffCount || 0) + 1;
  }

  await conv.save();

  const populatedMessage = await Message.findById(message._id)
    .populate('senderId', 'username firstName lastName avatarUrl roles');

  // Broadcast real-time message via Socket.IO
  if (io) {
    io.to(`conversation:${conv._id.toString()}`).emit('chat:receive', populatedMessage);
    // Also notify direct customer user room
    io.to(`user:${conv.customerId.toString()}`).emit('chat:notify', {
      conversationId: conv._id.toString(),
      senderName: `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.username,
      content: content.slice(0, 100),
      createdAt: message.createdAt,
    });
  }

  return populatedMessage || message;
};

/**
 * Mark messages in conversation as read and reset counters
 */
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  const conv = await Conversation.findById(conversationId);
  if (!conv) return;

  const user = await User.findById(userId);
  if (!user) return;

  const isStaff = ['Staff', 'BranchManager', 'SystemAdmin'].includes(user.roles);

  if (isStaff) {
    conv.unreadStaffCount = 0;
  } else {
    conv.unreadCustomerCount = 0;
  }

  await conv.save();

  await Message.updateMany(
    { conversationId: conv._id, senderId: { $ne: user._id }, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  if (io) {
    io.to(`conversation:${conv._id.toString()}`).emit('chat:read', {
      conversationId: conv._id.toString(),
      readBy: userId,
      readAt: new Date().toISOString(),
    });
  }
};

/**
 * Staff console: List conversations for branch staff with filters
 */
export const getStaffConversations = async (
  staffUser: IUser,
  status: 'Open' | 'Closed' = 'Open'
): Promise<IConversation[]> => {
  const filter: Record<string, unknown> = { status };

  // If BranchManager or Staff, filter by assigned branch
  if (staffUser.roles === 'BranchManager' || staffUser.roles === 'Staff') {
    if (staffUser.branchId) {
      filter.$or = [
        { branchId: staffUser.branchId },
        { branchId: { $exists: false } },
        { branchId: null },
      ];
    }
  }

  return Conversation.find(filter)
    .sort({ lastMessageAt: -1 })
    .populate('customerId', 'username firstName lastName avatarUrl phoneNumber')
    .populate('assignedStaffId', 'username firstName lastName avatarUrl')
    .populate('branchId', 'name code');
};

/**
 * Staff claim/assign conversation
 */
export const claimConversation = async (
  conversationId: string,
  staffUser: IUser
): Promise<IConversation> => {
  const conv = await Conversation.findById(conversationId);
  if (!conv) {
    throw new AppError(404, 'Không tìm thấy cuộc trò chuyện.');
  }

  if (conv.branchId && staffUser.roles !== 'SystemAdmin') {
    assertBranchAccess(staffUser, conv.branchId);
  }

  conv.assignedStaffId = staffUser._id as mongoose.Types.ObjectId;
  if (!conv.participants.some((p) => p.toString() === staffUser._id.toString())) {
    conv.participants.push(staffUser._id as mongoose.Types.ObjectId);
  }
  await conv.save();

  return conv;
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

  if (conv.branchId && staffUser.roles !== 'SystemAdmin') {
    assertBranchAccess(staffUser, conv.branchId);
  }

  conv.status = 'Closed';
  conv.closedAt = new Date();
  conv.closedBy = staffUser._id as mongoose.Types.ObjectId;
  await conv.save();

  if (io) {
    io.to(`conversation:${conv._id.toString()}`).emit('chat:closed', {
      conversationId: conv._id.toString(),
      closedBy: staffUser.username,
      closedAt: conv.closedAt.toISOString(),
    });
  }

  return conv;
};
