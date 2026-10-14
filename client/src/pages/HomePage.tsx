import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Mountain,
  Trees,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  PhoneCall,
  Check,
  Calendar,
  Clock,
  Navigation
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

  // Giới hạn 6 xe tiêu biểu
  const featuredVehicles = filteredVehicles.slice(0, 6);

  const handleBookingSearch = (criteria: BookingSearchCriteria) => {
    navigate(`/bikes?pickup=${criteria.pickupBranchId}&return=${criteria.returnBranchId}`);
  };

  const handleBookVehicle = (v: Vehicle) => {
    navigate(`/booking/${v._id}`);
  };

  return (
    <div className="min-h-screen bg-[#07100D] text-slate-100 antialiased selection:bg-emerald-500 selection:text-[#07100D]">

      {/* =========================================================================
          1. HERO SECTION: ĐĨNH ĐẠC, CHUẨN MỰC, TẬP TRUNG TRẢI NGHIỆM ĐẶT XE
          ========================================================================= */}
      <section className="relative pt-10 pb-16 md:pt-16 md:pb-24 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Editorial Kicker & Title */}
          <div className="max-w-3xl space-y-4 mb-10">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>MOTORENT • CHUỖI CHO THUÊ XE MÁY ĐÀ NẴNG</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
              Thuê xe máy tại Đà Nẵng.
              <br />
              <span className="text-emerald-400">
                Tự do khám phá từng cung đèo đại ngàn.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-2xl">
              100% xe chính hãng đời 2023 - 2024 được kiểm định kỹ thuật khắt khe. Giao nhận xe tận nơi 
              tại Sân bay Quốc tế Đà Nẵng (Ga T1 & T2), bãi biển Mỹ Khê và khách sạn trung tâm. 
              Hợp đồng số hóa eKYC — <strong className="text-white font-semibold">100% không giữ CCCD bản gốc</strong>.
            </p>
          </div>

          {/* High-Utility Booking Widget */}
          <div className="max-w-5xl">
            <BookingWidget branches={branches} onSearch={handleBookingSearch} />
          </div>

          {/* Minimalist Trust Metrics Bar */}
          <div className="mt-12 pt-8 border-t border-white/[0.06] grid grid-cols-2 md:grid-cols-4 gap-6 text-xs text-slate-300">
            <div className="space-y-1">
              <div className="text-slate-400 font-medium">Mạng lưới cơ sở</div>
              <div className="text-sm font-bold text-white">3 Chi nhánh tại Đà Nẵng</div>
              <p className="text-[11px] text-slate-400">Sân bay, Sơn Trà & Mỹ Khê</p>
            </div>

            <div className="space-y-1">
              <div className="text-slate-400 font-medium">Chất lượng đội xe</div>
              <div className="text-sm font-bold text-white">100% Xe đời 2023 - 2024</div>
              <p className="text-[11px] text-slate-400">Bảo dưỡng sau mỗi 1.500 km</p>
            </div>

            <div className="space-y-1">
              <div className="text-slate-400 font-medium">Thủ tục văn minh</div>
              <div className="text-sm font-bold text-white">Không giữ CCCD gốc</div>
              <p className="text-[11px] text-slate-400">Đối soát số hóa eKYC trong 30s</p>
            </div>

            <div className="space-y-1">
              <div className="text-slate-400 font-medium">Bảo chứng hành trình</div>
              <div className="text-sm font-bold text-white">Cứu hộ tận nơi 24/7</div>
              <p className="text-[11px] text-slate-400">Đổi xe trong 30-45 phút nếu sự cố</p>
            </div>
          </div>

        </div>
      </section>

      {/* Error Notice */}
      {error && (
        <section className="max-w-4xl mx-auto my-6 px-4">
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs sm:text-sm text-emerald-200">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <span className="font-medium">{error}</span>
            </div>
            <button
              onClick={fetchData}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          </div>
        </section>
      )}

      {/* =========================================================================
          2. SECTION: BẢNG GIÁ & ĐỘI XE TUYỂN CHỌN
          ========================================================================= */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-2">
              ĐỘI XE CHÍNH HÃNG
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Chọn xe phù hợp với lộ trình của bạn
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl">
              Từ xe tay ga êm ái dạo phố biển Mỹ Khê đến xe côn tay thể thao chuyên vượt dốc đèo Hải Vân và đỉnh Bàn Cờ.
            </p>
          </div>

          <Link
            to="/bikes"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <span>Xem tất cả {vehicles.length} xe</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 mb-8 pb-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategoryTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategoryTab === 'all'
                ? 'bg-emerald-500 text-[#07100D] font-bold shadow-sm'
                : 'bg-[#0D1C16] text-slate-300 border border-white/10 hover:border-emerald-500/30 hover:text-white'
            }`}
          >
            Tất cả xe ({vehicles.length})
          </button>

          {categories.map((cat) => {
            const active = selectedCategoryTab === cat.slug;
            return (
              <button
                key={cat._id}
                onClick={() => setSelectedCategoryTab(cat.slug)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-emerald-500 text-[#07100D] font-bold shadow-sm'
                    : 'bg-[#0D1C16] text-slate-300 border border-white/10 hover:border-emerald-500/30 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Vehicles Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-400 mb-3" />
            <p className="text-xs text-slate-400 font-medium">Đang tải danh sách xe sẵn sàng...</p>
          </div>
        ) : featuredVehicles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle._id}
                vehicle={vehicle}
                onBookNow={handleBookVehicle}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center rounded-2xl bg-[#0D1C16] border border-white/10 p-8">
            <p className="text-slate-300 font-medium text-sm">Chưa có xe thuộc danh mục này tại Đà Nẵng.</p>
            <button
              onClick={() => setSelectedCategoryTab('all')}
              className="mt-3 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition-colors"
            >
              Xem tất cả xe
            </button>
          </div>
        )}

        {/* View All CTA */}
        <div className="mt-10 text-center">
          <Link
            to="/bikes"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-[#0D1C16] hover:bg-[#12241D] border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-300 font-semibold text-xs sm:text-sm transition-all"
          >
            <span>Khám phá toàn bộ {vehicles.length} xe & bảng giá chi tiết</span>
            <ArrowRight className="w-4 h-4 stroke-[2]" />
          </Link>
        </div>
      </section>

      {/* =========================================================================
          3. SECTION: SỰ KHÁC BIỆT CỦA MOTORENT (4 CAM KẾT VĂN MINH)
          ========================================================================= */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
        <div className="max-w-3xl mb-12">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-2">
            TIÊU CHUẨN DỊCH VỤ
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Vì sao khách hàng tin chọn Motorent tại Đà Nẵng?
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            Chúng tôi loại bỏ hoàn toàn các phiền toái kinh điển của dịch vụ thuê xe truyền thống: 
            giữ giấy tờ gốc, tráo đổi biển số xe, và thiếu hỗ trợ khi gặp sự cố trên đường.
          </p>
        </div>

        {/* 4-Column Structured Index */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          <div className="p-6 rounded-2xl bg-[#0D1C16] border border-white/[0.08] flex flex-col justify-between space-y-4">
            <div>
              <div className="text-emerald-400 font-mono text-sm font-bold mb-3">01</div>
              <h3 className="text-base font-bold text-white mb-2">
                Không giữ CCCD bản gốc
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Đối soát danh tính số hóa qua eKYC trên điện thoại chỉ trong 30 giây. Bạn giữ trọn vẹn giấy tờ tùy thân để tự do làm thủ tục khách sạn và vé máy bay.
              </p>
            </div>
            <div className="pt-3 border-t border-white/[0.06] text-[11px] text-emerald-400 font-medium flex items-center">
              <Check className="w-3.5 h-3.5 mr-1" />
              <span>Bảo mật dữ liệu cá nhân</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#0D1C16] border border-white/[0.08] flex flex-col justify-between space-y-4">
            <div>
              <div className="text-emerald-400 font-mono text-sm font-bold mb-3">02</div>
              <h3 className="text-base font-bold text-white mb-2">
                Khóa đúng biển số riêng
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Khi thanh toán cọc 30% trực tuyến, hệ thống tự động khóa chính xác biển số xe bạn chọn. Cam kết không tráo xe, không tăng giá vào mùa cao điểm.
              </p>
            </div>
            <div className="pt-3 border-t border-white/[0.06] text-[11px] text-emerald-400 font-medium flex items-center">
              <Check className="w-3.5 h-3.5 mr-1" />
              <span>Chính xác 100% theo hợp đồng</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#0D1C16] border border-white/[0.08] flex flex-col justify-between space-y-4">
            <div>
              <div className="text-emerald-400 font-mono text-sm font-bold mb-3">03</div>
              <h3 className="text-base font-bold text-white mb-2">
                Giao xe tại Ga Sân bay T1/T2
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Nhân viên Motorent đón bạn tại cửa ra ga đến Sân bay Quốc tế Đà Nẵng. Bàn giao xe kèm 2 mũ bảo hiểm 3/4 tiệt trùng UV và lên đường chỉ trong 3 phút.
              </p>
            </div>
            <div className="pt-3 border-t border-white/[0.06] text-[11px] text-emerald-400 font-medium flex items-center">
              <Check className="w-3.5 h-3.5 mr-1" />
              <span>Theo dõi chuyến bay theo thời gian thực</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#0D1C16] border border-white/[0.08] flex flex-col justify-between space-y-4">
            <div>
              <div className="text-emerald-400 font-mono text-sm font-bold mb-3">04</div>
              <h3 className="text-base font-bold text-white mb-2">
                Cứu hộ cơ động 24/7
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Đội kỹ thuật túc trực tại chân đèo Hải Vân, bán đảo Sơn Trà và trung tâm. Có mặt xử lý trong 30-45 phút, đổi xe tương đương nếu phát sinh sự cố kỹ thuật.
              </p>
            </div>
            <div className="pt-3 border-t border-white/[0.06] text-[11px] text-emerald-400 font-medium flex items-center">
              <Check className="w-3.5 h-3.5 mr-1" />
              <span>Hotline kỹ thuật: 1900 6868</span>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          4. SECTION: CẨM NANG CUNG ĐƯỜNG ĐÀ NẴNG (FIELD GUIDE)
          ========================================================================= */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-2">
              CẨM NANG ĐỊA PHƯƠNG
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              3 Cung đường trải nghiệm đẹp nhất Đà Nẵng
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl">
              Gợi ý hành trình, cự ly và dòng xe tối ưu để bạn có chuyến đi an toàn và trọn vẹn nhất.
            </p>
          </div>

          <Link
            to="/bikes"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
          >
            <span>Tìm xe theo cung đường</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 3 Editorial Field Guide Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Guide 1 */}
          <div className="p-6 sm:p-7 rounded-2xl bg-[#0D1C16] border border-white/[0.08] flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-emerald-400">CUNG ĐƯỜNG 01</span>
                <span className="text-slate-400 font-medium">Cự ly: 21 km</span>
              </div>
              <h3 className="text-lg font-bold text-white leading-snug">
                Đèo Hải Vân & Vịnh Lăng Cô
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Cung đèo uốn lượn lưng chừng mây nối liền Đà Nẵng và Huế. Tầm nhìn mở rộng ngắm trọn biển Nam Ô và vịnh Lăng Cô xanh ngọc bích.
              </p>

              <div className="pt-2 space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span>Thời gian khám phá:</span>
                  <span className="text-slate-200 font-medium">2.5 - 3 Giờ</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span>Độ cao / Địa hình:</span>
                  <span className="text-slate-200 font-medium">500m • Cua tay áo dốc 8-10%</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span>Dòng xe tối ưu:</span>
                  <span className="text-emerald-300 font-medium">Xe côn tay / ADV 160</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.06] text-xs text-slate-400">
              <strong className="text-slate-200">Lưu ý an toàn:</strong> Về số thấp khi xuống đèo, không rà phanh liên tục để tránh cháy má phanh.
            </div>
          </div>

          {/* Guide 2 */}
          <div className="p-6 sm:p-7 rounded-2xl bg-[#0D1C16] border border-white/[0.08] flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-emerald-400">CUNG ĐƯỜNG 02</span>
                <span className="text-slate-400 font-medium">Cự ly: 18 km</span>
              </div>
              <h3 className="text-lg font-bold text-white leading-snug">
                Bán Đảo Sơn Trà & Đỉnh Bàn Cờ
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Đường uốn quanh rừng nguyên sinh Sơn Trà, ngắm loài Voọc Chà Vá Chân Nâu quý hiếm và ngắm toàn cảnh thành phố Đà Nẵng từ độ cao 696m.
              </p>

              <div className="pt-2 space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span>Thời gian khám phá:</span>
                  <span className="text-slate-200 font-medium">2 Giờ</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span>Độ cao / Địa hình:</span>
                  <span className="text-slate-200 font-medium">696m • Dốc đứng quanh co</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span>Dòng xe tối ưu:</span>
                  <span className="text-emerald-300 font-medium">Xe số Wave / Future / Côn tay</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.06] text-xs text-slate-400">
              <strong className="text-slate-200">Khuyến nghị:</strong> Quy định địa phương hạn chế xe tay ga lên đỉnh Bàn Cờ, nên chọn xe số hoặc côn tay.
            </div>
          </div>

          {/* Guide 3 */}
          <div className="p-6 sm:p-7 rounded-2xl bg-[#0D1C16] border border-white/[0.08] flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-emerald-400">CUNG ĐƯỜNG 03</span>
                <span className="text-slate-400 font-medium">Cự ly: 30 km</span>
              </div>
              <h3 className="text-lg font-bold text-white leading-snug">
                Duyên Hải Đà Nẵng — Phố Cổ Hội An
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Cung đường biển bằng phẳng dọc đường Võ Nguyên Giáp và Lạc Long Quân. Đón gió biển mát lành, ghé thăm làng đá Non Nước và phố cổ đèn lồng.
              </p>

              <div className="pt-2 space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span>Thời gian di chuyển:</span>
                  <span className="text-slate-200 font-medium">45 Phút</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span>Địa hình:</span>
                  <span className="text-slate-200 font-medium">Đường đại lộ ven biển êm ái</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span>Dòng xe tối ưu:</span>
                  <span className="text-emerald-300 font-medium">Tất cả các dòng xe tay ga</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.06] text-xs text-slate-400">
              <strong className="text-slate-200">Gợi ý:</strong> Khởi hành vào khoảng 15:30 chiều để kịp ngắm hoàng hôn biển và vào Hội An khi phố lên đèn.
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          5. SECTION: QUY TRÌNH THUÊ XE 3 BƯỚC ĐƠN GIẢN
          ========================================================================= */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-2">
            THỦ TỤC NHANH GỌN
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Nhận xe sẵn sàng chỉ trong 3 bước
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            Tối giản mọi thủ tục giấy tờ rườm rà để bạn tận hưởng chuyến đi trọn vẹn.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#0D1C16] border border-white/[0.08] relative">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center border border-emerald-500/20 mb-4">
              01
            </span>
            <h3 className="text-base font-bold text-white mb-2">Chọn xe & cọc 30% trực tuyến</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Chọn mẫu xe yêu thích, xem ảnh thật 3 góc chụp và bảng giá niêm yết. Thanh toán cọc 30% qua QR Pay để hệ thống khóa chính xác biển số xe riêng cho bạn.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0D1C16] border border-white/[0.08] relative">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center border border-emerald-500/20 mb-4">
              02
            </span>
            <h3 className="text-base font-bold text-white mb-2">Đối soát eKYC trong 30 giây</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Chụp ảnh CCCD và GPLX trực tiếp trên điện thoại của bạn. Hệ thống tự động xác thực và lập hợp đồng số hóa. Hoàn toàn không giữ bất kỳ giấy tờ gốc nào.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0D1C16] border border-white/[0.08] relative">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center border border-emerald-500/20 mb-4">
              03
            </span>
            <h3 className="text-base font-bold text-white mb-2">Nhận xe tại Sân bay hoặc Trạm</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Nhân viên giao xe tận tay tại cửa Ga T1/T2 hoặc khách sạn. Bạn kiểm tra xe, nhận 2 nón bảo hiểm 3/4 tiệt trùng UV, ký biên bản điện tử và lên đường.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. SECTION: MẠNG LƯỚI CHI NHÁNH TẠI ĐÀ NẴNG
          ========================================================================= */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-2">
              HỆ THỐNG TRẠM XE
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              3 Chi nhánh phục vụ khắp Đà Nẵng
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Vị trí chiến lược kết nối trực tiếp Sân bay, bờ biển Mỹ Khê và cửa ngõ phượt đèo Hải Vân.
            </p>
          </div>

          <Link
            to="/branches"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
          >
            <span>Chi tiết bản đồ & giờ mở cửa</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {branches.map((branch, idx) => (
            <div
              key={branch._id}
              className="p-6 rounded-2xl bg-[#0D1C16] border border-white/[0.08] flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-emerald-400">TRẠM 0{idx + 1}</span>
                  <span className="text-[11px] text-emerald-300 font-medium">Mở cửa: 06:00 - 23:00</span>
                </div>

                <h3 className="text-base font-bold text-white">{branch.name}</h3>

                <p className="text-xs text-slate-400 flex items-start space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{branch.address}</span>
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">{branch.phone}</span>
                <Link
                  to="/branches"
                  className="text-emerald-400 font-medium hover:underline"
                >
                  Chỉ đường
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          7. SECTION: CAM KẾT VÌ MÔI TRƯỜNG & AN TOÀN
          ========================================================================= */}
      <section className="py-12 md:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
        <div className="p-8 sm:p-10 rounded-2xl bg-[#0D1C16] border border-white/[0.08] text-center max-w-3xl mx-auto space-y-4">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            DU LỊCH CÓ TRÁCH NHIỆM
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            Giữ gìn vẻ đẹp nguyên sơ của Đà Nẵng
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Rừng già Sơn Trà và đèo Hải Vân là di sản thiên nhiên vô giá. Motorent cùng bạn chung tay giữ gìn sự nguyên sơ: 
            Không để lại rác thải trên đèo, không cho thú rừng ăn, và lái xe với tốc độ an toàn có trách nhiệm.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-4 text-xs text-slate-400">
            <span className="flex items-center">
              <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
              100% Xe đạt chuẩn khí thải Euro 4/5
            </span>
            <span className="flex items-center">
              <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
              Phát triển đội xe điện du lịch xanh
            </span>
          </div>
        </div>
      </section>

    </div>
  );
};
