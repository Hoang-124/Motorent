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
  Navigation,
  Gauge,
  Fuel,
  Zap,
  ChevronLeft,
  Camera,
  Layers,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { BookingWidget } from '../components/BookingWidget';
import type { Vehicle, Branch, Category } from '../types';
import { api } from '../services/api';
import { getOptimizedVehicleImageUrl } from '../utils/imageHelper';

interface BookingSearchCriteria {
  pickupBranchId: string;
  returnBranchId: string;
  pickupDate: string;
  returnDate: string;
}

const ANGLE_VIEWS = [
  { id: 1, label: 'Thân xe ngang', title: 'Góc ngang thân xe' },
  { id: 0, label: '3/4 Mặt trước', title: 'Góc 3/4 mặt trước' },
  { id: 2, label: 'Đuôi & Khoang lái', title: 'Góc đuôi xe & khoang lái' },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Gallery Showcase State
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [activeAngle, setActiveAngle] = useState<number>(1);
  const [imgError, setImgError] = useState<boolean>(false);

  // Scenic Route Tab State
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);

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
        const bikeList = vehiclesRes.data.data;
        setVehicles(bikeList);
        if (bikeList.length > 0) {
          // Prefer an adventure/high-power bike if available
          const preferred = bikeList.find((b: Vehicle) => 
            b.vehicleModel.includes('160') || 
            b.vehicleModel.includes('Winner') || 
            b.vehicleModel.includes('SH')
          ) || bikeList[0];
          setSelectedVehicleId(preferred._id);
        }
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

  const handleBookingSearch = (criteria: BookingSearchCriteria) => {
    navigate(`/bikes?pickup=${criteria.pickupBranchId}&return=${criteria.returnBranchId}`);
  };

  const handleBookVehicle = (v: Vehicle) => {
    navigate(`/booking/${v._id}`);
  };

  const activeVehicle = vehicles.find(v => v._id === selectedVehicleId) || vehicles[0];

  // Route Profiles Data (Monocle / National Geographic Specimen Style)
  const SCENIC_ROUTES = [
    {
      id: 'hai-van',
      code: 'ROUTE 01',
      title: 'Đèo Hải Vân & Vịnh Lăng Cô',
      subtitle: 'Thiên hạ đệ nhất hùng quan nối liền biển và đại ngàn',
      distance: '21 km',
      duration: '2.5 - 3 Giờ',
      elevation: '496m (Hải Vân Quan)',
      grade: '8% - 10%',
      hairpins: '21 khúc cua tay áo',
      recommendedType: 'Xe Côn Tay / ADV 160 / Air Blade 160',
      description: 'Cung đèo lịch sử uốn lượn lưng chừng mây giữa vách núi đá dựng đứng và biển Nam Ô xanh ngọc bích. Những dải mây trắng bảng lảng luồn qua từng rặng thông vi vu.',
      safetyNote: 'Về số thấp (số 2 hoặc số 3) khi xuống dốc, không rà phanh liên tục để tránh cháy má phanh đĩa.',
      highlights: ['Hải Vân Quan di tích quốc gia', 'Khúc cua cùi chỏ vịnh Lăng Cô', 'Quán cà phê mây ngắm toàn cảnh Đà Nẵng']
    },
    {
      id: 'son-tra',
      code: 'ROUTE 02',
      title: 'Bán Đảo Sơn Trà & Đỉnh Bàn Cờ',
      subtitle: 'Rừng nguyên sinh nhiệt đới & vương quốc Voọc Chà Vá',
      distance: '18 km',
      duration: '2 Giờ',
      elevation: '696m (Đỉnh Bàn Cờ)',
      grade: '15% - 20% (Dốc đứng)',
      hairpins: '14 khúc quanh rừng già',
      recommendedType: 'Xe Số Bền Bỉ (Wave/Future) / Xe Côn Tay',
      description: 'Chạy xe dưới vòm tán cây cổ thụ hàng trăm năm tuổi mát rượi, hít thở bầu không khí đại ngàn nguyên sơ và chiêm ngưỡng toàn cảnh thành phố Đà Nẵng từ độ cao 696m.',
      safetyNote: 'Theo quy định của BQL Sơn Trà, xe tay ga tự động bị cấm lên Đỉnh Bàn Cờ. Quý khách vui lòng chọn xe số hoặc xe côn tay.',
      highlights: ['Tượng Phật Bà Chùa Linh Ứng', 'Cây Đa Di Sản 800 năm', 'Đỉnh Bàn Cờ tiên cảnh']
    },
    {
      id: 'hoi-an',
      code: 'ROUTE 03',
      title: 'Duyên Hải Đà Nẵng — Phố Cổ Hội An',
      subtitle: 'Hành trình êm ái dọc theo một trong những bãi biển đẹp nhất hành tinh',
      distance: '30 km',
      duration: '45 Phút',
      elevation: '0m - 15m (Bằng phẳng)',
      grade: '0%',
      hairpins: 'Đại lộ ven biển thẳng tắp',
      recommendedType: 'Tất cả các dòng xe tay ga & xe điện',
      description: 'Cung đường đại lộ ven biển Võ Nguyên Giáp và Lạc Long Quân. Đón gió biển mát lành, ghé thăm làng đá mỹ nghệ Non Nước dưới chân Ngũ Hành Sơn trước khi đến với phố đèn lồng Hội An.',
      safetyNote: 'Đường bằng phẳng dễ lái, nên khởi hành lúc 15:30 chiều để vừa kịp ngắm hoàng hôn biển vừa vào Hội An khi phố cổ lên đèn.',
      highlights: ['Bãi biển Mỹ Khê & Non Nước', 'Quần thể danh thắng Ngũ Hành Sơn', 'Phố cổ Hội An về đêm']
    }
  ];

  const currentRoute = SCENIC_ROUTES[selectedRouteIndex];

  return (
    <div className="min-h-screen bg-[#040D08] text-[#F5F9F6] antialiased selection:bg-emerald-500 selection:text-[#040D08]">

      {/* =========================================================================
          1. HERO PANORAMIC CANVAS: TỔNG QUAN HÀNH TRÌNH ĐẠI NGÀN ĐÀ NẴNG
          ========================================================================= */}
      <section className="relative pt-8 pb-16 md:pt-14 md:pb-20 border-b border-emerald-500/10 overflow-hidden">
        
        {/* Subtle Topographical Vector Ambient Texture */}
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none bg-[radial-gradient(#34D399_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          {/* Top Line Meta / Coordinates Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-white/[0.08] text-xs font-mono text-[#8CA899]">
            <div className="flex items-center space-x-3">
              <span className="text-emerald-400 font-bold tracking-widest uppercase">MOTORENT EXPEDITION</span>
              <span>/</span>
              <span>16°04′N 108°13′E</span>
              <span>/</span>
              <span className="text-slate-300">ĐÀ NẴNG, VIỆT NAM</span>
            </div>

            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-200">Ga T1/T2 & Trung tâm sẵn sàng</span>
              </span>
              <span>•</span>
              <span>0đ Giữ CCCD gốc</span>
            </div>
          </div>

          {/* Asymmetric Master Composition: Editorial Heading & Dispatch Console */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Left 7 Columns: Evocative Editorial Manifesto */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 block font-mono">
                  KHÁM PHÁ THIÊN NHIÊN HOANG SƠ BẰNG XE MÁY
                </span>
                
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.05]">
                  GIỮA ĐẠI NGÀN
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-moss-400">
                    & BIỂN CẢ.
                  </span>
                </h1>
              </div>

              <p className="text-base sm:text-lg text-[#8CA899] font-normal leading-relaxed max-w-xl">
                Từ chân đèo Hải Vân uốn lượn mây bay, xuyên qua vòm rừng già Sơn Trà rợp bóng cây nghìn năm, 
                đến những bãi cát trắng trải dài Non Nước. Đội xe chính hãng đời mới 2023 - 2024, bảo dưỡng ODO khắt khe, 
                giao tận tay tại Sân bay Đà Nẵng với hợp đồng số hóa eKYC.
              </p>

              {/* Curated Elevation Waypoints Strip */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-white/[0.08]">
                <div className="space-y-0.5">
                  <div className="text-[10px] text-[#8CA899] uppercase font-mono">Đỉnh Đèo</div>
                  <div className="font-bold text-white">Hải Vân Quan</div>
                  <div className="text-emerald-400 font-mono text-[11px]">Cao 496m</div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-[10px] text-[#8CA899] uppercase font-mono">Rừng Nguyên Sinh</div>
                  <div className="font-bold text-white">Đỉnh Bàn Cờ</div>
                  <div className="text-emerald-400 font-mono text-[11px]">Cao 696m</div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-[10px] text-[#8CA899] uppercase font-mono">Cửa Ngõ Bàn Giao</div>
                  <div className="font-bold text-white">Sân Bay Quốc Tế</div>
                  <div className="text-emerald-400 font-mono text-[11px]">Ga T1 & T2</div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-[10px] text-[#8CA899] uppercase font-mono">Cứu Hộ Đèo</div>
                  <div className="font-bold text-white">24/7 Cơ Động</div>
                  <div className="text-emerald-400 font-mono text-[11px]">Toàn TP. Đà Nẵng</div>
                </div>
              </div>

            </div>

            {/* Right 5 Columns: The Dispatch Command Dock */}
            <div className="lg:col-span-5">
              <div className="relative">
                <BookingWidget branches={branches} onSearch={handleBookingSearch} />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Error Alert Notice */}
      {error && (
        <section className="max-w-4xl mx-auto my-6 px-4">
          <div className="p-4 bg-emerald-950/60 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs sm:text-sm text-emerald-200">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <span>{error}</span>
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
          2. THE MASTER VEHICLE SHOWROOM: PHÒNG TRIỂN LÃM ĐỘI XE TƯƠNG TÁC
          (HOÀN TOÀN XÓA BỎ LƯỚI CARD 3x2 ĐẠI TRÀ - THAY BẰNG SHOWCASE ĐẲNG CẤP)
          ========================================================================= */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-emerald-500/10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest mb-2">
              <span>02 / ĐỘI NGŨ CỖ MÁY CHÍNH HÃNG</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Phòng Triển Lãm Đội Xe
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#8CA899] max-w-xl">
              Chọn cỗ máy trong danh sách để tương tác góc nhìn 360°, đối soát thông số cơ học và đặt xe trực tiếp.
            </p>
          </div>

          <Link
            to="/bikes"
            className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 font-mono transition-colors"
          >
            <span>XEM TẤT CẢ {vehicles.length} XE TRONG ĐỘI</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Master Showcase Layout: Big Interactive Canvas (7 Cols) + Curated Roster (5 Cols) */}
        {activeVehicle ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left 7 Columns: Giant Interactive Studio Stage */}
            <div className="lg:col-span-7 rounded-3xl bg-[#091810] border border-white/[0.08] p-6 sm:p-8 flex flex-col justify-between relative shadow-2xl">
              
              <div>
                {/* Top Bar on Stage */}
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[11px] border border-emerald-500/30">
                      {activeVehicle.licensePlate}
                    </span>
                    <span className="text-[#8CA899] font-medium">
                      Đời {activeVehicle.yearManufactured || 2024}
                    </span>
                  </div>

                  <span className="inline-flex items-center text-emerald-400 font-medium text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                    Sẵn sàng bàn giao
                  </span>
                </div>

                {/* Big Vehicle Photo Presentation Stage */}
                <div className="relative w-full h-64 sm:h-80 my-4 bg-white rounded-2xl overflow-hidden flex items-center justify-center p-4">
                  {activeVehicle.images && activeVehicle.images[activeAngle] && !imgError ? (
                    <img
                      src={getOptimizedVehicleImageUrl(activeVehicle.images[activeAngle])}
                      alt={activeVehicle.vehicleModel}
                      onError={() => setImgError(true)}
                      className="w-full h-full object-contain scale-[1.3] transition-all duration-300"
                    />
                  ) : (
                    <div className="text-center text-slate-400 py-8">
                      <p className="font-semibold text-sm">Hình ảnh nguyên bản độ phân giải cao</p>
                      <p className="text-xs text-slate-500">Motorent chụp trực tiếp tại trạm</p>
                    </div>
                  )}

                  {/* Multi-angle pill switcher */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 bg-[#040D08]/90 p-1.5 rounded-xl border border-white/10 z-10">
                    {ANGLE_VIEWS.map((ang) => (
                      <button
                        key={ang.id}
                        type="button"
                        onClick={() => {
                          setActiveAngle(ang.id);
                          setImgError(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                          activeAngle === ang.id
                            ? 'bg-emerald-500 text-[#040D08] font-bold shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {ang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vehicle Model & Descriptive Headline */}
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mt-4">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-white">
                      {activeVehicle.vehicleModel}
                    </h3>
                    <p className="text-xs text-[#8CA899] mt-0.5">
                      Hãng sản xuất: <strong className="text-slate-200">{activeVehicle.brand}</strong> • Màu: <strong className="text-slate-200">{activeVehicle.color || 'Nguyên bản'}</strong>
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs text-[#8CA899] block font-mono">Giá thuê niêm yết</span>
                    <div className="flex items-baseline sm:justify-end space-x-1">
                      <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                        {activeVehicle.dailyPrice.toLocaleString('vi-VN')}
                      </span>
                      <span className="text-xs text-[#8CA899] font-medium">đ/ngày</span>
                    </div>
                  </div>
                </div>

                {/* 4 Mechanical Specimen Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/[0.06] text-xs">
                  <div className="p-3 rounded-xl bg-[#040D08] border border-white/5 space-y-1">
                    <div className="text-[10px] text-[#8CA899] font-mono uppercase flex items-center">
                      <Gauge className="w-3 h-3 text-emerald-400 mr-1" />
                      ODO Hiện Tại
                    </div>
                    <div className="font-bold text-white font-mono text-sm">
                      {activeVehicle.odometer.toLocaleString('vi-VN')} km
                    </div>
                    <div className="text-[10px] text-emerald-400">Bảo dưỡng chuẩn</div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#040D08] border border-white/5 space-y-1">
                    <div className="text-[10px] text-[#8CA899] font-mono uppercase flex items-center">
                      <Fuel className="w-3 h-3 text-emerald-400 mr-1" />
                      Nhiên Liệu
                    </div>
                    <div className="font-bold text-white font-mono text-sm">
                      {activeVehicle.fuelType === 'Electric' ? 'Điện 100%' : 'Xăng ~1.8L'}
                    </div>
                    <div className="text-[10px] text-[#8CA899]">Chuẩn Euro 4/5</div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#040D08] border border-white/5 space-y-1">
                    <div className="text-[10px] text-[#8CA899] font-mono uppercase flex items-center">
                      <ShieldCheck className="w-3 h-3 text-emerald-400 mr-1" />
                      Hộp Số
                    </div>
                    <div className="font-bold text-white text-sm">
                      {activeVehicle.transmissionType === 'Manual' ? 'Côn Tay Thể Thao' : activeVehicle.transmissionType === 'Automatic' ? 'Tay Ga Tự Động' : 'Xe Số Tròn'}
                    </div>
                    <div className="text-[10px] text-emerald-400">Leo dốc đèo tốt</div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#040D08] border border-white/5 space-y-1">
                    <div className="text-[10px] text-[#8CA899] font-mono uppercase flex items-center">
                      <Layers className="w-3 h-3 text-emerald-400 mr-1" />
                      Cọc Trực Tuyến
                    </div>
                    <div className="font-bold text-emerald-300 font-mono text-sm">
                      {(activeVehicle.dailyPrice * 0.3).toLocaleString('vi-VN')} đ
                    </div>
                    <div className="text-[10px] text-[#8CA899]">Khóa đúng biển xe</div>
                  </div>
                </div>
              </div>

              {/* Action Bar On Showcase */}
              <div className="mt-8 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-[#8CA899] flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Kèm 2 mũ 3/4 tiệt trùng UV + áo mưa + giá đỡ điện thoại OIS</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleBookVehicle(activeVehicle)}
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#040D08] font-bold text-xs sm:text-sm transition-all active:scale-[0.99] flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <span>Khóa cỗ máy này ngay (Cọc 30%)</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

            </div>

            {/* Right 5 Columns: The Curated Machine Roster */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between pb-2 text-xs font-mono text-[#8CA899]">
                <span>DANH SÁCH TUYỂN CHỌN ({vehicles.length} XE)</span>
                <span>CHỌN ĐỂ XEM CHI TIẾT</span>
              </div>

              {/* Scrollable / Stacked List of Bikes */}
              <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                {vehicles.slice(0, 7).map((bike) => {
                  const isSelected = bike._id === activeVehicle._id;
                  return (
                    <div
                      key={bike._id}
                      onClick={() => {
                        setSelectedVehicleId(bike._id);
                        setActiveAngle(1);
                        setImgError(false);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#0E2317] border-emerald-400/50 shadow-md shadow-emerald-950'
                          : 'bg-[#091810] border-white/[0.06] hover:border-emerald-500/30 hover:bg-[#0C1F14]'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        {/* Thumbnail */}
                        <div className="w-14 h-12 rounded-lg bg-white overflow-hidden p-1 flex-shrink-0 flex items-center justify-center">
                          <img
                            src={getOptimizedVehicleImageUrl(bike.images?.[1] || bike.images?.[0] || '')}
                            alt={bike.vehicleModel}
                            className="w-full h-full object-contain scale-[1.2]"
                          />
                        </div>

                        <div className="min-w-0">
                          <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-emerald-300' : 'text-white'}`}>
                            {bike.vehicleModel}
                          </h4>
                          <p className="text-[11px] text-[#8CA899] truncate">
                            {bike.transmissionType === 'Manual' ? 'Côn tay' : bike.transmissionType === 'Automatic' ? 'Tay ga' : 'Xe số'} • ODO {bike.odometer.toLocaleString('vi-VN')} km
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="font-mono font-bold text-white text-sm">
                          {bike.dailyPrice.toLocaleString('vi-VN')}đ
                        </div>
                        <span className="text-[10px] text-[#8CA899]">/ ngày</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Catalog Link */}
              <div className="pt-3 border-t border-white/[0.08]">
                <Link
                  to="/bikes"
                  className="w-full py-3 rounded-xl bg-[#091810] hover:bg-[#0D2216] border border-white/[0.08] hover:border-emerald-500/30 text-emerald-400 font-semibold text-xs flex items-center justify-center space-x-2 transition-all"
                >
                  <Compass className="w-4 h-4" />
                  <span>Xem toàn bộ danh mục xe & bảng giá đầy đủ</span>
                </Link>
              </div>

            </div>

          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mb-3" />
            <p className="text-xs text-slate-400">Đang chuẩn bị phòng trưng bày...</p>
          </div>
        )}

      </section>

      {/* =========================================================================
          3. SCENIC NATURE EXPEDITION PROFILES: BẢN ĐỒ CẮT LỚP ĐỊA HÌNH ĐÈO DỐC
          (THIẾT KẾ ĐỘC BẢN DÀNH RIÊNG CHO ĐỊA HÌNH ĐÀ NẴNG - KHÔNG ĐẠI TRÀ)
          ========================================================================= */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-emerald-500/10">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest mb-2">
              <Mountain className="w-3.5 h-3.5" />
              <span>03 / HỒ SƠ ĐỊA HÌNH & CUNG ĐƯỜNG</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Cẩm Nang Cung Đèo Hải Vân & Sơn Trà
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#8CA899] max-w-xl">
              Cắt lớp độ cao, cự ly và lưu ý kỹ thuật lái xe an toàn trên từng cung đường đặc thù tại Đà Nẵng.
            </p>
          </div>

          {/* Route Tabs */}
          <div className="flex items-center space-x-2 bg-[#091810] p-1.5 rounded-xl border border-white/[0.08]">
            {SCENIC_ROUTES.map((rt, idx) => (
              <button
                key={rt.id}
                onClick={() => setSelectedRouteIndex(idx)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                  selectedRouteIndex === idx
                    ? 'bg-emerald-500 text-[#040D08] font-bold shadow-sm'
                    : 'text-[#8CA899] hover:text-white'
                }`}
              >
                {rt.code}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Route Elevation & Geological Profile Card */}
        <div className="rounded-3xl bg-[#091810] border border-white/[0.08] p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left 7 Columns: Narrative & Terrain Specifications */}
            <div className="lg:col-span-7 space-y-5">
              
              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase font-bold">
                  {currentRoute.code} • {currentRoute.distance} • THỜI GIAN {currentRoute.duration}
                </span>
                <h3 className="text-2xl sm:text-4xl font-black text-white mt-1">
                  {currentRoute.title}
                </h3>
                <p className="text-sm text-emerald-300 font-medium mt-1">
                  {currentRoute.subtitle}
                </p>
              </div>

              <p className="text-xs sm:text-sm text-[#8CA899] leading-relaxed">
                {currentRoute.description}
              </p>

              {/* Terrain Data Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                <div className="p-3 rounded-xl bg-[#040D08] border border-white/5">
                  <div className="text-[10px] text-[#8CA899]">Đỉnh Cao Nhất</div>
                  <div className="font-bold text-white text-sm mt-0.5">{currentRoute.elevation}</div>
                </div>

                <div className="p-3 rounded-xl bg-[#040D08] border border-white/5">
                  <div className="text-[10px] text-[#8CA899]">Độ Dốc Khắt Khe</div>
                  <div className="font-bold text-white text-sm mt-0.5">{currentRoute.grade}</div>
                </div>

                <div className="p-3 rounded-xl bg-[#040D08] border border-white/5 col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-[#8CA899]">Cua Uốn Lượn</div>
                  <div className="font-bold text-emerald-400 text-sm mt-0.5">{currentRoute.hairpins}</div>
                </div>
              </div>

              {/* Safety Guidance Box */}
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/25 text-xs text-emerald-200 space-y-1">
                <div className="font-bold text-emerald-300 flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-400" />
                  <span>Kinh nghiệm phượt địa phương an toàn</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  {currentRoute.safetyNote}
                </p>
              </div>

            </div>

            {/* Right 5 Columns: Vehicle Recommendation & Waypoint Highlights */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6 lg:border-l lg:border-white/[0.08] lg:pl-8">
              
              <div>
                <h4 className="text-xs font-mono uppercase text-[#8CA899] font-bold mb-3">
                  DÒNG XE KHUYÊN DÙNG
                </h4>
                <div className="p-4 rounded-2xl bg-[#040D08] border border-emerald-500/30">
                  <div className="text-emerald-300 font-bold text-sm">
                    {currentRoute.recommendedType}
                  </div>
                  <p className="text-[11px] text-[#8CA899] mt-1 leading-relaxed">
                    Động cơ tối ưu mô-men xoắn, phanh an toàn đĩa đôi / ABS, bám đường ẩm lá thông sương mù.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-mono uppercase text-[#8CA899] font-bold mb-3">
                  TỌA ĐỘ DỪNG CHÂN ĐẶC SẮC
                </h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  {currentRoute.highlights.map((hl, i) => (
                    <li key={i} className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => navigate('/bikes')}
                  className="w-full py-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Chọn xe phù hợp cho {currentRoute.title}</span>
                </button>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          4. THE CIVILIZED MOBILITY MANIFESTO: BẢN TUYÊN NGÔN VĂN HÓA DỊCH VỤ
          (THIẾT KẾ DẠNG ESSAY TẠP CHÍ - LOẠI BỎ 4 HỘP BENTO BOXES CLICHÉ)
          ========================================================================= */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-emerald-500/10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left 5 Columns: Bold Provocative Statement */}
          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block">
              04 / TIÊU CHUẨN VĂN MINH
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
              Chúng tôi từ chối giữ giấy tờ gốc của bạn.
            </h2>
            <p className="text-sm text-[#8CA899] leading-relaxed">
              Dịch vụ thuê xe truyền thống thường làm phiền lòng du khách bằng việc giữ lại CCCD/Hộ chiếu gốc, 
              tráo đổi biển số xe vào phút chót, hoặc bỏ mặc khi xe gặp sự cố hỏng hóc giữa đường. 
              Motorent thiết lập chuẩn mực dịch vụ hoàn toàn khác biệt.
            </p>
          </div>

          {/* Right 7 Columns: 4 Detailed Operational Principles */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="p-6 rounded-2xl bg-[#091810] border border-white/[0.08] flex items-start space-x-4">
              <span className="font-mono font-bold text-emerald-400 text-lg">01</span>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Đối soát số hóa eKYC trong 30 giây</h4>
                <p className="text-xs text-[#8CA899] leading-relaxed">
                  Chụp ảnh CCCD và GPLX trực tiếp trên điện thoại của bạn qua giao thức bảo mật. Bạn giữ trọn vẹn giấy tờ tùy thân để làm thủ tục nhận phòng resort, khách sạn và xuất trình hàng không.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#091810] border border-white/[0.08] flex items-start space-x-4">
              <span className="font-mono font-bold text-emerald-400 text-lg">02</span>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Khóa chính xác biển số xe riêng</h4>
                <p className="text-xs text-[#8CA899] leading-relaxed">
                  Khi cọc 30% trực tuyến, hệ thống khóa đúng biển số xe bạn chọn vào hợp đồng số. Cam kết không tráo đổi mẫu xe, không dời lịch và không tăng giá vào dịp lễ hội hay mùa cao điểm du lịch.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#091810] border border-white/[0.08] flex items-start space-x-4">
              <span className="font-mono font-bold text-emerald-400 text-lg">03</span>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Bàn giao tại cửa Ga T1 & T2 Sân bay Quốc tế</h4>
                <p className="text-xs text-[#8CA899] leading-relaxed">
                  Motorent theo dõi số hiệu chuyến bay của bạn theo thời gian thực. Nhân viên đón bạn tại cửa ra ga đến, bàn giao xe kèm 2 mũ bảo hiểm 3/4 tiệt trùng UV và bắt đầu chuyến đi trong 3 phút.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#091810] border border-white/[0.08] flex items-start space-x-4">
              <span className="font-mono font-bold text-emerald-400 text-lg">04</span>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Đội cứu hộ cơ động 24/7 xuyên suốt đèo dốc</h4>
                <p className="text-xs text-[#8CA899] leading-relaxed">
                  Duy trì đội kỹ thuật trực chiến tại 3 cửa ngõ: Chân đèo Hải Vân, bán đảo Sơn Trà và trung tâm thành phố. Hỗ trợ xử lý sự cố trong 30-45 phút, đổi xe tương đương tận nơi nếu phát sinh lỗi kỹ thuật.
                </p>
              </div>
            </div>

          </div>

        </div>

      </section>

      {/* =========================================================================
          5. EXPEDITION BASECAMPS: 3 TRẠM TIẾP NHIÊN LIỆU & BÀN GIAO TẠI ĐÀ NẴNG
          ========================================================================= */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-emerald-500/10">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block mb-2">
              05 / MẠNG LƯỚI TRẠM GIAO NHẬN
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              3 Trạm Căn Cứ Xuất Phát
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#8CA899] max-w-xl">
              Phủ sóng toàn diện từ cửa ngõ hàng không đến bờ biển Mỹ Khê và chân đèo Hải Vân.
            </p>
          </div>

          <Link
            to="/branches"
            className="inline-flex items-center space-x-1.5 text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300"
          >
            <span>XEM BẢN ĐỒ CHI TIẾT</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {branches.map((branch, idx) => (
            <div
              key={branch._id}
              className="p-6 sm:p-7 rounded-3xl bg-[#091810] border border-white/[0.08] flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-bold">CĂN CỨ 0{idx + 1}</span>
                  <span className="text-[#8CA899]">06:00 — 23:00</span>
                </div>

                <h3 className="text-lg font-bold text-white leading-snug">{branch.name}</h3>

                <p className="text-xs text-[#8CA899] flex items-start space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{branch.address}</span>
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-slate-300 font-mono">{branch.phone}</span>
                <Link
                  to="/branches"
                  className="text-emerald-400 font-bold hover:underline"
                >
                  Chỉ đường
                </Link>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* =========================================================================
          6. NATURE CONSERVATION PLEDGE: DU LỊCH CÓ TRÁCH NHIỆM
          ========================================================================= */}
      <section className="py-12 md:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-10 rounded-3xl bg-[#091810] border border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-mono text-emerald-400 uppercase font-bold">
              BẢO TỒN THIÊN NHIÊN SƠN TRÀ & HẢI VÂN
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Cùng Motorent giữ trọn sự nguyên sơ của đại ngàn
            </h3>
            <p className="text-xs text-[#8CA899] leading-relaxed">
              Mỗi cung đường bạn đi qua xin vui lòng không xả rác, không cho thú hoang ăn, 
              và tuân thủ quy tắc an toàn giao thông đường đèo dốc.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono flex-shrink-0">
            <span className="px-3.5 py-2 rounded-xl bg-[#040D08] border border-white/10 text-emerald-300">
              Euro 4/5 Khí Thải
            </span>
            <span className="px-3.5 py-2 rounded-xl bg-[#040D08] border border-white/10 text-emerald-300">
              Phát Triển Xe Điện Eco
            </span>
          </div>
        </div>
      </section>

    </div>
  );
};
