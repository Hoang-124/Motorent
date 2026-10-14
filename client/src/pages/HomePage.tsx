import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  MapPin, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  PhoneCall, 
  FileCheck2, 
  Wallet, 
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Compass,
  Gauge,
  Navigation,
  Check
} from 'lucide-react';
import { BookingWidget } from '../components/BookingWidget';
import { VehicleCard } from '../components/VehicleCard';
import type { Vehicle, Branch, Category } from '../types';
import { api } from '../services/api';

interface BookingSearchCriteria {
  pickupBranchId: string;
  returnBranchId: string;
  pickupDate: string;
  returnDate: string;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [branchesRes, vehiclesRes, categoriesRes] = await Promise.all([
        api.get('/branches'),
        api.get('/vehicles'),
        api.get('/categories'),
      ]);

      if (branchesRes.data?.data) {
        setBranches(branchesRes.data.data);
      }
      if (vehiclesRes.data?.data) {
        setVehicles(vehiclesRes.data.data);
      }
      if (categoriesRes.data?.data) {
        setCategories(categoriesRes.data.data);
      }
    } catch {
      setError('Không thể kết nối đến máy chủ để tải dữ liệu. Vui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredVehicles = vehicles.filter((v) => {
    if (selectedCategoryTab === 'all') return true;
    const catSlug = typeof v.category === 'object' && v.category !== null ? v.category.slug : v.category;
    return catSlug === selectedCategoryTab;
  });

  // Giới hạn 6 xe tiêu biểu trên Trang chủ để tránh quá tải thông tin cho người dùng
  const featuredVehicles = filteredVehicles.slice(0, 6);

  const handleBookingSearch = (criteria: BookingSearchCriteria) => {
    navigate(`/bikes?pickup=${criteria.pickupBranchId}&return=${criteria.returnBranchId}`);
  };

  const handleBookVehicle = (v: Vehicle) => {
    navigate(`/booking/${v._id}`);
  };

  const heroSpotlightBike = vehicles.find((v) => v.vehicleModel.includes('160') || v.vehicleModel.includes('SH') || v.status === 'Available') || vehicles[0];

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 antialiased selection:bg-orange-500 selection:text-white">
      
      {/* 1. HERO SECTION: GỌN GÀNG, SẮC NÉT, KHÔNG HỞ TRỐNG DƯ THỪA */}
      <section className="relative pt-6 pb-12 md:pt-10 md:pb-16 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.22),transparent_70%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Real-time Status Pill */}
          <div className="flex justify-center lg:justify-start mb-5">
            <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-orange-300 text-xs sm:text-sm font-bold tracking-wide backdrop-blur-xl shadow-lg">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-400" />
              </span>
              <span>ĐÀ NẴNG: {vehicles.length > 0 ? `${vehicles.length} XE CHÍNH HÃNG SẴN SÀNG` : 'HỆ THỐNG SẴN SÀNG'} • GA T2 & BIỂN MỸ KHÊ</span>
            </div>
          </div>

          {/* 2-Column Hero */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
                Đà Nẵng trên từng vòng tua.
                <br />
                <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent">
                  Thuê xe tự lái thế hệ mới.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                Đội xe chính hãng đời mới 2023 - 2024. Cọc 30% khóa đúng biển số riêng trên hệ thống. 
                Hợp đồng điện tử eKYC <strong>100% không giữ CCCD gốc</strong>. Nhận xe tại Sân bay Đà Nẵng, trả xe tự do tại Bãi biển Mỹ Khê phụ phí 0đ.
              </p>

              {/* Three Authentic Value Badges (Dữ liệu thật 100%) */}
              <div className="pt-1 flex flex-wrap justify-center lg:justify-start items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-200">
                <span className="flex items-center space-x-2 bg-white/[0.04] border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-sm">
                  <CheckCircle2 className="w-4 h-4 text-orange-400" />
                  <span>100% Xe chính hãng đời 2023 - 2024</span>
                </span>
                <span className="flex items-center space-x-2 bg-white/[0.04] border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-sm">
                  <FileCheck2 className="w-4 h-4 text-orange-400" />
                  <span>Không giữ CCCD bản gốc</span>
                </span>
                <span className="flex items-center space-x-2 bg-white/[0.04] border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-sm">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>Giao xe Sân Bay Quốc Tế 0đ</span>
                </span>
              </div>
            </div>

            {/* Right Column: Hero Spotlight Bike */}
            {heroSpotlightBike && (
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-md bg-[#111827] rounded-3xl border border-white/15 p-5 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Mẫu xe nổi bật hôm nay
                    </span>
                    <span className="text-xs text-slate-300 font-semibold flex items-center">
                      <MapPin className="w-3.5 h-3.5 text-orange-400 mr-1" />
                      {typeof heroSpotlightBike.branchId === 'object' ? heroSpotlightBike.branchId.name : 'Chi nhánh Sân Bay'}
                    </span>
                  </div>

                  {/* Bike Image */}
                  <div className="w-full h-44 bg-white rounded-2xl overflow-hidden flex items-center justify-center">
                    <img
                      src={heroSpotlightBike.images?.[1] || heroSpotlightBike.images?.[0]}
                      alt={heroSpotlightBike.vehicleModel}
                      className="w-full h-full object-contain scale-[1.38]"
                    />
                  </div>

                  <div className="flex items-end justify-between pt-1">
                    <div>
                      <h3 className="text-lg font-black text-white">{heroSpotlightBike.vehicleModel}</h3>
                      <div className="flex items-baseline space-x-1 mt-0.5">
                        <span className="text-2xl font-black text-white font-mono">
                          {heroSpotlightBike.dailyPrice.toLocaleString('vi-VN')}
                        </span>
                        <span className="text-xs font-bold text-slate-400">đ/ngày</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBookVehicle(heroSpotlightBike)}
                      className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-xs sm:text-sm transition-all active:scale-95 shadow-md shadow-orange-500/30 cursor-pointer"
                    >
                      <span>Đặt xe này ngay</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Floating Booking Hub */}
          <div className="mt-8 max-w-5xl mx-auto">
            <div className="p-2 sm:p-2.5 rounded-3xl bg-white/[0.05] backdrop-blur-2xl border border-white/15 shadow-xl shadow-black/60">
              <div className="rounded-2xl overflow-hidden">
                <BookingWidget branches={branches} onSearch={handleBookingSearch} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <section className="max-w-4xl mx-auto my-6 px-4">
          <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-2xl flex items-center justify-between text-xs sm:text-sm text-red-300">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
              <span className="font-semibold">{error}</span>
            </div>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold flex items-center space-x-1 hover:bg-red-500 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          </div>
        </section>
      )}

      {/* 2. THE MOTORENT STANDARD — 4 CAM KẾT VĂN MINH (SPACING TIGHTENED) */}
      <section className="py-12 md:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
        <div className="max-w-3xl mb-8">
          <span className="inline-flex items-center space-x-2 text-xs font-bold tracking-wider text-orange-400 bg-orange-950/60 border border-orange-500/30 px-3.5 py-1.5 rounded-full mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>Tiêu chuẩn Motorent</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            4 cam kết tạo nên trải nghiệm thuê xe văn minh, không rủi ro
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-400 font-normal leading-relaxed">
            Chúng tôi loại bỏ hoàn toàn các phiền toái kinh điển của dịch vụ thuê xe truyền thống: giữ giấy tờ tùy thân gốc, xe không đúng mẫu, tráo đổi biển số và phụ phí ẩn.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Bento 1: 7 Cols */}
          <div className="md:col-span-7 p-6 sm:p-8 rounded-[2rem] bg-[#111827] border border-white/10 hover:border-orange-500/50 shadow-xl transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Không giữ CCCD bản gốc. Đối soát số hóa trong 30 giây.
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg">
                Giấy tờ tùy thân gốc luôn nằm an toàn trong ví bạn khi tham gia giao thông. Nhân viên chỉ kiểm tra đối chiếu qua camera, mã hóa lưu trữ hồ sơ đám mây và xuất hợp đồng điện tử có chữ ký số ngay trên điện thoại.
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-bold text-orange-300">
              <span className="flex items-center space-x-1.5 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/5">
                <Check className="w-3.5 h-3.5 text-orange-400" />
                <span>Bảo mật dữ liệu cá nhân</span>
              </span>
              <span className="flex items-center space-x-1.5 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/5">
                <Check className="w-3.5 h-3.5 text-orange-400" />
                <span>Hợp đồng số hóa SMS/Email</span>
              </span>
            </div>
          </div>

          {/* Bento 2: 5 Cols */}
          <div className="md:col-span-5 p-6 sm:p-8 rounded-[2rem] bg-gradient-to-br from-[#111827] to-[#090E17] border border-white/10 hover:border-orange-500/50 text-white flex flex-col justify-between shadow-xl">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Nhận Ga Sân Bay — Trả Biển Mỹ Khê phụ phí 0đ
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Hạ cánh nhận xe ngay tại cổng Ga T2 sau 3 phút. Thoải mái trả xe tại phố biển Mỹ Khê mà không mất thêm bất kỳ đồng phí chuyển trạm nào.
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs sm:text-sm text-orange-300">
              <span className="font-semibold text-orange-300">Sân Bay ⇆ Bãi Biển Mỹ Khê</span>
              <span className="font-bold text-white px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">0đ phụ phí</span>
            </div>

          </div>

          {/* Bento 3: 6 Cols */}
          <div className="md:col-span-6 p-6 sm:p-8 rounded-[2rem] bg-[#111827] border border-white/10 hover:border-orange-500/50 shadow-xl transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Cọc giữ xe 30% minh bạch — Khóa đúng biển số riêng
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Hệ thống tự động liên kết cọc trực tiếp với từng biển số xe thực tế trong kho. 100% không lo bị tráo đổi dòng xe. Hoàn tiền cọc 100% nếu thông báo hủy trước 24 giờ nhận xe.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs sm:text-sm">
              <span className="font-bold text-orange-400">70% còn lại tất toán khi nhận bàn giao xe</span>
              <span className="font-semibold text-slate-300">Hoàn cọc 24h</span>
            </div>
          </div>

          {/* Bento 4: 6 Cols */}
          <div className="md:col-span-6 p-6 sm:p-8 rounded-[2rem] bg-[#111827] border border-white/10 hover:border-orange-500/50 shadow-xl transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Gói phụ kiện SafeRide & Cứu hộ 24/7 toàn Đà Nẵng
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Mỗi xe bàn giao luôn đi kèm: 02 mũ bảo hiểm 3/4 tiệt trùng tia UV khử khuẩn, 02 áo mưa dẻo dai và giá đỡ điện thoại nhôm chống rung OIS cho camera.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center space-x-4 text-xs sm:text-sm text-orange-300 font-bold">
              <span className="flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1 text-orange-400" />
                Mũ 3/4 UV & Áo mưa
              </span>
              <span className="flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1 text-orange-400" />
                Giá nhôm OIS & Cứu hộ 24/7
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DÒNG XE TIÊU BIỂU TRÊN TRANG CHỦ (GIỚI HẠN 6 XE - TRÁNH QUÁ TẢI THÔNG TIN) */}
      <section className="py-12 md:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span className="inline-flex items-center space-x-2 text-xs font-bold tracking-wider text-orange-400 bg-orange-950/60 border border-orange-500/30 px-3.5 py-1.5 rounded-full mb-2.5">
              <Gauge className="w-3.5 h-3.5 text-orange-400" />
              <span>Dòng xe được yêu thích nhất</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Mẫu xe tiêu biểu sẵn sàng bàn giao
            </h2>
          </div>

          <Link
            to="/bikes"
            className="group inline-flex items-center space-x-2 pl-5 pr-2 py-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-xs sm:text-sm transition-all active:scale-95 shadow-md shadow-orange-500/30 self-start md:self-auto"
          >
            <span>Xem toàn bộ {vehicles.length > 0 ? `${vehicles.length} xe trong đội xe` : 'đội xe'}</span>
            <div className="w-7 h-7 rounded-full bg-black/30 text-white flex items-center justify-center transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <button
            onClick={() => setSelectedCategoryTab('all')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedCategoryTab === 'all'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                : 'bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.08]'
            }`}
          >
            Tất cả mẫu ({vehicles.length})
          </button>
          {categories.map((cat) => {
            const count = vehicles.filter((v) => {
              const catSlug = typeof v.category === 'object' && v.category !== null ? v.category.slug : v.category;
              return catSlug === cat.slug;
            }).length;

            return (
              <button
                key={cat._id}
                onClick={() => setSelectedCategoryTab(cat.slug)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  selectedCategoryTab === cat.slug
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                    : 'bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.08]'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* 6 Featured Vehicles Grid */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm font-medium">
            Đang tải dữ liệu đội xe thực tế...
          </div>
        ) : featuredVehicles.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            Hiện chưa có mẫu xe nào sẵn sàng thuộc danh mục này.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle._id}
                vehicle={vehicle}
                onBookNow={handleBookVehicle}
              />
            ))}
          </div>
        )}

        {/* View All CTA Button */}
        {vehicles.length > 6 && (
          <div className="mt-10 text-center">
            <Link
              to="/bikes"
              className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-full bg-white/[0.05] hover:bg-gradient-to-r hover:from-orange-500 hover:to-amber-500 hover:text-white text-white border border-white/15 hover:border-orange-500/50 font-black text-sm transition-all shadow-xl group"
            >
              <span>Khám phá toàn bộ {vehicles.length} mẫu xe & bộ lọc chi tiết</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </section>

      {/* 4. DA NANG SCENIC ROUTES */}
      <section className="py-12 md:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center space-x-2 text-xs font-bold tracking-wider text-orange-400 bg-orange-950/60 border border-orange-500/30 px-3.5 py-1.5 rounded-full mb-2.5">
            <Compass className="w-3.5 h-3.5 text-orange-400" />
            <span>Cẩm nang hải trình</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            3 cung đường tuyệt đẹp nhất định phải lái xe tại Đà Nẵng
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-400 font-normal">
            Những góc nhìn tuyệt mỹ từ cung đèo hiểm trở đến dải cát trắng mịn bên bờ biển Thái Bình Dương.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Route 1: Hải Vân Pass */}
          <div className="p-6 sm:p-7 rounded-[2rem] bg-[#111827] border border-white/10 hover:border-orange-500/50 shadow-xl transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                <span>Cung đường đèo dốc</span>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30 text-xs font-bold">21 km • 8-10% dốc</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Đèo Hải Vân & Vịnh Lăng Cô
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Mệnh danh "Thiên hạ đệ nhất hùng quan". Chinh phục 21km đèo uốn lượn ôm trọn bờ biển, săn mây tại Hải Vân Quan và thưởng thức hải sản tại đầm Lập An.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-xs sm:text-sm text-orange-400 font-bold flex items-center justify-between">
              <span>Gợi ý: Air Blade 160 hoặc Exciter</span>
              <Navigation className="w-4 h-4" />
            </div>
          </div>

          {/* Route 2: Bán đảo Sơn Trà */}
          <div className="p-6 sm:p-7 rounded-[2rem] bg-[#111827] border border-white/10 hover:border-orange-500/50 shadow-xl transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                <span>Rừng nguyên sinh ven biển</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold">35 km • Cảnh quan đẹp</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Bán Đảo Sơn Trà & Đỉnh Bàn Cờ
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Cung đường vi vu đón gió đại dương, ngắm chùa Linh Ứng uy nghiêm, cây đa ngàn năm tuổi và cơ hội ngắm nhìn voọc chà vá chân nâu quý hiếm.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-xs sm:text-sm text-orange-400 font-bold flex items-center justify-between">
              <span>Gợi ý: Dòng xe số hoặc xe ga bánh lớn</span>
              <Navigation className="w-4 h-4" />
            </div>
          </div>

          {/* Route 3: Mỹ Khê - Hội An */}
          <div className="p-6 sm:p-7 rounded-[2rem] bg-[#111827] border border-white/10 hover:border-orange-500/50 shadow-xl transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                <span>Đường biển thẳng tắp</span>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30 text-xs font-bold">30 km • Cực kỳ êm ái</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Biển Mỹ Khê — Phố Cổ Hội An
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Đường bờ biển nối liền Đà Nẵng và Quảng Nam. Dễ dàng ghé thăm danh thắng Ngũ Hành Sơn, đón hoàng hôn trên sông Hoài và dạo chơi chợ đêm lồng đèn.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-xs sm:text-sm text-orange-400 font-bold flex items-center justify-between">
              <span>Gợi ý: Vision, Lead hoặc Grande</span>
              <Navigation className="w-4 h-4" />
            </div>
          </div>
        </div>
      </section>

      {/* 5. MẠNG LƯỚI CHI NHÁNH THỰC TẾ (3 TRẠM TẠI ĐÀ NẴNG) */}
      <section className="py-12 md:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center space-x-2 text-xs font-bold tracking-wider text-orange-400 bg-orange-950/60 border border-orange-500/30 px-3.5 py-1.5 rounded-full mb-2.5">
            <MapPin className="w-3.5 h-3.5 text-orange-400" />
            <span>Hạ tầng trực thuộc</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Mạng lưới {branches.length} chi nhánh nhận & trả xe tại Đà Nẵng
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 font-normal">
            Cửa hàng mặt tiền lớn, gần sân bay và bãi biển, hỗ trợ giao nhận xe linh hoạt giữa các trạm phụ phí 0đ.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {branches.map((branch, index) => (
            <div
              key={branch._id}
              className="bg-[#111827] rounded-[2rem] border border-white/10 p-6 sm:p-7 flex flex-col justify-between hover:border-orange-500/50 transition-colors shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-500/15 text-orange-300 border border-orange-500/30">
                    Trạm cơ sở 0{index + 1}
                  </span>
                  <span className="text-xs sm:text-sm text-orange-400 font-semibold flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {branch.hours_open} - {branch.hours_close}
                  </span>
                </div>

                <h3 className="text-lg font-black text-white mb-2">
                  {branch.name}
                </h3>

                <p className="text-xs sm:text-sm text-slate-300 mb-3 flex items-start space-x-2 leading-relaxed">
                  <MapPin className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                  <span>{branch.address}</span>
                </p>

                <p className="text-xs text-slate-400 italic mb-4">
                  {branch.description || 'Đội ngũ kỹ thuật viên trực tại quầy 24/7, xe luôn sẵn sàng bàn giao'}
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <a
                  href={`tel:${branch.phone}`}
                  className="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-orange-400 hover:text-orange-300 transition-colors"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>{branch.phone}</span>
                </a>

                <Link
                  to={`/bikes?pickup=${branch._id}`}
                  className="text-xs sm:text-sm font-bold text-slate-300 hover:text-white flex items-center group"
                >
                  <span>Xem xe tại trạm</span>
                  <ChevronRight className="w-4 h-4 ml-0.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. QUY TRÌNH 3 BƯỚC SIÊU TỐC (DẢI BĂNG NGANG TINH GỌN, KHÔNG CHIẾM DỌC) */}
      <section id="procedure" className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
        <div className="p-6 sm:p-7 rounded-[2rem] bg-[#111827] border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">Quy trình nhận xe 3 phút siêu tốc</h3>
                <p className="text-xs text-slate-400">Đơn giản, minh bạch và hoàn toàn tự động hóa</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-black flex items-center justify-center">
                1
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Chọn xe & cọc 30%</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Chọn xe, ngày giờ và trạm nhận. Cọc 30% qua VietQR để tự động khóa đúng biển số riêng.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-black flex items-center justify-center">
                2
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Đối soát eKYC & Ký số</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Quét đối chiếu CCCD/GPLX trong 30 giây và ký hợp đồng điện tử (không giữ giấy tờ gốc).
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-black flex items-center justify-center">
                3
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Nhận xe vi vu Đà Nẵng</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Bàn giao xe kèm 2 mũ bảo hiểm UV, 2 áo mưa, giá nhôm OIS và hỗ trợ cứu hộ 24/7.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PRE-FOOTER CONVERSION CTA BANNER (LIỀN MẠCH, GỌN GÀNG) */}
      <section className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 md:p-8 rounded-[2rem] bg-gradient-to-r from-[#111827] via-[#1f293d] to-[#0d1527] text-white border border-orange-500/30 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="max-w-xl space-y-1.5 text-center md:text-left">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
              Sẵn sàng cho chuyến du ngoạn Đà Nẵng?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Đặt giữ xe trực tuyến ngay hôm nay để nhận ưu đãi cọc 30% giữ đúng biển số xe riêng không tăng giá dịp cao điểm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="tel:02363822101"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-xs sm:text-sm transition-colors"
            >
              <PhoneCall className="w-4 h-4 text-orange-400" />
              <span>Hotline 0236.3822.101</span>
            </a>

            <Link
              to="/bikes"
              className="group inline-flex items-center space-x-2 pl-5 pr-2 py-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-xs sm:text-sm transition-all active:scale-95 shadow-lg shadow-orange-500/30"
            >
              <span>Xem toàn bộ đội xe</span>
              <div className="w-7 h-7 rounded-full bg-black/30 text-white flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
