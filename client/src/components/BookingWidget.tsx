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

  // Default to tomorrow 08:00 to day after tomorrow 18:00
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 3);

  const formatDateInput = (d: Date) => d.toISOString().split('T')[0];

  const [pickupDate, setPickupDate] = useState<string>(formatDateInput(tomorrow));
  const [returnDate, setReturnDate] = useState<string>(formatDateInput(dayAfter));
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
    <div className="w-full bg-[#0D1C16] rounded-2xl border border-emerald-500/15 p-6 md:p-8 text-slate-100 shadow-xl relative z-20">
      {/* Top Segmented Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-white/[0.08]">
        <div className="flex items-center space-x-1.5 bg-[#06100C] p-1 rounded-xl border border-white/5 text-xs">
          <button
            type="button"
            onClick={() => { if (isDifferentReturn) handleToggleDifferentReturn(); }}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              !isDifferentReturn
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Nhận & trả cùng điểm
          </button>
          <button
            type="button"
            onClick={() => { if (!isDifferentReturn) handleToggleDifferentReturn(); }}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
              isDifferentReturn
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Trả tại trạm khác</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Giao xe tận nơi: Sân bay Ga T1/T2 & Khách sạn trung tâm</span>
        </div>
      </div>

      {/* 4-Column Search Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5 mt-6">
        
        {/* Field 1: Pickup Location */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
            Điểm nhận xe
          </label>
          <div className="relative">
            <select
              value={pickupBranchId || (branches[0]?._id ?? '')}
              onChange={(e) => handlePickupBranchChange(e.target.value)}
              className="w-full bg-[#06100C] hover:bg-[#08140F] focus:bg-[#06100C] border border-white/10 focus:border-emerald-400 rounded-xl px-3.5 py-3 text-sm font-medium text-white outline-none transition-all cursor-pointer"
            >
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id} className="bg-[#0D1C16] text-white">
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {branches.find(b => b._id === (pickupBranchId || branches[0]?._id))?.address || 'Chọn chi nhánh'}
          </p>
        </div>

        {/* Field 2: Return Location */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
            Điểm trả xe
          </label>
          <div className="relative">
            <select
              disabled={!isDifferentReturn}
              value={isDifferentReturn ? (returnBranchId || branches[1]?._id || branches[0]?._id) : (pickupBranchId || branches[0]?._id)}
              onChange={(e) => setReturnBranchId(e.target.value)}
              className={`w-full border rounded-xl px-3.5 py-3 text-sm font-medium outline-none transition-all ${
                isDifferentReturn
                  ? 'bg-[#06100C] hover:bg-[#08140F] focus:bg-[#06100C] border-white/10 focus:border-emerald-400 text-white cursor-pointer'
                  : 'bg-white/[0.02] border-white/5 text-slate-500 cursor-not-allowed'
              }`}
            >
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id} className="bg-[#0D1C16] text-white">
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {isDifferentReturn ? 'Trả xe tại trạm tùy chọn' : 'Trả tại cùng trạm nhận xe'}
          </p>
        </div>

        {/* Field 3: Pickup Date & Time */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center">
            <Calendar className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
            Ngày & giờ nhận
          </label>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className="min-w-0 bg-[#06100C] focus:bg-[#08140F] border border-white/10 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-xs font-medium text-white outline-none"
            />
            <input
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="w-[92px] bg-[#06100C] focus:bg-[#08140F] border border-white/10 focus:border-emerald-400 rounded-xl px-2 py-2.5 text-xs font-medium text-white outline-none"
            />
          </div>
          <p className="text-[11px] text-slate-400 flex items-center">
            <Clock className="w-3 h-3 mr-1 text-slate-400" />
            <span>Phục vụ từ 06:00 đến 23:00</span>
          </p>
        </div>

        {/* Field 4: Return Date & Time */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center">
            <Calendar className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
            Ngày & giờ trả
          </label>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              type="date"
              value={returnDate}
              min={pickupDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="min-w-0 bg-[#06100C] focus:bg-[#08140F] border border-white/10 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-xs font-medium text-white outline-none"
            />
            <input
              type="time"
              value={returnTime}
              onChange={(e) => setReturnTime(e.target.value)}
              className="w-[92px] bg-[#06100C] focus:bg-[#08140F] border border-white/10 focus:border-emerald-400 rounded-xl px-2 py-2.5 text-xs font-medium text-white outline-none"
            />
          </div>
          <p className="text-[11px] text-emerald-300 font-medium flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
            <span>Thời gian thuê: {durationDays} ngày</span>
          </p>
        </div>

      </div>

      {/* Action Footer */}
      <div className="mt-8 pt-6 border-t border-white/[0.08] flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-200 font-medium">Xe đời 2023 - 2024</span>
          </span>
          <span>•</span>
          <span>Không giữ CCCD bản gốc</span>
          <span>•</span>
          <span>Cứu hộ tận nơi 24/7</span>
        </div>

        <button
          type="button"
          onClick={handleSearchClick}
          className="w-full whitespace-nowrap px-7 py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-[#06100C] transition-all active:scale-[0.99] flex items-center justify-center space-x-2 shadow-md cursor-pointer"
        >
          <Search className="w-4 h-4 stroke-[2.5]" />
          <span>Tìm xe phù hợp ({durationDays} ngày)</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
