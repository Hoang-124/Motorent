import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Trash2,
  MapPin,
  Calendar,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Tag,
  Compass,
  RefreshCw,
  User,
  Phone,
  Mail,
  FileText,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Branch, Vehicle, Discount } from '../types';
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

const STEPS = [
  { id: 1, title: 'Lịch trình & Trạm trả', subtitle: 'Chọn khung giờ & điểm trả xe' },
  { id: 2, title: 'Thông tin & eKYC', subtitle: 'Người đại diện nhận đoàn xe' },
  { id: 3, title: 'Ưu đãi & Báo giá', subtitle: 'Áp dụng Voucher giảm giá' },
  { id: 4, title: 'Thanh toán gộp', subtitle: 'VNPay Sandbox 1 lần cho cả giỏ' },
];

export const CartPage: React.FC = () => {
  const { cartItems, removeFromCart, clearCart } = useCart();
  const { isAuthenticated, user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
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

  // Step 1 state
  const [pickupDate, setPickupDate] = useState<string>(formatLocalDate(tomorrow));
  const [pickupTime, setPickupTime] = useState<string>('08:30');
  const [returnDate, setReturnDate] = useState<string>(formatLocalDate(dayAfter));
  const [returnTime, setReturnTime] = useState<string>('18:00');

  // Step 2 state: Customer Identity & eKYC
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [idCardNumber, setIdCardNumber] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');

  // Step 3 state: Voucher & Pricing
  const [discountCode, setDiscountCode] = useState<string>('');
  const [discountFeedback, setDiscountFeedback] = useState<string>('');

  // Step 4 state: Payment
  const [paymentMethod, setPaymentMethod] = useState<'Banking' | 'Cash'>('Banking');
  const [paymentType, setPaymentType] = useState<'Deposit30' | 'Full100'>('Deposit30');
  const [vnpayBankCode, setVnpayBankCode] = useState<'NCB' | '' | 'INTCARD'>('NCB');
  const [copiedField, setCopiedField] = useState<string>('');

  const [estimates, setEstimates] = useState<Record<string, VehicleEstimateItem>>({});
  const [estimating, setEstimating] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [redirectingVnPay, setRedirectingVnPay] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [createdOrders, setCreatedOrders] = useState<CreatedOrderSummary[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/branches').catch(() => null),
      api.get('/discounts?activeOnly=true').catch(() => null),
    ]).then(([branchRes, discRes]) => {
      const list = branchRes?.data?.data || branchRes?.data || [];
      if (Array.isArray(list)) {
        setBranches(list.filter((b: Branch) => b.isActive !== false));
      }
      if (Array.isArray(discRes?.data?.data)) {
        setAvailableDiscounts(discRes.data.data);
      }
    });
  }, []);

  // Autofill customer info from logged-in user
  useEffect(() => {
    if (user) {
      const fullName =
        [user.lastName, user.firstName].filter(Boolean).join(' ') || user.username || '';
      setCustomerName((prev) => prev || fullName);
      setCustomerPhone((prev) => prev || user.phoneNumber || '');
      setCustomerEmail((prev) => prev || user.email || '');
      setIdCardNumber((prev) => prev || user.idCardNumber || '');
    }
  }, [user]);

  const applyUserProfileToForm = () => {
    if (!user) return;
    const fullName =
      [user.lastName, user.firstName].filter(Boolean).join(' ') || user.username || '';
    setCustomerName(fullName);
    setCustomerPhone(user.phoneNumber || '');
    setCustomerEmail(user.email || '');
    setIdCardNumber(user.idCardNumber || '');
    setErrorMsg('');
  };

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
        const fallbackDaily = Number(v.dailyPrice || 150000);
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
          let conflictMsg: string | undefined;
          if (!d?.isAvailable && d?.conflictingBooking) {
            const cb = d.conflictingBooking;
            const pStr = new Date(cb.pickupDateTime).toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
            const rStr = new Date(cb.returnDateTime).toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
            conflictMsg = `Đã có khách đặt trước (${cb.bookingCode}: từ ${pStr} đến ${rStr})`;
          }
          return {
            vehicleId: v._id,
            isAvailable: Boolean(d?.isAvailable),
            totalAmount: Number(d?.totalAmount ?? fallbackDaily),
            depositAmount: Number(d?.depositAmount ?? Math.round(fallbackDaily * 0.3)),
            remainingAmount: Number(d?.remainingAmount ?? Math.round(fallbackDaily * 0.7)),
            discountAmount: Number(d?.discountAmount ?? 0),
            error: conflictMsg,
          } as VehicleEstimateItem;
        } catch (err: unknown) {
          const msg =
            axios.isAxiosError(err) && err.response?.data?.message
              ? err.response.data.message
              : 'Không thể báo giá cho khung giờ này';
          return {
            vehicleId: v._id,
            isAvailable: false,
            totalAmount: fallbackDaily,
            depositAmount: Math.round(fallbackDaily * 0.3),
            remainingAmount: Math.round(fallbackDaily * 0.7),
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
      const fallbackDaily = Number(v.dailyPrice || 150000);
      if (est) {
        totalAmount += Number(est.totalAmount || fallbackDaily);
        depositAmount += Number(est.depositAmount || Math.round(fallbackDaily * 0.3));
        remainingAmount += Number(est.remainingAmount || Math.round(fallbackDaily * 0.7));
        discountAmount += Number(est.discountAmount || 0);
        if (!est.isAvailable) unavailableCount++;
      } else {
        totalAmount += fallbackDaily;
        depositAmount += Math.round(fallbackDaily * 0.3);
        remainingAmount += Math.round(fallbackDaily * 0.7);
      }
    }

    return { totalAmount, depositAmount, remainingAmount, discountAmount, unavailableCount };
  }, [cartItems, estimates]);

  const handleCopyText = (text: string, field: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  // Validate steps just like BookingPage
  const handleNextStep = () => {
    setErrorMsg('');

    if (currentStep === 1) {
      const pDate = new Date(`${pickupDate}T${pickupTime}:00`);
      const rDate = new Date(`${returnDate}T${returnTime}:00`);
      if (pDate >= rDate) {
        setErrorMsg('Thời gian trả xe phải diễn ra sau thời gian nhận xe ít nhất 2 giờ.');
        return;
      }
      if (totals.unavailableCount > 0) {
        setErrorMsg(
          'Có xe trong giỏ đang bị trùng lịch hoặc ngoài giờ mở cửa trong khung giờ đã chọn. Vui lòng đổi khung giờ hoặc xóa xe bị trùng.'
        );
        return;
      }
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 2) {
      if (!isAuthenticated || !user) {
        navigate('/login?returnTo=/cart');
        return;
      }
      const cleanName = customerName.trim().replace(/\s+/g, ' ');
      const cleanPhone = customerPhone.replace(/[\s.-]/g, '');
      const cleanEmail = customerEmail.trim();
      const cleanIdCard = idCardNumber.replace(/\s+/g, '').toUpperCase();

      if (cleanName.split(' ').filter(Boolean).length < 2 || cleanName.length < 4) {
        setErrorMsg('Vui lòng nhập đầy đủ cả Họ và Tên người đại diện nhận xe (VD: Nguyễn Hoàng).');
        return;
      }
      if (!/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(cleanPhone)) {
        setErrorMsg('Số điện thoại không hợp lệ (Cần 10 chữ số — VD: 0905123456).');
        return;
      }
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanEmail)) {
        setErrorMsg('Địa chỉ Email nhận hợp đồng điện tử không hợp lệ.');
        return;
      }
      if (!/^([0-9]{12}|[0-9]{9}|[A-Z][0-9]{7,8})$/.test(cleanIdCard)) {
        setErrorMsg('Số CCCD phải gồm 12 chữ số (hoặc CMND 9 số / Hộ chiếu hợp lệ).');
        return;
      }

      // Sync to user profile if updated
      if (cleanPhone !== (user.phoneNumber || '') || cleanIdCard !== (user.idCardNumber || '')) {
        const parts = cleanName.split(' ');
        const firstNamePart = parts.length > 1 ? parts[parts.length - 1] : cleanName;
        const lastNamePart = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
        api
          .put('/auth/me', {
            firstName: user.firstName || firstNamePart,
            lastName: user.lastName || lastNamePart,
            phoneNumber: cleanPhone,
            idCardNumber: cleanIdCard,
          })
          .then((res) => {
            if (res.data?.success && res.data?.data) {
              updateUser(res.data.data);
            }
          })
          .catch(() => {});
      }

      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 3) {
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBatchVnPayRedirect = async (
    bookingIds: string[],
    selectedType: 'Deposit30' | 'Full100' = paymentType
  ) => {
    if (bookingIds.length === 0) return;
    setRedirectingVnPay(true);
    setErrorMsg('');
    try {
      const vnpRes = await api.post('/payments/vnpay/create', {
        bookingIds,
        paymentType: selectedType,
        bankCode: vnpayBankCode || undefined,
      });
      const paymentUrl = vnpRes.data?.data?.paymentUrl;
      if (paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }
      setErrorMsg('Không nhận được đường dẫn thanh toán VNPay Sandbox từ máy chủ.');
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Không thể khởi tạo giao dịch VNPay Sandbox gộp cho giỏ xe.';
      setErrorMsg(msg);
    } finally {
      setRedirectingVnPay(false);
    }
  };

  const handleCheckoutAll = async () => {
    if (!isAuthenticated || !user) {
      navigate('/login?returnTo=/cart');
      return;
    }

    if (cartItems.length === 0) return;

    if (totals.unavailableCount > 0) {
      setErrorMsg(
        'Có xe trong giỏ bị trùng lịch hoặc không khả dụng trong khung giờ đã chọn. Vui lòng xóa xe bị trùng hoặc đổi khung giờ.'
      );
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
      const allCreated = [...createdOrders, ...successList];
      setCreatedOrders(allCreated);

      // Immediately redirect to VNPay Sandbox to pay for ALL vehicles in 1 single transaction
      if (paymentMethod === 'Banking' && failedMessages.length === 0) {
        await handleBatchVnPayRedirect(
          allCreated.map((o) => o.bookingId),
          paymentType
        );
        return;
      }
    }

    if (failedMessages.length > 0) {
      setErrorMsg(failedMessages.join(' | '));
    }
  };

  if (createdOrders.length > 0 && cartItems.length === 0) {
    const combinedTotal = createdOrders.reduce((s, o) => s + o.totalAmount, 0);
    const combinedDeposit = createdOrders.reduce((s, o) => s + o.depositAmount, 0);

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
                Bạn có thể thanh toán gộp tất cả {createdOrders.length} xe trong 1 lần duy nhất qua cổng VNPay Sandbox bên dưới.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-[#FF8080]/10 border border-[#FF8080]/30 text-[#FF8080] text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Batch VNPay Sandbox Action Card */}
          <div className="p-5 rounded-2xl bg-[#101010] border border-[#FFC799]/35 space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFC799] block">
                Thanh toán gộp 1 lần cho tất cả {createdOrders.length} xe (VNPay Sandbox)
              </span>
              <p className="text-xs text-[#A0A0A0] mt-0.5">
                Tổng cọc 30%: <strong className="text-[#FFC799] font-mono-tabular">{combinedDeposit.toLocaleString('vi-VN')} đ</strong> · Tổng 100%: <strong className="text-[#F5F5F5] font-mono-tabular">{combinedTotal.toLocaleString('vi-VN')} đ</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={redirectingVnPay}
                onClick={() =>
                  handleBatchVnPayRedirect(
                    createdOrders.map((o) => o.bookingId),
                    'Deposit30'
                  )
                }
                className="py-3 px-4 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] disabled:opacity-50 text-[#101010] text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {redirectingVnPay
                    ? 'Đang chuyển tới VNPay Sandbox...'
                    : `Cọc 30% tất cả ${createdOrders.length} xe (${combinedDeposit.toLocaleString('vi-VN')} đ)`}
                </span>
              </button>

              <button
                type="button"
                disabled={redirectingVnPay}
                onClick={() =>
                  handleBatchVnPayRedirect(
                    createdOrders.map((o) => o.bookingId),
                    'Full100'
                  )
                }
                className="py-3 px-4 rounded-xl bg-[#99FFE4]/15 hover:bg-[#99FFE4]/25 border border-[#99FFE4]/40 disabled:opacity-50 text-[#99FFE4] text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {redirectingVnPay
                    ? 'Đang chuyển tới VNPay Sandbox...'
                    : `Thanh toán 100% tất cả ${createdOrders.length} xe (${combinedTotal.toLocaleString('vi-VN')} đ)`}
                </span>
              </button>
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
                  to={`/booking-details/${ord.bookingId}`}
                  className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#A0A0A0] hover:text-[#F5F5F5] text-xs font-semibold transition-colors shrink-0"
                >
                  <span>Xem hợp đồng</span>
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
              <span>Quy trình đặt nhiều xe theo đoàn (4 bước chuẩn)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] tracking-tight">
              Giỏ xe của bạn ({cartItems.length} xe)
            </h1>
            <p className="text-xs sm:text-sm text-[#A0A0A0] mt-1">
              Đặt nhiều xe cùng lúc và thanh toán gộp 1 lần duy nhất qua cổng VNPay Sandbox.
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

        {/* 4-Step Progress Bar (Identical to Single-Vehicle Booking Flow) */}
        {cartItems.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STEPS.map((step) => {
              const isActive = currentStep === step.id;
              const isDone = currentStep > step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (step.id < currentStep) setCurrentStep(step.id);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center space-x-3 ${
                    isActive
                      ? 'bg-[#FFC799]/12 border-[#FFC799] text-[#F5F5F5]'
                      : isDone
                      ? 'bg-[#99FFE4]/10 border-[#99FFE4]/40 text-[#99FFE4] cursor-pointer'
                      : 'bg-[#161616] border-white/10 text-[#6E6E6E]'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                      isActive
                        ? 'bg-[#FFC799] text-[#101010]'
                        : isDone
                        ? 'bg-[#99FFE4] text-[#101010]'
                        : 'bg-white/5 text-[#A0A0A0]'
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold block truncate">{step.title}</span>
                    <span className="text-[10px] text-[#A0A0A0] block truncate">{step.subtitle}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

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
              Hãy bấm nút &ldquo;+ Giỏ xe&rdquo; trên các mẫu xe tại danh mục đội xe để gom nhiều xe và thanh toán gộp cùng một lúc.
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
            {/* Left Column: Current Wizard Step Content */}
            <div className="lg:col-span-7 space-y-6">
              {/* STEP 1: SCHEDULE, RETURN LOCATION & VEHICLE LIST */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="bg-[#161616] border border-white/10 rounded-3xl p-6 space-y-5">
                    <h2 className="text-base font-bold text-[#F5F5F5] flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-[#FFC799]" />
                      <span>Bước 1: Chọn lịch trình &amp; Trạm trả xe chung cho cả đoàn</span>
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#A0A0A0] flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#FFC799]" />
                        <span>Trạm trả xe (Có thể trả ở bất kỳ chi nhánh nào trong hệ thống)</span>
                      </label>
                      <select
                        value={returnBranchId}
                        onChange={(e) => setReturnBranchId(e.target.value)}
                        className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                      >
                        <option value="SAME_AS_PICKUP">
                          Trả tại cùng chi nhánh nhận xe (Mặc định)
                        </option>
                        {branches.map((b) => (
                          <option key={b._id} value={b._id}>
                            Trả xe tại: {b.name} — {b.address}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Selected Vehicles List */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-[#A0A0A0] uppercase tracking-wider">
                      Danh sách xe trong giỏ ({cartItems.length} xe)
                    </h3>
                    {cartItems.map((vehicle) => {
                      const rawImg = vehicle.images?.[1] || vehicle.images?.[0] || '';
                      const imgUrl = rawImg ? getOptimizedVehicleImageUrl(rawImg, 320) : '';
                      const est = estimates[vehicle._id];
                      const fallbackPrice = Number(vehicle.dailyPrice || 150000);
                      const itemTotal = Number(est ? est.totalAmount : fallbackPrice);
                      const itemDeposit = Number(
                        est ? est.depositAmount : Math.round(fallbackPrice * 0.3)
                      );

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
                                <span className="truncate">
                                  Trạm nhận: {getVehicleBranchName(vehicle)}
                                </span>
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
                                {itemTotal.toLocaleString('vi-VN')} đ
                              </span>
                              <span className="text-[11px] text-[#FFC799] font-mono-tabular block">
                                Cọc 30%: {itemDeposit.toLocaleString('vi-VN')} đ
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
                </div>
              )}

              {/* STEP 2: CUSTOMER IDENTITY & EKYC */}
              {currentStep === 2 && (
                <div className="bg-[#161616] border border-white/10 rounded-3xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-[#F5F5F5] flex items-center space-x-2">
                        <User className="w-4 h-4 text-[#FFC799]" />
                        <span>Bước 2: Thông tin người đại diện nhận xe &amp; Hồ sơ eKYC</span>
                      </h2>
                      <p className="text-xs text-[#A0A0A0] mt-0.5">
                        Thông tin này sẽ được dùng để lập hợp đồng điện tử cho cả {cartItems.length} xe trong giỏ.
                      </p>
                    </div>
                    {user && (
                      <button
                        type="button"
                        onClick={applyUserProfileToForm}
                        className="px-3 py-1.5 rounded-xl bg-[#FFC799]/15 hover:bg-[#FFC799]/25 border border-[#FFC799]/30 text-[#FFC799] text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Điền nhanh từ Hồ sơ của tôi
                      </button>
                    )}
                  </div>

                  {/* eKYC Status Banner */}
                  {user && (
                    <div
                      className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                        user.identityStatus === 'Verified'
                          ? 'bg-[#99FFE4]/10 border-[#99FFE4]/30 text-[#99FFE4]'
                          : 'bg-[#FFC799]/10 border-[#FFC799]/30 text-[#FFC799]'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>
                          Trạng thái hồ sơ GPLX/CCCD (eKYC):{' '}
                          <strong>
                            {user.identityStatus === 'Verified'
                              ? 'Đã xác thực eKYC'
                              : user.identityStatus === 'Pending'
                              ? 'Đang chờ duyệt eKYC'
                              : 'Chưa xác thực (Sẽ đối chiếu trực tiếp tại quầy)'}
                          </strong>
                        </span>
                      </div>
                      {user.identityStatus !== 'Verified' && (
                        <Link
                          to="/profile?tab=ekyc"
                          className="underline font-bold hover:text-white ml-2 shrink-0"
                        >
                          Cập nhật eKYC
                        </Link>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#A0A0A0] flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-[#FFC799]" />
                        <span>Họ và tên người nhận xe *</span>
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="VD: Nguyễn Văn Hoàng"
                        className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#A0A0A0] flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#FFC799]" />
                        <span>Số điện thoại di động *</span>
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="VD: 0905123456"
                        className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#A0A0A0] flex items-center space-x-1.5">
                        <Mail className="w-3.5 h-3.5 text-[#FFC799]" />
                        <span>Email nhận hợp đồng &amp; biên lai *</span>
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="VD: ban@gmail.com"
                        className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#A0A0A0] flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#FFC799]" />
                        <span>Số CCCD (12 số) / Hộ chiếu *</span>
                      </label>
                      <input
                        type="text"
                        value={idCardNumber}
                        onChange={(e) => setIdCardNumber(e.target.value)}
                        placeholder="VD: 048204008692"
                        className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A0A0A0]">
                      Ghi chú thêm cho trạm giao xe (Tùy chọn)
                    </label>
                    <textarea
                      rows={2}
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="VD: Chuẩn bị giúp đoàn 4 mũ bảo hiểm 3/4 và áo mưa..."
                      className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: VOUCHERS & PER-VEHICLE BREAKDOWN */}
              {currentStep === 3 && (
                <div className="bg-[#161616] border border-white/10 rounded-3xl p-6 space-y-5">
                  <div>
                    <h2 className="text-base font-bold text-[#F5F5F5] flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-[#FFC799]" />
                      <span>Bước 3: Chọn mã ưu đãi Voucher &amp; Kiểm tra bảng giá</span>
                    </h2>
                    <p className="text-xs text-[#A0A0A0] mt-0.5">
                      Chọn nhanh mã giảm giá bên dưới hoặc nhập mã Voucher để giảm trực tiếp trên từng xe đủ điều kiện.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder="Nhập mã khuyến mãi (VD: HE2026)..."
                      className="flex-1 bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] uppercase focus:outline-none focus:border-[#FFC799]"
                    />
                    {discountCode && (
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountCode('');
                          setDiscountFeedback('Đã gỡ mã giảm giá.');
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#A0A0A0] cursor-pointer"
                      >
                        Bỏ mã
                      </button>
                    )}
                  </div>

                  {discountFeedback && (
                    <p className="text-xs text-[#99FFE4] font-medium">{discountFeedback}</p>
                  )}

                  {availableDiscounts.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {availableDiscounts.map((d) => {
                        const isSelected = discountCode === d.code;
                        return (
                          <button
                            key={d._id}
                            type="button"
                              onClick={() => {
                                const next = isSelected ? '' : d.code;
                                const benefitText =
                                  d.fixedDiscountAmount && d.fixedDiscountAmount > 0
                                    ? `Giảm ${d.fixedDiscountAmount.toLocaleString('vi-VN')}đ`
                                    : `Giảm ${d.discountPercent}%`;
                                setDiscountCode(next);
                                setDiscountFeedback(
                                  next
                                    ? `Đã chọn mã ưu đãi ${d.code} (${benefitText})`
                                    : 'Đã bỏ chọn mã ưu đãi.'
                                );
                              }}
                              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#FFC799]/15 border-[#FFC799] text-[#F5F5F5]'
                                  : 'bg-[#101010] border-white/10 hover:border-white/25 text-[#A0A0A0]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-[#FFC799]">
                                  {d.code}
                                </span>
                                <span className="text-[11px] font-bold text-[#99FFE4]">
                                  {d.fixedDiscountAmount && d.fixedDiscountAmount > 0
                                    ? `Giảm ${d.fixedDiscountAmount.toLocaleString('vi-VN')}đ`
                                    : `Giảm ${d.discountPercent}%`}
                                </span>
                              </div>
                            <p className="text-[11px] text-[#A0A0A0] mt-1">
                              {d.description ||
                                `Đơn tối thiểu ${(d.minBookingAmount || 0).toLocaleString('vi-VN')} đ`}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: PAYMENT METHOD & VNPAY SANDBOX TEST CARD */}
              {currentStep === 4 && (
                <div className="bg-[#161616] border border-white/10 rounded-3xl p-6 space-y-5">
                  <div>
                    <h2 className="text-base font-bold text-[#F5F5F5] flex items-center space-x-2">
                      <CreditCard className="w-4 h-4 text-[#FFC799]" />
                      <span>Bước 4: Thanh toán gộp 1 lần cho cả {cartItems.length} xe</span>
                    </h2>
                    <p className="text-xs text-[#A0A0A0] mt-0.5">
                      Hệ thống gom tổng tiền của toàn bộ {cartItems.length} xe vào 1 giao dịch VNPay Sandbox duy nhất.
                    </p>
                  </div>

                  {/* Scope Selection: Deposit 30% vs Full 100% */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentType('Deposit30')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        paymentType === 'Deposit30'
                          ? 'bg-[#FFC799]/15 border-[#FFC799] text-[#F5F5F5]'
                          : 'bg-[#101010] border-white/10 text-[#A0A0A0]'
                      }`}
                    >
                      <span className="text-xs font-bold text-[#FFC799] block">
                        Đặt cọc trước 30% cho cả {cartItems.length} xe
                      </span>
                      <span className="text-lg font-black font-mono-tabular text-[#F5F5F5] block mt-1">
                        {totals.depositAmount.toLocaleString('vi-VN')} đ
                      </span>
                      <span className="text-[11px] text-[#A0A0A0] block mt-0.5">
                        70% còn lại ({totals.remainingAmount.toLocaleString('vi-VN')} đ) tất toán khi nhận/trả xe
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentType('Full100')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        paymentType === 'Full100'
                          ? 'bg-[#99FFE4]/12 border-[#99FFE4] text-[#F5F5F5]'
                          : 'bg-[#101010] border-white/10 text-[#A0A0A0]'
                      }`}
                    >
                      <span className="text-xs font-bold text-[#99FFE4] block">
                        Thanh toán trọn gói 100% cho cả {cartItems.length} xe
                      </span>
                      <span className="text-lg font-black font-mono-tabular text-[#F5F5F5] block mt-1">
                        {totals.totalAmount.toLocaleString('vi-VN')} đ
                      </span>
                      <span className="text-[11px] text-[#A0A0A0] block mt-0.5">
                        Không cần thanh toán thêm tiền thuê xe tại quầy
                      </span>
                    </button>
                  </div>

                  {/* Gateway Channel Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Banking')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        paymentMethod === 'Banking'
                          ? 'bg-[#FFC799]/15 border-[#FFC799] text-[#F5F5F5]'
                          : 'bg-[#101010] border-white/10 text-[#A0A0A0]'
                      }`}
                    >
                      <span className="text-sm font-bold text-[#F5F5F5] block">
                        Cổng VNPay Sandbox (Khuyên dùng để Test)
                      </span>
                      <span className="text-[11px] text-[#99FFE4] block mt-0.5">
                        Thanh toán gộp 1 lần bằng Thẻ ATM nội địa NCB Sandbox
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Cash')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        paymentMethod === 'Cash'
                          ? 'bg-[#FFC799]/15 border-[#FFC799] text-[#F5F5F5]'
                          : 'bg-[#101010] border-white/10 text-[#A0A0A0]'
                      }`}
                    >
                      <span className="text-sm font-bold text-[#F5F5F5] block">
                        Giữ chỗ &amp; Thanh toán tại quầy
                      </span>
                      <span className="text-[11px] text-[#A0A0A0] block mt-0.5">
                        Giữ xe 30 phút để nhân viên xác nhận tại trạm
                      </span>
                    </button>
                  </div>

                  {/* VNPay Sandbox Bank & Test Card Helper (Same as BookingPage) */}
                  {paymentMethod === 'Banking' && (
                    <div className="p-4 rounded-2xl bg-[#101010] border border-[#FFC799]/30 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#FFC799]">
                          Thông tin Thẻ Test VNPay Sandbox chuẩn (Dùng để test thanh toán ngay)
                        </span>
                        <div className="flex items-center space-x-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setVnpayBankCode('NCB')}
                            className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                              vnpayBankCode === 'NCB'
                                ? 'bg-[#FFC799] text-[#101010] border-[#FFC799] font-bold'
                                : 'bg-white/5 text-[#A0A0A0] border-white/10'
                            }`}
                          >
                            Chuyển thẳng Ngân hàng NCB
                          </button>
                          <button
                            type="button"
                            onClick={() => setVnpayBankCode('')}
                            className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                              vnpayBankCode === ''
                                ? 'bg-[#FFC799] text-[#101010] border-[#FFC799] font-bold'
                                : 'bg-white/5 text-[#A0A0A0] border-white/10'
                            }`}
                          >
                            Tự chọn trên VNPay
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-[#A0A0A0] block">Số thẻ NCB Test</span>
                            <strong className="font-mono text-[#99FFE4]">9704198526191432198</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText('9704198526191432198', 'card')}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold cursor-pointer inline-flex items-center space-x-1"
                          >
                            {copiedField === 'card' ? (
                              <>
                                <Check className="w-3 h-3 text-[#99FFE4]" />
                                <span>Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-[#A0A0A0] block">Tên chủ thẻ</span>
                            <strong className="font-mono text-[#F5F5F5]">NGUYEN VAN A</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText('NGUYEN VAN A', 'holder')}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold cursor-pointer inline-flex items-center space-x-1"
                          >
                            {copiedField === 'holder' ? (
                              <>
                                <Check className="w-3 h-3 text-[#99FFE4]" />
                                <span>Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-[#A0A0A0] block">Ngày phát hành</span>
                            <strong className="font-mono text-[#F5F5F5]">07/15</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText('07/15', 'date')}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold cursor-pointer inline-flex items-center space-x-1"
                          >
                            {copiedField === 'date' ? (
                              <>
                                <Check className="w-3 h-3 text-[#99FFE4]" />
                                <span>Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-[#A0A0A0] block">Mật khẩu OTP</span>
                            <strong className="font-mono text-[#FFC799]">123456</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText('123456', 'otp')}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold cursor-pointer inline-flex items-center space-x-1"
                          >
                            {copiedField === 'otp' ? (
                              <>
                                <Check className="w-3 h-3 text-[#99FFE4]" />
                                <span>Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step Navigation Buttons */}
              <div className="flex items-center justify-between pt-2">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#161616] border border-white/10 hover:border-white/25 text-xs font-semibold text-[#F5F5F5] cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại bước {currentStep - 1}</span>
                  </button>
                ) : (
                  <Link
                    to="/bikes"
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#161616] border border-white/10 hover:border-white/25 text-xs font-semibold text-[#A0A0A0] hover:text-[#F5F5F5]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Chọn thêm xe khác</span>
                  </Link>
                )}

                {currentStep < 4 && (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={estimating || totals.unavailableCount > 0}
                    className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] disabled:opacity-50 text-[#101010] text-xs font-bold transition-all cursor-pointer"
                  >
                    <span>Tiếp tục sang Bước {currentStep + 1}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Persistent Order & Payment Summary */}
            <div className="lg:col-span-5 bg-[#161616] border border-white/10 rounded-3xl p-6 space-y-5 sticky top-24">
              <h2 className="text-base font-bold text-[#F5F5F5] flex items-center justify-between">
                <span>Tóm tắt đoàn xe ({cartItems.length} xe)</span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#FFC799]/15 text-[#FFC799]">
                  Bước {currentStep}/4
                </span>
              </h2>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {cartItems.map((v) => {
                  const est = estimates[v._id];
                  const price = Number(est ? est.totalAmount : v.dailyPrice || 150000);
                  return (
                    <div
                      key={v._id}
                      className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#101010] border border-white/5"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-[#F5F5F5] block truncate">
                          {v.brand} {v.vehicleModel}
                        </span>
                        <span className="text-[10px] font-mono text-[#A0A0A0]">
                          {v.licensePlate} · {getVehicleBranchName(v)}
                        </span>
                      </div>
                      <span className="font-mono-tabular font-bold text-[#FFC799] shrink-0">
                        {price.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-2xl bg-[#101010] border border-white/10 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-[#A0A0A0]">
                  <span>Nhận xe</span>
                  <strong className="text-[#F5F5F5] font-mono">
                    {pickupTime} · {pickupDate.split('-').reverse().join('/')}
                  </strong>
                </div>
                <div className="flex items-center justify-between text-[#A0A0A0]">
                  <span>Trả xe</span>
                  <strong className="text-[#F5F5F5] font-mono">
                    {returnTime} · {returnDate.split('-').reverse().join('/')}
                  </strong>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-[#99FFE4]">
                    <span>Tổng giảm giá Voucher ({discountCode})</span>
                    <strong className="font-mono-tabular">
                      -{totals.discountAmount.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm font-bold text-[#F5F5F5] pt-2 border-t border-white/10">
                  <span>Tổng tiền thuê ({cartItems.length} xe)</span>
                  <span className="font-mono-tabular text-base">
                    {estimating ? '...' : `${totals.totalAmount.toLocaleString('vi-VN')} đ`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#FFC799]">
                  <span>
                    {paymentMethod === 'Banking' && paymentType === 'Full100'
                      ? 'Thanh toán gộp 100% qua VNPay'
                      : 'Tổng cọc 30% cần thanh toán'}
                  </span>
                  <strong className="font-mono-tabular text-sm">
                    {estimating
                      ? '...'
                      : `${(paymentMethod === 'Banking' && paymentType === 'Full100'
                          ? totals.totalAmount
                          : totals.depositAmount
                        ).toLocaleString('vi-VN')} đ`}
                  </strong>
                </div>
              </div>

              {currentStep < 4 ? (
                <button
                  type="button"
                  disabled={estimating || totals.unavailableCount > 0}
                  onClick={handleNextStep}
                  className="w-full py-3.5 px-5 rounded-2xl bg-[#FFC799] hover:bg-[#FFD6B3] disabled:opacity-50 text-[#101010] font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg"
                >
                  <span>Tiếp tục: {STEPS[currentStep]?.title}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={
                    submitting ||
                    redirectingVnPay ||
                    estimating ||
                    totals.unavailableCount > 0
                  }
                  onClick={handleCheckoutAll}
                  className="w-full py-3.5 px-5 rounded-2xl bg-[#FFC799] hover:bg-[#FFD6B3] disabled:opacity-50 text-[#101010] font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg"
                >
                  {submitting || redirectingVnPay ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>
                        {redirectingVnPay
                          ? 'Đang chuyển sang cổng VNPay Sandbox...'
                          : `Đang khởi tạo ${cartItems.length} đơn thuê xe...`}
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {paymentMethod === 'Banking'
                          ? `Thanh toán gộp cả ${cartItems.length} xe qua VNPay (${(paymentType === 'Full100'
                              ? totals.totalAmount
                              : totals.depositAmount
                            ).toLocaleString('vi-VN')} đ)`
                          : `Xác nhận giữ chỗ cả ${cartItems.length} xe tại quầy`}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
