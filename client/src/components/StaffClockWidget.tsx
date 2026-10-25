import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  Building2,
  Calendar,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import type { StaffSchedule } from '../types';
import { useAuth } from '../context/AuthContext';

export const StaffClockWidget: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<StaffSchedule | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [clocking, setClocking] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  const fetchTodayShift = async () => {
    setLoading(true);
    try {
      const res = await api.get('/schedules/today');
      if (res.data?.success) {
        setSchedule(res.data.data);
      }
    } catch {
      // Ignore if not scheduled
    } finally {
      setLoading(false);
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
        setSchedule(res.data.data);
        const isLate = res.data.isLate;
        setMessage({
          type: isLate ? 'warning' : 'success',
          text: res.data.message || 'Ghi nhận điểm danh thành công!',
        });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Có lỗi xảy ra khi điểm danh.',
      });
      setTimeout(() => setMessage(null), 5000);
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
          onClick={fetchTodayShift}
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFC799]/15 border border-[#FFC799]/30 flex items-center justify-center text-[#FFC799]">
            <Clock size={20} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">
                Ca trực hôm nay: {schedule.shiftType}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30 font-semibold">
                {schedule.shiftType === 'Morning'
                  ? '07:00 - 12:00'
                  : schedule.shiftType === 'Afternoon'
                  ? '12:00 - 17:00'
                  : schedule.shiftType === 'Evening'
                  ? '17:00 - 22:00'
                  : '07:00 - 22:00'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-[#A0A0A0] mt-1">
              {branchObj && (
                <span className="flex items-center gap-1 text-[#D0D0D0]">
                  <Building2 size={13} className="text-[#FFC799]" />
                  {branchObj.name}
                </span>
              )}

              {isCheckedIn && (
                <span className="text-emerald-400 font-medium">
                  Vào: {new Date(schedule.checkInTime!).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}

              {isCheckedOut && (
                <span className="text-sky-300 font-medium">
                  Ra: {new Date(schedule.checkOutTime!).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {!isCheckedIn ? (
            <button
              type="button"
              onClick={handleClock}
              disabled={clocking}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-xs uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <LogIn size={15} />
              {clocking ? 'Đang chấm công...' : 'Điểm danh Vào ca'}
            </button>
          ) : !isCheckedOut ? (
            <button
              type="button"
              onClick={handleClock}
              disabled={clocking}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 text-white font-semibold text-xs uppercase tracking-wider hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50"
            >
              <LogOut size={15} />
              {clocking ? 'Đang chấm công...' : 'Điểm danh Ra ca'}
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 size={14} />
              Hoàn thành ca trực
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
