import React, { useState, useEffect } from 'react';
import {
  Fuel,
  Gauge,
  MapPin,
  ArrowRight,
  Zap,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Vehicle } from '../types';
import { getOptimizedVehicleImageUrl } from '../utils/imageHelper';

interface VehicleCardProps {
  vehicle: Vehicle;
  onBookNow?: (vehicle: Vehicle) => void;
}

const ANGLE_VIEWS = [
  { id: 1, label: 'Thân xe', title: 'Góc ngang thân xe' },
  { id: 0, label: 'Góc trước', title: 'Góc 3/4 mặt trước' },
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

  // 30% deposit calculation
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
      className="group bg-[#0D1C16] rounded-2xl border border-white/[0.08] hover:border-emerald-500/30 transition-all duration-200 flex flex-col overflow-hidden relative cursor-pointer shadow-sm hover:shadow-lg"
    >
      {/* Top Image Canvas */}
      <div className="relative w-full h-52 sm:h-56 bg-white overflow-hidden flex items-center justify-center">

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide ${
              isAvailable
                ? 'bg-[#06100C]/90 text-emerald-300 border border-emerald-500/30'
                : vehicle.status === 'Rented'
                ? 'bg-[#06100C]/90 text-amber-300 border border-amber-500/30'
                : 'bg-[#06100C]/90 text-slate-400 border border-white/10'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full mr-2 ${
                isAvailable ? 'bg-emerald-400' : vehicle.status === 'Rented' ? 'bg-amber-400' : 'bg-slate-400'
              }`}
            />
            {isAvailable ? 'Sẵn sàng giao xe' : vehicle.status === 'Rented' ? 'Đang có khách' : 'Bảo dưỡng'}
          </span>

          <span className="text-xs text-slate-200 bg-[#06100C]/90 px-2.5 py-1 rounded-md border border-white/10 flex items-center font-medium truncate max-w-[190px]">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 mr-1.5 flex-shrink-0" />
            <span className="truncate">{branchName}</span>
          </span>
        </div>

        {/* Navigation Arrows for Angles */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const currentIndex = ANGLE_VIEWS.findIndex(a => a.id === activeAngle);
            const nextIndex = currentIndex === 0 ? ANGLE_VIEWS.length - 1 : currentIndex - 1;
            setActiveAngle(ANGLE_VIEWS[nextIndex].id);
            setImgError(false);
          }}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 flex items-center justify-center opacity-80 md:opacity-0 group-hover:opacity-100 transition-all active:scale-95"
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
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 flex items-center justify-center opacity-80 md:opacity-0 group-hover:opacity-100 transition-all active:scale-95"
          aria-label="Góc tiếp theo"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Main Bike Photography */}
        <div className="w-full h-full flex items-center justify-center overflow-hidden p-2">
          {currentImageUrl && !imgError ? (
            <img
              src={currentImageUrl}
              alt={`${vehicle.vehicleModel} - ${ANGLE_VIEWS.find(a => a.id === activeAngle)?.title}`}
              loading="lazy"
              decoding="async"
              crossOrigin="anonymous"
              onError={() => setImgError(true)}
              className="w-full h-full object-contain scale-[1.3] group-hover:scale-[1.35] transition-transform duration-300"
            />
          ) : (
            <div className="py-2 flex flex-col items-center justify-center text-slate-400">
              <svg
                className={`w-36 h-20 ${isElectric ? 'text-teal-600' : isManual ? 'text-slate-600' : 'text-emerald-500'}`}
                viewBox="0 0 64 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="15" cy="34" r="9" className="stroke-slate-400 fill-white" />
                <circle cx="49" cy="34" r="9" className="stroke-slate-400 fill-white" />
                <circle cx="15" cy="34" r="3" className="fill-slate-400" />
                <circle cx="49" cy="34" r="3" className="fill-slate-400" />
                <path d="M15 34 L25 22 L38 22 L49 34" />
                <path d="M25 22 L32 10 L38 10" />
                <path d="M38 22 L42 16" />
              </svg>
              <span className="text-[10px] text-slate-500 mt-1">Ảnh xe chính chủ</span>
            </div>
          )}
        </div>

        {/* Bottom Angle Selector Segment */}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-1 bg-[#06100C]/85 px-1.5 py-0.5 rounded-md border border-white/10">
          {ANGLE_VIEWS.map((ang) => (
            <button
              key={ang.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveAngle(ang.id);
                setImgError(false);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                activeAngle === ang.id
                  ? 'bg-emerald-500/25 text-emerald-300 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {ang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
              {vehicle.vehicleModel}
            </h3>
            {vehicle.color && (
              <span className="text-[11px] font-medium text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10 flex-shrink-0">
                {vehicle.color}
              </span>
            )}
          </div>

          {/* Quick Specifications */}
          <div className="grid grid-cols-2 gap-2 my-3 text-xs text-slate-300">
            <div className="flex items-center space-x-2 bg-[#06100C]/60 p-2.5 rounded-lg border border-white/5">
              <Gauge className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="font-medium text-slate-200 truncate">ODO: {vehicle.odometer.toLocaleString('vi-VN')} km</span>
            </div>

            <div className="flex items-center space-x-2 bg-[#06100C]/60 p-2.5 rounded-lg border border-white/5">
              {isElectric ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="font-medium text-slate-200 truncate">Pin: ~198 km</span>
                </>
              ) : (
                <>
                  <Fuel className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="font-medium text-slate-200 truncate">Xăng: ~1.8L/100km</span>
                </>
              )}
            </div>
          </div>

          {/* Included Equipment */}
          <div className="space-y-1.5 text-xs text-slate-400 pt-1 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Kèm 2 mũ 3/4 tiệt trùng UV + 2 áo mưa</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Giá đỡ điện thoại OIS + cứu hộ 24/7</span>
            </div>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="pt-3.5 flex items-end justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              Giá thuê trọn gói
            </span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-xl sm:text-2xl font-bold text-white font-mono">
                {vehicle.dailyPrice.toLocaleString('vi-VN')}
              </span>
              <span className="text-xs font-medium text-slate-400">đ/ngày</span>
            </div>
            <span className="text-[11px] font-medium text-emerald-300">
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
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              isAvailable
                ? 'bg-emerald-500 hover:bg-emerald-400 text-[#06100C] active:scale-95 cursor-pointer shadow-sm'
                : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
          >
            <span>{isAvailable ? 'Chọn xe' : 'Đã có khách'}</span>
            {isAvailable && <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />}
          </button>
        </div>
      </div>
    </div>
  );
};
