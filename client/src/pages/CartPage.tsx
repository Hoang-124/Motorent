import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Trash2,
  MapPin,
  Calendar,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Tag,
  Compass,
  RefreshCw,
} from 'lucide-react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Branch, Vehicle } from '../types';
import { getOptimizedVehicleImageUrl } from '../utils/imageHelper';
import { DateTimePicker, normalizeReturnSchedule } from '../components/DateTimePicker';

interface VehicleEstimateItem {
  vehicleId: string;
  isAvailable: boolean;
  totalAmount: number;
  depositAmount: number;
  remainingAmount: number;
  discountAmount: number;
  error?: string;
}

interface CreatedOrderSummary {
  bookingId: string;
  bookingCode: string;
  vehicleName: string;
  licensePlate: string;
  totalAmount: number;
  depositAmount: number;
}

export const CartPage: React.FC = () => {
  const { cartItems, removeFromCart, clearCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [returnBranchId, setReturnBranchId] = useState<string>('SAME_AS_PICKUP');

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

  const [discountCode, setDiscountCode] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Banking' | 'Cash'>('Cash');

  const [estimates, setEstimates] = useState<Record<string, VehicleEstimateItem>>({});
  const [estimating, setEstimating] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [createdOrders, setCreatedOrders] = useState<CreatedOrderSummary[]>([]);

  useEffect(() => {
    api
      .get('/branches')
      .then((res) => {
        const list = res.data?.data || res.data || [];
        if (Array.isArray(list)) {
          setBranches(list.filter((b: Branch) => b.isActive !== false));
        }
      })
      .catch(() => {});
  }, []);

  const getVehicleBranchId = (v: Vehicle): string => {
    if (typeof v.branchId === 'object' && v.branchId !== null) {
      return v.branchId._id;
    }
    return String(v.branchId || '');
  };

  const getVehicleBranchName = (v: Vehicle): string => {
    if (typeof v.branchId === 'object' && v.branchId !== null && v.branchId.name) {
      return v.branchId.name;
    }
    const found = branches.find((b) => b._id === String(v.branchId));
    return found?.name || 'Chi nhánh Đà Nẵng';
  };

  // Fetch server-side estimates for all vehicles in cart
  useEffect(() => {
    if (cartItems.length === 0) {
      setEstimates({});
      return;
    }

    const pickupIso = `${pickupDate}T${pickupTime}:00`;
    const returnIso = `${returnDate}T${returnTime}:00`;
    const pDate = new Date(pickupIso);
    const rDate = new Date(returnIso);

    if (isNaN(pDate.getTime()) || isNaN(rDate.getTime()) || pDate >= rDate) {
      return;
    }

    let cancelled = false;
    setEstimating(true);

    Promise.all(
      cartItems.map(async (v) => {
        const pBranchId = getVehicleBranchId(v);
        const rBranchId = returnBranchId === 'SAME_AS_PICKUP' ? pBranchId : returnBranchId;
        try {
          const res = await api.post('/bookings/estimate', {
            vehicleId: v._id,
            pickupBranchId: pBranchId,
            returnBranchId: rBranchId || pBranchId,
            pickupDateTime: pDate.toISOString(),
            returnDateTime: rDate.toISOString(),
            discountCode: discountCode.trim() || undefined,
          });
          const d = res.data?.data;
          return {
            vehicleId: v._id,
            isAvailable: Boolean(d?.isAvailable),
            totalAmount: Number(d?.totalAmount ?? v.dailyPrice),
            depositAmount: Number(d?.depositAmount ?? Math.round(v.dailyPrice * 0.3)),
            remainingAmount: Number(d?.remainingAmount ?? Math.round(v.dailyPrice * 0.7)),
            discountAmount: Number(d?.discountAmount ?? 0),
          } as VehicleEstimateItem;
        } catch (err: unknown) {
          const msg =
            axios.isAxiosError(err) && err.response?.data?.message
              ? err.response.data.message
              : 'Không thể báo giá cho khung giờ này';
          return {
            vehicleId: v._id,
            isAvailable: false,
            totalAmount: v.dailyPrice,
            depositAmount: Math.round(v.dailyPrice * 0.3),
            remainingAmount: Math.round(v.dailyPrice * 0.7),
            discountAmount: 0,
            error: msg,
          } as VehicleEstimateItem;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, VehicleEstimateItem> = {};
      for (const item of results) {
        map[item.vehicleId] = item;
      }
      setEstimates(map);
      setEstimating(false);
    });

    return () => {
      cancelled = true;
    };
  }, [cartItems, pickupDate, pickupTime, returnDate, returnTime, returnBranchId, discountCode, branches]);

  const totals = useMemo(() => {
    let totalAmount = 0;
    let depositAmount = 0;
    let remainingAmount = 0;
    let discountAmount = 0;
    let unavailableCount = 0;

    for (const v of cartItems) {
      const est = estimates[v._id];
      if (est) {
        totalAmount += est.totalAmount;
        depositAmount += est.depositAmount;
        remainingAmount += est.remainingAmount;
        discountAmount += est.discountAmount;
        if (!est.isAvailable) unavailableCount++;
      } else {
        totalAmount += v.dailyPrice;
        depositAmount += Math.round(v.dailyPrice * 0.3);
        remainingAmount += Math.round(v.dailyPrice * 0.7);
      }
    }

    return { totalAmount, depositAmount, remainingAmount, discountAmount, unavailableCount };
  }, [cartItems, estimates]);

  const handleCheckoutAll = async () => {
    if (!isAuthenticated || !user) {
      navigate('/login?returnTo=/cart');
      return;
    }

    if (cartItems.length === 0) return;

    if (totals.unavailableCount > 0) {
      setErrorMsg('Có xe trong giỏ bị trùng lịch hoặc không khả dụng trong khung giờ đã chọn. Vui lòng xóa xe bị trùng hoặc đổi khung giờ.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const pickupIso = new Date(`${pickupDate}T${pickupTime}:00`).toISOString();
    const returnIso = new Date(`${returnDate}T${returnTime}:00`).toISOString();

    const successList: CreatedOrderSummary[] = [];
    const failedMessages: string[] = [];

    for (const v of cartItems) {
      const pBranchId = getVehicleBranchId(v);
      const rBranchId = returnBranchId === 'SAME_AS_PICKUP' ? pBranchId : returnBranchId;

      try {
        const res = await api.post('/bookings', {
          vehicleId: v._id,
          pickupBranchId: pBranchId,
          returnBranchId: rBranchId || pBranchId,
          pickupDateTime: pickupIso,
          returnDateTime: returnIso,
          paymentMethod,
          discountCode: discountCode.trim() || undefined,
        });

        const created = res.data?.data;
        if (created?._id) {
          successList.push({
            bookingId: created._id,
            bookingCode: created.bookingCode,
            vehicleName: `${v.brand} ${v.vehicleModel}`,
            licensePlate: v.licensePlate,
            totalAmount: created.totalAmount,
            depositAmount: created.depositAmount,
          });
          removeFromCart(v._id);
        }
      } catch (err: unknown) {
        const msg =
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : `Không thể đặt xe ${v.vehicleModel} (${v.licensePlate})`;
        failedMessages.push(`${v.vehicleModel} (${v.licensePlate}): ${msg}`);
      }
    }

    setSubmitting(false);

    if (successList.length > 0) {
      setCreatedOrders((prev) => [...prev, ...successList]);
    }

    if (failedMessages.length > 0) {
      setErrorMsg(failedMessages.join(' | '));
    }
  };

  if (createdOrders.length > 0 && cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#101010] text-[#F5F5F5] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto bg-[#161616] border border-white/10 rounded-3xl p-6 sm:p-10 space-y-6 shadow-2xl">
          <div className="flex items-center space-x-3 text-[#99FFE4]">
            <CheckCircle2 className="w-8 h-8 shrink-0" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#F5F5F5]">
                Đã khởi tạo thành công {createdOrders.length} đơn thuê xe!
              </h1>
              <p className="text-xs text-[#A0A0A0] mt-0.5">
                Tất cả phương tiện trong giỏ xe đã được tạo hợp đồng giữ chỗ riêng biệt để dễ dàng nhận/trả từng xe.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {createdOrders.map((ord) => (
              <div
                key={ord.bookingId}
                className="p-4 rounded-2xl bg-[#101010] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30">
                      {ord.bookingCode}
                    </span>
                    <span className="text-sm font-bold text-[#F5F5F5]">{ord.vehicleName}</span>
                    <span className="text-xs font-mono text-[#A0A0A0]">({ord.licensePlate})</span>
                  </div>
                  <p className="text-xs text-[#A0A0A0] mt-1">
                    Tổng tiền thuê:{' '}
                    <strong className="text-[#F5F5F5] font-mono-tabular">
                      {ord.totalAmount.toLocaleString('vi-VN')} đ
                    </strong>{' '}
                    · Cọc 30%:{' '}
                    <strong className="text-[#FFC799] font-mono-tabular">
                      {ord.depositAmount.toLocaleString('vi-VN')} đ
                    </strong>
                  </p>
                </div>

                <Link
                  to={`/orders/${ord.bookingId}`}
                  className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-[#FFC799] text-[#F5F5F5] hover:text-[#101010] text-xs font-semibold transition-colors shrink-0"
                >
                  <span>Chi tiết &amp; Thanh toán</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/bikes"
              className="px-4 py-2.5 rounded-xl bg-[#101010] border border-white/10 hover:border-white/25 text-xs font-semibold text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
            >
              Tiếp tục chọn xe khác
            </Link>
            <Link
              to="/profile?tab=bookings"
              className="px-5 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] text-xs font-bold transition-colors inline-flex items-center space-x-2"
            >
              <span>Quản lý tất cả chuyến xe của tôi</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#FFC799]/10 border border-[#FFC799]/25 text-[#FFC799] text-xs font-semibold mb-2">
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Giỏ xe đặt theo đoàn / nhiều phương tiện</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] tracking-tight">
              Giỏ xe của bạn ({cartItems.length} xe)
            </h1>
            <p className="text-xs sm:text-sm text-[#A0A0A0] mt-1">
              Đặt nhiều xe cùng lúc cho nhóm bạn hoặc gia đình, hỗ trợ chọn trả xe ở bất kỳ chi nhánh nào trong hệ thống.
            </p>
          </div>

          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="self-start sm:self-auto inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#FF8080]/10 hover:bg-[#FF8080]/20 border border-[#FF8080]/30 text-[#FF8080] text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa toàn bộ giỏ</span>
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-[#FF8080]/10 border border-[#FF8080]/30 text-[#FF8080] text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="bg-[#161616] border border-white/10 rounded-3xl p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#FFC799]">
              <ShoppingCart className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-[#F5F5F5]">Giỏ xe của bạn đang trống</h2>
            <p className="text-xs text-[#A0A0A0] max-w-md mx-auto">
              Hãy bấm nút &ldquo;Thêm vào giỏ&rdquo; trên các mẫu xe tại danh mục đội xe để gom nhiều xe và đặt cùng một lúc.
            </p>
            <Link
              to="/bikes"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] text-xs font-bold transition-colors"
            >
              <Compass className="w-4 h-4" />
              <span>Khám phá đội xe ngay</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Selected Vehicles List */}
            <div className="lg:col-span-7 space-y-4">
              {cartItems.map((vehicle) => {
                const rawImg = vehicle.images?.[1] || vehicle.images?.[0] || '';
                const imgUrl = rawImg ? getOptimizedVehicleImageUrl(rawImg, 320) : '';
                const est = estimates[vehicle._id];

                return (
                  <div
                    key={vehicle._id}
                    className={`p-4 sm:p-5 rounded-2xl bg-[#161616] border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      est && !est.isAvailable ? 'border-[#FF8080]/50' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="w-24 h-20 rounded-xl studio-paper-backdrop overflow-hidden flex items-center justify-center shrink-0 p-2">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={vehicle.vehicleModel}
                            className="w-full h-full object-contain mix-blend-multiply"
                          />
                        ) : (
                          <Compass className="w-6 h-6 text-[#6E6E6E]" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFC799]">
                            {vehicle.brand}
                          </span>
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white/10 text-[#F5F5F5]">
                            {vehicle.licensePlate}
                          </span>
                        </div>
                        <Link
                          to={`/bikes/${vehicle._id}`}
                          className="text-base font-bold text-[#F5F5F5] hover:text-[#FFC799] transition-colors block truncate"
                        >
                          {vehicle.vehicleModel}
                        </Link>
                        <p className="text-xs text-[#A0A0A0] flex items-center">
                          <MapPin className="w-3.5 h-3.5 text-[#FFC799] mr-1 shrink-0" />
                          <span className="truncate">Trạm nhận: {getVehicleBranchName(vehicle)}</span>
                        </p>
                        {est && !est.isAvailable && (
                          <p className="text-[11px] text-[#FF8080] font-medium">
                            {est.error || 'Xe đã có lịch đặt trong khung giờ này'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-[#A0A0A0] block">Tạm tính chuyến</span>
                        <span className="text-base font-bold font-mono-tabular text-[#F5F5F5]">
                          {(est ? est.totalAmount : vehicle.dailyPrice).toLocaleString('vi-VN')} đ
                        </span>
                        <span className="text-[11px] text-[#FFC799] font-mono-tabular block">
                          Cọc 30%: {(est ? est.depositAmount : Math.round(vehicle.dailyPrice * 0.3)).toLocaleString('vi-VN')} đ
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(vehicle._id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-[#FF8080]/20 text-[#A0A0A0] hover:text-[#FF8080] text-xs transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Schedule, Return Branch & Batch Checkout */}
            <div className="lg:col-span-5 bg-[#161616] border border-white/10 rounded-3xl p-6 space-y-5 sticky top-24">
              <h2 className="text-base font-bold text-[#F5F5F5] flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-[#FFC799]" />
                <span>Lịch trình &amp; Trạm trả xe chung</span>
              </h2>

              <div className="space-y-3">
                <DateTimePicker
                  label="Thời gian nhận xe"
                  mode="pickup"
                  dateValue={pickupDate}
                  timeValue={pickupTime}
                  onDateChange={(val) => {
                    setPickupDate(val);
                    const norm = normalizeReturnSchedule(val, pickupTime, returnDate, returnTime);
                    setReturnDate(norm.returnDate);
                    setReturnTime(norm.returnTime);
                  }}
                  onTimeChange={(val) => {
                    setPickupTime(val);
                    const norm = normalizeReturnSchedule(pickupDate, val, returnDate, returnTime);
                    setReturnDate(norm.returnDate);
                    setReturnTime(norm.returnTime);
                  }}
                />
                <DateTimePicker
                  label="Thời gian trả xe"
                  mode="return"
                  dateValue={returnDate}
                  timeValue={returnTime}
                  referenceDate={pickupDate}
                  referenceTime={pickupTime}
                  onDateChange={setReturnDate}
                  onTimeChange={setReturnTime}
                />
              </div>

              {/* Flexible Cross-Branch Return Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#A0A0A0] flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FFC799]" />
                  <span>Trạm trả xe (Có thể trả ở bất kỳ chi nhánh nào)</span>
                </label>
                <select
                  value={returnBranchId}
                  onChange={(e) => setReturnBranchId(e.target.value)}
                  className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                >
                  <option value="SAME_AS_PICKUP">Trả tại cùng chi nhánh nhận xe (Mặc định)</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      Trả xe tại: {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Voucher Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#A0A0A0] flex items-center space-x-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#FFC799]" />
                  <span>Mã khuyến mãi (Áp dụng cho các xe đủ điều kiện)</span>
                </label>
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã giảm giá (nếu có)..."
                  className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] placeholder-[#6E6E6E] uppercase focus:outline-none focus:border-[#FFC799]"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#A0A0A0] flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#FFC799]" />
                  <span>Phương thức đặt cọc</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentMethod === 'Cash'
                        ? 'bg-[#FFC799]/15 border-[#FFC799] text-[#F5F5F5] font-semibold'
                        : 'bg-[#101010] border-white/10 text-[#A0A0A0]'
                    }`}
                  >
                    <span className="block font-bold text-[#F5F5F5]">Thanh toán tại quầy</span>
                    <span className="text-[10px] text-[#A0A0A0]">Giữ chỗ 30 phút tại trạm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Banking')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentMethod === 'Banking'
                        ? 'bg-[#FFC799]/15 border-[#FFC799] text-[#F5F5F5] font-semibold'
                        : 'bg-[#101010] border-white/10 text-[#A0A0A0]'
                    }`}
                  >
                    <span className="block font-bold text-[#F5F5F5]">Cọc Online VNPay</span>
                    <span className="text-[10px] text-[#A0A0A0]">Thanh toán cọc 30%</span>
                  </button>
                </div>
              </div>

              {/* Price Summary */}
              <div className="p-4 rounded-2xl bg-[#101010] border border-white/10 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-[#A0A0A0]">
                  <span>Số lượng phương tiện</span>
                  <strong className="text-[#F5F5F5] font-mono-tabular">{cartItems.length} xe</strong>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-[#99FFE4]">
                    <span>Tổng giảm giá Voucher</span>
                    <strong className="font-mono-tabular">-{totals.discountAmount.toLocaleString('vi-VN')} đ</strong>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm font-bold text-[#F5F5F5] pt-2 border-t border-white/10">
                  <span>Tổng tiền thuê ({cartItems.length} xe)</span>
                  <span className="font-mono-tabular text-base">
                    {estimating ? '...' : `${totals.totalAmount.toLocaleString('vi-VN')} đ`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#FFC799]">
                  <span>Tổng tiền cọc 30% cần đặt</span>
                  <strong className="font-mono-tabular text-sm">
                    {estimating ? '...' : `${totals.depositAmount.toLocaleString('vi-VN')} đ`}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                disabled={submitting || estimating || totals.unavailableCount > 0}
                onClick={handleCheckoutAll}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#FFC799] hover:bg-[#FFD6B3] disabled:opacity-50 text-[#101010] font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang khởi tạo {cartItems.length} đơn thuê xe...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Xác nhận đặt cả {cartItems.length} xe ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

