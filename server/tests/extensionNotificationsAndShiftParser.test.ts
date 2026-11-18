import { describe, it, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import {
  findMatchingStaffInBranch,
  parseMultiStaffAvailabilityText,
} from '../src/modules/hr/availabilityParser';
import { notifyBranchOperations } from '../src/core/notificationDispatch';
import { User } from '../src/models/User';
import { Notification } from '../src/models/Notification';

describe('Extension Operational Notifications & HR Shift Availability Parser', () => {
  it('dispatches booking extension notifications to Branch Staff, Managers, and SystemAdmins', async () => {
    const adminId = new mongoose.Types.ObjectId();
    const managerId = new mongoose.Types.ObjectId();
    const staffId = new mongoose.Types.ObjectId();
    const pickupBranchId = new mongoose.Types.ObjectId();
    const returnBranchId = new mongoose.Types.ObjectId();

    const findSpy = vi.spyOn(User, 'find').mockReturnValue({
      select: () => ({
        lean: async () => [{ _id: adminId }, { _id: managerId }, { _id: staffId }],
      }),
    } as unknown as ReturnType<typeof User.find>);

    const createdNotifications: Array<Record<string, unknown>> = [];
    const createSpy = vi
      .spyOn(Notification, 'create')
      .mockImplementation((async (doc: Record<string, unknown>) => {
        createdNotifications.push(doc);
        return doc;
      }) as unknown as typeof Notification.create);

    await notifyBranchOperations({
      branchIds: [pickupBranchId, returnBranchId],
      title: '[Gia hạn đơn thuê] Đơn #MV-EXT01 vừa gia hạn thêm',
      body: 'Khách hàng đã gia hạn đơn thuê xe thêm 24 giờ.',
      type: 'BOOKING',
      relatedId: new mongoose.Types.ObjectId().toString(),
    });

    expect(findSpy).toHaveBeenCalledTimes(1);
    expect(createdNotifications).toHaveLength(3);
    expect(createdNotifications.map((n) => String(n.userId))).toEqual([
      String(adminId),
      String(managerId),
      String(staffId),
    ]);

    findSpy.mockRestore();
    createSpy.mockRestore();
  });

  it('parses natural-language Vietnamese multi-staff shift availability accurately', () => {
    const staffRoster = [
      { _id: 's1', firstName: 'Trần Quang', lastName: 'Bửu Hoàng', username: 'hoangtqb', email: 'hoang@motorent.vn' },
      { _id: 's2', firstName: 'Phạm Quốc', lastName: 'Cả', username: 'capq', email: 'ca@motorent.vn' },
    ];

    const matched = findMatchingStaffInBranch('Buu Hoang', staffRoster);
    expect(matched?._id).toBe('s1');

    const weekMonday = new Date('2026-11-16T00:00:00.000Z');
    const parsed = parseMultiStaffAvailabilityText(
      'Bửu Hoàng: t2 1 2, t3 1 2, t7 bận\nPhạm Quốc Cả: t2 2 3, cn 1',
      staffRoster,
      weekMonday
    );

    expect(parsed).toHaveLength(2);
    expect(parsed[0].staffId).toBe('s1');
    expect(parsed[1].staffId).toBe('s2');
    expect(parsed[0].slots.length).toBeGreaterThan(0);
  });
});
