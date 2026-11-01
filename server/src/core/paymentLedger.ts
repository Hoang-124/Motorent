import type { FilterQuery } from 'mongoose';
import type { IPayment } from '../models/Payment';

const dateRange = (from?: Date, to?: Date): Record<string, Date> | null => {
  if (!from && !to) return null;
  return {
    ...(from ? { $gte: from } : {}),
    ...(to ? { $lte: to } : {}),
  };
};

export const paymentLedgerDateFilter = (from?: Date, to?: Date): FilterQuery<IPayment> => {
  const range = dateRange(from, to);
  if (!range) return {};

  return {
    $or: [
      { type: { $ne: 'REFUND' }, createdAt: range },
      { type: 'REFUND', status: { $ne: 'SUCCESS' }, createdAt: range },
      { type: 'REFUND', processedAt: range },
      { type: 'REFUND', status: 'SUCCESS', processedAt: { $exists: false }, createdAt: range },
    ],
  };
};

export const effectivePaymentDate = (payment: Pick<IPayment, 'type' | 'status' | 'createdAt' | 'processedAt'>): Date =>
  payment.type === 'REFUND' && payment.processedAt
    ? payment.processedAt || payment.createdAt
    : payment.createdAt;
