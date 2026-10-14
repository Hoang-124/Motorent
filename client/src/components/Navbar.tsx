import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  Camera,
  FileCheck2,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserAvatarUrl } from '../utils/imageHelper';
import { api } from '../services/api';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [bookingCount, setBookingCount] = useState<number>(0);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const avatarSrc = getUserAvatarUrl(user?.avatarUrl);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.avatarUrl]);

  // Fetch user's booking count
  useEffect(() => {
    if (isAuthenticated) {
      api.get('/bookings/my')
        .then((res) => {
          if (res.data && res.data.success && Array.isArray(res.data.data)) {
            setBookingCount(res.data.data.length);
          }
        })
        .catch(() => { });
    }
  }, [isAuthenticated, location.pathname]);

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

  // Click outside to close user dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen]);

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
        <div className="max-w-6xl mx-auto rounded-full px-4 sm:px-6 py-2.5 bg-[#0B101D]/85 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/80 flex items-center justify-between gap-4 pointer-events-auto">

          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-2.5 group shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center text-[#060D0B] shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <circle cx="5.5" cy="17.5" r="3.5" />
                <circle cx="18.5" cy="17.5" r="3.5" />
                <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4" />
              </svg>
            </div>
            <span className="text-lg font-black tracking-tight text-white">
              MOTO<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200">RENT</span>
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
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center space-x-1.5 ${active
                      ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-200 border border-amber-500/30'
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
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <PhoneCall className="w-3 h-3 text-amber-400" />
              <span className="font-bold">1900 6868</span>
            </a>

            {/* User Profile or Login CTA */}
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 pl-1.5 pr-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-200 hover:bg-amber-500/25 transition-all text-xs font-bold"
                >
                  {avatarSrc && !avatarLoadFailed ? (
                    <img
                      src={avatarSrc}
                      alt="Avatar"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={() => setAvatarLoadFailed(true)}
                      className="w-6 h-6 rounded-full object-cover border border-amber-400/40 shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black text-[10px] shrink-0">
                      {user.firstName ? user.firstName[0].toUpperCase() : user.username[0].toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[90px] truncate">{user.firstName || user.username}</span>
                  <ChevronDown className={`w-3 h-3 text-amber-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-72 rounded-2xl bg-[#0D131F]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black p-2 text-xs space-y-1 z-50 animate-in fade-in duration-150">
                    <div className="px-3 py-2.5 border-b border-white/10 mb-1 flex items-center space-x-2.5">
                      {avatarSrc && !avatarLoadFailed ? (
                        <img
                          src={avatarSrc}
                          alt="Avatar"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          className="w-8 h-8 rounded-full object-cover border border-amber-400/40 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0">
                          {user.firstName ? user.firstName[0].toUpperCase() : user.username[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white truncate">{user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username}</p>
                        <p className="text-[10px] text-amber-400 font-mono">{user.roles}</p>
                      </div>
                    </div>

                    {/* 1. Chuyến xe của tôi */}
                    <Link
                      to="/profile?tab=bookings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">Chuyến xe của tôi</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium shrink-0 ml-2">
                        {bookingCount} chuyến
                      </span>
                    </Link>

                    {/* 2. Thông tin cá nhân & Chỉnh sửa */}
                    <Link
                      to="/profile?tab=info"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <UserIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">Thông tin cá nhân & Chỉnh sửa</span>
                      </div>
                    </Link>

                    {/* 3. Đổi ảnh đại diện */}
                    <Link
                      to="/profile?tab=avatar"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">Đổi ảnh đại diện</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">5MB</span>
                    </Link>

                    {/* 4. Định danh điện tử (eKYC) */}
                    <Link
                      to="/profile?tab=ekyc"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <FileCheck2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">Định danh điện tử (eKYC)</span>
                      </div>
                      {user.identityStatus === 'Verified' ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] shrink-0 ml-2">
                          Đã duyệt
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] shrink-0 ml-2">
                          Cần làm
                        </span>
                      )}
                    </Link>

                    {/* 5. Đổi mật khẩu bảo mật */}
                    <Link
                      to="/profile?tab=password"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">Đổi mật khẩu bảo mật</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">≥ 8 ký tự</span>
                    </Link>

                    {isStaffOrAdmin && (
                      <Link
                        to="/counter"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors border-t border-white/5 pt-2"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Bàn giao quầy</span>
                      </Link>
                    )}

                    <div className="pt-1 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5 shrink-0" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="group inline-flex items-center space-x-2 pl-4 pr-1.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-xs transition-all active:scale-95 shadow-lg shadow-orange-500/25"
              >
                <span>Đăng nhập</span>
                <div className="w-6 h-6 rounded-full bg-[#060D0B] text-amber-400 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
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
              {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
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
                className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-sm font-bold text-white hover:border-amber-500/40 transition-colors"
              >
                <span>{link.name}</span>
                <link.icon className="w-4 h-4 text-amber-400" />
              </Link>
            ))}
          </nav>

          <div className="space-y-4 pt-6 border-t border-white/10">
            <a
              href="tel:19006868"
              className="w-full flex items-center justify-center space-x-2 p-3.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-200 font-bold text-xs"
            >
              <PhoneCall className="w-4 h-4 text-amber-400" />
              <span>Hotline cứu hộ: 1900 6868 (24/7)</span>
            </a>

            {isAuthenticated && user && (
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 mb-2 space-y-3">
                <div className="flex items-center space-x-3">
                  {avatarSrc && !avatarLoadFailed ? (
                    <img
                      src={avatarSrc}
                      alt="Avatar"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-10 h-10 rounded-full object-cover border border-amber-400/40 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black text-sm shrink-0">
                      {user.firstName ? user.firstName[0].toUpperCase() : user.username[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-bold text-white truncate text-xs">{user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username}</p>
                    <p className="text-[10px] text-amber-400 font-mono">{user.roles}</p>
                  </div>
                </div>

                {/* Profile quick links in mobile */}
                <div className="grid grid-cols-1 gap-1 pt-2 border-t border-white/10 text-xs">
                  <Link
                    to="/profile?tab=bookings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    <div className="flex items-center space-x-2">
                      <Compass className="w-3.5 h-3.5 text-amber-400" />
                      <span>Chuyến xe của tôi</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">{bookingCount} chuyến</span>
                  </Link>

                  <Link
                    to="/profile?tab=info"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Thông tin cá nhân & Chỉnh sửa</span>
                  </Link>

                  <Link
                    to="/profile?tab=avatar"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    <div className="flex items-center space-x-2">
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>Đổi ảnh đại diện</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">5MB</span>
                  </Link>

                  <Link
                    to="/profile?tab=ekyc"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    <div className="flex items-center space-x-2">
                      <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Định danh điện tử (eKYC)</span>
                    </div>
                    {user.identityStatus === 'Verified' ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                        Đã duyệt
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px]">
                        Cần làm
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/profile?tab=password"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    <div className="flex items-center space-x-2">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Đổi mật khẩu bảo mật</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">≥ 8 ký tự</span>
                  </Link>
                </div>
              </div>
            )}

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
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/25"
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
          <div className="bg-[#0D131F] rounded-3xl max-w-sm w-full p-6 border border-white/10 shadow-2xl text-center space-y-4">
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
