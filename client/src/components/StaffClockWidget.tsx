import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  Building2,
  Calendar,
  RefreshCw,
  X,
  Timer,
} from 'lucide-react';
import { api } from '../services/api';
import { extractApiError } from '../utils/errorHelper';
import type { StaffSchedule } from '../types';
import { useAuth } from '../context/AuthContext';

const SHIFT_HOURS: Record<string, { startHour: number; startMinute: number; endHour: number; endMinute: number }> = {
  Morning: { startHour: 7, startMinute: 0, endHour: 12, endMinute: 0 },
  Afternoon: { startHour: 12, startMinute: 0, endHour: 17, endMinute: 0 },
  Evening: { startHour: 17, startMinute: 0, endHour: 22, endMinute: 0 },
  FullDay: { startHour: 7, startMinute: 0, endHour: 22, endMinute: 0 },
};

const SHIFT_CHRONO_ORDER: Record<string, number> = {
  Morning: 1,
  Afternoon: 2,
  Evening: 3,
  FullDay: 4,
};

const SHIFT_LABELS: Record<string, string> = {
  Morning: 'Ca 1 - Sáng',
  Afternoon: 'Ca 2 - Chiều',
  Evening: 'Ca 3 - Tối',
  FullDay: 'Cả ngày',
};

const selectActiveTodayShift = (
  rawShifts: StaffSchedule[]
): { active: StaffSchedule | null; ordered: StaffSchedule[] } => {
  if (!Array.isArray(rawShifts) || rawShifts.length === 0) {
    return { active: null, ordered: [] };
  }
  const ordered = [...rawShifts].sort(
    (a, b) => (SHIFT_CHRONO_ORDER[a.shiftType] || 99) - (SHIFT_CHRONO_ORDER[b.shiftType] || 99)
  );
  const inProgress = ordered.find((s) => Boolean(s.checkInTime) && !s.checkOutTime);
  if (inProgress) {
    return { active: inProgress, ordered };
  }
  const nextUnfinished = ordered.find((s) => !s.checkOutTime && s.status !== 'Absent');
  if (nextUnfinished) {
    return { active: nextUnfinished, ordered };
  }
  return { active: ordered[ordered.length - 1] || null, ordered };
};

export const StaffClockWidget: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<StaffSchedule | null>(null);
  const [todayShifts, setTodayShifts] = useState<StaffSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [clocking, setClocking] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  const fetchTodayShift = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/schedules/today');
      if (res.data?.success) {
        const list: StaffSchedule[] = Array.isArray(res.data.shifts)
          ? res.data.shifts
          : res.data.data
          ? [res.data.data]
          : [];
        const { active, ordered } = selectActiveTodayShift(list);
        setTodayShifts(ordered);
        setSchedule(active);
      }
    } catch {
      // Ignore if not scheduled
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (user && ['Staff', 'BranchManager'].includes(user.roles)) {
      fetchTodayShift();
    }
  }, [user]);

  const handleClock = async () => {
    if (!schedule) return;
    setClocking(true);
    try {
      const res = await api.put(`/schedules/${schedule._id}/clock`);
      if (res.data?.success) {
        const updated: StaffSchedule = res.data.data;
        const merged =
          todayShifts.length > 0
            ? todayShifts.map((s) => (s._id === updated._id ? updated : s))
            : [updated];
        const { active, ordered } = selectActiveTodayShift(merged);
        setTodayShifts(ordered);
        setSchedule(active);

        const isLate = res.data.isLate;
        setMessage({
          type: isLate ? 'warning' : 'success',
          text: res.data.message || 'Ghi nhận điểm danh thành công!',
        });
        void fetchTodayShift(true);
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: extractApiError(err, 'Có lỗi xảy ra khi điểm danh.'),
      });
      setTimeout(() => setMessage(null), 6000);
    } finally {
      setClocking(false);
    }
  };

  if (!user || !['Staff', 'BranchManager'].includes(user.roles)) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex items-center justify-between text-xs text-[#A0A0A0]">
        <div className="flex items-center gap-2">
          <RefreshCw size={14} className="animate-spin text-[#FFC799]" />
          <span>Kiểm tra ca trực hôm nay...</span>
        </div>
      </div>
    );
  }

  if (!schedule) {
    if (compact) return null;
    return (
      <div className="bg-[#161616]/80 border border-white/10 rounded-2xl p-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5 text-[#A0A0A0]">
          <Calendar size={16} className="text-[#606060]" />
          <span>Hôm nay bạn không có ca trực phân bổ tại trạm xe.</span>
        </div>
        <button
          type="button"
          onClick={() => fetchTodayShift()}
          className="text-[#D0D0D0] hover:text-[#FFC799] p-1"
          title="Kiểm tra lại"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    );
  }

  const isCheckedIn = Boolean(schedule.checkInTime);
  const isCheckedOut = Boolean(schedule.checkOutTime);
  const branchObj = typeof schedule.branchId === 'object' ? schedule.branchId : null;

  const shiftConfig = SHIFT_HOURS[schedule.shiftType] || SHIFT_HOURS.Morning;
  const shiftDate = new Date(schedule.shiftDate);
  const expectedStart = new Date(shiftDate);
  expectedStart.setHours(shiftConfig.startHour, shiftConfig.startMinute, 0, 0);
  const expectedEnd = new Date(shiftDate);
  expectedEnd.setHours(shiftConfig.endHour, shiftConfig.endMinute, 0, 0);
  const allowFrom = new Date(expectedStart.getTime() - 30 * 60 * 1000);

  const formatTime = (d: Date | string) =>
    new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const isBeforeWindow = now.getTime() < allowFrom.getTime();
  const isAfterEnd = now.getTime() > expectedEnd.getTime();
  const canClockIn = !isCheckedIn && !isBeforeWindow && !isAfterEnd;

  return (
    <div className="bg-gradient-to-r from-[#181818] to-[#141414] border border-[#FFC799]/30 rounded-2xl p-4 shadow-xl">
      {message && (
        <div
          role="status"
          className={`mb-3 p-3 rounded-xl border flex items-center gap-2 text-xs font-medium transition-all ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : message.type === 'warning'
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertTriangle size={16} />
          )}
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="ml-auto opacity-70 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#FFC799]/15 border border-[#FFC799]/30 flex items-center justify-center text-[#FFC799] shrink-0">
            <Clock size={20} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-white text-sm">
                Ca trực hôm nay: {SHIFT_LABELS[schedule.shiftType] || schedule.shiftType}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30 font-semibold tabular-nums">
                {`${String(shiftConfig.startHour).padStart(2, '0')}:${String(shiftConfig.startMinute).padStart(2, '0')} - ${String(shiftConfig.endHour).padStart(2, '0')}:${String(shiftConfig.endMinute).padStart(2, '0')}`}
              </span>

              {/* Status Badges */}
              {isCheckedIn && !isCheckedOut && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ĐÃ ĐIỂM DANH VÀO CA ({formatTime(schedule.checkInTime!)})
                </span>
              )}

              {isCheckedOut && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[11px] font-bold">
                  <CheckCircle2 size={12} />
                  ĐÃ HOÀN THÀNH CA
                </span>
              )}

              {!isCheckedIn && isBeforeWindow && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-medium">
                  <Timer size={12} />
                  Chưa đến giờ vào ca (Mở từ {formatTime(allowFrom)})
                </span>
              )}

              {!isCheckedIn && isAfterEnd && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-medium">
                  <AlertTriangle size={12} />
                  Ca trực đã qua khung giờ ({formatTime(expectedEnd)})
                </span>
              )}

              {!isCheckedIn && canClockIn && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium">
                  <Timer size={12} />
                  Đang mở điểm danh vào ca
                </span>
              )}

              {todayShifts.length > 1 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-[#D0D0D0] border border-white/15 font-semibold">
                  Ca {Math.max(1, todayShifts.findIndex((s) => s._id === schedule._id) + 1)}/{todayShifts.length}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#A0A0A0] mt-1.5">
              {branchObj && (
                <span className="flex items-center gap-1 text-[#D0D0D0] truncate max-w-[220px]">
                  <Building2 size={13} className="text-[#FFC799] shrink-0" />
                  <span className="truncate">{branchObj.name}</span>
                </span>
              )}

              {isCheckedIn && (
                <span className="text-emerald-400 font-semibold tabular-nums">
                  Vào: {formatTime(schedule.checkInTime!)}
                </span>
              )}

              {isCheckedOut && (
                <span className="text-sky-300 font-semibold tabular-nums">
                  Ra: {formatTime(schedule.checkOutTime!)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 flex items-center gap-2">
          {!isCheckedIn ? (
            <button
              type="button"
              onClick={handleClock}
              disabled={clocking || !canClockIn}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider transition-all shadow-lg ${
                canClockIn
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20 cursor-pointer active:scale-95'
                  : 'bg-white/10 text-[#888888] border border-white/10 cursor-not-allowed opacity-60'
              }`}
              title={
                isBeforeWindow
                  ? `Chưa đến giờ vào ca. Mở lúc ${formatTime(allowFrom)}`
                  : isAfterEnd
                  ? `Ca trực đã kết thúc lúc ${formatTime(expectedEnd)}`
                  : 'Điểm danh vào ca làm'
              }
            >
              <LogIn size={15} />
              {clocking
                ? 'Đang chấm công...'
                : isBeforeWindow
                ? `Mở lúc ${formatTime(allowFrom)}`
                : isAfterEnd
                ? 'Đã hết giờ ca'
                : 'Điểm danh Vào ca'}
            </button>
          ) : !isCheckedOut ? (
            <button
              type="button"
              onClick={handleClock}
              disabled={clocking}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 text-white font-semibold text-xs uppercase tracking-wider hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <LogOut size={15} />
              {clocking ? 'Đang chấm công...' : 'Điểm danh Ra ca'}
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 size={15} />
              <span>Đã hoàn thành ca trực</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
