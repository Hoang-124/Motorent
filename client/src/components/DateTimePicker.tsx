import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sunrise,
  Sun,
  Moon,
  Sparkles,
  Info,
} from 'lucide-react';

export interface DateTimePickerProps {
  label?: React.ReactNode;
  dateValue: string; // YYYY-MM-DD
  timeValue: string; // HH:mm
  minDate?: string; // YYYY-MM-DD
  referenceDate?: string; // YYYY-MM-DD (pickupDate when mode === 'return')
  referenceTime?: string; // HH:mm (pickupTime when mode === 'return')
  mode?: 'pickup' | 'return';
  compact?: boolean;
  onDateChange: (newDate: string) => void;
  onTimeChange: (newTime: string) => void;
}

const WEEKDAYS_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const MORNING_SLOTS = [
  '06:30', '07:00', '07:30', '08:00',
  '08:30', '09:00', '09:30', '10:00',
  '10:30', '11:00', '11:30',
];

export const AFTERNOON_SLOTS = [
  '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
];

export const EVENING_SLOTS = [
  '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30',
];

export const ALL_TIME_SLOTS = [...MORNING_SLOTS, ...AFTERNOON_SLOTS, ...EVENING_SLOTS];

// Minimum rental gap when returning on the same day: 2 hours (120 minutes)
export const MIN_SAME_DAY_GAP_MINUTES = 120;

export const timeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const formatLocalDateStr = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseLocalDateStr = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
};

export const addDaysToDateStr = (dateStr: string, days: number): string => {
  const d = parseLocalDateStr(dateStr);
  d.setDate(d.getDate() + days);
  return formatLocalDateStr(d);
};

export const formatDisplayDateVN = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
};

export const getVietnameseDayLabel = (dateStr: string): { dayName: string; badge?: string } => {
  const target = parseLocalDateStr(dateStr);
  const today = new Date();
  const todayStr = formatLocalDateStr(today);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatLocalDateStr(tomorrow);

  const dayOfWeek = target.getDay();
  const names = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = names[dayOfWeek] || '';

  if (dateStr === todayStr) {
    return { dayName, badge: 'Hôm nay' };
  }
  if (dateStr === tomorrowStr) {
    return { dayName, badge: 'Ngày mai' };
  }
  return { dayName };
};

export const getTimePeriodLabel = (timeStr: string): string => {
  const hour = parseInt(timeStr.split(':')[0] || '8', 10);
  if (hour < 12) return 'Buổi sáng';
  if (hour < 18) return 'Buổi chiều';
  return 'Buổi tối';
};

export const getNextAvailableSlotForToday = (): string => {
  const now = new Date();
  const minMinutes = now.getHours() * 60 + now.getMinutes() + 15;
  for (const slot of ALL_TIME_SLOTS) {
    if (timeToMinutes(slot) >= minMinutes) {
      return slot;
    }
  }
  return '08:30';
};

/**
 * Ensures returnDate & returnTime are always valid relative to pickupDate & pickupTime.
 * If returnDate === pickupDate, returnTime must be >= pickupTime + 2 hours (120 mins).
 * If pickupTime is too late on pickupDate for a 2h same-day rental (> 20:30), returnDate advances to pickupDate + 1 day.
 */
export const normalizeReturnSchedule = (
  pickupDate: string,
  pickupTime: string,
  returnDate: string,
  returnTime: string
): { returnDate: string; returnTime: string } => {
  let nextReturnDate = returnDate < pickupDate ? pickupDate : returnDate;
  let nextReturnTime = returnTime;

  if (nextReturnDate === pickupDate) {
    const minReturnMins = timeToMinutes(pickupTime) + MIN_SAME_DAY_GAP_MINUTES;
    const earliestSlotSameDay = ALL_TIME_SLOTS.find((s) => timeToMinutes(s) >= minReturnMins);

    if (!earliestSlotSameDay) {
      // Pickup is after 20:30, so same-day return within operating hours (up to 22:30) is impossible
      nextReturnDate = addDaysToDateStr(pickupDate, 1);
      nextReturnTime = '08:30';
    } else if (timeToMinutes(nextReturnTime) < minReturnMins) {
      nextReturnTime = earliestSlotSameDay;
    }
  }

  return { returnDate: nextReturnDate, returnTime: nextReturnTime };
};

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  dateValue,
  timeValue,
  minDate,
  referenceDate,
  referenceTime,
  mode = 'pickup',
  compact = false,
  onDateChange,
  onTimeChange,
}) => {
  const [openPanel, setOpenPanel] = useState<'date' | 'time' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsedCurrent = parseLocalDateStr(dateValue);
  const [viewYear, setViewYear] = useState<number>(parsedCurrent.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsedCurrent.getMonth());

  useEffect(() => {
    const d = parseLocalDateStr(dateValue);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [dateValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenPanel(null);
      }
    };
    if (openPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openPanel]);

  const todayStr = formatLocalDateStr(new Date());

  // Determine if same-day return is possible when mode === 'return'
  const canReturnSameDay =
    mode !== 'return' ||
    !referenceTime ||
    timeToMinutes(referenceTime) + MIN_SAME_DAY_GAP_MINUTES <= timeToMinutes('22:30');

  const baseMinDate = minDate || todayStr;
  const effectiveMinDate =
    mode === 'return' && referenceDate && !canReturnSameDay
      ? addDaysToDateStr(referenceDate, 1)
      : baseMinDate;

  const { dayName, badge } = getVietnameseDayLabel(dateValue);
  const timePeriod = getTimePeriodLabel(timeValue);

  // Build calendar cells
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

  const calendarCells: Array<{ day: number; dateStr: string } | null> = [];
  for (let i = 0; i < startOffset; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    calendarCells.push({ day: d, dateStr: `${viewYear}-${mStr}-${dStr}` });
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Minimum valid time in minutes for the currently selected dateValue
  const getMinAllowedMinutesForCurrentDate = (): number => {
    let minMins = 0;

    // 1. If date is today, cannot pick a time earlier than current time + 15 mins
    if (dateValue === todayStr) {
      const now = new Date();
      minMins = Math.max(minMins, now.getHours() * 60 + now.getMinutes() + 15);
    }

    // 2. If mode is 'return' and return date is the SAME day as pickup date (referenceDate),
    //    return time must be at least 2 hours (120 mins) after pickupTime (referenceTime)
    if (mode === 'return' && referenceDate && dateValue === referenceDate && referenceTime) {
      minMins = Math.max(minMins, timeToMinutes(referenceTime) + MIN_SAME_DAY_GAP_MINUTES);
    }

    return minMins;
  };

  const minAllowedMinutes = getMinAllowedMinutesForCurrentDate();

  // Filter slots so impossible/past slots are NOT shown at all
  const validMorningSlots = MORNING_SLOTS.filter((s) => timeToMinutes(s) >= minAllowedMinutes);
  const validAfternoonSlots = AFTERNOON_SLOTS.filter((s) => timeToMinutes(s) >= minAllowedMinutes);
  const validEveningSlots = EVENING_SLOTS.filter((s) => timeToMinutes(s) >= minAllowedMinutes);
  const totalValidSlots =
    validMorningSlots.length + validAfternoonSlots.length + validEveningSlots.length;

  const handleSelectDate = (newDateStr: string) => {
    if (newDateStr < effectiveMinDate) return;
    onDateChange(newDateStr);

    // Check if current timeValue is valid on the newly selected date
    let requiredMinMins = 0;
    if (newDateStr === todayStr) {
      const now = new Date();
      requiredMinMins = Math.max(requiredMinMins, now.getHours() * 60 + now.getMinutes() + 15);
    }
    if (mode === 'return' && referenceDate && newDateStr === referenceDate && referenceTime) {
      requiredMinMins = Math.max(
        requiredMinMins,
        timeToMinutes(referenceTime) + MIN_SAME_DAY_GAP_MINUTES
      );
    }

    if (timeToMinutes(timeValue) < requiredMinMins) {
      const firstValid = ALL_TIME_SLOTS.find((s) => timeToMinutes(s) >= requiredMinMins);
      if (firstValid) {
        onTimeChange(firstValid);
      }
    }

    setOpenPanel('time');
  };

  const handleQuickDateOffset = (baseDateStr: string, offsetDays: number) => {
    const targetStr = addDaysToDateStr(baseDateStr, offsetDays);
    if (targetStr >= effectiveMinDate) {
      handleSelectDate(targetStr);
      setOpenPanel(null);
    }
  };

  const isSameDayReturn = mode === 'return' && referenceDate && dateValue === referenceDate;

  return (
    <div ref={containerRef} className="relative space-y-2">
      {label && <div>{label}</div>}

      {/* Dual Trigger Buttons: Date Card + Time Card */}
      <div className="grid grid-cols-12 gap-2">
        {/* Date Trigger (7 cols) */}
        <button
          type="button"
          onClick={() => setOpenPanel(openPanel === 'date' ? null : 'date')}
          className={`col-span-7 flex items-center justify-between text-left rounded-xl border transition-all cursor-pointer ${
            compact ? 'px-2.5 py-2' : 'px-3 py-2.5'
          } ${
            openPanel === 'date'
              ? 'bg-[#1E1E1E] border-[#FFC799] shadow-[0_0_0_3px_rgba(255,199,153,0.15)]'
              : 'bg-[#0A0A0A] border-white/12 hover:border-[#FFC799]/50 hover:bg-[#141414]'
          }`}
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#FFC799]/12 border border-[#FFC799]/25 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-[#FFC799]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-medium text-[#A0A0A0] truncate">
                  {dayName}
                </span>
                {badge && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FFC799]/15 text-[#FFC799] shrink-0">
                    {badge}
                  </span>
                )}
              </div>
              <div className="text-xs sm:text-sm font-mono font-bold text-[#F5F5F5] tracking-tight">
                {formatDisplayDateVN(dateValue)}
              </div>
            </div>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#A0A0A0] shrink-0 transition-transform duration-200 ${
              openPanel === 'date' ? 'rotate-180 text-[#FFC799]' : ''
            }`}
          />
        </button>

        {/* Time Trigger (5 cols) */}
        <button
          type="button"
          onClick={() => setOpenPanel(openPanel === 'time' ? null : 'time')}
          className={`col-span-5 flex items-center justify-between text-left rounded-xl border transition-all cursor-pointer ${
            compact ? 'px-2.5 py-2' : 'px-3 py-2.5'
          } ${
            openPanel === 'time'
              ? 'bg-[#1E1E1E] border-[#FFC799] shadow-[0_0_0_3px_rgba(255,199,153,0.15)]'
              : 'bg-[#0A0A0A] border-white/12 hover:border-[#FFC799]/50 hover:bg-[#141414]'
          }`}
        >
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#FFC799]/12 border border-[#FFC799]/25 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-[#FFC799]" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-medium text-[#A0A0A0] truncate">
                {timePeriod}
              </span>
              <div className="text-xs sm:text-sm font-mono font-bold text-[#F5F5F5] tracking-tight">
                {timeValue}
              </div>
            </div>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#A0A0A0] shrink-0 transition-transform duration-200 ${
              openPanel === 'time' ? 'rotate-180 text-[#FFC799]' : ''
            }`}
          />
        </button>
      </div>

      {/* =====================================================================
          POPOVER 1: CUSTOM VESPER CALENDAR
         ===================================================================== */}
      {openPanel === 'date' && (
        <div className="absolute left-0 right-0 z-50 mt-2 p-4 rounded-2xl bg-[#161616] border border-[#FFC799]/35 shadow-[0_24px_48px_rgba(0,0,0,0.92)] animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Date Chips */}
          <div className="flex items-center gap-1.5 pb-3 mb-3 border-b border-white/10 overflow-x-auto">
            {mode === 'pickup' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleQuickDateOffset(todayStr, 0)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    dateValue === todayStr
                      ? 'bg-[#FFC799] text-[#101010] font-bold'
                      : 'bg-[#1E1E1E] text-[#A0A0A0] hover:text-[#F5F5F5]'
                  }`}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDateOffset(todayStr, 1)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap bg-[#1E1E1E] text-[#A0A0A0] hover:text-[#F5F5F5] transition-all cursor-pointer"
                >
                  Ngày mai
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDateOffset(todayStr, 2)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap bg-[#1E1E1E] text-[#A0A0A0] hover:text-[#F5F5F5] transition-all cursor-pointer"
                >
                  +2 ngày
                </button>
              </>
            ) : (
              <>
                {canReturnSameDay && (
                  <button
                    type="button"
                    onClick={() => handleQuickDateOffset(referenceDate || todayStr, 0)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      dateValue === (referenceDate || todayStr)
                        ? 'bg-[#FFC799] text-[#101010] font-bold'
                        : 'bg-[#1E1E1E] text-[#A0A0A0] hover:text-[#F5F5F5]'
                    }`}
                  >
                    Trong ngày
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleQuickDateOffset(referenceDate || todayStr, 1)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap bg-[#1E1E1E] text-[#A0A0A0] hover:text-[#F5F5F5] transition-all cursor-pointer"
                >
                  +1 ngày
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDateOffset(referenceDate || todayStr, 2)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap bg-[#1E1E1E] text-[#A0A0A0] hover:text-[#F5F5F5] transition-all cursor-pointer"
                >
                  +2 ngày
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDateOffset(referenceDate || todayStr, 3)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap bg-[#1E1E1E] text-[#A0A0A0] hover:text-[#F5F5F5] transition-all cursor-pointer"
                >
                  +3 ngày
                </button>
              </>
            )}
          </div>

          {/* Month & Year Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg bg-[#1E1E1E] hover:bg-[#262626] text-[#F5F5F5] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
              Tháng {viewMonth + 1}, {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg bg-[#1E1E1E] hover:bg-[#262626] text-[#F5F5F5] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEKDAYS_SHORT.map((w) => (
              <span key={w} className="text-[10px] font-mono font-bold text-[#6E6E6E] py-1">
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="h-8" />;
              }
              const isDisabled = cell.dateStr < effectiveMinDate;
              const isSelected = cell.dateStr === dateValue;
              const isToday = cell.dateStr === todayStr;
              const isInRange =
                referenceDate &&
                cell.dateStr > referenceDate &&
                cell.dateStr < dateValue;
              const isRangeStart = referenceDate && cell.dateStr === referenceDate;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDate(cell.dateStr)}
                  className={`h-8 rounded-lg text-xs font-mono transition-all flex items-center justify-center relative ${
                    isDisabled
                      ? 'text-[#6E6E6E]/35 cursor-not-allowed'
                      : isSelected
                      ? 'bg-[#FFC799] text-[#101010] font-black shadow-md cursor-pointer'
                      : isRangeStart
                      ? 'bg-[#FFC799]/25 text-[#FFC799] font-bold border border-[#FFC799]/40 cursor-pointer'
                      : isInRange
                      ? 'bg-[#FFC799]/12 text-[#FFC799] font-semibold cursor-pointer'
                      : 'text-[#F5F5F5] hover:bg-[#1E1E1E] cursor-pointer'
                  }`}
                >
                  <span>{cell.day}</span>
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-[#99FFE4] absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer info */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-[#A0A0A0]">
            <span>
              Đang chọn: <strong className="text-[#FFC799] font-mono">{formatDisplayDateVN(dateValue)}</strong>
            </span>
            <button
              type="button"
              onClick={() => setOpenPanel('time')}
              className="text-[#FFC799] font-bold hover:underline cursor-pointer"
            >
              Chọn giờ →
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          POPOVER 2: CUSTOM VESPER TIME-SLOT GRID (SMART FILTERED)
         ===================================================================== */}
      {openPanel === 'time' && (
        <div className="absolute left-0 right-0 z-50 mt-2 p-4 rounded-2xl bg-[#161616] border border-[#FFC799]/35 shadow-[0_24px_48px_rgba(0,0,0,0.92)] animate-in fade-in zoom-in-95 duration-150 max-h-[380px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FFC799]" />
              <span className="text-xs font-bold text-[#F5F5F5]">
                Chọn khung giờ {mode === 'pickup' ? 'nhận xe' : 'trả xe'} ({formatDisplayDateVN(dateValue)})
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#FFC799] bg-[#FFC799]/12 px-2 py-0.5 rounded-md">
              {timeValue}
            </span>
          </div>

          {/* Contextual Hint when filtering slots on Same-Day Return or Today Pickup */}
          {isSameDayReturn && referenceTime && (
            <div className="mb-3 px-2.5 py-2 rounded-xl bg-[#FFC799]/10 border border-[#FFC799]/25 flex items-center space-x-2 text-[11px] text-[#FFC799]">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                Nhận xe lúc <strong className="font-mono">{referenceTime}</strong> • Giờ trả cùng ngày cách tối thiểu 2 tiếng.
              </span>
            </div>
          )}

          {mode === 'pickup' && dateValue === todayStr && minAllowedMinutes > timeToMinutes('06:30') && (
            <div className="mb-3 px-2.5 py-2 rounded-xl bg-[#99FFE4]/10 border border-[#99FFE4]/25 flex items-center space-x-2 text-[11px] text-[#99FFE4]">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Chỉ hiển thị các khung giờ nhận xe khả dụng từ hiện tại trở đi.</span>
            </div>
          )}

          {totalValidSlots === 0 ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-xs text-[#A0A0A0]">
                Đã hết khung giờ khả dụng trong ngày <strong className="text-[#F5F5F5]">{formatDisplayDateVN(dateValue)}</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  const nextDay = addDaysToDateStr(dateValue, 1);
                  onDateChange(nextDay);
                  onTimeChange('08:30');
                  setOpenPanel(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#FFC799] text-[#101010] text-xs font-bold cursor-pointer"
              >
                Chuyển sang ngày mai ({formatDisplayDateVN(addDaysToDateStr(dateValue, 1))})
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Morning (only rendered if there are valid morning slots) */}
              {validMorningSlots.length > 0 && (
                <div>
                  <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-[#A0A0A0] mb-1.5">
                    <Sunrise className="w-3.5 h-3.5 text-[#FFC799]" />
                    <span>
                      Buổi sáng ({validMorningSlots[0]} – {validMorningSlots[validMorningSlots.length - 1]})
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {validMorningSlots.map((slot) => {
                      const active = timeValue === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => {
                            onTimeChange(slot);
                            setOpenPanel(null);
                          }}
                          className={`py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                            active
                              ? 'bg-[#FFC799] text-[#101010] font-black shadow-sm'
                              : 'bg-[#1E1E1E] text-[#F5F5F5] hover:bg-[#262626]'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Afternoon (only rendered if there are valid afternoon slots) */}
              {validAfternoonSlots.length > 0 && (
                <div>
                  <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-[#A0A0A0] mb-1.5">
                    <Sun className="w-3.5 h-3.5 text-[#FFC799]" />
                    <span>
                      Buổi chiều ({validAfternoonSlots[0]} – {validAfternoonSlots[validAfternoonSlots.length - 1]})
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {validAfternoonSlots.map((slot) => {
                      const active = timeValue === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => {
                            onTimeChange(slot);
                            setOpenPanel(null);
                          }}
                          className={`py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                            active
                              ? 'bg-[#FFC799] text-[#101010] font-black shadow-sm'
                              : 'bg-[#1E1E1E] text-[#F5F5F5] hover:bg-[#262626]'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Evening (only rendered if there are valid evening slots) */}
              {validEveningSlots.length > 0 && (
                <div>
                  <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-[#A0A0A0] mb-1.5">
                    <Moon className="w-3.5 h-3.5 text-[#FFC799]" />
                    <span>
                      Buổi tối ({validEveningSlots[0]} – {validEveningSlots[validEveningSlots.length - 1]})
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {validEveningSlots.map((slot) => {
                      const active = timeValue === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => {
                            onTimeChange(slot);
                            setOpenPanel(null);
                          }}
                          className={`py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                            active
                              ? 'bg-[#FFC799] text-[#101010] font-black shadow-sm'
                              : 'bg-[#1E1E1E] text-[#F5F5F5] hover:bg-[#262626]'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 pt-2.5 border-t border-white/10 text-[10px] text-[#A0A0A0] flex items-center justify-between">
            <span>Hoạt động trạm: 06:30 – 22:30 mỗi ngày</span>
            <button
              type="button"
              onClick={() => setOpenPanel(null)}
              className="text-[#FFC799] font-bold hover:underline cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
