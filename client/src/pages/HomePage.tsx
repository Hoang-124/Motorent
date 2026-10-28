import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  MapPin,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Navigation,
  ArrowUpRight
} from 'lucide-react';
import { BookingWidget } from '../components/BookingWidget';
import type { Vehicle, Branch } from '../types';
import { api } from '../services/api';
import { getOptimizedVehicleImageUrl } from '../utils/imageHelper';
import { useTranslation } from '../context/I18nContext';

interface BookingSearchCriteria {
  pickupBranchId: string;
  returnBranchId: string;
  pickupDate: string;
  returnDate: string;
}

const ANGLE_VIEWS = [
  { id: 1, label: 'Góc ngang thân xe' },
  { id: 0, label: 'Góc 3/4 phía trước' },
  { id: 2, label: 'Góc sau & khoang lái' },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Gallery Showcase State
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [activeAngle, setActiveAngle] = useState<number>(1);
  const [imgError, setImgError] = useState<boolean>(false);

  // Road Journal Chapter State
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [branchesRes, vehiclesRes] = await Promise.all([
        api.get('/branches'),
        api.get('/vehicles'),
      ]);

      if (branchesRes.data?.data) {
        setBranches(branchesRes.data.data);
      }
      if (vehiclesRes.data?.data) {
        const bikeList = (vehiclesRes.data.data as Vehicle[]).filter(
          (b: Vehicle) => b.status === 'Available'
        );
        setVehicles(bikeList);
        if (bikeList.length > 0) {
          const preferred =
            bikeList.find(
              (b: Vehicle) =>
                b.vehicleModel.includes('160') ||
                b.vehicleModel.includes('Winner') ||
                b.vehicleModel.includes('Air Blade')
            ) || bikeList[0];
          setSelectedVehicleId(preferred._id);
        }
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

  useEffect(() => {
    if (location.hash === '#procedure') {
      const timer = setTimeout(() => {
        const el = document.getElementById('procedure');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.hash, loading]);

  const handleBookingSearch = (criteria: BookingSearchCriteria) => {
    const params = new URLSearchParams();
    if (criteria.pickupBranchId) params.set('pickup', criteria.pickupBranchId);
    if (criteria.returnBranchId) params.set('return', criteria.returnBranchId);
    if (criteria.pickupDate) params.set('pickupDate', criteria.pickupDate);
    if (criteria.returnDate) params.set('returnDate', criteria.returnDate);
    navigate(`/bikes?${params.toString()}`);
  };

  const handleBookVehicle = (v: Vehicle) => {
    navigate(`/booking/${v._id}`);
  };

  const activeVehicle = vehicles.find((v) => v._id === selectedVehicleId) || vehicles[0];

  const SCENIC_ROUTES = [
    {
      id: 'trung-tam-song-han',
      chapter: 'Lộ trình 01',
      title: 'Trung Tâm Phố & Nhịp Cầu Sông Hàn',
      subtitle: 'Kết nối Sân bay, chợ Hàn, phố cà phê Hải Châu và bờ sông lộng gió',
      distance: '8 – 12 km nội thành',
      duration: 'Nửa ngày – Cả ngày',
      elevation: 'Đường nội đô bằng phẳng',
      grade: 'Thuận tiện dừng đỗ',
      surface: 'Đường nhựa trung tâm, làn đường rộng rãi',
      recommendedType: 'Xe Tay Ga Đô Thị (Vision, Air Blade) & Xe Máy Điện',
      description:
        'Lộ trình quen thuộc nhất ngay khi bạn vừa nhận xe từ Sân bay hoặc khách sạn: thong thả ghé những quán cà phê dọc đại lộ Bạch Đằng, dạo qua Cầu Rồng, thưởng thức ẩm thực Chợ Cồn — Chợ Hàn và tận hưởng gió mát ven sông Hàn khi phố lên đèn.',
      mechanicNote:
        'Khu vực trung tâm Hải Châu có nhiều điểm dừng ăn uống, mua sắm. Bạn nên ưu tiên các dòng xe tay ga nhỏ gọn hoặc xe máy điện có cốp rộng để cất gọn 02 mũ bảo hiểm và túi xách cá nhân khi dạo phố.',
      waypoints: [
        'Đường Bạch Đằng & Phố cà phê trung tâm Hải Châu',
        'Cầu Rồng — Cầu Sông Hàn — Chợ Hàn',
        'Công viên APEC & Tuyến phố ven sông',
      ],
      svgPath: 'M 10 78 Q 90 72, 175 76 T 310 70 Q 375 75, 430 73',
      peakX: 310,
      peakY: 70,
    },
    {
      id: 'bien-my-khe',
      chapter: 'Lộ trình 02',
      title: 'Đại Lộ Biển Mỹ Khê & Chùa Linh Ứng',
      subtitle: 'Lướt êm trên tuyến đường ven biển 6 làn xe thoáng đãng bậc nhất Đà Nẵng',
      distance: '15 km ven biển',
      duration: '2 – 3 giờ dạo mát',
      elevation: 'Ven biển thoáng gió',
      grade: 'Rất dễ điều khiển',
      surface: 'Đại lộ Võ Nguyên Giáp — Hoàng Sa phẳng đẹp',
      recommendedType: 'Mọi dòng Xe Tay Ga (Air Blade 160, Vision) & Xe Điện VinFast',
      description:
        'Chạy dọc theo đường Võ Nguyên Giáp ôm trọn bờ cát trắng Mỹ Khê — Phạm Văn Đồng với làn gió mát rượi từ biển Đông. Tuyến đường rộng thoáng dẫn thẳng tới Chùa Linh Ứng Bãi Bụt — nơi bạn có thể ngắm trọn đường chân trời thành phố Đà Nẵng từ phía biển.',
      mechanicNote:
        'Tuyến đường ven biển từ Mỹ Khê lên tới Chùa Linh Ứng hoàn toàn là đường nhựa lớn, mặt đường êm, mọi dòng xe tay ga và xe điện đều vận hành nhẹ nhàng. Khung giờ 16:00 – 18:00 là lúc nắng chiều dịu đẹp nhất để đi dạo.',
      waypoints: [
        'Cầu Tình Yêu & Bến du thuyền Sông Hàn',
        'Bãi biển Mỹ Khê & Công viên Biển Đông',
        'Chùa Linh Ứng Bãi Bụt nhìn về vòng cung thành phố',
      ],
      svgPath: 'M 10 84 Q 115 80, 210 68 T 335 48 Q 385 56, 430 62',
      peakX: 335,
      peakY: 48,
    },
    {
      id: 'ngu-hanh-son-hoi-an',
      chapter: 'Lộ trình 03',
      title: 'Ngoại Ô Ngũ Hành Sơn — Phố Cổ Hội An',
      subtitle: 'Chuyến đi ngoại ô nhẹ nhàng nối liền phố biển Đà Nẵng và thương cảng đèn lồng',
      distance: '28 km đường thẳng',
      duration: '40 phút di chuyển',
      elevation: 'Đường trường ven biển',
      grade: 'Đường thẳng, ít giao lộ',
      surface: 'Trục đường Trường Sa — Lạc Long Quân rộng thoáng',
      recommendedType: 'Honda Air Blade 160, PCX, Future 125 FI hoặc Winner X',
      description:
        'Dành cho những ngày bạn muốn đi xa hơn một chút ra khỏi nội thành: chỉ cần chạy thẳng theo đại lộ ven biển Mỹ Khê — Non Nước để ghé thăm cụm danh thắng Ngũ Hành Sơn, sau đó nối tiếp 15km đường thẳng ven biển là đến ngay Phố cổ Hội An.',
      mechanicNote:
        'Quãng đường ngoại ô khoảng 28km rất bằng phẳng và dễ đi. Hãy chọn dòng xe có yên ngồi êm, sàn để chân thoải mái và tận dụng giá đỡ điện thoại giảm chấn trang bị sẵn trên xe để xem bản đồ thuận tiện.',
      waypoints: [
        'Đại lộ biển Trường Sa & Làng đá mỹ nghệ Non Nước',
        'Danh thắng Ngũ Hành Sơn',
        'Chùa Cầu & Phố cổ Hội An bên sông Hoài',
      ],
      svgPath: 'M 10 82 Q 110 76, 210 80 T 330 78 Q 385 81, 430 82',
      peakX: 210,
      peakY: 80,
    },
  ];

  const currentRoute = SCENIC_ROUTES[selectedRouteIndex];

  // Representative vehicles for the 3 main urban vehicle lines in Hero
  const scooterRep =
    vehicles.find((v) => v.transmissionType === 'Automatic' && v.fuelType !== 'Electric') ||
    vehicles[0];
  const electricRep =
    vehicles.find(
      (v) =>
        v.fuelType === 'Electric' ||
        v.vehicleModel.toLowerCase().includes('vinfast') ||
        v.vehicleModel.toLowerCase().includes('feliz') ||
        v.vehicleModel.toLowerCase().includes('evo')
    ) ||
    vehicles[1] ||
    vehicles[0];
  const gearRep =
    vehicles.find((v) => v.transmissionType !== 'Automatic') ||
    vehicles[2] ||
    vehicles[0];

  const HERO_VEHICLE_LINES = [
    {
      id: 'tay-ga',
      label: t('home.lineScooterTitle'),
      models: scooterRep?.vehicleModel || 'Vision • Air Blade 160',
      highlight: t('home.lineScooterHighlight'),
      priceText: scooterRep ? `${scooterRep.dailyPrice.toLocaleString('vi-VN')}đ/ngày` : 'Từ 130.000đ/ngày',
      imageUrl: getOptimizedVehicleImageUrl(scooterRep?.images?.[1] || scooterRep?.images?.[0]),
      link: '/bikes?type=xe-tay-ga',
      vehicle: scooterRep,
    },
    {
      id: 'xe-dien',
      label: t('home.lineElectricTitle'),
      models: electricRep?.vehicleModel || 'VinFast Feliz S • Evo',
      highlight: t('home.lineElectricHighlight'),
      priceText: electricRep ? `${electricRep.dailyPrice.toLocaleString('vi-VN')}đ/ngày` : 'Từ 150.000đ/ngày',
      imageUrl: getOptimizedVehicleImageUrl(electricRep?.images?.[1] || electricRep?.images?.[0]),
      link: '/bikes?type=xe-dien',
      vehicle: electricRep,
    },
    {
      id: 'xe-so',
      label: t('home.lineGearTitle'),
      models: gearRep?.vehicleModel || 'Wave Alpha • Future • Winner',
      highlight: t('home.lineGearHighlight'),
      priceText: gearRep ? `${gearRep.dailyPrice.toLocaleString('vi-VN')}đ/ngày` : 'Từ 100.000đ/ngày',
      imageUrl: getOptimizedVehicleImageUrl(gearRep?.images?.[1] || gearRep?.images?.[0]),
      link: '/bikes?type=xe-so',
      vehicle: gearRep,
    },
  ];

  // Match 2 real vehicles for each route in Section 3
  const getRouteRecommendedVehicles = (routeIdx: number): Vehicle[] => {
    if (vehicles.length === 0) return [];
    if (routeIdx === 0) {
      // City center: compact scooters + electric bikes
      const cityBikes = vehicles.filter(
        (v) => v.transmissionType === 'Automatic' || v.fuelType === 'Electric'
      );
      return (cityBikes.length >= 2 ? cityBikes : vehicles).slice(0, 2);
    }
    if (routeIdx === 1) {
      // Coastal boulevard: Air Blade / Vision / Electric
      const coastalBikes = vehicles.filter(
        (v) =>
          v.vehicleModel.toLowerCase().includes('air') ||
          v.vehicleModel.toLowerCase().includes('vision') ||
          v.fuelType === 'Electric' ||
          v.transmissionType === 'Automatic'
      );
      return (coastalBikes.length >= 2 ? coastalBikes.slice(0, 2) : vehicles.slice(0, 2));
    }
    // Suburban Hội An trip: 160cc scooters, Future, Winner, PCX
    const suburbanBikes = vehicles.filter(
      (v) =>
        v.vehicleModel.includes('160') ||
        v.vehicleModel.toLowerCase().includes('future') ||
        v.vehicleModel.toLowerCase().includes('winner') ||
        v.vehicleModel.toLowerCase().includes('pcx') ||
        v.transmissionType !== 'Automatic'
    );
    return (suburbanBikes.length >= 2 ? suburbanBikes.slice(0, 2) : vehicles.slice(0, 2));
  };

  const routeVehicles = getRouteRecommendedVehicles(selectedRouteIndex);

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] bg-editorial-grain">
      {/* =========================================================================
          1. EDITORIAL HERO & ARCHITECTURAL DISPATCH TICKET
          ========================================================================= */}
      <section className="relative pt-8 pb-16 md:pt-12 md:pb-24 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Asymmetric 12-Column Composition */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

            {/* Left 7 Columns: Urban Mobility Narrative & 3 Vehicle Line Showcases */}
            <div className="lg:col-span-7 space-y-7 pt-1 animate-fade-up">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#FFC799] font-medium">
                  {t('home.heroBadge')}
                </p>

                <h1 className="text-4xl sm:text-6xl lg:text-[64px] font-bold tracking-tight text-[#F5F5F5] leading-[1.08]">
                  {t('home.heroTitleMain')}
                  <br />
                  <span className="font-serif-display italic font-normal text-[#FFC799]">
                    {t('home.heroTitleAccent')}
                  </span>
                </h1>
              </div>

              <p className="text-base sm:text-[17px] text-[#A0A0A0] font-normal leading-[1.75] max-w-xl">
                {t('home.heroDescription')}
              </p>

              {/* 3 Featured Urban Vehicle Lines with Studio Photography */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase tracking-[0.15em] text-[#FFC799] font-medium">
                    {t('home.featuredHeading')}
                  </span>
                  <Link
                    to="/bikes"
                    className="text-[11px] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors flex items-center space-x-1"
                  >
                    <span>{t('home.viewAllVehicles')}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {HERO_VEHICLE_LINES.map((line) => (
                    <div
                      key={line.id}
                      onClick={() => navigate(line.link)}
                      className="group bg-[#161616] rounded-xl border border-white/10 p-3 smooth-card-hover cursor-pointer flex flex-col justify-between"
                    >
                      <div className="w-full h-24 rounded-lg studio-paper-backdrop overflow-hidden flex items-center justify-center p-2 mb-2.5 relative">
                        {line.imageUrl ? (
                          <img
                            src={line.imageUrl}
                            alt={line.label}
                            loading="lazy"
                            crossOrigin="anonymous"
                            className="w-full h-full object-contain scale-110 group-hover:scale-125 transition-transform duration-500 mix-blend-multiply"
                          />
                        ) : (
                          <span className="text-[10px] font-medium text-slate-600">{line.label}</span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-[#F5F5F5] group-hover:text-[#FFC799] transition-colors">
                            {line.label}
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#FFC799] shrink-0 opacity-80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </div>
                        <p className="text-[11px] text-[#A0A0A0] truncate mt-0.5">{line.models}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06] text-[10px]">
                          <span className="text-[#6E6E6E]">{line.highlight.split('•')[0].trim()}</span>
                          <span className="font-mono-tabular font-semibold text-[#FFC799]">
                            {line.priceText}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Architectural Dispatch Ticket */}
            <div className="lg:col-span-5 animate-fade-up-delay-1">
              <BookingWidget branches={branches} onSearch={handleBookingSearch} />
            </div>

          </div>

        </div>
      </section>

      {/* Error Alert Notice */}
      {error && (
        <section className="max-w-4xl mx-auto my-6 px-4">
          <div className="p-4 bg-[#1E1E1E] border border-[#FFC799]/40 rounded-xl flex items-center justify-between text-xs sm:text-sm text-[#F5F5F5]">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#FFC799]" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchData}
              className="px-3.5 py-1.5 bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] rounded-lg font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          </div>
        </section>
      )}

      {/* =========================================================================
          2. ATELIER SHOWROOM: DANH MỤC XE ĐÔ THỊ & TRƯNG BÀY THỰC TẾ
          ========================================================================= */}
      <section className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-white/[0.08]">

        {/* Composed Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.18em] text-[#FFC799] font-medium mb-2">
              Danh Mục Xe Đời Mới 2023 – 2024
            </p>
            <h2 className="text-3xl sm:text-5xl font-bold text-[#F5F5F5] tracking-tight leading-tight">
              Tuyển chọn xe đi phố,{' '}
              <span className="font-serif-display italic font-normal text-[#FFC799]">
                êm ái và tiện nghi.
              </span>
            </h2>
          </div>

          <Link
            to="/bikes"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-[#F5F5F5] hover:text-[#FFC799] pb-1 border-b border-[#FFC799]/50 transition-colors self-start md:self-auto"
          >
            <span>Mở toàn bộ danh mục ({vehicles.length} chiếc)</span>
            <ArrowUpRight className="w-4 h-4 text-[#FFC799]" />
          </Link>
        </div>

        {activeVehicle && !loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

            {/* Left 5 Columns: Open Typographic Index with Studio Thumbnails */}
            <div className="lg:col-span-5">
              <div className="flex items-center justify-between pb-3 text-[11px] uppercase tracking-[0.14em] text-[#6E6E6E] border-b border-white/10">
                <span>Danh mục trưng bày</span>
                <span>Giá niêm yết / ngày</span>
              </div>

              <div className="divide-y divide-white/[0.08] border-b border-white/10">
                {vehicles.slice(0, 6).map((bike) => {
                  const isSelected = bike._id === activeVehicle._id;
                  const thumbUrl = getOptimizedVehicleImageUrl(bike.images?.[1] || bike.images?.[0]);
                  return (
                    <button
                      key={bike._id}
                      type="button"
                      onClick={() => {
                        setSelectedVehicleId(bike._id);
                        setActiveAngle(1);
                        setImgError(false);
                      }}
                      className={`w-full py-3.5 px-3 text-left transition-all flex items-center justify-between gap-3.5 cursor-pointer ${
                        isSelected
                          ? 'bg-white/[0.04] text-[#F5F5F5]'
                          : 'text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          className={`w-14 h-10 rounded-lg studio-paper-backdrop overflow-hidden flex items-center justify-center p-1 shrink-0 border transition-colors ${
                            isSelected ? 'border-[#FFC799]' : 'border-white/10'
                          }`}
                        >
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={bike.vehicleModel}
                              loading="lazy"
                              crossOrigin="anonymous"
                              className="w-full h-full object-contain scale-110 mix-blend-multiply"
                            />
                          ) : (
                            <span className="text-[9px] font-mono-tabular text-slate-700">XE</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4
                            className={`text-sm sm:text-base truncate ${
                              isSelected ? 'font-bold text-[#F5F5F5]' : 'font-medium'
                            }`}
                          >
                            {bike.vehicleModel}
                          </h4>
                          <p className="text-[11px] text-[#6E6E6E] truncate mt-0.5">
                            {bike.transmissionType === 'Manual'
                              ? 'Côn tay thể thao'
                              : bike.transmissionType === 'Automatic'
                              ? 'Tay ga đô thị'
                              : 'Xe số tiết kiệm'}{' '}
                            • Biển số {bike.licensePlate}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center space-x-2.5">
                        <div>
                          <span className="font-mono-tabular font-semibold text-sm text-[#F5F5F5] block">
                            {bike.dailyPrice.toLocaleString('vi-VN')} đ
                          </span>
                          <span className="text-[10px] text-[#6E6E6E] font-mono-tabular">
                            ODO {bike.odometer.toLocaleString('vi-VN')}km
                          </span>
                        </div>
                        <span
                          className={`w-1.5 h-1.5 rounded-full transition-opacity ${
                            isSelected ? 'bg-[#FFC799] opacity-100' : 'opacity-0'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-5 flex items-center justify-between text-xs text-[#A0A0A0]">
                <span>Tất cả xe đều kèm 02 mũ 3/4 khử trùng tia UV &amp; 02 áo mưa</span>
                <Link to="/bikes" className="text-[#FFC799] hover:underline font-medium shrink-0 ml-2">
                  Xem thêm →
                </Link>
              </div>
            </div>

            {/* Right 7 Columns: Studio Stage & Open Spec Sheet */}
            <div className="lg:col-span-7 space-y-6">

              {/* Studio Canvas */}
              <div className="relative w-full h-72 sm:h-[380px] studio-paper-backdrop rounded-2xl overflow-hidden flex items-center justify-center p-6 border border-white/10">

                {/* Top Left Plate & Year Stamp */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 rounded bg-[#101010] text-[#F5F5F5] font-mono-tabular font-semibold text-xs">
                      {activeVehicle.licensePlate}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-[#101010]/10 text-[#101010] font-medium text-xs border border-black/10">
                      Sản xuất {activeVehicle.yearManufactured || 2024}
                    </span>
                  </div>

                  <span className="inline-flex items-center px-3 py-1 rounded bg-[#101010]/90 text-[#F5F5F5] text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#99FFE4] mr-2" />
                    Sẵn sàng tại trạm
                  </span>
                </div>

                {/* High-Resolution Bike Image */}
                {activeVehicle.images && activeVehicle.images[activeAngle] && !imgError ? (
                  <img
                    key={`${activeVehicle._id}-${activeAngle}`}
                    src={getOptimizedVehicleImageUrl(activeVehicle.images[activeAngle])}
                    alt={activeVehicle.vehicleModel}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-contain scale-[1.26] transition-all duration-500 animate-bike-stage mix-blend-multiply"
                  />
                ) : (
                  <div className="text-center text-[#47524D] py-8">
                    <p className="font-semibold text-sm">Ảnh chụp thực tế tại trạm Motorent</p>
                    <p className="text-xs mt-1">Nguyên bản theo biển số {activeVehicle.licensePlate}</p>
                  </div>
                )}

                {/* Angle Switcher Bar */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-1 bg-[#101010]/90 p-1 rounded-xl z-10">
                  {ANGLE_VIEWS.map((ang) => (
                    <button
                      key={ang.id}
                      type="button"
                      onClick={() => {
                        setActiveAngle(ang.id);
                        setImgError(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeAngle === ang.id
                          ? 'bg-[#F5F5F5] text-[#101010] font-semibold'
                          : 'text-[#A0A0A0] hover:text-[#F5F5F5]'
                      }`}
                    >
                      {ang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Open Architectural Specification Ledger */}
              <div key={activeVehicle._id} className="pt-2 animate-fade-scale">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-white/[0.08]">
                  <div>
                    <span className="text-xs uppercase tracking-[0.15em] text-[#FFC799] font-medium">
                      Thông tin phương tiện • {activeVehicle.brand}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] mt-0.5">
                      {activeVehicle.vehicleModel}
                    </h3>
                  </div>

                  <div className="flex items-baseline space-x-4">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-[#6E6E6E] block">Giá thuê trọn gói</span>
                      <span className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] font-mono-tabular">
                        {activeVehicle.dailyPrice.toLocaleString('vi-VN')}
                      </span>
                      <span className="text-xs text-[#A0A0A0] ml-1">đ/ngày</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleBookVehicle(activeVehicle)}
                      className="px-6 py-3.5 rounded-xl bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] font-semibold text-xs sm:text-sm transition-all active:scale-95 flex items-center space-x-2 cursor-pointer shrink-0"
                    >
                      <span>Giữ chiếc xe này</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>
                </div>

                {/* 4-Column Hairline Spec Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] border-b border-white/[0.08] text-xs">
                  <div className="py-3.5 pr-4">
                    <span className="text-[11px] text-[#6E6E6E] block">Đồng hồ ODO thực</span>
                    <span className="font-mono-tabular font-semibold text-[#F5F5F5] text-sm mt-0.5 block">
                      {activeVehicle.odometer.toLocaleString('vi-VN')} km
                    </span>
                  </div>

                  <div className="py-3.5 sm:px-4">
                    <span className="text-[11px] text-[#6E6E6E] block">Truyền động</span>
                    <span className="font-semibold text-[#F5F5F5] text-sm mt-0.5 block">
                      {activeVehicle.transmissionType === 'Manual'
                        ? 'Côn tay 6 cấp'
                        : activeVehicle.transmissionType === 'Automatic'
                        ? 'Vô cấp tự động'
                        : 'Hộp số 4 cấp'}
                    </span>
                  </div>

                  <div className="py-3.5 pr-4 sm:px-4">
                    <span className="text-[11px] text-[#6E6E6E] block">Tiêu hao nhiên liệu</span>
                    <span className="font-mono-tabular font-semibold text-[#F5F5F5] text-sm mt-0.5 block">
                      {activeVehicle.fuelType === 'Electric' ? 'Điện ~198km' : '~1.8 L / 100km'}
                    </span>
                  </div>

                  <div className="py-3.5 sm:pl-4">
                    <span className="text-[11px] text-[#6E6E6E] block">Mức cọc giữ biển số (30%)</span>
                    <span className="font-mono-tabular font-semibold text-[#FFC799] text-sm mt-0.5 block">
                      {Math.round(activeVehicle.dailyPrice * 0.3).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-[#FFC799] mb-3" />
            <p className="text-xs text-[#A0A0A0]">Đang tải danh sách xe tại trạm...</p>
          </div>
        )}

      </section>

      {/* =========================================================================
          3. THE DA NANG CITY & COASTAL GUIDE: GỢI Ý LỘ TRÌNH DẠO PHỐ
          ========================================================================= */}
      <section className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-white/[0.08]">

        {/* Journal Masthead & Chapter Selector */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6 pb-8 border-b border-white/[0.08]">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.18em] text-[#FFC799] font-medium mb-2">
              Cẩm Nang Di Chuyển Đô Thị &amp; Ven Biển
            </p>
            <h2 className="text-3xl sm:text-5xl font-bold text-[#F5F5F5] tracking-tight leading-tight">
              Ba lộ trình dạo phố{' '}
              <span className="font-serif-display italic font-normal text-[#FFC799]">
                được yêu thích nhất.
              </span>
            </h2>
          </div>

          {/* Editorial Chapter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {SCENIC_ROUTES.map((rt, idx) => {
              const active = selectedRouteIndex === idx;
              return (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => setSelectedRouteIndex(idx)}
                  className={`px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center space-x-2 border ${
                    active
                      ? 'bg-[#F5F5F5] text-[#101010] border-[#F5F5F5] font-semibold'
                      : 'bg-[#161616] text-[#A0A0A0] border-white/10 hover:text-[#F5F5F5] hover:border-white/25'
                  }`}
                >
                  <span className="font-serif-display italic text-sm">{rt.chapter}:</span>
                  <span>{rt.title.split('&')[0].split('—')[0].trim()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Open Editorial Spread for Active Chapter */}
        <div key={currentRoute.id} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start animate-fade-up">

          {/* Left 7 Columns: Narrative & Practical City Note */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-3 text-xs text-[#FFC799]">
                <span className="font-serif-display italic text-lg">{currentRoute.chapter}</span>
                <span>—</span>
                <span className="uppercase tracking-[0.14em] font-medium">{currentRoute.distance}</span>
                <span>•</span>
                <span>{currentRoute.duration}</span>
              </div>

              <h3 className="text-2xl sm:text-4xl font-bold text-[#F5F5F5] tracking-tight">
                {currentRoute.title}
              </h3>

              <p className="font-serif-display italic text-lg sm:text-xl text-[#FFC799]">
                “{currentRoute.subtitle}”
              </p>
            </div>

            <p className="text-sm sm:text-base text-[#A0A0A0] leading-[1.8]">
              {currentRoute.description}
            </p>

            {/* Open 3-Column Route Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] border-y border-white/[0.08] py-4 text-xs">
              <div className="pb-3 sm:pb-0 sm:pr-4">
                <span className="text-[11px] text-[#6E6E6E] block">Đặc trưng lộ trình</span>
                <span className="font-mono-tabular font-semibold text-[#F5F5F5] text-sm mt-0.5 block">
                  {currentRoute.elevation}
                </span>
              </div>
              <div className="py-3 sm:py-0 sm:px-4">
                <span className="text-[11px] text-[#6E6E6E] block">Nhịp độ di chuyển</span>
                <span className="font-mono-tabular font-semibold text-[#F5F5F5] text-sm mt-0.5 block">
                  {currentRoute.grade}
                </span>
              </div>
              <div className="pt-3 sm:pt-0 sm:pl-4">
                <span className="text-[11px] text-[#6E6E6E] block">Tuyến đường chính</span>
                <span className="font-semibold text-[#FFC799] text-xs mt-0.5 block">
                  {currentRoute.surface}
                </span>
              </div>
            </div>

            {/* Practical City Riding Note */}
            <div className="pl-5 border-l-2 border-[#FFC799] space-y-1.5 py-1">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F5F5F5] flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#FFC799]" />
                <span>Gợi ý di chuyển thuận tiện trong phố</span>
              </div>
              <p className="text-xs sm:text-sm text-[#A0A0A0] leading-relaxed">
                {currentRoute.mechanicNote}
              </p>
            </div>
          </div>

          {/* Right 5 Columns: Recommended Vehicle Models Gallery & Waypoints */}
          <div className="lg:col-span-5 bg-[#161616] rounded-2xl border border-white/10 p-6 sm:p-7 space-y-6 smooth-card-hover">

            {/* Recommended Vehicles with Studio Photos */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-[#A0A0A0] mb-3">
                <span className="uppercase tracking-[0.14em] font-medium text-[#FFC799]">
                  Dòng xe gợi ý cho lộ trình này
                </span>
                <span className="font-mono-tabular">{currentRoute.distance}</span>
              </div>

              {routeVehicles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {routeVehicles.map((rv) => {
                    const rvImg = getOptimizedVehicleImageUrl(rv.images?.[1] || rv.images?.[0]);
                    return (
                      <div
                        key={rv._id}
                        onClick={() => handleBookVehicle(rv)}
                        className="group bg-[#1E1E1E] rounded-xl border border-white/10 p-3 cursor-pointer transition-all hover:border-[#FFC799]"
                      >
                        <div className="w-full h-28 rounded-lg studio-paper-backdrop overflow-hidden flex items-center justify-center p-2 mb-2.5">
                          {rvImg ? (
                            <img
                              src={rvImg}
                              alt={rv.vehicleModel}
                              loading="lazy"
                              crossOrigin="anonymous"
                              className="w-full h-full object-contain scale-110 group-hover:scale-125 transition-transform duration-500 mix-blend-multiply"
                            />
                          ) : (
                            <span className="text-[10px] font-medium text-slate-600">{rv.vehicleModel}</span>
                          )}
                        </div>
                        <div className="flex items-baseline justify-between gap-1">
                          <h4 className="text-xs font-bold text-[#F5F5F5] group-hover:text-[#FFC799] transition-colors truncate">
                            {rv.vehicleModel}
                          </h4>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          <span className="text-[#A0A0A0]">
                            {rv.fuelType === 'Electric'
                              ? 'Xe máy điện'
                              : rv.transmissionType === 'Automatic'
                              ? 'Tay ga đô thị'
                              : 'Xe số / Côn tay'}
                          </span>
                          <span className="font-mono-tabular font-semibold text-[#FFC799]">
                            {rv.dailyPrice.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#101010] border border-white/[0.06] text-xs text-[#A0A0A0]">
                  {currentRoute.recommendedType}
                </div>
              )}

              <p className="text-xs text-[#A0A0A0] mt-3">
                Phù hợp nhất: <strong className="text-[#F5F5F5] font-medium">{currentRoute.recommendedType}</strong>
              </p>
            </div>

            {/* Waypoints List */}
            <div className="pt-2 border-t border-white/[0.08]">
              <span className="text-[10px] uppercase tracking-[0.14em] text-[#6E6E6E] block mb-2.5">
                Điểm dừng chân dọc lộ trình
              </span>
              <ul className="space-y-2 text-xs text-[#A0A0A0]">
                {currentRoute.waypoints.map((wp, i) => (
                  <li key={i} className="flex items-baseline space-x-2.5">
                    <span className="font-mono-tabular text-[10px] text-[#FFC799]">0{i + 1}.</span>
                    <span className="text-[#F5F5F5]">{wp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => navigate('/bikes')}
              className="w-full py-3 px-4 rounded-xl bg-white/[0.05] hover:bg-[#F5F5F5] text-[#F5F5F5] hover:text-[#101010] border border-white/10 font-semibold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Chọn xe đi {currentRoute.title.split('&')[0].split('—')[0].trim()}</span>
            </button>

          </div>

        </div>
      </section>

      {/* =========================================================================
          4. THE SERVICE PHILOSOPHY: BỐN NGUYÊN TẮC TỬ TẾ (#procedure)
          ========================================================================= */}
      <section id="procedure" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-white/[0.08] scroll-mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* Left 5 Columns: Editorial Manifesto */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-28">
            <p className="text-xs uppercase tracking-[0.18em] text-[#FFC799] font-medium">
              Triết Lý Vận Hành &amp; Quy Trình
            </p>
            <h2 className="text-3xl sm:text-5xl font-bold text-[#F5F5F5] leading-[1.12] tracking-tight">
              Chúng tôi từ chối giữ{' '}
              <span className="font-serif-display italic font-normal text-[#FFC799]">
                giấy tờ tùy thân gốc của bạn.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-[#A0A0A0] leading-relaxed pt-2">
              Thuê xe máy tại một thành phố biển hiện đại không nên bắt đầu bằng sự nghi ngại. Motorent loại bỏ hoàn toàn thói quen giữ lại CCCD/Hộ chiếu bản gốc hay giao xe ngẫu nhiên vào phút chót.
            </p>
          </div>

          {/* Right 7 Columns: Open Hairline Ledger with Serif Roman Numerals */}
          <div className="lg:col-span-7 divide-y divide-white/[0.08] border-y border-white/[0.08]">

            <div className="py-7 flex items-start space-x-6">
              <span className="font-serif-display italic text-3xl text-[#FFC799] w-8 shrink-0 leading-none pt-1">
                I.
              </span>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-[#F5F5F5]">
                  Định danh số hóa eKYC — Giữ trọn CCCD gốc bên mình
                </h3>
                <p className="text-xs sm:text-sm text-[#A0A0A0] leading-relaxed">
                  Bạn chỉ cần chụp ảnh CCCD và Bằng lái xe một lần trên hệ thống có đóng dấu bảo mật tự động. Khi nhận xe tại trạm, nhân viên đối chiếu trong 30 giây và trả lại toàn bộ giấy tờ gốc để bạn thoải mái nhận phòng khách sạn hoặc làm thủ tục bay.
                </p>
              </div>
            </div>

            <div className="py-7 flex items-start space-x-6">
              <span className="font-serif-display italic text-3xl text-[#FFC799] w-8 shrink-0 leading-none pt-1">
                II.
              </span>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-[#F5F5F5]">
                  Đặt cọc 30% khóa đích danh biển số xe đã chọn
                </h3>
                <p className="text-xs sm:text-sm text-[#A0A0A0] leading-relaxed">
                  Bạn chọn chiếc xe nào trên danh mục, hệ thống khóa đúng biển số chiếc xe đó cho lịch trình của bạn. Không đánh tráo sang xe cũ hơn, không tăng giá vào dịp lễ pháo hoa hay cuối tuần.
                </p>
              </div>
            </div>

            <div className="py-7 flex items-start space-x-6">
              <span className="font-serif-display italic text-3xl text-[#FFC799] w-8 shrink-0 leading-none pt-1">
                III.
              </span>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-[#F5F5F5]">
                  Nhận xe tại Sân bay Đà Nẵng, trả xe tại Biển Mỹ Khê (Phụ phí 0đ)
                </h3>
                <p className="text-xs sm:text-sm text-[#A0A0A0] leading-relaxed">
                  Vừa bước ra khỏi cửa ga đến T1/T2 là có thể nhận xe vào trung tâm ngay. Kết thúc kỳ nghỉ, bạn có thể trả xe tại bất kỳ trạm nào trong mạng lưới Đà Nẵng mà không tốn phí điều chuyển một chiều.
                </p>
              </div>
            </div>

            <div className="py-7 flex items-start space-x-6">
              <span className="font-serif-display italic text-3xl text-[#FFC799] w-8 shrink-0 leading-none pt-1">
                IV.
              </span>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-[#F5F5F5]">
                  Hỗ trợ kỹ thuật tận nơi trong nội thành 24/7
                </h3>
                <p className="text-xs sm:text-sm text-[#A0A0A0] leading-relaxed">
                  Dù bạn đang dạo phố trung tâm Hải Châu, ven biển Mỹ Khê hay trên đường đi Hội An, đội kỹ thuật lưu động luôn túc trực để hỗ trợ tận nơi trong vòng 15–30 phút và đổi ngay một chiếc xe tương đương nếu phát sinh sự cố.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          5. ARCHITECTURAL STATION DIRECTORY: MẠNG LƯỚI TRẠM ĐÀ NẴNG
          ========================================================================= */}
      <section className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#FFC799] font-medium mb-2">
              Hệ Thống Trạm Giao Nhận
            </p>
            <h2 className="text-3xl sm:text-5xl font-bold text-[#F5F5F5] tracking-tight">
              Điểm xuất phát{' '}
              <span className="font-serif-display italic font-normal text-[#FFC799]">
                trên khắp Đà Nẵng.
              </span>
            </h2>
          </div>

          <Link
            to="/branches"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#F5F5F5] hover:text-[#FFC799] pb-1 border-b border-[#FFC799]/50 transition-colors self-start md:self-auto"
          >
            <span>Xem chi tiết từng trạm</span>
            <ArrowUpRight className="w-4 h-4 text-[#FFC799]" />
          </Link>
        </div>

        {/* Open Architectural Hairline Grid */}
        <div
          className={`grid grid-cols-1 ${
            branches.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
          } divide-y md:divide-y-0 md:divide-x divide-white/[0.08] border-y border-white/[0.08]`}
        >
          {branches.map((branch, idx) => (
            <div
              key={branch._id}
              className={`py-8 flex flex-col justify-between space-y-6 ${
                idx === 0 ? 'md:pr-8' : branches.length === 2 ? 'md:pl-8' : idx === 1 ? 'md:px-8' : 'md:pl-8'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-serif-display italic text-lg text-[#FFC799]">
                    Trạm 0{idx + 1} • {branch.code}
                  </span>
                  <span className="font-mono-tabular text-[11px] text-[#A0A0A0]">
                    {branch.hours_open || '06:00'} – {branch.hours_close || '23:00'}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-[#F5F5F5] leading-snug">
                  {branch.name}
                </h3>

                <p className="text-xs sm:text-sm text-[#A0A0A0] flex items-start space-x-2 leading-relaxed">
                  <MapPin className="w-4 h-4 text-[#FFC799] flex-shrink-0 mt-0.5" />
                  <span>{branch.address}</span>
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <a
                  href={`tel:${branch.phone}`}
                  className="text-[#F5F5F5] font-mono-tabular hover:text-[#FFC799] transition-colors"
                >
                  {branch.phone}
                </a>
                <Link
                  to={`/bikes?pickup=${branch._id}`}
                  className="inline-flex items-center space-x-1 text-[#FFC799] font-semibold hover:underline"
                >
                  <span>Nhận xe tại trạm này</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

      </section>

    </div>
  );
};

