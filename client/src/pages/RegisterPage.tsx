import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '../services/api';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  validateUsername,
  validateEmail,
  isGoogleEmailDomain,
  validatePhoneNumber,
  validatePassword,
  validateConfirmPassword,
  validateName,
  calculatePasswordStrength,
} from '../utils/validation';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login: authLogin } = useAuth();

  // Registration form values
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field touch & validation tracking
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Input refs for auto-focusing on first error
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

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

  // Mark a specific field as touched on blur
  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Evaluate errors dynamically
  const isGoogleEmail = isGoogleEmailDomain(email);
  const usernameError = (touched.username || hasSubmitted) ? validateUsername(username) : null;
  const emailError = (touched.email || hasSubmitted || isGoogleEmail) 
    ? validateEmail(email, { disallowGoogle: true }) 
    : null;
  const lastNameError = (touched.lastName || hasSubmitted) ? validateName(lastName, 'Họ và tên đệm') : null;
  const firstNameError = (touched.firstName || hasSubmitted) ? validateName(firstName, 'Tên') : null;
  const phoneError = (touched.phoneNumber || hasSubmitted) ? validatePhoneNumber(phoneNumber) : null;
  const passwordError = (touched.password || hasSubmitted) ? validatePassword(password) : null;
  const confirmPasswordError = (touched.confirmPassword || hasSubmitted) ? validateConfirmPassword(password, confirmPassword) : null;

  // Validation success indicators
  const isUsernameValid = !validateUsername(username) && username.trim().length > 0;
  const isEmailValid = !validateEmail(email, { disallowGoogle: true }) && email.trim().length > 0;
  const isPhoneValid = phoneNumber.trim().length > 0 && !validatePhoneNumber(phoneNumber);
  const isPasswordValid = !validatePassword(password) && password.length >= 6;
  const isConfirmPasswordValid = !validateConfirmPassword(password, confirmPassword) && confirmPassword.length > 0;

  // Calculate password strength
  const passwordStrength = calculatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    setTouched({
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      password: true,
      confirmPassword: true,
    });

    // Check all validations in order and focus on first error
    const uErr = validateUsername(username);
    if (uErr) {
      usernameRef.current?.focus();
      setErrorMsg(uErr);
      return;
    }

    const eErr = validateEmail(email, { disallowGoogle: true });
    if (eErr) {
      emailRef.current?.focus();
      setErrorMsg(eErr);
      return;
    }

    const lnErr = validateName(lastName, 'Họ và tên đệm');
    if (lnErr) {
      setErrorMsg(lnErr);
      return;
    }

    const fnErr = validateName(firstName, 'Tên');
    if (fnErr) {
      setErrorMsg(fnErr);
      return;
    }

    const phErr = validatePhoneNumber(phoneNumber);
    if (phErr) {
      phoneRef.current?.focus();
      setErrorMsg(phErr);
      return;
    }

    const pErr = validatePassword(password);
    if (pErr) {
      passwordRef.current?.focus();
      setErrorMsg(pErr);
      return;
    }

    const cpErr = validateConfirmPassword(password, confirmPassword);
    if (cpErr) {
      confirmPasswordRef.current?.focus();
      setErrorMsg(cpErr);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/auth/register', {
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        referralCode: referralCode.trim() || undefined,
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
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(err.response?.data?.message || 'Đăng ký tài khoản thất bại.');
      } else {
        setErrorMsg('Đăng ký tài khoản thất bại.');
      }
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
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setOtpError(err.response?.data?.message || 'Xác thực mã OTP không thành công.');
      } else {
        setOtpError('Xác thực mã OTP không thành công.');
      }
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
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setOtpError(err.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
      } else {
        setOtpError('Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
      }
    } finally {
      setResendingOtp(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#101010] text-[#F5F5F5]">
      <div className="max-w-lg w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center space-x-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFC799] text-[#101010] flex items-center justify-center shadow-lg shadow-black/50">
              <svg className="w-5 h-5 fill-none stroke-current stroke-[2.2]" viewBox="0 0 24 24">
                <circle cx="5.5" cy="17.5" r="3.5" />
                <circle cx="18.5" cy="17.5" r="3.5" />
                <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4" />
              </svg>
            </div>
            <span className="text-2xl font-black text-white tracking-tight">
              MOTO<span className="text-[#FFC799]">RENT</span>
            </span>
          </Link>
          <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
            {successData ? 'Xác thực tài khoản' : 'Đăng ký tài khoản mới'}
          </h2>
          <p className="text-xs text-[#A0A0A0] mt-1">
            {successData 
              ? 'Hoàn tất bước xác thực để bắt đầu trải nghiệm thuê xe tự lái' 
              : 'Nhận ngay ưu đãi thuê xe tự lái và quyền lợi tích lũy điểm thưởng thành viên'}
          </p>
        </div>

        {/* Card Body */}
        <div className="bg-[#161616] rounded-[2rem] p-7 sm:p-8 border border-white/10 shadow-2xl space-y-5 text-white">
          {successData ? (
            /* Success Verification State / OTP Form */
            <div className="text-center space-y-5 py-2">
              {otpSuccess ? (
                /* Success State */
                <div className="py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#FFC799]/20 text-[#FFC799] border border-[#FFC799]/30 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    Kích hoạt tài khoản thành công!
                  </h3>
                  <p className="text-xs text-[#A0A0A0] max-w-sm mx-auto">
                    Chào mừng bạn đến với Motorent. Hệ thống đang tự động đăng nhập và chuyển hướng...
                  </p>
                  <div className="pt-2">
                    <RefreshCw className="w-5 h-5 text-[#FFC799] animate-spin mx-auto" />
                  </div>
                </div>
              ) : (
                /* OTP Input Form */
                <>
                  <div className="w-14 h-14 rounded-2xl bg-[#FFC799]/20 text-[#FFC799] border border-[#FFC799]/30 flex items-center justify-center mx-auto shadow-sm">
                    <KeyRound className="w-7 h-7" />
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">
                      Nhập mã OTP xác thực
                    </h3>
                    <p className="text-xs text-[#A0A0A0] leading-relaxed mt-1 max-w-sm mx-auto">
                      Mã xác thực 6 chữ số đã được gửi tới địa chỉ{' '}
                      <strong className="text-[#FFC799] font-bold">{successData.email}</strong>.
                    </p>
                  </div>

                  {/* Dev Helper Notice (Chỉ xuất hiện khi chưa cấu hình SMTP thật) */}
                  {!successData.hasRealSmtp && (
                    <div className="p-4 bg-[#FFC799]/10 border border-[#FFC799]/30 rounded-2xl text-left space-y-2 text-xs">
                      <div className="flex items-center space-x-1.5 font-bold text-[#FFC799]">
                        <Sparkles className="w-4 h-4 text-[#FFC799] flex-shrink-0" />
                        <span>Chưa cấu hình dịch vụ gửi mail (Môi trường Dev)</span>
                      </div>
                      <p className="text-[11px] text-[#A0A0A0] leading-relaxed">
                        Máy chủ chưa kích hoạt SMTP thực tế trong file <code className="bg-white/10 px-1 py-0.5 rounded text-[#FFC799] font-mono">.env</code>. Bạn có thể dùng mã OTP dưới đây để kích hoạt tức thì:
                      </p>
                      <div className="flex items-center justify-between bg-[#101010] px-3.5 py-2 rounded-xl border border-white/10 shadow-xs">
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] text-[#A0A0A0] font-medium">Mã OTP:</span>
                          <span className="font-mono font-black text-base text-[#FFC799] tracking-wider">
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
                          className="px-3 py-1.5 text-[11px] font-black bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] hover:bg-[#FFD6B3] text-white rounded-lg transition-colors flex items-center space-x-1 active:scale-95 shadow-xs"
                        >
                          <span>Điền & Kích hoạt ngay</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Error & Info Alerts */}
                  {otpError && (
                    <div className="p-3 bg-[#FF8080]/12 border border-[#FF8080]/30 rounded-xl text-xs text-[#FF8080] flex items-center space-x-2 text-left">
                      <AlertCircle className="w-4 h-4 text-[#FF8080] flex-shrink-0" />
                      <span>{otpError}</span>
                    </div>
                  )}

                  {resendMessage && (
                    <div className="p-3 bg-[#FFC799]/10 border border-[#FFC799]/30 rounded-xl text-xs text-[#FFC799] flex items-center space-x-2 text-left">
                      <CheckCircle2 className="w-4 h-4 text-[#FFC799] flex-shrink-0" />
                      <span>{resendMessage}</span>
                    </div>
                  )}

                  {/* 6-Digit OTP Input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#A0A0A0] text-left">
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
                      className="w-full text-center font-mono font-black text-2xl tracking-[0.5em] py-3.5 bg-[#101010] border border-white/15 focus:border-[#FFC799] rounded-2xl outline-none transition-all placeholder:text-[#6E6E6E] placeholder:tracking-[0.5em] text-[#FFC799]"
                    />
                    <p className="text-[11px] text-[#A0A0A0]">
                      Mã OTP có hiệu lực trong vòng 15 phút
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleVerifyOtp()}
                      disabled={verifyingOtp || otpCode.length !== 6}
                      className="w-full py-3 bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] hover:bg-[#FFD6B3] disabled:bg-white/5 disabled:text-[#6E6E6E] disabled:cursor-not-allowed text-white rounded-xl font-black text-xs shadow-lg shadow-black/50 transition-all flex items-center justify-center space-x-2 active:scale-[0.99]"
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
                        className="font-bold text-[#FFC799] hover:text-[#FFC799] disabled:text-[#6E6E6E] transition-colors flex items-center space-x-1"
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
                        className="font-semibold text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
                      >
                        Đăng ký bằng email khác
                      </button>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      <Link
                        to="/login"
                        className="text-xs font-bold text-[#A0A0A0] hover:text-[#FFC799] transition-colors inline-flex items-center space-x-1"
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
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 bg-[#FF8080]/12 border border-[#FF8080]/30 rounded-xl text-xs text-[#FF8080] flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-[#FF8080] flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Username & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Username Field */}
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                    Tên đăng nhập <span className="text-[#FF8080]">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 text-[#6E6E6E] absolute left-3 top-3 pointer-events-none" />
                    <input
                      ref={usernameRef}
                      type="text"
                      placeholder="VD: nguyenvana"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      onBlur={() => handleBlur('username')}
                      className={`w-full rounded-xl pl-9 pr-8 py-2 text-xs font-medium outline-none transition-all ${
                        usernameError
                          ? 'bg-[#FF8080]/12 border border-[#FF8080]/30 focus:border-[#FF8080] text-white placeholder:text-[#6E6E6E]'
                          : isUsernameValid && touched.username
                          ? 'bg-[#101010] border border-[#FFC799]/50 focus:border-[#FFC799] text-white placeholder:text-[#6E6E6E]'
                          : 'bg-[#101010] border border-white/10 focus:border-[#FFC799] text-white placeholder:text-[#6E6E6E]'
                      }`}
                    />
                    {isUsernameValid && touched.username && !usernameError && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC799] absolute right-3 top-3" />
                    )}
                  </div>
                  {usernameError && (
                    <div className="flex items-center space-x-1 mt-1 text-[11px] font-medium text-[#FF8080]">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{usernameError}</span>
                    </div>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                    Email <span className="text-[#FF8080]">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-[#6E6E6E] absolute left-3 top-3 pointer-events-none" />
                    <input
                      ref={emailRef}
                      type="email"
                      placeholder="VD: an@outlook.com.vn"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      onBlur={() => handleBlur('email')}
                      className={`w-full rounded-xl pl-9 pr-8 py-2 text-xs font-medium outline-none transition-all ${
                        isGoogleEmail
                          ? 'bg-[#FFC799]/10 border border-[#FFC799]/40 focus:border-[#FFC799] text-white placeholder:text-[#6E6E6E]'
                          : emailError
                          ? 'bg-[#FF8080]/12 border border-[#FF8080]/30 focus:border-[#FF8080] text-white placeholder:text-[#6E6E6E]'
                          : isEmailValid && touched.email
                          ? 'bg-[#101010] border border-[#FFC799]/50 focus:border-[#FFC799] text-white placeholder:text-[#6E6E6E]'
                          : 'bg-[#101010] border border-white/10 focus:border-[#FFC799] text-white placeholder:text-[#6E6E6E]'
                      }`}
                    />
                    {isGoogleEmail ? (
                      <div className="absolute right-3 top-2.5" title="Tài khoản Google">
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                      </div>
                    ) : isEmailValid && touched.email && !emailError ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC799] absolute right-3 top-3" />
                    ) : null}
                  </div>

                  {/* Inline Message */}
                  {emailError && (
                    <div
                      className={`flex items-center space-x-1 mt-1 text-[11px] font-medium ${
                        isGoogleEmail ? 'text-[#FFC799]' : 'text-[#FF8080]'
                      }`}
                    >
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{emailError}</span>
                    </div>
                  )}

                  {/* Google Login Action Box */}
                  {isGoogleEmail && (
                    <div className="mt-2 p-2.5 bg-[#FFC799]/10 border border-[#FFC799]/20 rounded-xl space-y-2 text-left">
                      <p className="text-[11px] text-[#FFC799] leading-relaxed">
                        Địa chỉ này thuộc Google. Bạn có thể đăng nhập tức thì không cần đặt mật khẩu:
                      </p>
                      <Link
                        to="/login"
                        className="w-full py-1.5 px-3 bg-[#101010] hover:bg-white/5 border border-[#FFC799]/30 rounded-lg text-[11px] font-semibold text-[#F5F5F5] transition-colors flex items-center justify-center space-x-1.5"
                      >
                        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Đăng nhập bằng Google</span>
                        <ArrowRight className="w-3 h-3 text-[#FFC799]" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Last Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                    Họ và tên đệm
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    onBlur={() => handleBlur('lastName')}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-medium outline-none transition-all ${
                      lastNameError
                        ? 'bg-[#FF8080]/12 border border-[#FF8080]/30 focus:border-[#FF8080] text-white placeholder:text-[#6E6E6E]'
                        : 'bg-[#101010] border border-white/10 focus:border-[#FFC799] text-white placeholder:text-[#6E6E6E]'
                    }`}
                  />
                  {lastNameError && (
                    <div className="flex items-center space-x-1 mt-1 text-[11px] font-medium text-[#FF8080]">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{lastNameError}</span>
                    </div>
                  )}
                </div>

                {/* First Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                    Tên
                  </label>
                  <input
                    type="text"
                    placeholder="VD: An"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    onBlur={() => handleBlur('firstName')}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-medium outline-none transition-all ${
                      firstNameError
                        ? 'bg-[#FF8080]/12 border border-[#FF8080]/30 focus:border-[#FF8080] text-white placeholder:text-[#6E6E6E]'
                        : 'bg-[#101010] border border-white/10 focus:border-[#FFC799] text-white placeholder:text-[#6E6E6E]'
                    }`}
                  />
                  {firstNameError && (
                    <div className="flex items-center space-x-1 mt-1 text-[11px] font-medium text-[#FF8080]">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{firstNameError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                  Số điện thoại di động
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-[#6E6E6E] absolute left-3 top-3 pointer-events-none" />
                  <input
                    ref={phoneRef}
                    type="tel"
                    placeholder="VD: 0912 345 678"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    onBlur={() => handleBlur('phoneNumber')}
                    className={`w-full rounded-xl pl-9 pr-8 py-2 text-xs font-medium outline-none transition-all ${
                      phoneError
                        ? 'bg-[#FF8080]/12 border border-[#FF8080]/30 focus:border-[#FF8080] text-white placeholder:text-[#6E6E6E]'
                        : isPhoneValid && touched.phoneNumber
                        ? 'bg-[#101010] border border-[#FFC799]/50 focus:border-[#FFC799] text-white placeholder:text-[#6E6E6E]'
                        : 'bg-[#101010] border border-white/10 focus:border-[#FFC799] text-white placeholder:text-[#6E6E6E]'
                    }`}
                  />
                  {isPhoneValid && touched.phoneNumber && !phoneError && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC799] absolute right-3 top-3" />
                  )}
                </div>
                {phoneError && (
                  <div className="flex items-center space-x-1 mt-1 text-[11px] font-medium text-[#FF8080]">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{phoneError}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                  Mã giới thiệu <span className="font-normal text-[#6E6E6E]">(không bắt buộc)</span>
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  maxLength={32}
                  placeholder="Nhập mã bạn bè đã chia sẻ"
                  value={referralCode}
                  onChange={(event) => {
                    setReferralCode(event.target.value.toUpperCase());
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full rounded-xl px-3 py-2 text-xs font-medium outline-none transition-all bg-[#101010] border border-white/10 focus:border-[#FFC799] text-white placeholder:text-[#6E6E6E]"
                />
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                    Mật khẩu <span className="text-[#FF8080]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-[#6E6E6E] absolute left-3 top-3 pointer-events-none" />
                    <input
                      ref={passwordRef}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Ít nhất 6 ký tự..."
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      onBlur={() => handleBlur('password')}
                      className={`w-full rounded-xl pl-9 pr-8 py-2 text-xs font-medium outline-none transition-all ${
                        passwordError
                          ? 'bg-[#FF8080]/12 border border-[#FF8080]/30 focus:border-[#FF8080] text-white placeholder:text-[#6E6E6E]'
                          : isPasswordValid && touched.password
                          ? 'bg-[#101010] border border-[#FFC799]/50 focus:border-[#FFC799] text-white placeholder:text-[#6E6E6E]'
                          : 'bg-[#101010] border border-white/10 focus:border-[#FFC799] text-white placeholder:text-[#6E6E6E]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-[#A0A0A0] hover:text-white focus:outline-none p-0.5 rounded transition-colors"
                      tabIndex={-1}
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {passwordError && (
                    <div className="flex items-center space-x-1 mt-1 text-[11px] font-medium text-[#FF8080]">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  {/* Password Strength Meter */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1.5 p-2 bg-white/[0.02] rounded-lg border border-white/5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[#A0A0A0] font-medium">Độ an toàn:</span>
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
                      {passwordStrength.suggestions.length > 0 && (
                        <div className="text-[10px] text-[#A0A0A0] leading-tight">
                          Gợi ý: {passwordStrength.suggestions.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                    Xác nhận mật khẩu <span className="text-[#FF8080]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-[#6E6E6E] absolute left-3 top-3 pointer-events-none" />
                    <input
                      ref={confirmPasswordRef}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu..."
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      onBlur={() => handleBlur('confirmPassword')}
                      className={`w-full rounded-xl pl-9 pr-8 py-2 text-xs font-medium outline-none transition-all ${
                        confirmPasswordError
                          ? 'bg-[#FF8080]/12 border border-[#FF8080]/30 focus:border-[#FF8080] text-white placeholder:text-[#6E6E6E]'
                          : isConfirmPasswordValid && touched.confirmPassword
                          ? 'bg-[#101010] border border-[#FFC799]/50 focus:border-[#FFC799] text-white placeholder:text-[#6E6E6E]'
                          : 'bg-[#101010] border border-white/10 focus:border-[#FFC799] text-white placeholder:text-[#6E6E6E]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-2.5 text-[#A0A0A0] hover:text-white focus:outline-none p-0.5 rounded transition-colors"
                      tabIndex={-1}
                      title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {confirmPasswordError && (
                    <div className="flex items-center space-x-1 mt-1 text-[11px] font-medium text-[#FF8080]">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{confirmPasswordError}</span>
                    </div>
                  )}
                  {isConfirmPasswordValid && touched.confirmPassword && !confirmPasswordError && (
                    <div className="flex items-center space-x-1 mt-1 text-[11px] font-medium text-[#FFC799]">
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                      <span>Mật khẩu xác nhận trùng khớp</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Security note */}
              <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 text-[11px] text-[#A0A0A0] flex items-start space-x-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FFC799] mt-0.5 flex-shrink-0" />
                <span>Mật khẩu của bạn được mã hóa một chiều qua thuật toán bcryptjs an toàn.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] hover:bg-[#FFD6B3] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-black/50 transition-all flex items-center justify-center space-x-2 active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang xử lý đăng ký...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng ký tài khoản</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-[#A0A0A0] border-t border-white/5">
                Đã có tài khoản Motorent?{' '}
                <Link to="/login" className="font-semibold text-[#FFC799] hover:text-[#FFC799]">
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
