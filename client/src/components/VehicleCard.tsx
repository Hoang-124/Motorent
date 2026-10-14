import React, { useState, useEffect } from 'react';
import {
  Fuel,
  Gauge,
  MapPin,
  ArrowRight,
  Zap,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Camera
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Vehicle } from '../types';
import { getOptimizedVehicleImageUrl } from '../utils/imageHelper';

interface VehicleCardProps {
  vehicle: Vehicle;
  onBookNow?: (vehicle: Vehicle) => void;
}

const ANGLE_VIEWS = [
  { id: 1, label: 'Ngang xe', title: 'Góc ngang thân xe' },
  { id: 0, label: '3/4 Trước', title: 'Góc 3/4 mặt trước' },
  { id: 2, label: 'Góc sau', title: 'Góc đuôi xe & khoang lái' },
];

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onBookNow }) => {
  const navigate = useNavigate();
  // Mặc định góc ngang xe (Side view - index 1)
  const [activeAngle, setActiveAngle] = useState<number>(1);
  const [imgError, setImgError] = useState<boolean>(false);

  useEffect(() => {
    setImgError(false);
  }, [vehicle._id, activeAngle]);

  const isAvailable = vehicle.status === 'Available';
  const branchName = typeof vehicle.branchId === 'object' && vehicle.branchId !== null
    ? vehicle.branchId.name
    : 'Chi nhánh Trung tâm';

  // Calculate 30% deposit preview
  const depositPreview = Math.round(vehicle.dailyPrice * 0.3);

  const isElectric = vehicle.fuelType === 'Electric';
  const isManual = vehicle.transmissionType === 'Manual';

  const handleCardClick = () => {
    if (onBookNow) {
      onBookNow(vehicle);
    }
    navigate(`/booking/${vehicle._id}`);
  };

  const currentImageUrl = vehicle.images && vehicle.images[activeAngle]
    ? getOptimizedVehicleImageUrl(vehicle.images[activeAngle])
    : '';

  return (
    <div
      onClick={handleCardClick}
      className="group bg-[#0A1813] rounded-[2rem] border border-emerald-500/20 hover:border-emerald-400/50 shadow-xl hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.8),0_0_30px_-5px_rgba(16,185,129,0.25)] transition-all duration-300 flex flex-col overflow-hidden relative cursor-pointer"
    >
      {/* Top Image Stage: Phóng Full tràn khung hình, chân thực 100% */}
      <div className="relative w-full h-52 sm:h-56 bg-white overflow-hidden flex items-center justify-center">

        {/* Top Floating Badges */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black tracking-wide shadow-md ${isAvailable
                ? 'bg-emerald-950/85 text-emerald-300 border border-emerald-500/40 backdrop-blur-md'
                : vehicle.status === 'Rented'
                  ? 'bg-[#050D0A]/85 text-emerald-300 border border-emerald-500/40 backdrop-blur-md'
                  : 'bg-black/80 text-slate-300 border border-white/20 backdrop-blur-md'
              }`}
          >
            <span
              className={`w-2 h-2 rounded-full mr-2 ${isAvailable ? 'bg-emerald-400' : vehicle.status === 'Rented' ? 'bg-emerald-400' : 'bg-slate-400'
                }`}
            />
            {isAvailable ? 'Sẵn sàng giao ngay' : vehicle.status === 'Rented' ? 'Đang có khách' : 'Bảo dưỡng'}
          </span>

          <span className="text-xs text-slate-200 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 flex items-center font-semibold shadow-md truncate max-w-[190px]">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 mr-1.5 flex-shrink-0" />
            <span className="truncate">{branchName}</span>
          </span>
        </div>

        {/* Quick Cycle Left/Right Buttons */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const currentIndex = ANGLE_VIEWS.findIndex(a => a.id === activeAngle);
            const nextIndex = currentIndex === 0 ? ANGLE_VIEWS.length - 1 : currentIndex - 1;
            setActiveAngle(ANGLE_VIEWS[nextIndex].id);
            setImgError(false);
          }}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/75 hover:bg-emerald-500 hover:text-white text-white border border-white/20 flex items-center justify-center opacity-80 md:opacity-0 group-hover:opacity-100 transition-all shadow-lg active:scale-90"
          aria-label="Góc trước đó"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const currentIndex = ANGLE_VIEWS.findIndex(a => a.id === activeAngle);
            const nextIndex = (currentIndex + 1) % ANGLE_VIEWS.length;
            setActiveAngle(ANGLE_VIEWS[nextIndex].id);
            setImgError(false);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/75 hover:bg-emerald-500 hover:text-white text-white border border-white/20 flex items-center justify-center opacity-80 md:opacity-0 group-hover:opacity-100 transition-all shadow-lg active:scale-90"
          aria-label="Góc tiếp theo"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* MAIN BIKE IMAGE: Phóng Full tràn khung hình, chân thực 100% */}
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
          {currentImageUrl && !imgError ? (
            <img
              src={currentImageUrl}
              alt={`${vehicle.vehicleModel} - ${ANGLE_VIEWS.find(a => a.id === activeAngle)?.title}`}
              loading="lazy"
              decoding="async"
              crossOrigin="anonymous"
              onError={() => setImgError(true)}
              className="w-full h-full object-contain scale-[1.38] sm:scale-[1.42] group-hover:scale-[1.48] transition-transform duration-300"
            />
          ) : (
            <div className="py-2 flex flex-col items-center justify-center">
              <svg
                className={`w-40 h-24 ${isElectric ? 'text-teal-600' : isManual ? 'text-slate-600' : 'text-emerald-500'
                  }`}
                viewBox="0 0 64 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="15" cy="34" r="9" className="stroke-slate-600 fill-white" />
                <circle cx="49" cy="34" r="9" className="stroke-slate-600 fill-white" />
                <circle cx="15" cy="34" r="3" className="fill-slate-500" />
                <circle cx="49" cy="34" r="3" className="fill-slate-500" />
                <path d="M15 34 L25 22 L38 22 L49 34" />
                <path d="M25 22 L20 12 L28 10" />
                <path d="M38 22 L42 15 L48 15" />
                <path d="M24 20 C28 16 35 16 40 20 Z" className="fill-emerald-500/20 stroke-emerald-500" />
                <circle cx="32" cy="30" r="4" className="stroke-slate-500 fill-white" />
              </svg>
              <span className="mt-1 text-xs font-bold text-slate-700 uppercase tracking-widest bg-white/80 px-3 py-0.5 rounded-full border border-slate-300 shadow-xs">
                {vehicle.brand} • {vehicle.licensePlate}
              </span>
            </div>
          )}
        </div>

        {/* Bottom Floating Angle Switcher Pills */}
        <div className="absolute bottom-2.5 left-3 z-20 flex items-center bg-[#070A11]/90 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 shadow-md space-x-1.5">
          {ANGLE_VIEWS.map((ang) => (
            <button
              key={ang.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveAngle(ang.id);
                setImgError(false);
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold tracking-tight transition-all cursor-pointer ${activeAngle === ang.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              title={ang.title}
            >
              {ang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bike Details: Enhanced Font Sizes & Readability */}
      <div className="p-5 pt-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-emerald-300 transition-colors leading-snug">
              {vehicle.vehicleModel}
            </h3>
            {vehicle.color && (
              <span className="text-xs font-bold text-slate-200 bg-white/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex-shrink-0">
                {vehicle.color}
              </span>
            )}
          </div>

          {/* Quick Specs Pills - Larger Fonts */}
          <div className="grid grid-cols-2 gap-2.5 my-3 text-xs sm:text-sm text-slate-300">
            <div className="flex items-center space-x-2 bg-white/[0.04] p-3 rounded-xl border border-white/5">
              <Gauge className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="font-bold text-slate-200 truncate">ODO: {vehicle.odometer.toLocaleString('vi-VN')} km</span>
            </div>

            <div className="flex items-center space-x-2 bg-white/[0.04] p-3 rounded-xl border border-white/5">
              {isElectric ? (
                <>
                  <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-bold text-slate-200 truncate">Pin ~198 km</span>
                </>
              ) : (
                <>
                  <Fuel className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-bold text-slate-200 truncate">Xăng ~1.8L/100km</span>
                </>
              )}
            </div>
          </div>

          {/* Perks Included - Clear, Readable Text */}
          <div className="space-y-2 text-xs sm:text-sm text-slate-300 pt-2 pb-3.5 border-b border-emerald-500/20">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Kèm 2 mũ 3/4 tiệt trùng UV + 2 áo mưa</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Giá đỡ nhôm chống rung OIS + cứu hộ 24/7</span>
            </div>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="pt-4 flex items-end justify-between">
          <div>
            <span className="text-xs text-slate-400 font-black uppercase tracking-wider block">
              Giá thuê trọn gói
            </span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                {vehicle.dailyPrice.toLocaleString('vi-VN')}
              </span>
              <span className="text-sm font-bold text-slate-400">đ/ngày</span>
            </div>
            <span className="text-xs font-black text-emerald-200 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30 inline-block mt-1">
              Cọc 30%: {depositPreview.toLocaleString('vi-VN')} đ
            </span>
          </div>

          <button
            type="button"
            disabled={!isAvailable}
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className={`pl-5 pr-2 py-2 rounded-full text-xs sm:text-sm font-black transition-all flex items-center space-x-2 shadow-sm ${isAvailable
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer'
                : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
              }`}
          >
            <span>{isAvailable ? 'Chọn xe' : 'Đã có khách'}</span>
            {isAvailable && (
              <div className="w-7 h-7 rounded-full bg-[#060D0B] text-emerald-400 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
