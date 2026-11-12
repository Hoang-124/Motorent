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
  MessageSquarePlus,
  Eye,
  Users,
  Check,
  AlertTriangle,
  Send,
  Info,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../services/api';
import type {
  StaffSchedule,
  User,
  Branch,
  ShiftType,
  StaffAvailability,
  StaffAvailabilitySlot,
} from '../types';
import { useAuth } from '../context/AuthContext';
import {
  parseClientAvailabilityMessage,
  slotsToShorthandMessage,
  toLocalDateKey,
} from '../utils/availabilityParser';

// Safe date-to-key helper avoiding timezone offset shifts
const toDateKey = (d: Date | string): string => {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  return toLocalDateKey(dateObj);
};

export interface StaffColorTheme {
  id: string;
  name: string;
  dot: string;
  badge: string;
  borderLeft: string;
  cardBg: string;
  avatarBg: string;
  text: string;
  accent: string;
}

export const STAFF_PALETTE: StaffColorTheme[] = [
  {
    id: 'emerald',
    name: 'Xanh Ngọc (Emerald)',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
    borderLeft: 'border-l-4 border-l-emerald-400',
    cardBg: 'bg-emerald-950/20 hover:bg-emerald-950/30 border-emerald-500/25',
    avatarBg: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50',
    text: 'text-emerald-300',
    accent: '#34d399',
  },
  {
    id: 'purple',
    name: 'Tím Violet (Purple)',
    dot: 'bg-purple-400',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/35',
    borderLeft: 'border-l-4 border-l-purple-400',
    cardBg: 'bg-purple-950/20 hover:bg-purple-950/30 border-purple-500/25',
    avatarBg: 'bg-purple-500/25 text-purple-300 border-purple-500/50',
    text: 'text-purple-300',
    accent: '#c084fc',
  },
  {
    id: 'amber',
    name: 'Cam Hổ Phách (Amber)',
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
    borderLeft: 'border-l-4 border-l-amber-400',
    cardBg: 'bg-amber-950/20 hover:bg-amber-950/30 border-amber-500/25',
    avatarBg: 'bg-amber-500/25 text-amber-300 border-amber-500/50',
    text: 'text-amber-300',
    accent: '#fbbf24',
  },
  {
    id: 'cyan',
    name: 'Xanh Lam Sáng (Cyan)',
    dot: 'bg-cyan-400',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35',
    borderLeft: 'border-l-4 border-l-cyan-400',
    cardBg: 'bg-cyan-950/20 hover:bg-cyan-950/30 border-cyan-500/25',
    avatarBg: 'bg-cyan-500/25 text-cyan-300 border-cyan-500/50',
    text: 'text-cyan-300',
    accent: '#22d3ee',
  },
  {
    id: 'rose',
    name: 'Hồng Đào (Rose)',
    dot: 'bg-rose-400',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
    borderLeft: 'border-l-4 border-l-rose-400',
    cardBg: 'bg-rose-950/20 hover:bg-rose-950/30 border-rose-500/25',
    avatarBg: 'bg-rose-500/25 text-rose-300 border-rose-500/50',
    text: 'text-rose-300',
    accent: '#fb7185',
  },
  {
    id: 'indigo',
    name: 'Xanh Chàm (Indigo)',
    dot: 'bg-indigo-400',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/35',
    borderLeft: 'border-l-4 border-l-indigo-400',
    cardBg: 'bg-indigo-950/20 hover:bg-indigo-950/30 border-indigo-500/25',
    avatarBg: 'bg-indigo-500/25 text-indigo-300 border-indigo-500/50',
    text: 'text-indigo-300',
    accent: '#818cf8',
  },
];

export const getStaffColor = (identifier?: string): StaffColorTheme => {
  if (!identifier) return STAFF_PALETTE[0];
  const clean = identifier.toLowerCase().trim();

  // Known staff matching
  if (clean.includes('an') || clean.includes('nguyễn văn an')) return STAFF_PALETTE[0]; // Emerald
  if (clean.includes('ca') || clean.includes('phạm văn ca')) return STAFF_PALETTE[1];   // Purple
  if (clean.includes('bình') || clean.includes('binh') || clean.includes('trần thị bình')) return STAFF_PALETTE[2]; // Amber

  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % STAFF_PALETTE.length;
  return STAFF_PALETTE[idx];
};

const SHIFT_INFO: Record<
  ShiftType,
  { label: string; number: number; time: string; color: string; badge: string; icon: LucideIcon }
> = {
  Morning: {
    label: 'Ca 1 - Sáng',
    number: 1,
    time: '07:00 - 12:00',
    color: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: Sun,
  },
  Afternoon: {
    label: 'Ca 2 - Chiều',
    number: 2,
    time: '12:00 - 17:00',
    color: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    icon: Sunset,
  },
  Evening: {
    label: 'Ca 3 - Tối',
    number: 3,
    time: '17:00 - 22:00',
    color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    icon: Moon,
  },
  FullDay: {
    label: 'Cả Ngày',
    number: 0,
    time: '07:00 - 22:00',
    color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: Sparkles,
  },
};

const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const DAY_CODES = ['t2', 't3', 't4', 't5', 't6', 't7', 'cn'];

const SHIFT_CHRONO_ORDER: Record<string, number> = {
  Morning: 1,
  Afternoon: 2,
  Evening: 3,
  FullDay: 4,
};

export const ShiftCalendarView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.roles === 'SystemAdmin';
  const isManager = currentUser?.roles === 'BranchManager';
  const isStaff = currentUser?.roles === 'Staff';

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
  const [availabilities, setAvailabilities] = useState<StaffAvailability[]>([]);
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
    shiftDate: toDateKey(new Date()),
    shiftType: 'Morning',
    notes: '',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Staff Availability Registration Modal (UC: Staff messages shift availability)
  const [showAvailabilityModal, setShowAvailabilityModal] = useState<boolean>(false);
  const [availabilityMessage, setAvailabilityMessage] = useState<string>('');
  const [availabilitySlots, setAvailabilitySlots] = useState<StaffAvailabilitySlot[]>([]);
  const [availabilityNotes, setAvailabilityNotes] = useState<string>('');
  const [submittingAvailability, setSubmittingAvailability] = useState<boolean>(false);

  // Manager View Availabilities Modal
  const [showViewAvailabilitiesModal, setShowViewAvailabilitiesModal] = useState<boolean>(false);

  // AI Shift Optimizer Modal & Results State
  const [showAiOptimizerModal, setShowAiOptimizerModal] = useState<boolean>(false);
  const [multiStaffInput, setMultiStaffInput] = useState<string>(
    `Nguyễn Văn An: t2 1 2, t3 1 2, t4 1 2, t5 1 2, t6 1, t7 bận, cn bận\nPhạm Văn Ca: t2 2 3, t3 2 3, t4 2 3, t5 bận, t6 2 3, t7 2 3, cn 3\nTrần Thị Bình: t2 1, t3 1 3, t4 1 2, t5 1 2, t6 1 2, t7 1, cn 1 2`
  );
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);
  const [showInputSection, setShowInputSection] = useState<boolean>(true);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiApplying, setAiApplying] = useState<boolean>(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(
    () => localStorage.getItem('motorent_gemini_api_key') || ''
  );
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);

  const [aiResult, setAiResult] = useState<{
    aiEngine?: string;
    modelUsed?: string;
    aiOverview?: string;
    branch: { _id: string; name: string; code: string };
    period: { startDate: string; endDate: string; daysCount: number };
    analytics: {
      totalBookingsAnalyzed: number;
      doorDeliveryOrdersCount: number;
      fairnessIndexPct: number;
      coverageRatePct: number;
      recommendedNewShifts: number;
      appliedShiftsCount: number;
      staffAvailabilityCount?: number;
      consecutiveShiftsCount?: number;
      reluctantSplitShiftsCount?: number;
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
        startDate: toDateKey(currentWeekStart),
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

  const fetchAvailabilities = async () => {
    try {
      const params: Record<string, any> = {
        weekStartDate: toDateKey(currentWeekStart),
      };
      if (selectedBranchId !== 'all') {
        params.branchId = selectedBranchId;
      }
      if (isManager || isAdmin) {
        params.allBranch = true;
      }

      const res = await api.get('/schedules/availability', { params });
      if (res.data?.success) {
        setAvailabilities(res.data.data || []);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchStaff();
  }, []);

  useEffect(() => {
    fetchSchedules();
    fetchAvailabilities();
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

  // Open availability registration modal
  const handleOpenAvailabilityModal = () => {
    // Check if current user already submitted availability for this week
    const currentSid = String(currentUser?._id || '');
    const existing = availabilities.find(
      (a) => String((a.staffId as any)?._id || a.staffId) === currentSid
    );

    if (existing) {
      setAvailabilityMessage(existing.rawMessage || '');
      setAvailabilitySlots(existing.slots || []);
      setAvailabilityNotes(existing.notes || '');
    } else {
      const parsed = parseClientAvailabilityMessage(
        't2 2 3, t3 1 3, t4 1 2, t5 bận, t6 1, t7 2 3, cn 3',
        currentWeekStart
      );
      setAvailabilityMessage('t2 2 3, t3 1 3, t4 1 2, t5 bận, t6 1, t7 2 3, cn 3');
      setAvailabilitySlots(parsed.slots);
      setAvailabilityNotes('');
    }
    setShowAvailabilityModal(true);
  };

  // When user types in raw message textarea
  const handleMessageChange = (newText: string) => {
    setAvailabilityMessage(newText);
    const parsed = parseClientAvailabilityMessage(newText, currentWeekStart);
    setAvailabilitySlots(parsed.slots);
  };

  // Toggle shift availability for a specific day in the interactive matrix
  const handleToggleSlotShift = (dayOfWeek: number, shift: ShiftType) => {
    const nextSlots = availabilitySlots.map((slot) => {
      if (slot.dayOfWeek !== dayOfWeek) return slot;

      const hasShift = slot.availableShifts.includes(shift);
      let updatedShifts: ShiftType[];

      if (hasShift) {
        updatedShifts = slot.availableShifts.filter((s) => s !== shift);
      } else {
        updatedShifts = [...slot.availableShifts, shift];
      }

      const allThree: ShiftType[] = ['Morning', 'Afternoon', 'Evening'];
      const busy = allThree.filter((s) => !updatedShifts.includes(s));
      const allBusy = updatedShifts.length === 0;

      return {
        ...slot,
        isAllDayBusy: allBusy,
        availableShifts: updatedShifts,
        busyShifts: busy,
      };
    });

    setAvailabilitySlots(nextSlots);
    setAvailabilityMessage(slotsToShorthandMessage(nextSlots));
  };

  // Toggle all day busy for a specific day
  const handleToggleAllDayBusy = (dayOfWeek: number) => {
    const nextSlots = availabilitySlots.map((slot) => {
      if (slot.dayOfWeek !== dayOfWeek) return slot;

      const willBeBusy = !slot.isAllDayBusy;
      return {
        ...slot,
        isAllDayBusy: willBeBusy,
        availableShifts: willBeBusy ? ([] as ShiftType[]) : (['Morning', 'Afternoon', 'Evening'] as ShiftType[]),
        busyShifts: willBeBusy ? (['Morning', 'Afternoon', 'Evening'] as ShiftType[]) : ([] as ShiftType[]),
      };
    });

    setAvailabilitySlots(nextSlots);
    setAvailabilityMessage(slotsToShorthandMessage(nextSlots));
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAvailability(true);
    try {
      const res = await api.post('/schedules/availability', {
        weekStartDate: toDateKey(currentWeekStart),
        rawMessage: availabilityMessage,
        slots: availabilitySlots,
        notes: availabilityNotes,
      });

      if (res.data?.success) {
        showToast(
          'success',
          res.data.message || 'Đã lưu lịch đăng ký làm việc tuần của bạn!'
        );
        setShowAvailabilityModal(false);
        fetchAvailabilities();
      }
    } catch (err: any) {
      showToast(
        'error',
        err.response?.data?.message || 'Không thể lưu lịch đăng ký làm việc.'
      );
    } finally {
      setSubmittingAvailability(false);
    }
  };

  const handleOpenAssignModal = (dateStr?: string) => {
    setAssignForm({
      staffId: staffMembers[0]?._id || '',
      branchId:
        isManager && currentUser?.branchId
          ? String((currentUser.branchId as any)._id || currentUser.branchId)
          : branches[0]?._id || '',
      shiftDate: dateStr || toDateKey(new Date()),
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

      if (geminiApiKey) {
        localStorage.setItem('motorent_gemini_api_key', geminiApiKey);
      }

      const res = await api.post('/schedules/ai-optimize', {
        branchId: targetBranch,
        startDate: toDateKey(currentWeekStart),
        days: 7,
        applyImmediately,
        overwriteExisting,
        multiStaffText: multiStaffInput.trim() || undefined,
        geminiApiKey: geminiApiKey.trim() || undefined,
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

  // Group schedules by date string YYYY-MM-DD and sort chronologically (Ca 1 -> Ca 2 -> Ca 3)
  const schedulesByDate = useMemo(() => {
    const map: Record<string, StaffSchedule[]> = {};
    for (const s of schedules) {
      const dateKey = toDateKey(s.shiftDate);
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(s);
    }
    // Strict chronological sort: Ca 1 (Sáng) -> Ca 2 (Chiều) -> Ca 3 (Tối)
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (SHIFT_CHRONO_ORDER[a.shiftType] || 99) - (SHIFT_CHRONO_ORDER[b.shiftType] || 99));
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

  // Distinct active staff list with assigned colors for legend display
  const displayStaffList = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of schedules) {
      const sObj = typeof s.staffId === 'object' ? s.staffId : null;
      if (sObj) {
        const name = `${sObj.firstName} ${sObj.lastName}`.trim() || sObj.username;
        map.set(name, name);
      }
    }
    for (const sm of staffMembers) {
      const name = `${sm.firstName} ${sm.lastName}`.trim() || sm.username;
      map.set(name, name);
    }
    if (aiResult?.staffWorkloadSummary) {
      for (const st of aiResult.staffWorkloadSummary) {
        map.set(st.staffName, st.staffName);
      }
    }
    if (map.size === 0) {
      map.set('Nguyễn Văn An', 'Nguyễn Văn An');
      map.set('Phạm Văn Ca', 'Phạm Văn Ca');
      map.set('Trần Thị Bình', 'Trần Thị Bình');
    }
    return Array.from(map.values()).map((name) => ({
      name,
      color: getStaffColor(name),
    }));
  }, [schedules, staffMembers, aiResult]);

  // Group AI recommendations by date for 7-day visual matrix view
  const recsByDate = useMemo(() => {
    if (!aiResult?.recommendations) return {};
    const map: Record<string, typeof aiResult.recommendations> = {};
    for (const r of aiResult.recommendations) {
      if (!map[r.shiftDate]) map[r.shiftDate] = [];
      map[r.shiftDate].push(r);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (SHIFT_CHRONO_ORDER[a.shiftType] || 99) - (SHIFT_CHRONO_ORDER[b.shiftType] || 99));
    }
    return map;
  }, [aiResult]);

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
            Bảng theo dõi ca làm việc, đăng ký lịch rảnh/bận nhân sự, và AI tối ưu hóa ca trực thông minh.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Staff or Manager: Register Availability Button */}
          <button
            type="button"
            onClick={handleOpenAvailabilityModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-[#D0D0D0] hover:text-white hover:border-[#FFC799] font-medium text-sm transition-all shadow-sm cursor-pointer"
            title="Đăng ký hoặc nhắn lịch làm/bận của bạn trong tuần này"
          >
            <MessageSquarePlus size={17} className="text-[#FFC799]" />
            <span>Đăng ký lịch tuần</span>
          </button>

          {/* Manager / Admin: Review Staff Submissions Button */}
          {(isManager || isAdmin) && (
            <button
              type="button"
              onClick={() => setShowViewAvailabilitiesModal(true)}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#161616] border border-white/10 hover:border-white/20 text-[#A0A0A0] hover:text-white font-medium text-sm transition-all shadow-sm cursor-pointer"
              title="Xem danh sách tin nhắn và lịch đăng ký của nhân viên"
            >
              <Users size={16} className="text-sky-400" />
              <span>Lịch đăng ký ({availabilities.length})</span>
            </button>
          )}

          {/* Manager / Admin: AI Shift Optimizer Button */}
          {(isManager || isAdmin) && (
            <button
              type="button"
              onClick={() => {
                setShowAiOptimizerModal(true);
                if (!aiResult) setShowInputSection(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#99FFE4]/15 border border-[#99FFE4]/40 text-[#99FFE4] font-bold text-sm hover:bg-[#99FFE4]/25 transition-all shadow-lg shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Sparkles size={17} />
              <span>AI Tối ưu Phân ca</span>
            </button>
          )}

          {/* Manager / Admin: Manual Assign Shift Button */}
          {(isManager || isAdmin) && (
            <button
              type="button"
              onClick={() => handleOpenAssignModal()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFC799] text-[#101010] font-semibold text-sm hover:bg-[#ffb77d] transition-all shadow-lg shadow-[#FFC799]/10 shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Plus size={18} />
              Xếp ca trực mới
            </button>
          )}
        </div>
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
            onClick={() => {
              fetchSchedules();
              fetchAvailabilities();
            }}
            disabled={loading}
            className="p-2 rounded-xl border border-white/10 bg-[#101010] text-[#D0D0D0] hover:text-white hover:border-[#FFC799] transition-colors ml-auto"
            title="Làm mới lịch"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Shift Legend & Staff Color Identification Banner */}
      <div className="bg-[#161616]/75 border border-white/10 rounded-2xl p-3.5 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[#A0A0A0] font-semibold text-[11px] uppercase tracking-wider">Quy ước 3 ca:</span>
            {(['Morning', 'Afternoon', 'Evening'] as ShiftType[]).map((t) => {
              const info = SHIFT_INFO[t];
              const Icon = info.icon;
              return (
                <div
                  key={t}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${info.badge}`}
                >
                  <Icon size={13} />
                  <span>
                    {info.label} ({info.time})
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-[#A0A0A0] flex items-center gap-1.5">
            <Info size={14} className="text-[#99FFE4]" />
            <span>Xếp lịch thông minh: Ưu tiên ca liền kề (1-2 / 2-3); Tránh ca gãy (1 & 3).</span>
          </div>
        </div>

        {/* Staff Color Legend */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-xs">
          <span className="text-[#A0A0A0] font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Users size={13} className="text-[#99FFE4]" />
            Nhận dạng nhân sự theo màu sắc:
          </span>
          {displayStaffList.map((st) => (
            <div
              key={st.name}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold transition-all shadow-sm ${st.color.badge}`}
            >
              <span className={`w-2 h-2 rounded-full ${st.color.dot}`} />
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border ${st.color.avatarBg}`}>
                {st.name.charAt(0).toUpperCase()}
              </div>
              <span>{st.name}</span>
            </div>
          ))}
        </div>
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
            const dateKey = toDateKey(date);
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
                          className="mt-2 text-[11px] text-[#FFC799] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={12} /> Xếp ca
                        </button>
                      )}
                    </div>
                  ) : (
                    daySchedules.map((sch) => {
                      const staffObj = typeof sch.staffId === 'object' ? sch.staffId : null;
                      const staffName = staffObj ? `${staffObj.firstName} ${staffObj.lastName}` : 'Nhân viên';
                      const staffColor = getStaffColor(staffName || String(sch.staffId?._id || ''));
                      const shiftCfg = SHIFT_INFO[sch.shiftType] || SHIFT_INFO.Morning;
                      const ShiftIcon = shiftCfg.icon;

                      return (
                        <div
                          key={sch._id}
                          className={`rounded-xl border border-l-4 p-2 transition-all flex flex-col gap-1.5 shadow-sm hover:shadow-md ${staffColor.borderLeft} ${staffColor.cardBg}`}
                          title={sch.notes || `${shiftCfg.label} (${shiftCfg.time}) - ${staffName}`}
                        >
                          {/* Ca làm & Thời gian */}
                          <div className="flex items-center justify-between gap-1">
                            <span className={`font-bold flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${shiftCfg.badge}`}>
                              <ShiftIcon size={11} className="shrink-0" />
                              <span>{shiftCfg.label}</span>
                            </span>

                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[10px] text-[#A0A0A0] font-medium shrink-0">
                                {shiftCfg.time}
                              </span>
                              {(isManager || isAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSchedule(sch._id, staffName)}
                                  className="text-rose-400 opacity-40 hover:opacity-100 p-0.5 cursor-pointer shrink-0 transition-opacity"
                                  title="Hủy ca trực này"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Đủ Tên Nhân Sự */}
                          <div className={`px-2 py-1.5 rounded-lg border flex items-center gap-2 ${staffColor.badge}`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] border shrink-0 ${staffColor.avatarBg}`}>
                              {staffName.charAt(0).toUpperCase()}
                            </div>
                            <span className={`font-extrabold text-xs leading-tight break-words ${staffColor.text}`}>
                              {staffName}
                            </span>
                          </div>
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
                    className="mt-2 w-full py-1.5 rounded-lg border border-white/10 hover:border-[#FFC799] text-[#A0A0A0] hover:text-white text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus size={12} /> Thêm ca
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Staff Availability Registration Modal */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#161616] border border-[#FFC799]/30 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MessageSquarePlus className="text-[#FFC799]" size={22} />
                  Đăng ký Lịch Làm Việc & Báo Bận Tuần
                </h3>
                <p className="text-xs text-[#A0A0A0] mt-0.5">
                  Tuần từ: <strong className="text-white">{formatDateLabel(weekDays[0])}</strong> đến{' '}
                  <strong className="text-white">{formatDateLabel(weekDays[6])} / {weekDays[0].getFullYear()}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAvailabilityModal(false)}
                className="text-[#A0A0A0] hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Explanation box */}
            <div className="p-3.5 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#D0D0D0] space-y-1.5">
              <div className="font-bold text-[#FFC799] flex items-center gap-1.5">
                <Info size={15} />
                <span>Quy chuẩn 3 ca làm việc & Nguyên tắc xếp ca thông minh:</span>
              </div>
              <p className="text-[11px] text-[#A0A0A0] leading-relaxed">
                • <strong>Ca 1 (Sáng)</strong>: 07:00 - 12:00 | <strong>Ca 2 (Chiều)</strong>: 12:00 - 17:00 | <strong>Ca 3 (Tối)</strong>: 17:00 - 22:00.
                <br />
                • Hệ thống <strong>ưu tiên xếp 2 ca liên tiếp</strong> (1 & 2 hoặc 2 & 3). Ca cách 1 ca như <strong>1 & 3 (Sáng & Tối, nghỉ Chiều)</strong> là ca gãy phi lý nên AI chỉ <strong>miễn cưỡng chọn</strong> khi không còn ai khác.
              </p>
            </div>

            <form onSubmit={handleSaveAvailability} className="space-y-4">
              {/* Quick Message Input Box */}
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5 flex items-center justify-between">
                  <span>Nhắn lịch trực nhanh (Cú pháp ngắn gọn)</span>
                  <span className="text-[11px] text-[#A0A0A0] font-normal">
                    Ví dụ: <code className="text-[#FFC799]">t2 2 3, t3 1 3, t4 1 2, t5 bận, t6 1...</code>
                  </span>
                </label>
                <textarea
                  rows={2}
                  value={availabilityMessage}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  placeholder="Nhập lịch: t2 2 3, t3 1 3, t4 1 2, t5 bận, t6 2 3, t7 1, cn 3"
                  className="w-full bg-[#101010] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:border-[#FFC799] focus:outline-none"
                />
              </div>

              {/* Quick templates chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-[#A0A0A0]">Mẫu nhanh:</span>
                <button
                  type="button"
                  onClick={() =>
                    handleMessageChange('t2 2 3, t3 1 3, t4 1 2, t5 bận, t6 1, t7 2 3, cn 3')
                  }
                  className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 hover:border-[#FFC799] text-[#D0D0D0] hover:text-[#FFC799] cursor-pointer"
                >
                  Mẫu thực tế (t2 2 3, t3 1 3...)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleMessageChange('t2 1 2, t3 1 2, t4 1 2, t5 1 2, t6 1 2, t7 off, cn off')
                  }
                  className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 hover:border-[#FFC799] text-[#D0D0D0] hover:text-[#FFC799] cursor-pointer"
                >
                  Ca 1 & 2 (Thứ 2 - Thứ 6)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleMessageChange('t2 2 3, t3 2 3, t4 2 3, t5 2 3, t6 2 3, t7 3, cn 3')
                  }
                  className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 hover:border-[#FFC799] text-[#D0D0D0] hover:text-[#FFC799] cursor-pointer"
                >
                  Ca 2 & 3 (Thứ 2 - CN)
                </button>
              </div>

              {/* Interactive Visual Matrix of 7 Days */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Bảng tích chọn trực quan 7 ngày (Tự động đồng bộ với tin nhắn)
                  </span>
                  <span className="text-[10px] text-[#A0A0A0]">Click để bật/tắt ca</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                  {availabilitySlots.map((slot) => {
                    const dayIdx = slot.dayOfWeek - 1;
                    const dayCode = DAY_CODES[dayIdx];
                    const dayName = DAY_NAMES[dayIdx];

                    return (
                      <div
                        key={slot.dayOfWeek}
                        className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                          slot.isAllDayBusy
                            ? 'bg-rose-950/20 border-rose-500/30'
                            : 'bg-[#101010] border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-white/10 pb-1">
                          <span className="font-bold text-xs text-white">
                            {dayCode.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-[#A0A0A0]">{dayName}</span>
                        </div>

                        {/* Shift 1 Morning */}
                        <button
                          type="button"
                          disabled={slot.isAllDayBusy}
                          onClick={() => handleToggleSlotShift(slot.dayOfWeek, 'Morning')}
                          className={`px-1.5 py-1 rounded text-[11px] font-semibold border flex items-center justify-between transition-colors cursor-pointer ${
                            slot.availableShifts.includes('Morning')
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                              : 'bg-white/5 border-white/10 text-[#606060]'
                          } ${slot.isAllDayBusy ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          <span>Ca 1 (Sáng)</span>
                          {slot.availableShifts.includes('Morning') && <Check size={11} />}
                        </button>

                        {/* Shift 2 Afternoon */}
                        <button
                          type="button"
                          disabled={slot.isAllDayBusy}
                          onClick={() => handleToggleSlotShift(slot.dayOfWeek, 'Afternoon')}
                          className={`px-1.5 py-1 rounded text-[11px] font-semibold border flex items-center justify-between transition-colors cursor-pointer ${
                            slot.availableShifts.includes('Afternoon')
                              ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                              : 'bg-white/5 border-white/10 text-[#606060]'
                          } ${slot.isAllDayBusy ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          <span>Ca 2 (Chiều)</span>
                          {slot.availableShifts.includes('Afternoon') && <Check size={11} />}
                        </button>

                        {/* Shift 3 Evening */}
                        <button
                          type="button"
                          disabled={slot.isAllDayBusy}
                          onClick={() => handleToggleSlotShift(slot.dayOfWeek, 'Evening')}
                          className={`px-1.5 py-1 rounded text-[11px] font-semibold border flex items-center justify-between transition-colors cursor-pointer ${
                            slot.availableShifts.includes('Evening')
                              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                              : 'bg-white/5 border-white/10 text-[#606060]'
                          } ${slot.isAllDayBusy ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          <span>Ca 3 (Tối)</span>
                          {slot.availableShifts.includes('Evening') && <Check size={11} />}
                        </button>

                        {/* All day busy toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleAllDayBusy(slot.dayOfWeek)}
                          className={`mt-1 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                            slot.isAllDayBusy
                              ? 'bg-rose-500/30 border-rose-500/60 text-rose-300'
                              : 'bg-white/5 border-white/10 text-[#808080] hover:text-white'
                          }`}
                        >
                          {slot.isAllDayBusy ? 'Đã báo BẬN' : 'Báo bận ngày'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                  Ghi chú bổ sung cho Quản lý (nếu có)
                </label>
                <input
                  type="text"
                  value={availabilityNotes}
                  onChange={(e) => setAvailabilityNotes(e.target.value)}
                  placeholder="Ví dụ: Thứ 3 em có thể đổi ca nếu trạm quá tải, thứ 5 có lịch thi..."
                  className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAvailabilityModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-[#D0D0D0] hover:text-white cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingAvailability}
                  className="px-5 py-2.5 rounded-xl bg-[#FFC799] text-[#101010] text-xs font-bold hover:bg-[#ffb77d] transition-all shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>
                    {submittingAvailability ? 'Đang gửi...' : 'Gửi đăng ký lịch cho Quản lý'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manager Review Modal: View All Staff Availabilities */}
      {showViewAvailabilitiesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#161616] border border-white/15 rounded-2xl w-full max-w-3xl p-6 space-y-5 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#FFC799] flex items-center gap-1.5">
                  <Users size={14} />
                  <span>DANH SÁCH LỊCH ĐĂNG KÝ CỦA NHÂN VIÊN</span>
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  Nguyện Vọng & Báo Bận Ca Trực Trong Tuần
                </h3>
                <p className="text-xs text-[#A0A0A0] mt-0.5">
                  Dữ liệu này được kết nối trực tiếp vào bộ máy <strong>AI Tối ưu Phân ca</strong> để tự động xếp ca thuận tiện nhất cho nhân viên.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowViewAvailabilitiesModal(false)}
                className="text-[#A0A0A0] hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {availabilities.length === 0 ? (
              <div className="p-12 text-center text-[#A0A0A0] space-y-2">
                <AlertCircle size={28} className="mx-auto text-[#606060]" />
                <p className="text-sm font-semibold text-white">Chưa có nhân viên nào gửi lịch đăng ký tuần này.</p>
                <p className="text-xs text-[#808080]">
                  Nhân viên có thể nhấn nút "Đăng ký lịch tuần" để gửi lịch rảnh/bận dạng tin nhắn ngắn (ví dụ: <code className="text-[#FFC799]">t2 2 3, t3 1 3...</code>).
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {availabilities.map((item) => {
                  const staffUser = typeof item.staffId === 'object' ? item.staffId : null;
                  const staffName = staffUser
                    ? `${staffUser.firstName} ${staffUser.lastName}`.trim() || staffUser.username
                    : 'Nhân viên';

                  return (
                    <div
                      key={item._id}
                      className="p-4 rounded-xl bg-[#101010] border border-white/10 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#FFC799]/15 border border-[#FFC799]/30 flex items-center justify-center font-bold text-xs text-[#FFC799]">
                            {staffName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">{staffName}</div>
                            <div className="text-[11px] text-[#A0A0A0]">
                              {staffUser?.email} • @{staffUser?.username}
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] text-[#808080]">
                          Đăng ký lúc: {new Date(item.updatedAt).toLocaleString('vi-VN')}
                        </div>
                      </div>

                      {/* Raw Message Card */}
                      {item.rawMessage && (
                        <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 font-mono text-xs text-[#FFC799] flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-[#808080] font-sans">
                            Tin nhắn:
                          </span>
                          <span>"{item.rawMessage}"</span>
                        </div>
                      )}

                      {/* 7-Day Matrix Strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-7 gap-1.5 text-center">
                        {item.slots.map((sl) => {
                          const dayIdx = sl.dayOfWeek - 1;
                          const dayCode = DAY_CODES[dayIdx] || `t${sl.dayOfWeek}`;

                          let badgeClass = 'bg-white/5 border-white/10 text-[#808080]';
                          let label = 'Mở';

                          if (sl.isAllDayBusy || sl.availableShifts.length === 0) {
                            badgeClass = 'bg-rose-500/15 border-rose-500/30 text-rose-300';
                            label = 'Bận';
                          } else if (sl.availableShifts.length === 3) {
                            badgeClass = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
                            label = 'Full (1 2 3)';
                          } else {
                            const nums = sl.availableShifts
                              .map((s) => (s === 'Morning' ? '1' : s === 'Afternoon' ? '2' : '3'))
                              .sort()
                              .join(' ');
                            badgeClass = 'bg-sky-500/15 border-sky-500/30 text-sky-300 font-bold';
                            label = `Ca ${nums}`;
                          }

                          return (
                            <div
                              key={sl.dayOfWeek}
                              className={`p-1.5 rounded-lg border text-xs flex flex-col gap-0.5 ${badgeClass}`}
                            >
                              <span className="font-extrabold uppercase text-[10px] text-[#A0A0A0]">
                                {dayCode}
                              </span>
                              <span className="text-[11px]">{label}</span>
                            </div>
                          );
                        })}
                      </div>

                      {item.notes && (
                        <div className="text-xs text-[#D0D0D0] italic">
                          <span className="text-[#808080]">Ghi chú:</span> {item.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-end pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowViewAvailabilitiesModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-[#D0D0D0] hover:text-white cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
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
                className="text-[#A0A0A0] hover:text-white p-1 rounded-lg cursor-pointer"
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
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
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
                  className="px-4 py-2 rounded-xl border border-white/10 text-sm font-medium text-[#D0D0D0] hover:text-white transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#FFC799] text-[#101010] text-sm font-semibold hover:bg-[#ffb77d] transition-colors disabled:opacity-50 cursor-pointer"
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
          <div className="bg-[#161616] border border-[#99FFE4]/40 rounded-2xl w-full max-w-5xl p-6 space-y-5 shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#99FFE4] flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>AI WORKFORCE SCHEDULING ENGINE • GOOGLE GEMINI & HEURISTIC SOLVER</span>
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  AI Tự Động Xếp Lịch Phân Ca Tuần
                </h3>
                <p className="text-xs text-[#A0A0A0] mt-0.5">
                  Quản lý gửi ca làm của nhân viên cho AI xử lý. Hệ thống tự động xếp lịch cả tuần hợp lý nhất: ưu tiên ca liên tiếp (1-2 hoặc 2-3) và tránh ca gãy (1 & 3).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAiOptimizerModal(false)}
                className="text-[#A0A0A0] hover:text-white p-1.5 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* AI Scheduling Rules Banner */}
            <div className="p-3.5 rounded-xl bg-[#101010] border border-[#99FFE4]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-[#99FFE4] flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  <span>Quy Chuẩn Xếp Lịch Phân Ca Tự Động:</span>
                </div>
                <div className="text-[11px] text-[#A0A0A0] leading-relaxed">
                  • <strong>Ca 1 (Sáng)</strong>: 07:00 - 12:00 | <strong>Ca 2 (Chiều)</strong>: 12:00 - 17:00 | <strong>Ca 3 (Tối)</strong>: 17:00 - 22:00.
                  <br />
                  • <strong>Ưu tiên ca liên tiếp</strong>: Khi 1 nhân sự làm 2 ca/ngày, ưu tiên xếp ca 1 & 2 (Sáng - Chiều) hoặc 2 & 3 (Chiều - Tối).
                  <br />
                  • <strong>Tránh ca gãy 1 & 3</strong>: Ca cách 1 ca (Sáng & Tối, nghỉ Chiều) là phi lý, chỉ xếp <em>miễn cưỡng</em> khi không còn ai khác.
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-[#99FFE4]/10 border border-[#99FFE4]/30 text-[#99FFE4] font-mono text-xs font-bold">
                  {aiResult?.aiEngine || (geminiApiKey ? 'Google Gemini AI' : 'Bộ giải Quy chuẩn')}
                </span>
              </div>
            </div>

            {/* SECTION 1: Manager Inputs Staff Shift Messages */}
            <div className="p-4 rounded-xl bg-[#101010] border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#99FFE4] text-[#101010] font-black text-xs flex items-center justify-center">
                    1
                  </span>
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    Gửi ca làm của các nhân viên cho AI xử lý
                  </label>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setMultiStaffInput(
                        `Nguyễn Văn An: t2 1 2, t3 1 2, t4 1 2, t5 1 2, t6 1, t7 bận, cn bận\nPhạm Văn Ca: t2 2 3, t3 2 3, t4 2 3, t5 bận, t6 2 3, t7 2 3, cn 3\nTrần Thị Bình: t2 1, t3 1 3, t4 1 2, t5 1 2, t6 1 2, t7 1, cn 1 2`
                      )
                    }
                    className="text-[11px] text-[#FFC799] hover:underline cursor-pointer"
                  >
                    Dán mẫu thực tế (An, Ca, Bình)
                  </button>
                  <span className="text-white/20">•</span>
                  <button
                    type="button"
                    onClick={() => setMultiStaffInput('')}
                    className="text-[11px] text-[#A0A0A0] hover:text-white cursor-pointer"
                  >
                    Xóa
                  </button>
                </div>
              </div>

              <textarea
                rows={4}
                value={multiStaffInput}
                onChange={(e) => setMultiStaffInput(e.target.value)}
                placeholder="Dán tin nhắn Zalo/Chat của nhân viên, ví dụ:&#10;Nguyễn Văn An: t2 1 2, t3 1 2, t4 1 2, t5 1 2, t6 1, t7 bận, cn bận&#10;Phạm Văn Ca: t2 2 3, t3 2 3, t4 2 3, t5 bận, t6 2 3, t7 2 3, cn 3&#10;Trần Thị Bình: t2 1, t3 1 3, t4 1 2, t5 1 2, t6 1 2, t7 1, cn 1 2"
                className="w-full bg-[#161616] border border-white/15 rounded-xl p-3 text-xs text-white font-mono focus:border-[#99FFE4] focus:outline-none leading-relaxed"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#D0D0D0]">
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="rounded border-white/20 bg-[#161616] text-[#99FFE4] focus:ring-0 cursor-pointer"
                  />
                  <span>
                    <strong>Xếp mới toàn bộ tuần &amp; ghi đè lịch cũ</strong> (Tự động sắp xếp đủ 21 ca cho 7 ngày)
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                  className="text-[11px] text-[#A0A0A0] hover:text-[#FFC799] flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                >
                  <Sparkles size={12} />
                  <span>{showApiKeyInput ? 'Ẩn API Key' : 'Cấu hình Google Gemini API Key'}</span>
                </button>
              </div>

              {showApiKeyInput && (
                <div className="pt-2.5 border-t border-white/10 space-y-2">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="Dán mã API Key Google Gemini (AIzaSy...) tại đây"
                      className="flex-1 bg-[#161616] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#99FFE4] focus:outline-none"
                    />
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-[#99FFE4]/15 border border-[#99FFE4]/35 text-[#99FFE4] hover:bg-[#99FFE4]/25 text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                      title="Mở Google AI Studio để lấy API Key miễn phí"
                    >
                      <ExternalLink size={13} />
                      <span>Lấy Key miễn phí ↗</span>
                    </a>
                    {geminiApiKey && (
                      <button
                        type="button"
                        onClick={() => {
                          setGeminiApiKey('');
                          localStorage.removeItem('motorent_gemini_api_key');
                        }}
                        className="px-3 py-2 rounded-xl border border-white/10 text-xs text-[#A0A0A0] hover:text-white cursor-pointer"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                  <div className="text-[11px] text-[#A0A0A0] leading-relaxed flex items-start gap-1.5 bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                    <Info size={14} className="text-[#99FFE4] shrink-0 mt-0.5" />
                    <span>
                      <strong>Không bắt buộc:</strong> Nếu để trống ô này, hệ thống tự động sử dụng <strong>Bộ giải Thuật toán Quy chuẩn</strong> có sẵn — xếp lịch tối ưu 100% hoàn toàn miễn phí. Nếu muốn dùng Google Gemini AI, bạn chỉ cần bấm nút <em>"Lấy Key miễn phí"</em> ở trên để lấy trong 30 giây từ Google AI Studio.
                    </span>
                  </div>
                </div>
              )}

              {/* Action Button: Send to AI */}
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => handleRunAiOptimization(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#99FFE4] to-[#60E0B0] text-[#101010] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg cursor-pointer disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>AI Đang Phân Tích &amp; Tự Động Xếp Lịch Tuần...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Gửi Cho AI Xử Lý &amp; Xếp Lịch Tự Động</span>
                  </>
                )}
              </button>
            </div>

            {/* SECTION 2: AI Optimization Results */}
            {aiLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                <RefreshCw size={32} className="animate-spin text-[#99FFE4]" />
                <p className="text-sm font-bold text-white">
                  AI đang bóc tách tin nhắn ca làm của từng nhân sự...
                </p>
                <p className="text-xs text-[#A0A0A0]">
                  Tính toán 21 ca trong tuần, ưu tiên ca liên tiếp (1-2 hoặc 2-3) và loại trừ ca gãy phi lý (1 &amp; 3)...
                </p>
              </div>
            ) : aiResult ? (
              <div className="space-y-5 pt-2">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <span className="w-5 h-5 rounded-full bg-[#99FFE4] text-[#101010] font-black text-xs flex items-center justify-center">
                    2
                  </span>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Kết Quả Lịch Phân Ca Tối Ưu Do AI Sắp Xếp Tự Động
                  </h4>
                </div>

                {/* KPI Analytics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#101010] border border-white/10">
                    <span className="text-[10px] text-[#A0A0A0] uppercase font-bold block">
                      Độ phủ ca trực tuần
                    </span>
                    <span className="text-lg font-mono font-black text-[#99FFE4]">
                      {aiResult.recommendations.length} / 21 ca ({aiResult.analytics.coverageRatePct}%)
                    </span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5 font-medium">
                      Phủ kín 100% các ca
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#101010] border border-white/10">
                    <span className="text-[10px] text-[#A0A0A0] uppercase font-bold block">
                      Ca làm liên tiếp
                    </span>
                    <span className="text-lg font-mono font-black text-sky-400">
                      {aiResult.analytics.consecutiveShiftsCount || 0} ca
                    </span>
                    <span className="text-[10px] text-[#A0A0A0] block mt-0.5">
                      Ca 1-2 &amp; Ca 2-3 tiện lợi
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#101010] border border-white/10">
                    <span className="text-[10px] text-[#A0A0A0] uppercase font-bold block">
                      Ca gãy phi lý (1 &amp; 3)
                    </span>
                    <span className="text-lg font-mono font-black text-emerald-400">
                      {aiResult.analytics.reluctantSplitShiftsCount || 0} ca
                    </span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5 font-medium">
                      Đã loại bỏ hoàn toàn
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#101010] border border-white/10">
                    <span className="text-[10px] text-[#A0A0A0] uppercase font-bold block">
                      Công bằng khối lượng
                    </span>
                    <span className="text-lg font-mono font-black text-[#FFC799]">
                      {aiResult.analytics.fairnessIndexPct}%
                    </span>
                    <span className="text-[10px] text-[#A0A0A0] block mt-0.5">
                      Cân bằng số giờ giữa các bạn
                    </span>
                  </div>
                </div>

                {/* 7-DAY VISUAL WEEKLY MATRIX GENERATED BY AI */}
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#99FFE4] flex items-center gap-1.5">
                      <CalendarIcon size={14} />
                      <span>Bảng Lịch Tuần Đã Xếp Tự Động (7 Ngày x 3 Ca)</span>
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-[#A0A0A0] uppercase font-bold mr-1">Màu nhân sự:</span>
                      {displayStaffList.map((st) => (
                        <span
                          key={st.name}
                          className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1 ${st.color.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${st.color.dot}`} />
                          {st.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                    {weekDays.map((dayDate, dayIdx) => {
                      const dayKey = toDateKey(dayDate);
                      const dayRecs = recsByDate[dayKey] || [];

                      return (
                        <div
                          key={dayKey}
                          className="p-2.5 rounded-xl bg-[#101010] border border-white/10 flex flex-col gap-2"
                        >
                          <div className="border-b border-white/10 pb-1.5 text-center">
                            <div className="text-[10px] font-bold text-[#A0A0A0] uppercase">
                              {DAY_NAMES[dayIdx]}
                            </div>
                            <div className="text-xs font-black text-white">
                              {formatDateLabel(dayDate)}
                            </div>
                          </div>

                          <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                            {(['Morning', 'Afternoon', 'Evening'] as ShiftType[]).map((st) => {
                              const rec = dayRecs.find((r) => r.shiftType === st);
                              const shiftCfg = SHIFT_INFO[st];
                              const ShiftIcon = shiftCfg.icon;

                              if (!rec) {
                                return (
                                  <div
                                    key={st}
                                    className="p-2 rounded-xl border border-dashed border-white/10 text-[10px] text-[#606060] text-center"
                                  >
                                    {shiftCfg.label}: Trống
                                  </div>
                                );
                              }

                              const staffColor = getStaffColor(rec.staffName || rec.staffId);
                              const isConsecutive = rec.reason.includes('liên tiếp');
                              const isReluctant = rec.reason.includes('Miễn cưỡng');

                              return (
                                <div
                                  key={st}
                                  className={`p-2.5 rounded-xl border border-l-4 text-left flex flex-col gap-1.5 transition-all shadow-sm ${staffColor.borderLeft} ${staffColor.cardBg}`}
                                >
                                  {/* Shift type row */}
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className={`font-bold flex items-center gap-1 px-1.5 py-0.5 rounded border ${shiftCfg.badge}`}>
                                      <ShiftIcon size={11} />
                                      {shiftCfg.label}
                                    </span>
                                    <span className="font-mono text-[9px] text-[#A0A0A0]">{shiftCfg.time}</span>
                                  </div>

                                  {/* Staff name with Distinct Color Pill */}
                                  <div className={`p-1.5 rounded-lg border flex items-center gap-1.5 ${staffColor.badge}`}>
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border shrink-0 ${staffColor.avatarBg}`}>
                                      {rec.staffName.charAt(0).toUpperCase()}
                                    </span>
                                    <span className={`font-black text-xs truncate ${staffColor.text}`}>
                                      {rec.staffName}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                    {isConsecutive && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-500/30 text-sky-200 border border-sky-400/30">
                                        Ca liên tiếp
                                      </span>
                                    )}
                                    {isReluctant && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/30 text-rose-200 border border-rose-400/30">
                                        Miễn cưỡng 1 &amp; 3
                                      </span>
                                    )}
                                    {rec.reason.includes('Khớp lịch') ? (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-500/20 text-emerald-300">
                                        Khớp lịch
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        Điều động ca
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Staff Workload Balance Bars */}
                <div className="p-4 rounded-xl bg-[#101010] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#FFC799] flex items-center gap-1.5">
                      <Users size={14} />
                      <span>Phân bổ khối lượng công việc nhân sự (Nhận diện theo màu)</span>
                    </h4>
                    <span className="text-[11px] text-[#A0A0A0]">Đồng đều ~35h/tuần</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {aiResult.staffWorkloadSummary.map((st) => {
                      const staffColor = getStaffColor(st.staffName || st.staffId);
                      return (
                        <div
                          key={st.staffId}
                          className={`p-3 rounded-xl border border-l-4 flex items-center justify-between text-xs transition-all shadow-sm ${staffColor.borderLeft} ${staffColor.cardBg}`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] border ${staffColor.avatarBg}`}>
                                {st.staffName.charAt(0).toUpperCase()}
                              </div>
                              <div className={`font-black text-xs truncate ${staffColor.text}`}>{st.staffName}</div>
                            </div>
                            <div className="text-[11px] text-[#A0A0A0]">
                              Chuyên cần: <strong className="text-emerald-400">{st.reliabilityPct}%</strong>
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <span className={`text-sm font-black ${staffColor.text}`}>{st.totalShifts} ca</span>
                            <span className="block text-[10px] text-[#6E6E6E]">~{st.estimatedHours} giờ/tuần</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAiOptimizerModal(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-[#D0D0D0] hover:text-white cursor-pointer"
                  >
                    Đóng
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={aiApplying}
                      onClick={() => handleRunAiOptimization(true)}
                      className="px-6 py-2.5 rounded-xl bg-[#99FFE4] hover:bg-[#99FFE4]/90 text-[#101010] text-xs font-black transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-[#99FFE4]/15"
                    >
                      <Sparkles size={16} />
                      <span>
                        {aiApplying
                          ? 'Đang lưu lịch phân ca AI vào hệ thống...'
                          : `Xác nhận & Áp dụng lịch này (${aiResult.recommendations.length} ca)`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};