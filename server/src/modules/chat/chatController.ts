import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import * as chatService from './chatService';
import { AppError } from '../../core/errorHandler';

const sendMessageSchema = z.object({
  content: z.string().trim().min(1, 'Nội dung tin nhắn không thể để trống').max(2000),
  clientMsgId: z.string().trim().optional(),
});

export const getMyConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : undefined;
    const conversation = await chatService.getOrCreateCustomerConversation(
      req.user._id.toString(),
      branchId
    );

    res.json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const conversationId = req.params.conversationId;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const before = typeof req.query.before === 'string' ? req.query.before : undefined;

    const result = await chatService.getConversationMessages(
      conversationId,
      req.user._id.toString(),
      limit,
      before
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const conversationId = req.params.conversationId;
    const data = sendMessageSchema.parse(req.body);

    const message = await chatService.sendMessage(
      conversationId,
      req.user._id.toString(),
      data.content,
      data.clientMsgId
    );

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    await chatService.markMessagesAsRead(req.params.conversationId, req.user._id.toString());
    res.json({ success: true, message: 'Đã đánh dấu đã đọc.' });
  } catch (error) {
    next(error);
  }
};

export const getStaffConversations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const status = (req.query.status as 'Open' | 'Closed') || 'Open';
    const conversations = await chatService.getStaffConversations(req.user, status);

    res.json({ success: true, data: { items: conversations, total: conversations.length } });
  } catch (error) {
    next(error);
  }
};

export const claimConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const conversation = await chatService.claimConversation(req.params.conversationId, req.user);
    res.json({ success: true, message: 'Đã nhận cuộc trò chuyện hỗ trợ.', data: conversation });
  } catch (error) {
    next(error);
  }
};

export const closeConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const conversation = await chatService.closeConversation(req.params.conversationId, req.user);
    res.json({ success: true, message: 'Đã đóng cuộc trò chuyện hỗ trợ.', data: conversation });
  } catch (error) {
    next(error);
  }
};
