import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  MapPin,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Clock,
  FileCheck2,
  Mountain,
  Trees,
  Wind,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Gauge,
  Zap,
  Flame,
  Award,
  Navigation,
  Fuel,
  Check,
  PhoneCall,
  ShieldAlert
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

  // Giới hạn 6 xe tiêu biểu trên Trang chủ
  const featuredVehicles = filteredVehicles.slice(0, 6);

  const handleBookingSearch = (criteria: BookingSearchCriteria) => {
    navigate(`/bikes?pickup=${criteria.pickupBranchId}&return=${criteria.returnBranchId}`);
  };

  const handleBookVehicle = (v: Vehicle) => {
    navigate(`/booking/${v._id}`);
  };

  // Cỗ máy tiêu biểu chuyên leo đèo và phượt núi rừng
  const heroSpotlightBike = vehicles.find((v) => 
    v.vehicleModel.includes('160') || 
    v.vehicleModel.includes('Winner') || 
    v.vehicleModel.includes('SH') || 
    v.status === 'Available'
  ) || vehicles[0];

  return (
    <div className="min-h-screen bg-[#050D0A] text-slate-100 antialiased selection:bg-emerald-500 selection:text-[#050D0A]">

      {/* =========================================================================
          1. MONUMENTAL EXPEDITION HERO: ĐẠI NGÀN XANH & ĐỈNH ĐÈO HÙNG VĨ
          ========================================================================= */}
      <section className="relative pt-8 pb-16 md:pt-14 md:pb-24 overflow-hidden border-b border-emerald-500/10">
        {/* Alpine Atmosphere & Mountain Mist */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] bg-forest-ambient pointer-events-none" />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-mountain-mist pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          {/* Top Alpine Expedition Crest */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center space-x-2.5 px-4 py-2 rounded-full bg-[#0A1813]/90 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-xl shadow-lg shadow-black/60">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <Mountain className="w-4 h-4 text-emerald-400" />
              <span className="font-bold tracking-wider uppercase text-[11px] sm:text-xs">
                ĐÀ NẴNG 2026 • CHINH PHỤC ĐẠI NGÀN NÚI RỪNG & ĐÈO HẢI VÂN
              </span>
            </div>
          </div>

          {/* Grand Centered Editorial Typography */}
          <div className="text-center max-w-4xl mx-auto space-y-5">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-white">
              LƯỚT QUA ĐẠI NGÀN XANH.
              <br />
              <span className="text-gradient-forest">
                CHẠM ĐỈNH ĐÈO HÙNG VĨ.
              </span>
            </h1>

            <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
              Hệ thống xe máy phượt thiên nhiên chuyên dụng số 1 Đà Nẵng. Động cơ tối ưu leo dốc đèo Hải Vân, 
              khám phá rừng nguyên sinh Sơn Trà và Đỉnh Bàn Cờ. Cọc 30% khóa xe trực tuyến — 
              <span className="text-emerald-300 font-semibold"> 100% không giữ CCCD bản gốc</span>.
            </p>

            {/* Nature Trail Key Badges */}
            <div className="pt-2 flex flex-wrap justify-center items-center gap-2.5 text-xs sm:text-sm font-medium text-emerald-100">
              <span className="flex items-center space-x-2 bg-[#0A1813]/80 border border-emerald-500/20 px-3.5 py-1.5 rounded-full backdrop-blur-sm">
                <Trees className="w-3.5 h-3.5 text-emerald-400" />
                <span>Rừng Già Sơn Trà • Cây Đa 800 Năm</span>
              </span>
              <span className="flex items-center space-x-2 bg-[#0A1813]/80 border border-emerald-500/20 px-3.5 py-1.5 rounded-full backdrop-blur-sm">
                <Wind className="w-3.5 h-3.5 text-emerald-400" />
                <span>Đèo Hải Vân • 21km Cua Cùi Chỏ</span>
              </span>
              <span className="flex items-center space-x-2 bg-[#0A1813]/80 border border-emerald-500/20 px-3.5 py-1.5 rounded-full backdrop-blur-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cứu Hộ Đèo Dốc 24/7 Miễn Phí</span>
              </span>
            </div>
          </div>

          {/* =========================================================================
              FLOATING EXPEDITION CONCIERGE DOCK (BOOKING WIDGET IN GLASS-FOREST)
              ========================================================================= */}
          <div className="mt-10 max-w-5xl mx-auto">
            <div className="p-2 sm:p-3 rounded-3xl bg-gradient-to-b from-emerald-500/20 via-emerald-950/40 to-black/80 backdrop-blur-2xl border border-emerald-500/30 shadow-2xl shadow-black/80">
              <div className="rounded-2xl overflow-hidden">
                <BookingWidget branches={branches} onSearch={handleBookingSearch} />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Error Alert Banner */}
      {error && (
        <section className="max-w-4xl mx-auto my-6 px-4">
          <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-xs sm:text-sm text-emerald-200">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <span className="font-semibold">{error}</span>
            </div>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center space-x-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          </div>
        </section>
      )}

      {/* =========================================================================
          2. THE EXPEDITION SHOWROOM PEDESTAL: CỖ MÁY CHINH PHỤC ĐỊA HÌNH SỐ 1
          ========================================================================= */}
      {heroSpotlightBike && (
        <section className="py-12 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-[2.5rem] bg-gradient-to-br from-[#0F241C] via-[#0A1813] to-[#050D0A] border border-emerald-500/25 p-6 sm:p-10 md:p-12 shadow-2xl overflow-hidden">
            {/* Topographic Contour Rings Ambient */}
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              
              {/* Bike Spotlight Visual Stage (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="relative w-full max-w-md h-64 sm:h-72 bg-gradient-to-b from-white/95 to-slate-100 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center p-4 border border-white/20">
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#050D0A]/90 text-emerald-300 border border-emerald-500/40 text-[11px] font-black uppercase tracking-wider backdrop-blur-md">
                    CỖ MÁY CHUYÊN LEO ĐÈO
                  </div>
                  <img
                    src={heroSpotlightBike.images?.[1] || heroSpotlightBike.images?.[0]}
                    alt={heroSpotlightBike.vehicleModel}
                    className="w-full h-full object-contain scale-[1.35] drop-shadow-2xl transition-transform duration-500 hover:scale-[1.42]"
                  />
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/80 text-slate-300 text-[10px] font-mono border border-white/10">
                    {heroSpotlightBike.licensePlate}
                  </div>
                </div>

                <div className="mt-3 flex items-center space-x-2 text-xs text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sẵn sàng tại: <strong className="text-white">{typeof heroSpotlightBike.branchId === 'object' ? heroSpotlightBike.branchId.name : 'Trạm Sân Bay Đà Nẵng'}</strong></span>
                </div>
              </div>

              {/* Technical Mountain Specs & Narrative (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cỗ Máy Khám Phá Rừng & Đèo Số 1 Hôm Nay</span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                    {heroSpotlightBike.vehicleModel}
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                    Được tinh chỉnh tỉ mỉ cho địa hình đèo dốc Đà Nẵng - Huế. Mô-men xoắn mạnh mẽ vượt dốc 15-20%, 
                    lốp bám đường ẩm ướt trong sương mù rừng thông, và hệ thống phanh ABS an toàn tuyệt đối.
                  </p>
                </div>

                {/* 4 Alpine Specifications Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-2xl bg-[#050D0A]/70 border border-emerald-500/20">
                    <div className="text-emerald-400 text-xs font-bold flex items-center mb-1">
                      <Gauge className="w-3.5 h-3.5 mr-1" />
                      <span>Độ dốc leo</span>
                    </div>
                    <div className="text-base font-black text-white font-mono">18% - 22%</div>
                    <div className="text-[10px] text-slate-400">Đỉnh Bàn Cờ</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#050D0A]/70 border border-emerald-500/20">
                    <div className="text-emerald-400 text-xs font-bold flex items-center mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                      <span>Hệ thống phanh</span>
                    </div>
                    <div className="text-base font-black text-white">ABS 2 Kênh</div>
                    <div className="text-[10px] text-slate-400">Chống trượt đèo</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#050D0A]/70 border border-emerald-500/20">
                    <div className="text-emerald-400 text-xs font-bold flex items-center mb-1">
                      <Fuel className="w-3.5 h-3.5 mr-1" />
                      <span>Phạm vi chạy</span>
                    </div>
                    <div className="text-base font-black text-white font-mono">350 km</div>
                    <div className="text-[10px] text-slate-400">Đầy bình xăng</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#050D0A]/70 border border-emerald-500/20">
                    <div className="text-emerald-400 text-xs font-bold flex items-center mb-1">
                      <Award className="w-3.5 h-3.5 mr-1" />
                      <span>Trang bị kèm</span>
                    </div>
                    <div className="text-base font-black text-white">2 Nón 3/4</div>
                    <div className="text-[10px] text-slate-400">Kính chống sương</div>
                  </div>
                </div>

                {/* Price and Instant Action Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-emerald-500/20">
                  <div>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Giá thuê trọn gói thiên nhiên
                    </span>
                    <div className="flex items-baseline space-x-1.5 mt-0.5">
                      <span className="text-2xl sm:text-3xl font-black text-white font-mono text-gradient-moss">
                        {heroSpotlightBike.dailyPrice.toLocaleString('vi-VN')}
                      </span>
                      <span className="text-xs font-bold text-slate-400">đ/ngày</span>
                      <span className="ml-2 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Cọc chỉ {(heroSpotlightBike.dailyPrice * 0.3).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleBookVehicle(heroSpotlightBike)}
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 px-7 py-3 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-[#050D0A] font-black text-xs sm:text-sm transition-all active:scale-95 shadow-lg shadow-emerald-500/25 cursor-pointer"
                  >
                    <span>Khóa Cỗ Máy Này (Cọc 30%)</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>

              </div>

            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          3. SCENIC NATURE EXPEDITION TRAILS: BẢN ĐỒ CUNG ĐƯỜNG ĐẠI NGÀN
          ========================================================================= */}
      <section className="py-14 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-emerald-500/10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-bold tracking-wider text-emerald-300 bg-[#0A1813] border border-emerald-500/30 px-3.5 py-1.5 rounded-full mb-3">
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gợi ý hành trình phượt</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              3 Cung Đường Thiên Nhiên Hùng Vĩ Nhất Đà Nẵng
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl">
              Được thiết kế hoàn hảo cho những tâm hồn tự do muốn tận hưởng không khí núi rừng nguyên sơ, 
              những khúc cua ôm biển ngoạn mục và gió ngàn trong lành.
            </p>
          </div>

          <Link
            to="/bikes"
            className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <span>Chọn xe phù hợp từng cung đường</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Asymmetric Magazine Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Featured Grand Trail: Đèo Hải Vân (7 cols) */}
          <div className="lg:col-span-7 rounded-[2rem] bg-gradient-to-b from-[#0F241C] to-[#0A1813] border border-emerald-500/30 p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <span className="px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black tracking-wide uppercase">
                  Cung Đường Huyền Thoại
                </span>
                <span className="text-xs text-slate-300 font-mono flex items-center">
                  <Mountain className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                  Độ cao: 500m
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Đèo Hải Vân — Thiên Hạ Đệ Nhất Hùng Quan
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                21km uốn lượn lưng chừng mây giữa vách núi dựng đứng và biển Lăng Cô xanh ngọc bích. 
                Từng khúc cua tay áo mở ra tầm nhìn bao la của đại ngàn, những dải mây trắng bảng lảng 
                luồn qua rừng thông vi vu.
              </p>

              {/* Trail Specs */}
              <div className="pt-2 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-[#050D0A]/80 border border-emerald-500/20">
                  <div className="text-slate-400 text-[10px]">Cự ly hành trình</div>
                  <div className="font-black text-white text-sm mt-0.5">21 km</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#050D0A]/80 border border-emerald-500/20">
                  <div className="text-slate-400 text-[10px]">Thời gian lý tưởng</div>
                  <div className="font-black text-white text-sm mt-0.5">2.5 - 3 Giờ</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#050D0A]/80 border border-emerald-500/20">
                  <div className="text-slate-400 text-[10px]">Dòng xe khuyên dùng</div>
                  <div className="font-black text-emerald-300 text-sm mt-0.5">Côn Tay / ADV</div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-emerald-500/20 flex items-center justify-between">
              <span className="text-xs text-emerald-400 font-semibold flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
                Trạm cứu hộ cơ động chân đèo túc trực 24/7
              </span>
              <button
                onClick={() => navigate('/bikes?type=xe-con-tay')}
                className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Xem xe leo đèo
              </button>
            </div>
          </div>

          {/* Right Column: 2 Stacked Trails (5 cols) */}
          <div className="lg:col-span-5 space-y-6">

            {/* Trail 2: Sơn Trà & Đỉnh Bàn Cờ */}
            <div className="p-6 rounded-[2rem] bg-[#0A1813] border border-emerald-500/20 hover:border-emerald-500/40 transition-all shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold uppercase border border-emerald-500/20">
                    Rừng Nguyên Sinh
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Độ cao: 700m</span>
                </div>
                <h4 className="text-lg font-black text-white">
                  Bán Đảo Sơn Trà & Đỉnh Bàn Cờ
                </h4>
                <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                  Cung đường rợp bóng cây cổ thụ nghìn năm tuổi, ngắm loài Voọc Chà Vá Chân Nâu quý hiếm 
                  và chiêm ngưỡng toàn cảnh thành phố Đà Nẵng từ độ cao 700m.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-500/15 flex items-center justify-between text-xs">
                <span className="text-slate-400">Khuyên dùng: Xe số / Tay côn dốc cao</span>
                <button
                  onClick={() => navigate('/bikes?type=xe-so')}
                  className="text-emerald-400 font-bold hover:underline"
                >
                  Chọn xe số
                </button>
              </div>
            </div>

            {/* Trail 3: Rừng Suối Mơ & Thác Hòa Vang */}
            <div className="p-6 rounded-[2rem] bg-[#0A1813] border border-emerald-500/20 hover:border-emerald-500/40 transition-all shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold uppercase border border-emerald-500/20">
                    Suối Rừng Hoang Sơ
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Phía Tây Đà Nẵng</span>
                </div>
                <h4 className="text-lg font-black text-white">
                  Suối Mơ, Suối Hoa & Đèo Mẹ Bồng Con
                </h4>
                <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                  Tận hưởng làn nước suối tự nhiên mát lạnh, hít thở hương thơm cỏ cây rừng núi Hòa Vang. 
                  Cung đường nông thôn bình yên, đường êm ái thích hợp cho cả xe ga lẫn xe số.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-500/15 flex items-center justify-between text-xs">
                <span className="text-slate-400">Khuyên dùng: Xe tay ga / Xe số</span>
                <button
                  onClick={() => navigate('/bikes?type=xe-tay-ga')}
                  className="text-emerald-400 font-bold hover:underline"
                >
                  Chọn xe ga
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          4. THE 4 NATURE PILLARS: CAM KẾT VĂN MINH CHO CHUYẾN PHƯỢT KHÔNG RỦI RO
          ========================================================================= */}
      <section className="py-14 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-emerald-500/10">
        <div className="max-w-3xl mb-10">
          <div className="inline-flex items-center space-x-2 text-xs font-bold tracking-wider text-emerald-300 bg-[#0A1813] border border-emerald-500/30 px-3.5 py-1.5 rounded-full mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tiêu chuẩn dã ngoại an toàn</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            4 Bảo Chứng Vàng Cho Hành Trình Đại Ngàn An Tâm
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            Chúng tôi xóa bỏ mọi nỗi lo kinh điển khi phượt đèo núi: sự cố xe giữa rừng vắng, 
            bị giữ giấy tờ tùy thân gốc, và chi phí phát sinh vô lý.
          </p>
        </div>

        {/* Asymmetric Bento Architecture */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Big Featured Pillar: Cứu hộ khẩn cấp 24/7 (7 cols) */}
          <div className="lg:col-span-7 p-6 sm:p-8 rounded-[2rem] bg-gradient-to-br from-[#0F241C] to-[#0A1813] border border-emerald-500/30 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Đội Cứu Hộ Cơ Động Xuyên Suốt Đèo Hải Vân & Bán Đảo Sơn Trà
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Khi phượt trên đèo dốc hay rừng sâu, sự cố kỹ thuật có thể khiến bạn lo lắng. 
                Motorent duy trì đội ngũ kỹ thuật phản ứng nhanh túc trực tại 3 cửa ngõ trọng yếu. 
                Có mặt hỗ trợ trong 30-45 phút, đổi xe tương đương ngay tại chỗ nếu xảy ra sự cố hỏng hóc 
                để không làm gián đoạn chuyến đi của bạn.
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="flex items-center text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Cứu hộ miễn phí 100% đối với lỗi kỹ thuật xe
              </span>
              <a
                href="tel:19006868"
                className="px-4 py-1.5 rounded-full bg-emerald-500 text-[#050D0A] font-black text-xs hover:bg-emerald-400 transition-colors flex items-center space-x-1"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Hotline: 1900 6868</span>
              </a>
            </div>
          </div>

          {/* Right 3 Stacked Pillars (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Pillar 2 */}
            <div className="p-5 rounded-2xl bg-[#0A1813] border border-emerald-500/20 flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">100% Không Giữ CCCD Bản Gốc</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Đối soát thông tin qua eKYC chỉ trong 30 giây. Bạn giữ trọn vẹn giấy tờ tùy thân để tự do check-in resort, khách sạn.
                </p>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-5 rounded-2xl bg-[#0A1813] border border-emerald-500/20 flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">100% Xe Tuyển Chọn Đời 2023 - 2024</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Bảo dưỡng ODO nghiêm ngặt sau mỗi 1,500km tour đèo. Kiểm tra má phanh, áp suất lốp và đèn pha trước từng lượt giao xe.
                </p>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="p-5 rounded-2xl bg-[#0A1813] border border-emerald-500/20 flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">Bộ Phụ Kiện Phượt Rừng Chuẩn An Toàn</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Miễn phí 2 nón bảo hiểm 3/4 kính chống sương mù tiệt trùng UV, áo mưa rằn ri và giá đỡ điện thoại nhôm giảm chấn OIS.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          5. EXPEDITION FLEET SHOWROOM: PHÂN KHÚC ĐỘI XE KHÁM PHÁ THIÊN NHIÊN
          ========================================================================= */}
      <section className="py-14 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-emerald-500/10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-bold tracking-wider text-emerald-300 bg-[#0A1813] border border-emerald-500/30 px-3.5 py-1.5 rounded-full mb-3">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Đội xe chính hãng sẵn sàng</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Đội Xe Phượt & Khám Phá Rừng Núi Đà Nẵng
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Chọn cỗ máy lý tưởng phù hợp với kỹ năng lái và cung đường bạn muốn chinh phục.
            </p>
          </div>

          <Link
            to="/bikes"
            className="inline-flex items-center space-x-2 text-xs font-black text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider"
          >
            <span>Xem toàn bộ {vehicles.length} xe</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Category Filter Pills Styled as Nature Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-8 pb-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategoryTab('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              selectedCategoryTab === 'all'
                ? 'bg-emerald-500 text-[#050D0A] shadow-md shadow-emerald-500/25 font-black'
                : 'bg-[#0A1813] text-slate-300 border border-emerald-500/20 hover:border-emerald-500/40 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Tất cả đội xe ({vehicles.length})</span>
          </button>

          {categories.map((cat) => {
            const active = selectedCategoryTab === cat.slug;
            return (
              <button
                key={cat._id}
                onClick={() => setSelectedCategoryTab(cat.slug)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  active
                    ? 'bg-emerald-500 text-[#050D0A] shadow-md shadow-emerald-500/25 font-black'
                    : 'bg-[#0A1813] text-slate-300 border border-emerald-500/20 hover:border-emerald-500/40 hover:text-white'
                }`}
              >
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Vehicles Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mb-3" />
            <p className="text-xs text-slate-400">Đang kiểm tra tình trạng đội xe trực tuyến...</p>
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
          <div className="py-16 text-center rounded-3xl bg-[#0A1813] border border-emerald-500/20 p-8">
            <p className="text-slate-300 font-bold text-sm">Chưa có xe thuộc danh mục này tại Đà Nẵng.</p>
            <button
              onClick={() => setSelectedCategoryTab('all')}
              className="mt-3 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
            >
              Xem lại tất cả đội xe
            </button>
          </div>
        )}

        {/* Direct Action Hub */}
        <div className="mt-12 text-center">
          <Link
            to="/bikes"
            className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[#050D0A] font-black text-sm transition-all shadow-xl shadow-emerald-500/20"
          >
            <span>Khám Phá Tất Cả {vehicles.length} Chiếc Xe & Bảng Giá Chi Tiết</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </Link>
        </div>
      </section>

      {/* =========================================================================
          6. EXPEDITION BASECAMPS: 3 TRẠM TIẾP NHIÊN LIỆU & BÀN GIAO ĐÀ NẴNG
          ========================================================================= */}
      <section className="py-14 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-emerald-500/10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 text-xs font-bold tracking-wider text-emerald-300 bg-[#0A1813] border border-emerald-500/30 px-3.5 py-1.5 rounded-full mb-3">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mạng lưới tiếp nhiên liệu & bàn giao</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            3 Trạm Căn Cứ Xuất Phát Tại Đà Nẵng
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            Đặt tại các vị trí chiến lược ngay cửa ngõ đèo Hải Vân, bán đảo Sơn Trà và trung tâm đón khách du lịch.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {branches.map((branch, idx) => (
            <div
              key={branch._id}
              className="p-6 rounded-3xl bg-[#0A1813] border border-emerald-500/20 hover:border-emerald-500/40 transition-all shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                    0{idx + 1}
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                    Đang mở cửa
                  </span>
                </div>

                <h3 className="text-base font-black text-white">{branch.name}</h3>
                
                <p className="text-xs text-slate-400 flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{branch.address}</span>
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-emerald-500/15 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">{branch.phone}</span>
                <Link
                  to="/branches"
                  className="text-emerald-400 font-bold hover:text-emerald-300 flex items-center"
                >
                  <span>Chỉ đường</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          7. EXPEDITION NATURE PLEDGE: BẢN TUYÊN NGÔN VÌ ĐẠI NGÀN XANH
          ========================================================================= */}
      <section className="py-12 md:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2.5rem] bg-gradient-to-r from-[#0F241C] via-[#0A1813] to-[#050D0A] border border-emerald-500/30 p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-4 relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
              <Trees className="w-3.5 h-3.5 text-emerald-400" />
              <span>Du lịch có trách nhiệm với thiên nhiên</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white">
              Chinh Phục Đại Ngàn — Giữ Trọn Vẹn Sự Nguyên Sơ
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Motorent cam kết 100% đội xe đạt chuẩn khí thải Euro 4/5 và chuyển đổi dần sang xe máy điện du lịch xanh. 
              Mỗi cung đường bạn đi qua tại Đèo Hải Vân và Bán đảo Sơn Trà xin vui lòng không xả rác, không cho động vật hoang dã ăn, 
              và tuân thủ quy tắc an toàn giao thông đường đèo.
            </p>

            <div className="pt-2 flex flex-wrap justify-center gap-3 text-xs text-emerald-200">
              <span className="flex items-center bg-[#050D0A]/60 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                Không để lại rác thải trên đèo
              </span>
              <span className="flex items-center bg-[#050D0A]/60 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                Về số thấp khi đổ dốc nguy hiểm
              </span>
              <span className="flex items-center bg-[#050D0A]/60 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                Đội nón 3/4 cài quai chuẩn an toàn
              </span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
