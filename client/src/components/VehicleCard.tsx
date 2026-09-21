import React from 'react';
import { 
  Fuel, 
  Gauge, 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  Zap,
  CheckCircle2,
  Clock
} from 'lucide-react';
import type { Vehicle } from '../types';

interface VehicleCardProps {
  vehicle: Vehicle;
  onBookNow: (vehicle: Vehicle) => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onBookNow }) => {
  const isAvailable = vehicle.status === 'Available';
  const branchName = typeof vehicle.branchId === 'object' && vehicle.branchId !== null 
    ? vehicle.branchId.name 
    : 'Chi nhánh Trung tâm';

  // Calculate 30% deposit preview
  const depositPreview = Math.round(vehicle.dailyPrice * 0.3);

  // SVG representation illustration depending on vehicle model/category
  const isElectric = vehicle.fuelType === 'Electric';
  const isManual = vehicle.transmissionType === 'Manual';

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-500/80 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 flex flex-col overflow-hidden relative">
      {/* Top Status & Branch badges */}
      <div className="p-4 pb-0 flex items-center justify-between z-10">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${
            isAvailable
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : vehicle.status === 'Rented'
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
              isAvailable ? 'bg-emerald-500' : vehicle.status === 'Rented' ? 'bg-amber-500' : 'bg-slate-400'
            }`}
          />
          {isAvailable ? 'Sẵn sàng giao ngay' : vehicle.status === 'Rented' ? 'Đang có khách thuê' : 'Bảo dưỡng định kỳ'}
        </span>

        <span className="text-[11px] text-slate-500 flex items-center font-medium truncate max-w-[170px]">
          <MapPin className="w-3.5 h-3.5 text-emerald-600 mr-1 flex-shrink-0" />
          <span className="truncate">{branchName}</span>
        </span>
      </div>

      {/* Visual Bike Display Area with Vector Accent */}
      <div className="relative px-6 py-6 flex items-center justify-center bg-gradient-to-b from-slate-50/70 to-emerald-50/20 group-hover:from-emerald-50/40 group-hover:to-emerald-100/30 transition-colors">
        {/* Subtle background circuit watermark */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
          <svg className="w-48 h-48 stroke-current" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" strokeWidth="2" fill="none" />
            <path d="M10 50 H90 M50 10 V90" strokeWidth="1" />
          </svg>
        </div>

        {/* Motorcycle Pure Vector Illustration Silhouette */}
        <div className="relative z-10 py-3 flex flex-col items-center justify-center group-hover:scale-105 transition-transform duration-300">
          <svg
            className={`w-36 h-24 ${
              isElectric ? 'text-teal-600' : isManual ? 'text-slate-800' : 'text-emerald-700'
            }`}
            viewBox="0 0 64 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Front & Rear Wheels */}
            <circle cx="15" cy="34" r="9" className="stroke-slate-800 fill-slate-100" />
            <circle cx="49" cy="34" r="9" className="stroke-slate-800 fill-slate-100" />
            <circle cx="15" cy="34" r="3" className="fill-slate-600" />
            <circle cx="49" cy="34" r="3" className="fill-slate-600" />
            {/* Chassis & Fork */}
            <path d="M15 34 L25 22 L38 22 L49 34" />
            <path d="M25 22 L20 12 L28 10" />
            <path d="M38 22 L42 15 L48 15" />
            {/* Seat & Engine */}
            <path d="M24 20 C28 16 35 16 40 20 Z" className="fill-emerald-600/30 stroke-emerald-700" />
            <circle cx="32" cy="30" r="4" className="stroke-slate-700 fill-slate-200" />
          </svg>
          <span className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/80 px-2 py-0.5 rounded-full border border-slate-200/60 shadow-2xs">
            {vehicle.brand} • {vehicle.licensePlate}
          </span>
        </div>
      </div>

      {/* Bike Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between">
            <h3 className="text-base font-black text-slate-900 group-hover:text-forest-700 transition-colors">
              {vehicle.vehicleModel}
            </h3>
          </div>

          {/* Quick Specs Pills */}
          <div className="grid grid-cols-2 gap-2 my-3.5 text-xs text-slate-600">
            <div className="flex items-center space-x-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <Gauge className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-semibold text-slate-700">ODO: {vehicle.odometer.toLocaleString('vi-VN')} km</span>
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
              {isElectric ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-semibold text-slate-700">Pin LFP ~198 km</span>
                </>
              ) : (
                <>
                  <Fuel className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold text-slate-700">Xăng ~1.8L/100km</span>
                </>
              )}
            </div>
          </div>

          {/* Real Human Perks Included */}
          <div className="space-y-1.5 text-[11px] text-slate-500 pt-1 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span>Kèm 2 nón bảo hiểm chuẩn CR + 2 áo mưa</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span>Giá đỡ điện thoại phượt + cứu hộ 24/7</span>
            </div>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="pt-4 flex items-end justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Giá thuê trọn gói
            </span>
            <div className="flex items-baseline space-x-1">
              <span className="text-xl font-black text-slate-900">
                {vehicle.dailyPrice.toLocaleString('vi-VN')}
              </span>
              <span className="text-xs font-semibold text-slate-500">đ/ngày</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 inline-block mt-0.5">
              Cọc giữ xe 30%: {depositPreview.toLocaleString('vi-VN')} đ
            </span>
          </div>

          <button
            type="button"
            disabled={!isAvailable}
            onClick={() => onBookNow(vehicle)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm ${
              isAvailable
                ? 'bg-forest-600 hover:bg-forest-700 text-white shadow-emerald-600/20 hover:shadow-md hover:shadow-emerald-600/30 active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>{isAvailable ? 'Chọn xe' : 'Đã có khách'}</span>
            {isAvailable && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
