import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  Camera, 
  Lock, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Award, 
  UploadCloud, 
  Eye, 
  EyeOff,
  Clock,
  X,
  FileCheck2,
  RefreshCw,
  KeyRound,
  Compass,
  Copy,
  Check,
  ChevronRight,
  RotateCcw,
  MapPin,
  ArrowRight,
  PhoneCall,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import axios from 'axios';
import { calculatePasswordStrength } from '../utils/validation';
import { getUserAvatarUrl, getOptimizedVehicleImageUrl } from '../utils/imageHelper';
import { applyEkycWatermark } from '../utils/watermark';
import type { Booking, Vehicle, Branch } from '../types';

export type ProfileTab = 'bookings' | 'info' | 'avatar' | 'ekyc' | 'password';


export const ProfilePage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab: bookings | info | avatar | ekyc | password
  const initialTab = (searchParams.get('tab') as ProfileTab) || 'bookings';
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form states - Info
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(user?.gender || 'Other');
  const [dob, setDob] = useState(user?.dob ? user.dob.split('T')[0] : '');

  // Form states - Password (UC-23)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states - Avatar (UC-21)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form states - eKYC (UC-22 & Decree 13/2023/ND-CP)
  const [idCardFrontFile, setIdCardFrontFile] = useState<File | null>(null);
  const [idCardFrontPreview, setIdCardFrontPreview] = useState<string | null>(null);
  const [idCardBackFile, setIdCardBackFile] = useState<File | null>(null);
  const [idCardBackPreview, setIdCardBackPreview] = useState<string | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [isWatermarking, setIsWatermarking] = useState<'idCardFront' | 'idCardBack' | 'drivingLicense' | null>(null);
  const [ekycConsent, setEkycConsent] = useState(false);


  // Status indicators
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await api.get('/bookings/my');
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        setBookings(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách đơn thuê xe:', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
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
        cancelReason: cancelReasonInput.trim() || 'Khách hàng yêu cầu hủy đơn trực tuyến.'
      });
      if (res.data && res.data.success) {
        setSelectedBookingForCancel(null);
        setCancelReasonInput('');
        await fetchBookings();
        setSuccessMsg('Hủy đơn đặt giữ xe thành công.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Không thể hủy đơn đặt xe này. Vui lòng liên hệ tổng đài 1900 6868.');
      }
    } finally {
      setCancelLoading(false);
    }
  };

  // UC-20: Update Profile Info
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
        setSuccessMsg('Cập nhật thông tin hồ sơ thành công!');
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

  // UC-21: Handle Avatar file selection with 5MB check
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Spec: Max 5MB, JPEG/PNG/WebP
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh đại diện nhỏ hơn.');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setErrorMsg('Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPEG, PNG hoặc WebP.');
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setSuccessMsg('');
      setErrorMsg('');
    }
  };

  // UC-21: Upload Avatar (PUT /api/auth/me/avatar)
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
        setSuccessMsg('Cập nhật ảnh đại diện thành công!');
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

  // UC-22 & Decree 13/2023/ND-CP: eKYC Document file handlers with auto-watermarking
  const handleDocFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'idCardFront' | 'idCardBack' | 'drivingLicense'
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
        // Automatically stamp anti-fraud watermarking on client canvas before uploading
        const watermarkedFile = await applyEkycWatermark(rawFile, {
          rentalService: 'MOTORENT VIỆT NAM',
        });

        const previewUrl = URL.createObjectURL(watermarkedFile);
        if (type === 'idCardFront') {
          setIdCardFrontFile(watermarkedFile);
          setIdCardFrontPreview(previewUrl);
        } else if (type === 'idCardBack') {
          setIdCardBackFile(watermarkedFile);
          setIdCardBackPreview(previewUrl);
        } else {
          setLicenseFile(watermarkedFile);
          setLicensePreview(previewUrl);
        }
      } catch (watermarkErr) {
        console.warn('Lỗi xử lý đóng dấu watermarking:', watermarkErr);
        const fallbackUrl = URL.createObjectURL(rawFile);
        if (type === 'idCardFront') {
          setIdCardFrontFile(rawFile);
          setIdCardFrontPreview(fallbackUrl);
        } else if (type === 'idCardBack') {
          setIdCardBackFile(rawFile);
          setIdCardBackPreview(fallbackUrl);
        } else {
          setLicenseFile(rawFile);
          setLicensePreview(fallbackUrl);
        }
      } finally {
        setIsWatermarking(null);
      }
    }
  };

  // UC-22: Submit eKYC (POST /api/auth/ekyc) compliant with Decree 13/2023/ND-CP
  const handleUploadEkyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCardFrontFile && !idCardBackFile && !licenseFile) {
      setErrorMsg('Vui lòng chọn ít nhất một ảnh giấy tờ (CCCD hoặc GPLX) để gửi thẩm định.');
      return;
    }

    if (!ekycConsent) {
      setErrorMsg('Vui lòng tích xác nhận đồng ý điều khoản bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP trước khi gửi.');
      return;
    }

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    const formData = new FormData();
    if (idCardFrontFile) formData.append('idCardFront', idCardFrontFile);
    if (idCardBackFile) formData.append('idCardBack', idCardBackFile);
    if (licenseFile) formData.append('drivingLicense', licenseFile);
    formData.append('consentAgreed', 'true');
    formData.append('watermarked', 'true');

    try {
      const res = await api.post('/auth/ekyc', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data && res.data.success) {
        updateUser(res.data.data.user);
        setSuccessMsg('Gửi hồ sơ thẩm định eKYC thành công! Dữ liệu đã được lưu trữ bảo mật trong hệ thống riêng tư theo Nghị định 13/2023/NĐ-CP.');
        setIdCardFrontFile(null);
        setIdCardBackFile(null);
        setLicenseFile(null);
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


  // UC-23: Change Password (PUT /api/auth/change-password, min 8 chars)
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
        setSuccessMsg('Đổi mật khẩu thành công! Vui lòng ghi nhớ mật khẩu mới.');
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
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-[#060B0A]">
        <div className="text-center space-y-3">
          <p className="text-sm text-slate-400">Vui lòng đăng nhập để xem thông tin hồ sơ cá nhân.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2.5 bg-emerald-500 text-[#060D0B] rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors"
          >
            Đến trang Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  // Calculate full display avatar url
  const currentAvatar = previewUrl || getUserAvatarUrl(user.avatarUrl);

  // Compute password strength for Tab 4
  const passwordStrength = calculatePasswordStrength(newPassword);

  // Helper to format document image URLs (with JWT auth token for secure media streaming)
  const formatDocUrl = (url?: string) => {
    if (!url) return null;
    const resolved = getUserAvatarUrl(url);
    if (!resolved) return null;
    const token = localStorage.getItem('motorent_token') || localStorage.getItem('token');
    if (token && resolved.includes('/api/auth/ekyc/document')) {
      const sep = resolved.includes('?') ? '&' : '?';
      return `${resolved}${sep}token=${encodeURIComponent(token)}`;
    }
    return resolved;
  };


  return (
    <div className="min-h-screen bg-[#0A0F0D] text-slate-100 py-8 lg:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header & Breadcrumb */}
        <div className="mb-8">
          <nav className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
            <Link to="/" className="hover:text-emerald-400 transition-colors">Trang chủ</Link>
            <span>/</span>
            <span className="text-slate-200">Tài khoản</span>
            <span>/</span>
            <span className="text-emerald-400 font-medium">Hồ sơ cá nhân</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Cài đặt tài khoản
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Quản lý thông tin cá nhân, định danh điện tử và lịch sử thuê xe tại Motorent
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                {user.roles === 'SystemAdmin' ? 'Quản trị viên' : user.roles === 'Staff' ? 'Nhân viên quầy' : user.roles === 'BranchManager' ? 'Quản lý trạm' : 'Khách hàng cá nhân'}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Unified Settings Sidebar (4 cols) */}
          <aside className="lg:col-span-4">
            <div className="bg-[#111715] rounded-2xl border border-white/[0.08] p-5 shadow-xl shadow-black/20 space-y-5 sticky top-24">
              {/* User Mini Profile Header */}
              <div className="flex items-center space-x-3.5">
                <div className="relative group shrink-0">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-[#0A0F0D] ring-2 ring-emerald-500/30 flex items-center justify-center">
                    {currentAvatar ? (
                      <img
                        src={currentAvatar}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          if (target.parentElement) {
                            target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-emerald-950 text-emerald-300 font-bold text-lg">${(user.firstName || user.username || 'U').charAt(0).toUpperCase()}</div>`;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-emerald-950 text-emerald-300 font-bold text-lg">
                        {(user.firstName || user.username || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTabChange('avatar')}
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md transition-all active:scale-90"
                    title="Đổi ảnh đại diện"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-white text-sm truncate">
                    {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username}
                  </h2>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {user.email || `@${user.username}`}
                  </p>
                  <div className="flex items-center space-x-2 mt-1.5">
                    {user.identityStatus === 'Verified' ? (
                      <span className="inline-flex items-center text-[10px] font-semibold text-emerald-400">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Đã xác thực eKYC
                      </span>
                    ) : user.identityStatus === 'Pending' ? (
                      <span className="inline-flex items-center text-[10px] font-semibold text-amber-400">
                        <Clock className="w-3 h-3 mr-1" />
                        Chờ duyệt eKYC
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-semibold text-slate-400">
                        <ShieldCheck className="w-3 h-3 mr-1 text-slate-500" />
                        Chưa xác thực eKYC
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Loyalty summary chip */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
                <span className="text-slate-400 flex items-center">
                  <Award className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  Điểm tích lũy thành viên
                </span>
                <span className="font-bold text-emerald-400">
                  {user.loyaltyPoints || 0} pts
                </span>
              </div>

              {/* Navigation Menu (5 Tabs) */}
              <nav className="space-y-1 pt-1 border-t border-white/[0.06]" aria-label="Hồ sơ tài khoản">
                {/* 1. Chuyến xe của tôi */}
                <button
                  type="button"
                  onClick={() => handleTabChange('bookings')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                    activeTab === 'bookings'
                      ? 'bg-emerald-500/10 text-emerald-300 font-semibold border-l-2 border-emerald-400 pl-3'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Compass className={`w-4 h-4 shrink-0 ${activeTab === 'bookings' ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="truncate">Chuyến xe của tôi</span>
                  </div>
                  {bookings.filter(b => ['Pending', 'Approved', 'Confirmed', 'Ongoing'].includes(b.status)).length > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] shrink-0">
                      {bookings.filter(b => ['Pending', 'Approved', 'Confirmed', 'Ongoing'].includes(b.status)).length} đơn
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium shrink-0">
                      {bookings.length} chuyến
                    </span>
                  )}
                </button>

                {/* 2. Thông tin cá nhân & Chỉnh sửa */}
                <button
                  type="button"
                  onClick={() => handleTabChange('info')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                    activeTab === 'info'
                      ? 'bg-emerald-500/10 text-emerald-300 font-semibold border-l-2 border-emerald-400 pl-3'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <UserIcon className={`w-4 h-4 shrink-0 ${activeTab === 'info' ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="truncate">Thông tin cá nhân & Chỉnh sửa</span>
                  </div>
                </button>

                {/* 3. Đổi ảnh đại diện */}
                <button
                  type="button"
                  onClick={() => handleTabChange('avatar')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                    activeTab === 'avatar'
                      ? 'bg-emerald-500/10 text-emerald-300 font-semibold border-l-2 border-emerald-400 pl-3'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Camera className={`w-4 h-4 shrink-0 ${activeTab === 'avatar' ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="truncate">Đổi ảnh đại diện</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium shrink-0">5MB</span>
                </button>

                {/* 4. Định danh điện tử (eKYC) */}
                <button
                  type="button"
                  onClick={() => handleTabChange('ekyc')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                    activeTab === 'ekyc'
                      ? 'bg-emerald-500/10 text-emerald-300 font-semibold border-l-2 border-emerald-400 pl-3'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <FileCheck2 className={`w-4 h-4 shrink-0 ${activeTab === 'ekyc' ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="truncate">Định danh điện tử (eKYC)</span>
                  </div>
                  {user.identityStatus === 'Verified' ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] shrink-0">
                      Đã duyệt
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] shrink-0">
                      Cần làm
                    </span>
                  )}
                </button>

                {/* 5. Đổi mật khẩu bảo mật */}
                <button
                  type="button"
                  onClick={() => handleTabChange('password')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                    activeTab === 'password'
                      ? 'bg-emerald-500/10 text-emerald-300 font-semibold border-l-2 border-emerald-400 pl-3'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Lock className={`w-4 h-4 shrink-0 ${activeTab === 'password' ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="truncate">Đổi mật khẩu bảo mật</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium shrink-0">≥ 8 ký tự</span>
                </button>
              </nav>

              {/* Bottom Support Hotline helper */}
              <div className="pt-3 border-t border-white/[0.06]">
                <a
                  href="tel:19006868"
                  className="flex items-center space-x-2.5 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0 flex-1 leading-snug">
                    <p className="text-[11px] text-slate-400">Hỗ trợ khách hàng 24/7</p>
                    <p className="font-bold text-emerald-400">1900 6868</p>
                  </div>
                </a>
              </div>
            </div>
          </aside>

          {/* Right Column: Active Tab Content (8 cols) */}
          <main className="lg:col-span-8">
            <div className="bg-[#111715] rounded-2xl p-6 sm:p-8 border border-white/[0.08] shadow-xl shadow-black/20">
              {/* Alert notices */}
              {successMsg && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center space-x-2.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-medium">{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center space-x-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              {/* TAB: My Bookings (Chuyến xe của tôi) */}
              {activeTab === 'bookings' && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="pb-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                        <Compass className="w-5 h-5 text-emerald-400" />
                        <span>Chuyến xe của tôi</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Lịch trình nhận xe, thanh toán cọc và quản lý hợp đồng thuê xe điện tử
                      </p>
                    </div>

                    <Link
                      to="/bikes"
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-[#060D0B] rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-500/20 shrink-0 self-start sm:self-auto"
                    >
                      <span>Thuê xe mới</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setBookingFilter('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                        bookingFilter === 'all'
                          ? 'bg-emerald-500 text-[#060D0B]'
                          : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      Tất cả ({bookings.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingFilter('active')}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                        bookingFilter === 'active'
                          ? 'bg-emerald-500 text-[#060D0B]'
                          : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      Chờ duyệt & Đang giữ xe ({bookings.filter(b => ['Pending', 'Approved', 'Confirmed', 'Ongoing'].includes(b.status)).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingFilter('completed')}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                        bookingFilter === 'completed'
                          ? 'bg-emerald-500 text-[#060D0B]'
                          : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      Hoàn thành ({bookings.filter(b => b.status === 'Completed').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingFilter('cancelled')}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                        bookingFilter === 'cancelled'
                          ? 'bg-emerald-500 text-[#060D0B]'
                          : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      Đã hủy ({bookings.filter(b => ['Cancelled', 'Rejected'].includes(b.status)).length})
                    </button>
                  </div>

                  {/* Bookings List */}
                  {bookingsLoading ? (
                    <div className="py-12 text-center space-y-3">
                      <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
                      <p className="text-xs text-slate-400">Đang tải lịch trình thuê xe của bạn...</p>
                    </div>
                  ) : (() => {
                    const filteredBookings = bookings.filter((b) => {
                      if (bookingFilter === 'active') return ['Pending', 'Approved', 'Confirmed', 'Ongoing'].includes(b.status);
                      if (bookingFilter === 'completed') return b.status === 'Completed';
                      if (bookingFilter === 'cancelled') return ['Cancelled', 'Rejected'].includes(b.status);
                      return true;
                    });

                    if (filteredBookings.length === 0) {
                      return (
                        <div className="p-10 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-4">
                          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                            <Compass className="w-7 h-7" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">Chưa có chuyến xe nào</h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                              {bookingFilter === 'all'
                                ? 'Bạn chưa đặt thuê xe máy nào. Hãy chọn dòng xe tay ga hoặc xe số ưng ý để vi vu khám phá Đà Nẵng!'
                                : 'Không tìm thấy chuyến xe nào ở danh mục này.'}
                            </p>
                          </div>
                          <Link
                            to="/bikes"
                            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-[#060D0B] rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
                          >
                            <span>Khám phá bảng giá & Đặt xe</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {filteredBookings.map((b) => {
                          const v = (typeof b.vehicleId === 'object' && b.vehicleId !== null) ? (b.vehicleId as Vehicle) : null;
                          const pb = (typeof b.pickupBranchId === 'object' && b.pickupBranchId !== null) ? (b.pickupBranchId as Branch) : null;
                          const rb = (typeof b.returnBranchId === 'object' && b.returnBranchId !== null) ? (b.returnBranchId as Branch) : null;

                          const vehicleName = v?.vehicleModel || 'Xe máy Motorent';
                          const vehicleBrand = v?.brand || '';
                          const licensePlate = v?.licensePlate || 'Chờ bàn giao';
                          const vehicleImg = v?.images && v.images.length > 0 ? getOptimizedVehicleImageUrl(v.images[0]) : '';

                          const canCancel = b.status === 'Pending' || b.status === 'Approved' || b.status === 'Confirmed';

                          return (
                            <div
                              key={b._id}
                              className="p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 hover:border-emerald-500/30 transition-all space-y-4"
                            >
                              {/* Header Card: Code & Status */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/5">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono font-black text-sm text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                    {b.bookingCode}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCode(b.bookingCode)}
                                    className="p-1 text-slate-400 hover:text-white transition-colors"
                                    title="Sao chép mã đơn"
                                  >
                                    {copiedCode === b.bookingCode ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  {b.createdAt && (
                                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                                      • Đặt ngày: {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  {b.status === 'Pending' && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-1.5" />
                                      Chờ xác nhận cọc
                                    </span>
                                  )}
                                  {(b.status === 'Approved' || b.status === 'Confirmed') && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                      <CheckCircle2 className="w-3 h-3 mr-1 text-sky-400" />
                                      Đã xác nhận giữ xe
                                    </span>
                                  )}
                                  {b.status === 'Ongoing' && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                                      Đang lưu hành trên đường
                                    </span>
                                  )}
                                  {b.status === 'Completed' && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Hoàn tất chuyến đi
                                    </span>
                                  )}
                                  {(b.status === 'Cancelled' || b.status === 'Rejected') && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                                      <X className="w-3 h-3 mr-1" />
                                      Đã hủy đơn
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Body: Vehicle Info + Schedule + Payment */}
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                {/* Vehicle Preview (4 cols) */}
                                <div className="md:col-span-4 flex items-center space-x-3.5">
                                  <div className="w-20 h-16 rounded-xl bg-[#060D0B] border border-white/10 overflow-hidden shrink-0 flex items-center justify-center p-1">
                                    {vehicleImg ? (
                                      <img
                                        src={vehicleImg}
                                        alt={vehicleName}
                                        className="w-full h-full object-cover rounded-lg"
                                      />
                                    ) : (
                                      <Compass className="w-6 h-6 text-slate-600" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-white text-xs truncate">{vehicleName}</h4>
                                    <p className="text-[11px] text-slate-400">{vehicleBrand}</p>
                                    <div className="mt-1">
                                      <span className="inline-block px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-emerald-400">
                                        {licensePlate}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Schedule & Branch (5 cols) */}
                                <div className="md:col-span-5 space-y-2 text-xs border-y md:border-y-0 md:border-l md:border-r border-white/5 py-3 md:py-0 md:px-4">
                                  <div className="flex items-start space-x-2">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-[11px] text-slate-400">
                                        Nhận: <span className="font-bold text-white">{new Date(b.pickupDateTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                      </p>
                                      <p className="text-[10px] text-slate-400 truncate">{pb?.name || 'Chi nhánh Motorent'}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start space-x-2">
                                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-[11px] text-slate-400">
                                        Trả: <span className="font-bold text-white">{new Date(b.returnDateTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                      </p>
                                      <p className="text-[10px] text-slate-400 truncate">{rb?.name || 'Chi nhánh Motorent'}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Financial details (3 cols) */}
                                <div className="md:col-span-3 text-right space-y-1 text-xs">
                                  <p className="text-[11px] text-slate-400">Tổng tiền thuê</p>
                                  <p className="text-sm font-black text-white">{b.totalAmount.toLocaleString('vi-VN')} đ</p>
                                  <div className="text-[10px] space-y-0.5 pt-1">
                                    <p className="text-emerald-400 font-semibold">
                                      Đã cọc 30%: {b.depositAmount.toLocaleString('vi-VN')} đ
                                    </p>
                                    <p className="text-slate-400">
                                      Còn lại: {b.remainingAmount.toLocaleString('vi-VN')} đ
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Footer Actions */}
                              <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                                <div className="text-[11px] text-slate-400">
                                  {b.cancelReason && (
                                    <span className="text-red-400/90">Lý do hủy: {b.cancelReason}</span>
                                  )}
                                  {b.loyaltyPointsEarned > 0 && (
                                    <span className="text-emerald-400 font-semibold">+{b.loyaltyPointsEarned} điểm thưởng</span>
                                  )}
                                </div>

                                <div className="flex items-center space-x-2">
                                  {canCancel && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedBookingForCancel(b)}
                                      className="px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-xs font-semibold transition-colors"
                                    >
                                      Hủy đơn đặt
                                    </button>
                                  )}
                                  {v && (
                                    <Link
                                      to={`/booking/${v._id}`}
                                      className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center space-x-1"
                                    >
                                      <RotateCcw className="w-3 h-3 text-emerald-400" />
                                      <span>Thuê lại xe này</span>
                                    </Link>
                                  )}
                                  <a
                                    href="tel:19006868"
                                    className="p-1.5 rounded-xl bg-white/[0.04] text-slate-400 hover:text-white transition-colors"
                                    title="Liên hệ hotline chi nhánh 1900 6868"
                                  >
                                    <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 1: Edit Info */}
              {activeTab === 'info' && (
                <div>
                  <div className="pb-5 border-b border-white/[0.08] mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight">
                        Thông tin cá nhân & Liên hệ
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Thông tin dùng để đối chiếu khi bàn giao xe và xuất hợp đồng điện tử
                      </p>
                    </div>
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 self-start sm:self-auto">
                      Hồ sơ khách hàng
                    </span>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    {/* Fieldset 1: Account identification (read-only) */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>1. Tài khoản định danh hệ thống</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            Tên người dùng (Username)
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={user.username}
                              disabled
                              className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-400 cursor-not-allowed outline-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-medium">
                              Cố định
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            Địa chỉ email liên kết
                          </label>
                          <div className="relative">
                            <input
                              type="email"
                              value={user.email || 'Chưa cập nhật'}
                              disabled
                              className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 cursor-not-allowed outline-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400 font-semibold flex items-center">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Đã xác thực
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fieldset 2: Legal identification info */}
                    <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                        <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span>2. Thông tin pháp lý người thuê xe</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">
                            Họ và tên đệm <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="VD: Nguyễn Văn"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 focus:border-emerald-500 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">
                            Tên <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="VD: An"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 focus:border-emerald-500 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">
                            Giới tính
                          </label>
                          <div className="relative">
                            <select
                              value={gender}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'Male' || val === 'Female' || val === 'Other') {
                                  setGender(val);
                                }
                              }}
                              className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 focus:border-emerald-500 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none appearance-none cursor-pointer transition-all"
                            >
                              <option value="Male" className="bg-[#111715] text-white">Nam</option>
                              <option value="Female" className="bg-[#111715] text-white">Nữ</option>
                              <option value="Other" className="bg-[#111715] text-white">Khác</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">
                            Ngày sinh
                          </label>
                          <input
                            type="date"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 focus:border-emerald-500 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all [color-scheme:dark]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Fieldset 3: Contact information */}
                    <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>3. Thông tin liên hệ nhận xe</span>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Số điện thoại di động <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="tel"
                          placeholder="VD: 0912 345 678"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full sm:w-1/2 bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 focus:border-emerald-500 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none transition-all"
                        />
                        <p className="text-[11px] text-slate-400 mt-1.5">
                          Dùng để nhận tin nhắn SMS xác nhận lịch bàn giao xe và mã PIN mở khóa phương tiện.
                        </p>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="text-xs text-slate-400 flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Thông tin được bảo mật và mã hóa trên máy chủ Motorent.</span>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-emerald-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang lưu thông tin...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Lưu thay đổi</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: Change Avatar (UC-21: Max 5MB, JPEG/PNG/WebP, Multer upload) */}
              {activeTab === 'avatar' && (
                <div>
                  <div className="pb-5 border-b border-white/[0.08] mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight">
                        Thay đổi ảnh đại diện
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Tải lên hình ảnh đại diện rõ nét định dạng JPG, PNG hoặc WebP (tối đa 5MB)
                      </p>
                    </div>
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 self-start sm:self-auto">
                      Ảnh hồ sơ cá nhân
                    </span>
                  </div>

                  <form onSubmit={handleUploadAvatar} className="space-y-6">
                    {/* Preview & Dropzone Box */}
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/15 hover:border-white/25 transition-colors">
                      <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-emerald-500/20 bg-[#0A0F0D] shadow-md flex items-center justify-center flex-shrink-0">
                        {currentAvatar ? (
                          <img
                            src={currentAvatar}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <UserIcon className="w-12 h-12 text-slate-500" />
                        )}
                      </div>

                      <div className="space-y-2 text-center sm:text-left flex-1">
                        <label className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl text-xs font-semibold text-slate-200 cursor-pointer transition-colors active:scale-95">
                          <UploadCloud className="w-4 h-4 text-emerald-400" />
                          <span>Chọn file ảnh mới từ thiết bị</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleAvatarFileChange}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[11px] text-slate-400">
                          {selectedFile 
                            ? `Đã chọn: ${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)` 
                            : 'Định dạng được hỗ trợ: JPEG, PNG, WebP. Kích thước tối đa 5MB.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/[0.08] flex justify-end">
                      <button
                        type="submit"
                        disabled={loading || !selectedFile}
                        className={`inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          selectedFile && !loading
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/15 active:scale-95'
                            : 'bg-white/5 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang cập nhật...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5" />
                            <span>Lưu ảnh đại diện</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: eKYC Document Upload (UC-22: CCCD front/back + driving license) */}
              {activeTab === 'ekyc' && (
                <div>
                  <div className="pb-5 border-b border-white/[0.08] mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight">
                        Xác thực danh tính điện tử (eKYC)
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Tải lên ảnh 2 mặt CCCD và Giấy phép lái xe để thuê xe không giữ bản gốc
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {user.identityStatus === 'Verified' ? (
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
                          <span>Đã xác thực hợp lệ</span>
                        </div>
                      ) : user.identityStatus === 'Pending' ? (
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Clock className="w-4 h-4 mr-1.5 text-amber-400 animate-spin" />
                          <span>Đang chờ kiểm duyệt</span>
                        </div>
                      ) : user.identityStatus === 'Rejected' ? (
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                          <AlertCircle className="w-4 h-4 mr-1.5 text-red-400" />
                          <span>Yêu cầu gửi lại hồ sơ</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 text-slate-400 border border-white/10">
                          <ShieldCheck className="w-4 h-4 mr-1.5 text-slate-500" />
                          <span>Chưa xác thực</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className={`p-4 rounded-xl border mb-6 text-xs leading-relaxed ${
                    user.identityStatus === 'Verified'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : user.identityStatus === 'Pending'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                      : user.identityStatus === 'Rejected'
                      ? 'bg-red-500/10 border-red-500/20 text-red-300'
                      : 'bg-white/[0.02] border-white/10 text-slate-300'
                  }`}>
                    {user.identityStatus === 'Verified' ? (
                      <div className="flex items-start space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="block font-bold">Hồ sơ eKYC của bạn đã được kiểm duyệt thành công!</strong>
                          <span>Bạn được hưởng toàn bộ đặc quyền nhận xe hỏa tốc tại các điểm chi nhánh Đà Nẵng mà không cần để lại CCCD gốc.</span>
                        </div>
                      </div>
                    ) : user.identityStatus === 'Pending' ? (
                      <div className="flex items-start space-x-2.5">
                        <Clock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="block font-bold">Hồ sơ đang trong hàng đợi đối soát</strong>
                          <span>Nhân viên điều phối sẽ đối chiếu thông tin trong vòng 15-30 phút. Bạn vẫn có thể đặt trước phương tiện bình thường.</span>
                        </div>
                      </div>
                    ) : user.identityStatus === 'Rejected' ? (
                      <div className="flex items-start space-x-2.5">
                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="block font-bold">Hình ảnh giấy tờ chưa đạt yêu cầu kiểm duyệt</strong>
                          {user.ekycRejectionReason && (
                            <p className="mt-1 font-semibold text-red-200 bg-red-950/60 p-2.5 rounded-lg border border-red-500/30">
                              Lý do từ chối: {user.ekycRejectionReason}
                            </p>
                          )}
                          <span className="block mt-1">Vui lòng kiểm tra lại ảnh chụp: chụp rõ đủ 4 góc của thẻ CCCD, không bị lóa sáng và GPLX còn hạn sử dụng rồi gửi lại hồ sơ bên dưới.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start space-x-2.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="block font-bold">Bảo vệ quyền lợi tối đa cho khách thuê xe</strong>
                          <span>Hình ảnh của bạn được lưu trữ mã hóa an toàn trên máy chủ Motorent và chỉ dùng cho thủ tục ký nhận xe tại trạm.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleUploadEkyc} className="space-y-6">
                    {/* 3 Upload Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Card 1: CCCD Front */}
                      <div className="p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl border border-white/10 flex flex-col items-center justify-between text-center relative group min-h-[240px] transition-colors">
                        <div className="w-full flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            1. Mặt trước CCCD <span className="text-red-400">*</span>
                          </span>
                          {(idCardFrontFile || user.idCardFrontUrl) && (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-medium border border-emerald-500/25 shrink-0">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span>Đã bảo mật</span>
                            </span>
                          )}
                        </div>

                        <div className="w-full h-36 rounded-lg bg-[#0A0F0D] border border-white/10 overflow-hidden flex items-center justify-center relative">
                          {isWatermarking === 'idCardFront' ? (
                            <div className="p-4 text-center space-y-2">
                              <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
                              <span className="text-[11px] text-emerald-300 font-medium block">Đang đóng dấu bảo mật...</span>
                              <span className="text-[10px] text-slate-400 block">Nghị định 13/2023/NĐ-CP</span>
                            </div>
                          ) : idCardFrontPreview || formatDocUrl(user.idCardFrontUrl) ? (
                            <>
                              <img
                                src={idCardFrontPreview || formatDocUrl(user.idCardFrontUrl)!}
                                alt="CCCD Front"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm border border-emerald-500/30 text-[9px] font-semibold text-emerald-300 flex items-center space-x-1">
                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Chống mạo danh</span>
                              </div>
                            </>
                          ) : (
                            <div className="p-3 text-center space-y-1">
                              <FileCheck2 className="w-8 h-8 text-slate-500 mx-auto" />
                              <span className="text-[10px] text-slate-400 block">Chưa tải ảnh lên</span>
                            </div>
                          )}
                        </div>

                        <label className="mt-3 w-full py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-lg text-xs font-medium text-slate-200 cursor-pointer transition-colors block">
                          <span>{idCardFrontFile ? 'Thay đổi ảnh' : 'Chọn ảnh mặt trước'}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => handleDocFileChange(e, 'idCardFront')}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Card 2: CCCD Back */}
                      <div className="p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl border border-white/10 flex flex-col items-center justify-between text-center relative group min-h-[240px] transition-colors">
                        <div className="w-full flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            2. Mặt sau CCCD <span className="text-red-400">*</span>
                          </span>
                          {(idCardBackFile || user.idCardBackUrl) && (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-medium border border-emerald-500/25 shrink-0">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span>Đã bảo mật</span>
                            </span>
                          )}
                        </div>

                        <div className="w-full h-36 rounded-lg bg-[#0A0F0D] border border-white/10 overflow-hidden flex items-center justify-center relative">
                          {isWatermarking === 'idCardBack' ? (
                            <div className="p-4 text-center space-y-2">
                              <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
                              <span className="text-[11px] text-emerald-300 font-medium block">Đang đóng dấu bảo mật...</span>
                              <span className="text-[10px] text-slate-400 block">Nghị định 13/2023/NĐ-CP</span>
                            </div>
                          ) : idCardBackPreview || formatDocUrl(user.idCardBackUrl) ? (
                            <>
                              <img
                                src={idCardBackPreview || formatDocUrl(user.idCardBackUrl)!}
                                alt="CCCD Back"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm border border-emerald-500/30 text-[9px] font-semibold text-emerald-300 flex items-center space-x-1">
                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Chống mạo danh</span>
                              </div>
                            </>
                          ) : (
                            <div className="p-3 text-center space-y-1">
                              <FileCheck2 className="w-8 h-8 text-slate-500 mx-auto" />
                              <span className="text-[10px] text-slate-400 block">Chưa tải ảnh lên</span>
                            </div>
                          )}
                        </div>

                        <label className="mt-3 w-full py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-lg text-xs font-medium text-slate-200 cursor-pointer transition-colors block">
                          <span>{idCardBackFile ? 'Thay đổi ảnh' : 'Chọn ảnh mặt sau'}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => handleDocFileChange(e, 'idCardBack')}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Card 3: Driving License */}
                      <div className="p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl border border-white/10 flex flex-col items-center justify-between text-center relative group min-h-[240px] transition-colors">
                        <div className="w-full flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            3. Giấy phép lái xe <span className="text-red-400">*</span>
                          </span>
                          {(licenseFile || user.drivingLicenseUrl) && (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-medium border border-emerald-500/25 shrink-0">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span>Đã bảo mật</span>
                            </span>
                          )}
                        </div>

                        <div className="w-full h-36 rounded-lg bg-[#0A0F0D] border border-white/10 overflow-hidden flex items-center justify-center relative">
                          {isWatermarking === 'drivingLicense' ? (
                            <div className="p-4 text-center space-y-2">
                              <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
                              <span className="text-[11px] text-emerald-300 font-medium block">Đang đóng dấu bảo mật...</span>
                              <span className="text-[10px] text-slate-400 block">Nghị định 13/2023/NĐ-CP</span>
                            </div>
                          ) : licensePreview || formatDocUrl(user.drivingLicenseUrl) ? (
                            <>
                              <img
                                src={licensePreview || formatDocUrl(user.drivingLicenseUrl)!}
                                alt="Driving License"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm border border-emerald-500/30 text-[9px] font-semibold text-emerald-300 flex items-center space-x-1">
                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Chống mạo danh</span>
                              </div>
                            </>
                          ) : (
                            <div className="p-3 text-center space-y-1">
                              <FileCheck2 className="w-8 h-8 text-slate-500 mx-auto" />
                              <span className="text-[10px] text-slate-400 block">Chưa tải ảnh lên</span>
                            </div>
                          )}
                        </div>

                        <label className="mt-3 w-full py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-lg text-xs font-medium text-slate-200 cursor-pointer transition-colors block">
                          <span>{licenseFile ? 'Thay đổi ảnh' : 'Chọn ảnh GPLX'}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => handleDocFileChange(e, 'drivingLicense')}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Security Notice: Decree 13/2023/ND-CP & C06/A05 recommendations */}
                    <div className="p-4 bg-emerald-500/[0.04] rounded-xl border border-emerald-500/20 text-xs text-slate-300 space-y-2">
                      <div className="font-semibold text-emerald-400 flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Bảo mật dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP & Khuyến nghị C06/A05:</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px] text-slate-400">
                        <div className="flex items-start space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span><strong>Đóng dấu chống mạo danh:</strong> Tự động chèn watermark chéo <em>&quot;CHỈ DÙNG THUÊ XE MOTORENT - KHÔNG CÓ GIÁ TRỊ VAY VỐN&quot;</em> trực tiếp tại trình duyệt trước khi tải lên.</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span><strong>Lưu trữ cách ly tuyệt đối (Private Storage):</strong> Giấy tờ của bạn được lưu trong phân vùng riêng tư, ngăn chặn 100% việc truy cập công khai qua đường link URL.</span>
                        </div>
                      </div>
                    </div>

                    {/* Decree 13 Explicit Consent Agreement Checkbox */}
                    <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/10 hover:border-emerald-500/30 transition-colors">
                      <label className="flex items-start space-x-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={ekycConsent}
                          onChange={(e) => setEkycConsent(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-white/20 text-emerald-500 focus:ring-emerald-500/20 bg-black/40 cursor-pointer accent-emerald-500 shrink-0"
                        />
                        <span className="text-xs text-slate-300 leading-relaxed">
                          Tôi xác nhận đồng ý cung cấp thông tin giấy tờ tùy thân cho Motorent xử lý xác thực theo <strong>Nghị định 13/2023/NĐ-CP</strong>. Tôi đã kiểm tra ảnh đã được đóng dấu chống mạo danh và ủy quyền cho nhân viên Motorent đối soát khi giao nhận xe.
                        </span>
                      </label>
                    </div>

                    <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <span className="text-[11px] text-slate-400">
                        {user.identityStatus === 'Pending'
                          ? 'Hồ sơ đang được nhân viên kiểm duyệt, vui lòng không gửi lại.'
                          : user.identityStatus === 'Verified'
                          ? 'Tài khoản đã hoàn tất xác thực eKYC thành công.'
                          : (!idCardFrontFile && !idCardBackFile && !licenseFile)
                          ? 'Vui lòng chọn ảnh giấy tờ để tiếp tục.'
                          : !ekycConsent
                          ? 'Vui lòng tích đồng ý điều khoản bảo vệ dữ liệu để gửi.'
                          : 'Hồ sơ đã sẵn sàng để gửi đối soát an toàn.'}
                      </span>

                      <button
                        type="submit"
                        disabled={
                          loading ||
                          user.identityStatus === 'Pending' ||
                          user.identityStatus === 'Verified' ||
                          (!idCardFrontFile && !idCardBackFile && !licenseFile) ||
                          !ekycConsent
                        }
                        className={`inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          (idCardFrontFile || idCardBackFile || licenseFile) &&
                          ekycConsent &&
                          !loading &&
                          user.identityStatus !== 'Pending' &&
                          user.identityStatus !== 'Verified'
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/15 active:scale-95 cursor-pointer'
                            : 'bg-white/5 text-slate-500 cursor-not-allowed opacity-60'
                        }`}
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang lưu trữ bảo mật...</span>
                          </>
                        ) : user.identityStatus === 'Pending' ? (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Hồ sơ đang chờ duyệt</span>
                          </>
                        ) : user.identityStatus === 'Verified' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Đã xác thực</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Gửi hồ sơ thẩm định eKYC</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}


              {/* TAB 4: Change Password (UC-23: Verify old, bcrypt new, min 8 chars) */}
              {activeTab === 'password' && (
                <div>
                  <div className="pb-5 border-b border-white/[0.08] mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight">
                        Đổi mật khẩu bảo mật
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Sử dụng mật khẩu mạnh từ 8 ký tự trở lên kết hợp chữ hoa, chữ thường và chữ số
                      </p>
                    </div>
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 self-start sm:self-auto">
                      Bảo mật tài khoản
                    </span>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-5 max-w-lg">
                    {/* Current Password */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center">
                        <Lock className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                        <span>Mật khẩu hiện tại</span>
                        <span className="text-red-400 ml-1">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          placeholder="Nhập mật khẩu hiện tại của bạn..."
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 focus:border-emerald-500 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/30 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white focus:outline-none"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                        <span>Mật khẩu mới</span>
                        <span className="text-red-400 ml-1">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)..."
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 focus:border-emerald-500 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/30 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white focus:outline-none"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Password strength indicator */}
                      {newPassword.length > 0 && (
                        <div className="mt-2.5 space-y-1.5 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-medium">Độ phức tạp mật khẩu:</span>
                            <span className={`font-bold ${passwordStrength.color}`}>
                              {passwordStrength.label}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            {[1, 2, 3, 4].map((seg) => (
                              <div
                                key={seg}
                                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                  seg <= passwordStrength.score ? passwordStrength.bgClass : 'bg-white/10'
                                }`}
                              />
                            ))}
                          </div>
                          {newPassword.length < 8 && (
                            <p className="text-[11px] text-amber-400 font-medium">
                              • Cần thêm ít nhất {8 - newPassword.length} ký tự nữa để đạt chuẩn tối thiểu 8 ký tự.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center">
                        <Lock className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                        <span>Xác nhận lại mật khẩu mới</span>
                        <span className="text-red-400 ml-1">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Nhập lại chính xác mật khẩu mới..."
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 focus:border-emerald-500 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/30 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white focus:outline-none"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword && newPassword && confirmPassword === newPassword && (
                        <div className="flex items-center space-x-1.5 mt-1.5 text-xs font-medium text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mật khẩu xác nhận trùng khớp</span>
                        </div>
                      )}
                      {confirmPassword && newPassword && confirmPassword !== newPassword && (
                        <div className="flex items-center space-x-1.5 mt-1.5 text-xs font-medium text-red-400">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Mật khẩu xác nhận chưa trùng khớp</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-white/[0.08] flex justify-end">
                      <button
                        type="submit"
                        disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
                        className={`inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          newPassword.length >= 8 && newPassword === confirmPassword && !loading
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/15 active:scale-95'
                            : 'bg-white/5 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang cập nhật mật khẩu...</span>
                          </>
                        ) : (
                          <>
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Cập nhật mật khẩu mới</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Cancel Booking Confirmation Modal */}
      {selectedBookingForCancel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#091512] rounded-3xl max-w-md w-full p-6 border border-white/10 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2 text-red-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Xác nhận hủy đơn đặt giữ xe</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForCancel(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn hủy đơn đặt giữ xe mã{' '}
              <strong className="text-emerald-400 font-mono font-bold">
                {selectedBookingForCancel.bookingCode}
              </strong>
              ? Xe sẽ được mở lại cho khách hàng khác đặt trên hệ thống.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Lý do hủy đơn (tùy chọn)
              </label>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {[
                  'Thay đổi kế hoạch chuyến đi',
                  'Muốn chọn dòng xe khác',
                  'Có việc bận đột xuất',
                  'Chuyển sang phương tiện khác'
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setCancelReasonInput(reason)}
                    className={`p-2 rounded-xl text-[11px] text-left border transition-all ${
                      cancelReasonInput === reason
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/[0.06]'
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
                className="w-full px-3 py-2 bg-[#060B0A] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center space-x-3 pt-3">
              <button
                type="button"
                disabled={cancelLoading}
                onClick={() => setSelectedBookingForCancel(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/10 transition-colors"
              >
                Giữ lại đơn
              </button>
              <button
                type="button"
                disabled={cancelLoading}
                onClick={handleCancelBooking}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-lg shadow-red-600/30"
              >
                {cancelLoading ? (
                  <span>Đang hủy...</span>
                ) : (
                  <span>Xác nhận hủy đơn</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
