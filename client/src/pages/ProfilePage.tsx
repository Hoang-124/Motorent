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
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const ProfilePage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab
  const initialTab = (searchParams.get('tab') as 'info' | 'avatar' | 'password') || 'info';
  const [activeTab, setActiveTab] = useState<'info' | 'avatar' | 'password'>(initialTab);

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
  const [showPassword, setShowPassword] = useState(false);

  // Form states - Avatar
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Status
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

  const handleTabChange = (tab: 'info' | 'avatar' | 'password') => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSuccessMsg('');
    setErrorMsg('');
  };

  // Handle Edit Profile
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
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Avatar file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setSuccessMsg('');
      setErrorMsg('');
    }
  };

  // Handle Upload Avatar
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
      const res = await api.post('/auth/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data && res.data.success) {
        updateUser(res.data.data.user);
        setSuccessMsg('Đổi ảnh đại diện thành công!');
        setSelectedFile(null);
      } else {
        setErrorMsg(res.data?.message || 'Tải ảnh lên thất bại.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi tải ảnh lên.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.data && res.data.success) {
        setSuccessMsg('Đổi mật khẩu thành công!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(res.data?.message || 'Đổi mật khẩu thất bại.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Mật khẩu hiện tại không đúng.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-sm text-slate-500">Vui lòng đăng nhập để xem thông tin hồ sơ cá nhân.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2.5 bg-forest-600 text-white rounded-xl font-bold text-xs shadow-sm"
          >
            Đến trang Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  // Calculate full display avatar url
  const currentAvatar = previewUrl || (user.avatarUrl ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `http://localhost:5000${user.avatarUrl}`) : null);

  return (
    <div className="min-h-screen bg-slate-50/70 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Breadcrumb & Title */}
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-forest-700 block mb-1">
            Quản lý tài khoản
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Hồ sơ cá nhân & Bảo mật
          </h1>
        </div>

        {/* 2-Column Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Profile Card & Quick Stats (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* User Identity Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-forest-700 to-emerald-600"></div>

              {/* Avatar with status border */}
              <div className="relative mt-8 mb-4 inline-block">
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-100 flex items-center justify-center mx-auto">
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
                          target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-emerald-100 text-forest-800 font-bold text-2xl">${(user.firstName || user.username || 'U').charAt(0).toUpperCase()}</div>`;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-forest-700">
                      <UserIcon className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleTabChange('avatar')}
                  className="absolute bottom-1 right-1 p-1.5 bg-forest-600 text-white rounded-full shadow-sm hover:bg-forest-700 transition-colors"
                  title="Thay đổi ảnh đại diện"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <h3 className="text-lg font-black text-slate-900">
                {`${user.lastName || ''} ${user.firstName || ''}`.trim() || user.username}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">@{user.username}</p>

              {/* Role & Verification Badge */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {user.roles === 'SystemAdmin' ? 'Quản trị viên' : user.roles === 'Staff' ? 'Nhân viên quầy' : 'Khách hàng'}
                </span>

                {user.isEmailVerified ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                    Email đã xác thực
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertCircle className="w-3 h-3 mr-1 text-amber-500" />
                    Chưa xác thực email
                  </span>
                )}
              </div>

              {/* Loyalty Points & eKYC metrics */}
              <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-slate-100 text-left">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center">
                    <Award className="w-3 h-3 mr-1 text-emerald-600" />
                    Điểm thưởng
                  </span>
                  <span className="text-lg font-black text-forest-700 mt-1 block">
                    {user.loyaltyPoints || 0} pts
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center">
                    <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                    Định danh eKYC
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-1 block">
                    {user.identityStatus === 'Verified' ? 'Đã đối chiếu' : 'Chưa định danh'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Navigation Menu */}
            <div className="bg-white rounded-3xl p-3 border border-slate-200 shadow-2xs space-y-1">
              <button
                onClick={() => handleTabChange('info')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                  activeTab === 'info'
                    ? 'bg-forest-50 text-forest-700 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <UserIcon className="w-4 h-4 text-emerald-600" />
                <span>Thông tin cá nhân & Chỉnh sửa</span>
              </button>

              <button
                onClick={() => handleTabChange('avatar')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                  activeTab === 'avatar'
                    ? 'bg-forest-50 text-forest-700 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Đổi ảnh đại diện</span>
              </button>

              <button
                onClick={() => handleTabChange('password')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                  activeTab === 'password'
                    ? 'bg-forest-50 text-forest-700 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Đổi mật khẩu bảo mật</span>
              </button>
            </div>
          </div>

          {/* Right Column: Active Tab Content (8 cols) */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-3xl p-7 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              {/* Notifications */}
              {successMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* TAB 1: Edit Profile Information */}
              {activeTab === 'info' && (
                <div>
                  <div className="pb-5 border-b border-slate-100 mb-6">
                    <h2 className="text-lg font-black text-slate-900">
                      Chỉnh sửa thông tin cá nhân
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cập nhật thông tin chính xác để thuận tiện trong quá trình làm thủ tục nhận xe tại trạm
                    </p>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    {/* Readonly info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Tên tài khoản (Không thể đổi)
                        </label>
                        <input
                          type="text"
                          value={user.username}
                          disabled
                          className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Địa chỉ Email liên kết
                        </label>
                        <input
                          type="text"
                          value={user.email || 'Chưa cập nhật'}
                          disabled
                          className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Names */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Họ và tên đệm
                        </label>
                        <input
                          type="text"
                          placeholder="VD: Nguyễn Văn"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Tên
                        </label>
                        <input
                          type="text"
                          placeholder="VD: An"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* Phone & Gender */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                          Số điện thoại liên hệ
                        </label>
                        <input
                          type="tel"
                          placeholder="VD: 0912 345 678"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Giới tính
                        </label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                        >
                          <option value="Male">Nam</option>
                          <option value="Female">Nữ</option>
                          <option value="Other">Khác</option>
                        </select>
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                        Ngày sinh
                      </label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                      />
                    </div>

                    {/* Submit button */}
                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 bg-forest-600 hover:bg-forest-700 text-white font-bold rounded-xl text-xs shadow-md shadow-forest-600/25 transition-all flex items-center space-x-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>{loading ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: Change Avatar */}
              {activeTab === 'avatar' && (
                <div>
                  <div className="pb-5 border-b border-slate-100 mb-6">
                    <h2 className="text-lg font-black text-slate-900">
                      Thay đổi ảnh đại diện
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tải lên hình ảnh khuôn mặt rõ nét (JPG, PNG, WebP) dung lượng tối đa 5MB
                    </p>
                  </div>

                  <form onSubmit={handleUploadAvatar} className="space-y-6">
                    {/* Preview Box */}
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                        {currentAvatar ? (
                          <img
                            src={currentAvatar}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <UserIcon className="w-14 h-14 text-slate-300" />
                        )}
                      </div>

                      <div className="space-y-2 text-center sm:text-left">
                        <label className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition-colors">
                          <UploadCloud className="w-4 h-4 text-emerald-600" />
                          <span>Chọn file ảnh từ máy tính</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[11px] text-slate-400">
                          {selectedFile ? `Đã chọn: ${selectedFile.name}` : 'Chấp nhận các định dạng PNG, JPG, WEBP hoặc SVG'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={loading || !selectedFile}
                        className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center space-x-2 ${
                          selectedFile && !loading
                            ? 'bg-forest-600 hover:bg-forest-700 shadow-forest-600/25'
                            : 'bg-slate-300 cursor-not-allowed shadow-none'
                        }`}
                      >
                        <Camera className="w-4 h-4" />
                        <span>{loading ? 'Đang tải lên...' : 'Lưu ảnh đại diện mới'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: Change Password */}
              {activeTab === 'password' && (
                <div>
                  <div className="pb-5 border-b border-slate-100 mb-6">
                    <h2 className="text-lg font-black text-slate-900">
                      Đổi mật khẩu tài khoản
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Vui lòng sử dụng mật khẩu mạnh kết hợp chữ, số và ký tự đặc biệt
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                        <Lock className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                        Mật khẩu hiện tại
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Nhập mật khẩu đang dùng..."
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                        <Lock className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                        Mật khẩu mới
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Tối thiểu 6 ký tự..."
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                        <Lock className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                        Xác nhận mật khẩu mới
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Nhập lại mật khẩu mới..."
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 bg-forest-600 hover:bg-forest-700 text-white font-bold rounded-xl text-xs shadow-md shadow-forest-600/25 transition-all flex items-center space-x-2"
                      >
                        <Lock className="w-4 h-4" />
                        <span>{loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
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
