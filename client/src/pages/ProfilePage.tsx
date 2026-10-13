import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import axios from 'axios';
import { calculatePasswordStrength } from '../utils/validation';

export const ProfilePage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab: info | avatar | ekyc | password
  const initialTab = (searchParams.get('tab') as 'info' | 'avatar' | 'ekyc' | 'password') || 'info';
  const [activeTab, setActiveTab] = useState<'info' | 'avatar' | 'ekyc' | 'password'>(initialTab);

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

  // Form states - eKYC (UC-22)
  const [idCardFrontFile, setIdCardFrontFile] = useState<File | null>(null);
  const [idCardFrontPreview, setIdCardFrontPreview] = useState<string | null>(null);
  const [idCardBackFile, setIdCardBackFile] = useState<File | null>(null);
  const [idCardBackPreview, setIdCardBackPreview] = useState<string | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);

  // Status indicators
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhoneNumber(user.phoneNumber || '');
      setGender(user.gender || 'Other');
      if (user.dob) setDob(user.dob.split('T')[0]);
    }
  }, [user]);

  const handleTabChange = (tab: 'info' | 'avatar' | 'ekyc' | 'password') => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSuccessMsg('');
    setErrorMsg('');
  };

  // UC-20: Update Profile Info
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.put('/auth/profile', {
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

  // UC-22: eKYC Document file handlers
  const handleDocFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'idCardFront' | 'idCardBack' | 'drivingLicense'
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('Dung lượng mỗi file ảnh giấy tờ không được vượt quá 10MB.');
        return;
      }

      const url = URL.createObjectURL(file);
      if (type === 'idCardFront') {
        setIdCardFrontFile(file);
        setIdCardFrontPreview(url);
      } else if (type === 'idCardBack') {
        setIdCardBackFile(file);
        setIdCardBackPreview(url);
      } else {
        setLicenseFile(file);
        setLicensePreview(url);
      }
      setSuccessMsg('');
      setErrorMsg('');
    }
  };

  // UC-22: Submit eKYC (POST /api/auth/ekyc)
  const handleUploadEkyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCardFrontFile && !idCardBackFile && !licenseFile) {
      setErrorMsg('Vui lòng chọn ít nhất một ảnh giấy tờ (CCCD hoặc GPLX) để gửi thẩm định.');
      return;
    }

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    const formData = new FormData();
    if (idCardFrontFile) formData.append('idCardFront', idCardFrontFile);
    if (idCardBackFile) formData.append('idCardBack', idCardBackFile);
    if (licenseFile) formData.append('drivingLicense', licenseFile);

    try {
      const res = await api.post('/auth/ekyc', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data && res.data.success) {
        updateUser(res.data.data.user);
        setSuccessMsg('Gửi hồ sơ thẩm định eKYC thành công! Trạng thái hiện tại: Đang chờ nhân viên đối soát.');
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
  const currentAvatar = previewUrl || (user.avatarUrl ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `http://localhost:5000${user.avatarUrl}`) : null);

  // Compute password strength for Tab 4
  const passwordStrength = calculatePasswordStrength(newPassword);

  // Helper to format document image URLs
  const formatDocUrl = (url?: string) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `http://localhost:5000${url}`;
  };

  return (
    <div className="min-h-screen bg-[#060B0A] text-slate-100 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Breadcrumb & Title */}
        <div className="mb-8">
          <span className="text-xs font-semibold tracking-wider text-emerald-400 block mb-1">
            Quản lý tài khoản
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Hồ sơ cá nhân & Bảo mật
          </h1>
        </div>

        {/* 2-Column Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Profile Card & Quick Navigation (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* User Identity Card */}
            <div className="bg-[#0B1513] rounded-3xl p-6 border border-white/10 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-emerald-950 to-[#081B15]"></div>

              {/* Avatar with status border */}
              <div className="relative mt-8 mb-4 inline-block">
                <div className="w-24 h-24 rounded-full border-4 border-[#0B1513] shadow-md overflow-hidden bg-[#060B0A] flex items-center justify-center mx-auto">
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
                          target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-emerald-950 text-emerald-300 font-bold text-2xl">${(user.firstName || user.username || 'U').charAt(0).toUpperCase()}</div>`;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#060B0A] text-emerald-400">
                      <UserIcon className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleTabChange('avatar')}
                  className="absolute bottom-1 right-1 p-1.5 bg-emerald-500 text-[#060D0B] rounded-full shadow-lg hover:bg-emerald-400 transition-colors"
                  title="Thay đổi ảnh đại diện"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <h3 className="text-lg font-bold text-white">
                {`${user.lastName || ''} ${user.firstName || ''}`.trim() || user.username}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">@{user.username}</p>

              {/* Role & Verification Badge */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {user.roles === 'SystemAdmin' ? 'Quản trị viên' : user.roles === 'Staff' ? 'Nhân viên quầy' : user.roles === 'BranchManager' ? 'Quản lý trạm' : 'Khách hàng'}
                </span>

                {user.identityStatus === 'Verified' ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                    Đã xác thực eKYC
                  </span>
                ) : user.identityStatus === 'Pending' ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Clock className="w-3 h-3 mr-1 text-amber-400" />
                    Chờ duyệt eKYC
                  </span>
                ) : user.identityStatus === 'Rejected' ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                    <AlertCircle className="w-3 h-3 mr-1 text-red-400" />
                    eKYC cần gửi lại
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/5 text-slate-400 border border-white/10">
                    <ShieldCheck className="w-3 h-3 mr-1 text-slate-500" />
                    Chưa xác thực eKYC
                  </span>
                )}
              </div>

              {/* Loyalty Points & eKYC metrics */}
              <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-white/10 text-left">
                <div className="p-3 bg-[#060B0A] rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <Award className="w-3 h-3 mr-1 text-emerald-400" />
                    Điểm thưởng
                  </span>
                  <span className="text-lg font-black text-emerald-400 mt-1 block">
                    {user.loyaltyPoints || 0} pts
                  </span>
                </div>

                <div className="p-3 bg-[#060B0A] rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" />
                    Tình trạng định danh
                  </span>
                  <span className="text-xs font-bold text-slate-200 mt-1 block truncate">
                    {user.identityStatus === 'Verified' 
                      ? 'Hợp lệ 100%' 
                      : user.identityStatus === 'Pending' 
                      ? 'Đang đối soát' 
                      : 'Chưa đối chiếu'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Navigation Menu (4 Tabs) */}
            <div className="bg-[#0B1513] rounded-3xl p-3 border border-white/10 space-y-1">
              <button
                onClick={() => handleTabChange('info')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                  activeTab === 'info'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <UserIcon className="w-4 h-4 text-emerald-400" />
                  <span>Thông tin cá nhân & Chỉnh sửa</span>
                </div>
              </button>

              <button
                onClick={() => handleTabChange('avatar')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                  activeTab === 'avatar'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>Đổi ảnh đại diện</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">5MB</span>
              </button>

              <button
                onClick={() => handleTabChange('ekyc')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                  activeTab === 'ekyc'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  <span>Định danh điện tử (eKYC)</span>
                </div>
                {user.identityStatus === 'Verified' ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                ) : user.identityStatus === 'Pending' ? (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                ) : (
                  <span className="text-[10px] text-amber-400 font-bold">Cần làm</span>
                )}
              </button>

              <button
                onClick={() => handleTabChange('password')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                  activeTab === 'password'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Đổi mật khẩu bảo mật</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">≥ 8 ký tự</span>
              </button>
            </div>
          </div>

          {/* Right Column: Tab Panels (8 cols) */}
          <div className="lg:col-span-8">
            <div className="bg-[#0B1513] rounded-3xl p-6 sm:p-8 border border-white/10">
              {/* Alert notices */}
              {successMsg && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center space-x-2.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-medium">{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-300 flex items-center space-x-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              {/* TAB 1: Edit Info */}
              {activeTab === 'info' && (
                <div>
                  <div className="pb-5 border-b border-white/5 mb-6">
                    <h2 className="text-lg font-bold text-white">
                      Thông tin tài khoản
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cập nhật các thông tin cá nhân dùng để lập hợp đồng thuê xe máy
                    </p>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Tên đăng nhập
                        </label>
                        <input
                          type="text"
                          value={user.username}
                          disabled
                          className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Địa chỉ email
                        </label>
                        <input
                          type="email"
                          value={user.email || 'Chưa cập nhật'}
                          disabled
                          className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Họ và tên đệm
                        </label>
                        <input
                          type="text"
                          placeholder="VD: Nguyễn Văn"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full bg-[#060B0A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-medium text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:bg-[#07110E]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Tên
                        </label>
                        <input
                          type="text"
                          placeholder="VD: An"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full bg-[#060B0A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-medium text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:bg-[#07110E]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Số điện thoại di động
                        </label>
                        <input
                          type="tel"
                          placeholder="VD: 0912345678"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full bg-[#060B0A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-medium text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:bg-[#07110E]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Giới tính
                        </label>
                        <select
                          value={gender}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'Male' || val === 'Female' || val === 'Other') {
                              setGender(val);
                            }
                          }}
                          className="w-full bg-[#060B0A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-emerald-500 focus:bg-[#07110E]"
                        >
                          <option value="Male" className="bg-[#0B1513] text-white">Nam</option>
                          <option value="Female" className="bg-[#0B1513] text-white">Nữ</option>
                          <option value="Other" className="bg-[#0B1513] text-white">Khác</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Ngày sinh
                      </label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full sm:w-1/2 bg-[#060B0A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-emerald-500 focus:bg-[#07110E]"
                      />
                    </div>

                    {/* Submit button */}
                    <div className="pt-4 border-t border-white/5 flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-[#060D0B] font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>{loading ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: Change Avatar (UC-21: Max 5MB, JPEG/PNG/WebP, Multer upload) */}
              {activeTab === 'avatar' && (
                <div>
                  <div className="pb-5 border-b border-white/5 mb-6">
                    <h2 className="text-lg font-bold text-white">
                      Thay đổi ảnh đại diện
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tải lên hình ảnh chân dung rõ nét (JPEG, PNG, WebP) dung lượng tối đa 5MB
                    </p>
                  </div>

                  <form onSubmit={handleUploadAvatar} className="space-y-6">
                    {/* Preview Box */}
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 p-6 bg-[#060B0A] rounded-2xl border border-dashed border-white/15">
                      <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-[#040807] shadow-sm flex items-center justify-center flex-shrink-0">
                        {currentAvatar ? (
                          <img
                            src={currentAvatar}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <UserIcon className="w-14 h-14 text-slate-600" />
                        )}
                      </div>

                      <div className="space-y-2 text-center sm:text-left">
                        <label className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#0B1513] hover:bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 cursor-pointer transition-colors">
                          <UploadCloud className="w-4 h-4 text-emerald-400" />
                          <span>Chọn file ảnh từ máy tính</span>
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
                            : 'Hỗ trợ JPEG, PNG, WebP. Tối đa 5MB.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={loading || !selectedFile}
                        className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                          selectedFile && !loading
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-[#060D0B] shadow-lg shadow-emerald-500/20'
                            : 'bg-white/5 text-slate-500 cursor-not-allowed shadow-none'
                        }`}
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Đang tải lên...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4" />
                            <span>Lưu ảnh đại diện mới</span>
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
                  <div className="pb-5 border-b border-white/5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-white">
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
                  <div className={`p-4 rounded-2xl border mb-6 text-xs leading-relaxed ${
                    user.identityStatus === 'Verified'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : user.identityStatus === 'Pending'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                      : user.identityStatus === 'Rejected'
                      ? 'bg-red-500/10 border-red-500/20 text-red-300'
                      : 'bg-[#060B0A] border-white/10 text-slate-300'
                  }`}>
                    {user.identityStatus === 'Verified' ? (
                      <div className="flex items-start space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="block font-bold">Hồ sơ eKYC của bạn đã được kiểm duyệt thành công!</strong>
                          <span>Bạn được hưởng toàn bộ đặc quyền nhận xe hỏa tốc tại Sân bay Quốc tế Đà Nẵng và Bãi biển Mỹ Khê mà không cần để lại CCCD gốc.</span>
                        </div>
                      </div>
                    ) : user.identityStatus === 'Pending' ? (
                      <div className="flex items-start space-x-2.5">
                        <Clock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="block font-bold">Hồ sơ đang trong hàng đợi đối soát</strong>
                          <span>Nhân viên quầy sẽ đối chiếu thông tin trong vòng 15-30 phút. Bạn vẫn có thể đặt xe trước bình thường.</span>
                        </div>
                      </div>
                    ) : user.identityStatus === 'Rejected' ? (
                      <div className="flex items-start space-x-2.5">
                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="block font-bold">Hình ảnh giấy tờ chưa đạt yêu cầu</strong>
                          <span>Vui lòng kiểm tra lại ảnh chụp: không bị lóa đèn flash, chụp đủ 4 góc của thẻ CCCD và GPLX còn hạn sử dụng.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start space-x-2.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="block font-bold">Bảo vệ quyền lợi tối đa cho khách thuê xe</strong>
                          <span>Hình ảnh của bạn được mã hóa an toàn trên máy chủ Motorent và chỉ dùng cho mục đích bàn giao xe tại quầy.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleUploadEkyc} className="space-y-6">
                    {/* 3 Upload Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Card 1: CCCD Front */}
                      <div className="p-4 bg-[#060B0A] rounded-2xl border border-white/10 flex flex-col items-center justify-between text-center relative group min-h-[200px]">
                        <span className="text-xs font-semibold text-slate-300 mb-2">
                          1. Mặt trước CCCD/Hộ chiếu <span className="text-red-400">*</span>
                        </span>

                        <div className="w-full h-32 rounded-xl bg-[#040807] border border-white/10 overflow-hidden flex items-center justify-center relative">
                          {idCardFrontPreview || formatDocUrl(user.idCardFrontUrl) ? (
                            <img
                              src={idCardFrontPreview || formatDocUrl(user.idCardFrontUrl)!}
                              alt="CCCD Front"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="p-3 text-center space-y-1">
                              <FileCheck2 className="w-8 h-8 text-slate-600 mx-auto" />
                              <span className="text-[10px] text-slate-500 block">Chưa có ảnh</span>
                            </div>
                          )}
                        </div>

                        <label className="mt-3 w-full py-2 bg-[#0B1513] hover:bg-white/5 border border-white/10 rounded-xl text-[11px] font-semibold text-slate-200 cursor-pointer transition-colors block">
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
                      <div className="p-4 bg-[#060B0A] rounded-2xl border border-white/10 flex flex-col items-center justify-between text-center relative group min-h-[200px]">
                        <span className="text-xs font-semibold text-slate-300 mb-2">
                          2. Mặt sau CCCD <span className="text-red-400">*</span>
                        </span>

                        <div className="w-full h-32 rounded-xl bg-[#040807] border border-white/10 overflow-hidden flex items-center justify-center relative">
                          {idCardBackPreview || formatDocUrl(user.idCardBackUrl) ? (
                            <img
                              src={idCardBackPreview || formatDocUrl(user.idCardBackUrl)!}
                              alt="CCCD Back"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="p-3 text-center space-y-1">
                              <FileCheck2 className="w-8 h-8 text-slate-600 mx-auto" />
                              <span className="text-[10px] text-slate-500 block">Chưa có ảnh</span>
                            </div>
                          )}
                        </div>

                        <label className="mt-3 w-full py-2 bg-[#0B1513] hover:bg-white/5 border border-white/10 rounded-xl text-[11px] font-semibold text-slate-200 cursor-pointer transition-colors block">
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
                      <div className="p-4 bg-[#060B0A] rounded-2xl border border-white/10 flex flex-col items-center justify-between text-center relative group min-h-[200px]">
                        <span className="text-xs font-semibold text-slate-300 mb-2">
                          3. Giấy phép lái xe (GPLX) <span className="text-red-400">*</span>
                        </span>

                        <div className="w-full h-32 rounded-xl bg-[#040807] border border-white/10 overflow-hidden flex items-center justify-center relative">
                          {licensePreview || formatDocUrl(user.drivingLicenseUrl) ? (
                            <img
                              src={licensePreview || formatDocUrl(user.drivingLicenseUrl)!}
                              alt="Driving License"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="p-3 text-center space-y-1">
                              <FileCheck2 className="w-8 h-8 text-slate-600 mx-auto" />
                              <span className="text-[10px] text-slate-500 block">Chưa có ảnh</span>
                            </div>
                          )}
                        </div>

                        <label className="mt-3 w-full py-2 bg-[#0B1513] hover:bg-white/5 border border-white/10 rounded-xl text-[11px] font-semibold text-slate-200 cursor-pointer transition-colors block">
                          <span>{licenseFile ? 'Thay đổi ảnh' : 'Chọn ảnh bằng lái xe'}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => handleDocFileChange(e, 'drivingLicense')}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Notice & Guidelines */}
                    <div className="p-3 bg-[#081512] rounded-xl border border-emerald-500/20 text-[11px] text-slate-300 space-y-1">
                      <div className="font-semibold text-emerald-400 flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Mẹo chụp ảnh đối soát nhanh:</span>
                      </div>
                      <p>• Đặt giấy tờ trên mặt bàn phẳng, chụp thẳng góc và rõ các thông tin số CCCD/hạng GPLX.</p>
                      <p>• Định dạng ảnh hỗ trợ: JPG, PNG, WEBP (dung lượng tối đa 10MB mỗi ảnh).</p>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={loading || (!idCardFrontFile && !idCardBackFile && !licenseFile)}
                        className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                          (idCardFrontFile || idCardBackFile || licenseFile) && !loading
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-[#060D0B] shadow-lg shadow-emerald-500/20'
                            : 'bg-white/5 text-slate-500 cursor-not-allowed shadow-none'
                        }`}
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Đang gửi hồ sơ thẩm định...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4" />
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
                  <div className="pb-5 border-b border-white/5 mb-6">
                    <h2 className="text-lg font-bold text-white">
                      Đổi mật khẩu tài khoản
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Vui lòng sử dụng mật khẩu mạnh từ 8 ký tự trở lên kết hợp chữ hoa, chữ thường và chữ số
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    {/* Current Password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
                        <Lock className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                        Mật khẩu hiện tại <span className="text-red-400 ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          placeholder="Nhập mật khẩu đang dùng..."
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          className="w-full bg-[#060B0A] border border-white/10 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-medium text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:bg-[#07110E]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-white focus:outline-none"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                        Mật khẩu mới <span className="text-red-400 ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Tối thiểu từ 8 ký tự..."
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="w-full bg-[#060B0A] border border-white/10 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-medium text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:bg-[#07110E]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-white focus:outline-none"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Password strength indicator */}
                      {newPassword.length > 0 && (
                        <div className="mt-2 space-y-1.5 p-2 bg-white/[0.02] rounded-lg border border-white/5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-medium">Độ bảo mật:</span>
                            <span className={`font-bold ${passwordStrength.color}`}>
                              {passwordStrength.label}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4].map((seg) => (
                              <div
                                key={seg}
                                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                  seg <= passwordStrength.score ? passwordStrength.bgClass : 'bg-white/10'
                                }`}
                              />
                            ))}
                          </div>
                          {newPassword.length < 8 && (
                            <p className="text-[10px] text-red-400 font-medium">
                              • Cần thêm ít nhất {8 - newPassword.length} ký tự nữa để đạt chuẩn 8 ký tự
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
                        <Lock className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                        Xác nhận mật khẩu mới <span className="text-red-400 ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Nhập lại mật khẩu mới..."
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full bg-[#060B0A] border border-white/10 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-medium text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:bg-[#07110E]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-white focus:outline-none"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword && newPassword && confirmPassword === newPassword && (
                        <div className="flex items-center space-x-1 mt-1 text-[11px] font-medium text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mật khẩu xác nhận trùng khớp</span>
                        </div>
                      )}
                      {confirmPassword && newPassword && confirmPassword !== newPassword && (
                        <div className="flex items-center space-x-1 mt-1 text-[11px] font-medium text-red-400">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Mật khẩu xác nhận không trùng khớp</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-white/5 flex justify-end">
                      <button
                        type="submit"
                        disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
                        className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                          newPassword.length >= 8 && newPassword === confirmPassword && !loading
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-[#060D0B] shadow-lg shadow-emerald-500/20'
                            : 'bg-white/5 text-slate-500 cursor-not-allowed shadow-none'
                        }`}
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Đang cập nhật...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Cập nhật mật khẩu</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
