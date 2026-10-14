import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw,
  Sparkles,
  Home
} from 'lucide-react';
import { api } from '../services/api';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const doVerify = async () => {
      if (!token) {
        setLoading(false);
        setSuccess(false);
        setMessage('Không tìm thấy mã xác thực trong liên kết.');
        return;
      }

      try {
        const query = new URLSearchParams();
        query.set('token', token.trim());
        if (email) query.set('email', email.trim());

        const res = await api.get(`/auth/verify-email?${query.toString()}`);
        if (res.data && res.data.success) {
          setSuccess(true);
          setMessage(res.data.message || 'Xác thực địa chỉ email thành công!');
          if (res.data.data?.token && res.data.data?.user) {
            authLogin(res.data.data.token, res.data.data.user);
          }
        } else {
          setSuccess(false);
          setMessage(res.data?.message || 'Xác thực không thành công.');
        }
      } catch (err: unknown) {
        setSuccess(false);
        if (axios.isAxiosError(err)) {
          setMessage(err.response?.data?.message || 'Liên kết xác thực không hợp lệ hoặc tài khoản đã được kích hoạt trước đó.');
        } else {
          setMessage('Liên kết xác thực không hợp lệ hoặc tài khoản đã được kích hoạt trước đó.');
        }
      } finally {
        setLoading(false);
      }
    };

    doVerify();
  }, [token, email]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#0B0F17] text-slate-100">
      <div className="max-w-md w-full bg-[#0A1813] rounded-3xl p-8 border border-white/10 shadow-2xl shadow-black/50 text-center space-y-5">
        {loading ? (
          <div className="py-8 space-y-4">
            <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
            <h3 className="text-base font-bold text-white">
              Đang xác thực địa chỉ email...
            </h3>
            <p className="text-xs text-slate-400">
              Vui lòng chờ trong giây lát trong khi hệ thống kiểm tra token.
            </p>
          </div>
        ) : success ? (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Xác thực thành công!
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
              {message}
              <br />
              Tài khoản của bạn đã được kích hoạt hoàn toàn. Bạn có thể sử dụng tất cả dịch vụ của Motorent ngay.
            </p>
            <div className="pt-2 flex flex-col space-y-2.5">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 active:scale-95"
              >
                <span>Vào Trang Chủ & Đặt Xe Ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/login?verified=true')}
                className="w-full py-2.5 bg-[#0B0F17] hover:bg-white/5 border border-white/10 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
              >
                Chuyển đến trang Đăng nhập
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle className="w-9 h-9" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Thông báo xác thực
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
              {message}
            </p>
            <div className="p-3 bg-[#0B0F17] rounded-xl border border-white/10 text-[11px] text-slate-400 text-left flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span><strong className="text-slate-200">Lưu ý:</strong> Nếu bạn đã hoàn thành kích hoạt hoặc nhập mã OTP 6 số trên trang web trước đó, tài khoản của bạn đã ở trạng thái hoạt động. Bạn có thể bấm đăng nhập ngay bên dưới!</span>
            </div>
            <div className="pt-2 flex flex-col space-y-2.5">
              <Link
                to="/login"
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-1.5"
              >
                <span>Đăng nhập ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/register"
                className="w-full py-2.5 bg-[#0B0F17] hover:bg-white/5 border border-white/10 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
              >
                Quay lại trang Đăng ký
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
