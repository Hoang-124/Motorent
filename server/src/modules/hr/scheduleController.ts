import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { StaffSchedule, User, Branch, Booking, AuditLog } from '../../models';
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
      entity: 'StaffSchedule',
      entityId: String(newSchedule._id),
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

/**
 * AI Shift Scheduling Optimizer (AI tối ưu hóa xếp lịch phân ca nhân viên)
 * Analyzes branch booking demand (pickups, returns, and DoorDelivery orders weighted 1.5x),
 * staff workload balance, clopening avoidance (Evening -> next Morning), and attendance history
 * to generate or apply an optimal 7-day shift schedule.
 */
export const aiOptimizeSchedules = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userRole = req.user?.roles;
    let targetBranchId = req.body.branchId || req.query.branchId;

    if (userRole === 'BranchManager') {
      targetBranchId = req.user?.branchId;
    }

    if (!targetBranchId) {
      const firstBranch = await Branch.findOne({ isActive: true }).select('_id name code');
      if (!firstBranch) {
        res.status(400).json({ success: false, message: 'Không tìm thấy chi nhánh để tối ưu lịch trực.' });
        return;
      }
      targetBranchId = firstBranch._id;
    }

    const branch = await Branch.findById(targetBranchId).select('_id name code address');
    if (!branch) {
      res.status(404).json({ success: false, message: 'Chi nhánh không tồn tại.' });
      return;
    }

    const startInput = req.body.startDate || req.query.startDate;
    const baseDate = startInput ? new Date(String(startInput)) : new Date();
    const weekStart = new Date(baseDate);
    weekStart.setHours(0, 0, 0, 0);

    const daysCount = Math.min(14, Math.max(1, Number(req.body.days) || 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + daysCount - 1);
    weekEnd.setHours(23, 59, 59, 999);

    const applyImmediately = Boolean(req.body.applyImmediately);

    // 1. Load active Staff in this branch (Strict branch isolation)
    const branchStaff = await User.find({
      roles: 'Staff',
      branchId: branch._id,
      status: { $nin: ['Banned', 'Suspended'] },
    })
      .select('_id firstName lastName email phoneNumber username')
      .lean();

    if (branchStaff.length === 0) {
      res.status(400).json({
        success: false,
        message: `Chi nhánh ${branch.name} hiện chưa có nhân viên (Staff) nào đang hoạt động để AI phân ca.`,
      });
      return;
    }

    // 2. Load existing schedules in target window (plus 1 day before/after for boundary clopening check) & historical attendance stats (last 30 days)
    const thirtyDaysAgo = new Date(weekStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const prevBoundaryStart = new Date(weekStart);
    prevBoundaryStart.setDate(prevBoundaryStart.getDate() - 1);
    prevBoundaryStart.setHours(0, 0, 0, 0);

    const nextBoundaryEnd = new Date(weekEnd);
    nextBoundaryEnd.setDate(nextBoundaryEnd.getDate() + 1);
    nextBoundaryEnd.setHours(23, 59, 59, 999);

    const staffIds = branchStaff.map((s) => s._id);

    const [existingSchedules, historicalSchedules, branchBookings] = await Promise.all([
      StaffSchedule.find({
        $or: [
          { branchId: branch._id },
          { staffId: { $in: staffIds } },
        ],
        shiftDate: { $gte: prevBoundaryStart, $lte: nextBoundaryEnd },
      }).populate('staffId', 'firstName lastName email phoneNumber'),
      StaffSchedule.find({
        staffId: { $in: staffIds },
        shiftDate: { $gte: thirtyDaysAgo, $lt: weekStart },
      }),
      Booking.find({
        $or: [{ pickupBranchId: branch._id }, { returnBranchId: branch._id }],
        status: { $nin: ['Cancelled', 'Rejected'] },
        $and: [
          {
            $or: [
              { pickupDateTime: { $gte: weekStart, $lte: weekEnd } },
              { returnDateTime: { $gte: weekStart, $lte: weekEnd } },
            ],
          },
        ],
      }).select('pickupDateTime returnDateTime pickupBranchId returnBranchId deliveryMode customPickupAddress customReturnAddress status bookingCode'),
    ]);

    // Build reliability score per staff using Bayesian Laplace smoothing on completed past shifts
    const reliabilityMap = new Map<string, number>();
    for (const s of branchStaff) {
      const sid = String(s._id);
      const past = historicalSchedules.filter((h) => String(h.staffId) === sid);
      const evaluatedPast = past.filter((h) => h.status === 'Present' || h.status === 'Absent' || Boolean(h.checkInTime));
      if (evaluatedPast.length === 0) {
        reliabilityMap.set(sid, 0.95);
      } else {
        const presentCount = evaluatedPast.filter((h) => h.status === 'Present' || Boolean(h.checkInTime)).length;
        const smoothedReliability = (presentCount + 2) / (evaluatedPast.length + 2);
        reliabilityMap.set(sid, Math.max(0.7, Math.min(1.0, Math.round(smoothedReliability * 100) / 100)));
      }
    }

    // Track current assigned shift counts and daily assignments per staff
    const assignedCountMap = new Map<string, number>();
    const staffDayShiftsMap = new Map<string, Set<string>>(); // key: `${staffId}_${yyyy-mm-dd}` -> Set<shiftType>

    for (const s of branchStaff) {
      assignedCountMap.set(String(s._id), 0);
    }

    const toDateKey = (d: Date) => {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${yr}-${mo}-${da}`;
    };

    const parseLocalDateKey = (dateKeyStr: string): Date => {
      const [yr, mo, da] = dateKeyStr.split('-').map(Number);
      return new Date(yr, (mo || 1) - 1, da || 1, 0, 0, 0, 0);
    };

    const weekStartKey = toDateKey(weekStart);
    const weekEndKey = toDateKey(weekEnd);

    for (const sched of existingSchedules) {
      const sid = String((sched.staffId as any)?._id || sched.staffId);
      const dKey = toDateKey(new Date(sched.shiftDate));

      const mapKey = `${sid}_${dKey}`;
      if (!staffDayShiftsMap.has(mapKey)) {
        staffDayShiftsMap.set(mapKey, new Set());
      }
      staffDayShiftsMap.get(mapKey)!.add(sched.shiftType);

      // Only count shifts within the target [weekStartKey, weekEndKey] towards weekly workload
      if (dKey >= weekStartKey && dKey <= weekEndKey && assignedCountMap.has(sid)) {
        const weight = sched.shiftType === 'FullDay' ? 2 : 1;
        assignedCountMap.set(sid, (assignedCountMap.get(sid) || 0) + weight);
      }
    }

    // Helper to classify booking event hour into shift slot
    const getShiftSlotFromHour = (hour: number): 'Morning' | 'Afternoon' | 'Evening' => {
      if (hour < 12) return 'Morning';
      if (hour < 17) return 'Afternoon';
      return 'Evening';
    };

    const shiftTypes: Array<'Morning' | 'Afternoon' | 'Evening'> = ['Morning', 'Afternoon', 'Evening'];

    interface AiSlotAnalysis {
      date: string;
      dayOfWeek: string;
      shiftType: 'Morning' | 'Afternoon' | 'Evening';
      pickupCount: number;
      returnCount: number;
      doorDeliveryCount: number;
      demandScore: number;
      recommendedStaffCount: number;
      existingStaffCount: number;
      deficit: number;
    }

    const slotAnalyses: AiSlotAnalysis[] = [];
    const recommendations: Array<{
      staffId: string;
      staffName: string;
      staffEmail: string;
      branchId: string;
      branchName: string;
      shiftDate: string;
      shiftType: 'Morning' | 'Afternoon' | 'Evening';
      demandScore: number;
      confidenceScore: number;
      reason: string;
    }> = [];

    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    for (let dayIdx = 0; dayIdx < daysCount; dayIdx++) {
      const currentDay = new Date(weekStart);
      currentDay.setDate(weekStart.getDate() + dayIdx);
      const dKey = toDateKey(currentDay);
      const prevDay = new Date(currentDay);
      prevDay.setDate(currentDay.getDate() - 1);
      const prevDateKey = toDateKey(prevDay);
      const nextDay = new Date(currentDay);
      nextDay.setDate(currentDay.getDate() + 1);
      const nextDateKey = toDateKey(nextDay);
      const isWeekend = currentDay.getDay() === 0 || currentDay.getDay() === 6 || currentDay.getDay() === 5;

      for (const shiftType of shiftTypes) {
        // Calculate booking demand in this (date, shiftType)
        let pickupCount = 0;
        let returnCount = 0;
        let doorDeliveryCount = 0;

        for (const b of branchBookings) {
          const pDate = new Date(b.pickupDateTime);
          if (
            String(b.pickupBranchId) === String(branch._id) &&
            toDateKey(pDate) === dKey &&
            getShiftSlotFromHour(pDate.getHours()) === shiftType
          ) {
            pickupCount++;
            if (b.deliveryMode === 'DoorDelivery' && Boolean(b.customPickupAddress?.trim())) {
              doorDeliveryCount++;
            }
          }

          const rDate = new Date(b.returnDateTime);
          if (
            String(b.returnBranchId) === String(branch._id) &&
            toDateKey(rDate) === dKey &&
            getShiftSlotFromHour(rDate.getHours()) === shiftType
          ) {
            returnCount++;
            if (
              b.deliveryMode === 'DoorDelivery' &&
              Boolean(b.customReturnAddress?.trim() || b.customPickupAddress?.trim())
            ) {
              doorDeliveryCount++;
            }
          }
        }

        // Demand score formula: each counter handover = 1.0, each DoorDelivery leg adds +0.8 extra labor weight, weekend baseline boost
        const rawWorkload = pickupCount * 1.0 + returnCount * 1.0 + doorDeliveryCount * 0.8 + (isWeekend ? 1.2 : 0.4);
        const demandScore = Math.round(rawWorkload * 10) / 10;

        // Determine required staff headcount for this shift:
        // If there is at least 1 DoorDelivery in the shift AND other counter bookings, or demandScore >= 2.8, require 2 staff so 1 stays at counter while 1 delivers
        let recommendedStaffCount = 1;
        if (
          (demandScore >= 2.8 || (doorDeliveryCount >= 1 && pickupCount + returnCount >= 2)) &&
          branchStaff.length >= 2
        ) {
          recommendedStaffCount = 2;
        }
        if (demandScore >= 5.5 && branchStaff.length >= 3) {
          recommendedStaffCount = 3;
        }

        // Count already assigned staff in this branch & slot
        const existingInSlot = existingSchedules.filter((s) => {
          const sDateKey = toDateKey(new Date(s.shiftDate));
          return (
            String(s.branchId) === String(branch._id) &&
            sDateKey === dKey &&
            (s.shiftType === shiftType || s.shiftType === 'FullDay')
          );
        });

        const existingStaffCount = existingInSlot.length;
        const deficit = Math.max(0, recommendedStaffCount - existingStaffCount);

        slotAnalyses.push({
          date: dKey,
          dayOfWeek: dayNames[currentDay.getDay()],
          shiftType,
          pickupCount,
          returnCount,
          doorDeliveryCount,
          demandScore,
          recommendedStaffCount,
          existingStaffCount,
          deficit,
        });

        // Select best candidate(s) for any deficit
        for (let fillIdx = 0; fillIdx < deficit; fillIdx++) {
          const minWeeklyShiftsAcrossTeam = Math.min(
            ...branchStaff.map((s) => assignedCountMap.get(String(s._id)) || 0)
          );

          // Score all eligible staff
          const candidates = branchStaff
            .map((staff) => {
              const sid = String(staff._id);
              const daySet = staffDayShiftsMap.get(`${sid}_${dKey}`) || new Set<string>();

              // Hard constraint 1: Already assigned to this shift or FullDay
              if (daySet.has(shiftType) || daySet.has('FullDay')) {
                return null;
              }
              // Hard constraint 2: Max 2 shifts per day to prevent exhaustion
              if (daySet.size >= 2) {
                return null;
              }
              // Hard constraint 3: Avoid split-shift (Morning + Evening on the same day with Afternoon off)
              if (
                (shiftType === 'Evening' && daySet.has('Morning') && !daySet.has('Afternoon')) ||
                (shiftType === 'Morning' && daySet.has('Evening') && !daySet.has('Afternoon'))
              ) {
                return null;
              }

              const currentWeeklyShifts = assignedCountMap.get(sid) || 0;
              // Hard constraint 4: Max 10 shifts (50 hours) per week labor cap unless all staff reached cap
              if (currentWeeklyShifts >= 10 && minWeeklyShiftsAcrossTeam < 10) {
                return null;
              }

              const reliability = reliabilityMap.get(sid) || 0.95;

              // Bidirectional Clopening check:
              // (a) Worked Evening yesterday and being considered for Morning today
              // (b) Being considered for Evening today when already scheduled for Morning tomorrow
              const prevDaySet = staffDayShiftsMap.get(`${sid}_${prevDateKey}`) || new Set<string>();
              const nextDaySet = staffDayShiftsMap.get(`${sid}_${nextDateKey}`) || new Set<string>();
              const hasClopeningRisk =
                (shiftType === 'Morning' && (prevDaySet.has('Evening') || prevDaySet.has('FullDay'))) ||
                (shiftType === 'Evening' && (nextDaySet.has('Morning') || nextDaySet.has('FullDay')));

              // Same-day double shift penalty (prefer spreading across different staff on the same day)
              const alreadyWorkingToday = daySet.size > 0;

              // Multi-objective AI utility score (Higher is better)
              // Relative deficit from least-loaded staff member ensures strict round-robin fairness
              const shiftsAboveMin = Math.max(0, currentWeeklyShifts - minWeeklyShiftsAcrossTeam);
              const fairnessScore = Math.max(0, 100 - shiftsAboveMin * 18 - currentWeeklyShifts * 4);
              // High-demand or DoorDelivery slots value reliability even more
              const reliabilityWeight = doorDeliveryCount > 0 || demandScore >= 2.8 ? 32 : 22;
              const reliabilityBonus = reliability * reliabilityWeight;
              const clopeningPenalty = hasClopeningRisk ? 35 : 0;
              const doubleShiftPenalty = alreadyWorkingToday ? 22 : 0;

              const totalUtility =
                fairnessScore + reliabilityBonus - clopeningPenalty - doubleShiftPenalty;

              const reasons: string[] = [];
              if (doorDeliveryCount > 0) {
                reasons.push(`Điều phối ${doorDeliveryCount} lượt giao/nhận xe tận nơi ngoài cửa hàng`);
              } else if (pickupCount + returnCount > 0) {
                reasons.push(`Phục vụ ${pickupCount} đơn nhận & ${returnCount} đơn trả xe tại trạm`);
              } else if (isWeekend) {
                reasons.push('Tăng cường trực cao điểm cuối tuần');
              } else {
                reasons.push('Đảm bảo định biên trực vận hành chuẩn tại trạm');
              }

              reasons.push(
                `Cân bằng tải (${currentWeeklyShifts + 1} ca/tuần, chuyên cần ${Math.round(reliability * 100)}%)`
              );
              if (!hasClopeningRisk && (shiftType === 'Morning' || shiftType === 'Evening')) {
                reasons.push('Đảm bảo nghỉ >12h giữa 2 ngày (Không ca gãy)');
              }

              return {
                staff,
                sid,
                totalUtility,
                confidenceScore: Math.min(99, Math.max(80, Math.round(totalUtility * 0.78))),
                reason: reasons.join(' • '),
              };
            })
            .filter((c): c is NonNullable<typeof c> => c !== null)
            .sort((a, b) => b.totalUtility - a.totalUtility);

          if (candidates.length > 0) {
            const chosen = candidates[0];
            const mapKey = `${chosen.sid}_${dKey}`;
            if (!staffDayShiftsMap.has(mapKey)) {
              staffDayShiftsMap.set(mapKey, new Set());
            }
            staffDayShiftsMap.get(mapKey)!.add(shiftType);
            assignedCountMap.set(chosen.sid, (assignedCountMap.get(chosen.sid) || 0) + 1);

            recommendations.push({
              staffId: chosen.sid,
              staffName: `${chosen.staff.firstName || ''} ${chosen.staff.lastName || ''}`.trim() || chosen.staff.username || 'Nhân viên',
              staffEmail: chosen.staff.email || '',
              branchId: String(branch._id),
              branchName: branch.name,
              shiftDate: dKey,
              shiftType,
              demandScore,
              confidenceScore: chosen.confidenceScore,
              reason: chosen.reason,
            });
          }
        }
      }
    }

    // 3. If applyImmediately is true, persist all recommended shifts into StaffSchedule (Idempotent check)
    const createdSchedules = [];
    if (applyImmediately && recommendations.length > 0) {
      for (const rec of recommendations) {
        const localDayStart = parseLocalDateKey(rec.shiftDate);
        const localDayEnd = new Date(localDayStart);
        localDayEnd.setHours(23, 59, 59, 999);

        const duplicateCheck = await StaffSchedule.findOne({
          staffId: rec.staffId,
          shiftDate: { $gte: localDayStart, $lte: localDayEnd },
          $or: [{ shiftType: rec.shiftType }, { shiftType: 'FullDay' }],
        });

        if (!duplicateCheck) {
          const created = await StaffSchedule.create({
            staffId: rec.staffId,
            branchId: branch._id,
            shiftDate: localDayStart,
            shiftType: rec.shiftType,
            status: 'Assigned',
            assignedBy: req.user?._id,
            notes: `[AI Tối ưu Phân ca - Độ tin cậy ${rec.confidenceScore}%] ${rec.reason}`,
          });
          createdSchedules.push(created);
        }
      }

      await AuditLog.create({
        userId: req.user?._id,
        action: 'AI_OPTIMIZE_SCHEDULE',
        entity: 'StaffSchedule',
        entityId: String(branch._id),
        details: {
          branchName: branch.name,
          startDate: toDateKey(weekStart),
          endDate: toDateKey(weekEnd),
          appliedCount: createdSchedules.length,
        },
        ipAddress: req.ip,
      }).catch(() => {});
    }

    // 4. Compute workload balance & fairness index (Jain's Fairness Index across branch staff)
    const staffWorkloadSummary = branchStaff.map((s) => {
      const sid = String(s._id);
      const totalShifts = assignedCountMap.get(sid) || 0;
      return {
        staffId: sid,
        staffName: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.username,
        email: s.email,
        totalShifts,
        estimatedHours: totalShifts * 5,
        reliabilityPct: Math.round((reliabilityMap.get(sid) || 0.95) * 100),
      };
    });

    const shiftCounts = staffWorkloadSummary.map((w) => w.totalShifts);
    const sumCounts = shiftCounts.reduce((a, b) => a + b, 0);
    const sumSquares = shiftCounts.reduce((a, b) => a + b * b, 0);
    const fairnessIndex =
      sumSquares > 0
        ? Math.round(((sumCounts * sumCounts) / (shiftCounts.length * sumSquares)) * 100)
        : 100;

    const totalSlots = slotAnalyses.length;
    const coveredSlots = slotAnalyses.filter(
      (s) => s.existingStaffCount + recommendations.filter((r) => r.shiftDate === s.date && r.shiftType === s.shiftType).length >= 1
    ).length;

    res.json({
      success: true,
      message: applyImmediately
        ? `AI đã tự động xếp và áp dụng ${createdSchedules.length} ca trực tối ưu cho ${branch.name}.`
        : `AI đã phân tích nhu cầu đặt xe và đề xuất ${recommendations.length} ca trực tối ưu cho ${branch.name}.`,
      data: {
        branch: {
          _id: branch._id,
          name: branch.name,
          code: branch.code,
        },
        period: {
          startDate: toDateKey(weekStart),
          endDate: toDateKey(weekEnd),
          daysCount,
        },
        analytics: {
          totalBookingsAnalyzed: branchBookings.length,
          doorDeliveryOrdersCount: branchBookings.filter((b) => b.deliveryMode === 'DoorDelivery').length,
          fairnessIndexPct: fairnessIndex,
          coverageRatePct: totalSlots > 0 ? Math.round((coveredSlots / totalSlots) * 100) : 100,
          recommendedNewShifts: recommendations.length,
          appliedShiftsCount: createdSchedules.length,
        },
        staffWorkloadSummary,
        slotAnalyses,
        recommendations,
      },
    });
  } catch (error) {
    next(error);
  }
};

