import { io, Socket } from 'socket.io-client';
import { getActiveAuthToken } from './api';

const getSocketBaseUrl = (): string => {
  const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

let rootSocket: Socket | null = null;
let lastRootToken: string | null = null;

let chatSocket: Socket | null = null;
let lastChatToken: string | null = null;

/**
 * Connect to default Socket.IO namespace "/" (UC-37 Real-time booking status)
 */
export const getSocket = (): Socket => {
  const token = getActiveAuthToken() || '';

  if (rootSocket && lastRootToken === token) {
    if (!rootSocket.connected) {
      rootSocket.connect();
    }
    return rootSocket;
  }

  if (rootSocket) {
    rootSocket.disconnect();
  }

  lastRootToken = token;
  const baseUrl = getSocketBaseUrl();

  rootSocket = io(baseUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return rootSocket;
};

/**
 * Connect to Socket.IO /chat namespace (UC-44 Live Chat & UC-66 Staff Reply Chat)
 */
export const getChatSocket = (): Socket => {
  const token = getActiveAuthToken() || '';

  if (chatSocket && lastChatToken === token) {
    if (!chatSocket.connected) {
      chatSocket.connect();
    }
    return chatSocket;
  }

  if (chatSocket) {
    chatSocket.disconnect();
  }

  lastChatToken = token;
  const baseUrl = getSocketBaseUrl();

  chatSocket = io(`${baseUrl}/chat`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return chatSocket;
};

export const disconnectSocket = (): void => {
  if (rootSocket) {
    rootSocket.disconnect();
    rootSocket = null;
    lastRootToken = null;
  }
  if (chatSocket) {
    chatSocket.disconnect();
    chatSocket = null;
    lastChatToken = null;
  }
};

export const disconnectChatSocket = disconnectSocket;
