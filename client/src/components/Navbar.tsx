import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Compass,
  MapPin,
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
  Lock,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Clock,
  ShieldCheck,
  Tag,
  Bell,
  MessageSquare,
  CheckCheck,
  Heart,
  ShieldAlert,
  AlertCircle,
  Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { getUserAvatarUrl } from '../utils/imageHelper';
import { api } from '../services/api';
import type { Notification } from '../types';

const NAVBAR_PROMO_VOUCHERS = [
  {
    code: 'CHAOBANMOI',
    discountText: 'Giảm 20.000đ',
    badge: 'Khách hàng mới',
    title: 'Ưu đãi Khách hàng mới đi phố Đà Nẵng',
    condition: 'Áp dụng mọi dòng xe tay ga, xe số & xe côn • Không giới hạn số ngày thuê',
  },
  {
    code: 'MOTORENT30',
    discountText: 'Giảm 30.000đ',
    badge: 'Đặt lịch sớm',
    title: 'Ưu đãi Đặt lịch Sớm Trực tuyến',
    condition: 'Áp dụng khi đặt xe trực tuyến và thanh toán cọc 30% giữ biển số xe',
  },
  {
    code: 'LIENTRAM0D',
    discountText: 'Phụ phí 0đ',
    badge: 'Đặc quyền liên trạm',
    title: 'Miễn phí 100% Giao nhận xe Liên trạm Một chiều',
    condition: 'Nhận xe tại Sân bay Quốc tế Đà Nẵng — Trả xe tại Bãi biển Mỹ Khê (hoặc ngược lại)',
  },
];

const PROCEDURE_STEPS = [
  {
    step: '01',
    title: 'Chọn dòng xe & Khóa đích danh biển số',
    duration: '01 phút',
    desc: 'Tra cứu xe trống theo thời gian thực tại trạm Sân bay hoặc Biển Mỹ Khê. Chọn đúng chiếc xe bạn ưng ý và thanh toán cọc 30% qua cổng VNPay để hệ thống khóa tự động biển số xe.',
  },
  {
    step: '02',
    title: 'Định danh điện tử eKYC — Không giữ CCCD gốc',
    duration: '01 phút',
    desc: 'Tải ảnh CCCD và Bằng lái xe (A1/A2) lên hồ sơ trực tuyến. Motorent đối chiếu tự động để khách hàng giữ lại toàn bộ giấy tờ gốc làm thủ tục bay và nhận phòng khách sạn.',
  },
  {
    step: '03',
    title: 'Nhận xe trong 03 phút cùng bộ phụ kiện tiêu chuẩn',
    duration: '03 phút',
    desc: 'Kỹ thuật viên bàn giao xe sạch sẽ tại quầy kèm biên bản điện tử, 02 mũ bảo hiểm kính trong đã khử khuẩn UV, 02 áo mưa bộ và giá đỡ điện thoại chống rung.',
  },
  {
    step: '04',
    title: 'Trả xe linh hoạt khác chi nhánh & Hỗ trợ 24/7',
    duration: 'Tức thì',
    desc: 'Tự do di chuyển trong phố, bán đảo Sơn Trà hoặc Hội An. Kết thúc hành trình, bạn có thể trả xe tại bất kỳ chi nhánh nào và tất toán 70% phần còn lại.',
  },
];

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [showProcedureModal, setShowProcedureModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string>('');

  // Header Chat & Notification Bell states
  const [chatIsOpen, setChatIsOpen] = useState<boolean>(false);
  const [chatUnread, setChatUnread] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifUnreadCount, setNotifUnreadCount] = useState<number>(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const [bookingCount, setBookingCount] = useState<number>(0);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { wishlistCount } = useWishlist();

  const avatarSrc = getUserAvatarUrl(user?.avatarUrl);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.avatarUrl]);

  // Ensure unified theme is active (clear any legacy theme attribute)
  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('motorent_theme');
  }, []);

  const fetchNotifications = useCallback(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setNotifUnreadCount(0);
      return;
    }
    api
      .get('/notifications')
      .then((res) => {
        if (res.data?.success && res.data.data) {
          const items: Notification[] = res.data.data.items || [];
          setNotifications(items);
          setNotifUnreadCount(res.data.data.unreadCount ?? items.filter((n) => !n.isRead).length);
        }
      })
      .catch((error: unknown) => {
        console.error('[Notifications] Failed to load notifications:', error);
      });
  }, [isAuthenticated]);

  // Fetch user's booking count & notifications
  useEffect(() => {
    if (isAuthenticated) {
      api
        .get('/bookings/my')
        .then((res) => {
          if (res.data && res.data.success && Array.isArray(res.data.data)) {
            const validBookings = res.data.data.filter(
              (b: { status?: string; paymentMethod?: string; depositPaid?: boolean; isPaid?: boolean }) =>
                !['Cancelled', 'Rejected'].includes(b.status || '') &&
                !(b.status === 'Pending' && b.paymentMethod === 'Banking' && !b.depositPaid && !b.isPaid)
            );
            setBookingCount(validBookings.length);
          }
        })
        .catch(() => {});
      fetchNotifications();
    } else {
      setBookingCount(0);
      setNotifications([]);
      setNotifUnreadCount(0);
    }
  }, [isAuthenticated, location.pathname, fetchNotifications]);

  // Listen to LiveChatWidget state & incoming chat notifications
  useEffect(() => {
    const handleChatState = (e: Event) => {
      const custom = e as CustomEvent<{ isOpen: boolean; unreadBadge: number }>;
      if (custom.detail) {
        setChatIsOpen(Boolean(custom.detail.isOpen));
        setChatUnread(Number(custom.detail.unreadBadge || 0));
      }
    };

    const handleNewChatNotif = (e: Event) => {
      const custom = e as CustomEvent<{
        _id: string;
        content: string;
        createdAt: string;
        senderName?: string;
      }>;
      if (custom.detail) {
        const isStaff =
          user && ['Staff', 'BranchManager', 'SystemAdmin'].includes(user.roles);
        const syntheticNotif: Notification = {
          _id: `chat_${custom.detail._id || Date.now()}`,
          userId: user?._id || '',
          title: isStaff
            ? `Tin nhắn mới từ khách hàng ${custom.detail.senderName || ''}`.trim()
            : 'Tin nhắn mới từ Điều phối viên Motorent',
          body: custom.detail.content || 'Bạn có tin nhắn mới trong hộp thoại Live Chat.',
          type: 'SYSTEM',
          isRead: false,
          createdAt: custom.detail.createdAt || new Date().toISOString(),
        };
        setNotifications((prev) => [syntheticNotif, ...prev]);
        setNotifUnreadCount((c) => c + 1);
      }
    };

    window.addEventListener('motorent:chat-state', handleChatState);
    window.addEventListener('motorent:new-chat-notification', handleNewChatNotif);
    return () => {
      window.removeEventListener('motorent:chat-state', handleChatState);
      window.removeEventListener('motorent:new-chat-notification', handleNewChatNotif);
    };
  }, [user]);

  const isStaffOrAdmin = Boolean(
    isAuthenticated &&
      user &&
      (user.roles === 'Staff' ||
        user.roles === 'BranchManager' ||
        user.roles === 'SystemAdmin')
  );

  const handleMarkNotifRead = async (notif: Notification) => {
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
      );
      setNotifUnreadCount((c) => Math.max(0, c - 1));
      if (!notif._id.startsWith('chat_')) {
        api.put(`/notifications/${notif._id}/read`).catch((error: unknown) => {
          console.error('[Notifications] Failed to mark notification as read:', error);
          fetchNotifications();
        });
      }
    }
    setNotifDropdownOpen(false);
    if (notif.title.toLowerCase().includes('chat') || notif._id.startsWith('chat_')) {
      window.dispatchEvent(new CustomEvent('motorent:open-chat'));
    } else if (notif.type === 'PROMO') {
      navigate('/bikes?promo=true');
    } else if (notif.type === 'BOOKING') {
      navigate(isStaffOrAdmin ? '/counter' : '/profile?tab=bookings');
    } else if (notif.type === 'MAINTENANCE' && isStaffOrAdmin) {
      const vehicleId = typeof notif.data?.vehicleId === 'string' ? notif.data.vehicleId : '';
      navigate(`/manager/fleet${vehicleId ? `?vehicle=${encodeURIComponent(vehicleId)}` : ''}`);
    } else if (notif.type === 'TRANSFER' && isStaffOrAdmin) {
      navigate('/manager/fleet?tab=transfers');
    }
  };

  const handleMarkAllNotifsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setNotifUnreadCount(0);
    if (isAuthenticated) {
      api.put('/notifications/read-all').catch((error: unknown) => {
        console.error('[Notifications] Failed to mark all notifications as read:', error);
        fetchNotifications();
      });
    }
  };

  const handleToggleHeaderChat = () => {
    setNotifDropdownOpen(false);
    setUserDropdownOpen(false);
    window.dispatchEvent(new CustomEvent('motorent:toggle-chat'));
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    setUserDropdownOpen(false);
    setNotifDropdownOpen(false);
    window.dispatchEvent(new CustomEvent('motorent:close-chat'));
    logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowLogoutConfirm(false);
        setUserDropdownOpen(false);
        setNotifDropdownOpen(false);
        setShowProcedureModal(false);
        setShowPromoModal(false);
        window.dispatchEvent(new CustomEvent('motorent:close-chat'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };
    if (userDropdownOpen || notifDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen, notifDropdownOpen]);

  const roleLabelVi =
    user?.roles === 'SystemAdmin'
      ? 'Quản trị Hệ thống'
      : user?.roles === 'BranchManager'
        ? 'Quản lý Chi nhánh'
        : user?.roles === 'Staff'
          ? 'Nhân viên Điều phối'
          : 'Khách hàng';

  const handleCopyPromoCode = (code: string) => {
    setCopiedCode(code);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const handleApplyPromoVoucher = (code: string) => {
    handleCopyPromoCode(code);
    setShowPromoModal(false);
    setMobileMenuOpen(false);
    navigate(`/bikes?promo=true&voucher=${code}`);
  };

  const handleJumpToHomeProcedure = () => {
    setShowProcedureModal(false);
    setMobileMenuOpen(false);
    if (location.pathname === '/') {
      const el = document.getElementById('procedure');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    navigate('/#procedure');
  };

  const navLinks: Array<{
    name: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    isHot?: boolean;
    action?: () => void;
  }> = isStaffOrAdmin
    ? [
        {
          name: 'Bàn giao & Hợp đồng',
          path: '/counter?mode=bookings',
          icon: LayoutDashboard,
        },
        {
          name: 'Duyệt eKYC',
          path: '/counter?mode=ekyc',
          icon: FileCheck2,
        },
        ...(user?.roles === 'SystemAdmin'
          ? [
              {
                name: 'Quản trị Admin',
                path: '/admin',
                icon: Building2,
              },
              {
                name: 'Nhật ký Audit',
                path: '/audit',
                icon: ShieldCheck,
              },
            ]
          : []),
        {
          name: 'Đội xe',
          path: '/bikes',
          icon: Compass,
        },
        {
          name: 'Chi nhánh',
          path: '/branches',
          icon: MapPin,
        },
      ]
    : [
        { name: 'Trang chủ', path: '/', icon: Compass, action: undefined },
        { name: 'Đội xe & Bảng giá', path: '/bikes', icon: Compass, action: undefined },
        { name: 'Chi nhánh', path: '/branches', icon: MapPin, action: undefined },
        {
          name: 'Quy trình',
          path: '/#procedure',
          icon: FileText,
          action: () => setShowProcedureModal(true),
        },
        {
          name: 'Ưu đãi',
          path: '/bikes?promo=true',
          icon: Flame,
          isHot: true,
          action: () => setShowPromoModal(true),
        },
      ];

  const isActive = (path: string) => {
    if (path.startsWith('/counter?mode=')) {
      const targetMode = path.split('mode=')[1];
      if (location.pathname !== '/counter') return false;
      const currentMode = new URLSearchParams(location.search).get('mode') || 'bookings';
      return currentMode === targetMode;
    }
    if (path === '/#procedure') {
      return showProcedureModal || location.hash === '#procedure';
    }
    if (path === '/bikes?promo=true') {
      return showPromoModal || location.search.includes('promo=true');
    }
    if (path === '/bikes') {
      return location.pathname === '/bikes' && !location.search.includes('promo=true');
    }
    return location.pathname === path;
  };

  return (
    <>
      {/* Balanced 3-Zone Architectural Header */}
      <header className="sticky top-0 z-50 w-full bg-[#101010]/95 backdrop-blur-xl border-b border-white/[0.08] transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[68px] grid grid-cols-2 lg:grid-cols-[1fr_auto_1fr] items-center gap-4">

          {/* ZONE 1 (LEFT): Compact Brand Lockup */}
          <div className="flex items-center justify-self-start">
            <Link
              to={isStaffOrAdmin ? '/counter' : '/'}
              className="inline-flex items-center space-x-3 group shrink-0"
            >
              <div className="w-9 h-9 rounded-xl border border-white/15 bg-[#161616] flex items-center justify-center text-[#FFC799] group-hover:border-[#FFC799] transition-colors">
                <svg className="w-4 h-4 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
                  <circle cx="5.5" cy="17.5" r="3.5" />
                  <circle cx="18.5" cy="17.5" r="3.5" />
                  <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4" />
                </svg>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-base sm:text-[17px] font-bold tracking-[0.14em] uppercase text-[#F5F5F5]">
                  MOTORENT
                </span>
                <span className="font-serif-display italic text-sm text-[#FFC799] font-medium">
                  {isStaffOrAdmin ? 'Operations' : 'Đà Nẵng'}
                </span>
              </div>
            </Link>
          </div>

          {/* ZONE 2 (CENTER): Segmented Navigation Pill Dock */}
          <nav className="hidden lg:flex items-center justify-self-center bg-[#161616] border border-white/[0.09] rounded-full p-1 gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              const itemClasses = `px-3.5 py-1.5 rounded-full text-xs transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-[#F5F5F5] text-[#101010] font-semibold shadow-sm'
                  : 'text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.04] font-medium'
              }`;

              if (link.action) {
                return (
                  <button
                    key={link.path}
                    type="button"
                    onClick={link.action}
                    className={itemClasses}
                  >
                    <span>{link.name}</span>
                    {link.isHot && (
                      <span
                        className={`px-1.5 py-0.2 text-[9px] font-mono-tabular uppercase tracking-wider rounded ${
                          active
                            ? 'bg-[#101010]/15 text-[#101010] font-bold'
                            : 'bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30'
                        }`}
                      >
                        Mới
                      </span>
                    )}
                  </button>
                );
              }

              return (
                <Link key={link.path} to={link.path} className={itemClasses}>
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* ZONE 3 (RIGHT): Quick Action & Tactile Account Hub */}
          <div className="flex items-center justify-self-end space-x-2.5 shrink-0">

            {/* Customer Trips / Guest Quick Action (Hidden for Staff/Admin to avoid clutter) */}
            {!isStaffOrAdmin && (
              isAuthenticated && user ? (
                <Link
                  to="/profile?tab=bookings"
                  className="hidden sm:inline-flex items-center space-x-2 h-9 px-3.5 rounded-full bg-[#161616] border border-white/10 hover:border-[#FFC799]/50 text-xs text-[#A0A0A0] hover:text-[#F5F5F5] font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  <Compass className="w-3.5 h-3.5 text-[#FFC799]" />
                  <span>Chuyến của tôi</span>
                  {bookingCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#FFC799]/20 text-[#FFC799] font-mono-tabular font-bold text-[10px]">
                      {bookingCount}
                    </span>
                  )}
                </Link>
              ) : (
                <Link
                  to="/bikes"
                  className="hidden sm:inline-flex items-center space-x-1.5 h-9 px-3.5 rounded-full bg-[#161616] border border-white/10 hover:border-[#FFC799]/50 text-xs text-[#F5F5F5] font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Chọn xe nhanh</span>
                  <ArrowRight className="w-3 h-3 text-[#FFC799]" />
                </Link>
              )
            )}

            {/* Wishlist Quick Button (UC-25, UC-26) */}
            {!isStaffOrAdmin && (
              <Link
                to="/wishlist"
                className="relative w-9 h-9 rounded-full border border-white/12 bg-[#161616] flex items-center justify-center text-[#F5F5F5] hover:border-[#FFC799]/60 hover:text-[#FFC799] transition-all cursor-pointer shrink-0"
                title="Danh sách xe yêu thích (UC-25, UC-26)"
                aria-label="Xe yêu thích"
              >
                <Heart className="w-4 h-4 text-[#FFC799]" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-[#FFC799] text-[#101010] font-mono text-[10px] font-black flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            )}

            {/* Header Live Chat Trigger Button (UC-44 for Customer / UC-66 Inbox for Branch Staff & Manager) */}
            {user?.roles !== 'SystemAdmin' && (
              <button
                type="button"
                onClick={handleToggleHeaderChat}
                className={`relative h-9 px-3 rounded-full border flex items-center space-x-1.5 text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  chatIsOpen
                    ? 'bg-[#FFC799] text-[#101010] border-[#FFC799] font-bold'
                    : 'bg-[#161616] border-white/12 text-[#F5F5F5] hover:border-[#FFC799]/60'
                }`}
                title={
                  isStaffOrAdmin
                    ? 'Hộp thư Chat Khách hàng tại Chi nhánh (UC-66)'
                    : 'Trò chuyện trực tuyến với Chi nhánh (UC-44)'
                }
              >
                <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${chatIsOpen ? 'text-[#101010]' : 'text-[#FFC799]'}`} />
                <span className="hidden sm:inline">
                  {isStaffOrAdmin ? 'Chat Trạm' : 'Chat'}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    chatIsOpen ? 'bg-[#101010]' : 'bg-[#99FFE4]'
                  }`}
                />
                {chatUnread > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#FF8080] text-[#101010] font-mono text-[10px] font-black">
                    {chatUnread}
                  </span>
                )}
              </button>
            )}

            {/* Header Notification Bell & Popover */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifDropdownOpen((prev) => !prev);
                  setUserDropdownOpen(false);
                  window.dispatchEvent(new CustomEvent('motorent:close-chat'));
                }}
                className={`relative w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                  notifDropdownOpen
                    ? 'bg-[#FFC799] text-[#101010] border-[#FFC799]'
                    : 'bg-[#161616] border-white/12 text-[#F5F5F5] hover:border-[#FFC799]/60'
                }`}
                aria-label="Thông báo"
                title="Thông báo của bạn"
              >
                <Bell className="w-4 h-4" />
                {notifUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-[#FF8080] text-[#101010] font-mono text-[10px] font-black flex items-center justify-center">
                    {notifUnreadCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl bg-[#161616] border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden z-50">
                  <div className="px-4 py-3 bg-[#101010] border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-3.5 h-3.5 text-[#FFC799]" />
                      <span className="text-xs font-black uppercase tracking-wider text-[#F5F5F5]">
                        Thông báo hệ thống
                      </span>
                      {notifUnreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#FFC799]/20 text-[#FFC799] font-mono text-[10px] font-bold">
                          {notifUnreadCount} mới
                        </span>
                      )}
                    </div>

                    {isAuthenticated && notifUnreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllNotifsRead}
                        className="inline-flex items-center space-x-1 text-[11px] font-semibold text-[#FFC799] hover:underline cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Đọc tất cả</span>
                      </button>
                    )}
                  </div>

                  {!isAuthenticated ? (
                    <div className="p-6 text-center space-y-3">
                      <p className="text-xs text-[#A0A0A0]">
                        Đăng nhập để nhận thông báo trạng thái đơn thuê xe, xác nhận VietQR và tin nhắn hỗ trợ.
                      </p>
                      <Link
                        to="/login"
                        onClick={() => setNotifDropdownOpen(false)}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#FFC799] text-[#101010] font-bold text-xs"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Đăng nhập ngay</span>
                      </Link>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#6E6E6E]">
                      Bạn chưa có thông báo mới nào.
                    </div>
                  ) : (
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-white/[0.06]">
                      {notifications.map((notif) => (
                        <button
                          key={notif._id}
                          type="button"
                          onClick={() => handleMarkNotifRead(notif)}
                          className={`w-full p-3.5 text-left transition-colors flex items-start space-x-3 cursor-pointer ${
                            !notif.isRead ? 'bg-[#FFC799]/[0.06] hover:bg-[#FFC799]/10' : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              !notif.isRead ? 'bg-[#FFC799]' : 'bg-white/15'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-[#F5F5F5] truncate">
                                {notif.title}
                              </span>
                              <span className="text-[10px] font-mono text-[#6E6E6E] shrink-0">
                                {new Date(notif.createdAt).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#A0A0A0] mt-0.5 line-clamp-2 leading-relaxed">
                              {notif.body}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Profile Dropdown or Login Pill */}
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen(!userDropdownOpen);
                    setNotifDropdownOpen(false);
                    window.dispatchEvent(new CustomEvent('motorent:close-chat'));
                  }}
                  className="h-9 flex items-center space-x-2.5 pl-1.5 pr-3 rounded-full bg-[#161616] border border-white/12 text-[#F5F5F5] hover:border-[#FFC799]/60 transition-all text-xs font-medium cursor-pointer"
                >
                  {avatarSrc && !avatarLoadFailed ? (
                    <img
                      src={avatarSrc}
                      alt="Avatar"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={() => setAvatarLoadFailed(true)}
                      className="w-6 h-6 rounded-full object-cover border border-[#FFC799]/40 shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#FFC799] text-[#101010] flex items-center justify-center font-bold text-[10px] shrink-0">
                      {user.firstName ? user.firstName[0].toUpperCase() : user.username[0].toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[96px] truncate">{user.firstName || user.username}</span>
                  <ChevronDown className={`w-3 h-3 text-[#A0A0A0] transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2.5 w-72 rounded-2xl bg-[#161616] border border-white/15 shadow-2xl shadow-black p-2 text-xs space-y-1 z-50">
                    <div className="px-3 py-2.5 border-b border-white/10 mb-1 flex items-center space-x-2.5">
                      {avatarSrc && !avatarLoadFailed ? (
                        <img
                          src={avatarSrc}
                          alt="Avatar"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          className="w-8 h-8 rounded-full object-cover border border-[#FFC799]/40 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#FFC799] text-[#101010] flex items-center justify-center font-bold text-xs shrink-0">
                          {user.firstName ? user.firstName[0].toUpperCase() : user.username[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#F5F5F5] truncate">
                          {user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username}
                        </p>
                        <p className="text-[10px] text-[#FFC799] font-mono-tabular">
                          {roleLabelVi} ({user.roles})
                        </p>
                      </div>
                    </div>

                    {isStaffOrAdmin ? (
                      <>
                        {/* Staff / Manager / Admin Operational Menu */}
                        {['SystemAdmin', 'BranchManager'].includes(user.roles) && (
                          <Link
                            to="/manager/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-white/5"
                          >
                            <LayoutDashboard className="w-3.5 h-3.5 text-[#FFC799]" />
                            <span>Tổng quan đội xe</span>
                          </Link>
                        )}
                        {user.roles === 'SystemAdmin' && (
                          <Link
                            to="/admin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-white/5"
                          >
                            <Building2 className="w-3.5 h-3.5 text-[#FFC799]" />
                            <span>Trung tâm Quản trị Admin</span>
                          </Link>
                        )}
                        {user.roles === 'SystemAdmin' && (
                          <Link
                            to="/admin/categories"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-white/5"
                          >
                            <Compass className="w-3.5 h-3.5 text-[#FFC799]" />
                            <span>Danh mục xe · Admin</span>
                          </Link>
                        )}
                        {user.roles === 'SystemAdmin' && (
                          <Link
                            to="/admin/banners"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-white/5"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#FFC799]" />
                            <span>Quản lý Banner (UC-116)</span>
                          </Link>
                        )}
                        {user.roles === 'SystemAdmin' && (
                          <Link
                            to="/admin/pages"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-white/5"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#FFC799]" />
                            <span>Quản lý Trang tĩnh (UC-119)</span>
                          </Link>
                        )}
                        {['SystemAdmin', 'BranchManager'].includes(user.roles) && (
                          <Link
                            to="/manager/vehicles"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-white/5"
                          >
                            <Compass className="w-3.5 h-3.5 text-[#FFC799]" />
                            <span>Quản lý xe &amp; giá thuê</span>
                          </Link>
                        )}
                        <Link
                          to="/manager/fleet"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-white/5"
                        >
                          <FileCheck2 className="w-3.5 h-3.5 text-[#FFC799]" />
                          <span>{user.roles === 'Staff' ? 'Phiếu kỹ thuật & ODO' : 'Điều chuyển & bảo dưỡng'}</span>
                        </Link>
                        <Link
                          to="/counter?mode=bookings"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                          <span>Bàn giao xe &amp; Hợp đồng</span>
                        </Link>
                        <Link
                          to="/counter?mode=ekyc"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors"
                        >
                          <FileCheck2 className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                          <span>Xét duyệt hồ sơ eKYC</span>
                        </Link>
                        <Link
                          to="/counter?mode=chat"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="flex items-center space-x-2.5">
                            <MessageSquare className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                            <span>Tổng đài Live Chat (UC-66)</span>
                          </div>
                          {chatUnread > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-[#FF8080] text-[#101010] font-mono text-[10px] font-bold">
                              {chatUnread} mới
                            </span>
                          )}
                        </Link>
                        <Link
                          to={user?.roles === 'Staff' ? '/staff/complaints' : '/manager/complaints'}
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors"
                        >
                          <AlertCircle className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                          <span>{user?.roles === 'Staff' ? 'Xử lý Khiếu nại (UC-65)' : 'Kết luận Khiếu nại (UC-85)'}</span>
                        </Link>
                        <Link
                          to="/audit"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                          <span>Nhật ký Bảo mật Audit (UC-102)</span>
                        </Link>
                        <Link
                          to="/admin/rbac"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors"
                        >
                          <Lock className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                          <span>Ma trận Phân quyền (UC-99)</span>
                        </Link>

                        <div className="border-t border-white/10 pt-1.5 space-y-1">
                          <Link
                            to="/profile?tab=info"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors"
                          >
                            <UserIcon className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                            <span>Hồ sơ nhân sự &amp; Chỉnh sửa</span>
                          </Link>
                          <Link
                            to="/profile?tab=password"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors"
                          >
                            <Lock className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                            <span>Đổi mật khẩu bảo mật</span>
                          </Link>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Customer Menu */}
                        <Link
                          to="/wishlist"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <Heart className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                            <span className="truncate">Xe yêu thích</span>
                          </div>
                          {wishlistCount > 0 && (
                            <span className="text-[10px] text-[#FFC799] font-mono-tabular shrink-0 ml-2">
                              {wishlistCount} xe
                            </span>
                          )}
                        </Link>

                        <Link
                          to="/profile?tab=bookings"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <Compass className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                            <span className="truncate">Chuyến xe của tôi</span>
                          </div>
                          <span className="text-[10px] text-[#A0A0A0] font-mono-tabular shrink-0 ml-2">
                            {bookingCount} chuyến
                          </span>
                        </Link>

                        <Link
                          to="/profile?tab=loyalty"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <Sparkles className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                            <span className="truncate">Điểm &amp; ưu đãi thành viên</span>
                          </div>
                        </Link>

                        <Link
                          to="/complaints"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <ShieldAlert className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                            <span className="truncate">Khiếu nại &amp; Hỗ trợ</span>
                          </div>
                        </Link>

                        <Link
                          to="/profile?tab=info"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <UserIcon className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                            <span className="truncate">Thông tin cá nhân &amp; Chỉnh sửa</span>
                          </div>
                        </Link>

                        <Link
                          to="/profile?tab=avatar"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <Camera className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                            <span className="truncate">Đổi ảnh đại diện</span>
                          </div>
                          <span className="text-[10px] text-[#A0A0A0] font-mono-tabular shrink-0 ml-2">5MB</span>
                        </Link>

                        <Link
                          to="/profile?tab=ekyc"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <FileCheck2 className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                            <span className="truncate">Định danh điện tử (eKYC)</span>
                          </div>
                          {user.identityStatus === 'Verified' ? (
                            <span className="px-1.5 py-0.5 rounded bg-[#FFC799]/15 text-[#FFC799] font-medium text-[10px] shrink-0 ml-2">
                              Đã duyệt
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-[#FFC799]/15 text-[#FFC799] font-medium text-[10px] shrink-0 ml-2">
                              Cần làm
                            </span>
                          )}
                        </Link>

                        <Link
                          to="/profile?tab=password"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <Lock className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                            <span className="truncate">Đổi mật khẩu bảo mật</span>
                          </div>
                          <span className="text-[10px] text-[#A0A0A0] font-mono-tabular shrink-0 ml-2">≥ 8 ký tự</span>
                        </Link>
                      </>
                    )}

                    <div className="pt-1 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-[#FF8080] hover:bg-[#FF8080]/12 transition-colors cursor-pointer"
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
                className="group h-9 inline-flex items-center space-x-2 pl-4 pr-1.5 rounded-full bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] font-semibold text-xs transition-all active:scale-95 whitespace-nowrap shrink-0"
              >
                <span>Đăng nhập</span>
                <div className="w-6 h-6 rounded-full bg-[#101010] text-[#F5F5F5] flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-0.5">
                  <LogIn className="w-3 h-3" />
                </div>
              </Link>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-[#161616] transition-colors"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#FFC799]" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#101010]/95 backdrop-blur-3xl pt-24 px-6 flex flex-col justify-between pb-8 lg:hidden animate-in fade-in duration-200">
          <nav className="space-y-3">
            {navLinks.map((link) => {
              if (link.action) {
                return (
                  <button
                    key={link.path}
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      link.action?.();
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-[#FFC799]/20 text-sm font-bold text-white hover:border-[#FFC799]/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <span>{link.name}</span>
                      {link.isHot && (
                        <span className="px-1.5 py-0.5 text-[9px] font-mono-tabular uppercase tracking-wider bg-[#FFC799]/15 text-[#99FFE4] border border-[#FFC799]/25 rounded">
                          Mới
                        </span>
                      )}
                    </div>
                    <link.icon className="w-4 h-4 text-[#FFC799]" />
                  </button>
                );
              }
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-[#FFC799]/20 text-sm font-bold text-white hover:border-[#FFC799]/40 transition-colors"
                >
                  <span>{link.name}</span>
                  <link.icon className="w-4 h-4 text-[#FFC799]" />
                </Link>
              );
            })}
          </nav>

          <div className="space-y-4 pt-6 border-t border-[#FFC799]/20">
            {isAuthenticated && user && (
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-[#FFC799]/20 mb-2 space-y-3">
                <div className="flex items-center space-x-3">
                  {avatarSrc && !avatarLoadFailed ? (
                    <img
                      src={avatarSrc}
                      alt="Avatar"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-10 h-10 rounded-full object-cover border border-[#FFC799]/25 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#FFC799] text-[#101010] flex items-center justify-center font-black text-sm shrink-0">
                      {user.firstName ? user.firstName[0].toUpperCase() : user.username[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-bold text-white truncate text-xs">{user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username}</p>
                    <p className="text-[10px] text-[#FFC799] font-mono">{user.roles}</p>
                  </div>
                </div>

                {/* Profile quick links in mobile */}
                <div className="grid grid-cols-1 gap-1 pt-2 border-t border-[#FFC799]/20 text-xs">
                  <Link
                    to="/wishlist"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-white/5"
                  >
                    <div className="flex items-center space-x-2">
                      <Heart className="w-3.5 h-3.5 text-[#FFC799]" />
                      <span>Xe yêu thích</span>
                    </div>
                    {wishlistCount > 0 && (
                      <span className="text-[10px] text-[#FFC799] font-mono-tabular font-medium">
                        {wishlistCount} xe
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/profile?tab=bookings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-white/5"
                  >
                    <div className="flex items-center space-x-2">
                      <Compass className="w-3.5 h-3.5 text-[#FFC799]" />
                      <span>Chuyến xe của tôi</span>
                    </div>
                    <span className="text-[10px] text-[#6E6E6E] font-medium">{bookingCount} chuyến</span>
                  </Link>

                  <Link
                    to="/profile?tab=loyalty"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-white/5"
                  >
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#FFC799]" />
                      <span>Điểm &amp; ưu đãi thành viên</span>
                    </div>
                  </Link>

                  <Link
                    to="/complaints"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 p-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-white/5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-[#FFC799]" />
                    <span>Khiếu nại &amp; Hỗ trợ</span>
                  </Link>

                  <Link
                    to="/profile?tab=info"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 p-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-white/5"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#FFC799]" />
                    <span>Thông tin cá nhân &amp; Chỉnh sửa</span>
                  </Link>

                  <Link
                    to="/profile?tab=avatar"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-white/5"
                  >
                    <div className="flex items-center space-x-2">
                      <Camera className="w-3.5 h-3.5 text-[#FFC799]" />
                      <span>Đổi ảnh đại diện</span>
                    </div>
                    <span className="text-[10px] text-[#A0A0A0] font-medium">5MB</span>
                  </Link>

                  <Link
                    to="/profile?tab=ekyc"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-white/5"
                  >
                    <div className="flex items-center space-x-2">
                      <FileCheck2 className="w-3.5 h-3.5 text-[#FFC799]" />
                      <span>Định danh điện tử (eKYC)</span>
                    </div>
                    {user.identityStatus === 'Verified' ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#FFC799]/20 text-[#FFC799] font-bold text-[10px]">
                        Đã duyệt
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#FFC799]/12 text-[#FFC799] border border-[#FFC799]/30 font-bold text-[10px]">
                        Cần làm
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/profile?tab=password"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-2 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-white/5"
                  >
                    <div className="flex items-center space-x-2">
                      <Lock className="w-3.5 h-3.5 text-[#FFC799]" />
                      <span>Đổi mật khẩu bảo mật</span>
                    </div>
                    <span className="text-[10px] text-[#A0A0A0] font-medium">≥ 8 ký tự</span>
                  </Link>
                </div>
              </div>
            )}

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="w-full py-3 rounded-full bg-[#FF8080]/12 text-[#FF8080] font-bold text-xs border border-[#FF8080]/30"
              >
                Đăng xuất
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3.5 rounded-full bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-black/50"
              >
                <span>Đăng nhập hệ thống</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          INTERACTIVE MODAL 1: QUY TRÌNH THUÊ XE 04 BƯỚC & THỦ TỤC EKYC
          ===================================================================== */}
      {showProcedureModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowProcedureModal(false)}
        >
          <div
            className="bg-[#161616] rounded-2xl max-w-3xl w-full p-6 sm:p-8 border border-white/15 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="inline-flex items-center space-x-2 text-xs uppercase tracking-[0.16em] text-[#FFC799] font-semibold mb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Quy chuẩn giao nhận xe đô thị Đà Nẵng</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#F5F5F5] tracking-tight">
                  Quy trình thuê xe <span className="font-serif-display italic font-normal text-[#FFC799]">04 bước minh bạch.</span>
                </h3>
                <p className="text-xs text-[#A0A0A0] mt-1">
                  Nhận xe nhanh trong 03 phút • Định danh eKYC không giữ CCCD gốc • Trả xe khác trạm miễn phí
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProcedureModal(false)}
                className="p-2 rounded-xl bg-[#101010] border border-white/10 text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-white/25 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 4 Steps Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {PROCEDURE_STEPS.map((item) => (
                <div
                  key={item.step}
                  className="bg-[#101010] border border-white/10 hover:border-[#FFC799]/40 rounded-xl p-4 flex flex-col justify-between transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#FFC799]/15 border border-[#FFC799]/30 text-[#FFC799] font-mono-tabular font-bold text-xs">
                        BƯỚC {item.step}
                      </span>
                      <span className="inline-flex items-center space-x-1 text-[11px] font-mono-tabular text-[#A0A0A0]">
                        <Clock className="w-3 h-3 text-[#FFC799]" />
                        <span>{item.duration}</span>
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#F5F5F5] mb-1.5">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[#A0A0A0] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Required Documents & Deposit Highlight Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#101010] border border-white/10 rounded-xl p-3.5 text-xs">
              <div className="flex items-center space-x-2 text-[#F5F5F5]">
                <CheckCircle2 className="w-4 h-4 text-[#FFC799] shrink-0" />
                <span>Không giữ CCCD / Hộ chiếu gốc</span>
              </div>
              <div className="flex items-center space-x-2 text-[#F5F5F5]">
                <CheckCircle2 className="w-4 h-4 text-[#FFC799] shrink-0" />
                <span>Cọc 30% khóa biển số qua VNPay</span>
              </div>
              <div className="flex items-center space-x-2 text-[#F5F5F5]">
                <CheckCircle2 className="w-4 h-4 text-[#FFC799] shrink-0" />
                <span>Tặng kèm 02 mũ UV + 02 áo mưa</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleJumpToHomeProcedure}
                className="px-4 py-2.5 rounded-xl border border-white/10 bg-[#101010] text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-white/25 text-xs font-medium transition-colors cursor-pointer"
              >
                Xem mục Quy trình trên Trang chủ
              </button>

              <div className="flex items-center gap-2.5">
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProcedureModal(false);
                      navigate('/profile?tab=ekyc');
                    }}
                    className="px-4 py-2.5 rounded-xl border border-[#FFC799]/40 bg-[#FFC799]/10 text-[#FFC799] hover:bg-[#FFC799]/20 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Xác thực eKYC ngay
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowProcedureModal(false);
                    navigate('/bikes');
                  }}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>Chọn xe &amp; Đặt lịch ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          INTERACTIVE MODAL 2: KHO ƯU ĐÃI & VOUCHER TRỰC TUYẾN
          ===================================================================== */}
      {showPromoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowPromoModal(false)}
        >
          <div
            className="bg-[#161616] rounded-2xl max-w-2xl w-full p-6 sm:p-8 border border-white/15 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="inline-flex items-center space-x-2 text-xs uppercase tracking-[0.16em] text-[#FFC799] font-semibold mb-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Chương trình Ưu đãi Thuê xe Đà Nẵng</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#F5F5F5] tracking-tight">
                  Kho Voucher &amp; <span className="font-serif-display italic font-normal text-[#FFC799]">Đặc quyền trực tuyến.</span>
                </h3>
                <p className="text-xs text-[#A0A0A0] mt-1">
                  Sao chép mã hoặc nhấn &ldquo;Áp dụng &amp; Chọn xe&rdquo; để tự động kích hoạt ưu đãi khi đặt xe
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPromoModal(false)}
                className="p-2 rounded-xl bg-[#101010] border border-white/10 text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-white/25 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Voucher List */}
            <div className="space-y-3">
              {NAVBAR_PROMO_VOUCHERS.map((v) => {
                const isCopied = copiedCode === v.code;
                return (
                  <div
                    key={v.code}
                    className="bg-[#101010] border border-white/10 hover:border-[#FFC799]/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#FFC799]/15 border border-[#FFC799]/30 font-mono-tabular font-bold text-xs text-[#FFC799] flex items-center space-x-1">
                          <Tag className="w-3 h-3" />
                          <span>{v.code}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#FFC799]/15 border border-[#FFC799]/30 text-[11px] font-bold text-[#FFC799]">
                          {v.discountText}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-[#6E6E6E] font-semibold">
                          • {v.badge}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#F5F5F5]">
                        {v.title}
                      </h4>
                      <p className="text-xs text-[#A0A0A0]">
                        {v.condition}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-stretch gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyPromoCode(v.code)}
                        className="px-3.5 py-2 rounded-lg border border-white/10 bg-[#161616] hover:border-[#FFC799] text-xs font-medium text-[#F5F5F5] inline-flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#FFC799]" />
                            <span className="text-[#FFC799]">Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#FFC799]" />
                            <span>Sao chép mã</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyPromoVoucher(v.code)}
                        className="px-3.5 py-2 rounded-lg bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] text-xs font-semibold inline-flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <span>Áp dụng &amp; Chọn xe</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Note */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-[#A0A0A0]">
              <span>Ưu đãi tự động đính kèm vào phiếu đặt xe trực tuyến của bạn.</span>
              <button
                type="button"
                onClick={() => {
                  setShowPromoModal(false);
                  navigate('/bikes?promo=true');
                }}
                className="text-[#FFC799] hover:underline font-semibold cursor-pointer inline-flex items-center space-x-1"
              >
                <span>Mở toàn bộ đội xe</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#161616] rounded-3xl max-w-sm w-full p-6 border border-[#FFC799]/25 shadow-2xl text-center space-y-4">
            <h3 className="text-base font-bold text-white">Xác nhận đăng xuất?</h3>
            <p className="text-xs text-[#A0A0A0]">Phiên làm việc hiện tại sẽ kết thúc và token bảo mật sẽ được thu hồi an toàn.</p>
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-full bg-white/5 border border-[#FFC799]/20 text-[#A0A0A0] text-xs font-semibold hover:bg-white/10 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 py-2.5 rounded-full bg-[#FF8080] hover:bg-[#FF9999] text-[#101010] text-xs font-bold transition-colors"
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
