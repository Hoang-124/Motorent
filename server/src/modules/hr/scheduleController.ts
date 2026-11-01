import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { StaffSchedule, User, Branch, AuditLog } from '../../models';
import { AuthenticatedRequest } from '../../core/authMiddleware';

const SHIFT_HOURS = {
  Morning: { startHour: 7, startMinute: 0, endHour: 12, endMinute: 0 },
  Afternoon: { startHour: 12, startMinute: 0, endHour: 17, endMinute: 0 },
  Evening: { startHour: 17, startMinute: 0, endHour: 22, endMinute: 0 },
  FullDay: { startHour: 7, startMinute: 0, endHour: 22, endMinute: 0 },
};

/**
 * Get schedules with filtering by branch, staff, date range (Shift Calendar View)
 */
export const getSchedules = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userRole = req.user?.roles;
    const query: Record<string, any> = {};

    if (userRole === 'Staff') {
      // Staff can see all schedules of their branch or their own
      query.branchId = req.user?.branchId;
    } else if (userRole === 'BranchManager') {
      query.branchId = req.user?.branchId;
    } else if (req.query.branchId) {
      query.branchId = req.query.branchId;
    }

    if (req.query.staffId) {
      query.staffId = req.query.staffId;
    }

    if (req.query.startDate && req.query.endDate) {
      const start = new Date(req.query.startDate as string);
      start.setHours(0, 0, 0, 0);
      const end = new Date(req.query.endDate as string);
      end.setHours(23, 59, 59, 999);
      query.shiftDate = { $gte: start, $lte: end };
    } else if (req.query.date) {
      const d = new Date(req.query.date as string);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      query.shiftDate = { $gte: start, $lte: end };
    }

    const schedules = await StaffSchedule.find(query)
      .populate('staffId', 'firstName lastName email phoneNumber roles username avatar')
      .populate('branchId', 'name code address')
      .populate('assignedBy', 'firstName lastName')
      .sort({ shiftDate: 1, shiftType: 1 });

    res.json({
      success: true,
      count: schedules.length,
      data: schedules,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign Shift to staff (UC-84)
 * Role: BranchManager, SystemAdmin
 * Enforces no shift overlap for same staff on same day & shift
 */
export const createSchedule = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { staffId, branchId: reqBranchId, shiftDate, shiftType, notes } = req.body;

    const userRole = req.user?.roles;
    let targetBranchId = reqBranchId;

    if (userRole === 'BranchManager') {
      targetBranchId = req.user?.branchId;
    }

    if (!staffId || !shiftDate || !shiftType) {
      res.status(400).json({ success: false, message: 'Vui lòng chọn nhân viên, ngày trực và ca trực.' });
      return;
    }

    // Verify staff exists and is Staff
    const staff = await User.findById(staffId);
    if (!staff || staff.roles !== 'Staff') {
      res.status(400).json({ success: false, message: 'Nhân viên không hợp lệ hoặc không có quyền Staff.' });
      return;
    }

    if (userRole === 'BranchManager' && String(staff.branchId) !== String(targetBranchId)) {
      res.status(403).json({ success: false, message: 'Nhân viên này không thuộc chi nhánh bạn quản lý.' });
      return;
    }

    const dateObj = new Date(shiftDate);
    const dayStart = new Date(dateObj);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dateObj);
    dayEnd.setHours(23, 59, 59, 999);

    // Check overlap: Same staff cannot have the exact same shiftType or FullDay on the same date
    const existing = await StaffSchedule.findOne({
      staffId,
      shiftDate: { $gte: dayStart, $lte: dayEnd },
      $or: [
        { shiftType },
        { shiftType: 'FullDay' },
        ...(shiftType === 'FullDay' ? [{ shiftType: { $in: ['Morning', 'Afternoon', 'Evening'] } }] : []),
      ],
    });

    if (existing) {
      res.status(409).json({
        success: false,
        message: `Trùng lịch trực: Nhân viên đã được xếp ca ${existing.shiftType} trong ngày này.`,
      });
      return;
    }

    const newSchedule = await StaffSchedule.create({
      staffId,
      branchId: targetBranchId || staff.branchId,
      shiftDate: dayStart,
      shiftType,
      status: 'Assigned',
      assignedBy: req.user?._id,
      notes: notes || '',
    });

    const populated = await StaffSchedule.findById(newSchedule._id)
      .populate('staffId', 'firstName lastName email phoneNumber')
      .populate('branchId', 'name code');

    await AuditLog.create({
      userId: req.user?._id,
      action: 'ASSIGN_SHIFT',
      entityType: 'StaffSchedule',
      entityId: newSchedule._id,
      details: {
        staffName: `${staff.firstName} ${staff.lastName}`,
        shiftDate: dayStart.toISOString().slice(0, 10),
        shiftType,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Xếp ca trực thành công.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Shift Schedule (UC-84)
 */
export const updateSchedule = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { shiftType, status, notes } = req.body;

    const schedule = await StaffSchedule.findById(id);
    if (!schedule) {
      res.status(404).json({ success: false, message: 'Không tìm thấy ca trực.' });
      return;
    }

    if (req.user?.roles === 'BranchManager') {
      if (String(schedule.branchId) !== String(req.user.branchId)) {
        res.status(403).json({ success: false, message: 'Bạn không có quyền quản lý ca trực của chi nhánh khác.' });
        return;
      }
    }

    if (shiftType) schedule.shiftType = shiftType;
    if (status) schedule.status = status;
    if (notes !== undefined) schedule.notes = notes;

    await schedule.save();

    res.json({
      success: true,
      message: 'Cập nhật ca trực thành công.',
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete / Cancel Shift
 */
export const deleteSchedule = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const schedule = await StaffSchedule.findById(id);
    if (!schedule) {
      res.status(404).json({ success: false, message: 'Không tìm thấy ca trực.' });
      return;
    }

    if (req.user?.roles === 'BranchManager') {
      if (String(schedule.branchId) !== String(req.user.branchId)) {
        res.status(403).json({ success: false, message: 'Bạn không có quyền xóa ca trực của chi nhánh khác.' });
        return;
      }
    }

    await StaffSchedule.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Đã hủy ca trực thành công.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clock In / Out (Attendance Recording)
 * Checks timestamp, flags late if >15 minutes past shift start time
 */
export const clockAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const schedule = await StaffSchedule.findById(id).populate('staffId', 'firstName lastName');

    if (!schedule) {
      res.status(404).json({ success: false, message: 'Không tìm thấy ca trực.' });
      return;
    }

    // Must be the staff member themselves or their manager
    const isSelf = String(schedule.staffId._id) === String(req.user?._id);
    const isManager = req.user?.roles === 'BranchManager' && String(schedule.branchId) === String(req.user.branchId);
    const isAdmin = req.user?.roles === 'SystemAdmin';

    if (!isSelf && !isManager && !isAdmin) {
      res.status(403).json({ success: false, message: 'Không có quyền điểm danh ca trực này.' });
      return;
    }

    const now = new Date();

    if (!schedule.checkInTime) {
      // Clock IN
      schedule.checkInTime = now;
      schedule.status = 'Present';

      // Determine late flag (>15 minutes)
      const shiftConfig = SHIFT_HOURS[schedule.shiftType as keyof typeof SHIFT_HOURS] || SHIFT_HOURS.Morning;
      const expectedStart = new Date(schedule.shiftDate);
      expectedStart.setHours(shiftConfig.startHour, shiftConfig.startMinute, 0, 0);

      const diffMinutes = Math.floor((now.getTime() - expectedStart.getTime()) / (1000 * 60));
      let isLate = false;

      if (diffMinutes > 15) {
        isLate = true;
        const lateNote = `[Đi muộn ${diffMinutes} phút]`;
        schedule.notes = schedule.notes ? `${schedule.notes} ${lateNote}` : lateNote;
      }

      await schedule.save();

      res.json({
        success: true,
        action: 'CHECK_IN',
        isLate,
        message: isLate
          ? `Điểm danh VÀO CA thành công (Ghi nhận đi muộn ${diffMinutes} phút).`
          : 'Điểm danh VÀO CA đúng giờ thành công.',
        data: schedule,
      });
      return;
    }

    if (!schedule.checkOutTime) {
      // Clock OUT
      schedule.checkOutTime = now;
      await schedule.save();

      res.json({
        success: true,
        action: 'CHECK_OUT',
        message: 'Điểm danh RA CA thành công. Chúc bạn một ngày làm việc tốt lành!',
        data: schedule,
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: 'Ca trực này đã hoàn tất điểm danh cả vào và ra ca.',
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Quick Clock In/Out for Current Authenticated Staff
 */
export const getMyTodaySchedule = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const staffId = req.user?._id;
    if (!staffId) {
      res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập.' });
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayShift = await StaffSchedule.findOne({
      staffId,
      shiftDate: { $gte: todayStart, $lte: todayEnd },
    })
      .populate('branchId', 'name code address')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: todayShift,
    });
  } catch (error) {
    next(error);
  }
};
