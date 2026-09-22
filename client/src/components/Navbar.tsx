import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Compass, 
  MapPin, 
  Calendar, 
  PhoneCall, 
  ShieldCheck, 
  UserCheck, 
  Menu, 
  X, 
  ChevronRight,
  Sparkles,
  LayoutDashboard,
  LogIn,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const navLinks = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Đội xe & Bảng giá', path: '/bikes' },
    { name: 'Hệ thống chi nhánh', path: '/branches' },
    { name: 'Bàn làm việc quầy', path: '/counter' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-sm transition-all">
      {/* Top micro-bar */}
      <div className="bg-forest-900 text-emerald-100 text-xs py-1.5 px-4 hidden sm:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center font-medium">
          <div className="flex items-center space-x-6">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chuỗi cho thuê xe tự lái tự doanh 100% xe chính hãng</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>3 Cơ sở: Quận 1 • Sân Bay Tân Sơn Nhất • TP. Thủ Đức</span>
            </span>
          </div>
          <div className="flex items-center space-x-4 text-emerald-200">
            <a href="tel:02838221101" className="hover:text-white flex items-center space-x-1 transition-colors">
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              <span>Hotline 24/7: (028) 3822 1101</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          {/* Logo with pure SVG vector */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-forest-500 to-forest-700 flex items-center justify-center text-white shadow-md shadow-forest-500/20 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
                <circle cx="5.5" cy="17.5" r="3.5" />
                <circle cx="18.5" cy="17.5" r="3.5" />
                <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4" />
              </svg>
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-slate-900 flex items-center">
                MOTO<span className="text-forest-600">V</span>
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-forest-100 text-forest-800 rounded">
                  Chính hãng
                </span>
              </span>
              <p className="text-[11px] text-slate-500 font-medium -mt-1 tracking-wide">
                Chuỗi Thuê Xe Tự Lái Đa Chi Nhánh
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive(link.path)
                    ? 'bg-forest-50 text-forest-700 font-bold'
                    : 'text-slate-600 hover:text-forest-700 hover:bg-slate-50'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden lg:flex items-center space-x-3">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                {/* Staff counter desk link if staff/admin */}
                {(user.roles === 'Staff' || user.roles === 'BranchManager' || user.roles === 'SystemAdmin') && (
                  <Link
                    to="/counter"
                    className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-slate-600" />
                    <span>Quầy tiếp tân</span>
                  </Link>
                )}

                {/* Profile Avatar & Name */}
                <Link
                  to="/profile"
                  className="flex items-center space-x-2.5 p-1.5 pr-3 rounded-full hover:bg-slate-100 transition-colors border border-slate-200/80"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-100 text-forest-700 flex items-center justify-center font-bold text-xs">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `http://localhost:5000${user.avatarUrl}`}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{(user.firstName || user.username).charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-800 max-w-[120px] truncate">
                    {user.firstName || user.username}
                  </span>
                </Link>

                <button
                  onClick={logout}
                  className="p-2 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-forest-700 hover:bg-slate-100 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </Link>

                <Link
                  to="/register"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-forest-700 bg-forest-50 hover:bg-forest-100 border border-forest-200 transition-colors"
                >
                  <span>Đăng ký</span>
                </Link>
              </div>
            )}

            <Link
              to="/bikes"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-forest-600 to-forest-500 hover:from-forest-700 hover:to-forest-600 shadow-md shadow-forest-600/20 hover:shadow-lg hover:shadow-forest-600/30 transition-all hover:-translate-y-0.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span>Đặt xe ngay</span>
            </Link>
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-forest-600 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-emerald-100 px-4 pt-2 pb-6 space-y-3 shadow-xl">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-base font-semibold ${
                  isActive(link.path)
                    ? 'bg-forest-50 text-forest-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
          <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2">
            {isAuthenticated && user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg text-sm font-semibold text-slate-800 bg-slate-100 flex items-center justify-center space-x-2"
                >
                  <UserIcon className="w-4 h-4 text-emerald-600" />
                  <span>Hồ sơ: {user.firstName || user.username}</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-center py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 rounded-lg text-sm font-bold text-forest-700 bg-forest-50 border border-forest-200"
                >
                  Đăng ký
                </Link>
              </div>
            )}
            <Link
              to="/bikes"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-lg text-sm font-bold text-white bg-forest-600 shadow-md shadow-forest-600/20"
            >
              Đặt xe trực tuyến (Cọc 30%)
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
