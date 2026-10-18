import React, { useState } from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  ArrowRightLeft,
  Search,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import type { Branch } from '../types';
import { DateTimePicker, formatLocalDateStr, normalizeReturnSchedule } from './DateTimePicker';
import { BranchSelect } from './BranchSelect';

interface BookingWidgetProps {
  branches: Branch[];
  onSearch?: (criteria: {
    pickupBranchId: string;
    returnBranchId: string;
    pickupDate: string;
    returnDate: string;
  }) => void;
}

export const BookingWidget: React.FC<BookingWidgetProps> = ({ branches, onSearch }) => {
  const [pickupBranchId, setPickupBranchId] = useState<string>('');
  const [returnBranchId, setReturnBranchId] = useState<string>('');
  const [isDifferentReturn, setIsDifferentReturn] = useState<boolean>(false);

  // Default to tomorrow 08:30 to day after tomorrow 18:00
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 3);

  const [pickupDate, setPickupDate] = useState<string>(formatLocalDateStr(tomorrow));
  const [returnDate, setReturnDate] = useState<string>(formatLocalDateStr(dayAfter));
  const [pickupTime, setPickupTime] = useState<string>('08:30');
  const [returnTime, setReturnTime] = useState<string>('18:00');

  // Sync pickup to return if not different return
  const handlePickupBranchChange = (id: string) => {
    setPickupBranchId(id);
    if (!isDifferentReturn) {
      setReturnBranchId(id);
    }
  };

  const handleToggleDifferentReturn = () => {
    const nextState = !isDifferentReturn;
    setIsDifferentReturn(nextState);
    if (!nextState) {
      setReturnBranchId(pickupBranchId);
    } else {
      const another = branches.find(b => b._id !== pickupBranchId);
      if (another) setReturnBranchId(another._id);
    }
  };

  // Calculate rental duration in days
  const startDate = new Date(`${pickupDate}T${pickupTime}`);
  const endDate = new Date(`${returnDate}T${returnTime}`);
  const durationDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));

  const handleSearchClick = () => {
    if (onSearch) {
      onSearch({
        pickupBranchId: pickupBranchId || (branches[0]?._id ?? ''),
        returnBranchId: isDifferentReturn ? (returnBranchId || branches[1]?._id || branches[0]?._id) : (pickupBranchId || branches[0]?._id),
        pickupDate,
        returnDate,
      });
    }
  };

  return (
    <div className="w-full bg-[#161616] rounded-2xl border border-white/12 p-6 sm:p-7 text-[#F5F5F5] shadow-2xl relative z-20">
      {/* Editorial Ticket Masthead & Segmented Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/[0.08]">
        <div>
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#FFC799] block font-medium">
            Phiếu Điều Phối Trực Tuyến
          </span>
          <h3 className="text-lg font-semibold text-[#F5F5F5] tracking-tight mt-0.5">
            Đặt lịch &amp;{' '}
            <span className="font-serif-display italic font-normal text-[#FFC799] text-xl">
              giữ biển số xe
            </span>
          </h3>
        </div>

        <div className="inline-flex items-center bg-[#101010] p-1 rounded-lg border border-white/[0.08] text-[11px] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => { if (isDifferentReturn) handleToggleDifferentReturn(); }}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              !isDifferentReturn
                ? 'bg-[#F5F5F5] text-[#101010] font-semibold'
                : 'text-[#A0A0A0] hover:text-[#F5F5F5]'
            }`}
          >
            Cùng trạm
          </button>
          <button
            type="button"
            onClick={() => { if (!isDifferentReturn) handleToggleDifferentReturn(); }}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${
              isDifferentReturn
                ? 'bg-[#F5F5F5] text-[#101010] font-semibold'
                : 'text-[#A0A0A0] hover:text-[#F5F5F5]'
            }`}
          >
            <ArrowRightLeft className="w-3 h-3" />
            <span>Liên trạm (0đ)</span>
          </button>
        </div>
      </div>

      {/* Architectural Hairline Ledger Fields (Zero Box-in-Box Slop) */}
      <div className="mt-5 rounded-xl border border-white/10 bg-[#101010]/80 divide-y divide-white/[0.08] overflow-visible">
        
        {/* Row 1: Pickup & Return Stations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08]">
          {/* Pickup Location */}
          <div className="p-3.5 sm:p-4 space-y-2">
            <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#A0A0A0] flex items-center justify-between">
              <span>Điểm nhận xe</span>
              <MapPin className="w-3 h-3 text-[#FFC799]" />
            </label>
            <BranchSelect
              compact
              branches={branches}
              value={pickupBranchId || (branches[0]?._id ?? '')}
              onChange={(id) => handlePickupBranchChange(id)}
            />
          </div>

          {/* Return Location */}
          <div className="p-3.5 sm:p-4 space-y-2">
            <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#A0A0A0] flex items-center justify-between">
              <span>Điểm trả xe</span>
              <span className="text-[10px] text-[#FFC799] font-mono-tabular">
                {isDifferentReturn ? 'Khác trạm (0đ)' : 'Tại trạm nhận'}
              </span>
            </label>
            <BranchSelect
              compact
              disabled={!isDifferentReturn}
              branches={branches}
              value={
                isDifferentReturn
                  ? returnBranchId || branches[1]?._id || branches[0]?._id || ''
                  : pickupBranchId || branches[0]?._id || ''
              }
              onChange={(id) => setReturnBranchId(id)}
              helperText={
                isDifferentReturn
                  ? 'Miễn phí điều chuyển nội bộ'
                  : 'Trả tại cùng điểm xuất phát'
              }
            />
          </div>
        </div>

        {/* Row 2: Pickup Date & Time */}
        <div className="p-3.5 sm:p-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#A0A0A0] flex items-center">
              <Calendar className="w-3 h-3 text-[#FFC799] mr-1.5" />
              Thời gian nhận xe
            </label>
            <span className="text-[10px] text-[#6E6E6E]">06:30 – 22:30 mỗi ngày</span>
          </div>
          <DateTimePicker
            mode="pickup"
            compact
            dateValue={pickupDate}
            timeValue={pickupTime}
            minDate={formatLocalDateStr(today)}
            onDateChange={(newDate) => {
              setPickupDate(newDate);
              const synced = normalizeReturnSchedule(
                newDate,
                pickupTime,
                returnDate,
                returnTime
              );
              setReturnDate(synced.returnDate);
              setReturnTime(synced.returnTime);
            }}
            onTimeChange={(newTime) => {
              setPickupTime(newTime);
              const synced = normalizeReturnSchedule(
                pickupDate,
                newTime,
                returnDate,
                returnTime
              );
              setReturnDate(synced.returnDate);
              setReturnTime(synced.returnTime);
            }}
          />
        </div>

        {/* Row 3: Return Date & Time */}
        <div className="p-3.5 sm:p-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#A0A0A0] flex items-center">
              <Clock className="w-3 h-3 text-[#FFC799] mr-1.5" />
              Thời gian trả xe
            </label>
            <span className="text-[10px] text-[#FFC799] font-medium flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Tổng hành trình: {durationDays} ngày
            </span>
          </div>
          <DateTimePicker
            mode="return"
            compact
            dateValue={returnDate}
            timeValue={returnTime}
            minDate={pickupDate}
            referenceDate={pickupDate}
            referenceTime={pickupTime}
            onDateChange={(newDate) => {
              const synced = normalizeReturnSchedule(
                pickupDate,
                pickupTime,
                newDate,
                returnTime
              );
              setReturnDate(synced.returnDate);
              setReturnTime(synced.returnTime);
            }}
            onTimeChange={(newTime) => setReturnTime(newTime)}
          />
        </div>

      </div>

      {/* Action Footer */}
      <div className="mt-5 space-y-4">
        <button
          type="button"
          onClick={handleSearchClick}
          className="group w-full px-6 py-3.5 rounded-xl font-semibold text-xs sm:text-sm bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] transition-all active:scale-[0.99] flex items-center justify-between cursor-pointer"
        >
          <span className="flex items-center space-x-2">
            <Search className="w-4 h-4 stroke-[2.2]" />
            <span>Tìm xe sẵn sàng tại trạm ({durationDays} ngày)</span>
          </span>
          <span className="w-7 h-7 rounded-full bg-[#101010] text-[#F5F5F5] flex items-center justify-center transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </button>

        <div className="flex items-center justify-between text-[11px] text-[#A0A0A0] pt-1">
          <span>Không giữ CCCD gốc</span>
          <span>•</span>
          <span>Cọc 30% giữ biển số</span>
          <span>•</span>
          <span>Hỗ trợ nội thành 24/7</span>
        </div>
      </div>
    </div>
  );
};
