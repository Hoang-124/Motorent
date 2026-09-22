import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User as UserIcon, 
  Mail, 
  Lock, 
  Phone, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  KeyRound
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  // Registration form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Verification step state
  const [successData, setSuccessData] = useState<{
    email: string;
    token?: string;
    devOtp?: string;
    hasRealSmtp?: boolean;
  } | null>(null);

  // OTP Verification states
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState(false);

  // Resend OTP states
  const [resendingOtp, setResendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState('');

  // Timer countdown for resending OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc (*).');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có độ dài tối thiểu từ 6 ký tự.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/auth/register', {
        username,
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
      });

      if (res.data && res.data.success) {
        setSuccessData({
          email: email.trim().toLowerCase(),
          token: res.data.data?.verificationToken,
          devOtp: res.data.data?.devOtp,
          hasRealSmtp: res.data.data?.hasRealSmtp,
        });
        setOtpCode('');
        setOtpError('');
        setOtpSuccess(false);
      } else {
        setErrorMsg(res.data?.message || 'Đăng ký không thành công.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Đăng ký tài khoản thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || otpCode).trim();
    if (!code) {
      setOtpError('Vui lòng nhập đầy đủ mã OTP 6 chữ số.');
      return;
    }

    if (code.length < 6) {
      setOtpError('Mã OTP bao gồm đúng 6 chữ số.');
      return;
    }

    if (!successData?.email) {
      setOtpError('Không tìm thấy thông tin email đăng ký.');
      return;
    }

    setVerifyingOtp(true);
    setOtpError('');
    setResendMessage('');

    try {
      const res = await api.post('/auth/verify-otp', {
        email: successData.email,
        otp: code,
      });

      if (res.data && res.data.success) {
        setOtpSuccess(true);
        if (res.data.data?.token && res.data.data?.user) {
          authLogin(res.data.data.token, res.data.data.user);
        }
        setTimeout(() => {
          navigate('/');
        }, 1400);
      } else {
        setOtpError(res.data?.message || 'Mã OTP không hợp lệ.');
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Xác thực mã OTP không thành công.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !successData?.email || resendingOtp) return;

    setResendingOtp(true);
    setOtpError('');
    setResendMessage('');

    try {
      const res = await api.post('/auth/resend-otp', {
        email: successData.email,
      });

      if (res.data && res.data.success) {
        setResendCooldown(60);
        setResendMessage(res.data.message || 'Mã OTP mới đã được gửi thành công!');
        if (res.data.data?.devOtp) {
          setSuccessData((prev) =>
            prev ? { ...prev, devOtp: res.data.data.devOtp, hasRealSmtp: res.data.data.hasRealSmtp } : null
          );
        }
      } else {
        setOtpError(res.data?.message || 'Không thể gửi lại mã OTP.');
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
    } finally {
      setResendingOtp(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/60">
      <div className="max-w-lg w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center space-x-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-forest-600 flex items-center justify-center text-white shadow-md shadow-forest-600/20">
              <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <circle cx="5.5" cy="17.5" r="3.5" />
                <circle cx="18.5" cy="17.5" r="3.5" />
                <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4" />
              </svg>
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              MOTO<span className="text-forest-600">RENT</span>
            </span>
          </Link>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {successData ? 'Xác thực tài khoản' : 'Đăng ký tài khoản mới'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {successData 
              ? 'Hoàn tất bước xác thực để bắt đầu trải nghiệm thuê xe tự lái' 
              : 'Nhận ngay ưu đãi thuê xe tự lái và quyền lợi tích lũy điểm thưởng thành viên'}
          </p>
        </div>

        {/* Card Body */}
        <div className="bg-white rounded-3xl p-7 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-900/5 space-y-5">
          {successData ? (
            /* Success Verification State / OTP Form */
            <div className="text-center space-y-5 py-2">
              {otpSuccess ? (
                /* Success State */
                <div className="py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-forest-700 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    Kích hoạt tài khoản thành công!
                  </h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Chào mừng bạn đến với Motorent. Hệ thống đang tự động đăng nhập và chuyển hướng...
                  </p>
                  <div className="pt-2">
                    <RefreshCw className="w-5 h-5 text-forest-600 animate-spin mx-auto" />
                  </div>
                </div>
              ) : (
                /* OTP Input Form */
                <>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-forest-700 flex items-center justify-center mx-auto shadow-sm">
                    <KeyRound className="w-7 h-7" />
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      Nhập mã OTP xác thực
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1 max-w-sm mx-auto">
                      Mã xác thực 6 chữ số đã được gửi tới địa chỉ{' '}
                      <strong className="text-forest-700 font-bold">{successData.email}</strong>.
                    </p>
                  </div>

                  {/* Dev Helper Notice (Chỉ xuất hiện khi chưa cấu hình SMTP thật) */}
                  {!successData.hasRealSmtp && (
                    <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-left space-y-2 text-xs">
                      <div className="flex items-center space-x-1.5 font-bold text-amber-800">
                        <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>Chưa cấu hình dịch vụ gửi mail (Môi trường Dev)</span>
                      </div>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        Máy chủ chưa kích hoạt SMTP thực tế trong file <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">.env</code>. Bạn có thể dùng mã OTP dưới đây để kích hoạt tức thì:
                      </p>
                      <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-amber-200 shadow-xs">
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] text-slate-500 font-medium">Mã OTP:</span>
                          <span className="font-mono font-black text-base text-forest-700 tracking-wider">
                            {successData.devOtp || '123456'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const code = successData.devOtp || '123456';
                            setOtpCode(code);
                            handleVerifyOtp(code);
                          }}
                          className="px-3 py-1.5 text-[11px] font-bold bg-forest-600 hover:bg-forest-700 text-white rounded-lg transition-colors flex items-center space-x-1 active:scale-95 shadow-xs"
                        >
                          <span>Điền & Kích hoạt ngay</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Error & Info Alerts */}
                  {otpError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2 text-left">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span>{otpError}</span>
                    </div>
                  )}

                  {resendMessage && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2 text-left">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{resendMessage}</span>
                    </div>
                  )}

                  {/* 6-Digit OTP Input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 text-left">
                      Mã OTP 6 chữ số
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                        setOtpCode(val);
                        setOtpError('');
                        if (val.length === 6) {
                          handleVerifyOtp(val);
                        }
                      }}
                      placeholder="------"
                      autoFocus
                      className="w-full text-center font-mono font-black text-2xl tracking-[0.5em] py-3.5 bg-slate-50 border-2 border-slate-200 focus:border-forest-600 focus:bg-white rounded-2xl outline-none transition-all placeholder:text-slate-300 placeholder:tracking-[0.5em]"
                    />
                    <p className="text-[11px] text-slate-400">
                      Mã OTP có hiệu lực trong vòng 15 phút
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleVerifyOtp()}
                      disabled={verifyingOtp || otpCode.length !== 6}
                      className="w-full py-3 bg-forest-600 hover:bg-forest-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-md shadow-forest-600/20 transition-all flex items-center justify-center space-x-2 active:scale-[0.99]"
                    >
                      {verifyingOtp ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Đang kiểm tra mã OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>Xác thực & Kích hoạt tài khoản</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendCooldown > 0 || resendingOtp}
                        className="font-bold text-forest-600 hover:text-forest-700 disabled:text-slate-400 transition-colors flex items-center space-x-1"
                      >
                        {resendingOtp ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Mail className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {resendCooldown > 0
                            ? `Gửi lại mã (${resendCooldown}s)`
                            : 'Gửi lại mã OTP'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSuccessData(null);
                          setOtpCode('');
                          setOtpError('');
                          setResendMessage('');
                        }}
                        className="font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Đăng ký bằng email khác
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <Link
                        to="/login"
                        className="text-xs font-bold text-slate-600 hover:text-forest-700 transition-colors inline-flex items-center space-x-1"
                      >
                        <span>Đã có tài khoản hoặc kích hoạt xong? Đăng nhập ngay</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Register Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Username & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên đăng nhập <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="VD: nguyenvana"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      placeholder="VD: an@outlook.com.vn"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ và tên đệm
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số điện thoại di động
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="VD: 0912 345 678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      placeholder="Ít nhất 6 ký tự..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Xác nhận mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      placeholder="Nhập lại mật khẩu..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Security note */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 flex items-start space-x-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>Mật khẩu của bạn được mã hóa một chiều qua thuật toán bcryptjs an toàn.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-forest-600 hover:bg-forest-700 text-white font-bold rounded-xl text-xs shadow-md shadow-forest-600/25 transition-all flex items-center justify-center space-x-2 active:scale-[0.99]"
              >
                {loading ? (
                  <span>Đang xử lý đăng ký...</span>
                ) : (
                  <>
                    <span>Đăng ký tài khoản</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
                Đã có tài khoản Motorent?{' '}
                <Link to="/login" className="font-bold text-forest-600 hover:text-forest-700">
                  Đăng nhập
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
