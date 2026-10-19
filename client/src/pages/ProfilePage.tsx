import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  User as UserIcon,
  Phone,
  ShieldCheck,
  Camera,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Eye,
  EyeOff,
  Clock,
  X,
  FileCheck2,
  RefreshCw,
  KeyRound,
  Copy,
  Check,
  RotateCcw,
  MapPin,
  ArrowRight,
  AlertTriangle,
  ChevronDown,
  QrCode,
  CreditCard,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import axios from 'axios';
import { calculatePasswordStrength } from '../utils/validation';
import { getUserAvatarUrl, getOptimizedVehicleImageUrl } from '../utils/imageHelper';
import { compressEkycImage } from '../utils/watermark';
import type { Booking, Vehicle, Branch } from '../types';

export type ProfileTab = 'bookings' | 'info' | 'avatar' | 'ekyc' | 'password';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get('tab') as ProfileTab) || 'bookings';
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);

  // Bookings state (UC-35: Rental History)
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [bookingPage, setBookingPage] = useState<number>(1);
  const [bookingSearch, setBookingSearch] = useState<string>('');
  const [bookingPagination, setBookingPagination] = useState({
    page: 1,
    limit: 6,
    total: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
  const [bookingCounts, setBookingCounts] = useState({
    all: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
  });
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Interactive QR Payment Modal for Pending Bookings
  const [selectedBookingForQrPay, setSelectedBookingForQrPay] = useState<Booking | null>(null);
  const [qrPaymentType, setQrPaymentType] = useState<'Deposit30' | 'Full100'>('Deposit30');
  const [qrVerifying, setQrVerifying] = useState(false);
  const [qrVerifiedSuccess, setQrVerifiedSuccess] = useState(false);

  // Extend Rental Modal State (UC-34)
  const [selectedBookingForExtend, setSelectedBookingForExtend] = useState<Booking | null>(null);
  const [extendNewDate, setExtendNewDate] = useState<string>('');
  const [extendEstimate, setExtendEstimate] = useState<{
    addedHours: number;
    addedDays: number;
    addedAmount: number;
    newTotalAmount: number;
    newRemainingAmount: number;
    isAvailable: boolean;
  } | null>(null);
  const [extendLoading, setExtendLoading] = useState(false);
  const [extendEstimating, setExtendEstimating] = useState(false);
  const [extendError, setExtendError] = useState<string>('');

  // Form states - Info
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(user?.gender || 'Other');
  const [dob, setDob] = useState(user?.dob ? user.dob.split('T')[0] : '');

  // Form states - Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states - Avatar
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form states - eKYC
  const [idCardFrontFile, setIdCardFrontFile] = useState<File | null>(null);
  const [idCardFrontPreview, setIdCardFrontPreview] = useState<string | null>(null);
  const [idCardBackFile, setIdCardBackFile] = useState<File | null>(null);
  const [idCardBackPreview, setIdCardBackPreview] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isWatermarking, setIsWatermarking] = useState<'idCardFront' | 'idCardBack' | 'selfiePhoto' | null>(null);
  const [ekycConsent, setEkycConsent] = useState(false);

  // Status indicators
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchBookings = async (
    page = bookingPage,
    status = bookingFilter,
    search = bookingSearch
  ) => {
    setBookingsLoading(true);
    try {
      const res = await api.get('/bookings/my', {
        params: {
          page,
          status,
          limit: 6,
          search: search.trim() || undefined,
        },
      });
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        setBookings(res.data.data);
        if (res.data.pagination) {
          setBookingPagination(res.data.pagination);
        }
        if (res.data.counts) {
          setBookingCounts(res.data.counts);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách đơn thuê xe:', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleBookingFilterChange = (status: 'all' | 'active' | 'completed' | 'cancelled') => {
    setBookingFilter(status);
    setBookingPage(1);
    fetchBookings(1, status, bookingSearch);
  };

  const handleBookingPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > bookingPagination.totalPages) return;
    setBookingPage(newPage);
    fetchBookings(newPage, bookingFilter, bookingSearch);
  };

  const handleBookingSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingPage(1);
    fetchBookings(1, bookingFilter, bookingSearch);
  };

  useEffect(() => {
    fetchBookings();
    api
      .get('/auth/me')
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          updateUser(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as ProfileTab;
    if (tabParam && ['bookings', 'info', 'avatar', 'ekyc', 'password'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhoneNumber(user.phoneNumber || '');
      setGender(user.gender || 'Other');
      if (user.dob) setDob(user.dob.split('T')[0]);
    }
  }, [user]);

  const handleTabChange = (tab: ProfileTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCancelBooking = async () => {
    if (!selectedBookingForCancel) return;
    setCancelLoading(true);
    try {
      const res = await api.put(`/bookings/${selectedBookingForCancel._id}/cancel`, {
        cancelReason: cancelReasonInput.trim() || 'Khách hàng yêu cầu hủy đơn trực tuyến.',
      });
      if (res.data && res.data.success) {
        setSelectedBookingForCancel(null);
        setCancelReasonInput('');
        await fetchBookings();
        setSuccessMsg('Đã hủy đơn đặt xe thành công.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Không thể hủy đơn đặt xe này.');
      }
    } finally {
      setCancelLoading(false);
    }
  };

  const handleOpenExtendModal = (b: Booking) => {
    setSelectedBookingForExtend(b);
    setExtendError('');
    setExtendEstimate(null);

    const curr = new Date(b.returnDateTime);
    const def = new Date(curr.getTime() + 24 * 3600 * 1000);
    const tzOffset = def.getTimezoneOffset() * 60000;
    const localISOTime = new Date(def.getTime() - tzOffset).toISOString().slice(0, 16);
    setExtendNewDate(localISOTime);

    fetchExtendEstimate(b._id, localISOTime);
  };

  const fetchExtendEstimate = async (bookingId: string, newDateTime: string) => {
    setExtendEstimating(true);
    setExtendError('');
    try {
      const res = await api.post(`/bookings/${bookingId}/estimate-extension`, {
        newReturnDateTime: new Date(newDateTime).toISOString(),
      });
      if (res.data?.success && res.data.data) {
        setExtendEstimate(res.data.data);
      } else {
        setExtendError(res.data?.message || 'Không thể tính giá gia hạn.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setExtendError(err.response?.data?.message || 'Lỗi khi kiểm tra lịch xe trống.');
      } else {
        setExtendError('Lỗi kiểm tra lịch xe trống.');
      }
      setExtendEstimate(null);
    } finally {
      setExtendEstimating(false);
    }
  };

  const handleConfirmExtend = async () => {
    if (!selectedBookingForExtend || !extendNewDate) return;
    setExtendLoading(true);
    setExtendError('');
    try {
      const res = await api.put(`/bookings/${selectedBookingForExtend._id}/extend`, {
        newReturnDateTime: new Date(extendNewDate).toISOString(),
      });
      if (res.data?.success && res.data.data) {
        const updated = res.data.data;
        setBookings((prev) =>
          prev.map((b) => (b._id === updated._id ? { ...b, ...updated } : b))
        );
        const addedText = updated.extensionSummary?.addedAmount
          ? ` Phí phát sinh: ${Number(updated.extensionSummary.addedAmount).toLocaleString('vi-VN')} đ.`
          : '';
        setSuccessMsg(`Gia hạn chuyến xe thành công!${addedText}`);
        setSelectedBookingForExtend(null);
      } else {
        setExtendError(res.data?.message || 'Gia hạn thất bại.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setExtendError(err.response?.data?.message || 'Gia hạn thất bại.');
      } else {
        setExtendError('Gia hạn thất bại.');
      }
    } finally {
      setExtendLoading(false);
    }
  };

  // Confirm VietQR Transfer for a Pending booking
  const handleConfirmQrPayment = async () => {
    if (!selectedBookingForQrPay) return;
    setQrVerifying(true);
    setErrorMsg('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const res = await api.post('/payments/vietqr/confirm', {
        bookingId: selectedBookingForQrPay._id,
        paymentType: qrPaymentType,
      });
      if (res.data && res.data.success) {
        setQrVerifiedSuccess(true);
        await fetchBookings();
        setSuccessMsg(
          `Đã xác nhận thanh toán QR cho mã đơn ${selectedBookingForQrPay.bookingCode}. Biển số xe đã được khóa giữ cho bạn!`
        );
        setTimeout(() => {
          setSelectedBookingForQrPay(null);
          setQrVerifiedSuccess(false);
        }, 1200);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Không thể xác nhận thanh toán QR lúc này. Vui lòng thử lại.');
      }
    } finally {
      setQrVerifying(false);
    }
  };

  // Update Profile Info
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.put('/auth/me', {
        firstName,
        lastName,
        phoneNumber,
        gender,
        dob,
      });

      if (res.data && res.data.success) {
        updateUser(res.data.data);
        setSuccessMsg('Đã lưu thông tin hồ sơ cá nhân.');
      } else {
        setErrorMsg(res.data?.message || 'Không thể cập nhật hồ sơ.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin.');
      } else {
        setErrorMsg('Có lỗi xảy ra khi lưu thông tin.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Avatar file selection
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setErrorMsg('Chỉ chấp nhận định dạng JPEG, PNG hoặc WebP.');
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setSuccessMsg('');
      setErrorMsg('');
    }
  };

  // Upload Avatar
  const handleUploadAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Vui lòng chọn một file ảnh để tải lên.');
      return;
    }

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('avatar', selectedFile);

    try {
      const res = await api.put('/auth/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data && res.data.success) {
        updateUser(res.data.data.user);
        setSuccessMsg('Đã cập nhật ảnh đại diện.');
        setSelectedFile(null);
      } else {
        setErrorMsg(res.data?.message || 'Tải ảnh lên thất bại.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi tải ảnh đại diện.');
      } else {
        setErrorMsg('Có lỗi xảy ra khi tải ảnh đại diện.');
      }
    } finally {
      setLoading(false);
    }
  };

  // eKYC upload handler
  const handleDocFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'idCardFront' | 'idCardBack' | 'selfiePhoto'
  ) => {
    if (e.target.files && e.target.files[0]) {
      const rawFile = e.target.files[0];
      if (rawFile.size > 10 * 1024 * 1024) {
        setErrorMsg('Dung lượng mỗi file ảnh giấy tờ không được vượt quá 10MB.');
        return;
      }

      setIsWatermarking(type);
      setSuccessMsg('');
      setErrorMsg('');

      try {
        const optimizedFile = await compressEkycImage(rawFile, 1280);
        const objUrl = URL.createObjectURL(optimizedFile);
        if (type === 'idCardFront') {
          setIdCardFrontFile(optimizedFile);
          setIdCardFrontPreview(objUrl);
        } else if (type === 'idCardBack') {
          setIdCardBackFile(optimizedFile);
          setIdCardBackPreview(objUrl);
        } else {
          setSelfieFile(optimizedFile);
          setSelfiePreview(objUrl);
        }
      } catch {
        const fallbackUrl = URL.createObjectURL(rawFile);
        if (type === 'idCardFront') {
          setIdCardFrontFile(rawFile);
          setIdCardFrontPreview(fallbackUrl);
        } else if (type === 'idCardBack') {
          setIdCardBackFile(rawFile);
          setIdCardBackPreview(fallbackUrl);
        } else {
          setSelfieFile(rawFile);
          setSelfiePreview(fallbackUrl);
        }
      } finally {
        setIsWatermarking(null);
      }
    }
  };

  const handleUploadEkyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCardFrontFile && !idCardBackFile && !selfieFile) {
      setErrorMsg('Vui lòng chọn ảnh CCCD (mặt trước / mặt sau) và ảnh chân dung để gửi thẩm định.');
      return;
    }

    if (!ekycConsent) {
      setErrorMsg('Vui lòng tích xác nhận đồng ý điều khoản bảo vệ dữ liệu cá nhân trước khi gửi.');
      return;
    }

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    const formData = new FormData();
    if (idCardFrontFile) formData.append('idCardFront', idCardFrontFile);
    if (idCardBackFile) formData.append('idCardBack', idCardBackFile);
    if (selfieFile) formData.append('selfiePhoto', selfieFile);
    formData.append('consentAgreed', 'true');
    formData.append('watermarked', 'false');

    try {
      const res = await api.post('/auth/ekyc', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data && res.data.success) {
        updateUser(res.data.data.user);
        setSuccessMsg('Đã gửi hồ sơ thẩm định eKYC thành công.');
        setIdCardFrontFile(null);
        setIdCardBackFile(null);
        setSelfieFile(null);
      } else {
        setErrorMsg(res.data?.message || 'Không thể gửi hồ sơ eKYC.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi tải lên hồ sơ eKYC.');
      } else {
        setErrorMsg('Có lỗi xảy ra khi tải lên hồ sơ eKYC.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('Mật khẩu mới phải có độ dài tối thiểu từ 8 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMsg('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.data && res.data.success) {
        setSuccessMsg('Đã cập nhật mật khẩu mới thành công.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(res.data?.message || 'Đổi mật khẩu thất bại.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(err.response?.data?.message || 'Mật khẩu hiện tại không đúng.');
      } else {
        setErrorMsg('Mật khẩu hiện tại không đúng.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-[#101010]">
        <div className="text-center space-y-3">
          <p className="text-sm text-[#A0A0A0]">Vui lòng đăng nhập để quản lý lịch trình và hồ sơ cá nhân.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2.5 bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] rounded-xl font-semibold text-xs transition-colors"
          >
            Đến trang Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  const currentAvatar = previewUrl || getUserAvatarUrl(user.avatarUrl);
  const passwordStrength = calculatePasswordStrength(newPassword);

  const formatDocUrl = (url?: string) => {
    if (!url) return null;
    const resolved = getUserAvatarUrl(url);
    if (!resolved) return null;
    const token = localStorage.getItem('motorent_token') || localStorage.getItem('token');
    if (token && resolved.includes('/api/auth/ekyc/document')) {
      const sep = resolved.includes('?') ? '&' : '?';
      return `${resolved}${sep}token=${encodeURIComponent(token)}&v=${user.identityStatus}_${user.ekycWatermarked ? '1' : '0'}`;
    }
    return resolved;
  };

  const TABS: { id: ProfileTab; num: string; label: string; count?: number; statusTag?: string }[] = [
    { id: 'bookings', num: '01', label: 'Chuyến xe của tôi', count: bookingCounts.all || bookings.length },
    { id: 'info', num: '02', label: 'Thông tin cá nhân' },
    {
      id: 'ekyc',
      num: '03',
      label: 'Định danh eKYC',
      statusTag: user.identityStatus === 'Verified' ? 'Đã duyệt' : user.identityStatus === 'Pending' ? 'Chờ duyệt' : 'Cần làm',
    },
    { id: 'avatar', num: '04', label: 'Ảnh đại diện' },
    { id: 'password', num: '05', label: 'Đổi mật khẩu' },
  ];

  const activeBookingsCount = bookingCounts.active || bookings.filter((b) =>
    ['Pending', 'Approved', 'Confirmed', 'Ongoing'].includes(b.status)
  ).length;

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] py-8 sm:py-12 bg-editorial-grain">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* =====================================================================
            1. EDITORIAL MEMBER MASTHEAD (NO CLUNKY AI SIDEBAR)
            ===================================================================== */}
        <div className="pb-6 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            {/* Avatar with subtle camera trigger */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#161616] border border-white/15 flex items-center justify-center">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <span className="text-lg font-bold text-[#FFC799]">
                    {(user.firstName || user.username || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('avatar')}
                className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg bg-[#161616] border border-white/20 hover:border-[#FFC799] text-[#F5F5F5] flex items-center justify-center transition-colors cursor-pointer"
                title="Đổi ảnh đại diện"
              >
                <Camera className="w-3 h-3 text-[#FFC799]" />
              </button>
            </div>

            {/* Identity Details */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-[#F5F5F5] tracking-tight">
                  {user.firstName ? `${user.lastName || ''} ${user.firstName}`.trim() : user.username}
                </h1>
                {user.identityStatus === 'Verified' ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-[#FFC799]/15 border border-[#FFC799]/30 text-[11px] font-medium text-[#FFC799]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Đã xác thực eKYC</span>
                  </span>
                ) : user.identityStatus === 'Pending' ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-[#FFC799]/12 border border-[#FFC799]/30 text-[11px] font-medium text-[#FFC799]">
                    <Clock className="w-3 h-3" />
                    <span>Chờ duyệt eKYC</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTabChange('ekyc')}
                    className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-[#FFC799]/15 border border-[#FFC799]/30 text-[11px] font-medium text-[#FFC799] hover:bg-[#FFC799]/25 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>Bổ sung eKYC</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#A0A0A0]">
                <span>{user.email || `@${user.username}`}</span>
                {user.phoneNumber && (
                  <>
                    <span className="text-white/20">•</span>
                    <span className="font-mono-tabular">{user.phoneNumber}</span>
                  </>
                )}
                <span className="text-white/20">•</span>
                <span>
                  Điểm thành viên:{' '}
                  <strong className="font-mono-tabular text-[#FFC799]">
                    {user.loyaltyPoints || 0} điểm
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right Quick Actions */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <Link
              to="/bikes"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] text-xs font-semibold transition-all active:scale-95"
            >
              <span>Đặt chuyến xe mới</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* =====================================================================
            2. HORIZONTAL ARCHITECTURAL TAB BAR
            ===================================================================== */}
        <div className="border-b border-white/[0.08] mb-8 overflow-x-auto scrollbar-none">
          <nav className="flex items-center space-x-1 min-w-max py-2" aria-label="Quản lý tài khoản">
            {TABS.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTabChange(t.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs transition-all flex items-center space-x-2 cursor-pointer ${
                    active
                      ? 'bg-[#161616] text-[#F5F5F5] font-semibold border border-white/12'
                      : 'text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.03] font-medium border border-transparent'
                  }`}
                >
                  <span className="font-mono-tabular text-[10px] text-[#6E6E6E]">{t.num}</span>
                  <span>{t.label}</span>
                  {typeof t.count === 'number' && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono-tabular ${
                        active ? 'bg-[#FFC799]/20 text-[#FFC799]' : 'bg-white/5 text-[#6E6E6E]'
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                  {t.statusTag && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                        user.identityStatus === 'Verified'
                          ? 'bg-[#FFC799]/15 text-[#FFC799]'
                          : 'bg-[#FFC799]/15 text-[#FFC799]'
                      }`}
                    >
                      {t.statusTag}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Alert Notices */}
        {successMsg && (
          <div className="mb-6 p-4 bg-[#FFC799]/10 border border-[#FFC799]/30 rounded-xl text-xs text-[#FFC799] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#FFC799] shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
            <button type="button" onClick={() => setSuccessMsg('')} className="text-[#FFC799]/70 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-[#FF8080]/12 border border-[#FF8080]/30 rounded-xl text-xs text-[#FF8080] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-[#FF8080] shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
            <button type="button" onClick={() => setErrorMsg('')} className="text-[#FF8080] hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* =====================================================================
            TAB 01: CHUYẾN XE CỦA TÔI (FULL-WIDTH RENTAL CONTRACT TICKETS)
            ===================================================================== */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { key: 'all' as const, label: 'Tất cả đơn', count: bookingCounts.all },
                  { key: 'active' as const, label: 'Đang giữ xe / Đang thuê', count: bookingCounts.active },
                  {
                    key: 'completed' as const,
                    label: 'Đã hoàn thành',
                    count: bookingCounts.completed,
                  },
                  {
                    key: 'cancelled' as const,
                    label: 'Đã hủy',
                    count: bookingCounts.cancelled,
                  },
                ].map((f) => {
                  const active = bookingFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => handleBookingFilterChange(f.key)}
                      className={`px-3.5 py-2 rounded-xl text-xs transition-all shrink-0 cursor-pointer flex items-center space-x-2 ${
                        active
                          ? 'bg-[#F5F5F5] text-[#101010] font-semibold'
                          : 'bg-[#161616] text-[#A0A0A0] border border-white/[0.08] hover:text-[#F5F5F5]'
                      }`}
                    >
                      <span>{f.label}</span>
                      <span
                        className={`font-mono-tabular text-[11px] ${
                          active ? 'text-[#101010]/80 font-bold' : 'text-[#6E6E6E]'
                        }`}
                      >
                        ({f.count})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Bar & Refresh */}
              <div className="flex items-center gap-2.5 self-start lg:self-auto w-full lg:w-auto">
                <form onSubmit={handleBookingSearch} className="relative flex-1 lg:w-56">
                  <Search className="w-3.5 h-3.5 text-[#6E6E6E] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Tìm mã hợp đồng..."
                    className="w-full bg-[#161616] border border-white/[0.08] focus:border-[#FFC799] rounded-xl pl-9 pr-7 py-2 text-xs text-[#F5F5F5] placeholder-[#6E6E6E] outline-none font-mono-tabular transition-colors"
                  />
                  {bookingSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setBookingSearch('');
                        fetchBookings(1, bookingFilter, '');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6E6E6E] hover:text-white text-xs p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </form>

                <button
                  type="button"
                  onClick={() => fetchBookings()}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#161616] border border-white/[0.08] hover:border-white/20 text-xs text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors shrink-0 cursor-pointer"
                  title="Tải lại danh sách"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${bookingsLoading ? 'animate-spin text-[#FFC799]' : ''}`} />
                  <span className="hidden sm:inline">Làm mới</span>
                </button>
              </div>
            </div>

            {/* Bookings List */}
            {bookingsLoading ? (
              <div className="py-16 text-center space-y-3 bg-[#161616] rounded-2xl border border-white/[0.08]">
                <RefreshCw className="w-5 h-5 text-[#FFC799] animate-spin mx-auto" />
                <p className="text-xs text-[#A0A0A0]">Đang đồng bộ danh sách hợp đồng thuê xe...</p>
              </div>
            ) : (() => {
              if (bookings.length === 0) {
                return (
                  <div className="p-12 rounded-2xl bg-[#161616] border border-white/[0.08] text-center space-y-4">
                    <h3 className="text-base font-bold text-[#F5F5F5]">Chưa có chuyến xe nào trong mục này</h3>
                    <p className="text-xs text-[#A0A0A0] max-w-md mx-auto leading-relaxed">
                      {bookingSearch
                        ? `Không tìm thấy chuyến xe nào khớp với từ khóa "${bookingSearch}".`
                        : 'Chọn chiếc xe tay ga, xe điện hoặc xe số phù hợp để nhận xe nhanh trong 03 phút tại Sân bay Đà Nẵng hoặc Bãi biển Mỹ Khê.'}
                    </p>
                    {bookingSearch ? (
                      <button
                        type="button"
                        onClick={() => {
                          setBookingSearch('');
                          fetchBookings(1, bookingFilter, '');
                        }}
                        className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      >
                        <span>Xóa bộ lọc tìm kiếm</span>
                      </button>
                    ) : (
                      <Link
                        to="/bikes"
                        className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] rounded-xl text-xs font-semibold transition-all"
                      >
                        <span>Xem đội xe &amp; Bảng giá</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                );
              }

              return (
                <>
                  <div className="space-y-4">
                    {bookings.map((b) => {
                    const v = typeof b.vehicleId === 'object' && b.vehicleId !== null ? (b.vehicleId as Vehicle) : null;
                    const pb =
                      typeof b.pickupBranchId === 'object' && b.pickupBranchId !== null
                        ? (b.pickupBranchId as Branch)
                        : null;
                    const rb =
                      typeof b.returnBranchId === 'object' && b.returnBranchId !== null
                        ? (b.returnBranchId as Branch)
                        : null;

                    const vehicleName = v?.vehicleModel || 'Xe máy Motorent';
                    const vehicleBrand = v?.brand || '';
                    const licensePlate = v?.licensePlate || 'Chờ bàn giao';
                    const vehicleImg =
                      v?.images && v.images.length > 0
                        ? getOptimizedVehicleImageUrl(v.images[1] || v.images[0])
                        : '';

                    const canCancel = b.status === 'Pending' || b.status === 'Approved' || b.status === 'Confirmed';
                    const canExtend = b.status === 'Confirmed' || b.status === 'Ongoing';
                    const needsDepositPayment = b.status === 'Pending' && !b.depositPaid && !b.isPaid;

                    return (
                      <div
                        key={b._id}
                        className="rounded-2xl bg-[#161616] border border-white/10 hover:border-white/20 transition-all overflow-hidden"
                      >
                        {/* Top Ticket Bar: Booking Code, Created Date & Status */}
                        <div className="px-5 py-3.5 bg-[#101010]/60 border-b border-white/[0.07] flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <span className="text-[11px] uppercase tracking-wider text-[#6E6E6E] font-semibold">
                              Mã hợp đồng
                            </span>
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#161616] border border-white/12">
                              <span className="font-mono-tabular font-bold text-xs text-[#FFC799]">
                                {b.bookingCode}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(b.bookingCode)}
                                className="text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors cursor-pointer"
                                title="Sao chép mã đơn"
                              >
                                {copiedCode === b.bookingCode ? (
                                  <Check className="w-3.5 h-3.5 text-[#FFC799]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            {b.createdAt && (
                              <span className="text-xs text-[#6E6E6E] hidden sm:inline">
                                Đặt ngày {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-2">
                            {b.status === 'Pending' && (
                              <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-[#FFC799]/12 text-[#FFC799] border border-[#FFC799]/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FFC799] mr-2" />
                                Chờ xác nhận cọc 30%
                              </span>
                            )}
                            {(b.status === 'Approved' || b.status === 'Confirmed') && (
                              <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                Đã xác nhận cọc &amp; Khóa biển số
                              </span>
                            )}
                            {b.status === 'Ongoing' && (
                              <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FFC799] mr-2" />
                                Đang bàn giao lưu hành
                              </span>
                            )}
                            {b.status === 'Completed' && (
                              <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                Đã hoàn thành chuyến đi
                              </span>
                            )}
                            {(b.status === 'Cancelled' || b.status === 'Rejected') && (
                              <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-[#FF8080]/12 text-[#FF8080] border border-[#FF8080]/30">
                                Đã hủy đơn
                              </span>
                            )}
                            {Boolean(b.extensionCount && b.extensionCount > 0) && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#99FFE4]/15 text-[#99FFE4] border border-[#99FFE4]/30 font-mono-tabular">
                                <Clock className="w-3 h-3" />
                                <span>Đã gia hạn {b.extensionCount} lần</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Main Ticket Body: 12-Column Architectural Grid */}
                        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                          {/* Col 1-5: Vehicle Studio Photo + Full Name + Single-Line License Plate */}
                          <div className="lg:col-span-5 flex items-center space-x-4">
                            <div className="w-28 h-20 rounded-xl studio-paper-backdrop border border-white/10 overflow-hidden shrink-0 flex items-center justify-center p-2">
                              {vehicleImg ? (
                                <img
                                  src={vehicleImg}
                                  alt={vehicleName}
                                  className="w-full h-full object-contain scale-110 mix-blend-multiply"
                                />
                              ) : (
                                <span className="text-[10px] font-bold text-slate-600">MOTORENT</span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="text-[11px] uppercase tracking-wider text-[#A0A0A0] font-medium">
                                {vehicleBrand}
                              </div>
                              <h3 className="text-base font-bold text-[#F5F5F5] leading-snug">
                                {vehicleName}
                              </h3>
                              <div className="pt-0.5">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#101010] border border-white/12 text-xs font-mono-tabular font-semibold text-[#FFC799] whitespace-nowrap">
                                  Biển số: {licensePlate}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Col 6-9: Pickup & Return Schedule */}
                          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 border-y lg:border-y-0 lg:border-x border-white/[0.07] py-4 lg:py-0 lg:px-5 text-xs">
                            <div className="flex items-start space-x-2.5">
                              <MapPin className="w-3.5 h-3.5 text-[#FFC799] shrink-0 mt-0.5" />
                              <div>
                                <div className="text-[#A0A0A0]">
                                  Nhận xe:{' '}
                                  <strong className="text-[#F5F5F5] font-mono-tabular">
                                    {new Date(b.pickupDateTime).toLocaleString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                    })}
                                  </strong>
                                </div>
                                <div className="text-[11px] text-[#6E6E6E] mt-0.5">
                                  {pb?.name || 'Trạm giao nhận Motorent'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-start space-x-2.5">
                              <MapPin className="w-3.5 h-3.5 text-[#FFC799] shrink-0 mt-0.5" />
                              <div>
                                <div className="text-[#A0A0A0]">
                                  Trả xe:{' '}
                                  <strong className="text-[#F5F5F5] font-mono-tabular">
                                    {new Date(b.returnDateTime).toLocaleString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                    })}
                                  </strong>
                                </div>
                                <div className="text-[11px] text-[#6E6E6E] mt-0.5">
                                  {rb?.name || 'Trạm giao nhận Motorent'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Col 10-12: Financial Breakdown */}
                          <div className="lg:col-span-3 flex flex-row lg:flex-col items-center lg:items-end justify-between gap-2 text-xs">
                            <div className="lg:text-right">
                              <span className="text-[11px] text-[#6E6E6E] block">Tổng chi phí thuê</span>
                              <span className="text-lg font-bold text-[#F5F5F5] font-mono-tabular">
                                {b.totalAmount.toLocaleString('vi-VN')} đ
                              </span>
                            </div>

                            <div className="text-right space-y-0.5 text-[11px]">
                              {b.isPaid ? (
                                <p className="text-[#FFC799] font-semibold">Đã thanh toán đủ 100%</p>
                              ) : b.depositPaid || b.status === 'Approved' || b.status === 'Confirmed' ? (
                                <>
                                  <p className="text-[#FFC799] font-semibold font-mono-tabular">
                                    Đã cọc 30%: {b.depositAmount.toLocaleString('vi-VN')} đ
                                  </p>
                                  <p className="text-[#A0A0A0] font-mono-tabular">
                                    Còn lại khi nhận xe: {b.remainingAmount.toLocaleString('vi-VN')} đ
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-[#FFC799] font-semibold font-mono-tabular">
                                    Cần cọc 30%: {b.depositAmount.toLocaleString('vi-VN')} đ
                                  </p>
                                  <p className="text-[#6E6E6E] font-mono-tabular">
                                    Còn lại 70%: {b.remainingAmount.toLocaleString('vi-VN')} đ
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Action Strip */}
                        <div className="px-5 py-3 bg-[#101010]/40 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs text-[#A0A0A0] flex flex-wrap items-center gap-2">
                            {b.status === 'Cancelled' ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[#FF8080] font-medium">Đơn đã hủy</span>
                                {b.cancelReason && (
                                  <span className="text-[#A0A0A0]">
                                    • Lý do: <span className="text-[#F5F5F5]">{b.cancelReason}</span>
                                  </span>
                                )}
                                {(b.refundAmount ?? 0) > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold font-mono-tabular">
                                    Hoàn tiền BR-06: {(b.refundAmount ?? 0).toLocaleString('vi-VN')} đ ({b.refundStatus === 'Approved' ? 'Đã hoàn' : 'Chờ xử lý'})
                                  </span>
                                )}
                                {(b.refundForfeitAmount ?? 0) > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold font-mono-tabular">
                                    Khấu trừ &lt; 24h: {(b.refundForfeitAmount ?? 0).toLocaleString('vi-VN')} đ
                                  </span>
                                )}
                              </div>
                            ) : b.cancelReason ? (
                              <span className="text-[#A0A0A0]">
                                Ghi chú hủy đơn: <span className="text-[#F5F5F5]">{b.cancelReason}</span>
                              </span>
                            ) : needsDepositPayment ? (
                              <span className="text-[#FFC799]">
                                Vui lòng hoàn tất quét mã QR thanh toán cọc 30% để hệ thống khóa biển số xe.
                              </span>
                            ) : (
                              <span>Xuất trình mã hợp đồng {b.bookingCode} tại quầy để nhận xe trong 03 phút.</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5">
                            {needsDepositPayment && (
                              <button
                                type="button"
                                onClick={() => {
                                  setQrPaymentType('Deposit30');
                                  setQrVerifiedSuccess(false);
                                  setSelectedBookingForQrPay(b);
                                }}
                                className="px-3.5 py-1.5 rounded-lg bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Thanh toán cọc QR ngay</span>
                              </button>
                            )}

                            {canCancel && (
                              <button
                                type="button"
                                onClick={() => setSelectedBookingForCancel(b)}
                                className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-[#FF8080]/30 text-[#A0A0A0] hover:text-[#FF8080] text-xs font-medium transition-colors cursor-pointer"
                              >
                                Hủy đơn
                              </button>
                            )}

                            {canExtend && (
                              <button
                                type="button"
                                onClick={() => handleOpenExtendModal(b)}
                                className="px-3.5 py-1.5 rounded-lg bg-[#FFC799]/15 hover:bg-[#FFC799]/25 border border-[#FFC799]/30 text-[#FFC799] text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>Gia hạn thuê xe</span>
                              </button>
                            )}

                            {v && (
                              <Link
                                to={`/booking/${v._id}`}
                                className="px-3.5 py-1.5 rounded-lg bg-[#161616] border border-white/12 hover:border-[#FFC799] text-[#F5F5F5] text-xs font-medium transition-colors inline-flex items-center space-x-1.5"
                              >
                                <RotateCcw className="w-3 h-3 text-[#FFC799]" />
                                <span>Thuê lại xe này</span>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* UC-35: Pagination Controls */}
                {bookingPagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/[0.08]">
                    <div className="text-xs text-[#A0A0A0]">
                      Hiển thị trang <strong className="text-[#F5F5F5] font-mono-tabular">{bookingPagination.page}</strong> /{' '}
                      <span className="font-mono-tabular">{bookingPagination.totalPages}</span>{' '}
                      (Tổng cộng <strong className="text-[#FFC799] font-mono-tabular">{bookingPagination.total}</strong> chuyến xe)
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        disabled={!bookingPagination.hasPrev || bookingsLoading}
                        onClick={() => handleBookingPageChange(bookingPage - 1)}
                        className="p-2 rounded-xl bg-[#161616] border border-white/10 hover:border-[#FFC799] text-[#A0A0A0] hover:text-[#F5F5F5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Trang trước"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {Array.from({ length: bookingPagination.totalPages }, (_, i) => i + 1).map((p) => {
                        const isActive = p === bookingPagination.page;
                        return (
                          <button
                            key={p}
                            type="button"
                            disabled={bookingsLoading}
                            onClick={() => handleBookingPageChange(p)}
                            className={`w-8 h-8 rounded-xl text-xs font-mono-tabular font-semibold transition-all cursor-pointer ${
                              isActive
                                ? 'bg-[#F5F5F5] text-[#101010] shadow-sm'
                                : 'bg-[#161616] border border-white/10 text-[#A0A0A0] hover:text-white hover:border-white/20'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        disabled={!bookingPagination.hasNext || bookingsLoading}
                        onClick={() => handleBookingPageChange(bookingPage + 1)}
                        className="p-2 rounded-xl bg-[#161616] border border-white/10 hover:border-[#FFC799] text-[#A0A0A0] hover:text-[#F5F5F5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Trang sau"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
            })()}
          </div>
        )}

        {/* =====================================================================
            TAB 02: THÔNG TIN CÁ NHÂN & LIÊN HỆ
            ===================================================================== */}
        {activeTab === 'info' && (
          <div className="bg-[#161616] rounded-2xl border border-white/10 p-6 sm:p-8 max-w-3xl">
            <div className="pb-5 border-b border-white/[0.08] mb-6">
              <h2 className="text-lg font-bold text-[#F5F5F5]">Thông tin cá nhân &amp; Liên hệ nhận xe</h2>
              <p className="text-xs text-[#A0A0A0] mt-1">
                Thông tin dùng để ghi nhận trên hợp đồng thuê xe điện tử và nhận thông báo bàn giao xe.
              </p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A0A0A0] mb-1.5">
                    Tên đăng nhập (Cố định)
                  </label>
                  <input
                    type="text"
                    value={user.username}
                    disabled
                    className="w-full bg-[#101010] border border-white/[0.07] rounded-xl px-3.5 py-2.5 text-xs font-mono-tabular text-[#6E6E6E] cursor-not-allowed outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A0A0A0] mb-1.5">
                    Email nhận hợp đồng điện tử
                  </label>
                  <input
                    type="email"
                    value={user.email || 'Chưa cập nhật'}
                    disabled
                    className="w-full bg-[#101010] border border-white/[0.07] rounded-xl px-3.5 py-2.5 text-xs text-[#6E6E6E] cursor-not-allowed outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#F5F5F5] mb-1.5">
                    Họ và tên đệm *
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-[#101010] border border-white/12 focus:border-[#FFC799] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#F5F5F5] mb-1.5">
                    Tên *
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Hoàng"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-[#101010] border border-white/12 focus:border-[#FFC799] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#F5F5F5] mb-1.5">
                    Số điện thoại liên hệ *
                  </label>
                  <input
                    type="tel"
                    placeholder="VD: 0905 123 456"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-[#101010] border border-white/12 focus:border-[#FFC799] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#F5F5F5] mb-1.5">Giới tính</label>
                    <div className="relative">
                      <select
                        value={gender}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Male' || val === 'Female' || val === 'Other') {
                            setGender(val);
                          }
                        }}
                        className="w-full bg-[#101010] border border-white/12 focus:border-[#FFC799] rounded-xl px-3 py-2.5 text-xs text-[#F5F5F5] outline-none appearance-none cursor-pointer"
                      >
                        <option value="Male" className="bg-[#161616]">Nam</option>
                        <option value="Female" className="bg-[#161616]">Nữ</option>
                        <option value="Other" className="bg-[#161616]">Khác</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-[#A0A0A0] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#F5F5F5] mb-1.5">Ngày sinh</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-[#101010] border border-white/12 focus:border-[#FFC799] rounded-xl px-3 py-2.5 text-xs text-[#F5F5F5] outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu thông tin hồ sơ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =====================================================================
            TAB 03: ĐỊNH DANH ĐIỆN TỬ (EKYC)
            ===================================================================== */}
        {activeTab === 'ekyc' && (
          <div className="bg-[#161616] rounded-2xl border border-white/10 p-6 sm:p-8 space-y-6">
            <div className="pb-5 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#F5F5F5]">
                  Định danh điện tử eKYC — Nhận xe không giữ CCCD gốc
                </h2>
                <p className="text-xs text-[#A0A0A0] mt-1">
                  Tải lên 2 mặt CCCD và ảnh chân dung để đối soát trước, giúp nhận bàn giao xe tại trạm chỉ trong 03 phút.
                </p>
              </div>

              <div>
                {user.identityStatus === 'Verified' ? (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30">
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Đã duyệt hợp lệ
                  </span>
                ) : user.identityStatus === 'Pending' ? (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFC799]/12 text-[#FFC799] border border-[#FFC799]/30">
                    <Clock className="w-4 h-4 mr-1.5" />
                    Đang chờ nhân viên đối soát
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-[#A0A0A0] border border-white/10">
                    Chưa xác thực
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleUploadEkyc} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. CCCD Front */}
                <div className="p-4 bg-[#101010] rounded-xl border border-white/10 flex flex-col justify-between space-y-3">
                  <span className="text-xs font-semibold text-[#F5F5F5]">1. Mặt trước CCCD *</span>
                  <div className="w-full h-40 rounded-lg bg-[#161616] border border-white/[0.08] overflow-hidden flex items-center justify-center">
                    {isWatermarking === 'idCardFront' ? (
                      <RefreshCw className="w-5 h-5 text-[#FFC799] animate-spin" />
                    ) : idCardFrontPreview || formatDocUrl(user.idCardFrontUrl) ? (
                      <img
                        src={idCardFrontPreview || formatDocUrl(user.idCardFrontUrl)!}
                        alt="CCCD Front"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center space-y-1 p-3">
                        <FileCheck2 className="w-7 h-7 text-[#6E6E6E] mx-auto" />
                        <span className="text-[11px] text-[#6E6E6E] block">Chưa có ảnh mặt trước</span>
                      </div>
                    )}
                  </div>
                  <label className="w-full py-2 bg-[#161616] hover:border-[#FFC799] border border-white/12 rounded-lg text-xs font-medium text-[#F5F5F5] text-center cursor-pointer transition-colors block">
                    <span>{idCardFrontFile ? 'Đổi ảnh mặt trước' : 'Chọn ảnh mặt trước'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleDocFileChange(e, 'idCardFront')}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 2. CCCD Back */}
                <div className="p-4 bg-[#101010] rounded-xl border border-white/10 flex flex-col justify-between space-y-3">
                  <span className="text-xs font-semibold text-[#F5F5F5]">2. Mặt sau CCCD *</span>
                  <div className="w-full h-40 rounded-lg bg-[#161616] border border-white/[0.08] overflow-hidden flex items-center justify-center">
                    {isWatermarking === 'idCardBack' ? (
                      <RefreshCw className="w-5 h-5 text-[#FFC799] animate-spin" />
                    ) : idCardBackPreview || formatDocUrl(user.idCardBackUrl) ? (
                      <img
                        src={idCardBackPreview || formatDocUrl(user.idCardBackUrl)!}
                        alt="CCCD Back"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center space-y-1 p-3">
                        <FileCheck2 className="w-7 h-7 text-[#6E6E6E] mx-auto" />
                        <span className="text-[11px] text-[#6E6E6E] block">Chưa có ảnh mặt sau</span>
                      </div>
                    )}
                  </div>
                  <label className="w-full py-2 bg-[#161616] hover:border-[#FFC799] border border-white/12 rounded-lg text-xs font-medium text-[#F5F5F5] text-center cursor-pointer transition-colors block">
                    <span>{idCardBackFile ? 'Đổi ảnh mặt sau' : 'Chọn ảnh mặt sau'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleDocFileChange(e, 'idCardBack')}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 3. Selfie */}
                <div className="p-4 bg-[#101010] rounded-xl border border-white/10 flex flex-col justify-between space-y-3">
                  <span className="text-xs font-semibold text-[#F5F5F5]">3. Ảnh chân dung đối chiếu *</span>
                  <div className="w-full h-40 rounded-lg bg-[#161616] border border-white/[0.08] overflow-hidden flex items-center justify-center">
                    {isWatermarking === 'selfiePhoto' ? (
                      <RefreshCw className="w-5 h-5 text-[#FFC799] animate-spin" />
                    ) : selfiePreview || formatDocUrl(user.selfieUrl) ? (
                      <img
                        src={selfiePreview || formatDocUrl(user.selfieUrl)!}
                        alt="Selfie"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center space-y-1 p-3">
                        <Camera className="w-7 h-7 text-[#6E6E6E] mx-auto" />
                        <span className="text-[11px] text-[#6E6E6E] block">Chụp chính diện rõ khuôn mặt</span>
                      </div>
                    )}
                  </div>
                  <label className="w-full py-2 bg-[#161616] hover:border-[#FFC799] border border-white/12 rounded-lg text-xs font-medium text-[#F5F5F5] text-center cursor-pointer transition-colors block">
                    <span>{selfieFile ? 'Đổi ảnh chân dung' : 'Chọn ảnh chân dung'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleDocFileChange(e, 'selfiePhoto')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="p-4 bg-[#101010] rounded-xl border border-white/10">
                <label className="flex items-start space-x-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ekycConsent}
                    onChange={(e) => setEkycConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 accent-[#FFC799] cursor-pointer shrink-0"
                  />
                  <span className="text-xs text-[#A0A0A0] leading-relaxed">
                    Tôi đồng ý cung cấp hình ảnh CCCD và chân dung để Motorent đối soát xác thực hợp đồng thuê xe theo Nghị định 13/2023/NĐ-CP. Hệ thống tự động đóng dấu bảo mật lên ảnh CCCD sau khi duyệt.
                  </span>
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={
                    loading ||
                    user.identityStatus === 'Pending' ||
                    user.identityStatus === 'Verified' ||
                    (!idCardFrontFile && !idCardBackFile && !selfieFile) ||
                    !ekycConsent
                  }
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Gửi hồ sơ thẩm định eKYC</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =====================================================================
            TAB 04: ĐỔI ẢNH ĐẠI DIỆN
            ===================================================================== */}
        {activeTab === 'avatar' && (
          <div className="bg-[#161616] rounded-2xl border border-white/10 p-6 sm:p-8 max-w-2xl">
            <div className="pb-5 border-b border-white/[0.08] mb-6">
              <h2 className="text-lg font-bold text-[#F5F5F5]">Ảnh đại diện tài khoản</h2>
              <p className="text-xs text-[#A0A0A0] mt-1">
                Hỗ trợ ảnh định dạng JPEG, PNG hoặc WebP (dung lượng tối đa 5MB).
              </p>
            </div>

            <form onSubmit={handleUploadAvatar} className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-xl bg-[#101010] border border-white/10">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[#161616] border border-white/15 flex items-center justify-center shrink-0">
                  {currentAvatar ? (
                    <img
                      src={currentAvatar}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <UserIcon className="w-10 h-10 text-[#6E6E6E]" />
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left">
                  <label className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#161616] hover:border-[#FFC799] border border-white/12 rounded-xl text-xs font-medium text-[#F5F5F5] cursor-pointer transition-colors">
                    <UploadCloud className="w-4 h-4 text-[#FFC799]" />
                    <span>Chọn ảnh mới từ thiết bị</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-[#6E6E6E]">
                    {selectedFile
                      ? `Đã chọn: ${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)`
                      : 'Chưa chọn tệp ảnh mới.'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !selectedFile}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Lưu ảnh đại diện</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =====================================================================
            TAB 05: ĐỔI MẬT KHẨU BẢO MẬT
            ===================================================================== */}
        {activeTab === 'password' && (
          <div className="bg-[#161616] rounded-2xl border border-white/10 p-6 sm:p-8 max-w-xl">
            <div className="pb-5 border-b border-white/[0.08] mb-6">
              <h2 className="text-lg font-bold text-[#F5F5F5]">Đổi mật khẩu bảo mật</h2>
              <p className="text-xs text-[#A0A0A0] mt-1">
                Mật khẩu mới cần có tối thiểu 8 ký tự.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-[#F5F5F5] mb-1.5">
                  Mật khẩu hiện tại *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu hiện tại..."
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full bg-[#101010] border border-white/12 focus:border-[#FFC799] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-[#F5F5F5] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-[#F5F5F5]"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#F5F5F5] mb-1.5">
                  Mật khẩu mới *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Tối thiểu 8 ký tự..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full bg-[#101010] border border-white/12 focus:border-[#FFC799] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-[#F5F5F5] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-[#F5F5F5]"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {newPassword.length > 0 && (
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#A0A0A0]">
                    <span>Độ mạnh mật khẩu:</span>
                    <span className={`font-semibold ${passwordStrength.color}`}>{passwordStrength.label}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#F5F5F5] mb-1.5">
                  Xác nhận mật khẩu mới *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-[#101010] border border-white/12 focus:border-[#FFC799] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-[#F5F5F5] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-[#F5F5F5]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex justify-end">
                <button
                  type="submit"
                  disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Cập nhật mật khẩu</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* =====================================================================
          MODAL 1: VIETQR DEPOSIT PAYMENT & BANK VERIFICATION MODAL
          ===================================================================== */}
      {selectedBookingForQrPay && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => !qrVerifying && setSelectedBookingForQrPay(null)}
        >
          <div
            className="bg-[#161616] rounded-2xl max-w-lg w-full p-6 border border-white/15 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#FFC799] font-semibold block">
                  Cổng Thanh Toán VietQR 24/7
                </span>
                <h3 className="text-lg font-bold text-[#F5F5F5] mt-0.5">
                  Quét mã QR thanh toán đơn {selectedBookingForQrPay.bookingCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForQrPay(null)}
                className="p-1.5 rounded-lg bg-[#101010] border border-white/10 text-[#A0A0A0] hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Select 30% Deposit vs 100% Full Payment */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setQrPaymentType('Deposit30')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  qrPaymentType === 'Deposit30'
                    ? 'bg-[#101010] border-[#FFC799] text-[#F5F5F5]'
                    : 'bg-[#101010]/50 border-white/10 text-[#A0A0A0]'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider text-[#FFC799] font-semibold block">
                  Đặt cọc 30% giữ xe
                </span>
                <span className="text-sm font-bold font-mono-tabular mt-0.5 block">
                  {selectedBookingForQrPay.depositAmount.toLocaleString('vi-VN')} đ
                </span>
              </button>

              <button
                type="button"
                onClick={() => setQrPaymentType('Full100')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  qrPaymentType === 'Full100'
                    ? 'bg-[#101010] border-[#FFC799] text-[#F5F5F5]'
                    : 'bg-[#101010]/50 border-white/10 text-[#A0A0A0]'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider text-[#FFC799] font-semibold block">
                  Tất toán 100%
                </span>
                <span className="text-sm font-bold font-mono-tabular mt-0.5 block">
                  {selectedBookingForQrPay.totalAmount.toLocaleString('vi-VN')} đ
                </span>
              </button>
            </div>

            {/* QR Code & Bank Account Info */}
            <div className="p-4 rounded-xl bg-[#101010] border border-white/10 flex flex-col sm:flex-row items-center gap-5">
              <div className="bg-white p-2.5 rounded-xl shrink-0">
                <img
                  src={`https://api.vietqr.io/image/970422-0905123456-compact2.jpg?amount=${
                    qrPaymentType === 'Full100'
                      ? selectedBookingForQrPay.totalAmount
                      : selectedBookingForQrPay.depositAmount
                  }&addInfo=${encodeURIComponent(
                    `MOTORENT ${selectedBookingForQrPay.bookingCode}`
                  )}&accountName=CONG%20TY%20MOTORENT`}
                  alt="VietQR"
                  className="w-36 h-36 object-contain"
                />
              </div>

              <div className="flex-1 w-full space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-white/[0.07]">
                  <span className="text-[#A0A0A0]">Ngân hàng:</span>
                  <span className="font-semibold text-[#F5F5F5]">MB Bank (Quân Đội)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.07]">
                  <span className="text-[#A0A0A0]">Số tài khoản:</span>
                  <span className="font-mono-tabular font-bold text-[#FFC799]">0905 123 456</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.07]">
                  <span className="text-[#A0A0A0]">Số tiền:</span>
                  <span className="font-mono-tabular font-bold text-[#FFC799]">
                    {(qrPaymentType === 'Full100'
                      ? selectedBookingForQrPay.totalAmount
                      : selectedBookingForQrPay.depositAmount
                    ).toLocaleString('vi-VN')}{' '}
                    đ
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#A0A0A0]">Nội dung CK:</span>
                  <span className="font-mono-tabular font-bold text-[#F5F5F5]">
                    MOTORENT {selectedBookingForQrPay.bookingCode}
                  </span>
                </div>
              </div>
            </div>

            {qrVerifiedSuccess ? (
              <div className="p-3.5 rounded-xl bg-[#FFC799]/15 border border-[#FFC799]/30 text-[#FFC799] text-xs font-semibold flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#FFC799]" />
                <span>Giao dịch hợp lệ! Đã xác nhận thanh toán và khóa biển số xe.</span>
              </div>
            ) : (
              <button
                type="button"
                disabled={qrVerifying}
                onClick={handleConfirmQrPayment}
                className="w-full py-3 rounded-xl bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] text-xs font-semibold transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
              >
                {qrVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang đối soát giao dịch VietQR với ngân hàng...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Tôi đã quét mã chuyển khoản — Xác nhận hoàn thành</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: CANCEL BOOKING CONFIRMATION
          ===================================================================== */}
      {/* =====================================================================
          MODAL 2: CANCEL BOOKING CONFIRMATION WITH BR-06 POLICY
          ===================================================================== */}
      {selectedBookingForCancel && (() => {
        const pickupTime = new Date(selectedBookingForCancel.pickupDateTime).getTime();
        const hoursUntilPickup = (pickupTime - Date.now()) / (1000 * 3600);
        const paid =
          selectedBookingForCancel.paidAmount ||
          (selectedBookingForCancel.depositPaid ? selectedBookingForCancel.depositAmount : 0) ||
          0;
        const deposit = selectedBookingForCancel.depositAmount || 0;
        const isMoreThan24h = hoursUntilPickup > 24;
        const forfeitAmount = paid > 0 ? (isMoreThan24h ? 0 : Math.round(deposit * 0.5)) : 0;
        const refundEstimate = Math.max(0, paid - forfeitAmount);

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#161616] rounded-2xl max-w-lg w-full p-6 border border-white/15 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2 text-[#FF8080] font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Xác nhận hủy đơn {selectedBookingForCancel.bookingCode}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBookingForCancel(null)}
                  className="text-[#A0A0A0] hover:text-[#F5F5F5] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* BR-06 Policy Breakdown Card */}
              <div
                className={`p-4 rounded-xl border space-y-2 text-xs ${
                  paid > 0 && isMoreThan24h
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    : paid > 0
                    ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                    : 'bg-[#101010] border-white/10 text-[#A0A0A0]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white uppercase tracking-wider text-[11px]">
                    Chính sách hủy đơn BR-06
                  </span>
                  <span className="font-mono-tabular font-medium">
                    {hoursUntilPickup > 0
                      ? `Còn ${Math.max(0, Math.floor(hoursUntilPickup))} giờ trước nhận xe`
                      : 'Đã tới giờ nhận xe'}
                  </span>
                </div>

                {paid > 0 ? (
                  isMoreThan24h ? (
                    <p className="leading-relaxed text-emerald-300">
                      Bạn đang hủy trước giờ nhận xe hơn 24 giờ. Theo quy định chính sách BR-06, quý khách được <strong>miễn phí hủy 100%</strong> và sẽ được hoàn lại toàn bộ số tiền đã thanh toán.
                    </p>
                  ) : (
                    <p className="leading-relaxed text-amber-300">
                      Bạn đang hủy trong vòng 24 giờ trước giờ nhận xe. Theo chính sách BR-06, hệ thống sẽ <strong>khấu trừ 50% tiền đặt cọc</strong> và hoàn lại số tiền còn lại.
                    </p>
                  )
                ) : (
                  <p className="leading-relaxed text-[#A0A0A0]">
                    Đơn đặt xe chưa phát sinh khoản thanh toán cọc. Hệ thống sẽ giải phóng xe về trạng thái sẵn sàng cho khách hàng khác mà không phát sinh phí.
                  </p>
                )}

                {paid > 0 && (
                  <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-2 text-center font-mono-tabular text-[11px]">
                    <div className="bg-black/30 p-2 rounded-lg">
                      <div className="text-[#A0A0A0] text-[10px]">Đã thanh toán</div>
                      <div className="font-bold text-white">{paid.toLocaleString('vi-VN')} đ</div>
                    </div>
                    <div className="bg-black/30 p-2 rounded-lg">
                      <div className="text-[#A0A0A0] text-[10px]">Phí khấu trừ BR-06</div>
                      <div className="font-bold text-[#FF8080]">
                        {forfeitAmount > 0 ? `-${forfeitAmount.toLocaleString('vi-VN')} đ` : '0 đ'}
                      </div>
                    </div>
                    <div className="bg-black/30 p-2 rounded-lg">
                      <div className="text-[#A0A0A0] text-[10px]">Tiền hoàn dự kiến</div>
                      <div className="font-bold text-emerald-400">
                        {refundEstimate.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#F5F5F5] mb-1.5">
                  Lý do hủy đơn
                </label>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {[
                    'Thay đổi lịch trình',
                    'Đổi sang mẫu xe khác',
                    'Có việc đột xuất',
                    'Đặt nhầm ngày nhận xe',
                  ].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setCancelReasonInput(reason)}
                      className={`p-2 rounded-lg text-[11px] text-left border transition-all cursor-pointer ${
                        cancelReasonInput === reason
                          ? 'bg-[#FFC799]/15 border-[#FFC799] text-[#F5F5F5]'
                          : 'bg-[#101010] border-white/10 text-[#A0A0A0]'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={cancelReasonInput}
                  onChange={(e) => setCancelReasonInput(e.target.value)}
                  placeholder="Hoặc nhập lý do khác..."
                  className="w-full px-3 py-2 bg-[#101010] border border-white/12 rounded-lg text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={() => setSelectedBookingForCancel(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#101010] border border-white/10 text-[#A0A0A0] text-xs font-medium hover:text-[#F5F5F5] cursor-pointer"
                >
                  Giữ lại đơn
                </button>
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={handleCancelBooking}
                  className="flex-1 py-2.5 rounded-xl bg-[#FF8080] hover:bg-[#FF9999] text-[#101010] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                >
                  {cancelLoading
                    ? 'Đang hủy...'
                    : paid > 0 && refundEstimate > 0
                    ? `Xác nhận hủy (Hoàn ${refundEstimate.toLocaleString('vi-VN')} đ)`
                    : 'Xác nhận hủy đơn'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Extend Rental Modal (UC-34) */}
      {selectedBookingForExtend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#161616] border border-white/12 rounded-2xl w-full max-w-lg p-6 space-y-5 text-[#F5F5F5] shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2.5">
                <Clock className="w-5 h-5 text-[#FFC799]" />
                <h3 className="text-base font-bold text-[#F5F5F5]">
                  Gia hạn thời gian thuê xe
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForExtend(null)}
                className="text-[#A0A0A0] hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs space-y-2">
              <div className="flex justify-between text-[#A0A0A0]">
                <span>Mã đơn:</span>
                <span className="text-[#FFC799] font-mono-tabular font-bold">
                  {selectedBookingForExtend.bookingCode}
                </span>
              </div>
              <div className="flex justify-between text-[#A0A0A0]">
                <span>Thời gian trả xe hiện tại:</span>
                <span className="text-[#F5F5F5] font-mono-tabular font-semibold">
                  {new Date(selectedBookingForExtend.returnDateTime).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#F5F5F5]">
                Chọn mốc thời gian trả xe mới *
              </label>
              <input
                type="datetime-local"
                value={extendNewDate}
                min={new Date(new Date(selectedBookingForExtend.returnDateTime).getTime() + 3600 * 1000)
                  .toISOString()
                  .slice(0, 16)}
                onChange={(e) => {
                  const val = e.target.value;
                  setExtendNewDate(val);
                  if (val) {
                    fetchExtendEstimate(selectedBookingForExtend._id, val);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-[#101010] border border-white/12 focus:border-[#FFC799] rounded-xl text-xs text-[#F5F5F5] outline-none [color-scheme:dark]"
              />
              <p className="text-[11px] text-[#A0A0A0]">
                Khung giờ trả xe mới phải nằm trong giờ mở cửa của chi nhánh và tối đa 30 ngày.
              </p>
            </div>

            {/* Live Pricing Breakdown / Error */}
            {extendEstimating ? (
              <div className="p-4 rounded-xl bg-[#101010] border border-white/[0.08] text-center space-y-2">
                <RefreshCw className="w-4 h-4 text-[#FFC799] animate-spin mx-auto" />
                <span className="text-xs text-[#A0A0A0]">Đang kiểm tra lịch trống và tính toán lại chi phí...</span>
              </div>
            ) : extendError ? (
              <div className="p-3.5 rounded-xl bg-[#FF8080]/10 border border-[#FF8080]/30 text-xs text-[#FF8080] flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{extendError}</span>
              </div>
            ) : extendEstimate ? (
              <div className="p-4 rounded-xl bg-[#101010] border border-white/[0.08] space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-[#A0A0A0]">
                  <span>Thời gian thuê thêm:</span>
                  <span className="text-[#F5F5F5] font-mono-tabular font-medium">
                    {extendEstimate.addedDays > 0 ? `${extendEstimate.addedDays} ngày ` : ''}
                    ({extendEstimate.addedHours} giờ)
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#A0A0A0]">
                  <span>Chi phí phát sinh thêm:</span>
                  <span className="text-[#FFC799] font-mono-tabular font-bold text-sm">
                    +{extendEstimate.addedAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="pt-2 border-t border-white/[0.06] flex justify-between items-center">
                  <span className="text-[#A0A0A0]">Tổng tiền thuê mới:</span>
                  <span className="text-white font-mono-tabular font-bold">
                    {extendEstimate.newTotalAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-[#A0A0A0]">
                  <span>Số dư còn lại cần thanh toán:</span>
                  <span className="text-[#99FFE4] font-mono-tabular font-semibold">
                    {extendEstimate.newRemainingAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                disabled={extendLoading}
                onClick={() => setSelectedBookingForExtend(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#101010] border border-white/10 text-[#A0A0A0] text-xs font-medium hover:text-[#F5F5F5] cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={extendLoading || extendEstimating || !extendEstimate?.isAvailable}
                onClick={handleConfirmExtend}
                className="flex-1 py-2.5 rounded-xl bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center space-x-2"
              >
                {extendLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {extendLoading
                    ? 'Đang xử lý...'
                    : extendEstimate
                    ? `Xác nhận gia hạn (+${extendEstimate.addedAmount.toLocaleString('vi-VN')} đ)`
                    : 'Xác nhận gia hạn'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
