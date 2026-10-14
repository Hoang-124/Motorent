import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  Share2, 
  Download,
  Building2,
  LogIn
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

export const BookingPage: React.FC = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Data states
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Stepper state: 1 -> 2 -> 3 -> 4 -> 5 (Success)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Vehicle Angle showcase
  const [activeAngle, setActiveAngle] = useState<number>(1); // Mặc định 1: Ngang xe
  const [imgError, setImgError] = useState<boolean>(false);

  // Form Step 1: Schedule & Location
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

  // Form Step 2: Customer Identity
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [idCardNumber, setIdCardNumber] = useState<string>('');
  const [licenseNumber, setLicenseNumber] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');

  // Form Step 3: Perks & Discount
  const [discountCodeInput, setDiscountCodeInput] = useState<string>('CHAOBANMOI');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>({
    code: 'CHAOBANMOI',
    amount: 20000,
  });
  const [discountFeedback, setDiscountFeedback] = useState<string>('Đã tự động áp dụng mã ưu đãi chào bạn mới (-20.000đ)');

  // Form Step 4: Payment selection
  const [paymentOption, setPaymentOption] = useState<'VietQR' | 'VNPay' | 'Cash'>('VietQR');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Created Booking response
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

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

          const defaultBranchId = typeof vehData.branchId === 'object' && vehData.branchId !== null 
            ? vehData.branchId._id 
            : vehData.branchId;
          setPickupBranchId(defaultBranchId || branchList[0]?._id || '');
          setReturnBranchId(defaultBranchId || branchList[0]?._id || '');
        } else {
          // If no vehicleId or not found, fallback to first available
          const allVehRes = await api.get('/vehicles?status=Available&limit=1');
          const firstVeh = allVehRes.data?.data?.vehicles?.[0] || allVehRes.data?.vehicles?.[0];
          if (firstVeh) {
            setVehicle(firstVeh);
            const defaultBranchId = typeof firstVeh.branchId === 'object' ? firstVeh.branchId._id : firstVeh.branchId;
            setPickupBranchId(defaultBranchId || branchList[0]?._id || '');
            setReturnBranchId(defaultBranchId || branchList[0]?._id || '');
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
  }, [vehicleId]);

  // Autofill from user profile
  useEffect(() => {
    if (user) {
      const fullName = [user.lastName, user.firstName].filter(Boolean).join(' ') || user.username || '';
      setCustomerName(fullName);
      setCustomerPhone(user.phoneNumber || '');
      setCustomerEmail(user.email || '');
    }
  }, [user]);

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

  // Submit Booking to Backend
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
        setCreatedBooking(res.data.data);
        setCurrentStep(5); // Chuyển sang bước thành công
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMsg(res.data?.message || 'Không thể tạo đơn đặt xe.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const serverMsg = err.response?.data?.message;
        if (err.response?.status === 409) {
          setErrorMsg(serverMsg || 'Phương tiện đã có khách khác đặt trong khoảng thời gian này. Vui lòng chọn xe khác.');
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
  const isManual = vehicle?.transmissionType === 'Manual';

  const pickupBranch = branches.find(b => b._id === pickupBranchId);
  const returnBranch = branches.find(b => b._id === returnBranchId);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Đang tải thông tin xe & cấu hình đặt chỗ...
          </p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4">
        <div className="bg-[#0D131F] p-8 rounded-[2rem] border border-white/10 text-center max-w-md w-full space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-black text-white">Không tìm thấy xe</h2>
          <p className="text-xs text-slate-400">
            Phương tiện bạn tìm kiếm hiện không tồn tại hoặc đã được chuyển giao sang chi nhánh khác.
          </p>
          <Link
            to="/bikes"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-xs transition-colors"
          >
            <span>Khám phá đội xe sẵn sàng</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-xs text-slate-400 mb-6">
          <Link to="/" className="hover:text-amber-400 transition-colors">Trang chủ</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <Link to="/bikes" className="hover:text-amber-400 transition-colors">Đội xe chính hãng</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-white font-semibold truncate max-w-xs">{vehicle.vehicleModel}</span>
        </nav>

        {/* Dynamic Stepper Header */}
        <div className="bg-[#0D131F] rounded-3xl p-5 border border-white/10 shadow-xl mb-8">
          <div className="flex items-center justify-between max-w-3xl mx-auto relative">
            {/* Progress line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 -translate-y-1/2 z-0" />
            <div 
              className="absolute top-1/2 left-0 h-0.5 bg-orange-500 -translate-y-1/2 z-0 transition-all duration-500" 
              style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
            />

            {/* Steps */}
            {[
              { num: 1, label: 'Lịch trình' },
              { num: 2, label: 'Khách hàng' },
              { num: 3, label: 'Dịch vụ' },
              { num: 4, label: 'Cọc 30%' },
              { num: 5, label: 'Hoàn tất' },
            ].map((st) => (
              <div key={st.num} className="relative z-10 flex flex-col items-center">
                <div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    currentStep >= st.num 
                      ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30' 
                      : 'bg-[#0B101D] border border-white/20 text-slate-400'
                  }`}
                >
                  {currentStep > st.num ? <Check className="w-4 h-4 stroke-[3]" /> : st.num}
                </div>
                <span className={`text-[11px] font-bold mt-2 whitespace-nowrap hidden sm:block ${
                  currentStep >= st.num ? 'text-amber-400' : 'text-slate-500'
                }`}>
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
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Guest Banner if not logged in */}
            {!isAuthenticated && currentStep < 5 && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-amber-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                  <span>Đăng nhập để tự động lưu thông tin hợp đồng và tích điểm thành viên.</span>
                </div>
                <Link
                  to={`/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-black rounded-lg transition-colors flex items-center space-x-1 flex-shrink-0 ml-3"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </Link>
              </div>
            )}

            {/* STEP 1: Schedule & Branches */}
            {currentStep === 1 && (
              <div className="bg-[#0D131F] rounded-[2rem] p-6 sm:p-8 border border-white/10 shadow-xl space-y-6">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                    Bước 1 / 4
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Chọn lịch trình & Điểm đón trả xe
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Motorent hỗ trợ nhận xe tại Sân bay Đà Nẵng và trả tự do tại Bãi biển Mỹ Khê phụ phí 0đ.
                  </p>
                </div>

                {/* Branches Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>Chi nhánh nhận xe</span>
                    </label>
                    <select
                      value={pickupBranchId}
                      onChange={(e) => setPickupBranchId(e.target.value)}
                      className="w-full bg-[#0B101D] border border-white/10 rounded-xl p-3 text-xs font-semibold text-white focus:border-amber-500 outline-none cursor-pointer"
                    >
                      {branches.map((b) => (
                        <option key={b._id} value={b._id} className="bg-[#0D131F] text-white">
                          {b.name}
                        </option>
                      ))}
                    </select>
                    {pickupBranch && (
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Địa chỉ: {pickupBranch.address} ({pickupBranch.hours_open} - {pickupBranch.hours_close})
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-400" />
                      <span>Chi nhánh trả xe</span>
                    </label>
                    <select
                      value={returnBranchId}
                      onChange={(e) => setReturnBranchId(e.target.value)}
                      className="w-full bg-[#0B101D] border border-white/10 rounded-xl p-3 text-xs font-semibold text-white focus:border-amber-500 outline-none cursor-pointer"
                    >
                      {branches.map((b) => (
                        <option key={b._id} value={b._id} className="bg-[#0D131F] text-white">
                          {b.name}
                        </option>
                      ))}
                    </select>
                    {returnBranch && (
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Địa chỉ: {returnBranch.address} ({returnBranch.hours_open} - {returnBranch.hours_close})
                      </p>
                    )}
                  </div>
                </div>

                {/* Dates & Times */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Thời điểm nhận xe</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={pickupDate}
                        min={formatLocalDate(new Date())}
                        onChange={(e) => setPickupDate(e.target.value)}
                        className="bg-[#0B101D] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500"
                      />
                      <input
                        type="time"
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="bg-[#0B101D] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-teal-400 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Thời điểm trả xe</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={returnDate}
                        min={pickupDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="bg-[#0B101D] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500"
                      />
                      <input
                        type="time"
                        value={returnTime}
                        onChange={(e) => setReturnTime(e.target.value)}
                        className="bg-[#0B101D] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between text-xs">
                  <span className="text-slate-300">Tổng thời gian dự kiến:</span>
                  <span className="font-black text-amber-400 text-sm">
                    {durationDays} ngày ({Math.round(durationMs / 3600000)} giờ)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/30 active:scale-98 cursor-pointer"
                >
                  <span>Tiếp tục: Thông tin người thuê</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 2: Customer Identity & eKYC */}
            {currentStep === 2 && (
              <div className="bg-[#0D131F] rounded-[2rem] p-6 sm:p-8 border border-white/10 shadow-xl space-y-6">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                    Bước 2 / 4
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Thông tin người lái xe & Hợp đồng số hóa
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Cam kết: Motorent <strong>100% không giữ bản gốc CCCD/Hộ chiếu</strong>, nhân viên chỉ đối soát nhanh tại quầy.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>Họ và tên người thuê *</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-[#0B101D] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      <span>Số điện thoại (Nhận SMS mã xe) *</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="0905 123 456"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-[#0B101D] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-amber-400" />
                      <span>Email nhận hợp đồng điện tử</span>
                    </label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full bg-[#0B101D] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>Số CCCD / Hộ chiếu (Tùy chọn)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="04809..."
                      value={idCardNumber}
                      onChange={(e) => setIdCardNumber(e.target.value)}
                      className="w-full bg-[#0B101D] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Ghi chú thêm (Số hiệu chuyến bay nếu nhận xe tại sân bay, yêu cầu nón trẻ em...)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VD: Chuyến bay VJ628 hạ cánh lúc 09:15, nhờ giao xe tại sảnh Ga đến T2..."
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    className="w-full bg-[#0B101D] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="py-3.5 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors flex items-center space-x-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/30 active:scale-98 cursor-pointer"
                  >
                    <span>Tiếp tục: Dịch vụ & Ưu đãi</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Included Perks & Voucher Promo */}
            {currentStep === 3 && (
              <div className="bg-[#0D131F] rounded-[2rem] p-6 sm:p-8 border border-white/10 shadow-xl space-y-6">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                    Bước 3 / 4
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Gói tiện ích đi kèm & Mã khuyến mãi
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Tất cả phụ kiện chất lượng cao đã được chuẩn bị đầy đủ sẵn sàng theo xe.
                  </p>
                </div>

                {/* Free Included Perks */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 bg-white/[0.03] border border-white/5 rounded-2xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">2 Mũ bảo hiểm 3/4 kính chắn gió</h4>
                        <p className="text-[11px] text-slate-400">Đã khử khuẩn tia cực tím UV và thay lớp lót mới</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-400">Miễn phí 0đ</span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-white/[0.03] border border-white/5 rounded-2xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">2 Áo mưa cánh dơi phản quang</h4>
                        <p className="text-[11px] text-slate-400">Chất liệu PVC dày dặn, an toàn khi trời mưa đèo</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-400">Miễn phí 0đ</span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-white/[0.03] border border-white/5 rounded-2xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Giá đỡ điện thoại kim loại chống rung OIS</h4>
                        <p className="text-[11px] text-slate-400">Chống hỏng cảm biến camera điện thoại khi xem bản đồ</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-400">Miễn phí 0đ</span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-white/[0.03] border border-white/5 rounded-2xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Cứu hộ khẩn cấp 24/7 Đà Nẵng & Hội An</h4>
                        <p className="text-[11px] text-slate-400">Đổi xe tận nơi trong vòng 30 phút nếu gặp sự cố thủng lốp, hỏng hóc</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-400">Miễn phí 0đ</span>
                  </div>
                </div>

                {/* Promo Voucher Input */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mã giảm giá / Voucher ưu đãi</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Nhập mã (VD: CHAOBANMOI)"
                      value={discountCodeInput}
                      onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-[#0B101D] border border-white/10 rounded-xl p-3 text-xs font-mono font-bold text-amber-400 uppercase outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyDiscount}
                      className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
                    >
                      Áp dụng
                    </button>
                  </div>
                  {discountFeedback && (
                    <p className={`text-[11px] font-medium ${appliedDiscount ? 'text-amber-400' : 'text-amber-400'}`}>
                      {discountFeedback}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="py-3.5 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors flex items-center space-x-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/30 active:scale-98 cursor-pointer"
                  >
                    <span>Tiếp tục: Thanh toán Cọc 30%</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Deposit Payment (VNPay / VietQR) */}
            {currentStep === 4 && (
              <div className="bg-[#0D131F] rounded-[2rem] p-6 sm:p-8 border border-white/10 shadow-xl space-y-6">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                    Bước 4 / 4
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Phương thức thanh toán Cọc 30%
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Số tiền cọc khóa giữ xe: <strong className="text-amber-400 text-sm">{depositAmount.toLocaleString('vi-VN')} đ</strong>. 70% còn lại thanh toán khi nhận xe.
                  </p>
                </div>

                {/* Payment Option Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setPaymentOption('VietQR')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      paymentOption === 'VietQR'
                        ? 'bg-amber-500/10 border-amber-500 shadow-md'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <QrCode className="w-5 h-5 text-amber-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded-full">
                        Khuyên dùng
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">VietQR 24/7</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Quét mã chuyển khoản nhanh mọi ngân hàng</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setPaymentOption('VNPay')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      paymentOption === 'VNPay'
                        ? 'bg-amber-500/10 border-amber-500 shadow-md'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <CreditCard className="w-5 h-5 text-teal-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">Cổng VNPay</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Thẻ ATM nội địa, Visa, Mastercard</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setPaymentOption('Cash')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      paymentOption === 'Cash'
                        ? 'bg-amber-500/10 border-amber-500 shadow-md'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Building2 className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">Cọc tại quầy</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Giữ chỗ 30 phút để đến chi nhánh nhận xe</p>
                    </div>
                  </div>
                </div>

                {/* VietQR Dynamic Preview Box */}
                {paymentOption === 'VietQR' && (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0B0F17] via-[#161F30] to-[#0D1524] border border-amber-500/30 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      <div className="bg-white p-3 rounded-2xl shadow-xl flex flex-col items-center">
                        <img
                          src={`https://api.vietqr.io/image/970422-0905123456-compact2.jpg?amount=${depositAmount}&addInfo=MOTORENT%20COC%20${vehicle.licensePlate.replace(/\s+/g, '')}&accountName=CONG%20TY%20MOTORENT`}
                          alt="VietQR Chuyển khoản"
                          className="w-36 h-36 object-contain"
                        />
                        <span className="text-[9px] font-black text-slate-800 mt-1 uppercase tracking-tight">
                          Quét mã bằng app ngân hàng
                        </span>
                      </div>

                      <div className="flex-1 space-y-2 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-white/10">
                          <span className="text-slate-400">Ngân hàng thụ hưởng:</span>
                          <span className="font-bold text-white">MB Bank (Quân Đội)</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-white/10">
                          <span className="text-slate-400">Số tài khoản:</span>
                          <span className="font-mono font-bold text-amber-400">0905 123 456</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-white/10">
                          <span className="text-slate-400">Chủ tài khoản:</span>
                          <span className="font-bold text-white uppercase">CONG TY TNHH MOTORENT</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-white/10">
                          <span className="text-slate-400">Số tiền cọc:</span>
                          <span className="font-mono font-black text-amber-200 text-sm">
                            {depositAmount.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="text-slate-400">Nội dung CK:</span>
                          <span className="font-mono font-bold text-amber-300">
                            MOTORENT {vehicle.licensePlate}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed italic">
                      Hệ thống tự động kích hoạt trạng thái "Đã cọc thành công" trong vòng 10-30 giây sau khi ngân hàng xác nhận giao dịch.
                    </p>
                  </div>
                )}

                {paymentOption === 'VNPay' && (
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-xs text-slate-300 space-y-2">
                    <p>
                      Sau khi bấm <strong>"Xác nhận cọc & Khóa xe"</strong>, bạn sẽ được chuyển hướng an toàn tới Cổng thanh toán quốc gia VNPay để thanh toán qua thẻ ATM, QR Pay hoặc thẻ Visa/Mastercard.
                    </p>
                  </div>
                )}

                {/* Refund & Guarantee Notice */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 space-y-1.5">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Chính sách bảo vệ quyền lợi người thuê</span>
                  </div>
                  <p>
                    • Hoàn lại 100% tiền cọc không mất phí nếu báo hủy chuyến trước 24 giờ so với giờ nhận xe.
                  </p>
                  <p>
                    • Biển số xe <strong className="text-white">{vehicle.licensePlate}</strong> được khóa độc quyền cho bạn trên toàn hệ thống ngay sau khi tạo đơn.
                  </p>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="py-3.5 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors flex items-center space-x-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại</span>
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleConfirmBooking}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 disabled:opacity-50 text-white font-black text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/30 active:scale-98 cursor-pointer"
                  >
                    {submitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                        <span>Đang khóa giữ xe trên hệ thống...</span>
                      </div>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Xác nhận cọc & Khóa xe ngay</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Success & Confirmation Ticket */}
            {currentStep === 5 && (
              <div className="bg-[#0D131F] rounded-[2rem] p-6 sm:p-8 border border-amber-500/40 shadow-2xl text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                    Đã xác nhận đặt xe thành công
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    Biển số xe đã được khóa cho bạn!
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                    Đơn giữ chỗ đã được đồng bộ vào hệ thống quản lý chi nhánh. Vui lòng xuất trình mã đơn hoặc mã QR khi đến nhận xe.
                  </p>
                </div>

                {/* Booking Code Card */}
                <div className="max-w-md mx-auto p-4 bg-gradient-to-r from-[#0B0F17] via-[#161F30] to-[#0D1524] border border-amber-500/40 rounded-2xl space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Mã đặt xe điện tử (Check-in Code)
                  </span>
                  <div className="flex items-center justify-center space-x-3">
                    <span className="font-mono text-2xl font-black text-amber-400 tracking-wider">
                      {createdBooking?.bookingCode || 'MV-88692'}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdBooking?.bookingCode || 'MV-88692')}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
                      title="Sao chép mã"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-amber-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Ticket Details Summary */}
                <div className="max-w-md mx-auto text-left p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-2.5 text-xs text-slate-300">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Dòng xe:</span>
                    <span className="font-bold text-white">{vehicle.vehicleModel} ({vehicle.licensePlate})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Thời gian nhận:</span>
                    <span className="font-semibold text-amber-200">{pickupTime} ngày {pickupDate}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Điểm nhận xe:</span>
                    <span className="font-semibold text-white">{pickupBranch?.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Tiền cọc giữ xe (30%):</span>
                    <span className="font-mono font-bold text-amber-400">{depositAmount.toLocaleString('vi-VN')} đ (Đã xác nhận)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Thanh toán khi nhận xe (70%):</span>
                    <span className="font-mono font-bold text-white">{remainingAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Link
                    to="/profile"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-xs transition-all shadow-lg shadow-orange-500/30"
                  >
                    Quản lý lịch trình trong Hồ sơ
                  </Link>

                  <Link
                    to="/bikes"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors"
                  >
                    Xem thêm các xe khác
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Sticky Vehicle 3-Angle Studio Showcase & Price Card */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            
            {/* 3-Angle Studio Showcase Stage */}
            <div className="bg-[#0D131F] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-5 pb-3 flex items-center justify-between border-b border-white/5">
                <div>
                  <h3 className="text-base font-black text-white">
                    {vehicle.vehicleModel}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Biển số: {vehicle.licensePlate} • Đời {vehicle.yearManufactured || 2024}
                  </p>
                </div>
                {vehicle.color && (
                  <span className="text-[10px] font-semibold text-slate-300 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                    {vehicle.color}
                  </span>
                )}
              </div>

              {/* Full Bike Showcase — Phóng Full Ảnh Chân Thực */}
              <div className="relative w-full h-56 bg-white overflow-hidden flex items-center justify-center">
                
                {/* Angle Title Pill */}
                <div className="absolute top-3 left-4 z-20 flex items-center space-x-1.5 bg-[#0B101D]/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20 text-[10px] font-semibold text-amber-200 shadow-md">
                  <Camera className="w-3 h-3 text-amber-400" />
                  <span>{ANGLE_VIEWS.find(a => a.id === activeAngle)?.title}</span>
                </div>

                {/* Main Bike Image: Expanded Full */}
                <div className="w-full h-full flex items-center justify-center overflow-hidden">
                  {vehicle.images && vehicle.images[activeAngle] && !imgError ? (
                    <img
                      src={getOptimizedVehicleImageUrl(vehicle.images[activeAngle])}
                      alt={`${vehicle.vehicleModel} - ${ANGLE_VIEWS.find(a => a.id === activeAngle)?.title}`}
                      loading="lazy"
                      decoding="async"
                      crossOrigin="anonymous"
                      onError={() => setImgError(true)}
                      className="w-full h-full object-contain scale-[1.38] sm:scale-[1.42] transition-transform duration-300"
                    />
                  ) : (
                    <div className="py-4 flex flex-col items-center justify-center">
                      <svg
                        className="w-36 h-24 text-orange-500"
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
                <div className="absolute bottom-2.5 left-4 z-20 flex items-center bg-[#0B101D]/90 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 shadow-md space-x-1.5">
                  {ANGLE_VIEWS.map((ang) => (
                    <button
                      key={ang.id}
                      type="button"
                      onClick={() => {
                        setActiveAngle(ang.id);
                        setImgError(false);
                      }}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight transition-all cursor-pointer ${
                        activeAngle === ang.id
                          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-sm font-black'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {ang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specs Pills */}
              <div className="px-5 pb-5 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center space-x-2 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                  <Gauge className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">Đã vận hành</span>
                    <span className="font-bold text-slate-200">{vehicle.odometer.toLocaleString('vi-VN')} km</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                  {isElectric ? (
                    <>
                      <Zap className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="text-[10px] text-slate-500 block">Nhiên liệu</span>
                        <span className="font-bold text-slate-200">Pin LFP ~198 km</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Fuel className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="text-[10px] text-slate-500 block">Nhiên liệu</span>
                        <span className="font-bold text-slate-200">Xăng ~1.8L/100km</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Transparent Pricing Breakdown Card */}
            <div className="bg-[#0D131F] rounded-[2rem] p-6 border border-white/10 shadow-xl space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Bảng kê chi phí minh bạch</span>
              </h4>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Đơn giá thuê ngày:</span>
                  <span className="font-mono font-bold text-white">{dailyPrice.toLocaleString('vi-VN')} đ/ngày</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Thời gian thuê:</span>
                  <span className="font-bold text-amber-400">{durationDays} ngày</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Tạm tính tiền xe:</span>
                  <span className="font-mono font-bold text-white">{baseRentalFee.toLocaleString('vi-VN')} đ</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between py-1 text-amber-400 font-bold">
                    <span>Ưu đãi voucher ({appliedDiscount.code}):</span>
                    <span>- {appliedDiscount.amount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                <div className="flex justify-between py-1 text-slate-400">
                  <span>Phụ phí giao xe tận nơi:</span>
                  <span className="text-amber-400 font-bold">0 đ (Miễn phí)</span>
                </div>
              </div>

              {/* Total & Deposit Split Box */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tổng giá trị đơn:</span>
                  <span className="text-xl font-black text-white font-mono">
                    {totalAmount.toLocaleString('vi-VN')} <span className="text-xs text-slate-400 font-normal">đ</span>
                  </span>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-amber-200">Tiền cọc giữ xe (30%):</span>
                    <span className="font-mono font-black text-amber-400 text-sm">
                      {depositAmount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Thanh toán ngay để khóa xe và biển số riêng</p>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                  <span>Còn lại trả khi nhận xe (70%):</span>
                  <span className="font-mono font-bold text-slate-200">
                    {remainingAmount.toLocaleString('vi-VN')} đ
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
