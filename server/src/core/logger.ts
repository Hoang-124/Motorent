import { env } from '../config/env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHTS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = env.NODE_ENV === 'production' ? 'info' : 'debug';

const sanitizeMessage = (message: string): string => {
  return message.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
};

const formatLog = (level: LogLevel, context: string, message: string, meta?: unknown): string => {
  const timestamp = new Date().toISOString();
  const cleanMsg = sanitizeMessage(message);
  let base = `[${timestamp}] [${level.toUpperCase()}] [${context}] ${cleanMsg}`;
  if (meta !== undefined) {
    try {
      base += ` | ${JSON.stringify(meta)}`;
    } catch {
      base += ` | [Non-serializable metadata]`;
    }
  }
  return base;
};

export const logger = {
  debug: (context: string, message: string, meta?: unknown): void => {
    if (LEVEL_WEIGHTS['debug'] >= LEVEL_WEIGHTS[currentLevel]) {
      console.debug(formatLog('debug', context, message, meta));
    }
  },

  info: (context: string, message: string, meta?: unknown): void => {
    if (LEVEL_WEIGHTS['info'] >= LEVEL_WEIGHTS[currentLevel]) {
      console.log(formatLog('info', context, message, meta));
    }
  },

  warn: (context: string, message: string, meta?: unknown): void => {
    if (LEVEL_WEIGHTS['warn'] >= LEVEL_WEIGHTS[currentLevel]) {
      console.warn(formatLog('warn', context, message, meta));
    }
  },

  error: (context: string, message: string, meta?: unknown): void => {
    if (LEVEL_WEIGHTS['error'] >= LEVEL_WEIGHTS[currentLevel]) {
      console.error(formatLog('error', context, message, meta));
    }
  },
};
