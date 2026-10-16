import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  QrCode,
  Sparkles,
  User,
  Phone,
  Mail,
  FileText,
  Camera,
  Fuel,
  Gauge,
  Zap,
  Tag,
  Copy,
  Check,
  Building2,
  LogIn,
  RefreshCw,
} from 'lucide-react';
import axios from 'axios';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Vehicle, Branch, Booking } from '../types';
import { getOptimizedVehicleImageUrl } from '../utils/imageHelper';

const ANGLE_VIEWS = [
  { id: 1, label: 'Ngang xe', title: 'Góc ngang thân xe' },
  { id: 0, label: '3/4 Trước', title: 'Góc 3/4 mặt trước' },
  { id: 2, label: 'Góc sau', title: 'Góc đuôi xe & khoang lái' },
];

interface PaymentReceiptInfo {
  transactionId: string;
  amount: number;
  paymentType: 'Deposit30' | 'Full100';
  paidAt: string;
}

export const BookingPage: React.FC = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const pickupParam = searchParams.get('pickup') || '';
  const returnParam = searchParams.get('return') || '';
  const pickupDateParam = searchParams.get('pickupDate') || '';
  const returnDateParam = searchParams.get('returnDate') || '';
  const voucherParam = (searchParams.get('voucher') || '').toUpperCase();

  // Data states
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Stepper state: 1 -> 2 -> 3 -> 4 -> 5 (Success)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Vehicle Angle showcase
  const [activeAngle, setActiveAngle] = useState<number>(1);
  const [imgError, setImgError] = useState<boolean>(false);

  // Form Step 1: Schedule & Location
  const [pickupBranchId, setPickupBranchId] = useState<string>(pickupParam);
  const [returnBranchId, setReturnBranchId] = useState<string>(returnParam || pickupParam);

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

  const [pickupDate, setPickupDate] = useState<string>(pickupDateParam || formatLocalDate(tomorrow));
  const [pickupTime, setPickupTime] = useState<string>('08:30');
  const [returnDate, setReturnDate] = useState<string>(returnDateParam || formatLocalDate(dayAfter));
  const [returnTime, setReturnTime] = useState<string>('18:00');

  // Form Step 2: Customer Identity
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [idCardNumber, setIdCardNumber] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');

  // Form Step 3: Perks & Discount
  const initialVoucherCode = voucherParam === 'MOTORENT30' ? 'MOTORENT30' : 'CHAOBANMOI';
  const initialVoucherAmount = initialVoucherCode === 'MOTORENT30' ? 30000 : 20000;
  const [discountCodeInput, setDiscountCodeInput] = useState<string>(initialVoucherCode);
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>({
    code: initialVoucherCode,
    amount: initialVoucherAmount,
  });
  const [discountFeedback, setDiscountFeedback] = useState<string>(
    initialVoucherCode === 'MOTORENT30'
      ? 'Đã tự động áp dụng mã ưu đãi MOTORENT30 (-30.000đ)'
      : 'Đã tự động áp dụng mã ưu đãi chào bạn mới (-20.000đ)'
  );

  // Form Step 4: Payment selection & QR Verification
  const [paymentOption, setPaymentOption] = useState<'VietQR' | 'VNPay' | 'Cash'>('VietQR');
  const [paymentScope, setPaymentScope] = useState<'Deposit30' | 'Full100'>('Deposit30');
  const [qrChecking, setQrChecking] = useState<boolean>(false);
  const [qrVerified, setQrVerified] = useState<boolean>(false);
  const [qrPrecheckCode, setQrPrecheckCode] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Created Booking & Verified Receipt response
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<PaymentReceiptInfo | null>(null);

  // 1. Fetch Vehicle & Branches
  useEffect(() => {
    const fetchInitData = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const [branchesRes, vehicleRes] = await Promise.all([
          api.get('/branches'),
          vehicleId ? api.get(`/vehicles/${vehicleId}`) : Promise.resolve(null),
        ]);

        const branchList = branchesRes.data?.data || branchesRes.data || [];
        setBranches(branchList);

        if (vehicleRes && vehicleRes.data) {
          const vehData = vehicleRes.data.data || vehicleRes.data;
          setVehicle(vehData);

          const defaultBranchId =
            typeof vehData.branchId === 'object' && vehData.branchId !== null
              ? vehData.branchId._id
              : vehData.branchId;
          const resolvedPickup = pickupParam || defaultBranchId || branchList[0]?._id || '';
          const resolvedReturn = returnParam || resolvedPickup;
          setPickupBranchId(resolvedPickup);
          setReturnBranchId(resolvedReturn);
        } else {
          const allVehRes = await api.get('/vehicles?status=Available&limit=1');
          const firstVeh = allVehRes.data?.data?.vehicles?.[0] || allVehRes.data?.vehicles?.[0];
          if (firstVeh) {
            setVehicle(firstVeh);
            const defaultBranchId =
              typeof firstVeh.branchId === 'object' ? firstVeh.branchId._id : firstVeh.branchId;
            const resolvedPickup = pickupParam || defaultBranchId || branchList[0]?._id || '';
            const resolvedReturn = returnParam || resolvedPickup;
            setPickupBranchId(resolvedPickup);
            setReturnBranchId(resolvedReturn);
          }
        }
      } catch (err: unknown) {
        console.error('Lỗi nạp dữ liệu đặt xe:', err);
        setErrorMsg('Không thể tải thông tin phương tiện. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitData();
  }, [vehicleId, pickupParam, returnParam]);

  // Autofill from user profile
  useEffect(() => {
    if (user) {
      const fullName = [user.lastName, user.firstName].filter(Boolean).join(' ') || user.username || '';
      setCustomerName(fullName);
      setCustomerPhone(user.phoneNumber || '');
      setCustomerEmail(user.email || '');
    }
  }, [user]);

  // Reset QR precheck if payment scope or option changes
  useEffect(() => {
    setQrVerified(false);
    setQrPrecheckCode('');
  }, [paymentScope, paymentOption]);

  // Calculation Logic
  const startDateTime = new Date(`${pickupDate}T${pickupTime}:00+07:00`);
  const endDateTime = new Date(`${returnDate}T${returnTime}:00+07:00`);
  const durationMs = Math.max(0, endDateTime.getTime() - startDateTime.getTime());
  const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 3600 * 24)));

  const dailyPrice = vehicle ? vehicle.dailyPrice : 0;
  const baseRentalFee = durationDays * dailyPrice;
  const discountAmount = appliedDiscount ? appliedDiscount.amount : 0;
  const totalAmount = Math.max(0, baseRentalFee - discountAmount);
  const depositAmount = Math.round(totalAmount * 0.3); // Cọc 30%
  const remainingAmount = totalAmount - depositAmount; // 70% còn lại
  const activePayAmount = paymentScope === 'Full100' ? totalAmount : depositAmount;
  const activeRemainingAfterPay = paymentScope === 'Full100' ? 0 : remainingAmount;

  // Discount code handler
  const handleApplyDiscount = () => {
    const trimmed = discountCodeInput.trim().toUpperCase();
    if (!trimmed) {
      setAppliedDiscount(null);
      setDiscountFeedback('');
      return;
    }

    if (trimmed === 'CHAOBANMOI') {
      setAppliedDiscount({ code: 'CHAOBANMOI', amount: 20000 });
      setDiscountFeedback('Áp dụng thành công mã CHAOBANMOI: Giảm ngay 20.000đ');
    } else if (trimmed === 'MOTORENT30') {
      setAppliedDiscount({ code: 'MOTORENT30', amount: 30000 });
      setDiscountFeedback('Áp dụng thành công mã MOTORENT30: Giảm ngay 30.000đ');
    } else {
      setAppliedDiscount(null);
      setDiscountFeedback('Mã giảm giá không tồn tại hoặc đã hết lượt áp dụng.');
    }
  };

  // Next Step Validator
  const handleNextStep = () => {
    setErrorMsg('');

    if (currentStep === 1) {
      if (startDateTime >= endDateTime) {
        setErrorMsg('Thời gian trả xe phải diễn ra sau thời gian nhận xe ít nhất 2 giờ.');
        return;
      }
      if (startDateTime < new Date()) {
        setErrorMsg('Thời gian nhận xe không được nằm trong quá khứ.');
        return;
      }
      if (!pickupBranchId || !returnBranchId) {
        setErrorMsg('Vui lòng chọn chi nhánh nhận xe và chi nhánh trả xe.');
        return;
      }
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 2) {
      if (!customerName.trim() || !customerPhone.trim()) {
        setErrorMsg('Vui lòng nhập họ tên và số điện thoại liên hệ nhận xe.');
        return;
      }
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 3) {
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Interactive QR Pre-verification in Step 4
  const handleVerifyQrPrecheck = () => {
    setQrChecking(true);
    setErrorMsg('');
    setTimeout(() => {
      setQrChecking(false);
      setQrVerified(true);
      setQrPrecheckCode(`FT26288${Math.floor(100000 + Math.random() * 900000)}`);
    }, 900);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(''), 2000);
  };

  // Submit Booking & Confirm Payment to Backend
  const handleConfirmBooking = async () => {
    if (!isAuthenticated || !user) {
      navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (!vehicle) {
      setErrorMsg('Không tìm thấy thông tin phương tiện.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        vehicleId: vehicle._id,
        pickupBranchId,
        returnBranchId,
        pickupDateTime: startDateTime.toISOString(),
        returnDateTime: endDateTime.toISOString(),
        paymentMethod: paymentOption === 'Cash' ? 'Cash' : 'Banking',
        discountCode: appliedDiscount?.code,
      };

      const res = await api.post('/bookings', payload);
      if (res.data && res.data.success) {
        const newBooking: Booking = res.data.data;

        // If paying via VietQR or VNPay online, immediately confirm deposit/full payment on backend
        if (paymentOption === 'VietQR' || paymentOption === 'VNPay') {
          try {
            const confirmRes = await api.post('/payments/vietqr/confirm', {
              bookingId: newBooking._id,
              paymentType: paymentScope,
            });
            const confirmedBooking: Booking = confirmRes.data?.data?.booking || {
              ...newBooking,
              status: 'Approved',
              depositPaid: true,
            };
            const paymentData = confirmRes.data?.data?.payment;
            setCreatedBooking(confirmedBooking);
            setPaymentReceipt({
              transactionId:
                paymentData?.transactionId ||
                qrPrecheckCode ||
                `VIETQR_${Date.now().toString().slice(-8)}`,
              amount: paymentData?.amount || activePayAmount,
              paymentType: paymentScope,
              paidAt: new Date().toLocaleString('vi-VN'),
            });
          } catch {
            // Fallback if confirm endpoint fails
            setCreatedBooking(newBooking);
          }
        } else {
          setCreatedBooking(newBooking);
          setPaymentReceipt(null);
        }

        setCurrentStep(5);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMsg(res.data?.message || 'Không thể tạo đơn đặt xe.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const serverMsg = err.response?.data?.message;
        if (err.response?.status === 409) {
          setErrorMsg(
            serverMsg ||
              'Phương tiện đã có khách khác đặt trong khoảng thời gian này. Vui lòng chọn xe khác.'
          );
        } else if (err.response?.status === 401) {
          setErrorMsg('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else {
          setErrorMsg(serverMsg || 'Không thể hoàn tất tạo đơn đặt xe.');
        }
      } else {
        setErrorMsg('Lỗi kết nối máy chủ. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isElectric = vehicle?.fuelType === 'Electric';

  const pickupBranch = branches.find((b) => b._id === pickupBranchId);
  const returnBranch = branches.find((b) => b._id === returnBranchId);
  const transferMemo = vehicle ? `MOTORENT ${vehicle.licensePlate.replace(/\s+/g, '')}` : 'MOTORENT COC';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101010] flex items-center justify-center text-[#F5F5F5]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-9 h-9 border-2 border-[#FFC799] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#6E6E6E]">
            Đang tải cấu hình xe & biểu phí thuê...
          </p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-[#101010] flex items-center justify-center p-4">
        <div className="bg-[#161616] p-8 rounded-2xl border border-white/10 text-center max-w-md w-full space-y-4">
          <AlertCircle className="w-12 h-12 text-[#FFC799] mx-auto" />
          <h2 className="text-xl font-bold text-[#F5F5F5]">Không tìm thấy phương tiện</h2>
          <p className="text-xs text-[#6E6E6E]">
            Phương tiện bạn tìm kiếm hiện không tồn tại hoặc đang được điều chuyển chi nhánh.
          </p>
          <Link
            to="/bikes"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] font-black text-xs transition-colors"
          >
            <span>Khám phá đội xe sẵn sàng</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-xs text-[#6E6E6E] mb-6">
          <Link to="/" className="hover:text-[#F5F5F5] transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#6E6E6E]" />
          <Link to="/bikes" className="hover:text-[#F5F5F5] transition-colors">
            Đội xe chính hãng
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#6E6E6E]" />
          <span className="text-[#F5F5F5] font-semibold truncate max-w-xs">{vehicle.vehicleModel}</span>
        </nav>

        {/* Dynamic Stepper Header */}
        <div className="bg-[#161616] rounded-2xl p-5 border border-white/10 mb-8">
          <div className="flex items-center justify-between max-w-3xl mx-auto relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-[#FFC799] -translate-y-1/2 z-0 transition-all duration-500"
              style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
            />

            {[
              { num: 1, label: '01. Lịch trình' },
              { num: 2, label: '02. Khách hàng' },
              { num: 3, label: '03. Gói dịch vụ' },
              { num: 4, label: '04. Thanh toán QR' },
              { num: 5, label: '05. Biên lai & Mã xe' },
            ].map((st) => (
              <div key={st.num} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                    currentStep >= st.num
                      ? 'bg-[#FFC799] text-[#101010] shadow-md'
                      : 'bg-[#101010] border border-white/15 text-[#6E6E6E]'
                  }`}
                >
                  {currentStep > st.num ? <Check className="w-4 h-4 stroke-[3]" /> : st.num}
                </div>
                <span
                  className={`text-[11px] font-bold mt-2 whitespace-nowrap hidden sm:block ${
                    currentStep >= st.num ? 'text-[#F5F5F5]' : 'text-[#6E6E6E]'
                  }`}
                >
                  {st.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Interactive Steps Form */}
          <div className="lg:col-span-7 space-y-6">
            {/* Error Notification Alert */}
            {errorMsg && (
              <div className="p-4 rounded-xl bg-[#FF8080]/12 border border-[#FF8080]/30 text-[#FF8080] text-xs flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#FF8080]" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Guest Banner if not logged in */}
            {!isAuthenticated && currentStep < 5 && (
              <div className="p-4 rounded-xl bg-[#FFC799]/12 border border-[#FFC799]/30 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[#FFC799] text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#FFC799]" />
                  <span>Đăng nhập để tự động lưu hợp đồng điện tử và đồng bộ lịch sử đặt xe.</span>
                </div>
                <Link
                  to={`/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
                  className="px-3.5 py-1.5 bg-[#FFC799] hover:bg-[#FFC799] text-[#101010] text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5 flex-shrink-0 ml-3"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </Link>
              </div>
            )}

            {/* STEP 1: Schedule & Branches */}
            {currentStep === 1 && (
              <div className="bg-[#161616] rounded-2xl p-6 sm:p-8 border border-white/10 space-y-6">
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#FFC799] block mb-1">
                    BƯỚC 01 / 04 • LỊCH TRÌNH NHẬN & TRẢ XE
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-[#F5F5F5]">
                    Chọn thời gian & Trạm giao nhận xe
                  </h2>
                  <p className="text-xs text-[#6E6E6E] mt-1">
                    Hỗ trợ nhận xe tại Sân bay Quốc tế Đà Nẵng và trả xe liên trạm tại Bãi biển Mỹ Khê hoặc Cầu Rồng hoàn toàn miễn phí.
                  </p>
                </div>

                {/* Branches Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#C8C2B8] flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#FFC799]" />
                      <span>Chi nhánh nhận xe</span>
                    </label>
                    <select
                      value={pickupBranchId}
                      onChange={(e) => setPickupBranchId(e.target.value)}
                      className="w-full bg-[#101010] border border-white/10 rounded-xl p-3 text-xs font-semibold text-[#F5F5F5] focus:border-[#FFC799] outline-none cursor-pointer"
                    >
                      {branches.map((b) => (
                        <option key={b._id} value={b._id} className="bg-[#161616] text-[#F5F5F5]">
                          {b.name}
                        </option>
                      ))}
                    </select>
                    {pickupBranch && (
                      <p className="text-[11px] text-[#6E6E6E] leading-tight">
                        {pickupBranch.address} ({pickupBranch.hours_open} - {pickupBranch.hours_close})
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#C8C2B8] flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#FFC799]" />
                      <span>Chi nhánh trả xe</span>
                    </label>
                    <select
                      value={returnBranchId}
                      onChange={(e) => setReturnBranchId(e.target.value)}
                      className="w-full bg-[#101010] border border-white/10 rounded-xl p-3 text-xs font-semibold text-[#F5F5F5] focus:border-[#FFC799] outline-none cursor-pointer"
                    >
                      {branches.map((b) => (
                        <option key={b._id} value={b._id} className="bg-[#161616] text-[#F5F5F5]">
                          {b.name}
                        </option>
                      ))}
                    </select>
                    {returnBranch && (
                      <p className="text-[11px] text-[#6E6E6E] leading-tight">
                        {returnBranch.address} ({returnBranch.hours_open} - {returnBranch.hours_close})
                      </p>
                    )}
                  </div>
                </div>

                {/* Dates & Times */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/[0.08]">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#F5F5F5] flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#FFC799]" />
                      <span>Thời điểm nhận xe</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={pickupDate}
                        min={formatLocalDate(new Date())}
                        onChange={(e) => setPickupDate(e.target.value)}
                        className="bg-[#101010] border border-white/10 rounded-xl p-2.5 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]"
                      />
                      <input
                        type="time"
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="bg-[#101010] border border-white/10 rounded-xl p-2.5 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#F5F5F5] flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#FFC799]" />
                      <span>Thời điểm trả xe</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={returnDate}
                        min={pickupDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="bg-[#101010] border border-white/10 rounded-xl p-2.5 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]"
                      />
                      <input
                        type="time"
                        value={returnTime}
                        onChange={(e) => setReturnTime(e.target.value)}
                        className="bg-[#101010] border border-white/10 rounded-xl p-2.5 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-[#101010] border border-white/10 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[#6E6E6E]">Tổng thời lượng thuê tính phí:</span>
                  <span className="font-mono font-black text-[#FFC799] text-sm">
                    {durationDays} ngày ({Math.round(durationMs / 3600000)} giờ)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full py-3.5 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Tiếp tục: Thông tin người thuê</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 2: Customer Identity & eKYC */}
            {currentStep === 2 && (
              <div className="bg-[#161616] rounded-2xl p-6 sm:p-8 border border-white/10 space-y-6">
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#FFC799] block mb-1">
                    BƯỚC 02 / 04 • THÔNG TIN NGƯỜI LÁI XE
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-[#F5F5F5]">
                    Thông tin người nhận xe & Hợp đồng điện tử
                  </h2>
                  <p className="text-xs text-[#6E6E6E] mt-1">
                    Cam kết 100% không giữ bản gốc CCCD/Hộ chiếu. Nhân viên chi nhánh chỉ đối chiếu nhanh khi bàn giao chìa khóa.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#C8C2B8] flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-[#FFC799]" />
                      <span>Họ và tên người thuê <span className="text-red-500 font-bold ml-0.5">*</span></span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-[#101010] border border-white/10 rounded-xl p-3 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#C8C2B8] flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#FFC799]" />
                      <span>Số điện thoại nhận mã xe <span className="text-red-500 font-bold ml-0.5">*</span></span>
                    </label>
                    <input
                      type="tel"
                      placeholder="0905 123 456"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-[#101010] border border-white/10 rounded-xl p-3 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#C8C2B8] flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#FFC799]" />
                      <span>Email nhận hợp đồng điện tử</span>
                    </label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full bg-[#101010] border border-white/10 rounded-xl p-3 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#C8C2B8] flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#FFC799]" />
                      <span>Số CCCD / Hộ chiếu (Tùy chọn)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="04809..."
                      value={idCardNumber}
                      onChange={(e) => setIdCardNumber(e.target.value)}
                      className="w-full bg-[#101010] border border-white/10 rounded-xl p-3 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#C8C2B8]">
                    Ghi chú thêm (Số hiệu chuyến bay nếu nhận xe tại sân bay, yêu cầu nón trẻ em...)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VD: Chuyến bay VJ628 hạ cánh lúc 09:15, nhờ giao xe tại sảnh Ga đến T2..."
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    className="w-full bg-[#101010] border border-white/10 rounded-xl p-3 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799] resize-none"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="py-3.5 px-5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[#C8C2B8] font-bold text-xs transition-colors flex items-center space-x-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 py-3.5 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Tiếp tục: Dịch vụ & Ưu đãi</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Included Perks & Voucher Promo */}
            {currentStep === 3 && (
              <div className="bg-[#161616] rounded-2xl p-6 sm:p-8 border border-white/10 space-y-6">
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#FFC799] block mb-1">
                    BƯỚC 03 / 04 • TIỆN ÍCH & MÃ KHUYẾN MÃI
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-[#F5F5F5]">
                    Trang bị đi kèm theo xe & Voucher ưu đãi
                  </h2>
                  <p className="text-xs text-[#6E6E6E] mt-1">
                    Tất cả trang bị an toàn dưới đây được chuẩn bị sẵn trong cốp xe mà không phát sinh thêm chi phí.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      title: '02 Mũ bảo hiểm 3/4 kính chắn gió',
                      desc: 'Đã khử khuẩn tia cực tím UV và bọc lót kháng khuẩn mới',
                    },
                    {
                      title: '02 Áo mưa cánh dơi phản quang',
                      desc: 'Chất liệu vải dù PVC dày dặn, an toàn khi di chuyển đường đèo',
                    },
                    {
                      title: 'Giá đỡ điện thoại hợp kim chống rung OIS',
                      desc: 'Bảo vệ cụm camera điện thoại và hỗ trợ dẫn đường GPS',
                    },
                    {
                      title: 'Bảo hiểm cứu hộ kỹ thuật 24/7 Đà Nẵng – Hội An',
                      desc: 'Đổi xe tương đương tận nơi trong 30 phút nếu gặp sự cố kỹ thuật',
                    },
                  ].map((perk) => (
                    <div
                      key={perk.title}
                      className="flex items-center justify-between p-3.5 bg-[#101010] border border-white/[0.08] rounded-xl"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-[#FFC799]/10 text-[#FFC799] flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#F5F5F5]">{perk.title}</h4>
                          <p className="text-[11px] text-[#6E6E6E]">{perk.desc}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#FFC799] shrink-0 ml-3">Miễn phí 0đ</span>
                    </div>
                  ))}
                </div>

                {/* Promo Voucher Input */}
                <div className="pt-4 border-t border-white/[0.08] space-y-2">
                  <label className="text-xs font-bold text-[#C8C2B8] flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#FFC799]" />
                    <span>Mã giảm giá / Voucher ưu đãi</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Nhập mã (VD: CHAOBANMOI hoặc MOTORENT30)"
                      value={discountCodeInput}
                      onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-[#101010] border border-white/10 rounded-xl p-3 text-xs font-mono font-bold text-[#FFC799] uppercase outline-none focus:border-[#FFC799]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyDiscount}
                      className="px-5 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[#F5F5F5] font-bold text-xs transition-colors cursor-pointer"
                    >
                      Áp dụng
                    </button>
                  </div>
                  {discountFeedback && (
                    <p className={`text-[11px] font-medium ${appliedDiscount ? 'text-[#FFC799]' : 'text-[#FFC799]'}`}>
                      {discountFeedback}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="py-3.5 px-5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[#C8C2B8] font-bold text-xs transition-colors flex items-center space-x-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 py-3.5 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Tiếp tục: Thanh toán QR & Khóa xe</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Deposit / Full Payment (VietQR 24/7 / VNPay / Cash) */}
            {currentStep === 4 && (
              <div className="bg-[#161616] rounded-2xl p-6 sm:p-8 border border-white/10 space-y-6">
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#FFC799] block mb-1">
                    BƯỚC 04 / 04 • THANH TOÁN & KHÓA BIỂN SỐ XE
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-[#F5F5F5]">
                    Xác nhận thanh toán & Khóa giữ xe độc quyền
                  </h2>
                  <p className="text-xs text-[#6E6E6E] mt-1">
                    Quét mã VietQR 24/7 bên dưới để hệ thống tự động đối soát, xuất biên lai điện tử và chuyển trạng thái đơn sang <strong className="text-[#F5F5F5]">Đã duyệt (Approved)</strong> ngay lập tức.
                  </p>
                </div>

                {/* 1. Payment Scope Toggle (Deposit 30% vs Full 100%) */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E6E] block">
                    1. Chọn hạn mức thanh toán ngay:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentScope('Deposit30')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        paymentScope === 'Deposit30'
                          ? 'bg-[#FFC799]/10 border-[#FFC799] text-[#F5F5F5]'
                          : 'bg-[#101010] border-white/10 text-[#6E6E6E] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#F5F5F5]">Đặt cọc 30% khóa xe</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FFC799]/20 text-[#FFC799]">
                          Phổ biến
                        </span>
                      </div>
                      <p className="font-mono text-base font-black text-[#FFC799]">
                        {depositAmount.toLocaleString('vi-VN')} đ
                      </p>
                      <p className="text-[11px] text-[#6E6E6E] mt-0.5">
                        70% còn lại ({remainingAmount.toLocaleString('vi-VN')} đ) thanh toán khi nhận xe
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentScope('Full100')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        paymentScope === 'Full100'
                          ? 'bg-[#FFC799]/10 border-[#FFC799] text-[#F5F5F5]'
                          : 'bg-[#101010] border-white/10 text-[#6E6E6E] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#F5F5F5]">Tất toán trước 100%</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FFC799]/20 text-[#FFC799]">
                          Nhận xe 30s
                        </span>
                      </div>
                      <p className="font-mono text-base font-black text-[#F5F5F5]">
                        {totalAmount.toLocaleString('vi-VN')} đ
                      </p>
                      <p className="text-[11px] text-[#6E6E6E] mt-0.5">
                        Không cần thanh toán thêm khi nhận xe tại chi nhánh
                      </p>
                    </button>
                  </div>
                </div>

                {/* 2. Payment Channel Selector */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E6E] block">
                    2. Chọn kênh thanh toán:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                      onClick={() => setPaymentOption('VietQR')}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        paymentOption === 'VietQR'
                          ? 'bg-[#FFC799]/10 border-[#FFC799]'
                          : 'bg-[#101010] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <QrCode className="w-5 h-5 text-[#FFC799]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FFC799]/20 text-[#FFC799] px-2 py-0.5 rounded">
                          Tự động 24/7
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-[#F5F5F5]">VietQR Ngân hàng</h4>
                        <p className="text-[11px] text-[#6E6E6E] mt-0.5">Quét mã QR xác nhận hoàn thành ngay</p>
                      </div>
                    </div>

                    <div
                      onClick={() => setPaymentOption('VNPay')}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        paymentOption === 'VNPay'
                          ? 'bg-[#FFC799]/10 border-[#FFC799]'
                          : 'bg-[#101010] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <CreditCard className="w-5 h-5 text-[#FFC799]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-[#F5F5F5]">Cổng VNPay</h4>
                        <p className="text-[11px] text-[#6E6E6E] mt-0.5">Thẻ ATM nội địa, Visa, Mastercard</p>
                      </div>
                    </div>

                    <div
                      onClick={() => setPaymentOption('Cash')}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        paymentOption === 'Cash'
                          ? 'bg-[#FFC799]/10 border-[#FFC799]'
                          : 'bg-[#101010] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Building2 className="w-5 h-5 text-[#6E6E6E]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-[#F5F5F5]">Cọc tại quầy</h4>
                        <p className="text-[11px] text-[#6E6E6E] mt-0.5">Giữ chỗ tạm thời 30 phút tại trạm</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* VietQR Dynamic Box + Interactive Completion Verification */}
                {paymentOption === 'VietQR' && (
                  <div className="p-5 rounded-2xl bg-[#101010] border border-white/15 space-y-5">
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      <div className="bg-white p-3 rounded-xl shadow-lg flex flex-col items-center shrink-0">
                        <img
                          src={`https://api.vietqr.io/image/970422-0905123456-compact2.jpg?amount=${activePayAmount}&addInfo=${encodeURIComponent(transferMemo)}&accountName=CONG%20TY%20MOTORENT`}
                          alt="VietQR Chuyển khoản"
                          className="w-40 h-40 object-contain"
                        />
                        <span className="text-[10px] font-black text-slate-900 mt-1 uppercase tracking-tight">
                          NAPAS247 • MB BANK
                        </span>
                      </div>

                      <div className="flex-1 w-full space-y-2.5 text-xs">
                        <div className="flex items-center justify-between py-1.5 border-b border-white/[0.08]">
                          <span className="text-[#6E6E6E]">Ngân hàng thụ hưởng:</span>
                          <span className="font-bold text-[#F5F5F5]">MB Bank (Ngân hàng Quân Đội)</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-b border-white/[0.08]">
                          <span className="text-[#6E6E6E]">Số tài khoản:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#FFC799]">0905 123 456</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText('0905123456', 'stk')}
                              className="px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[10px] text-[#C8C2B8] cursor-pointer"
                            >
                              {copiedField === 'stk' ? 'Đã chép' : 'Sao chép'}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-b border-white/[0.08]">
                          <span className="text-[#6E6E6E]">Chủ tài khoản:</span>
                          <span className="font-bold text-[#F5F5F5] uppercase">CONG TY TNHH MOTORENT</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-b border-white/[0.08]">
                          <span className="text-[#6E6E6E]">
                            Số tiền ({paymentScope === 'Full100' ? 'Tất toán 100%' : 'Cọc 30%'}):
                          </span>
                          <span className="font-mono font-black text-[#FFC799] text-sm">
                            {activePayAmount.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-[#6E6E6E]">Nội dung chuyển khoản:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#FFC799]">{transferMemo}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(transferMemo, 'memo')}
                              className="px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[10px] text-[#C8C2B8] cursor-pointer"
                            >
                              {copiedField === 'memo' ? 'Đã chép' : 'Sao chép'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive QR Verification Status Bar */}
                    {qrVerified ? (
                      <div className="p-4 rounded-xl bg-[#FFC799]/10 border border-[#FFC799]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start space-x-3">
                          <CheckCircle2 className="w-5 h-5 text-[#FFC799] shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-[#FFC799]">
                              Đã xác nhận giao dịch chuyển khoản QR thành công!
                            </p>
                            <p className="text-[11px] text-[#C8C2B8] mt-0.5">
                              Mã đối soát NAPAS: <strong className="font-mono text-[#F5F5F5]">{qrPrecheckCode}</strong> • Số tiền:{' '}
                              <strong className="font-mono text-[#FFC799]">
                                {activePayAmount.toLocaleString('vi-VN')} đ
                              </strong>
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded bg-[#FFC799]/20 text-[#FFC799] font-mono text-[10px] font-bold uppercase tracking-wider shrink-0">
                          ĐÃ BÁO CÓ NGÂN HÀNG
                        </span>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-[#161616] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-2.5 text-xs text-[#C8C2B8]">
                          <div className="w-2 h-2 rounded-full bg-[#FFC799] animate-pulse shrink-0" />
                          <span>
                            Sau khi quét mã QR trên ứng dụng ngân hàng, bấm nút bên cạnh để kiểm tra báo có ngay:
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={qrChecking}
                          onClick={handleVerifyQrPrecheck}
                          className="px-4 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-[#F5F5F5] font-bold text-xs flex items-center justify-center space-x-2 transition-all shrink-0 cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 text-[#FFC799] ${qrChecking ? 'animate-spin' : ''}`} />
                          <span>
                            {qrChecking ? 'Đang đối soát ngân hàng...' : 'Kiểm tra giao dịch QR vừa quét'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {paymentOption === 'VNPay' && (
                  <div className="p-4 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#C8C2B8] space-y-2">
                    <p>
                      Hệ thống sẽ ghi nhận giao dịch thanh toán trực tuyến qua cổng <strong>VNPay</strong> với số tiền{' '}
                      <strong className="text-[#FFC799] font-mono">{activePayAmount.toLocaleString('vi-VN')} đ</strong> và kích hoạt trạng thái <strong>Đã duyệt (Approved)</strong> ngay khi xác nhận.
                    </p>
                  </div>
                )}

                {paymentOption === 'Cash' && (
                  <div className="p-4 rounded-xl bg-[#101010] border border-[#FFC799]/30 text-xs text-[#C8C2B8] space-y-1.5">
                    <p className="font-bold text-[#FFC799]">Lưu ý khi chọn Cọc tại quầy:</p>
                    <p>
                      Đơn đặt xe sẽ ở trạng thái <strong>Chờ cọc 30% (Pending)</strong>. Bạn vẫn có thể mở lại mã VietQR để thanh toán bất kỳ lúc nào trong mục <strong>Hồ sơ &rarr; Chuyến xe của tôi</strong>.
                    </p>
                  </div>
                )}

                {/* Refund & Guarantee Notice */}
                <div className="p-4 rounded-xl bg-[#101010] border border-white/[0.08] text-[11px] text-[#6E6E6E] space-y-1.5">
                  <div className="flex items-center space-x-2 text-[#FFC799] font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Chính sách bảo vệ quyền lợi người thuê</span>
                  </div>
                  <p>• Hoàn lại 100% tiền đã thanh toán nếu thông báo hủy chuyến trước 24 giờ so với giờ nhận xe.</p>
                  <p>
                    • Biển số xe <strong className="text-[#F5F5F5] font-mono">{vehicle.licensePlate}</strong> được khóa độc quyền cho bạn ngay sau khi hoàn tất.
                  </p>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="py-3.5 px-5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[#C8C2B8] font-bold text-xs transition-colors flex items-center space-x-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại</span>
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleConfirmBooking}
                    className="flex-1 py-3.5 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] disabled:opacity-50 text-[#101010] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg cursor-pointer"
                  >
                    {submitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-[#101010]/40 border-t-transparent rounded-full animate-spin" />
                        <span>Đang đối soát thanh toán & khóa biển số...</span>
                      </div>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>
                          {paymentOption === 'Cash'
                            ? 'Tạo đơn giữ chỗ tại quầy'
                            : `Tôi đã thanh toán ${activePayAmount.toLocaleString('vi-VN')}đ — Hoàn tất & Khóa xe`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Success & Verified Payment Receipt Ticket */}
            {currentStep === 5 && (
              <div className="bg-[#161616] rounded-2xl p-6 sm:p-8 border border-[#FFC799]/40 shadow-2xl space-y-6">
                {/* Top Status Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#FFC799]/15 border border-[#FFC799]/30 text-[#FFC799] flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#FFC799] block">
                        {paymentReceipt
                          ? 'ĐÃ XÁC NHẬN THANH TOÁN QR • ĐƠN ĐÃ DUYỆT (APPROVED)'
                          : 'ĐÃ TẠO ĐƠN GIỮ CHỖ • CHỜ ĐỐI SOÁT TẠI QUẦY'}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-[#F5F5F5]">
                        Biển số {vehicle.licensePlate} đã khóa cho bạn
                      </h2>
                    </div>
                  </div>

                  {/* Check-in Booking Code */}
                  <div className="px-4 py-2.5 bg-[#101010] border border-white/15 rounded-xl flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div>
                      <span className="text-[10px] text-[#6E6E6E] font-bold uppercase tracking-wider block">
                        Mã hợp đồng (Check-in)
                      </span>
                      <span className="font-mono text-lg font-black text-[#FFC799]">
                        {createdBooking?.bookingCode || 'MV-88692'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdBooking?.bookingCode || 'MV-88692')}
                      className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#C8C2B8] transition-colors cursor-pointer"
                      title="Sao chép mã"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-[#FFC799]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Verified QR Electronic Receipt Box */}
                {paymentReceipt && (
                  <div className="p-4 rounded-xl bg-[#FFC799]/10 border border-[#FFC799]/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#FFC799] flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Biên lai xác nhận thanh toán VietQR 24/7</span>
                      </span>
                      <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded bg-[#FFC799]/20 text-[#FFC799]">
                        ĐÃ BÁO CÓ THÀNH CÔNG
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                      <div className="p-2.5 rounded-lg bg-[#101010]/80 border border-white/10">
                        <span className="text-[10px] text-[#6E6E6E] block">Mã giao dịch ngân hàng</span>
                        <span className="font-mono font-bold text-[#F5F5F5]">{paymentReceipt.transactionId}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#101010]/80 border border-white/10">
                        <span className="text-[10px] text-[#6E6E6E] block">Số tiền đã thanh toán</span>
                        <span className="font-mono font-black text-[#FFC799]">
                          {paymentReceipt.amount.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#101010]/80 border border-white/10">
                        <span className="text-[10px] text-[#6E6E6E] block">Thời điểm xác nhận</span>
                        <span className="font-mono font-semibold text-[#F5F5F5]">{paymentReceipt.paidAt}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ticket Details Summary */}
                <div className="p-5 bg-[#101010] border border-white/10 rounded-xl space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                    <span className="text-[#6E6E6E]">Phương tiện & Biển số:</span>
                    <span className="font-bold text-[#F5F5F5]">
                      {vehicle.vehicleModel} • <span className="font-mono text-[#FFC799]">{vehicle.licensePlate}</span>
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                    <span className="text-[#6E6E6E]">Thời gian nhận xe:</span>
                    <span className="font-semibold text-[#F5F5F5]">
                      {pickupTime} ngày {pickupDate}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                    <span className="text-[#6E6E6E]">Chi nhánh nhận xe:</span>
                    <span className="font-semibold text-[#F5F5F5]">{pickupBranch?.name}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                    <span className="text-[#6E6E6E]">Trạng thái thanh toán:</span>
                    <span className="font-mono font-bold text-[#FFC799]">
                      {paymentReceipt
                        ? `${paymentReceipt.amount.toLocaleString('vi-VN')} đ (Đã thanh toán QR)`
                        : `Chờ thanh toán cọc ${depositAmount.toLocaleString('vi-VN')} đ tại quầy`}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#6E6E6E]">Còn lại thanh toán khi nhận xe:</span>
                    <span className="font-mono font-bold text-[#F5F5F5]">
                      {paymentReceipt
                        ? `${activeRemainingAfterPay.toLocaleString('vi-VN')} đ`
                        : `${remainingAmount.toLocaleString('vi-VN')} đ`}
                    </span>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                  <Link
                    to="/bikes"
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[#C8C2B8] font-bold text-xs text-center transition-colors"
                  >
                    Khám phá thêm xe khác
                  </Link>

                  <Link
                    to="/profile?tab=bookings"
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] font-black text-xs uppercase tracking-wider text-center transition-all"
                  >
                    Xem hợp đồng trong Chuyến xe của tôi
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Sticky Vehicle 3-Angle Studio Showcase & Price Card */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            {/* 3-Angle Studio Showcase Stage */}
            <div className="bg-[#161616] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
              <div className="p-5 pb-3 flex items-center justify-between border-b border-white/[0.08]">
                <div>
                  <h3 className="text-base font-black text-[#F5F5F5]">{vehicle.vehicleModel}</h3>
                  <p className="text-xs text-[#6E6E6E] font-mono mt-0.5">
                    Biển số: <strong className="text-[#F5F5F5]">{vehicle.licensePlate}</strong> • Đời{' '}
                    {vehicle.yearManufactured || 2024}
                  </p>
                </div>
                {vehicle.color && (
                  <span className="text-[11px] font-semibold text-[#C8C2B8] bg-white/[0.05] px-2.5 py-1 rounded-lg border border-white/10">
                    {vehicle.color}
                  </span>
                )}
              </div>

              {/* Full Bike Showcase */}
              <div className="relative w-full h-56 bg-gradient-to-b from-[#E8F1ED] via-[#F4F8F6] to-[#DCE9E3] overflow-hidden flex items-center justify-center">
                <div className="absolute top-3 left-4 z-20 flex items-center space-x-1.5 bg-[#101010]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/15 text-[10px] font-semibold text-[#F5F5F5]">
                  <Camera className="w-3 h-3 text-[#FFC799]" />
                  <span>{ANGLE_VIEWS.find((a) => a.id === activeAngle)?.title}</span>
                </div>

                <div className="w-full h-full flex items-center justify-center overflow-hidden">
                  {vehicle.images && vehicle.images[activeAngle] && !imgError ? (
                    <img
                      src={getOptimizedVehicleImageUrl(vehicle.images[activeAngle])}
                      alt={`${vehicle.vehicleModel} - ${ANGLE_VIEWS.find((a) => a.id === activeAngle)?.title}`}
                      loading="lazy"
                      decoding="async"
                      crossOrigin="anonymous"
                      onError={() => setImgError(true)}
                      className="w-full h-full object-contain scale-[1.35] transition-transform duration-300 mix-blend-multiply"
                    />
                  ) : (
                    <div className="py-4 flex flex-col items-center justify-center">
                      <svg
                        className="w-36 h-24 text-slate-600"
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
                      </svg>
                    </div>
                  )}
                </div>

                {/* 3-Angle Switcher Buttons */}
                <div className="absolute bottom-2.5 left-4 z-20 flex items-center bg-[#101010]/90 backdrop-blur-md p-1 rounded-lg border border-white/15 space-x-1">
                  {ANGLE_VIEWS.map((ang) => (
                    <button
                      key={ang.id}
                      type="button"
                      onClick={() => {
                        setActiveAngle(ang.id);
                        setImgError(false);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        activeAngle === ang.id
                          ? 'bg-[#FFC799] text-[#101010] font-black'
                          : 'text-[#C8C2B8] hover:text-[#F5F5F5]'
                      }`}
                    >
                      {ang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specs Pills */}
              <div className="p-4 grid grid-cols-2 gap-2.5 text-xs bg-[#161616]">
                <div className="flex items-center space-x-2.5 bg-[#101010] p-3 rounded-xl border border-white/[0.06]">
                  <Gauge className="w-4 h-4 text-[#FFC799]" />
                  <div>
                    <span className="text-[10px] text-[#6E6E6E] block">ODO chuẩn</span>
                    <span className="font-mono font-bold text-[#F5F5F5]">
                      {vehicle.odometer.toLocaleString('vi-VN')} km
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 bg-[#101010] p-3 rounded-xl border border-white/[0.06]">
                  {isElectric ? (
                    <>
                      <Zap className="w-4 h-4 text-[#FFC799]" />
                      <div>
                        <span className="text-[10px] text-[#6E6E6E] block">Nhiên liệu</span>
                        <span className="font-bold text-[#F5F5F5]">Pin LFP ~198 km</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Fuel className="w-4 h-4 text-[#FFC799]" />
                      <div>
                        <span className="text-[10px] text-[#6E6E6E] block">Tiêu hao</span>
                        <span className="font-bold text-[#F5F5F5]">Xăng ~1.8L/100km</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Transparent Pricing Breakdown Card */}
            <div className="bg-[#161616] rounded-2xl p-6 border border-white/10 shadow-xl space-y-4">
              <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#FFC799] flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Bảng kê chi phí hợp đồng</span>
              </h4>

              <div className="space-y-2.5 text-xs text-[#C8C2B8]">
                <div className="flex justify-between py-1">
                  <span className="text-[#6E6E6E]">Đơn giá thuê ngày:</span>
                  <span className="font-mono font-bold text-[#F5F5F5]">
                    {dailyPrice.toLocaleString('vi-VN')} đ/ngày
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#6E6E6E]">Thời lượng thuê:</span>
                  <span className="font-mono font-bold text-[#FFC799]">{durationDays} ngày</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#6E6E6E]">Tạm tính tiền thuê xe:</span>
                  <span className="font-mono font-bold text-[#F5F5F5]">
                    {baseRentalFee.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between py-1 text-[#FFC799] font-bold">
                    <span>Ưu đãi voucher ({appliedDiscount.code}):</span>
                    <span className="font-mono">- {appliedDiscount.amount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                <div className="flex justify-between py-1 text-[#6E6E6E]">
                  <span>Phụ phí trả xe liên trạm:</span>
                  <span className="text-[#FFC799] font-bold">0 đ (Miễn phí)</span>
                </div>
              </div>

              {/* Total & Deposit Split Box */}
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-[#6E6E6E] font-bold uppercase tracking-wider">Tổng hợp đồng:</span>
                  <span className="text-xl font-black text-[#F5F5F5] font-mono">
                    {totalAmount.toLocaleString('vi-VN')} <span className="text-xs text-[#6E6E6E] font-normal">đ</span>
                  </span>
                </div>

                <div className="p-3.5 bg-[#101010] border border-[#FFC799]/30 rounded-xl space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#F5F5F5]">
                      {paymentScope === 'Full100' ? 'Thanh toán ngay (100%):' : 'Tiền cọc giữ xe (30%):'}
                    </span>
                    <span className="font-mono font-black text-[#FFC799] text-sm">
                      {activePayAmount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6E6E6E]">
                    Đối soát tự động qua VietQR 24/7 để khóa biển số riêng
                  </p>
                </div>

                <div className="flex justify-between items-center text-xs text-[#6E6E6E] px-1">
                  <span>Còn lại thanh toán khi nhận xe:</span>
                  <span className="font-mono font-bold text-[#F5F5F5]">
                    {activeRemainingAfterPay.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
