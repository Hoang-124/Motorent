import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { api } from '../services/api';
import axios from 'axios';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg('Thiếu mã token đặt lại mật khẩu trong liên kết.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có độ dài ít nhất 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/auth/reset-password', {
        token,
        newPassword,
      });

      if (res.data && res.data.success) {
        setIsSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 1800);
      } else {
        setErrorMsg(res.data?.message || 'Không thể đặt lại mật khẩu.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(err.response?.data?.message || 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      } else {
        setErrorMsg('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#101010] text-[#F5F5F5]">
      <div className="max-w-md w-full space-y-6">
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
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Thiết lập mật khẩu mới
          </h2>
          <p className="text-xs text-[#A0A0A0] mt-1">
            Nhập mật khẩu mới an toàn cho tài khoản của bạn
          </p>
        </div>

        <div className="bg-[#161616] rounded-3xl p-7 sm:p-8 border border-white/10 shadow-2xl shadow-black/50 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-[#FF8080]/12 border border-[#FF8080]/30 rounded-xl text-xs text-[#FF8080] flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-[#FF8080] flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="text-center space-y-4 py-3">
              <div className="w-14 h-14 rounded-full bg-[#FFC799]/20 text-[#FFC799] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">
                Đặt lại mật khẩu thành công!
              </h3>
              <p className="text-xs text-[#A0A0A0] leading-relaxed max-w-sm mx-auto">
                Mật khẩu của bạn đã được cập nhật an toàn. Hệ thống đang chuyển hướng bạn về trang chính...
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full py-3 bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] hover:bg-[#FFD6B3] text-white font-bold rounded-xl text-xs shadow-lg shadow-black/50 transition-all flex items-center justify-center space-x-2"
                >
                  <span>Chuyển về trang chính</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A0A0A0] mb-1 flex items-center">
                  <Lock className="w-3.5 h-3.5 text-[#FFC799] mr-1.5" />
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ít nhất 6 ký tự..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full bg-[#101010] border border-white/10 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-medium text-white placeholder:text-[#6E6E6E] outline-none focus:border-[#FFC799]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#A0A0A0] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0A0A0] mb-1 flex items-center">
                  <Lock className="w-3.5 h-3.5 text-[#FFC799] mr-1.5" />
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu mới..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-medium text-white placeholder:text-[#6E6E6E] outline-none focus:border-[#FFC799]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] hover:bg-[#FFD6B3] text-white font-bold rounded-xl text-xs shadow-lg shadow-black/50 transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Đang cập nhật...</span>
                ) : (
                  <>
                    <span>Cập nhật mật khẩu mới</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
