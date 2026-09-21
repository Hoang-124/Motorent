import React, { useState } from 'react';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  ArrowRightLeft, 
  Search, 
  Sparkles,
  ShieldCheck,
  CheckCircle2
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
    <div className="w-full bg-white rounded-2xl shadow-xl shadow-emerald-900/5 border border-emerald-100 p-5 md:p-7 relative z-20">
      {/* Top micro badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Giữ xe online 100% không lo hết xe
          </span>
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Cọc nhẹ 30% qua chuyển khoản
          </span>
        </div>

        {/* Toggle Return Branch */}
        <button
          type="button"
          onClick={handleToggleDifferentReturn}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center space-x-1.5 ${
            isDifferentReturn
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Trả xe tại chi nhánh khác (+0đ)</span>
        </button>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
        {/* Pickup Branch */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
            Điểm nhận xe
          </label>
          <div className="relative">
            <select
              value={pickupBranchId || (branches[0]?._id ?? '')}
              onChange={(e) => handlePickupBranchChange(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none transition-all cursor-pointer"
            >
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            {branches.find(b => b._id === (pickupBranchId || branches[0]?._id))?.address || 'Chọn trạm trung tâm'}
          </p>
        </div>

        {/* Return Branch */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
            Điểm trả xe
          </label>
          <div className="relative">
            <select
              disabled={!isDifferentReturn}
              value={isDifferentReturn ? (returnBranchId || branches[1]?._id || branches[0]?._id) : (pickupBranchId || branches[0]?._id)}
              onChange={(e) => setReturnBranchId(e.target.value)}
              className={`w-full border rounded-xl px-3.5 py-3 text-sm font-semibold outline-none transition-all ${
                isDifferentReturn
                  ? 'bg-slate-50 hover:bg-slate-100/80 focus:bg-white border-slate-200 focus:border-emerald-500 text-slate-800 cursor-pointer'
                  : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            {isDifferentReturn ? 'Trả linh hoạt trạm tùy chọn' : 'Trả tại cùng điểm nhận xe'}
          </p>
        </div>

        {/* Pickup Date & Time */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
            Ngày & Giờ nhận xe
          </label>
          <div className="grid grid-cols-5 gap-2">
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className="col-span-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none"
            />
            <input
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="col-span-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-2 py-2.5 text-xs font-semibold text-slate-800 outline-none"
            />
          </div>
          <p className="text-[11px] text-slate-500 flex items-center">
            <Clock className="w-3 h-3 mr-1 text-slate-400" />
            Giờ làm việc: 06:30 - 22:30
          </p>
        </div>

        {/* Return Date & Time */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
            Ngày & Giờ trả xe
          </label>
          <div className="grid grid-cols-5 gap-2">
            <input
              type="date"
              value={returnDate}
              min={pickupDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="col-span-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none"
            />
            <input
              type="time"
              value={returnTime}
              onChange={(e) => setReturnTime(e.target.value)}
              className="col-span-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-2 py-2.5 text-xs font-semibold text-slate-800 outline-none"
            />
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
            Thời gian thuê dự kiến: {durationDays} ngày
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4 text-xs text-slate-600">
          <div className="flex items-center space-x-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="font-semibold text-slate-800">Xe đời 2023 - 2024</span>
          </div>
          <span className="text-slate-300">•</span>
          <span>Bao gồm 2 nón bảo hiểm chuẩn CR</span>
          <span className="text-slate-300 hidden md:inline">•</span>
          <span className="hidden md:inline">Cứu hộ tận nơi miễn phí</span>
        </div>

        <button
          type="button"
          onClick={handleSearchClick}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-forest-600 to-emerald-500 hover:from-forest-700 hover:to-emerald-600 shadow-md shadow-emerald-600/25 hover:shadow-lg hover:shadow-emerald-600/35 transition-all hover:-translate-y-0.5 flex items-center justify-center space-x-2 text-sm"
        >
          <Search className="w-4 h-4 text-emerald-100" />
          <span>Tìm xe phù hợp ({durationDays} ngày)</span>
        </button>
      </div>
    </div>
  );
};
