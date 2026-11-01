import type { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

export const setSocketServer = (io: SocketIOServer): void => {
  ioInstance = io;
};

export const getSocketServer = (): SocketIOServer | null => {
  return ioInstance;
};

export const emitUserRealtimeEvent = (userId: string, event: string, payload: unknown): void => {
  try {
    if (!ioInstance || !userId) return;
    ioInstance.to(`user:${userId}`).emit(event, payload);
  } catch {
    // Non-blocking real-time push
  }
};
