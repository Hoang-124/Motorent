import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Calendar, 
  Clock,
  MapPin, 
  CreditCard, 
  CheckCircle, 
  AlertCircle,
  QrCode,
  Sparkles,
  Phone,
  User as UserIcon,
  LogIn,
  Camera,
  ChevronLeft,
  ChevronRight,
  Tag
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import type { Vehicle, Branch } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getOptimizedVehicleImageUrl } from '../utils/imageHelper';

interface BookingModalProps {
  vehicle: Vehicle | null;
  branches: Branch[];
  initialPickupBranchId?: string;
  initialReturnBranchId?: string;
  onClose: () => void;
  onSuccess: (bookingCode: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  vehicle,
  branches,
  initialPickupBranchId,
  initialReturnBranchId,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [pickupBranchId, setPickupBranchId] = useState<string>('');
  const [returnBranchId, setReturnBranchId] = useState<string>('');

  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 3);

  const [pickupDate, setPickupDate] = useState<string>(formatLocalDate(tomorrow));
  const [pickupTime, setPickupTime] = useState<string>('08:30');
  const [returnDate, setReturnDate] = useState<string>(formatLocalDate(dayAfter));
  const [returnTime, setReturnTime] = useState<string>('18:00');

  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Banking' | 'Cash'>('Banking');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [discountCode, setDiscountCode] = useState<string>('');
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discountAmount: number } | null>(null);
  const [voucherFeedback, setVoucherFeedback] = useState<string>('');
  const [isConflicting, setIsConflicting] = useState<boolean>(false);
  const [estimateLoading, setEstimateLoading] = useState<boolean>(false);

  const [modalAngle, setModalAngle] = useState<number>(1);
  const [modalImgError, setModalImgError] = useState<boolean>(false);

  const ANGLE_LABELS = [
    { id: 1, label: 'Ngang xe', title: 'Góc ngang thân xe' },
    { id: 0, label: '3/4 Trước', title: 'Góc 3/4 mặt trước' },
    { id: 2, label: 'Góc sau', title: 'Góc đuôi xe & khoang lái' },
  ];

  useEffect(() => {
    setModalImgError(false);
  }, [vehicle?._id, modalAngle]);

  // Sync state when vehicle or user changes
  useEffect(() => {
    if (vehicle) {
      const vBranchId = typeof vehicle.branchId === 'object' ? vehicle.branchId._id : vehicle.branchId;
      setPickupBranchId(initialPickupBranchId || vBranchId || branches[0]?._id || '');
      setReturnBranchId(initialReturnBranchId || initialPickupBranchId || vBranchId || branches[0]?._id || '');
    }
  }, [vehicle, initialPickupBranchId, initialReturnBranchId, branches]);

  useEffect(() => {
    if (user) {
      const fullName = [user.lastName, user.firstName].filter(Boolean).join(' ') || user.username || '';
      setCustomerName(fullName);
      setCustomerPhone(user.phoneNumber || '');
    }
  }, [user]);

  // Duration & pricing calculation
  const startDateTime = new Date(`${pickupDate}T${pickupTime}:00+07:00`);
  const endDateTime = new Date(`${returnDate}T${returnTime}:00+07:00`);
  const durationMs = Math.max(0, endDateTime.getTime() - startDateTime.getTime());
  const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 3600 * 24)));
  const basePrice = durationDays * (vehicle ? vehicle.dailyPrice : 0);
  const discountDeduction = appliedVoucher ? appliedVoucher.discountAmount : 0;
  const totalAmount = Math.max(0, basePrice - discountDeduction);
  const depositAmount = Math.round(totalAmount * 0.3);
  const remainingAmount = totalAmount - depositAmount;

  // Real-time conflict & price estimation check via server API
  useEffect(() => {
    if (!vehicle || !pickupBranchId || !returnBranchId) return;
    if (startDateTime >= endDateTime) return;

    const timer = setTimeout(async () => {
      try {
        setEstimateLoading(true);
        const res = await api.post('/bookings/estimate', {
          vehicleId: vehicle._id,
          pickupBranchId,
          returnBranchId,
          pickupDateTime: startDateTime.toISOString(),
          returnDateTime: endDateTime.toISOString(),
          discountCode: appliedVoucher?.code || undefined,
        });

        if (res.data?.success) {
          setIsConflicting(res.data.data.conflicting);
        }
      } catch {
        // Silently catch live estimate failure
      } finally {
        setEstimateLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [vehicle?._id, pickupBranchId, returnBranchId, pickupDate, pickupTime, returnDate, returnTime, appliedVoucher?.code]);

  const handleApplyVoucher = async () => {
    if (!discountCode.trim()) {
      setAppliedVoucher(null);
      setVoucherFeedback('');
      return;
    }

    try {
      setEstimateLoading(true);
      const res = await api.post('/bookings/estimate', {
        vehicleId: vehicle!._id,
        pickupBranchId,
        returnBranchId,
        pickupDateTime: startDateTime.toISOString(),
        returnDateTime: endDateTime.toISOString(),
        discountCode: discountCode.trim().toUpperCase(),
      });

      if (res.data?.success && res.data.data.appliedDiscount) {
        setAppliedVoucher({
          code: res.data.data.appliedDiscount.code,
          discountAmount: res.data.data.appliedDiscount.discountAmount,
        });
        setVoucherFeedback(`Đã áp dụng mã ${res.data.data.appliedDiscount.code}: Giảm ${res.data.data.appliedDiscount.discountAmount.toLocaleString('vi-VN')} đ`);
      } else {
        setAppliedVoucher(null);
        setVoucherFeedback('Mã giảm giá không tồn tại hoặc không đủ điều kiện.');
      }
    } catch (err: unknown) {
      setAppliedVoucher(null);
      if (axios.isAxiosError(err)) {
        setVoucherFeedback(err.response?.data?.message || 'Mã giảm giá không hợp lệ.');
      } else {
        setVoucherFeedback('Không thể kiểm tra mã giảm giá.');
      }
    } finally {
      setEstimateLoading(false);
    }
  };

  // If vehicle is null, return after all hooks are declared
  if (!vehicle) return null;

  const handleLoginRedirect = () => {
    onClose();
    navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !user) {
      setErrorMsg('Vui lòng đăng nhập tài khoản để tiến hành đặt xe.');
      return;
    }

    if (startDateTime >= endDateTime) {
      setErrorMsg('Thời gian trả xe phải sau thời gian nhận xe.');
      return;
    }

    if (startDateTime < new Date()) {
      setErrorMsg('Thời gian nhận xe không được nằm trong quá khứ.');
      return;
    }

    if (isConflicting) {
      setErrorMsg('Xe đã có người đặt trong khoảng thời gian này. Vui lòng chọn khung giờ khác.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        vehicleId: vehicle._id,
        pickupBranchId,
        returnBranchId,
        pickupDateTime: startDateTime.toISOString(),
        returnDateTime: endDateTime.toISOString(),
        paymentMethod,
        discountCode: appliedVoucher?.code || undefined,
      };

      const res = await api.post('/bookings', payload);
      if (res.data && res.data.success) {
        const newBooking = res.data.data;
        if (paymentMethod === 'Banking' && newBooking?._id) {
          try {
            const vnpayRes = await api.post('/payments/vnpay/create', {
              bookingId: newBooking._id,
              paymentType: 'Deposit30',
            });
            if (vnpayRes.data?.success && vnpayRes.data?.data?.paymentUrl) {
              window.location.href = vnpayRes.data.data.paymentUrl;
              return;
            }
          } catch (vnpErr) {
            console.error('[VNPay redirect fallback]', vnpErr);
          }
        }
        onSuccess(newBooking.bookingCode);
      } else {
        setErrorMsg(res.data?.message || 'Không thể tạo đơn đặt xe.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const serverMsg = err.response?.data?.message;
        if (err.response?.status === 409) {
          setErrorMsg(serverMsg || 'Xe đã có người đặt trong khung thời gian này. Vui lòng chọn khung giờ hoặc xe khác.');
        } else if (err.response?.status === 401) {
          setErrorMsg('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else if (err.response?.status === 403) {
          setErrorMsg(serverMsg || 'Tài khoản chưa đủ điều kiện thuê xe. Vui lòng hoàn tất eKYC.');
        } else {
          setErrorMsg(serverMsg || 'Không thể tạo đơn đặt xe. Vui lòng thử lại.');
        }
      } else {
        setErrorMsg('Lỗi kết nối máy chủ. Vui lòng kiểm tra lại đường truyền.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#161616] rounded-[2rem] max-w-2xl w-full shadow-2xl border border-white/10 overflow-hidden relative animate-in fade-in zoom-in duration-200 text-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0E221A] to-[#07140F] text-white p-6 relative border-b border-white/10">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2 text-[#FFC799] text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Xác nhận thông tin thuê xe tự lái</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white">
            {vehicle.vehicleModel}
          </h2>
          <p className="text-xs text-[#A0A0A0] mt-1">
            Biển số: {vehicle.licensePlate} • Đời {vehicle.yearManufactured || 2024} {vehicle.color ? `• Màu: ${vehicle.color}` : ''} • Tiết kiệm nhiên liệu
          </p>
        </div>

        {/* Not Logged In Banner */}
        {!isAuthenticated && (
          <div className="p-4 bg-[#FFC799]/12 border-b border-[#FFC799]/30 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-[#FFC799] text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#FFC799]" />
              <span>Bạn cần đăng nhập tài khoản khách hàng để đặt xe giữ chỗ.</span>
            </div>
            <button
              type="button"
              onClick={handleLoginRedirect}
              className="px-3 py-1.5 bg-[#FFC799] hover:bg-[#FFC799] text-[#101010] text-xs font-bold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập ngay</span>
            </button>
          </div>
        )}

        {/* 3-Angle Vehicle Showcase & Gallery */}
        <div className="bg-[#101010] border-b border-white/10 p-5">
          <div className="relative rounded-2xl bg-[#161616] border border-white/10 p-4 flex flex-col items-center justify-center min-h-[190px] overflow-hidden">
            {/* Angle Indicator Badge */}
            <div className="absolute top-3 left-3 z-10 flex items-center space-x-1.5 bg-[#101010]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[11px] font-semibold text-[#F5F5F5]">
              <Camera className="w-3.5 h-3.5 text-[#FFC799]" />
              <span>{ANGLE_LABELS[modalAngle]?.title} (Góc {modalAngle + 1}/3)</span>
            </div>

            {/* Left/Right Buttons */}
            <button
              type="button"
              onClick={() => {
                setModalAngle((prev) => (prev === 0 ? 2 : prev - 1));
                setModalImgError(false);
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-[#101010]/80 hover:bg-[#FFC799] hover:text-[#101010] text-white border border-white/15 flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
              aria-label="Góc trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setModalAngle((prev) => (prev === 2 ? 0 : prev + 1));
                setModalImgError(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-[#101010]/80 hover:bg-[#FFC799] hover:text-[#101010] text-white border border-white/15 flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
              aria-label="Góc sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Main Preview */}
            <div className="w-full h-48 bg-gradient-to-b from-[#E8F1ED] via-[#F4F8F6] to-[#DCE9E3] shadow-inner rounded-xl flex items-center justify-center overflow-hidden">
              {vehicle.images && vehicle.images[modalAngle] && !modalImgError ? (
                <img
                  src={getOptimizedVehicleImageUrl(vehicle.images[modalAngle])}
                  alt={`${vehicle.vehicleModel} - ${ANGLE_LABELS.find(a => a.id === modalAngle)?.title}`}
                  onError={() => setModalImgError(true)}
                  loading="lazy"
                  decoding="async"
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain scale-[1.38] transition-transform duration-300 mix-blend-multiply"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-2">
                  <svg
                    className="w-36 h-24 text-[#FFC799]"
                    viewBox="0 0 64 48"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="15" cy="34" r="9" className="stroke-slate-400 fill-white/60" />
                    <circle cx="49" cy="34" r="9" className="stroke-slate-400 fill-white/60" />
                    <circle cx="15" cy="34" r="3" className="fill-slate-500" />
                    <circle cx="49" cy="34" r="3" className="fill-slate-500" />
                    <path d="M15 34 L25 22 L38 22 L49 34" />
                    <path d="M25 22 L20 12 L28 10" />
                    <path d="M38 22 L42 15 L48 15" />
                    <path d="M24 20 C28 16 35 16 40 20 Z" className="fill-[#FFC799]/20 stroke-[#FFC799]" />
                  </svg>
                  <span className="text-[11px] text-slate-600 mt-1 font-semibold">
                    Ảnh mô phỏng góc chụp chuẩn kiểm định Motorent
                  </span>
                </div>
              )}
            </div>

            {/* 3 Interactive Thumbnail Switchers */}
            <div className="w-full grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
              {ANGLE_LABELS.map((ang) => (
                <button
                  key={ang.id}
                  type="button"
                  onClick={() => {
                    setModalAngle(ang.id);
                    setModalImgError(false);
                  }}
                  className={`p-2 rounded-xl text-left transition-all flex items-center space-x-2 border cursor-pointer ${
                    modalAngle === ang.id
                      ? 'bg-[#FFC799]/15 border-[#FFC799]/50 shadow-sm'
                      : 'bg-[#101010] border-white/5 hover:border-white/20'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      modalAngle === ang.id ? 'bg-[#99FFE4] ring-2 ring-[#FFC799]/30' : 'bg-slate-600'
                    }`}
                  />
                  <div className="truncate">
                    <span
                      className={`block text-[11px] font-bold truncate ${
                        modalAngle === ang.id ? 'text-[#F5F5F5] font-black' : 'text-[#A0A0A0]'
                      }`}
                    >
                      {ang.label}
                    </span>
                    <span className="block text-[9px] text-[#6E6E6E] truncate">
                      {ang.title}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-[#FF8080]/12 border border-[#FF8080]/30 text-[#FF8080] rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#FF8080]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isConflicting && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>Phương tiện này đã có khách đặt trong khung thời gian bạn chọn. Vui lòng đổi giờ hoặc chọn xe khác.</span>
            </div>
          )}

          {/* Pricing transparency card */}
          <div className="bg-[#101010] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
              <span className="text-[#A0A0A0] font-medium">Đơn giá ngày:</span>
              <span className="font-bold text-white">
                {vehicle.dailyPrice.toLocaleString('vi-VN')} đ/ngày
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-white/10 text-xs">
              <span className="text-[#A0A0A0] font-medium">Thời gian thuê ({durationDays} ngày):</span>
              <span className="font-bold text-white">
                {basePrice.toLocaleString('vi-VN')} đ
              </span>
            </div>

            {appliedVoucher && (
              <div className="flex items-center justify-between py-1 border-b border-white/10 text-xs text-emerald-400 font-bold">
                <span>Ưu đãi áp dụng ({appliedVoucher.code}):</span>
                <span>-{appliedVoucher.discountAmount.toLocaleString('vi-VN')} đ</span>
              </div>
            )}

            {/* Voucher code input */}
            <div className="pt-1">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-[#FFC799] absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Nhập mã ưu đãi (VD: CHAOBANMOI)..."
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    className="w-full bg-[#161616] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-white uppercase outline-none focus:border-[#FFC799]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyVoucher}
                  disabled={estimateLoading}
                  className="px-3.5 py-2 bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  Áp dụng
                </button>
              </div>
              {voucherFeedback && (
                <p className={`text-[11px] mt-1.5 ${appliedVoucher ? 'text-emerald-400 font-semibold' : 'text-rose-400'}`}>
                  {voucherFeedback}
                </p>
              )}
            </div>

            <div className="pt-2 grid grid-cols-2 gap-3 text-center">
              <div className="p-2.5 bg-[#161616] rounded-xl border border-[#FFC799]/30 shadow-sm">
                <span className="block text-[11px] font-bold text-[#F5F5F5] uppercase">
                  Cọc giữ xe online (30%)
                </span>
                <span className="text-base font-black text-[#FFC799]">
                  {depositAmount.toLocaleString('vi-VN')} đ
                </span>
                <span className="block text-[10px] text-[#A0A0A0] mt-0.5">Hoàn 100% nếu báo trước 24h</span>
              </div>
              <div className="p-2.5 bg-[#161616] rounded-xl border border-white/10 shadow-sm">
                <span className="block text-[11px] font-bold text-[#A0A0A0] uppercase">
                  Thanh toán tại quầy (70%)
                </span>
                <span className="text-base font-black text-white">
                  {remainingAmount.toLocaleString('vi-VN')} đ
                </span>
                <span className="block text-[10px] text-[#A0A0A0] mt-0.5">Khi nhận xe và đối soát</span>
              </div>
            </div>
          </div>

          {/* Branch & Date selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#A0A0A0] mb-1 flex items-center">
                <MapPin className="w-3.5 h-3.5 text-[#FFC799] mr-1" />
                Chi nhánh nhận xe
              </label>
              <select
                value={pickupBranchId}
                onChange={(e) => setPickupBranchId(e.target.value)}
                className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-white outline-none focus:border-[#FFC799] cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b._id} value={b._id} className="bg-[#161616] text-white">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#A0A0A0] mb-1 flex items-center">
                <MapPin className="w-3.5 h-3.5 text-[#FFC799] mr-1" />
                Chi nhánh trả xe (Khác trạm)
              </label>
              <select
                value={returnBranchId}
                onChange={(e) => setReturnBranchId(e.target.value)}
                className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-white outline-none focus:border-[#FFC799] cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b._id} value={b._id} className="bg-[#161616] text-white">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#A0A0A0] mb-1 flex items-center">
                <Calendar className="w-3.5 h-3.5 text-[#FFC799] mr-1" />
                Ngày & giờ nhận xe
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="col-span-2 bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:border-[#FFC799]"
                />
                <div className="relative">
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full bg-[#101010] border border-white/10 rounded-xl px-2 py-2 text-xs font-semibold text-white outline-none focus:border-[#FFC799]"
                  />
                  <Clock className="w-3 h-3 text-[#A0A0A0] absolute right-2 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#A0A0A0] mb-1 flex items-center">
                <Calendar className="w-3.5 h-3.5 text-[#FFC799] mr-1" />
                Ngày & giờ trả xe
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="date"
                  value={returnDate}
                  min={pickupDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="col-span-2 bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:border-[#FFC799]"
                />
                <div className="relative">
                  <input
                    type="time"
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="w-full bg-[#161616] border border-white/10 rounded-xl px-2 py-2 text-xs font-semibold text-white outline-none focus:border-[#FFC799]"
                  />
                  <Clock className="w-3 h-3 text-[#A0A0A0] absolute right-2 top-3 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Customer information from profile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-white/10">
            <div>
              <label className="block text-xs font-bold text-[#A0A0A0] mb-1 flex items-center">
                <UserIcon className="w-3.5 h-3.5 text-[#FFC799] mr-1" />
                Họ và tên người thuê (theo hồ sơ)
              </label>
              <input
                type="text"
                value={customerName || (isAuthenticated ? 'Đang cập nhật hồ sơ' : 'Chưa đăng nhập')}
                readOnly
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#A0A0A0] outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#A0A0A0] mb-1 flex items-center">
                <Phone className="w-3.5 h-3.5 text-[#FFC799] mr-1" />
                Số điện thoại liên hệ (theo hồ sơ)
              </label>
              <input
                type="tel"
                value={customerPhone || (isAuthenticated ? 'Chưa cập nhật SĐT' : 'Chưa đăng nhập')}
                readOnly
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#A0A0A0] outline-none cursor-not-allowed"
              />
            </div>
          </div>

          {/* Payment selection */}
          <div>
            <label className="block text-xs font-bold text-[#A0A0A0] mb-2 flex items-center">
              <CreditCard className="w-3.5 h-3.5 text-[#FFC799] mr-1" />
              Hình thức cọc 30% ({depositAmount.toLocaleString('vi-VN')} đ)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('Banking')}
                className={`p-3 rounded-xl border text-left flex items-center space-x-3 transition-all ${
                  paymentMethod === 'Banking'
                    ? 'border-[#FFC799] bg-[#FFC799]/15 text-white font-bold'
                    : 'border-white/10 bg-white/[0.02] text-[#A0A0A0] hover:bg-white/[0.04]'
                }`}
              >
                <QrCode className="w-5 h-5 text-[#FFC799] flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-white">Quét mã QR / VNPay</p>
                  <p className="text-[11px] text-[#A0A0A0]">Xác nhận tự động trong 30s</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Cash')}
                className={`p-3 rounded-xl border text-left flex items-center space-x-3 transition-all ${
                  paymentMethod === 'Cash'
                    ? 'border-[#FFC799] bg-[#FFC799]/15 text-white font-bold'
                    : 'border-white/10 bg-white/[0.02] text-[#A0A0A0] hover:bg-white/[0.04]'
                }`}
              >
                <CreditCard className="w-5 h-5 text-[#FFC799] flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-white">Cọc tại quầy chi nhánh</p>
                  <p className="text-[11px] text-[#A0A0A0]">Giữ chỗ trước tối đa 2 giờ</p>
                </div>
              </button>
            </div>
          </div>

          {/* Guarantee notice */}
          <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 text-xs text-[#A0A0A0] flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#FFC799] mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed">
              <strong className="text-white">Cam kết minh bạch:</strong> Kiểm tra xe chụp ảnh 5 góc trước khi bàn giao. Miễn phí hủy cọc nếu báo trước 24 giờ nhận xe.
            </p>
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#A0A0A0] hover:text-white hover:bg-white/5 transition-colors"
            >
              Hủy bỏ
            </button>
            {isAuthenticated ? (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl text-xs font-black bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] hover:bg-[#FFD6B3] text-[#101010] shadow-lg shadow-black/50 transition-all flex items-center space-x-2 disabled:opacity-50 active:scale-95 cursor-pointer"
              >
                {loading ? (
                  <span>Đang xử lý đặt xe...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Xác nhận đặt xe ngay</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLoginRedirect}
                className="px-6 py-3 rounded-xl text-xs font-black bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] hover:bg-[#FFD6B3] text-[#101010] shadow-lg shadow-black/50 transition-all flex items-center space-x-2 active:scale-95 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập để đặt xe</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
