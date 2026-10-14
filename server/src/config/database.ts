import mongoose from 'mongoose';
import { env } from './env';

export const connectDatabase = async (customUri?: string): Promise<void> => {
  const uri = customUri || (process.env.NODE_ENV === 'test' ? env.MONGODB_URI_TEST : env.MONGODB_URI);
  if (mongoose.connection.readyState === 1) {
    return;
  }
  try {
    await mongoose.connect(uri);
    if (env.NODE_ENV !== 'test') {
      console.log(`[DB] MongoDB connected successfully to ${uri}`);
    }
  } catch (error) {
    console.error('[DB] MongoDB connection error:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};
