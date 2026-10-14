import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
    const token = localStorage.getItem('motorent_token') || '';

    socket = io(wsUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect_error', (err) => {
      // Refresh token on reconnect attempt
      const refreshedToken = localStorage.getItem('motorent_token') || '';
      if (socket && refreshedToken) {
        socket.auth = { token: refreshedToken };
      }
    });
  }

  return socket;
};

export const updateSocketAuth = (token: string): void => {
  if (socket) {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
  }
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
