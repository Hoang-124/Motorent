import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { api } from '../services/api';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Result state
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setIsGoogleAccount(false);
    setSuccessMsg('');
    setDevResetToken(null);

    // Client-side quick check for Google domains
    const isGoogleDomain = /@(gmail\.com|googlemail\.com)$/i.test(email.trim());
    if (isGoogleDomain) {
      setIsGoogleAccount(true);
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      if (res.data && res.data.success) {
        if (res.data.data?.isGoogleAccount) {
          setIsGoogleAccount(true);
        } else {
          setSuccessMsg(res.data.message || 'Đã gửi hướng dẫn đặt lại mật khẩu vào email của bạn.');
          if (res.data.data?.resetToken) {
            setDevResetToken(res.data.data.resetToken);
          }
        }
      } else {
        setErrorMsg(res.data?.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi xử lý yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/60">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
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
              MOTO<span className="text-forest-600">V</span>
            </span>
          </Link>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Quên mật khẩu?
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Nhập địa chỉ email liên kết với tài khoản MOTOV của bạn
          </p>
        </div>

        <div className="bg-white rounded-3xl p-7 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-900/5 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Case 1: Google Email Account Detected */}
          {isGoogleAccount && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="w-12 h-12 rounded-full bg-white border border-amber-200 shadow-2xs flex items-center justify-center mx-auto">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
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

              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  Phát hiện tài khoản Google
                </h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Địa chỉ email <strong className="font-bold">{email}</strong> sử dụng phương thức đăng nhập qua Google. Bạn không cần đặt lại mật khẩu, vui lòng đăng nhập trực tiếp bằng Google.
                </p>
              </div>

              <Link
                to="/login"
                className="w-full py-3 bg-white hover:bg-slate-50 border border-amber-300 rounded-xl text-xs font-bold text-slate-800 shadow-sm transition-all flex items-center justify-center space-x-2"
              >
                <span>Chuyển sang Đăng nhập bằng Google</span>
                <ArrowRight className="w-4 h-4 text-amber-600" />
              </Link>
            </div>
          )}

          {/* Case 2: Other Emails (Outlook, Yahoo, Custom) - Sent Reset Email */}
          {successMsg && !isGoogleAccount && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-forest-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-forest-900">
                Đã gửi liên kết đặt lại mật khẩu!
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Vui lòng kiểm tra hộp thư của <strong className="text-forest-800">{email}</strong>. Liên kết có hiệu lực trong 60 phút.
              </p>

              {devResetToken && (
                <div className="p-3 bg-white rounded-xl border border-emerald-300 text-xs text-left space-y-1.5">
                  <span className="font-bold text-forest-800 flex items-center">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                    Thử nghiệm phát triển (Dev Mode):
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/reset-password?token=${devResetToken}`)}
                    className="w-full py-2 bg-forest-600 hover:bg-forest-700 text-white rounded-lg font-bold text-xs"
                  >
                    Mở form Đặt lại mật khẩu ngay
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          {!isGoogleAccount && !successMsg && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                  <Mail className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                  Địa chỉ Email tài khoản
                </label>
                <input
                  type="email"
                  placeholder="VD: user@outlook.com.vn, user@yahoo.com..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Hệ thống hỗ trợ Outlook, Yahoo, email doanh nghiệp hoặc tài khoản cá nhân.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-forest-600 hover:bg-forest-700 text-white font-bold rounded-xl text-xs shadow-md shadow-forest-600/25 transition-all flex items-center justify-center space-x-2 active:scale-[0.99]"
              >
                {loading ? (
                  <span>Đang kiểm tra tài khoản...</span>
                ) : (
                  <>
                    <span>Gửi liên kết khôi phục</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-2 text-center text-xs">
            <Link
              to="/login"
              className="inline-flex items-center space-x-1.5 font-bold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại trang Đăng nhập</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
