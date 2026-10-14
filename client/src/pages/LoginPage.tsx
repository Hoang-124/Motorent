import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Mail,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

// Type definitions for Google Identity Services
interface GoogleCredentialResponse {
  credential?: string;
  select_by?: string;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
}

interface GoogleButtonConfiguration {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  width?: string | number;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  locale?: string;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: GoogleIdConfiguration) => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loginSuccessMsg, setLoginSuccessMsg] = useState('');
  const [gisReady, setGisReady] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  // Check if redirected with a message
  const queryParams = new URLSearchParams(location.search);
  const successNotice = queryParams.get('verified') === 'true' 
    ? 'Email của bạn đã được xác thực thành công! Vui lòng đăng nhập.' 
    : '';

  // Process Google credential from real GIS ID Token
  const processGoogleCredential = async (credential: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post('/auth/google', { credential });
      if (res.data && res.data.success) {
        const u = res.data.data.user;
        const name = u.firstName ? (u.lastName ? `${u.lastName} ${u.firstName}` : u.firstName) : (u.username || '');
        setLoginSuccessMsg(`Đăng nhập thành công! Chào mừng bạn quay trở lại${name ? `, ${name}` : ''}.`);
        login(res.data.data.token, res.data.data.user);
        setTimeout(() => {
          navigate('/');
        }, 400);
      } else {
        setErrorMsg(res.data?.message || 'Đăng nhập Google không thành công.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Đăng nhập Google thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Initialize official Google Identity Services (GIS)
  useEffect(() => {
    if (googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: GoogleCredentialResponse) => {
            if (response.credential) {
              processGoogleCredential(response.credential);
            }
          },
          auto_select: false,
        });

        const btnContainer = document.getElementById('google-official-btn');
        if (btnContainer) {
          const parentWidth = btnContainer.parentElement?.clientWidth || 380;
          const targetWidth = Math.min(Math.max(parentWidth, 240), 400);

          window.google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            width: targetWidth,
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'center',
            locale: 'vi',
          });
          setGisReady(true);
        }
      } catch (e) {
        console.warn('Google Identity Services initialization error:', e);
      }
    }
  }, [googleClientId]);

  const isGmail = /@(gmail\.com|googlemail\.com)$/i.test(identifier.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập/email và mật khẩu.');
      return;
    }

    if (isGmail) {
      setErrorMsg('Tài khoản Gmail sử dụng phương thức đăng nhập bằng Google. Vui lòng bấm vào nút "Đăng nhập bằng Google" bên dưới.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/auth/login', { identifier, password });
      if (res.data && res.data.success) {
        const u = res.data.data.user;
        const name = u.firstName ? (u.lastName ? `${u.lastName} ${u.firstName}` : u.firstName) : (u.username || '');
        setLoginSuccessMsg(`Đăng nhập thành công! Chào mừng bạn quay trở lại${name ? `, ${name}` : ''}.`);
        login(res.data.data.token, res.data.data.user);
        setTimeout(() => {
          navigate('/');
        }, 400);
      } else {
        setErrorMsg(res.data?.message || 'Đăng nhập không thành công.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#0B0F17] text-slate-100">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center space-x-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <circle cx="5.5" cy="17.5" r="3.5" />
                <circle cx="18.5" cy="17.5" r="3.5" />
                <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4" />
              </svg>
            </div>
            <span className="text-2xl font-black text-white tracking-tight">
              MOTO<span className="text-orange-500">RENT</span>
            </span>
          </Link>
          <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
            Đăng nhập tài khoản
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý lịch trình thuê xe, điểm thưởng và hợp đồng số hóa
          </p>
        </div>

        {/* Notice Message */}
        {successNotice && (
          <div className="p-3.5 bg-orange-500/10 border border-orange-500/30 text-orange-300 rounded-2xl text-xs flex items-center space-x-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl text-xs flex items-start space-x-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {loginSuccessMsg && (
          <div className="p-3.5 bg-orange-500/10 border border-orange-500/30 text-orange-300 rounded-2xl text-xs flex items-center space-x-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
            <span>{loginSuccessMsg}</span>
          </div>
        )}

        {/* Form Box */}
        <div className="bg-[#111827] p-7 sm:p-8 rounded-[2rem] border border-white/10 shadow-2xl space-y-5 text-white">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center">
                <UserIcon className="w-3.5 h-3.5 text-orange-400 mr-1.5" />
                Tên đăng nhập hoặc Email
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="VD: admin hoặc yourname@outlook.com.vn"
                className={`w-full px-3.5 py-2.5 bg-[#0B0F17] border rounded-xl text-xs font-semibold text-white placeholder:text-slate-500 outline-none transition-all ${
                  isGmail
                    ? 'border-amber-500/70 focus:border-amber-400 bg-amber-500/[0.04]'
                    : 'border-white/10 focus:border-orange-500'
                }`}
              />

              {/* Real-time Gmail Alert */}
              {isGmail && (
                <div className="mt-2.5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start space-x-2.5 animate-in fade-in duration-200">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-amber-300">Phát hiện tài khoản Gmail</p>
                    <p className="text-[11px] text-amber-200/90 mt-1 leading-relaxed">
                      Tài khoản Gmail được hỗ trợ đăng nhập 1 chạm an toàn. Vui lòng bấm vào nút <strong className="text-white underline underline-offset-2">"Đăng nhập bằng Google"</strong> ở bên dưới.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center">
                  <Lock className="w-3.5 h-3.5 text-orange-400 mr-1.5" />
                  Mật khẩu
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-semibold text-orange-400 hover:text-orange-300 hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-white/10 rounded-xl text-xs font-semibold text-white placeholder:text-slate-500 outline-none focus:border-orange-500 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 active:scale-[0.99] text-white rounded-xl text-xs font-black shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Đang xử lý đăng nhập...</span>
              ) : (
                <>
                  <span>Đăng nhập hệ thống</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[11px]">
              <span className="px-3 bg-[#111827] text-slate-400 font-medium">hoặc đăng nhập nhanh với</span>
            </div>
          </div>

          {/* Official Google Identity Services Button Container */}
          <div className="w-full flex justify-center min-h-[44px]">
            <div id="google-official-btn" className="w-full flex justify-center" />
          </div>

          {!gisReady && (
            <p className="text-[11px] text-slate-400 text-center">
              Đang tải xác thực Google an toàn...
            </p>
          )}

          {/* Footer link to register */}
          <div className="pt-2 text-center text-xs text-slate-400">
            <span>Chưa có tài khoản? </span>
            <Link to="/register" className="font-bold text-orange-400 hover:text-orange-300 hover:underline">
              Đăng ký ngay
            </Link>
          </div>
        </div>

        {/* Security badge */}
        <div className="p-3.5 bg-white/[0.03] rounded-2xl border border-white/5 text-center">
          <p className="text-[11px] text-slate-300 flex items-center justify-center space-x-1 font-medium">
            <Mail className="w-3.5 h-3.5 text-orange-400 mr-1" />
            Hỗ trợ đăng nhập với Google, Outlook, Yahoo và email doanh nghiệp
          </p>
        </div>
      </div>
    </div>
  );
};
