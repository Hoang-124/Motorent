import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Compass, 
  MapPin, 
  PhoneCall, 
  Menu, 
  X, 
  LayoutDashboard, 
  LogIn, 
  LogOut, 
  User as UserIcon, 
  Flame, 
  FileText,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    setUserDropdownOpen(false);
    logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowLogoutConfirm(false);
        setUserDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isStaffOrAdmin = Boolean(
    isAuthenticated && user && (user.roles === 'Staff' || user.roles === 'BranchManager' || user.roles === 'SystemAdmin')
  );

  const navLinks = [
    { name: 'Trang chủ', path: '/', icon: Compass },
    { name: 'Đội xe & Bảng giá', path: '/bikes', icon: Compass },
    { name: 'Hệ thống chi nhánh', path: '/branches', icon: MapPin },
    { name: 'Quy trình', path: '/#procedure', icon: FileText },
    { name: 'Ưu đãi', path: '/bikes?promo=true', icon: Flame, isHot: true },
    ...(isStaffOrAdmin ? [{ name: 'Bàn giao quầy', path: '/counter', icon: LayoutDashboard }] : []),
  ];

  const isActive = (path: string) => {
    if (path.includes('#')) return false;
    return location.pathname === path;
  };

  return (
    <>
      {/* Floating Glass Island Navbar (Sticky in document flow so it never overlaps page content) */}
      <header className="sticky top-0 z-50 w-full pt-3 pb-3 px-3 sm:px-6 transition-all duration-300 pointer-events-none">
        <div className="max-w-6xl mx-auto rounded-full px-4 sm:px-6 py-2.5 bg-[#081512]/90 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/80 flex items-center justify-between gap-4 pointer-events-auto">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-2.5 group shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-[#060D0B] shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <circle cx="5.5" cy="17.5" r="3.5" />
                <circle cx="18.5" cy="17.5" r="3.5" />
                <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4" />
              </svg>
            </div>
            <span className="text-lg font-black tracking-tight text-white">
              MOTO<span className="text-emerald-400">RENT</span>
            </span>
          </Link>

          {/* Desktop Nav Links (Pills with subtle hover) */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{link.name}</span>
                  {link.isHot && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Hub: Hotline & User Auth Pill */}
          <div className="flex items-center space-x-3 shrink-0">
            {/* 24/7 Hotline Badge */}
            <a
              href="tel:19006868"
              className="hidden sm:inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 text-xs font-semibold transition-colors"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <PhoneCall className="w-3 h-3 text-emerald-400" />
              <span className="font-bold">1900 6868</span>
            </a>

            {/* User Profile or Login CTA */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 pl-2.5 pr-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-all text-xs font-bold"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-[#060D0B] flex items-center justify-center font-black text-[10px]">
                    {user.firstName ? user.firstName[0].toUpperCase() : user.username[0].toUpperCase()}
                  </div>
                  <span className="max-w-[90px] truncate">{user.firstName || user.username}</span>
                  <ChevronDown className="w-3 h-3 text-emerald-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-56 rounded-2xl bg-[#091512] border border-white/10 shadow-2xl shadow-black p-2 text-xs space-y-1">
                    <div className="px-3 py-2 border-b border-white/10 mb-1">
                      <p className="font-bold text-white truncate">{user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username}</p>
                      <p className="text-[10px] text-emerald-400 font-mono">{user.roles}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center space-x-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Hồ sơ & eKYC</span>
                    </Link>

                    {isStaffOrAdmin && (
                      <Link
                        to="/counter"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center space-x-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Bàn giao quầy</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="group inline-flex items-center space-x-2 pl-4 pr-1.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#060D0B] font-black text-xs transition-all active:scale-95 shadow-md shadow-emerald-500/25"
              >
                <span>Đăng nhập</span>
                <div className="w-6 h-6 rounded-full bg-[#060D0B] text-emerald-400 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                  <LogIn className="w-3 h-3" />
                </div>
              </Link>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-emerald-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#060D0B]/95 backdrop-blur-3xl pt-24 px-6 flex flex-col justify-between pb-8 lg:hidden animate-in fade-in duration-200">
          <nav className="space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-sm font-bold text-white hover:border-emerald-500/40 transition-colors"
              >
                <span>{link.name}</span>
                <link.icon className="w-4 h-4 text-emerald-400" />
              </Link>
            ))}
          </nav>

          <div className="space-y-4 pt-6 border-t border-white/10">
            <a
              href="tel:19006868"
              className="w-full flex items-center justify-center space-x-2 p-3.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs"
            >
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span>Hotline cứu hộ: 1900 6868 (24/7)</span>
            </a>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="w-full py-3 rounded-full bg-red-500/20 text-red-300 font-bold text-xs border border-red-500/30"
              >
                Đăng xuất
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3.5 rounded-full bg-emerald-500 text-[#060D0B] font-black text-xs flex items-center justify-center space-x-2"
              >
                <span>Đăng nhập hệ thống</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#091512] rounded-3xl max-w-sm w-full p-6 border border-white/10 shadow-2xl text-center space-y-4">
            <h3 className="text-base font-bold text-white">Xác nhận đăng xuất?</h3>
            <p className="text-xs text-slate-400">Phiên làm việc hiện tại sẽ kết thúc và token bảo mật sẽ được thu hồi an toàn.</p>
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/10 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
