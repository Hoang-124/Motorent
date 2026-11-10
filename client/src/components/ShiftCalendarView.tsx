import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  User as UserIcon,
  Building2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../services/api';
import type { StaffSchedule, User, Branch, ShiftType } from '../types';
import { useAuth } from '../context/AuthContext';

const SHIFT_INFO: Record<
  ShiftType,
  { label: string; time: string; color: string; badge: string; icon: LucideIcon }
> = {
  Morning: {
    label: 'Ca Sáng',
    time: '07:00 - 12:00',
    color: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: Sun,
  },
  Afternoon: {
    label: 'Ca Chiều',
    time: '12:00 - 17:00',
    color: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    icon: Sunset,
  },
  Evening: {
    label: 'Ca Tối',
    time: '17:00 - 22:00',
    color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    icon: Moon,
  },
  FullDay: {
    label: 'Cả Ngày',
    time: '07:00 - 22:00',
    color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: Sparkles,
  },
};

const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

export const ShiftCalendarView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.roles === 'SystemAdmin';
  const isManager = currentUser?.roles === 'BranchManager';

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    // Monday as start of week (0 is Sunday, 1 is Monday)
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Assign Shift Modal
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assignForm, setAssignForm] = useState<{
    staffId: string;
    branchId: string;
    shiftDate: string;
    shiftType: ShiftType;
    notes: string;
  }>({
    staffId: '',
    branchId: '',
    shiftDate: new Date().toISOString().slice(0, 10),
    shiftType: 'Morning',
    notes: '',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  // AI Shift Optimizer Modal & Results State
  const [showAiOptimizerModal, setShowAiOptimizerModal] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiApplying, setAiApplying] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<{
    branch: { _id: string; name: string; code: string };
    period: { startDate: string; endDate: string; daysCount: number };
    analytics: {
      totalBookingsAnalyzed: number;
      doorDeliveryOrdersCount: number;
      fairnessIndexPct: number;
      coverageRatePct: number;
      recommendedNewShifts: number;
      appliedShiftsCount: number;
    };
    staffWorkloadSummary: Array<{
      staffId: string;
      staffName: string;
      email: string;
      totalShifts: number;
      estimatedHours: number;
      reliabilityPct: number;
    }>;
    recommendations: Array<{
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
    }>;
  } | null>(null);

  const handleRunAiOptimization = async (applyImmediately: boolean = false) => {
    try {
      if (applyImmediately) {
        setAiApplying(true);
      } else {
        setAiLoading(true);
        setShowAiOptimizerModal(true);
      }

      const targetBranch =
        selectedBranchId !== 'all'
          ? selectedBranchId
          : isManager && currentUser?.branchId
          ? String((currentUser.branchId as any)?._id || currentUser.branchId)
          : branches[0]?._id;

      const res = await api.post('/schedules/ai-optimize', {
        branchId: targetBranch,
        startDate: currentWeekStart.toISOString(),
        days: 7,
        applyImmediately,
      });

      if (res.data?.success && res.data?.data) {
        setAiResult(res.data.data);
        if (applyImmediately) {
          showToast(
            'success',
            res.data.message || 'AI đã áp dụng thành công lịch phân ca tối ưu cho tuần này!'
          );
          setShowAiOptimizerModal(false);
          await fetchSchedules();
        }
      }
    } catch (err: any) {
      showToast(
        'error',
        err.response?.data?.message || 'Không thể chạy thuật toán AI tối ưu lịch trực.'
      );
    } finally {
      setAiLoading(false);
      setAiApplying(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Calculate 7 days of current week
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentWeekStart]);

  const weekEnd = useMemo(() => {
    const end = new Date(weekDays[6]);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [weekDays]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data?.success) setBranches(res.data.data);
    } catch {
      // Ignore
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await api.get('/staff', { params: { status: 'Active' } });
      if (res.data?.success) setStaffMembers(res.data.data);
    } catch {
      // Ignore
    }
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        startDate: currentWeekStart.toISOString(),
        endDate: weekEnd.toISOString(),
      };
      if (selectedBranchId !== 'all') {
        params.branchId = selectedBranchId;
      }

      const res = await api.get('/schedules', { params });
      if (res.data?.success) {
        setSchedules(res.data.data);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Không thể tải lịch trực.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchStaff();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [currentWeekStart, selectedBranchId]);

  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const handleTodayWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  const handleOpenAssignModal = (dateStr?: string) => {
    setAssignForm({
      staffId: staffMembers[0]?._id || '',
      branchId: isManager && currentUser?.branchId ? String((currentUser.branchId as any)._id || currentUser.branchId) : branches[0]?._id || '',
      shiftDate: dateStr || new Date().toISOString().slice(0, 10),
      shiftType: 'Morning',
      notes: '',
    });
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await api.post('/schedules', assignForm);
      if (res.data?.success) {
        showToast('success', res.data.message || 'Xếp ca trực thành công.');
        setShowAssignModal(false);
        fetchSchedules();
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Không thể xếp ca trực (kiểm tra trùng lịch).');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id: string, staffName: string) => {
    if (!window.confirm(`Bạn có chắc muốn hủy ca trực của "${staffName}"?`)) return;

    try {
      const res = await api.delete(`/schedules/${id}`);
      if (res.data?.success) {
        showToast('success', 'Đã hủy ca trực thành công.');
        fetchSchedules();
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Không thể hủy ca trực.');
    }
  };

  // Group schedules by date string YYYY-MM-DD
  const schedulesByDate = useMemo(() => {
    const map: Record<string, StaffSchedule[]> = {};
    for (const s of schedules) {
      const dateKey = new Date(s.shiftDate).toISOString().slice(0, 10);
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(s);
    }
    return map;
  }, [schedules]);

  const formatDateLabel = (d: Date) => {
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          role="status"
          className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-auto text-current opacity-70 hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CalendarIcon className="text-[#FFC799]" size={26} />
            Lịch Phân Ca & Chấm Công Tuần
          </h2>
          <p className="text-sm text-[#A0A0A0] mt-1">
            Bảng theo dõi ca làm việc, chống trùng lịch và ghi nhận trạng thái điểm danh nhân sự.
          </p>
        </div>

        {(isManager || isAdmin) && (
          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleRunAiOptimization(false)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#99FFE4]/15 border border-[#99FFE4]/40 text-[#99FFE4] font-bold text-sm hover:bg-[#99FFE4]/25 transition-all shadow-lg shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Sparkles size={17} />
              <span>AI Tối ưu Phân ca Thông minh</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAssignModal()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFC799] text-[#101010] font-semibold text-sm hover:bg-[#ffb77d] transition-all shadow-lg shadow-[#FFC799]/10 shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Plus size={18} />
              Xếp ca trực mới
            </button>
          </div>
        )}
      </div>

      {/* Navigation Toolbar */}
      <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="p-2 rounded-xl border border-white/10 text-[#D0D0D0] hover:text-white hover:border-[#FFC799] transition-colors"
            title="Tuần trước"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            onClick={handleTodayWeek}
            className="px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-[#D0D0D0] hover:text-white hover:border-[#FFC799] transition-colors"
          >
            Hôm nay
          </button>

          <button
            type="button"
            onClick={handleNextWeek}
            className="p-2 rounded-xl border border-white/10 text-[#D0D0D0] hover:text-white hover:border-[#FFC799] transition-colors"
            title="Tuần kế tiếp"
          >
            <ChevronRight size={18} />
          </button>

          <div className="text-sm font-semibold text-white ml-2 flex items-center gap-2">
            <CalendarIcon size={16} className="text-[#FFC799]" />
            <span>
              {formatDateLabel(weekDays[0])} — {formatDateLabel(weekDays[6])} / {weekDays[0].getFullYear()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {isAdmin && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
            >
              <option value="all">Tất cả chi nhánh</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={fetchSchedules}
            disabled={loading}
            className="p-2 rounded-xl border border-white/10 bg-[#101010] text-[#D0D0D0] hover:text-white hover:border-[#FFC799] transition-colors ml-auto"
            title="Làm mới lịch"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Shift Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-[#A0A0A0] font-semibold">Quy ước ca:</span>
        {(['Morning', 'Afternoon', 'Evening', 'FullDay'] as ShiftType[]).map((t) => {
          const info = SHIFT_INFO[t];
          const Icon = info.icon;
          return (
            <div
              key={t}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${info.badge}`}
            >
              <Icon size={13} />
              <span>
                {info.label} ({info.time})
              </span>
            </div>
          );
        })}
      </div>

      {/* Weekly Grid View */}
      {loading ? (
        <div className="p-16 text-center text-[#A0A0A0] flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-[#FFC799]" />
          <span>Đang tải ma trận phân ca tuần...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((date, idx) => {
            const dateKey = date.toISOString().slice(0, 10);
            const daySchedules = schedulesByDate[dateKey] || [];
            const todayActive = isToday(date);

            return (
              <div
                key={dateKey}
                className={`bg-[#161616] border rounded-2xl p-3 flex flex-col min-h-[380px] transition-all ${
                  todayActive ? 'border-[#FFC799]/60 shadow-lg shadow-[#FFC799]/5' : 'border-white/10'
                }`}
              >
                {/* Day Header */}
                <div className="border-b border-white/10 pb-2 mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#A0A0A0] uppercase">{DAY_NAMES[idx]}</div>
                    <div className={`text-base font-extrabold ${todayActive ? 'text-[#FFC799]' : 'text-white'}`}>
                      {formatDateLabel(date)}
                    </div>
                  </div>

                  {todayActive && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFC799]/20 text-[#FFC799] border border-[#FFC799]/30">
                      Hôm nay
                    </span>
                  )}
                </div>

                {/* Shifts List for the day */}
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {daySchedules.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <Clock size={20} className="text-[#404040] mb-1" />
                      <span className="text-xs text-[#606060] italic">Trống ca trực</span>
                      {(isManager || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(dateKey)}
                          className="mt-2 text-[11px] text-[#FFC799] hover:underline inline-flex items-center gap-1"
                        >
                          <Plus size={12} /> Xếp ca
                        </button>
                      )}
                    </div>
                  ) : (
                    daySchedules.map((sch) => {
                      const staffObj = typeof sch.staffId === 'object' ? sch.staffId : null;
                      const staffName = staffObj ? `${staffObj.firstName} ${staffObj.lastName}` : 'Nhân viên';
                      const shiftCfg = SHIFT_INFO[sch.shiftType] || SHIFT_INFO.Morning;
                      const ShiftIcon = shiftCfg.icon;

                      return (
                        <div
                          key={sch._id}
                          className={`rounded-xl border p-2.5 transition-all text-xs flex flex-col gap-1.5 ${shiftCfg.color}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold flex items-center gap-1">
                              <ShiftIcon size={12} />
                              {shiftCfg.label}
                            </span>

                            {(isManager || isAdmin) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSchedule(sch._id, staffName)}
                                className="text-rose-400 opacity-70 hover:opacity-100 p-0.5"
                                title="Hủy ca trực"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-white font-medium">
                            <UserIcon size={12} className="text-[#FFC799]" />
                            <span className="truncate">{staffName}</span>
                          </div>

                          {/* Attendance Status */}
                          <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[11px]">
                            {sch.checkInTime ? (
                              <span className="text-emerald-400 font-medium">
                                Vào: {new Date(sch.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : (
                              <span className="text-[#A0A0A0]">Chưa vào ca</span>
                            )}

                            {sch.checkOutTime && (
                              <span className="text-sky-300 font-medium">
                                Ra: {new Date(sch.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>

                          {sch.notes && (
                            <div className="text-[10px] text-[#A0A0A0] italic truncate" title={sch.notes}>
                              {sch.notes}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Day Footer Quick Assign */}
                {(isManager || isAdmin) && daySchedules.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleOpenAssignModal(dateKey)}
                    className="mt-2 w-full py-1.5 rounded-lg border border-white/10 hover:border-[#FFC799] text-[#A0A0A0] hover:text-white text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus size={12} /> Thêm ca
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Shift Modal (UC-84) */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-white/15 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarIcon className="text-[#FFC799]" size={20} />
                Xếp ca trực nhân sự
              </h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="text-[#A0A0A0] hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                  Nhân viên trực quầy <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={assignForm.staffId}
                  onChange={(e) => setAssignForm({ ...assignForm, staffId: e.target.value })}
                  className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {staffMembers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.firstName} {s.lastName} (@{s.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                  Ngày làm việc <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={assignForm.shiftDate}
                  onChange={(e) => setAssignForm({ ...assignForm, shiftDate: e.target.value })}
                  className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                  Ca trực phân bổ <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Morning', 'Afternoon', 'Evening', 'FullDay'] as ShiftType[]).map((st) => {
                    const cfg = SHIFT_INFO[st];
                    const isSelected = assignForm.shiftType === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setAssignForm({ ...assignForm, shiftType: st })}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-[#FFC799] bg-[#FFC799]/15 text-[#FFC799]'
                            : 'border-white/10 bg-[#101010] text-[#D0D0D0] hover:border-white/20'
                        }`}
                      >
                        <div className="font-bold text-xs">{cfg.label}</div>
                        <div className="text-[11px] text-[#A0A0A0]">{cfg.time}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                    Chi nhánh thực hiện
                  </label>
                  <select
                    value={assignForm.branchId}
                    onChange={(e) => setAssignForm({ ...assignForm, branchId: e.target.value })}
                    className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                  >
                    <option value="">-- Mặc định theo chi nhánh của nhân viên --</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">Ghi chú phân ca</label>
                <input
                  type="text"
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  placeholder="Giao việc đặc biệt, bàn giao chìa khóa..."
                  className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-sm font-medium text-[#D0D0D0] hover:text-white transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#FFC799] text-[#101010] text-sm font-semibold hover:bg-[#ffb77d] transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Đang kiểm tra & xếp...' : 'Xác nhận xếp ca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Shift Scheduling Optimizer Modal */}
      {showAiOptimizerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#161616] border border-[#99FFE4]/40 rounded-2xl w-full max-w-4xl p-6 space-y-5 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#99FFE4] flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>AI WORKFORCE SCHEDULING ENGINE • MULTI-OBJECTIVE OPTIMIZATION</span>
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  Đề xuất Xếp lịch Phân ca Nhân viên bằng AI
                </h3>
                <p className="text-xs text-[#A0A0A0] mt-0.5">
                  Tự động dự báo tải công việc theo đơn Nhận/Trả xe tại trạm và đơn Giao/Nhận tận nơi ngoài cửa hàng (trọng số 1.8x), cân bằng số giờ làm việc (Jain Fairness Index) và chống ca gãy (Clopening).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAiOptimizerModal(false)}
                className="text-[#A0A0A0] hover:text-white p-1.5 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {aiLoading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3 text-center">
                <RefreshCw size={28} className="animate-spin text-[#99FFE4]" />
                <p className="text-sm font-bold text-white">
                  AI đang phân tích dữ liệu đặt xe, đơn giao nhận tận nơi và lịch sử điểm danh nhân sự...
                </p>
                <p className="text-xs text-[#A0A0A0]">
                  Tính toán điểm nhu cầu 21 khung ca trong tuần và tối ưu hóa phân bổ nhân lực...
                </p>
              </div>
            ) : aiResult ? (
              <div className="space-y-5">
                {/* KPI Analytics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#101010] border border-white/10">
                    <span className="text-[10px] text-[#A0A0A0] uppercase font-bold block">
                      Độ phủ ca trực tuần
                    </span>
                    <span className="text-lg font-mono font-black text-[#99FFE4]">
                      {aiResult.analytics.coverageRatePct}%
                    </span>
                    <span className="text-[10px] text-[#6E6E6E] block mt-0.5">
                      Chi nhánh: {aiResult.branch.name}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#101010] border border-white/10">
                    <span className="text-[10px] text-[#A0A0A0] uppercase font-bold block">
                      Chỉ số công bằng tải (Fairness)
                    </span>
                    <span className="text-lg font-mono font-black text-[#FFC799]">
                      {aiResult.analytics.fairnessIndexPct}%
                    </span>
                    <span className="text-[10px] text-[#6E6E6E] block mt-0.5">
                      Cân bằng số giờ làm giữa các Staff
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#101010] border border-white/10">
                    <span className="text-[10px] text-[#A0A0A0] uppercase font-bold block">
                      Đơn đặt &amp; Giao tận nơi
                    </span>
                    <span className="text-lg font-mono font-black text-white">
                      {aiResult.analytics.totalBookingsAnalyzed} đơn ({aiResult.analytics.doorDeliveryOrdersCount} tận nơi)
                    </span>
                    <span className="text-[10px] text-[#6E6E6E] block mt-0.5">
                      Dữ liệu thực tế trong kỳ
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#101010] border border-white/10">
                    <span className="text-[10px] text-[#A0A0A0] uppercase font-bold block">
                      Ca trực mới AI đề xuất
                    </span>
                    <span className="text-lg font-mono font-black text-emerald-400">
                      +{aiResult.analytics.recommendedNewShifts} ca
                    </span>
                    <span className="text-[10px] text-[#6E6E6E] block mt-0.5">
                      Không trùng lịch hiện có
                    </span>
                  </div>
                </div>

                {/* Staff Workload Balance Bars */}
                <div className="p-4 rounded-xl bg-[#101010] border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#FFC799]">
                    Phân bổ khối lượng công việc nhân sự sau khi tối ưu AI
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {aiResult.staffWorkloadSummary.map((st) => (
                      <div
                        key={st.staffId}
                        className="p-3 rounded-lg bg-[#161616] border border-white/10 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">{st.staffName}</div>
                          <div className="text-[11px] text-[#A0A0A0]">
                            Độ tin cậy chuyên cần: <strong className="text-emerald-400">{st.reliabilityPct}%</strong>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-sm font-black text-[#FFC799]">{st.totalShifts} ca</span>
                          <span className="block text-[10px] text-[#6E6E6E]">~{st.estimatedHours} giờ/tuần</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Shifts Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#99FFE4]">
                    Danh sách ca trực AI đề xuất bổ sung ({aiResult.recommendations.length} ca)
                  </h4>
                  {aiResult.recommendations.length === 0 ? (
                    <div className="p-6 rounded-xl bg-[#101010] border border-white/10 text-center text-xs text-emerald-400 font-semibold">
                      Lịch phân ca tuần này đã phủ kín 100% nhu cầu vận hành! Không cần bổ sung thêm ca trực mới.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/10 bg-[#101010]">
                      {aiResult.recommendations.map((rec, i) => {
                        const cfg = SHIFT_INFO[rec.shiftType] || SHIFT_INFO.Morning;
                        return (
                          <div
                            key={`${rec.shiftDate}_${rec.shiftType}_${rec.staffId}_${i}`}
                            className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-white/[0.02]"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#FFC799]">{rec.shiftDate}</span>
                                <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${cfg.badge}`}>
                                  {cfg.label} ({cfg.time})
                                </span>
                                <span className="font-bold text-white">{rec.staffName}</span>
                              </div>
                              <p className="text-[11px] text-[#A0A0A0]">{rec.reason}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-2 py-1 rounded bg-[#99FFE4]/15 text-[#99FFE4] font-mono text-[10px] font-bold">
                                AI Match {rec.confidenceScore}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAiOptimizerModal(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-[#D0D0D0] hover:text-white cursor-pointer"
                  >
                    Đóng
                  </button>
                  {aiResult.recommendations.length > 0 && (
                    <button
                      type="button"
                      disabled={aiApplying}
                      onClick={() => handleRunAiOptimization(true)}
                      className="px-5 py-2.5 rounded-xl bg-[#99FFE4] hover:bg-[#99FFE4]/90 text-[#101010] text-xs font-black transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles size={15} />
                      <span>
                        {aiApplying
                          ? 'Đang lưu lịch phân ca AI...'
                          : `Áp dụng ngay ${aiResult.recommendations.length} ca trực AI đề xuất`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
