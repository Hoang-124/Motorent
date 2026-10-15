import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface RequireRoleProps {
  roles: Array<'SystemAdmin' | 'BranchManager' | 'Staff' | 'Customer'>;
  children: React.ReactElement;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ roles, children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFC799]"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!roles.includes(user.roles)) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-[#161616] border border-[#FF8080]/30 rounded-3xl text-center shadow-2xl shadow-black/50">
        <div className="w-12 h-12 bg-[#FF8080]/12 text-[#FF8080] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#FF8080]/30">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Không đủ quyền truy cập</h2>
        <p className="text-xs text-[#A0A0A0] mb-6">
          Chức năng này chỉ dành cho nhân sự thuộc vai trò: {roles.join(', ')}. Tài khoản của bạn hiện là: {user.roles}.
        </p>
        <a
          href="/"
          className="inline-block px-5 py-2.5 bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] hover:bg-[#FFD6B3] text-white rounded-xl text-xs font-bold transition-colors"
        >
          Trở về Trang chủ
        </a>
      </div>
    );
  }

  return children;
};
