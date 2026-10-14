import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

export class AppError extends Error {
  public statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Đã xảy ra lỗi không xác định.';
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  } else if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'CastError') {
    statusCode = 400;
    message = 'Tham số định danh hoặc kiểu dữ liệu không hợp lệ.';
  } else if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
    statusCode = 409;
    message = 'Dữ liệu đã tồn tại trên hệ thống (Trùng lặp trường duy nhất).';
  } else if (err instanceof Error) {
    message = err.message;
    if ('statusCode' in err && typeof (err as { statusCode?: unknown }).statusCode === 'number') {
      statusCode = (err as { statusCode: number }).statusCode;
    }
  }

  // Obfuscate 500 internal server error messages in production
  if (statusCode === 500 && env.NODE_ENV === 'production') {
    message = 'Đã có lỗi xảy ra trên hệ thống máy chủ. Vui lòng thử lại sau.';
  }

  if (env.NODE_ENV === 'development') {
    console.error(`[ERROR] [${req.method}] ${req.url} -> Status ${statusCode}:`, err);
  } else if (statusCode >= 500) {
    console.error(`[SERVER ERROR] [${req.method}] ${req.url} ->`, getErrorMessage(err));
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: env.NODE_ENV === 'development' && err instanceof Error ? err.stack : undefined,
  });
};
