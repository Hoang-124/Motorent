import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Check if redirected with a message
  const queryParams = new URLSearchParams(location.search);
  const successNotice = queryParams.get('verified') === 'true' 
    ? 'Email của bạn đã được xác thực thành công! Vui lòng đăng nhập.' 
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập/email và mật khẩu.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/auth/login', { identifier, password });
      if (res.data && res.data.success) {
        login(res.data.data.token, res.data.data.user);
        navigate('/');
      } else {
        setErrorMsg(res.data?.message || 'Đăng nhập không thành công.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Tài khoản hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  // Mock Google Login simulation for demo/local sandbox
  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Create a mock Google ID token payload for local testing if OAuth client ID is not configured
      const mockPayload = {
        email: 'customer.google@gmail.com',
        sub: `google_${Date.now()}`,
        name: 'Nguyễn Minh Tuấn (Google)',
        given_name: 'Minh Tuấn',
        family_name: 'Nguyễn',
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
      };
      const mockToken = `header.${btoa(JSON.stringify(mockPayload))}.signature`;

      const res = await api.post('/auth/google', { credential: mockToken });
      if (res.data && res.data.success) {
        login(res.data.data.token, res.data.data.user);
        navigate('/');
      } else {
        setErrorMsg(res.data?.message || 'Đăng nhập Google không thành công.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Đăng nhập Google thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/60">
      <div className="max-w-md w-full space-y-6">
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
              MOTO<span className="text-forest-600">V</span>
            </span>
          </Link>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Đăng nhập tài khoản
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý lịch trình thuê xe, điểm thưởng và hợp đồng số hóa
          </p>
        </div>

        {/* Card Body */}
        <div className="bg-white rounded-3xl p-7 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-900/5 space-y-5">
          {successNotice && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google Sign-in Button (Pure Vector SVG) */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-center space-x-3 active:scale-[0.99]"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
            <span>Đăng nhập với Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
              hoặc tài khoản Motov
            </span>
          </div>

          {/* Standard Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                <UserIcon className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                Tên đăng nhập hoặc Email
              </label>
              <input
                type="text"
                placeholder="VD: admin hoặc hoang@outlook.com.vn"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                  Mật khẩu
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-forest-600 hover:text-forest-700"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-colors"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-forest-600 hover:bg-forest-700 text-white font-bold rounded-xl text-xs shadow-md shadow-forest-600/25 transition-all flex items-center justify-center space-x-2 active:scale-[0.99]"
            >
              {loading ? (
                <span>Đang xác thực...</span>
              ) : (
                <>
                  <span>Đăng nhập hệ thống</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Link to Register */}
          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
            Chưa có tài khoản MOTOV?{' '}
            <Link to="/register" className="font-bold text-forest-600 hover:text-forest-700">
              Đăng ký ngay
            </Link>
          </div>
        </div>

        {/* Demo hints */}
        <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs text-slate-600 space-y-1">
          <span className="font-bold text-slate-800 flex items-center">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
            Tài khoản mẫu có sẵn:
          </span>
          <p className="text-[11px] text-slate-500">
            • Quản trị: <code className="font-bold text-slate-700">admin</code> / <code className="text-slate-700">admin123</code>
          </p>
          <p className="text-[11px] text-slate-500">
            • Khách hàng: <code className="font-bold text-slate-700">customer_an</code> / <code className="text-slate-700">customer123</code>
          </p>
        </div>
      </div>
    </div>
  );
};
