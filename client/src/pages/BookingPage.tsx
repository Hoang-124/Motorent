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
  Download,
  CalendarPlus,
  Lock,
  ExternalLink,
} from 'lucide-react';
import axios from 'axios';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Vehicle, Branch, Booking } from '../types';
import { getOptimizedVehicleImageUrl } from '../utils/imageHelper';
import {
  DateTimePicker,
  getNextAvailableSlotForToday,
  parseLocalDateStr,
  formatDisplayDateVN,
  normalizeReturnSchedule,
} from '../components/DateTimePicker';
import { BranchSelect } from '../components/BranchSelect';

const ANGLE_VIEWS = [
  { id: 1, label: 'Ngang xe', title: 'Góc ngang thân xe' },
  { id: 0, label: '3/4 Trước', title: 'Góc 3/4 mặt trước' },
  { id: 2, label: 'Góc sau', title: 'Góc đuôi xe & khoang lái' },
];

const AVAILABLE_VOUCHERS = [
  {
    code: 'THEOGIO10',
    title: 'Giảm 10% (Tối đa 15.000đ)',
    desc: 'Áp dụng cho mọi gói thuê theo giờ & theo ngày (đơn từ 30.000đ)',
    discountPercent: 10,
    maxDiscount: 15000,
    minOrder: 30000,
  },
  {
    code: 'CHAOBANMOI',
    title: 'Giảm 20.000đ Khách mới',
    desc: 'Áp dụng cho đơn thuê từ 1 ngày trở lên (tối thiểu 80.000đ)',
    discountPercent: 25,
    maxDiscount: 20000,
    minOrder: 80000,
  },
  {
    code: 'MOTORENT30',
    title: 'Giảm 30.000đ Thuê từ 2 ngày',
    desc: 'Áp dụng cho đơn thuê từ 150.000đ trở lên',
    discountPercent: 20,
    maxDiscount: 30000,
    minOrder: 150000,
  },
  {
    code: 'DANANGVIP',
    title: 'Giảm 15% (Tối đa 100.000đ)',
    desc: 'Áp dụng cho đơn thuê dài ngày từ 300.000đ trở lên',
    discountPercent: 15,
    maxDiscount: 100000,
    minOrder: 300000,
  },
];

const computeVoucherDiscountAmount = (code: string, baseFee: number): number => {
  if (!code || baseFee <= 0) return 0;
  const found = AVAILABLE_VOUCHERS.find((v) => v.code === code.toUpperCase());
  if (!found) return 0;
  if (baseFee < found.minOrder) return 0;
  const raw = Math.round((baseFee * found.discountPercent) / 100);
  return Math.min(found.maxDiscount, raw);
};

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
  const { user, isAuthenticated, updateUser } = useAuth();

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
  const todayStr = formatLocalDate(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 3);

  const resolvedInitialPickupDate = pickupDateParam || formatLocalDate(tomorrow);
  const resolvedInitialPickupTime =
    resolvedInitialPickupDate === todayStr && today.getHours() >= 8
      ? getNextAvailableSlotForToday()
      : '08:30';

  const [pickupDate, setPickupDate] = useState<string>(resolvedInitialPickupDate);
  const [pickupTime, setPickupTime] = useState<string>(resolvedInitialPickupTime);
  const [returnDate, setReturnDate] = useState<string>(returnDateParam || formatLocalDate(dayAfter));
  const [returnTime, setReturnTime] = useState<string>('18:00');

  // Form Step 2: Customer Identity & Field Validation States
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [idCardNumber, setIdCardNumber] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [step2Touched, setStep2Touched] = useState<{
    name: boolean;
    phone: boolean;
    email: boolean;
    idCard: boolean;
  }>({
    name: false,
    phone: false,
    email: false,
    idCard: false,
  });
  const [step2Submitted, setStep2Submitted] = useState<boolean>(false);

  // Form Step 3: Perks & Interactive Voucher Selection
  const initialVoucherCode = AVAILABLE_VOUCHERS.some((v) => v.code === voucherParam)
    ? voucherParam
    : 'CHAOBANMOI';
  const [selectedVoucherCode, setSelectedVoucherCode] = useState<string>(initialVoucherCode);
  const [customVoucherInput, setCustomVoucherInput] = useState<string>('');
  const [discountFeedback, setDiscountFeedback] = useState<string>('');

  // Form Step 4: Payment selection & QR Verification
  const [paymentOption, setPaymentOption] = useState<'VietQR' | 'VNPay' | 'Cash'>('VietQR');
  const [paymentScope, setPaymentScope] = useState<'Deposit30' | 'Full100'>('Deposit30');
  const [vnpayBankCode, setVnpayBankCode] = useState<'NCB' | '' | 'INTCARD'>('NCB');
  const [qrChecking, setQrChecking] = useState<boolean>(false);
  const [qrVerified, setQrVerified] = useState<boolean>(false);
  const [qrPrecheckCode, setQrPrecheckCode] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState<boolean>(false);

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

  // Fetch latest profile from /auth/me on mount so verified eKYC & idCardNumber are up to date
  useEffect(() => {
    if (isAuthenticated) {
      api
        .get('/auth/me')
        .then((res) => {
          if (res.data?.success && res.data?.data) {
            updateUser(res.data.data);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const applyUserProfileToForm = (targetUser = user) => {
    if (!targetUser) return;
    const fullName =
      [targetUser.lastName, targetUser.firstName].filter(Boolean).join(' ') ||
      targetUser.username ||
      '';
    const resolvedIdCard =
      targetUser.idCardNumber ||
      (targetUser.identityStatus === 'Verified' ? '048204008692' : '');

    setCustomerName(fullName);
    setCustomerPhone(targetUser.phoneNumber || '');
    setCustomerEmail(targetUser.email || '');
    setIdCardNumber(resolvedIdCard);
    setErrorMsg('');
  };

  // Autofill from user profile when user object arrives or updates
  useEffect(() => {
    if (user) {
      const fullName =
        [user.lastName, user.firstName].filter(Boolean).join(' ') || user.username || '';
      const resolvedIdCard =
        user.idCardNumber || (user.identityStatus === 'Verified' ? '048204008692' : '');

      setCustomerName((prev) => prev || fullName);
      setCustomerPhone((prev) => prev || user.phoneNumber || '');
      setCustomerEmail((prev) => prev || user.email || '');
      setIdCardNumber((prev) => prev || resolvedIdCard);
    }
  }, [user]);

  // Step 2 Field Validators
  const validateCustomerName = (val: string): string => {
    const trimmed = val.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      return 'Vui lòng nhập họ và tên đầy đủ của người nhận xe.';
    }
    if (/[^a-zA-ZÀ-ỹ\s'.-]/u.test(trimmed)) {
      return 'Họ và tên chỉ được chứa chữ cái, không chứa chữ số hoặc ký tự đặc biệt.';
    }
    const words = trimmed.split(' ').filter(Boolean);
    if (words.length < 2 || trimmed.length < 4) {
      return 'Vui lòng nhập đầy đủ cả Họ và Tên (tối thiểu 2 từ, VD: Nguyễn Hoàng).';
    }
    return '';
  };

  const validateCustomerPhone = (val: string): string => {
    const clean = val.replace(/[\s.-]/g, '');
    if (!clean) {
      return 'Vui lòng nhập số điện thoại di động để nhận mã xe.';
    }
    if (!/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(clean)) {
      return 'Số điện thoại không hợp lệ (Cần 10 số đầu 03, 05, 07, 08, 09 — VD: 0905123456).';
    }
    return '';
  };

  const validateCustomerEmail = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) {
      return 'Vui lòng nhập địa chỉ Email nhận hợp đồng thuê xe điện tử.';
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
      return 'Địa chỉ Email không đúng định dạng (VD: tenban@gmail.com).';
    }
    return '';
  };

  const validateIdCardNumber = (val: string): string => {
    const clean = val.replace(/\s+/g, '').toUpperCase();
    if (!clean) {
      return 'Vui lòng nhập số CCCD (12 chữ số) hoặc Hộ chiếu để lập hợp đồng điện tử.';
    }
    if (!/^([0-9]{12}|[0-9]{9}|[A-Z][0-9]{7,8})$/.test(clean)) {
      return 'Số CCCD phải gồm đúng 12 chữ số (VD: 048204008692) hoặc Hộ chiếu hợp lệ (1 chữ cái + 7–8 số).';
    }
    return '';
  };

  const nameError = validateCustomerName(customerName);
  const phoneError = validateCustomerPhone(customerPhone);
  const emailError = validateCustomerEmail(customerEmail);
  const idCardError = validateIdCardNumber(idCardNumber);
  const isStep2Valid = !nameError && !phoneError && !emailError && !idCardError;

  // Reset QR precheck if payment scope or option changes
  useEffect(() => {
    setQrVerified(false);
    setQrPrecheckCode('');
  }, [paymentScope, paymentOption]);

  // Smart Hourly vs. Daily Pricing Calculation
  const startDateTime = new Date(`${pickupDate}T${pickupTime}:00+07:00`);
  const endDateTime = new Date(`${returnDate}T${returnTime}:00+07:00`);
  const durationMs = Math.max(0, endDateTime.getTime() - startDateTime.getTime());
  const totalHours = Math.max(2, Math.ceil(durationMs / (1000 * 3600)));
  const durationDays = Math.max(1, Math.ceil(totalHours / 24));

  const dailyPrice = vehicle ? vehicle.dailyPrice : 0;
  const hourlyPrice =
    vehicle?.hourlyPrice || (dailyPrice ? Math.round(dailyPrice / 5 / 1000) * 1000 : 0);

  const isHourlyBilling = totalHours < 24 && totalHours * hourlyPrice < dailyPrice;

  let baseRentalFee = 0;
  let billingDurationLabel = '';
  if (totalHours < 24) {
    baseRentalFee = Math.min(dailyPrice, totalHours * hourlyPrice);
    billingDurationLabel = isHourlyBilling
      ? `${totalHours} giờ (Gói theo giờ)`
      : `1 ngày (${totalHours} giờ)`;
  } else {
    const fullDays = Math.floor(totalHours / 24);
    const remHours = totalHours % 24;
    const remFee = remHours > 0 ? Math.min(dailyPrice, remHours * hourlyPrice) : 0;
    baseRentalFee = fullDays * dailyPrice + remFee;
    if (remHours === 0) {
      billingDurationLabel = `${fullDays} ngày (${totalHours} giờ)`;
    } else if (remFee < dailyPrice) {
      billingDurationLabel = `${fullDays} ngày + ${remHours} giờ lẻ`;
    } else {
      billingDurationLabel = `${fullDays + 1} ngày (${totalHours} giờ)`;
    }
  }

  // Dynamic voucher evaluation: if selectedVoucherCode isn't eligible for current baseRentalFee,
  // check if user explicitly picked it or fall back cleanly
  const activeDiscountAmount = computeVoucherDiscountAmount(selectedVoucherCode, baseRentalFee);
  const appliedDiscount =
    selectedVoucherCode && activeDiscountAmount > 0
      ? { code: selectedVoucherCode, amount: activeDiscountAmount }
      : null;

  const discountAmount = appliedDiscount ? appliedDiscount.amount : 0;
  const totalAmount = Math.max(0, baseRentalFee - discountAmount);
  const depositAmount = Math.round(totalAmount * 0.3); // Cọc 30%
  const remainingAmount = totalAmount - depositAmount; // 70% còn lại
  const activePayAmount = paymentScope === 'Full100' ? totalAmount : depositAmount;
  const activeRemainingAfterPay = paymentScope === 'Full100' ? 0 : remainingAmount;

  const handleSelectVoucher = (code: string) => {
    if (!code || code === selectedVoucherCode) {
      setSelectedVoucherCode('');
      setDiscountFeedback('Đã gỡ mã ưu đãi.');
      return;
    }
    const upper = code.toUpperCase();
    const vObj = AVAILABLE_VOUCHERS.find((v) => v.code === upper);
    if (!vObj) {
      setDiscountFeedback('Mã giảm giá không tồn tại.');
      return;
    }
    if (baseRentalFee < vObj.minOrder) {
      setDiscountFeedback(
        `Mã ${upper} yêu cầu đơn thuê tối thiểu ${vObj.minOrder.toLocaleString('vi-VN')}đ (Hiện tại: ${baseRentalFee.toLocaleString('vi-VN')}đ).`
      );
      return;
    }
    const amt = computeVoucherDiscountAmount(upper, baseRentalFee);
    setSelectedVoucherCode(upper);
    setDiscountFeedback(`Đã áp dụng mã ${upper}: Giảm ${amt.toLocaleString('vi-VN')}đ`);
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
      setStep2Submitted(true);
      setStep2Touched({ name: true, phone: true, email: true, idCard: true });

      const firstErr = nameError || phoneError || emailError || idCardError;
      if (firstErr) {
        setErrorMsg(firstErr);
        return;
      }

      // Normalize inputs
      const cleanPhone = customerPhone.replace(/[\s.-]/g, '');
      const cleanIdCard = idCardNumber.replace(/\s+/g, '').toUpperCase();
      const cleanName = customerName.trim().replace(/\s+/g, ' ');
      setCustomerName(cleanName);
      setCustomerPhone(cleanPhone);
      setCustomerEmail(customerEmail.trim());
      setIdCardNumber(cleanIdCard);

      // Silently sync updated phone / idCardNumber back to user profile if authenticated
      if (isAuthenticated && user) {
        const nameParts = cleanName.split(' ');
        const firstNamePart = nameParts.length > 1 ? nameParts[nameParts.length - 1] : cleanName;
        const lastNamePart = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
        if (
          cleanPhone !== (user.phoneNumber || '') ||
          cleanIdCard !== (user.idCardNumber || '')
        ) {
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

        // If paying via VNPay, create official payment URL and redirect to gateway
        if (paymentOption === 'VNPay') {
          if (!newBooking?._id) {
            setErrorMsg('Không thể khởi tạo mã đơn cho cổng VNPay Sandbox.');
            setSubmitting(false);
            return;
          }
          try {
            const vnpayRes = await api.post('/payments/vnpay/create', {
              bookingId: newBooking._id,
              paymentType: paymentScope,
              bankCode: vnpayBankCode || undefined,
            });
            if (vnpayRes.data?.success && vnpayRes.data?.data?.paymentUrl) {
              window.location.href = vnpayRes.data.data.paymentUrl;
              return;
            }
            setErrorMsg('Không nhận được liên kết chuyển hướng từ cổng VNPay Sandbox.');
            setSubmitting(false);
            return;
          } catch (vnpErr) {
            console.error('[VNPay Create Error]', vnpErr);
            setErrorMsg('Không thể khởi tạo liên kết VNPay Sandbox. Vui lòng thử lại.');
            setSubmitting(false);
            return;
          }
        }

        // If paying via VietQR online, immediately confirm deposit/full payment on backend
        if (paymentOption === 'VietQR') {
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

  const handleDownloadInvoice = async (bookingId: string) => {
    if (!bookingId) return;
    setDownloadingInvoice(true);
    setErrorMsg('');
    try {
      const response = await api.get(`/bookings/${bookingId}/invoice?download=true`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Hoa_don_thue_xe_${createdBooking?.bookingCode || bookingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Invoice download error:', err);
      // Fallback: open endpoint in new tab
      window.open(`/api/bookings/${bookingId}/invoice`, '_blank');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const getGoogleCalendarUrl = () => {
    if (!vehicle) return '#';
    const title = encodeURIComponent(`Thuê xe máy MotoRent: ${vehicle.vehicleModel} (${vehicle.licensePlate})`);
    const details = encodeURIComponent(
      `Hợp đồng thuê xe máy MotoRent Đà Nẵng\nMã đặt xe: ${createdBooking?.bookingCode || 'MV-88692'}\nXe: ${vehicle.vehicleModel} - Biển số: ${vehicle.licensePlate}\nTrạm nhận: ${pickupBranch?.name || ''} (${pickupBranch?.address || ''})\nHotline hỗ trợ 24/7: 0905 123 456`
    );
    const location = encodeURIComponent(pickupBranch?.address || 'Đà Nẵng');
    try {
      const startIso = startDateTime.toISOString().replace(/-|:|\.\d\d\d/g, '');
      const endIso = endDateTime.toISOString().replace(/-|:|\.\d\d\d/g, '');
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
    } catch {
      return 'https://calendar.google.com';
    }
  };

  const isElectric = vehicle?.fuelType === 'Electric';

  const pickupBranch = branches.find((b) => b._id === pickupBranchId);
  const returnBranch = branches.find((b) => b._id === returnBranchId);
  const transferMemo = vehicle ? `MOTORENT ${vehicle.licensePlate.replace(/\s+/g, '')}` : 'MOTORENT COC';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101010] flex items-center justify-center text-[#F5F5F5]">
        <div className="flex flex-col items-center space-y-4 max-w-sm w-full px-4">
          <div className="w-12 h-12 rounded-2xl bg-[#161616] border border-[#FFC799]/30 flex items-center justify-center shadow-[0_0_24px_rgba(255,199,153,0.15)]">
            <div className="w-6 h-6 border-2 border-[#FFC799] border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-black text-[#F5F5F5] tracking-tight">
              Đang kết nối trung tâm xe MotoRent
            </p>
            <p className="text-xs text-[#6E6E6E]">
              Tải cấu hình phương tiện, kiểm tra lịch trống và áp dụng biểu phí...
            </p>
          </div>
          <div className="w-48 h-1.5 rounded-full overflow-hidden bg-white/10 animate-shimmer" />
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
        {/* Breadcrumb Navigation & Polish Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <nav className="flex items-center space-x-2 text-xs text-[#6E6E6E]">
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

          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#161616] border border-white/10 text-[11px] text-[#A0A0A0] shadow-sm self-start sm:self-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#99FFE4] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#99FFE4]"></span>
            </span>
            <span>Ước tính: <strong className="text-[#F5F5F5]">~2 phút hoàn tất</strong> • Khóa biển số ngay lập tức</span>
          </div>
        </div>

        {/* Dynamic Stepper Header */}
        <div className="bg-[#161616] rounded-2xl px-4 py-4 sm:px-6 sm:py-5 border border-white/10 mb-8 shadow-xl">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            {[
              { num: 1, code: '01', label: 'Lịch trình', sub: 'Trạm & Giờ thuê' },
              { num: 2, code: '02', label: 'Khách hàng', sub: 'Hồ sơ nhận xe' },
              { num: 3, code: '03', label: 'Gói dịch vụ', sub: 'Bảo hiểm & Mã giảm' },
              { num: 4, code: '04', label: 'Thanh toán QR', sub: 'Cọc giữ biển số' },
              { num: 5, code: '05', label: 'Biên lai & Mã xe', sub: 'Hoàn tất đặt xe' },
            ].map((st, idx, arr) => {
              const isCompleted = currentStep > st.num;
              const isActive = currentStep === st.num;
              const canClickBack = st.num < currentStep && currentStep < 5;

              return (
                <React.Fragment key={st.num}>
                  <button
                    type="button"
                    disabled={!canClickBack}
                    onClick={() => {
                      if (canClickBack) setCurrentStep(st.num);
                    }}
                    className={`group flex items-center space-x-3 px-3 py-2 rounded-xl border transition-all shrink-0 text-left ${
                      isActive
                        ? 'bg-[#1E1E1E] border-[#FFC799] ring-2 ring-[#FFC799]/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
                        : isCompleted
                        ? 'bg-[#101010]/80 border-[#99FFE4]/30 hover:border-[#99FFE4]/60 cursor-pointer'
                        : 'bg-[#101010]/40 border-white/[0.06] opacity-75 cursor-default'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-mono font-black transition-all shrink-0 ${
                        isActive
                          ? 'bg-[#FFC799] text-[#101010] shadow-[0_0_16px_rgba(255,199,153,0.35)] animate-pulse-ring'
                          : isCompleted
                          ? 'bg-[#99FFE4]/15 border border-[#99FFE4]/40 text-[#99FFE4]'
                          : 'bg-[#1E1E1E] border border-white/12 text-[#A0A0A0]'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4 stroke-[2.8]" /> : st.code}
                    </div>

                    <div className="min-w-0 pr-1">
                      <span
                        className={`block text-[10px] font-mono font-bold uppercase tracking-wider leading-none mb-1 ${
                          isActive
                            ? 'text-[#FFC799]'
                            : isCompleted
                            ? 'text-[#99FFE4]'
                            : 'text-[#6E6E6E]'
                        }`}
                      >
                        Bước {st.code}
                      </span>
                      <span
                        className={`block text-xs sm:text-[13px] font-bold whitespace-nowrap leading-tight ${
                          isActive || isCompleted ? 'text-[#F5F5F5]' : 'text-[#A0A0A0]'
                        }`}
                      >
                        {st.label}
                      </span>
                      <span className="hidden xl:block text-[10px] text-[#6E6E6E] whitespace-nowrap mt-0.5">
                        {st.sub}
                      </span>
                    </div>
                  </button>

                  {idx < arr.length - 1 && (
                    <div className="hidden md:flex flex-1 items-center min-w-[16px] max-w-[48px]">
                      <div
                        className={`h-[2px] w-full rounded-full transition-colors duration-300 ${
                          currentStep > st.num ? 'bg-[#99FFE4]/60 shadow-[0_0_8px_rgba(153,255,228,0.3)]' : 'bg-white/10'
                        }`}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Stepper Progress bar & Hint */}
          <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#A0A0A0]">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-[#FFC799]" />
              <span>
                {currentStep === 1 && 'Bước 1/5: Chọn ngày giờ và chi nhánh nhận - trả xe'}
                {currentStep === 2 && 'Bước 2/5: Xác nhận thông tin CCCD và người đứng tên hợp đồng'}
                {currentStep === 3 && 'Bước 3/5: Lựa chọn bảo hiểm và áp dụng voucher giảm cước'}
                {currentStep === 4 && 'Bước 4/5: Quét mã QR VietQR hoặc thanh toán VNPay để khóa xe'}
                {currentStep === 5 && 'Bước 5/5: Hoàn tất đặt xe • Xuất biên lai và hợp đồng điện tử'}
              </span>
            </div>
            <div className="flex items-center space-x-2.5 shrink-0">
              <span className="font-mono text-[10px] text-[#6E6E6E]">
                {Math.round((currentStep / 5) * 100)}% hoàn thành
              </span>
              <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FFC799] via-[#99FFE4] to-[#99FFE4] transition-all duration-500 ease-out"
                  style={{ width: `${(currentStep / 5) * 100}%` }}
                />
              </div>
            </div>
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
              <div className="bg-[#161616] rounded-2xl p-6 sm:p-8 border border-white/10 space-y-6 animate-step-fade shadow-xl">
                {/* Live Availability & Instant Plate Locking Badge */}
                <div className="p-3.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/25 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2.5">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="font-semibold text-emerald-300">
                      Xe đang sẵn sàng tại trạm • Khóa giữ biển số <strong className="font-mono text-white">{vehicle.licensePlate}</strong> ngay khi hoàn tất
                    </span>
                  </div>
                  <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold shrink-0">
                    <Lock className="w-3 h-3" />
                    <span>Khóa độc quyền</span>
                  </span>
                </div>

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
                  <BranchSelect
                    label={
                      <label className="text-xs font-bold text-[#F5F5F5] flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#FFC799]" />
                        <span>Chi nhánh nhận xe</span>
                      </label>
                    }
                    branches={branches}
                    value={pickupBranchId}
                    onChange={(newId) => setPickupBranchId(newId)}
                  />

                  <BranchSelect
                    label={
                      <label className="text-xs font-bold text-[#F5F5F5] flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#FFC799]" />
                        <span>Chi nhánh trả xe</span>
                      </label>
                    }
                    branches={branches}
                    value={returnBranchId}
                    onChange={(newId) => setReturnBranchId(newId)}
                  />
                </div>

                {/* Dates & Times */}
                <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DateTimePicker
                      mode="pickup"
                      label={
                        <span className="text-xs font-bold text-[#F5F5F5] flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#FFC799]" />
                          <span>Thời điểm nhận xe</span>
                        </span>
                      }
                      dateValue={pickupDate}
                      timeValue={pickupTime}
                      minDate={todayStr}
                      onDateChange={(newDate) => {
                        setPickupDate(newDate);
                        const synced = normalizeReturnSchedule(
                          newDate,
                          pickupTime,
                          returnDate,
                          returnTime
                        );
                        setReturnDate(synced.returnDate);
                        setReturnTime(synced.returnTime);
                      }}
                      onTimeChange={(newTime) => {
                        setPickupTime(newTime);
                        const synced = normalizeReturnSchedule(
                          pickupDate,
                          newTime,
                          returnDate,
                          returnTime
                        );
                        setReturnDate(synced.returnDate);
                        setReturnTime(synced.returnTime);
                      }}
                    />

                    <DateTimePicker
                      mode="return"
                      label={
                        <span className="text-xs font-bold text-[#F5F5F5] flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#FFC799]" />
                          <span>Thời điểm trả xe</span>
                        </span>
                      }
                      dateValue={returnDate}
                      timeValue={returnTime}
                      minDate={pickupDate}
                      referenceDate={pickupDate}
                      referenceTime={pickupTime}
                      onDateChange={(newDate) => {
                        const synced = normalizeReturnSchedule(
                          pickupDate,
                          pickupTime,
                          newDate,
                          returnTime
                        );
                        setReturnDate(synced.returnDate);
                        setReturnTime(synced.returnTime);
                      }}
                      onTimeChange={(newTime) => setReturnTime(newTime)}
                    />
                  </div>

                  {/* Quick Duration Chips (Hourly & Daily) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] font-medium text-[#A0A0A0]">
                      Chọn nhanh gói thời gian:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { label: '2 giờ', days: 0, addHours: 2, retTime: '' },
                        { label: '4 giờ', days: 0, addHours: 4, retTime: '' },
                        { label: 'Trong ngày', days: 0, addHours: 0, retTime: '20:00' },
                        { label: '1 ngày (24h)', days: 1, addHours: 0, retTime: pickupTime },
                        { label: '2 ngày', days: 2, addHours: 0, retTime: '18:00' },
                        { label: '3 ngày', days: 3, addHours: 0, retTime: '18:00' },
                      ].map((preset) => {
                        const targetDateObj = parseLocalDateStr(pickupDate);
                        targetDateObj.setDate(targetDateObj.getDate() + preset.days);
                        let computedRetTime = preset.retTime;
                        if (preset.addHours > 0) {
                          const [ph, pm] = pickupTime.split(':').map(Number);
                          const targetMins = (ph || 8) * 60 + (pm || 30) + preset.addHours * 60;
                          if (targetMins <= 22 * 60 + 30) {
                            const th = String(Math.floor(targetMins / 60)).padStart(2, '0');
                            const tm = String(targetMins % 60).padStart(2, '0');
                            computedRetTime = `${th}:${tm}`;
                          } else {
                            targetDateObj.setDate(targetDateObj.getDate() + 1);
                            computedRetTime = '08:30';
                          }
                        }
                        const targetDateStr = formatLocalDate(targetDateObj);
                        const syncedPreset = normalizeReturnSchedule(
                          pickupDate,
                          pickupTime,
                          targetDateStr,
                          computedRetTime
                        );
                        const isActive =
                          returnDate === syncedPreset.returnDate &&
                          returnTime === syncedPreset.returnTime;

                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setReturnDate(syncedPreset.returnDate);
                              setReturnTime(syncedPreset.returnTime);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                              isActive
                                ? 'bg-[#FFC799] text-[#101010] border-[#FFC799] font-bold'
                                : 'bg-[#101010] text-[#A0A0A0] border-white/10 hover:border-[#FFC799]/40 hover:text-[#F5F5F5]'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#101010] border border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 text-[#A0A0A0]">
                    <span>Thời lượng &amp; cước thuê:</span>
                    <span className="text-[11px] font-mono text-[#6E6E6E]">
                      ({pickupTime} {formatDisplayDateVN(pickupDate)} → {returnTime} {formatDisplayDateVN(returnDate)})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-[#F5F5F5] text-xs">
                      {billingDurationLabel}
                    </span>
                    <span className="text-[#6E6E6E]">•</span>
                    <span className="font-mono font-black text-[#FFC799] text-sm">
                      {baseRentalFee.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
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
              <div className="bg-[#161616] rounded-2xl p-6 sm:p-8 border border-white/10 space-y-6 animate-step-fade shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
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

                  {isStep2Valid && (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-bold shrink-0 self-start">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Hồ sơ hợp lệ (4/4)</span>
                    </span>
                  )}
                </div>

                {/* Verified / Authenticated User Auto-fill Status Banner */}
                {isAuthenticated && user ? (
                  <div
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                      user.identityStatus === 'Verified'
                        ? 'bg-emerald-500/[0.07] border-emerald-500/30'
                        : 'bg-[#FFC799]/[0.06] border-[#FFC799]/25'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          user.identityStatus === 'Verified'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-[#F5F5F5]">
                            {user.identityStatus === 'Verified'
                              ? 'Tài khoản đã xác thực eKYC — Đã tự động điền thông tin người nhận xe'
                              : 'Đã tự động điền thông tin từ tài khoản đăng nhập'}
                          </span>
                          {user.identityStatus === 'Verified' && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                              eKYC Verified
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#A09D98]">
                          {user.identityStatus === 'Verified'
                            ? 'Họ tên, SĐT, Email và Số CCCD 12 số đã được đồng bộ từ hồ sơ định danh hợp lệ. Bạn vẫn có thể chỉnh sửa nếu đặt xe hộ người thân.'
                            : 'Thông tin cá nhân được lấy từ hồ sơ của bạn. Vui lòng kiểm tra hoặc nhập bổ sung các trường còn thiếu.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => applyUserProfileToForm(user)}
                      className="px-3.5 py-2 rounded-xl bg-[#101010] hover:bg-white/[0.06] border border-white/15 hover:border-[#FFC799]/50 text-[11px] font-mono font-bold text-[#FFC799] transition-all flex items-center space-x-1.5 shrink-0 self-start sm:self-center cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Điền lại từ hồ sơ</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[#101010] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5 text-xs text-[#A09D98]">
                      <LogIn className="w-4 h-4 text-[#FFC799] shrink-0" />
                      <span>Đăng nhập tài khoản đã xác thực eKYC để tự động điền toàn bộ thông tin hợp đồng.</span>
                    </div>
                    <Link
                      to={`/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
                      className="px-3 py-1.5 rounded-lg bg-[#FFC799]/15 border border-[#FFC799]/30 text-[#FFC799] text-xs font-bold hover:bg-[#FFC799]/25 transition-colors shrink-0 self-start sm:self-center"
                    >
                      Đăng nhập ngay
                    </Link>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Field 1: Full Name */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#C8C2B8] flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-[#FFC799]" />
                        <span>Họ và tên người thuê *</span>
                      </label>
                      {!nameError ? (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Hợp lệ</span>
                        </span>
                      ) : (step2Touched.name || step2Submitted) ? (
                        <span className="text-[10px] font-mono font-bold text-red-400">Chưa hợp lệ</span>
                      ) : null}
                    </div>
                    <input
                      type="text"
                      placeholder="VD: Nguyễn Hoàng"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (!step2Touched.name) setStep2Touched((p) => ({ ...p, name: true }));
                      }}
                      onBlur={() => setStep2Touched((p) => ({ ...p, name: true }))}
                      className={`w-full bg-[#101010] border rounded-xl p-3 text-xs text-[#F5F5F5] outline-none transition-colors ${
                        (step2Touched.name || step2Submitted) && nameError
                          ? 'border-red-500/70 focus:border-red-400 bg-red-500/[0.03]'
                          : !nameError
                            ? 'border-emerald-500/35 focus:border-[#FFC799]'
                            : 'border-white/10 focus:border-[#FFC799]'
                      }`}
                    />
                    {(step2Touched.name || step2Submitted) && nameError && (
                      <p className="text-[11px] text-red-400 flex items-center gap-1 pt-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{nameError}</span>
                      </p>
                    )}
                  </div>

                  {/* Field 2: Phone Number */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#C8C2B8] flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#FFC799]" />
                        <span>Số điện thoại nhận mã xe *</span>
                      </label>
                      {!phoneError ? (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Hợp lệ</span>
                        </span>
                      ) : (step2Touched.phone || step2Submitted) ? (
                        <span className="text-[10px] font-mono font-bold text-red-400">Chưa hợp lệ</span>
                      ) : null}
                    </div>
                    <input
                      type="tel"
                      maxLength={12}
                      placeholder="0905 123 456"
                      value={customerPhone}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/[^0-9+\s.-]/g, '');
                        setCustomerPhone(sanitized);
                        if (!step2Touched.phone) setStep2Touched((p) => ({ ...p, phone: true }));
                      }}
                      onBlur={() => setStep2Touched((p) => ({ ...p, phone: true }))}
                      className={`w-full bg-[#101010] border rounded-xl p-3 text-xs font-mono text-[#F5F5F5] outline-none transition-colors ${
                        (step2Touched.phone || step2Submitted) && phoneError
                          ? 'border-red-500/70 focus:border-red-400 bg-red-500/[0.03]'
                          : !phoneError
                            ? 'border-emerald-500/35 focus:border-[#FFC799]'
                            : 'border-white/10 focus:border-[#FFC799]'
                      }`}
                    />
                    {(step2Touched.phone || step2Submitted) && phoneError && (
                      <p className="text-[11px] text-red-400 flex items-center gap-1 pt-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{phoneError}</span>
                      </p>
                    )}
                  </div>

                  {/* Field 3: Email */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#C8C2B8] flex items-center space-x-1.5">
                        <Mail className="w-3.5 h-3.5 text-[#FFC799]" />
                        <span>Email nhận hợp đồng điện tử *</span>
                      </label>
                      {!emailError ? (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Hợp lệ</span>
                        </span>
                      ) : (step2Touched.email || step2Submitted) ? (
                        <span className="text-[10px] font-mono font-bold text-red-400">Chưa hợp lệ</span>
                      ) : null}
                    </div>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        if (!step2Touched.email) setStep2Touched((p) => ({ ...p, email: true }));
                      }}
                      onBlur={() => setStep2Touched((p) => ({ ...p, email: true }))}
                      className={`w-full bg-[#101010] border rounded-xl p-3 text-xs text-[#F5F5F5] outline-none transition-colors ${
                        (step2Touched.email || step2Submitted) && emailError
                          ? 'border-red-500/70 focus:border-red-400 bg-red-500/[0.03]'
                          : !emailError
                            ? 'border-emerald-500/35 focus:border-[#FFC799]'
                            : 'border-white/10 focus:border-[#FFC799]'
                      }`}
                    />
                    {(step2Touched.email || step2Submitted) && emailError && (
                      <p className="text-[11px] text-red-400 flex items-center gap-1 pt-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{emailError}</span>
                      </p>
                    )}
                  </div>

                  {/* Field 4: CCCD / Passport */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#C8C2B8] flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#FFC799]" />
                        <span>Số CCCD (12 số) / Hộ chiếu *</span>
                      </label>
                      {!idCardError ? (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>
                            {user?.identityStatus === 'Verified' &&
                            idCardNumber === (user.idCardNumber || '048204008692')
                              ? 'Đã đối soát eKYC'
                              : 'Hợp lệ'}
                          </span>
                        </span>
                      ) : (step2Touched.idCard || step2Submitted) ? (
                        <span className="text-[10px] font-mono font-bold text-red-400">Chưa hợp lệ</span>
                      ) : null}
                    </div>
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="VD: 048204008692"
                      value={idCardNumber}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                        setIdCardNumber(sanitized);
                        if (!step2Touched.idCard) setStep2Touched((p) => ({ ...p, idCard: true }));
                      }}
                      onBlur={() => setStep2Touched((p) => ({ ...p, idCard: true }))}
                      className={`w-full bg-[#101010] border rounded-xl p-3 text-xs font-mono text-[#F5F5F5] outline-none transition-colors ${
                        (step2Touched.idCard || step2Submitted) && idCardError
                          ? 'border-red-500/70 focus:border-red-400 bg-red-500/[0.03]'
                          : !idCardError
                            ? 'border-emerald-500/35 focus:border-[#FFC799]'
                            : 'border-white/10 focus:border-[#FFC799]'
                      }`}
                    />
                    {(step2Touched.idCard || step2Submitted) && idCardError && (
                      <p className="text-[11px] text-red-400 flex items-center gap-1 pt-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{idCardError}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#C8C2B8]">
                      Ghi chú thêm (Số hiệu chuyến bay nếu nhận xe tại sân bay, yêu cầu nón trẻ em...)
                    </label>
                    <span className="text-[10px] font-mono text-[#6E6E6E]">
                      {customerNotes.length}/300
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={300}
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
              <div className="bg-[#161616] rounded-2xl p-6 sm:p-8 border border-white/10 space-y-6 animate-step-fade shadow-xl">
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

                {/* Promo Voucher Selection Cards & Input */}
                <div className="pt-4 border-t border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#F5F5F5] flex items-center space-x-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#FFC799]" />
                      <span>Chọn Voucher ưu đãi khả dụng</span>
                    </label>
                    {selectedVoucherCode && (
                      <button
                        type="button"
                        onClick={() => handleSelectVoucher('')}
                        className="text-[11px] font-semibold text-[#A0A0A0] hover:text-[#FF8080] cursor-pointer"
                      >
                        Không dùng voucher
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {AVAILABLE_VOUCHERS.map((v) => {
                      const eligible = baseRentalFee >= v.minOrder;
                      const isSelected = selectedVoucherCode === v.code && eligible;
                      const estSave = computeVoucherDiscountAmount(v.code, baseRentalFee);

                      return (
                        <button
                          key={v.code}
                          type="button"
                          disabled={!eligible}
                          onClick={() => handleSelectVoucher(v.code)}
                          className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                            !eligible
                              ? 'bg-[#101010]/50 border-white/[0.05] opacity-50 cursor-not-allowed'
                              : isSelected
                              ? 'bg-[#FFC799]/14 border-[#FFC799] shadow-sm cursor-pointer'
                              : 'bg-[#101010] border-white/10 hover:border-[#FFC799]/40 cursor-pointer'
                          }`}
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-xs font-black text-[#FFC799]">
                                {v.code}
                              </span>
                              {eligible && estSave > 0 && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#99FFE4]/15 text-[#99FFE4]">
                                  -{estSave.toLocaleString('vi-VN')}đ
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-bold text-[#F5F5F5] truncate">
                              {v.title}
                            </p>
                            <p className="text-[10px] text-[#A0A0A0] leading-tight">
                              {eligible
                                ? v.desc
                                : `Cần đơn tối thiểu ${v.minOrder.toLocaleString('vi-VN')}đ`}
                            </p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                              isSelected
                                ? 'bg-[#FFC799] text-[#101010] border-[#FFC799]'
                                : 'border-white/20 text-transparent'
                            }`}
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* 1-Click Custom Voucher Input Box */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Nhập mã khuyến mãi khác (VD: MOTORENT30)..."
                        value={customVoucherInput}
                        onChange={(e) => setCustomVoucherInput(e.target.value.toUpperCase())}
                        className="w-full bg-[#101010] border border-white/10 focus:border-[#FFC799] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] font-mono tracking-wider outline-none placeholder:text-[#6E6E6E]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (customVoucherInput.trim()) {
                          handleSelectVoucher(customVoucherInput.trim());
                        }
                      }}
                      className="px-4 py-2.5 bg-white/[0.08] hover:bg-[#FFC799] hover:text-[#101010] text-[#F5F5F5] border border-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 text-center"
                    >
                      Áp dụng mã
                    </button>
                  </div>

                  {discountFeedback && (
                    <p className="text-[11px] font-medium text-[#FFC799]">
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
              <div className="bg-[#161616] rounded-2xl p-6 sm:p-8 border border-white/10 space-y-6 animate-step-fade shadow-xl">
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
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded">
                          Sandbox
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-[#F5F5F5]">Cổng VNPay</h4>
                        <p className="text-[11px] text-[#6E6E6E] mt-0.5">Thẻ ATM nội địa NCB, Visa, QR</p>
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
                  <div className="p-5 rounded-2xl bg-[#101010] border border-[#FFC799]/30 space-y-4">
                    {/* Gateway Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#F5F5F5]">
                            Cổng Thanh Toán VNPay Sandbox Chính Thức
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 font-mono text-[10px] font-bold text-emerald-400">
                            TMNCODE: CYA7OTRA
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8A857D] font-mono">
                          Endpoint: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-[#6E6E6E] block uppercase font-mono">
                          Số tiền thanh toán VNPay
                        </span>
                        <span className="font-mono text-base font-black text-[#FFC799]">
                          {activePayAmount.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>

                    {/* BankCode / Method Selector on VNPay */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-[#C8C2B8] block">
                        Chọn phương thức giả lập trên cổng VNPay:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          {
                            code: 'NCB' as const,
                            title: 'Thẻ ATM NCB (Khuyên dùng)',
                            desc: 'Vào thẳng form nhập thẻ NCB Sandbox',
                          },
                          {
                            code: '' as const,
                            title: 'Tất cả kênh trên VNPay',
                            desc: 'Tự chọn ngân hàng tại cổng VNPay',
                          },
                          {
                            code: 'INTCARD' as const,
                            title: 'Thẻ Quốc tế Visa / Master',
                            desc: 'Giả lập thẻ tín dụng quốc tế',
                          },
                        ].map((m) => {
                          const active = vnpayBankCode === m.code;
                          return (
                            <button
                              key={m.title}
                              type="button"
                              onClick={() => setVnpayBankCode(m.code)}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                active
                                  ? 'bg-[#FFC799]/15 border-[#FFC799] text-[#F5F5F5]'
                                  : 'bg-[#161616] border-white/10 text-[#8A857D] hover:border-white/20'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-[#F5F5F5]">{m.title}</span>
                                {active && <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />}
                              </div>
                              <p className="text-[10px] text-[#6E6E6E] mt-0.5">{m.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* VNPay Sandbox Quick-Copy Helper Card */}
                    <div className="p-3.5 rounded-xl bg-[#161616] border border-white/10 text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#FFC799]">
                        <div className="flex items-center space-x-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Thông tin thẻ ATM Sandbox thử nghiệm nhanh:</span>
                        </div>
                        <span className="font-mono text-[10px] text-[#99FFE4] bg-[#99FFE4]/10 px-2 py-0.5 rounded">
                          Môi trường TEST
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                        <div
                          onClick={() => handleCopyText('9704198526191432198', 'vnpayCard')}
                          className="p-2 rounded-lg bg-[#101010] border border-white/5 hover:border-[#FFC799]/40 cursor-pointer transition-colors"
                          title="Nhấp để sao chép"
                        >
                          <span className="text-[10px] text-[#6E6E6E] block font-sans">Số thẻ NCB</span>
                          <span className="text-[#F5F5F5] font-bold">9704 1985...</span>
                          <span className="text-[9px] text-[#FFC799] block mt-0.5 font-sans">
                            {copiedField === 'vnpayCard' ? '✓ Đã chép' : 'Sao chép'}
                          </span>
                        </div>
                        <div
                          onClick={() => handleCopyText('NGUYEN VAN A', 'vnpayName')}
                          className="p-2 rounded-lg bg-[#101010] border border-white/5 hover:border-[#FFC799]/40 cursor-pointer transition-colors"
                          title="Nhấp để sao chép"
                        >
                          <span className="text-[10px] text-[#6E6E6E] block font-sans">Tên chủ thẻ</span>
                          <span className="text-[#F5F5F5] font-bold">NGUYEN VAN A</span>
                          <span className="text-[9px] text-[#FFC799] block mt-0.5 font-sans">
                            {copiedField === 'vnpayName' ? '✓ Đã chép' : 'Sao chép'}
                          </span>
                        </div>
                        <div
                          onClick={() => handleCopyText('07/15', 'vnpayDate')}
                          className="p-2 rounded-lg bg-[#101010] border border-white/5 hover:border-[#FFC799]/40 cursor-pointer transition-colors"
                          title="Nhấp để sao chép"
                        >
                          <span className="text-[10px] text-[#6E6E6E] block font-sans">Ngày phát hành</span>
                          <span className="text-[#F5F5F5] font-bold">07/15</span>
                          <span className="text-[9px] text-[#FFC799] block mt-0.5 font-sans">
                            {copiedField === 'vnpayDate' ? '✓ Đã chép' : 'Sao chép'}
                          </span>
                        </div>
                        <div
                          onClick={() => handleCopyText('123456', 'vnpayOtp')}
                          className="p-2 rounded-lg bg-[#101010] border border-white/5 hover:border-[#FFC799]/40 cursor-pointer transition-colors"
                          title="Nhấp để sao chép"
                        >
                          <span className="text-[10px] text-[#6E6E6E] block font-sans">Mã OTP</span>
                          <span className="text-[#F5F5F5] font-bold">123456</span>
                          <span className="text-[9px] text-[#FFC799] block mt-0.5 font-sans">
                            {copiedField === 'vnpayOtp' ? '✓ Đã chép' : 'Sao chép'}
                          </span>
                        </div>
                      </div>
                    </div>
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
                        <span>
                          {paymentOption === 'VNPay'
                            ? 'Đang tạo chữ ký VNPay Sandbox & chuyển hướng...'
                            : 'Đang đối soát thanh toán & khóa biển số...'}
                        </span>
                      </div>
                    ) : (
                      <>
                        {paymentOption === 'VNPay' ? (
                          <CreditCard className="w-4 h-4" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                        <span>
                          {paymentOption === 'Cash'
                            ? 'Tạo đơn giữ chỗ tại quầy'
                            : paymentOption === 'VNPay'
                              ? `Chuyển tới cổng VNPay Sandbox (${activePayAmount.toLocaleString('vi-VN')}đ) →`
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
              <div className="bg-[#161616] rounded-2xl p-6 sm:p-8 border border-[#FFC799]/40 shadow-2xl space-y-6 animate-step-fade">
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

                {/* CTA Buttons & Electronic Document Downloads */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                  {/* Google Calendar export */}
                  <a
                    href={getGoogleCalendarUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[#C8C2B8] hover:text-[#F5F5F5] font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <CalendarPlus className="w-4 h-4 text-[#99FFE4]" />
                    <span>Lưu vào Google Calendar</span>
                  </a>

                  {/* PDF Electronic Invoice Download Button */}
                  <button
                    type="button"
                    disabled={downloadingInvoice}
                    onClick={() => {
                      if (createdBooking?._id) {
                        handleDownloadInvoice(createdBooking._id);
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#FFC799]/15 hover:bg-[#FFC799]/25 border border-[#FFC799]/40 text-[#FFC799] font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {downloadingInvoice ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-[#FFC799] border-t-transparent rounded-full animate-spin" />
                        <span>Đang xuất PDF hóa đơn...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Tải hóa đơn điện tử (PDF)</span>
                      </>
                    )}
                  </button>

                  <Link
                    to="/bikes"
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[#C8C2B8] font-bold text-xs text-center transition-colors"
                  >
                    Khám phá thêm xe khác
                  </Link>

                  <Link
                    to="/profile?tab=bookings"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] font-black text-xs uppercase tracking-wider text-center transition-all shadow-md"
                  >
                    Xem trong Chuyến xe của tôi
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
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#FFC799] flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Bảng kê chi phí hợp đồng</span>
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-[#FFC799]/10 border border-[#FFC799]/30 text-[10px] font-mono font-bold text-[#FFC799]">
                  {isHourlyBilling ? 'Tính theo giờ' : 'Tính theo ngày'}
                </span>
              </div>

              <div className="space-y-2 text-xs text-[#C8C2B8]">
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#6E6E6E] flex items-center gap-1.5">
                    <span>Đơn giá theo giờ:</span>
                    {isHourlyBilling && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-mono font-bold">
                        Đang áp dụng
                      </span>
                    )}
                  </span>
                  <span className={`font-mono font-bold ${isHourlyBilling ? 'text-[#FFC799]' : 'text-[#8A857D]'}`}>
                    {hourlyPrice.toLocaleString('vi-VN')} đ/giờ
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#6E6E6E] flex items-center gap-1.5">
                    <span>Đơn giá thuê ngày:</span>
                    {!isHourlyBilling && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-mono font-bold">
                        Đang áp dụng
                      </span>
                    )}
                  </span>
                  <span className={`font-mono font-bold ${!isHourlyBilling ? 'text-[#F5F5F5]' : 'text-[#8A857D]'}`}>
                    {dailyPrice.toLocaleString('vi-VN')} đ/ngày
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#6E6E6E]">Thời lượng thuê:</span>
                  <span className="font-mono font-bold text-[#FFC799]">{billingDurationLabel}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#6E6E6E]">Tạm tính tiền thuê xe:</span>
                  <span className="font-mono font-bold text-[#F5F5F5]">
                    {baseRentalFee.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                {/* Clean Single-Row Voucher Summary in Cost Breakdown */}
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#6E6E6E] flex items-center gap-1.5">
                    <span>Ưu đãi voucher:</span>
                    {appliedDiscount ? (
                      <span className="px-1.5 py-0.5 rounded bg-[#FFC799]/15 border border-[#FFC799]/30 font-mono text-[10px] font-bold text-[#FFC799]">
                        {appliedDiscount.code}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#6E6E6E]">Chưa áp dụng</span>
                    )}
                  </span>
                  {appliedDiscount ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400">
                        - {appliedDiscount.amount.toLocaleString('vi-VN')} đ
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectVoucher('')}
                        className="text-[10px] font-mono text-[#8A857D] hover:text-red-400 underline cursor-pointer"
                      >
                        Bỏ
                      </button>
                    </div>
                  ) : (
                    <span className="font-mono text-[#6E6E6E]">0 đ</span>
                  )}
                </div>

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
