import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const doVerify = async () => {
      if (!token) {
        setLoading(false);
        setSuccess(false);
        setMessage('Không tìm thấy token xác thực trong liên kết.');
        return;
      }

      try {
        const res = await api.get(`/auth/verify-email?token=${token}`);
        if (res.data && res.data.success) {
          setSuccess(true);
          setMessage(res.data.message || 'Xác thực địa chỉ email thành công!');
        } else {
          setSuccess(false);
          setMessage(res.data?.message || 'Xác thực thất bại.');
        }
      } catch (err: any) {
        setSuccess(false);
        setMessage(err.response?.data?.message || 'Liên kết xác thực không hợp lệ hoặc đã hết hạn.');
      } finally {
        setLoading(false);
      }
    };

    doVerify();
  }, [token]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/60">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-900/5 text-center space-y-5">
        {loading ? (
          <div className="py-8 space-y-4">
            <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              Đang xác thực địa chỉ email...
            </h3>
            <p className="text-xs text-slate-500">
              Vui lòng chờ trong giây lát trong khi hệ thống kiểm tra token.
            </p>
          </div>
        ) : success ? (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-forest-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Xác thực thành công!
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              {message}
              <br />
              Tài khoản của bạn đã được kích hoạt hoàn toàn. Bạn có thể đăng nhập ngay để đặt xe.
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate('/login?verified=true')}
                className="w-full py-3 bg-forest-600 hover:bg-forest-700 text-white font-bold rounded-xl text-xs shadow-md shadow-forest-600/25 transition-all flex items-center justify-center space-x-2"
              >
                <span>Đăng nhập ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-9 h-9" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Xác thực không thành công
            </h2>
            <p className="text-xs text-red-600 leading-relaxed max-w-sm mx-auto">
              {message}
            </p>
            <div className="pt-2 flex flex-col space-y-2">
              <Link
                to="/register"
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Quay lại trang Đăng ký
              </Link>
              <Link
                to="/login"
                className="text-xs font-bold text-forest-600 hover:text-forest-700"
              >
                Đến trang Đăng nhập
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
