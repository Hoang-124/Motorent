import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  CreditCard,
  Copy,
  Check,
  RotateCcw,
  X,
  Phone,
  ShieldCheck,
  Fuel,
  Gauge,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useBookingStatus } from '../hooks/useBookingStatus';
import { getOptimizedVehicleImageUrl } from '../utils/imageHelper';
import type { Booking, Vehicle, Branch } from '../types';

interface OrderTimelineItem {
  key: string;
  title: string;
  description: string;
  timestamp?: string | null;
  isCompleted: boolean;
  isCurrent: boolean;
  status: 'completed' | 'current' | 'upcoming' | 'cancelled';
}

interface OrderPricingDetails {
  basePrice: number;
  dailyPrice: number;
  durationDays: number;
  durationHours: number;
  discountAmount: number;
  totalAmount: number;
  depositAmount: number;
  paidAmount: number;
  remainingAmount: number;
  lateFee: number;
  damageFee: number;
  refundAmount?: number;
  refundStatus?: string;
  isPaid: boolean;
  depositPaid: boolean;
}

interface OrderAvailableActions {
  canPayDeposit: boolean;
  canPayFull: boolean;
  canCancel: boolean;
  canExtend: boolean;
  canRefund: boolean;
  canCheckin: boolean;
  canCheckout: boolean;
  canCounterPay: boolean;
}

interface EnrichedBooking extends Booking {
  timeline?: OrderTimelineItem[];
  pricing?: OrderPricingDetails;
  actions?: OrderAvailableActions;
}

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState<EnrichedBooking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Modals state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [isPaymentProcessing, setIsPaymentProcessing] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Hook for live status synchronization
  const { status: liveStatus, isLive } = useBookingStatus(id, booking);

  const fetchBookingDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/bookings/${id}`);
      if (res.data?.success && res.data.data) {
        setBooking(res.data.data);
      } else {
        setError('Không tìm thấy thông tin đơn đặt xe này.');
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj.response?.data?.message || 'Không thể tải thông tin đơn đặt xe.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBookingDetails();
  }, [fetchBookingDetails]);

  // If live status changes from socket, update local status
  useEffect(() => {
    if (liveStatus && booking && liveStatus !== booking.status) {
      setBooking((prev) => (prev ? { ...prev, status: liveStatus as Booking['status'] } : null));
    }
  }, [liveStatus, booking]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCancelBooking = async () => {
    if (!booking?._id) return;
    if (!cancelReason.trim()) {
      setCancelError('Vui lòng nhập lý do hủy đơn.');
      return;
    }

    try {
      setIsCancelling(true);
      setCancelError(null);
      const res = await api.put(`/bookings/${booking._id}/cancel`, {
        reason: cancelReason.trim(),
      });

      if (res.data?.success) {
        setIsCancelModalOpen(false);
        await fetchBookingDetails();
      } else {
        setCancelError(res.data?.message || 'Hủy đơn không thành công.');
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setCancelError(errorObj.response?.data?.message || 'Lỗi xử lý hủy đơn đặt xe.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleVNPayPayment = async (amountType: 'Deposit30' | 'Full100') => {
    if (!booking?._id) return;
    try {
      setIsPaymentProcessing(true);
      setPaymentError(null);
      const res = await api.post('/payments/vnpay/create', {
        bookingId: booking._id,
        amountType,
      });

      if (res.data?.success && res.data?.data?.paymentUrl) {
        window.location.href = res.data.data.paymentUrl;
      } else {
        setPaymentError(res.data?.message || 'Không thể tạo cổng thanh toán VNPay.');
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setPaymentError(errorObj.response?.data?.message || 'Lỗi kết nối cổng thanh toán VNPay.');
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101010] text-[#F5F5F5] flex items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#FFC799] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#A0A0A0]">Đang tải chi tiết đơn đặt xe...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#101010] text-[#F5F5F5] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#161616] border border-white/10 rounded-2xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-[#FF8080] mx-auto" />
          <h2 className="text-xl font-bold text-[#F5F5F5]">Không thể tải đơn hàng</h2>
          <p className="text-sm text-[#A0A0A0]">{error || 'Đơn hàng không tồn tại hoặc bạn không có quyền truy cập.'}</p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/profile?tab=bookings')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] text-xs font-semibold transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại danh sách đơn</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const vehicle = typeof booking.vehicleId === 'object' && booking.vehicleId !== null ? (booking.vehicleId as Vehicle) : null;
  const pickupBranch = typeof booking.pickupBranchId === 'object' && booking.pickupBranchId !== null ? (booking.pickupBranchId as Branch) : null;
  const returnBranch = typeof booking.returnBranchId === 'object' && booking.returnBranchId !== null ? (booking.returnBranchId as Branch) : null;

  const vehicleImage = vehicle?.images && vehicle.images.length > 0 ? getOptimizedVehicleImageUrl(vehicle.images[0]) : '';
  const vehicleName = vehicle?.vehicleModel || 'Xe máy Motorent';
  const vehicleBrand = vehicle?.brand || '';
  const licensePlate = vehicle?.licensePlate || 'Chờ gán biển số';

  const timeline = booking.timeline || [];
  const pricing = booking.pricing || {
    basePrice: booking.totalAmount,
    dailyPrice: 0,
    durationDays: 1,
    durationHours: 24,
    discountAmount: booking.discountAmount || 0,
    totalAmount: booking.totalAmount,
    depositAmount: booking.depositAmount,
    paidAmount: booking.paidAmount || 0,
    remainingAmount: booking.remainingAmount || 0,
    lateFee: booking.lateFee || 0,
    damageFee: booking.damageFee || 0,
    refundAmount: booking.refundAmount,
    refundStatus: booking.refundStatus,
    isPaid: Boolean(booking.isPaid),
    depositPaid: Boolean(booking.depositPaid),
  };
  const actions = booking.actions || {
    canPayDeposit: booking.status === 'Pending' && !booking.depositPaid && !booking.isPaid,
    canPayFull: !booking.isPaid && (booking.remainingAmount || 0) > 0,
    canCancel: ['Pending', 'Approved', 'Confirmed'].includes(booking.status),
    canExtend: ['Confirmed', 'Ongoing'].includes(booking.status),
    canRefund: false,
    canCheckin: false,
    canCheckout: false,
    canCounterPay: false,
  };

  const getStatusBadge = () => {
    switch (booking.status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFC799] mr-2" />
            Chờ thanh toán cọc 30%
          </span>
        );
      case 'Approved':
      case 'Confirmed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Đã xác nhận &amp; Khóa biển số
          </span>
        );
      case 'Ongoing':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mr-2 animate-ping" />
            Đang lưu hành nhận xe
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Đã hoàn thành chuyến đi
          </span>
        );
      case 'Cancelled':
      case 'Rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-[#FF8080]/15 text-[#FF8080] border border-[#FF8080]/30">
            Đã hủy đơn thuê
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-white/10 text-white/70">
            {booking.status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] py-8 sm:py-12 bg-editorial-grain">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* =====================================================================
            TOP NAVIGATION & HEADER BAR
            ===================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="flex items-center space-x-4">
            <Link
              to="/profile?tab=bookings"
              className="p-2.5 rounded-xl bg-[#161616] border border-white/10 hover:border-white/20 text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
              title="Quay lại danh sách đơn"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center space-x-3">
                <span className="text-xs uppercase tracking-wider text-[#6E6E6E] font-medium">Hợp đồng điện tử</span>
                <span className="font-mono-tabular font-bold text-lg text-[#FFC799]">{booking.bookingCode}</span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(booking.bookingCode)}
                  className="p-1 rounded text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
                  title="Sao chép mã đơn"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-[#FFC799]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="text-xs text-[#A0A0A0] mt-0.5">
                Khởi tạo lúc: {booking.createdAt ? new Date(booking.createdAt).toLocaleString('vi-VN') : 'Mới tạo'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Socket Status */}
            <div
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-md text-[11px] font-medium border ${
                isLive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-[#6E6E6E]'
              }`}
            >
              <Radio className={`w-3 h-3 ${isLive ? 'animate-pulse text-emerald-400' : 'text-[#6E6E6E]'}`} />
              <span>{isLive ? 'Đồng bộ trực tiếp 24/7' : 'Đang kết nối lại'}</span>
            </div>

            {/* Status Badge */}
            {getStatusBadge()}
          </div>
        </div>

        {/* =====================================================================
            1. ORDER LIFECYCLE TIMELINE (ACCEPTANCE CRITERIA)
            ===================================================================== */}
        <div className="bg-[#161616] border border-white/10 rounded-2xl p-6 sm:p-8 overflow-hidden">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#F5F5F5] tracking-tight">Tiến trình bàn giao &amp; Thu hồi xe</h2>
            <span className="text-xs text-[#6E6E6E]">Quy chuẩn vận hành Motorent</span>
          </div>

          <div className="relative">
            {/* Mobile / Vertical & Desktop / Horizontal Steps */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
              {timeline.map((step, idx) => {
                const isCurrent = step.isCurrent;
                const isCompleted = step.isCompleted;
                const isCancelled = step.status === 'cancelled';

                return (
                  <div
                    key={step.key || idx}
                    className={`relative p-4 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-[#FFC799]/10 border-[#FFC799]/40 shadow-lg shadow-[#FFC799]/5'
                        : isCompleted
                        ? 'bg-[#101010] border-white/15'
                        : isCancelled
                        ? 'bg-[#FF8080]/10 border-[#FF8080]/30'
                        : 'bg-[#101010]/40 border-white/[0.06] opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 mb-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isCancelled
                            ? 'bg-[#FF8080] text-[#101010]'
                            : isCompleted
                            ? 'bg-[#FFC799] text-[#101010]'
                            : isCurrent
                            ? 'bg-[#FFC799]/20 text-[#FFC799] border border-[#FFC799]'
                            : 'bg-white/10 text-[#6E6E6E]'
                        }`}
                      >
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>

                      <h3
                        className={`text-xs font-bold line-clamp-1 ${
                          isCancelled
                            ? 'text-[#FF8080]'
                            : isCurrent
                            ? 'text-[#FFC799]'
                            : isCompleted
                            ? 'text-[#F5F5F5]'
                            : 'text-[#6E6E6E]'
                        }`}
                      >
                        {step.title}
                      </h3>
                    </div>

                    <p className="text-[11px] text-[#A0A0A0] leading-relaxed line-clamp-2">{step.description}</p>

                    {step.timestamp && (
                      <div className="mt-2.5 pt-2 border-t border-white/[0.06] text-[10px] text-[#6E6E6E] font-mono-tabular">
                        {new Date(step.timestamp).toLocaleString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* =====================================================================
            2-COLUMN GRID: LEFT (VEHICLE & SCHEDULE) / RIGHT (PRICING & ACTIONS)
            ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT 7 COLS: VEHICLE SPECS & LOGISTICS */}
          <div className="lg:col-span-7 space-y-6">

            {/* Vehicle Card */}
            <div className="bg-[#161616] border border-white/10 rounded-2xl p-6 sm:p-7 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#FFC799] font-semibold block">
                    {vehicleBrand || 'Hãng xe cao cấp'}
                  </span>
                  <h3 className="text-xl font-bold text-[#F5F5F5]">{vehicleName}</h3>
                </div>

                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#101010] border border-white/15">
                  <span className="text-[11px] text-[#6E6E6E]">Biển số:</span>
                  <span className="font-mono-tabular font-bold text-xs text-[#FFC799] tracking-wider">
                    {licensePlate}
                  </span>
                </div>
              </div>

              {/* Photo & Quick Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                {vehicleImage && (
                  <div className="sm:col-span-5 aspect-[4/3] rounded-xl overflow-hidden bg-[#101010] border border-white/10 flex items-center justify-center">
                    <img
                      src={vehicleImage}
                      alt={vehicleName}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                <div className={`${vehicleImage ? 'sm:col-span-7' : 'sm:col-span-12'} space-y-3 text-xs`}>
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                    <span className="text-[#A0A0A0] flex items-center gap-1.5">
                      <Fuel className="w-3.5 h-3.5 text-[#FFC799]" />
                      Loại nhiên liệu
                    </span>
                    <span className="font-medium text-[#F5F5F5]">
                      {vehicle?.fuelType === 'Electric' ? 'Điện sạc tiêu chuẩn' : 'Xăng tiêu chuẩn'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                    <span className="text-[#A0A0A0] flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-[#FFC799]" />
                      Chỉ số ODO nhận xe
                    </span>
                    <span className="font-mono-tabular text-[#F5F5F5]">
                      {booking.startOdometer ? `${booking.startOdometer} km` : 'Ghi nhận tại bàn giao'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                    <span className="text-[#A0A0A0] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#FFC799]" />
                      Bảo hiểm &amp; Hỗ trợ cứu hộ
                    </span>
                    <span className="font-medium text-emerald-400">Đã kích hoạt 24/7</span>
                  </div>
                </div>
              </div>

              {/* Schedule & Stations Strip */}
              <div className="pt-4 border-t border-white/[0.08] space-y-4">
                <h4 className="text-xs uppercase tracking-wider text-[#6E6E6E] font-semibold">
                  Lịch trình nhận &amp; Trả xe
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Pickup Info */}
                  <div className="p-4 rounded-xl bg-[#101010] border border-white/10 space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-[#FFC799]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Thời gian nhận xe</span>
                    </div>
                    <div className="font-mono-tabular text-sm font-bold text-[#F5F5F5]">
                      {new Date(booking.pickupDateTime).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-xs text-[#A0A0A0] flex items-start space-x-1.5 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#6E6E6E] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-[#F5F5F5]">{pickupBranch?.name || 'Trạm trung tâm'}</div>
                        <div className="text-[11px] text-[#6E6E6E]">{pickupBranch?.address || 'Chi nhánh Motorent'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Return Info */}
                  <div className="p-4 rounded-xl bg-[#101010] border border-white/10 space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-[#A0A0A0]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Thời gian trả hẹn ước</span>
                    </div>
                    <div className="font-mono-tabular text-sm font-bold text-[#F5F5F5]">
                      {new Date(booking.returnDateTime).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-xs text-[#A0A0A0] flex items-start space-x-1.5 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#6E6E6E] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-[#F5F5F5]">{returnBranch?.name || 'Trạm hoàn trả'}</div>
                        <div className="text-[11px] text-[#6E6E6E]">{returnBranch?.address || 'Chi nhánh Motorent'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-[#A0A0A0] bg-[#101010]/60 p-3 rounded-lg border border-white/[0.06] flex items-center justify-between">
                  <span>Thời lượng hợp đồng:</span>
                  <span className="font-mono-tabular font-bold text-[#FFC799]">
                    {pricing.durationDays} ngày ({pricing.durationHours} giờ)
                  </span>
                </div>
              </div>
            </div>

            {/* Renter Identity Card */}
            <div className="bg-[#161616] border border-white/10 rounded-2xl p-6 space-y-4">
              <h4 className="text-xs uppercase tracking-wider text-[#6E6E6E] font-semibold">
                Thông tin người thuê nhận xe
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[#6E6E6E] block mb-1">Họ tên khách hàng</span>
                  <span className="font-semibold text-[#F5F5F5]">
                    {user?.firstName ? `${user.lastName || ''} ${user.firstName}`.trim() : user?.username || 'Khách hàng'}
                  </span>
                </div>

                <div>
                  <span className="text-[#6E6E6E] block mb-1">Số điện thoại liên lạc</span>
                  <span className="font-mono-tabular text-[#F5F5F5]">
                    {user?.phoneNumber || 'Chưa cung cấp'}
                  </span>
                </div>

                <div>
                  <span className="text-[#6E6E6E] block mb-1">Trạng thái eKYC CCCD/GPLX</span>
                  <span
                    className={`font-medium flex items-center gap-1 ${
                      user?.identityStatus === 'Verified'
                        ? 'text-emerald-400'
                        : user?.identityStatus === 'Pending'
                        ? 'text-amber-400'
                        : 'text-[#A0A0A0]'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {user?.identityStatus === 'Verified'
                      ? 'Đã xác thực eKYC'
                      : user?.identityStatus === 'Pending'
                      ? 'Đang chờ duyệt eKYC'
                      : user?.identityStatus === 'Rejected'
                      ? 'Cần bổ sung giấy tờ'
                      : 'Chưa xác thực eKYC'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#A0A0A0]">
                <span>Cần xuất trình bản gốc CCCD/GPLX tại quầy khi nhận bàn giao xe.</span>
                {pickupBranch?.phone && (
                  <a
                    href={`tel:${pickupBranch.phone.replace(/[^0-9+]/g, '')}`}
                    className="text-[#FFC799] font-medium flex items-center gap-1 hover:underline"
                  >
                    <Phone className="w-3 h-3" /> Hotline trạm: {pickupBranch.phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: FINANCIAL BREAKDOWN & ACTION DISPATCHER */}
          <div className="lg:col-span-5 space-y-6">

            {/* Pricing Details Card */}
            <div className="bg-[#161616] border border-white/10 rounded-2xl p-6 sm:p-7 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <h3 className="text-base font-bold text-[#F5F5F5]">Bảng tính tài chính</h3>
                <span className="text-xs text-[#6E6E6E] font-mono-tabular">VNĐ</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#A0A0A0]">Đơn giá niêm yết theo ngày</span>
                  <span className="font-mono-tabular text-[#F5F5F5]">
                    {pricing.dailyPrice.toLocaleString('vi-VN')} đ / ngày
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#A0A0A0]">Thời gian tính phí</span>
                  <span className="font-mono-tabular text-[#F5F5F5]">{pricing.durationDays} ngày</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#A0A0A0]">Giá gốc dự tính</span>
                  <span className="font-mono-tabular text-[#F5F5F5]">
                    {pricing.basePrice.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                {pricing.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>Khuyến mãi / Giảm giá voucher</span>
                    <span className="font-mono-tabular font-medium">
                      -{pricing.discountAmount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                )}

                {pricing.lateFee > 0 && (
                  <div className="flex items-center justify-between text-[#FF8080]">
                    <span>Phụ phí trễ giờ hoàn trả</span>
                    <span className="font-mono-tabular font-medium">
                      +{pricing.lateFee.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                )}

                {pricing.damageFee > 0 && (
                  <div className="flex items-center justify-between text-[#FF8080]">
                    <span>Phụ phí hư tổn / bồi hoàn</span>
                    <span className="font-mono-tabular font-medium">
                      +{pricing.damageFee.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-sm">
                  <span className="font-bold text-[#F5F5F5]">Tổng cộng hợp đồng</span>
                  <span className="font-mono-tabular font-bold text-lg text-[#FFC799]">
                    {pricing.totalAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {/* Payment Status Segment */}
              <div className="p-4 rounded-xl bg-[#101010] border border-white/10 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#A0A0A0]">Tiền cọc giữ xe (30%):</span>
                  <div className="text-right">
                    <span className="font-mono-tabular font-bold text-[#F5F5F5]">
                      {pricing.depositAmount.toLocaleString('vi-VN')} đ
                    </span>
                    <span
                      className={`block text-[10px] ${
                        pricing.depositPaid || pricing.isPaid ? 'text-emerald-400 font-semibold' : 'text-[#FFC799]'
                      }`}
                    >
                      {pricing.depositPaid || pricing.isPaid ? 'Đã hoàn tất thanh toán cọc' : 'Chưa thanh toán cọc'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <span className="text-[#A0A0A0]">Số tiền còn lại (70%):</span>
                  <div className="text-right">
                    <span className="font-mono-tabular font-bold text-[#F5F5F5]">
                      {pricing.remainingAmount.toLocaleString('vi-VN')} đ
                    </span>
                    <span
                      className={`block text-[10px] ${
                        pricing.isPaid ? 'text-emerald-400 font-semibold' : 'text-[#6E6E6E]'
                      }`}
                    >
                      {pricing.isPaid ? 'Đã thanh toán đủ 100%' : 'Thanh toán tại quầy khi nhận xe'}
                    </span>
                  </div>
                </div>

                {pricing.refundAmount !== undefined && pricing.refundAmount > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-emerald-400">
                    <span>Số tiền hoàn lại (BR-06):</span>
                    <span className="font-mono-tabular font-bold">
                      {pricing.refundAmount.toLocaleString('vi-VN')} đ ({pricing.refundStatus || 'Chờ duyệt'})
                    </span>
                  </div>
                )}
              </div>

              {/* Actions Area */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs uppercase tracking-wider text-[#6E6E6E] font-semibold">Thao tác khả dụng</h4>

                {paymentError && (
                  <div className="p-3 rounded-xl bg-[#FF8080]/15 border border-[#FF8080]/30 text-xs text-[#FF8080] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* 1. Pay Deposit 30% VNPay */}
                {actions.canPayDeposit && (
                  <button
                    type="button"
                    onClick={() => handleVNPayPayment('Deposit30')}
                    disabled={isPaymentProcessing}
                    className="w-full py-3 px-4 rounded-xl bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-black/40 cursor-pointer disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Thanh toán cọc 30% qua VNPay ({pricing.depositAmount.toLocaleString('vi-VN')} đ)</span>
                  </button>
                )}

                {/* 2. Pay Full 100% VNPay */}
                {actions.canPayFull && (
                  <button
                    type="button"
                    onClick={() => handleVNPayPayment('Full100')}
                    disabled={isPaymentProcessing}
                    className="w-full py-3 px-4 rounded-xl bg-[#161616] border border-[#FFC799]/40 hover:bg-[#FFC799]/15 text-[#FFC799] text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Thanh toán đủ 100% qua VNPay ({pricing.remainingAmount.toLocaleString('vi-VN')} đ)</span>
                  </button>
                )}

                {/* 3. Extend Rental */}
                {actions.canExtend && (
                  <Link
                    to="/profile?tab=bookings"
                    className="w-full py-2.5 px-4 rounded-xl bg-[#101010] border border-white/15 hover:border-[#FFC799] text-[#F5F5F5] text-xs font-medium transition-all flex items-center justify-center space-x-2"
                  >
                    <Clock className="w-4 h-4 text-[#FFC799]" />
                    <span>Yêu cầu gia hạn thêm thời gian thuê</span>
                  </Link>
                )}

                {/* 4. Cancel Booking Modal Trigger */}
                {actions.canCancel && (
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-transparent border border-white/10 hover:border-[#FF8080]/40 text-[#A0A0A0] hover:text-[#FF8080] text-xs font-medium transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Hủy đơn đặt xe này (Theo chính sách BR-06)</span>
                  </button>
                )}

                {/* 5. Re-rent bike if completed or cancelled */}
                {vehicle && (booking.status === 'Completed' || booking.status === 'Cancelled') && (
                  <Link
                    to={`/booking/${vehicle._id}`}
                    className="w-full py-3 px-4 rounded-xl bg-[#101010] border border-white/15 hover:border-[#FFC799] text-[#F5F5F5] text-xs font-semibold transition-all flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4 text-[#FFC799]" />
                    <span>Đặt lại chiếc xe này</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Electronic Policy Note */}
            <div className="p-4 rounded-xl bg-[#161616]/60 border border-white/[0.06] text-[11px] text-[#6E6E6E] space-y-1.5">
              <div className="flex items-center space-x-1.5 text-[#A0A0A0] font-medium">
                <FileText className="w-3.5 h-3.5 text-[#FFC799]" />
                <span>Chính sách bảo vệ quyền lợi người thuê</span>
              </div>
              <p>
                - Hủy trước 24 giờ kể từ thời điểm nhận xe: Hoàn lại 100% số tiền đã thanh toán cọc.
              </p>
              <p>
                - Hủy trong vòng 24 giờ trước nhận xe: Giữ lại tiền cọc 30% làm phí lưu kho bãi và bồi hoàn chi nhánh.
              </p>
            </div>
          </div>
        </div>

        {/* =====================================================================
            MODAL: CANCEL ORDER (RULE BR-06 CONFIRMATION)
            ===================================================================== */}
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#161616] border border-white/15 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF8080]/15 border border-[#FF8080]/30 flex items-center justify-center text-[#FF8080]">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F5F5F5]">Xác nhận hủy đơn thuê</h3>
                    <p className="text-xs text-[#A0A0A0]">Mã đơn: {booking.bookingCode}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCancelModalOpen(false)}
                  className="text-[#6E6E6E] hover:text-[#F5F5F5] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#A0A0A0] space-y-1">
                <p className="font-semibold text-[#F5F5F5]">Chính sách hủy đơn (Rule BR-06):</p>
                <p>• Hệ thống sẽ tự động đối soát mốc thời gian nhận xe để tính toán số tiền hoàn cọc chính xác.</p>
                <p>• Biển số xe sẽ được mở khóa lại ngay lập tức cho các khách hàng khác thuê.</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#A0A0A0] block mb-1.5">
                  Lý do bạn muốn hủy đơn thuê xe: <span className="text-[#FF8080]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ví dụ: Thay đổi lịch trình chuyến bay, công việc cá nhân..."
                  className="w-full bg-[#101010] border border-white/15 rounded-xl p-3 text-xs text-[#F5F5F5] placeholder-[#6E6E6E] focus:outline-none focus:border-[#FFC799]"
                />
              </div>

              {cancelError && (
                <div className="text-xs text-[#FF8080] bg-[#FF8080]/10 p-2.5 rounded-lg border border-[#FF8080]/20">
                  {cancelError}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  disabled={isCancelling}
                  className="px-4 py-2 rounded-xl bg-[#101010] border border-white/15 hover:border-white/30 text-xs font-semibold text-[#A0A0A0] transition-colors cursor-pointer"
                >
                  Đóng lại
                </button>
                <button
                  type="button"
                  onClick={handleCancelBooking}
                  disabled={isCancelling}
                  className="px-4 py-2 rounded-xl bg-[#FF8080] hover:bg-[#FF8080]/80 text-[#101010] text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isCancelling ? 'Đang xử lý...' : 'Xác nhận hủy đơn'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
