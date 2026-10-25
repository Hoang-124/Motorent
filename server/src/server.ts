import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Namespace, Socket } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

import jwt from 'jsonwebtoken';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { errorHandler } from './core/errorHandler';
import { setSocketServer } from './core/socketRegistry';
import { startBookingExpiryJob } from './core/jobs/bookingExpiryJob';
import { startOdometerAlertJob } from './core/jobs/odometerAlertJob';
import { User } from './models/User';
import { Booking } from './models/Booking';
import { Conversation } from './models/Conversation';
import * as chatService from './modules/chat/chatService';
import { adminBannerRouter, publicBannerRouter } from './modules/cms/bannerRoutes';
import { adminPageRouter, publicPageRouter } from './modules/cms/pageRoutes';
import {
  complaintRouter,
  customerComplaintRouter,
  staffComplaintRouter,
  managerComplaintRouter,
} from './modules/support/complaintRoutes';
import apiRouter from './routes';

export const app = express();
export const server = http.createServer(app);

// In-memory socket rate limiter tracker (10 msg / 10s per socket)
const socketMessageTimestamps = new Map<string, number[]>();

// CORS origin configuration
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'https://sandbox.vnpayment.vn',
];

// Socket.IO setup with restricted origins
export const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
      ) {
        callback(null, true);
      } else {
        callback(new Error('Chặn bởi chính sách bảo mật CORS của MOTORENT'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
});

setSocketServer(io);

// Global Security & Parsers Middlewares
app.set('trust proxy', env.TRUST_PROXY || 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
      ) {
        callback(null, true);
      } else {
        callback(new Error('Chặn bởi chính sách bảo mật CORS của MOTORENT'));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve uploaded static files (avatars, banners, reviews, complaints)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Mount Central Modular Monolith API
app.use('/api', apiRouter);

// Direct root route aliases for CMS Banners (UC-116, UC-117, UC-118)
app.use('/admin/banners', adminBannerRouter);
app.use('/banners', publicBannerRouter);

// Direct root route aliases for CMS Static Pages (UC-119)
app.use('/admin/pages', adminPageRouter);
app.use('/pages', publicPageRouter);

// Direct root route aliases for Complaints (UC-42, UC-43, UC-65, UC-85)
app.use('/me/complaints', customerComplaintRouter);
app.use('/complaints', complaintRouter);
app.use('/manager/complaints', managerComplaintRouter);
app.use('/staff/complaints', staffComplaintRouter);

// Reusable Socket.IO JWT Authentication Middleware
const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const rawToken =
      (typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : undefined) ||
      (typeof socket.handshake.headers?.authorization === 'string'
        ? socket.handshake.headers.authorization.replace('Bearer ', '')
        : undefined);

    if (!rawToken) {
      if (env.NODE_ENV === 'production') {
        return next(new Error('Yêu cầu token xác thực để kết nối Socket.IO.'));
      }
      return next();
    }

    const decoded = jwt.verify(rawToken, env.JWT_SECRET) as { userId: string; tokenVersion?: number };
    const user = await User.findById(decoded.userId);
    if (!user || user.status === 'Suspended') {
      return next(new Error('Tài khoản không tồn tại hoặc đã bị tạm khóa.'));
    }
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      return next(new Error('Phiên làm việc đã hết hạn.'));
    }

    socket.data.user = user;
    next();
  } catch {
    next(new Error('Token Socket không hợp lệ hoặc đã hết hạn.'));
  }
};

// Reusable Socket.IO Connection Handler for both "/" and "/chat" namespaces
const attachSocketHandlers = (nsp: SocketIOServer | Namespace) => {
  nsp.use(socketAuthMiddleware);

  nsp.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    if (user?._id) {
      socket.join(`user:${user._id}`);
      if (['Staff', 'BranchManager'].includes(user.roles) && user.branchId) {
        socket.join(`staff:branch:${user.branchId.toString()}`);
      }
    }

    socket.on('join_staff_console', (branchId?: string) => {
      if (!user) return;
      if (['Staff', 'BranchManager'].includes(user.roles) && user.branchId) {
        socket.join(`staff:branch:${user.branchId.toString()}`);
      } else if (user.roles === 'SystemAdmin' && branchId) {
        socket.join(`staff:branch:${branchId}`);
      }
    });

    socket.on(
      'join_booking',
      async (bookingId: string, ack?: (res: { success: boolean; message?: string }) => void) => {
        if (!bookingId || !user) {
          if (typeof ack === 'function') ack({ success: false, message: 'Yêu cầu đăng nhập xác thực.' });
          return;
        }
        const booking = await Booking.findById(bookingId);
        if (!booking) {
          if (typeof ack === 'function') ack({ success: false, message: 'Không tìm thấy đơn đặt xe.' });
          return;
        }

        const isOwner = booking.userId.toString() === user._id.toString();
        const isBranchStaff =
          ['Staff', 'BranchManager', 'SystemAdmin'].includes(user.roles) &&
          (!user.branchId ||
            booking.pickupBranchId.toString() === user.branchId.toString() ||
            booking.returnBranchId.toString() === user.branchId.toString());

        if (isOwner || isBranchStaff) {
          socket.join(`booking:${bookingId}`);
          if (typeof ack === 'function') {
            ack({ success: true, message: `Đã kết nối theo dõi thời gian thực đơn ${booking.bookingCode}.` });
          }
        } else {
          if (typeof ack === 'function') {
            ack({ success: false, message: 'Bạn không có quyền theo dõi đơn đặt xe này.' });
          }
        }
      }
    );

    socket.on('leave_booking', (bookingId: string, ack?: () => void) => {
      socket.leave(`booking:${bookingId}`);
      if (typeof ack === 'function') ack();
    });

    socket.on('join_conversation', async (conversationId: string) => {
      if (!conversationId || !user) return;
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;

      const isCustomerOwner = conversation.customerId.toString() === user._id.toString();
      const isSameBranchStaff =
        ['Staff', 'BranchManager'].includes(user.roles) &&
        Boolean(
          user.branchId &&
            conversation.branchId &&
            conversation.branchId.toString() === user.branchId.toString()
        );

      if (isCustomerOwner || isSameBranchStaff || user.roles === 'SystemAdmin') {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on(
      'chat:send',
      async (
        data: { conversationId: string; content: string; clientMsgId?: string },
        ack?: (res: { success: boolean; messageId?: unknown; clientMsgId?: string; data?: unknown; error?: string }) => void
      ) => {
        if (!user) {
          if (ack) ack({ success: false, error: 'Chưa xác thực người dùng.' });
          return;
        }

        const now = Date.now();
        const timestamps = (socketMessageTimestamps.get(socket.id) || []).filter((t) => now - t < 10000);
        if (timestamps.length >= 10) {
          if (ack) {
            ack({
              success: false,
              error: 'Bạn đang gửi tin nhắn quá nhanh. Vui lòng chậm lại (tối đa 10 tin/10 giây).',
            });
          }
          return;
        }
        timestamps.push(now);
        socketMessageTimestamps.set(socket.id, timestamps);

        try {
          const message = await chatService.sendMessage(
            data.conversationId,
            user._id.toString(),
            data.content,
            data.clientMsgId
          );
          if (ack) {
            ack({
              success: true,
              messageId: message._id,
              clientMsgId: data.clientMsgId,
              data: message,
            });
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Không thể gửi tin nhắn';
          if (ack) ack({ success: false, error: msg });
        }
      }
    );

    socket.on('chat:typing', (data: { conversationId: string; isTyping: boolean }) => {
      if (!user || !data?.conversationId) return;
      const payload = {
        conversationId: data.conversationId,
        userId: user._id.toString(),
        username: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
        role: user.roles,
        isTyping: Boolean(data.isTyping),
      };
      socket.to(`conversation:${data.conversationId}`).emit('chat:typing', payload);
      socket.to('staff:console').emit('chat:typing', payload);
    });

    socket.on('chat:read', async (data: { conversationId: string }) => {
      if (!user || !data?.conversationId) return;
      try {
        await chatService.markMessagesAsRead(data.conversationId, user._id.toString());
      } catch {
        // Ignore read receipt error
      }
    });

    socket.on('disconnect', () => {
      socketMessageTimestamps.delete(socket.id);
    });
  });
};

// Attach handlers to both default "/" and "/chat" namespaces (UC-44 & UC-66)
attachSocketHandlers(io);
attachSocketHandlers(io.of('/chat'));

// Central error handling middleware
app.use(errorHandler);

// Start server
const PORT = env.PORT || 5000;

export const startServer = async () => {
  if (server.listening) return;
  await connectDatabase();
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(PORT);
  });
  startBookingExpiryJob();
  startOdometerAlertJob();
  console.log(`[SERVER] MOTORENT Server running on http://localhost:${PORT}`);
  console.log(`[SECURITY] Active: Helmet, Rate Limiter, CORS whitelist, Trust Proxy: ${env.TRUST_PROXY || 1}`);
  console.log(`[HEALTH] Health check endpoint: http://localhost:${PORT}/api/health`);
};

if (process.env.NODE_ENV !== 'test') {
  void startServer().catch(async (error: NodeJS.ErrnoException) => {
    console.error(
      error.code === 'EADDRINUSE'
        ? `[SERVER] Cổng ${PORT} đang được sử dụng. Dừng lần chạy cũ bằng Ctrl+C hoặc dùng npm run dev tại thư mục gốc.`
        : `[SERVER] Không khởi động được: ${error.message}`
    );
    await import('mongoose').then(({ default: mongoose }) => mongoose.disconnect());
    process.exitCode = 1;
  });
}
