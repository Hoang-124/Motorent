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
  } else if (err instanceof Error) {
    message = err.message;
    if ('statusCode' in err && typeof (err as { statusCode?: unknown }).statusCode === 'number') {
      statusCode = (err as { statusCode: number }).statusCode;
    }
  }

  if (env.NODE_ENV === 'development') {
    console.error(`❌ [${req.method}] ${req.url} -> Error:`, err);
  } else if (statusCode >= 500) {
    console.error(`❌ [${req.method}] ${req.url} -> Server Error:`, getErrorMessage(err));
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: env.NODE_ENV === 'development' && err instanceof Error ? err.stack : undefined,
  });
};
