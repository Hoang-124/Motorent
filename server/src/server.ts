import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

import { env } from './config/env';
import { connectDatabase } from './config/database';
import { errorHandler } from './core/errorHandler';
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded static files (avatars, eKYC licenses)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Mount Central Modular Monolith API
app.use('/api', apiRouter);

// Socket.IO event handling
io.on('connection', (socket) => {
  if (env.NODE_ENV === 'development') {
    console.log(`⚡ Socket connected: ${socket.id}`);
  }

  socket.on('join_conversation', (conversationId: string) => {
    socket.join(conversationId);
  });

  socket.on('leave_conversation', (conversationId: string) => {
    socket.leave(conversationId);
  });

  socket.on('disconnect', () => {
    if (env.NODE_ENV === 'development') {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    }
  });
});

// Central error handling middleware
app.use(errorHandler);

// Start server
const PORT = env.PORT || 5000;

export const startServer = async () => {
  await connectDatabase();
  server.listen(PORT, () => {
    console.log(`🚀 MOTORENT Server running on http://localhost:${PORT}`);
    console.log(`🔒 Security active: Helmet, Rate Limiter, CORS whitelist`);
    console.log(`🩺 Health check endpoint: http://localhost:${PORT}/api/health`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
