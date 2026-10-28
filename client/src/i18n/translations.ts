export type SupportedLocale = 'vi' | 'en';

export type I18nNamespace = 'nav' | 'home' | 'footer' | 'common' | 'admin';

export interface I18nCatalogEntry {
  key: TranslationKey;
  namespace: I18nNamespace;
  label: string;
}

export const VI_TRANSLATIONS = {
  // Navigation & Header
  'nav.brandSubtitle': 'Đà Nẵng',
  'nav.home': 'Trang chủ',
  'nav.fleetPricing': 'Đội xe & Bảng giá',
  'nav.branches': 'Chi nhánh',
  'nav.procedure': 'Quy trình',
  'nav.offers': 'Ưu đãi',
  'nav.newBadge': 'Mới',
  'nav.counterBookings': 'Bàn giao & Hợp đồng',
  'nav.counterEkyc': 'Duyệt eKYC',
  'nav.adminCenter': 'Quản trị Admin',
  'nav.auditLog': 'Nhật ký Audit',
  'nav.reports': 'Báo cáo',
  'nav.fleetShort': 'Đội xe',
  'nav.myTrips': 'Chuyến của tôi',
  'nav.quickBook': 'Chọn xe nhanh',
  'nav.wishlist': 'Xe yêu thích',
  'nav.chat': 'Chat',
  'nav.chatStation': 'Chat Trạm',
  'nav.notifications': 'Thông báo',
  'nav.markAllRead': 'Đọc tất cả',
  'nav.filterAll': 'Tất cả',
  'nav.filterUnread': 'Chưa đọc',
  'nav.clearRead': 'Xóa đã đọc',
  'nav.noUnreadNotifs': 'Bạn đã đọc hết mọi thông báo',
  'nav.noNotifs': 'Chưa có thông báo nào',
  'nav.notifSubtext': 'Mọi cập nhật mới về chuyến xe và định danh sẽ xuất hiện tại đây.',
  'nav.notifLoginPrompt': 'Đăng nhập để theo dõi trạng thái hợp đồng thuê xe, thanh toán VNPay và tin nhắn hỗ trợ trực tuyến.',
  'nav.loginNow': 'Đăng nhập ngay',
  'nav.login': 'Đăng nhập',
  'nav.loginSystem': 'Đăng nhập hệ thống',
  'nav.logout': 'Đăng xuất',
  'nav.themeLabel': 'Chế độ hiển thị',
  'nav.themeLight': 'Sáng',
  'nav.themeDark': 'Tối',
  'nav.languageLabel': 'Ngôn ngữ hiển thị',
  'nav.profileInfo': 'Thông tin cá nhân & Chỉnh sửa',
  'nav.changeAvatar': 'Đổi ảnh đại diện',
  'nav.ekycMenu': 'Định danh điện tử (eKYC)',
  'nav.changePassword': 'Đổi mật khẩu bảo mật',
  'nav.complaintsSupport': 'Khiếu nại & Hỗ trợ',
  'nav.i18nAdminLink': 'Đa ngôn ngữ i18n (UC-122)',
  'nav.roleAdmin': 'Quản trị Hệ thống',
  'nav.roleManager': 'Quản lý Chi nhánh',
  'nav.roleStaff': 'Nhân viên Điều phối',
  'nav.roleCustomer': 'Khách hàng',

  // Home Page Hero & Featured Lines
  'home.heroBadge': 'Thuê Xe Máy Tự Lái Đô Thị & Du Lịch Đà Nẵng',
  'home.heroTitleMain': 'Dạo phố nhẹ nhàng,',
  'home.heroTitleAccent': 'lắng nghe nhịp sống Đà Nẵng.',
  'home.heroDescription': 'Từ những buổi sáng cà phê trung tâm Hải Châu, chiều lướt gió dọc đại lộ biển Mỹ Khê cho đến những chuyến vi vu phố cổ Hội An cuối tuần — Motorent mang đến dàn xe tay ga, xe điện và xe số đời mới êm ái, cốp rộng, tiết kiệm nhiên liệu để bạn tự do di chuyển khắp thành phố.',
  'home.featuredHeading': 'Các dòng xe chủ lực đi phố & dạo biển',
  'home.viewAllVehicles': 'Xem tất cả dòng xe',
  'home.lineScooterTitle': 'Xe Tay Ga Đi Phố',
  'home.lineScooterHighlight': 'Cốp rộng • Tự động êm ái',
  'home.lineElectricTitle': 'Xe Máy Điện Đô Thị',
  'home.lineElectricHighlight': 'Lướt êm • ~198km/sạc',
  'home.lineGearTitle': 'Xe Số & Côn Tay',
  'home.lineGearHighlight': 'Gọn nhẹ • 1.6L/100km',
  'home.perDaySuffix': 'đ/ngày',

  // Footer
  'footer.mastheadBadge': 'Dịch Vụ Thuê Xe Máy Đô Thị & Du Lịch Đà Nẵng',
  'footer.mastheadTitle': 'Mỗi chiếc xe rời trạm là một hành trình',
  'footer.mastheadAccent': 'dạo phố êm ái và an tâm.',
  'footer.hotlineLabel': 'Tổng đài điều phối:',
  'footer.faqButton': 'Cẩm nang & Câu hỏi thường gặp',
  'footer.colFleet': 'Danh mục xe',
  'footer.allFleet': 'Toàn bộ đội xe',
  'footer.colPolicy': 'Chuẩn mực phục vụ & Chính sách',
  'footer.rentalPolicy': 'Chính sách thuê xe',
  'footer.faqLink': 'Giải đáp thủ tục & Câu hỏi thường gặp (FAQ)',
  'footer.termsLink': 'Điều khoản dịch vụ & Hợp đồng điện tử',
  'footer.privacyLink': 'Chính sách bảo mật thông tin & eKYC',
  'footer.colStations': 'Trạm giao nhận tại Đà Nẵng',
  'footer.copyright': '© 2026 Motorent Đà Nẵng. Chế tác dành riêng cho những hành trình tự lái tử tế.',
  'footer.stationMap': 'Bản đồ trạm',

  // Common & Admin
  'common.loading': 'Đang tải trang…',
  'common.save': 'Lưu thay đổi',
  'common.reset': 'Khôi phục mặc định',
  'common.search': 'Tìm kiếm…',
  'admin.centerTitle': 'Trung Tâm Điều Hành',
  'admin.tabI18n': 'Đa ngôn ngữ (UC-122)',
} as const;

export type TranslationKey = keyof typeof VI_TRANSLATIONS;

export const EN_TRANSLATIONS: Record<TranslationKey, string> = {
  // Navigation & Header
  'nav.brandSubtitle': 'Da Nang',
  'nav.home': 'Home',
  'nav.fleetPricing': 'Fleet & Pricing',
  'nav.branches': 'Stations',
  'nav.procedure': 'How It Works',
  'nav.offers': 'Offers',
  'nav.newBadge': 'New',
  'nav.counterBookings': 'Handover & Contracts',
  'nav.counterEkyc': 'eKYC Review',
  'nav.adminCenter': 'Admin Center',
  'nav.auditLog': 'Audit Logs',
  'nav.reports': 'Reports',
  'nav.fleetShort': 'Fleet',
  'nav.myTrips': 'My Trips',
  'nav.quickBook': 'Quick Book',
  'nav.wishlist': 'Saved Bikes',
  'nav.chat': 'Chat',
  'nav.chatStation': 'Station Chat',
  'nav.notifications': 'Notifications',
  'nav.markAllRead': 'Mark all read',
  'nav.filterAll': 'All',
  'nav.filterUnread': 'Unread',
  'nav.clearRead': 'Clear read',
  'nav.noUnreadNotifs': 'You are all caught up',
  'nav.noNotifs': 'No notifications yet',
  'nav.notifSubtext': 'Real-time booking, payment, and eKYC updates will appear here.',
  'nav.notifLoginPrompt': 'Sign in to track rental contracts, VNPay payments, and live station support.',
  'nav.loginNow': 'Sign in now',
  'nav.login': 'Sign In',
  'nav.loginSystem': 'Sign In to Motorent',
  'nav.logout': 'Sign Out',
  'nav.themeLabel': 'Appearance',
  'nav.themeLight': 'Light',
  'nav.themeDark': 'Dark',
  'nav.languageLabel': 'Language',
  'nav.profileInfo': 'Personal Profile & Settings',
  'nav.changeAvatar': 'Update Profile Photo',
  'nav.ekycMenu': 'Digital Identity (eKYC)',
  'nav.changePassword': 'Change Security Password',
  'nav.complaintsSupport': 'Support & Claims',
  'nav.i18nAdminLink': 'Multi-language i18n (UC-122)',
  'nav.roleAdmin': 'System Administrator',
  'nav.roleManager': 'Branch Manager',
  'nav.roleStaff': 'Station Coordinator',
  'nav.roleCustomer': 'Customer',

  // Home Page Hero & Featured Lines
  'home.heroBadge': 'Urban & Coastal Self-Drive Motorbike Rental in Da Nang',
  'home.heroTitleMain': 'Glide through the city,',
  'home.heroTitleAccent': 'feel the rhythm of Da Nang.',
  'home.heroDescription': 'From morning specialty coffee in Hai Chau, breezy afternoon rides along My Khe Beach Boulevard, to weekend escapes to Hoi An Ancient Town — Motorent delivers late-model automatic scooters, electric bikes, and fuel-efficient commuters inspected before every ride.',
  'home.featuredHeading': 'Signature Urban & Coastal Fleet Lines',
  'home.viewAllVehicles': 'Explore full fleet',
  'home.lineScooterTitle': 'Urban Automatic Scooters',
  'home.lineScooterHighlight': 'Spacious trunk • Smooth CVT',
  'home.lineElectricTitle': 'Urban Electric Scooters',
  'home.lineElectricHighlight': 'Whisper-quiet • ~198km/charge',
  'home.lineGearTitle': 'Semi-Auto & Manual Bikes',
  'home.lineGearHighlight': 'Agile • 1.6L/100km economy',
  'home.perDaySuffix': '₫/day',

  // Footer
  'footer.mastheadBadge': 'Urban & Coastal Motorbike Rental Service — Da Nang',
  'footer.mastheadTitle': 'Every bike leaving our station begins',
  'footer.mastheadAccent': 'a smooth, worry-free journey.',
  'footer.hotlineLabel': 'Dispatch Hotline:',
  'footer.faqButton': 'Rider Guide & FAQ',
  'footer.colFleet': 'Vehicle Collection',
  'footer.allFleet': 'Browse Entire Fleet',
  'footer.colPolicy': 'Service Standards & Policies',
  'footer.rentalPolicy': 'Rental Policy',
  'footer.faqLink': 'Procedures & Frequently Asked Questions (FAQ)',
  'footer.termsLink': 'Terms of Service & Digital Contract',
  'footer.privacyLink': 'Privacy Policy & eKYC Data Vault',
  'footer.colStations': 'Pickup Stations in Da Nang',
  'footer.copyright': '© 2026 Motorent Da Nang. Crafted for thoughtful self-drive journeys.',
  'footer.stationMap': 'Station Map',

  // Common & Admin
  'common.loading': 'Loading page…',
  'common.save': 'Save Changes',
  'common.reset': 'Reset Defaults',
  'common.search': 'Search…',
  'admin.centerTitle': 'Operations Command',
  'admin.tabI18n': 'Multi-lang i18n (UC-122)',
};

export const DEFAULT_TRANSLATIONS: Record<SupportedLocale, Record<TranslationKey, string>> = {
  vi: VI_TRANSLATIONS,
  en: EN_TRANSLATIONS,
};

const inferNamespace = (key: TranslationKey): I18nNamespace => {
  const prefix = key.split('.')[0];
  if (prefix === 'nav' || prefix === 'home' || prefix === 'footer' || prefix === 'admin') {
    return prefix;
  }
  return 'common';
};

export const I18N_KEY_CATALOG: I18nCatalogEntry[] = (
  Object.keys(VI_TRANSLATIONS) as TranslationKey[]
).map((key) => ({
  key,
  namespace: inferNamespace(key),
  label: VI_TRANSLATIONS[key],
}));
