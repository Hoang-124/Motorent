import React, { useState, useEffect } from 'react';
import {
  Fuel,
  Gauge,
  MapPin,
  ArrowRight,
  Zap,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Heart,
  Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Vehicle } from '../types';
import { getOptimizedVehicleImageUrl, getVehicleImageProps } from '../utils/imageHelper';
import { useWishlist } from '../context/WishlistContext';

interface VehicleCardProps {
  vehicle: Vehicle;
  onBookNow?: (vehicle: Vehicle) => void;
  onViewDetails?: (vehicle: Vehicle) => void;
  viewMode?: 'grid' | 'list';
}

const ANGLE_VIEWS = [
  { id: 1, label: 'Góc ngang', title: 'Góc ngang thân xe' },
  { id: 0, label: 'Góc trước', title: 'Góc 3/4 mặt trước' },
  { id: 2, label: 'Góc sau', title: 'Góc đuôi xe & khoang lái' },
];

export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  onBookNow,
  onViewDetails,
  viewMode = 'grid',
}) => {
  const navigate = useNavigate();
  const { isInWishlist, toggleWishlist, isToggling } = useWishlist();
  const [activeAngle, setActiveAngle] = useState<number>(vehicle.images?.[1] ? 1 : 0);
  const [imgError, setImgError] = useState<boolean>(false);

  useEffect(() => {
    setActiveAngle(vehicle.images?.[1] ? 1 : 0);
  }, [vehicle._id]);

  useEffect(() => {
    setImgError(false);
  }, [vehicle._id, activeAngle]);

  const isAvailable = vehicle.status === 'Available' && !vehicle.requiresMaintenance;
  const angleViews = ANGLE_VIEWS.filter((angle) => Boolean(vehicle.images?.[angle.id]));
  const branchName =
    typeof vehicle.branchId === 'object' && vehicle.branchId !== null
      ? vehicle.branchId.name
      : 'Trạm Trung tâm Đà Nẵng';

  const depositPreview = Math.round(vehicle.dailyPrice * 0.3);
  const isElectric = vehicle.fuelType === 'Electric';

  const transmissionLabel =
    vehicle.transmissionType === 'Manual'
      ? 'Xe côn tay'
      : vehicle.transmissionType === 'Automatic'
      ? 'Xe tay ga đô thị'
      : 'Xe số tiết kiệm';

  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails(vehicle);
      return;
    }
    navigate(`/bikes/${vehicle._id}`);
  };

  const handleBookClick = () => {
    if (onBookNow) {
      onBookNow(vehicle);
      return;
    }
    navigate(`/booking/${vehicle._id}`);
  };

  const currentImageUrl =
    vehicle.images && (vehicle.images[activeAngle] || vehicle.images[0])
      ? getOptimizedVehicleImageUrl(vehicle.images[activeAngle] || vehicle.images[0])
      : '';

  const avgRating = vehicle.averageRating ?? vehicle.ratingAverage ?? 0;

  return (
    <div
      onClick={handleCardClick}
      className={`group bg-[#161616] rounded-2xl border border-white/10 smooth-card-hover flex flex-col overflow-hidden relative cursor-pointer ${
        viewMode === 'list' ? 'md:flex-row' : ''
      }`}
    >
      {/* Top Studio Showroom Stage */}
      <div
        className={`relative w-full h-56 sm:h-60 studio-paper-backdrop overflow-hidden flex items-center justify-center ${
          viewMode === 'list' ? 'md:w-80 md:h-72 md:shrink-0' : ''
        }`}
      >
        {/* Top Floating Status & License Plate Bar */}
        <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between pointer-events-none">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide shadow-sm ${
              isAvailable
                ? 'bg-[#101010]/90 text-[#F5F5F5]'
                : vehicle.status === 'Rented'
                ? 'bg-[#101010]/90 text-[#FFC799]'
                : 'bg-[#101010]/90 text-[#A0A0A0]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                isAvailable
                  ? 'bg-[#99FFE4]'
                  : vehicle.status === 'Rented'
                  ? 'bg-[#FFC799]'
                  : 'bg-slate-400'
              }`}
            />
            {isAvailable
              ? 'Sẵn sàng tại trạm'
              : vehicle.status === 'Rented'
              ? 'Đang có khách thuê'
              : vehicle.status === 'Transferring'
              ? 'Đang điều chuyển'
              : 'Cần bảo dưỡng'}
          </span>

          <div className="flex items-center space-x-1.5 pointer-events-auto">
            <span className="font-mono-tabular text-[11px] font-bold text-[#101010] bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-300/80 shadow-sm">
              {vehicle.licensePlate}
            </span>

            {/* UC-25-26 Wishlist Heart Toggle */}
            <button
              type="button"
              disabled={isToggling(vehicle._id)}
              onClick={(e) => {
                e.stopPropagation();
                toggleWishlist(vehicle._id);
              }}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-sm ${
                isInWishlist(vehicle._id)
                  ? 'bg-[#FF8080] text-white hover:bg-[#ff6666]'
                  : 'bg-[#101010]/80 hover:bg-[#101010] text-white/80 hover:text-white border border-white/20'
              } ${isToggling(vehicle._id) ? 'opacity-50 cursor-not-allowed' : 'active:scale-90'}`}
              title={isInWishlist(vehicle._id) ? 'Bỏ lưu yêu thích' : 'Lưu vào yêu thích'}
              aria-label={isInWishlist(vehicle._id) ? 'Bỏ lưu yêu thích' : 'Lưu vào yêu thích'}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-colors ${
                  isInWishlist(vehicle._id) ? 'fill-white stroke-white' : 'stroke-current'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Subtle Hover Prev/Next Angle Arrows */}
        <button
          type="button"
          disabled={angleViews.length < 2}
          onClick={(e) => {
            e.stopPropagation();
            if (angleViews.length < 2) return;
            const currentIndex = angleViews.findIndex((a) => a.id === activeAngle);
            const nextIndex = currentIndex <= 0 ? angleViews.length - 1 : currentIndex - 1;
            setActiveAngle(angleViews[nextIndex].id);
            setImgError(false);
          }}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#101010]/75 hover:bg-[#101010] text-[#F5F5F5] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all active:scale-95 cursor-pointer"
          aria-label="Góc trước đó"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={angleViews.length < 2}
          onClick={(e) => {
            e.stopPropagation();
            if (angleViews.length < 2) return;
            const currentIndex = angleViews.findIndex((a) => a.id === activeAngle);
            const nextIndex = (currentIndex + 1) % angleViews.length;
            setActiveAngle(angleViews[nextIndex].id);
            setImgError(false);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#101010]/75 hover:bg-[#101010] text-[#F5F5F5] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all active:scale-95 cursor-pointer"
          aria-label="Góc tiếp theo"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Main Bike Photography — Generous Framing */}
        <div className="w-full h-full flex items-center justify-center overflow-hidden px-5 pt-7 pb-9">
          {currentImageUrl && !imgError ? (
            <img
              key={activeAngle}
              {...getVehicleImageProps(currentImageUrl, { width: 640, widths: [320, 480, 640, 960] })}
              alt={`${vehicle.vehicleModel} - ${ANGLE_VIEWS.find((a) => a.id === activeAngle)?.title}`}
              onError={() => setImgError(true)}
              className="w-full h-full object-contain scale-[1.22] group-hover:scale-[1.3] transition-transform duration-500 animate-bike-stage mix-blend-multiply"
            />
          ) : (
            <div className="py-2 flex flex-col items-center justify-center text-[#6E6E6E]">
              <svg
                className="w-32 h-16 text-[#A0A0A0]"
                viewBox="0 0 64 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="15" cy="34" r="9" />
                <circle cx="49" cy="34" r="9" />
                <circle cx="15" cy="34" r="3" />
                <circle cx="49" cy="34" r="3" />
                <path d="M15 34 L25 22 L38 22 L49 34" />
                <path d="M25 22 L32 10 L38 10" />
                <path d="M38 22 L42 16" />
              </svg>
              <span className="text-[11px] font-medium text-[#6E6E6E] mt-1">
                {imgError ? 'Chưa tải được ảnh xe' : 'Xe chưa có ảnh'}
              </span>
            </div>
          )}
        </div>

        {/* Minimalist Bottom-Right Angle Pill & Bottom-Left Year Tag */}
        <div className="absolute bottom-2.5 left-3.5 right-3.5 z-20 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-600 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-md border border-slate-300/60">
            Đời {vehicle.yearManufactured || 2024}
          </span>

          <div className="flex items-center space-x-0.5 bg-[#101010]/85 backdrop-blur-md p-0.5 rounded-lg">
            {angleViews.map((ang) => (
              <button
                key={ang.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveAngle(ang.id);
                  setImgError(false);
                }}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                  activeAngle === ang.id
                    ? 'bg-[#F5F5F5] text-[#101010] font-semibold'
                    : 'text-[#A0A0A0] hover:text-[#F5F5F5]'
                }`}
              >
                {ang.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vehicle Info & Specs Body */}
      <div className="min-w-0 p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Category + Station Location Row */}
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="uppercase tracking-[0.12em] text-[#FFC799] font-semibold">
              {vehicle.brand} • {transmissionLabel}
            </span>
            <span className="text-[#A0A0A0] flex items-center truncate max-w-[165px]">
              <MapPin className="w-3 h-3 text-[#FFC799] mr-1 shrink-0" />
              <span className="truncate">{branchName.replace('Chi nhánh ', '')}</span>
            </span>
          </div>

          {/* Vehicle Model Name & Rating */}
          <div className="flex items-start justify-between gap-2 mt-1">
            <h3 className="text-lg sm:text-xl font-bold text-[#F5F5F5] group-hover:text-[#FFC799] transition-colors leading-snug">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCardClick();
                }}
                className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFC799]"
              >
                {vehicle.vehicleModel}
                <span className="sr-only"> · Xem chi tiết xe</span>
              </button>
            </h3>

            {/* Rating Pill */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/bikes/${vehicle._id}#reviews-section`);
              }}
              className="flex items-center space-x-1 bg-[#101010] hover:bg-[#1f1f1f] border border-white/10 px-2 py-0.5 rounded-lg shrink-0 cursor-pointer transition-colors"
              title="Xem đánh giá từ khách hàng"
            >
              <Star className="w-3 h-3 fill-[#FFC799] text-[#FFC799]" />
              <span className="text-[11px] font-bold text-[#F5F5F5]">
                {avgRating > 0 ? avgRating.toFixed(1) : '5.0'}
              </span>
              <span className="text-[10px] text-[#6E6E6E]">
                ({vehicle.reviewCount || 0})
              </span>
            </div>
          </div>

          <p className="mt-2 flex items-center gap-1 text-xs text-[#A0A0A0]">
            <Star className="h-3.5 w-3.5 text-[#FFC799]" />
            {(vehicle.reviewCount ?? 0) > 0
              ? `${avgRating.toFixed(1)} / 5 (${vehicle.reviewCount} đánh giá)`
              : 'Chưa có đánh giá'}
          </p>

          {/* Clean Recessed Spec Pills */}
          <div className="grid grid-cols-3 gap-2 mt-3.5">
            <div className="bg-[#101010]/70 border border-white/[0.07] rounded-xl px-2.5 py-2">
              <span className="text-[10px] text-[#6E6E6E] block">Đồng hồ ODO</span>
              <span className="font-mono-tabular font-semibold text-[#F5F5F5] text-[11px] flex items-center mt-0.5">
                <Gauge className="w-3 h-3 text-[#FFC799] mr-1 shrink-0" />
                {vehicle.odometer.toLocaleString('vi-VN')}km
              </span>
            </div>

            <div className="bg-[#101010]/70 border border-white/[0.07] rounded-xl px-2.5 py-2">
              <span className="text-[10px] text-[#6E6E6E] block">Mức tiêu hao</span>
              <span className="font-mono-tabular font-semibold text-[#F5F5F5] text-[11px] flex items-center mt-0.5">
                {isElectric ? (
                  <>
                    <Zap className="w-3 h-3 text-[#FFC799] mr-1 shrink-0" />
                    <span>198km/sạc</span>
                  </>
                ) : (
                  <>
                    <Fuel className="w-3 h-3 text-[#FFC799] mr-1 shrink-0" />
                    <span className="break-all">~1.7L/100km</span>
                  </>
                )}
              </span>
            </div>

            <div className="bg-[#101010]/70 border border-white/[0.07] rounded-xl px-2.5 py-2">
              <span className="text-[10px] text-[#6E6E6E] block">Đi kèm</span>
              <span className="font-semibold text-[#F5F5F5] text-[11px] flex items-center mt-0.5">
                <ShieldCheck className="w-3 h-3 text-[#FFC799] mr-1 shrink-0" />
                <span>02 Mũ + Áo mưa</span>
              </span>
            </div>
          </div>
        </div>

        {/* Pricing & Action Footer */}
        <div className="pt-3.5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-xl sm:text-2xl font-bold text-[#F5F5F5] font-mono-tabular tracking-tight">
                {vehicle.dailyPrice.toLocaleString('vi-VN')}đ
              </span>
              <span className="text-xs text-[#A0A0A0]">/ ngày</span>
            </div>
            <span className="text-[11px] text-[#FFC799] font-mono-tabular block mt-0.5">
              Cọc tham khảo/ngày: {depositPreview.toLocaleString('vi-VN')}đ
            </span>
          </div>

          <button
            type="button"
            disabled={!isAvailable}
            onClick={(e) => {
              e.stopPropagation();
              handleBookClick();
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 ${
              isAvailable
                ? 'bg-[#F5F5F5] group-hover:bg-[#FFC799] text-[#101010] active:scale-95 cursor-pointer shadow-sm'
                : 'bg-white/5 text-[#6E6E6E] cursor-not-allowed border border-white/5'
            }`}
          >
            <span>
              {isAvailable ? 'Đặt xe' : vehicle.status === 'Rented' ? 'Đang thuê' : 'Chưa sẵn sàng'}
            </span>
            {isAvailable && (
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.2] transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
