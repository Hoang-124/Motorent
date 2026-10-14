import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

import jwt from 'jsonwebtoken';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { errorHandler } from './core/errorHandler';
import { startBookingExpiryJob } from './core/jobs/bookingExpiryJob';
import { User } from './models/User';
import { Booking } from './models/Booking';
import { Conversation } from './models/Conversation';
import apiRouter from './routes';

export const app = express();
export const server = http.createServer(app);

// CORS origin configuration
const allowedOrigins = [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'];

// Socket.IO setup with restricted origins
export const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
});

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
      // Allow requests with no origin (like mobile apps, curl) or matched origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Chặn bởi chính sách bảo mật CORS của MOTORENT'));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve uploaded static files (avatars)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Mount Central Modular Monolith API
app.use('/api', apiRouter);

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const rawToken =
      (typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : undefined) ||
      (typeof socket.handshake.headers?.authorization === 'string'
        ? socket.handshake.headers.authorization.replace('Bearer ', '')
        : undefined);

    // Allow anonymous socket connections only in development/test if not provided, otherwise require JWT
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
    if (decoded.tokenVersion === undefined || user.tokenVersion !== decoded.tokenVersion) {
      return next(new Error('Phiên làm việc đã hết hạn.'));
    }

    socket.data.user = user;
    next();
  } catch (err) {
    next(new Error('Token Socket không hợp lệ hoặc đã hết hạn.'));
  }
});

// Socket.IO event handling
io.on('connection', (socket) => {
  const user = socket.data.user;
  if (user?._id) {
    socket.join(`user:${user._id}`);
  }

  if (env.NODE_ENV === 'development') {
    console.log(`[SOCKET] Connected: ${socket.id} (User: ${user?.username || 'Guest'})`);
  }

  socket.on('join_booking', async (bookingId: string) => {
    if (!bookingId || !user) return;
    const booking = await Booking.findById(bookingId);
    if (!booking) return;

    const isOwner = booking.userId.toString() === user._id.toString();
    const isBranchStaff =
      ['Staff', 'BranchManager', 'SystemAdmin'].includes(user.roles) &&
      (!user.branchId ||
        booking.pickupBranchId.toString() === user.branchId.toString() ||
        booking.returnBranchId.toString() === user.branchId.toString());

    if (isOwner || isBranchStaff) {
      socket.join(`booking:${bookingId}`);
    }
  });

  socket.on('leave_booking', (bookingId: string) => {
    socket.leave(`booking:${bookingId}`);
  });

  socket.on('join_conversation', async (conversationId: string) => {
    if (!conversationId || !user) return;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return;

    const isParticipant =
      conversation.participants.some((p: { toString(): string }) => p.toString() === user._id.toString()) ||
      ['Staff', 'BranchManager', 'SystemAdmin'].includes(user.roles);

    if (isParticipant) {
      socket.join(`conversation:${conversationId}`);
    }
  });

  socket.on('leave_conversation', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on('disconnect', () => {
    if (env.NODE_ENV === 'development') {
      console.log(`[SOCKET] Disconnected: ${socket.id}`);
    }
  });
});

// Central error handling middleware
app.use(errorHandler);

// Start server
const PORT = env.PORT || 5000;

export const startServer = async () => {
  await connectDatabase();
  startBookingExpiryJob();
  server.listen(PORT, () => {
    console.log(`[SERVER] MOTORENT Server running on http://localhost:${PORT}`);
    console.log(`[SECURITY] Active: Helmet, Rate Limiter, CORS whitelist, Trust Proxy: ${env.TRUST_PROXY || 1}`);
    console.log(`[HEALTH] Health check endpoint: http://localhost:${PORT}/api/health`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
