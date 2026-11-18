import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { withResourceLock } from '../src/core/resourceLock';
import { withOptionalTransaction } from '../src/core/transaction';
import { hasPermission, assertBranchAccess } from '../src/core/permissions';
import { AppError } from '../src/core/errorHandler';

describe('Concurrency Lock, Transaction Fallback & RBAC Security', () => {
  it('serializes concurrent vehicle booking attempts in strict FIFO order without race overlap', async () => {
    const vehicleKey = 'vehicle:671230000000000000000099';
    const executionTimeline: string[] = [];
    let activeWorkers = 0;
    let maxConcurrentObserved = 0;

    const simulateBookingAttempt = (id: number, delayMs: number) =>
      withResourceLock(vehicleKey, async () => {
        activeWorkers += 1;
        maxConcurrentObserved = Math.max(maxConcurrentObserved, activeWorkers);
        executionTimeline.push(`start-${id}`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        executionTimeline.push(`end-${id}`);
        activeWorkers -= 1;
        return id;
      });

    const results = await Promise.all([
      simulateBookingAttempt(1, 25),
      simulateBookingAttempt(2, 15),
      simulateBookingAttempt(3, 10),
    ]);

    expect(results).toEqual([1, 2, 3]);
    expect(maxConcurrentObserved).toBe(1);
    expect(executionTimeline).toEqual([
      'start-1',
      'end-1',
      'start-2',
      'end-2',
      'start-3',
      'end-3',
    ]);
  });

  it('executes work cleanly via withOptionalTransaction when DB connection is offline', async () => {
    const value = await withOptionalTransaction(async (session) => {
      expect(session).toBeUndefined();
      return 'OK_STANDALONE';
    });
    expect(value).toBe('OK_STANDALONE');
  });

  it('enforces RBAC permission matrix across all 4 roles', () => {
    expect(hasPermission('SystemAdmin', 'BRANCH_MANAGE')).toBe(true);
    expect(hasPermission('BranchManager', 'BRANCH_MANAGE')).toBe(false);
    expect(hasPermission('BranchManager', 'VEHICLE_MANAGE')).toBe(true);
    expect(hasPermission('Staff', 'BOOKING_CHECKIN')).toBe(true);
    expect(hasPermission('Customer', 'BOOKING_CHECKIN')).toBe(false);
    expect(hasPermission('Customer', 'BOOKING_CREATE')).toBe(true);
  });

  it('enforces branch isolation in assertBranchAccess (including populated branch objects)', () => {
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();

    // SystemAdmin bypasses branch restriction
    expect(() =>
      assertBranchAccess({ roles: 'SystemAdmin' }, branchA)
    ).not.toThrow();

    // Staff with populated branch object matching branchA succeeds
    expect(() =>
      assertBranchAccess({ roles: 'Staff', branchId: { _id: branchA } }, [branchA, branchB])
    ).not.toThrow();

    // BranchManager accessing another branch throws 403
    expect(() =>
      assertBranchAccess({ roles: 'BranchManager', branchId: branchA }, branchB)
    ).toThrowError(AppError);
  });
});
