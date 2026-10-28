import { NavLink } from 'react-router-dom';
import { Bike, Tags, Wrench, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ManagementNav() {
  const { user } = useAuth();
  const links = [
    ...(['SystemAdmin', 'BranchManager'].includes(user?.roles ?? '') ? [{ to: '/manager/dashboard', label: 'Tổng quan đội xe', icon: Bike }] : []),
    ...(user?.roles === 'SystemAdmin' ? [{ to: '/admin/categories', label: 'Danh mục xe · Admin', icon: Tags }] : []),
    ...(['SystemAdmin', 'BranchManager'].includes(user?.roles ?? '') ? [{ to: '/manager/vehicles', label: 'Xe & giá thuê · Manager', icon: Bike }] : []),
    { to: '/manager/fleet', label: user?.roles === 'Staff' ? 'Phiếu kỹ thuật · Staff' : 'Điều chuyển & bảo dưỡng', icon: Wrench },
    ...(['SystemAdmin', 'BranchManager'].includes(user?.roles ?? '') ? [{ to: '/reports', label: 'Báo cáo & Phân tích (S3)', icon: BarChart3 }] : []),
  ];
  return <nav aria-label="Quản lý đội xe" className="max-w-7xl mx-auto flex flex-wrap gap-2 px-4 sm:px-6 lg:px-8 pt-8">
    {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm ${isActive ? 'bg-[#FFC799] border-[#FFC799] text-[#101010]' : 'bg-[#161616] border-white/15 text-[#D0D0D0] hover:border-[#FFC799]'}`}><Icon size={16} />{label}</NavLink>)}
  </nav>;
}
