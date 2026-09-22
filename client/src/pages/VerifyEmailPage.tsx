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
      } catch (err: any) {
        setSuccess(false);
        setMessage(err.response?.data?.message || 'Liên kết xác thực không hợp lệ hoặc tài khoản đã được kích hoạt trước đó.');
      } finally {
        setLoading(false);
      }
    };

    doVerify();
  }, [token, email]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/60">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl shadow-slate-900/5 text-center space-y-5">
        {loading ? (
          <div className="py-8 space-y-4">
            <RefreshCw className="w-10 h-10 text-forest-600 animate-spin mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              Đang xác thực địa chỉ email...
            </h3>
            <p className="text-xs text-slate-500">
              Vui lòng chờ trong giây lát trong khi hệ thống kiểm tra token.
            </p>
          </div>
        ) : success ? (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-forest-700 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Xác thực thành công!
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              {message}
              <br />
              Tài khoản của bạn đã được kích hoạt hoàn toàn. Bạn có thể sử dụng tất cả dịch vụ của Motorent ngay.
            </p>
            <div className="pt-2 flex flex-col space-y-2.5">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full py-3 bg-forest-600 hover:bg-forest-700 text-white font-bold rounded-xl text-xs shadow-md shadow-forest-600/25 transition-all flex items-center justify-center space-x-2 active:scale-95"
              >
                <span>Vào Trang Chủ & Đặt Xe Ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/login?verified=true')}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Chuyển đến trang Đăng nhập
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle className="w-9 h-9" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Thông báo xác thực
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              {message}
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 text-left flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-forest-600 mt-0.5 flex-shrink-0" />
              <span><strong>Lưu ý:</strong> Nếu bạn đã hoàn thành kích hoạt hoặc nhập mã OTP 6 số trên trang web trước đó, tài khoản của bạn đã ở trạng thái hoạt động. Bạn có thể bấm đăng nhập ngay bên dưới!</span>
            </div>
            <div className="pt-2 flex flex-col space-y-2.5">
              <Link
                to="/login"
                className="w-full py-3 bg-forest-600 hover:bg-forest-700 text-white font-bold rounded-xl text-xs shadow-md shadow-forest-600/20 transition-all flex items-center justify-center space-x-1.5"
              >
                <span>Đăng nhập ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/register"
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
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
