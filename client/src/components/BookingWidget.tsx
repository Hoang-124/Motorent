import React, { useState } from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  ArrowRightLeft,
  Search,
  Sparkles,
  ShieldCheck,
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
      // Set to another branch if available
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
    <div className="w-full bg-[#0A1813]/90 backdrop-blur-2xl backdrop-blur-2xl rounded-[2rem] border border-emerald-500/20 shadow-2xl p-6 md:p-8 text-white relative z-20">
      {/* Top micro badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-emerald-500/20">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            Giữ xe online 100% không lo hết xe
          </span>
          <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] text-slate-300 border border-white/5">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            Cọc nhẹ 30% qua QR Pay
          </span>
        </div>

        {/* Toggle Return Branch */}
        <button
          type="button"
          onClick={handleToggleDifferentReturn}
          className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all flex items-center space-x-1.5 ${isDifferentReturn
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-[#050D0A] font-bold border-emerald-400 shadow-md shadow-emerald-500/25'
              : 'bg-white/[0.04] text-slate-300 border-emerald-500/20 hover:bg-white/[0.08]'
            }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Trả xe tại trạm khác (+0đ phụ phí)</span>
        </button>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Pickup Branch */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
            Điểm nhận xe
          </label>
          <div className="relative">
            <select
              value={pickupBranchId || (branches[0]?._id ?? '')}
              onChange={(e) => handlePickupBranchChange(e.target.value)}
              className="w-full bg-[#050D0A] hover:bg-white/[0.06] focus:bg-[#050D0A] border border-emerald-500/20 focus:border-emerald-400 rounded-xl px-3.5 py-3 text-sm font-semibold text-white outline-none transition-all cursor-pointer"
            >
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id} className="bg-[#0F241C] text-white">
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {branches.find(b => b._id === (pickupBranchId || branches[0]?._id))?.address || 'Chọn trạm trung tâm'}
          </p>
        </div>

        {/* Return Branch */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
            Điểm trả xe
          </label>
          <div className="relative">
            <select
              disabled={!isDifferentReturn}
              value={isDifferentReturn ? (returnBranchId || branches[1]?._id || branches[0]?._id) : (pickupBranchId || branches[0]?._id)}
              onChange={(e) => setReturnBranchId(e.target.value)}
              className={`w-full border rounded-xl px-3.5 py-3 text-sm font-semibold outline-none transition-all ${isDifferentReturn
                  ? 'bg-[#050D0A] hover:bg-white/[0.06] focus:bg-[#050D0A] border-emerald-500/20 focus:border-emerald-400 text-white cursor-pointer'
                  : 'bg-white/[0.02] border-white/5 text-slate-500 cursor-not-allowed'
                }`}
            >
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id} className="bg-[#0F241C] text-white">
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {isDifferentReturn ? 'Trả linh hoạt trạm tùy chọn' : 'Trả tại cùng điểm nhận xe'}
          </p>
        </div>

        {/* Pickup Date & Time */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center">
            <Calendar className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
            Ngày & Giờ nhận
          </label>
          <div className="grid grid-cols-5 gap-2">
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className="col-span-3 bg-[#050D0A] focus:bg-[#0F241C] border border-emerald-500/20 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-xs font-semibold text-white outline-none"
            />
            <input
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="col-span-2 bg-[#050D0A] focus:bg-[#0F241C] border border-emerald-500/20 focus:border-emerald-400 rounded-xl px-2 py-2.5 text-xs font-semibold text-white outline-none"
            />
          </div>
          <p className="text-[11px] text-slate-400 flex items-center">
            <Clock className="w-3 h-3 mr-1 text-slate-500" />
            Giờ phục vụ: 06:00 - 23:00
          </p>
        </div>

        {/* Return Date & Time */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center">
            <Calendar className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
            Ngày & Giờ trả
          </label>
          <div className="grid grid-cols-5 gap-2">
            <input
              type="date"
              value={returnDate}
              min={pickupDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="col-span-3 bg-[#050D0A] focus:bg-[#0F241C] border border-emerald-500/20 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-xs font-semibold text-white outline-none"
            />
            <input
              type="time"
              value={returnTime}
              onChange={(e) => setReturnTime(e.target.value)}
              className="col-span-2 bg-[#050D0A] focus:bg-[#0F241C] border border-emerald-500/20 focus:border-emerald-400 rounded-xl px-2 py-2.5 text-xs font-semibold text-white outline-none"
            />
          </div>
          <p className="text-[11px] text-emerald-400 font-semibold flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
            Thời gian thuê: {durationDays} ngày
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mt-8 pt-6 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4 text-xs text-slate-300">
          <div className="flex items-center space-x-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">Xe đời 2023 - 2024</span>
          </div>
          <span className="text-slate-600">•</span>
          <span>Kèm 2 mũ 3/4 tiệt trùng UV</span>
          <span className="text-slate-600 hidden md:inline">•</span>
          <span className="hidden md:inline">Cứu hộ tận nơi 24/7</span>
        </div>

        <button
          type="button"
          onClick={handleSearchClick}
          className="group w-full sm:w-auto pl-6 pr-2 py-2 rounded-full font-black text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-[#050D0A] shadow-lg shadow-emerald-500/25 transition-all active:scale-95 flex items-center justify-between sm:justify-start space-x-3 text-sm"
        >
          <span>Tìm xe phù hợp ({durationDays} ngày)</span>
          <div className="w-8 h-8 rounded-full bg-[#060D0B] text-emerald-400 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>
    </div>
  );
};
