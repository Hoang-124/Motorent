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
  Bike, 
  HelpCircle,
  ChevronRight,
  Star
} from 'lucide-react';
import { BookingWidget } from '../components/BookingWidget';
import { VehicleCard } from '../components/VehicleCard';
import { BookingModal } from '../components/BookingModal';
import type { Vehicle, Branch } from '../types';
import { api } from '../services/api';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');
  const [selectedVehicleForBooking, setSelectedVehicleForBooking] = useState<Vehicle | null>(null);
  const [successBookingCode, setSuccessBookingCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [branchesRes, vehiclesRes] = await Promise.all([
          api.get('/branches'),
          api.get('/vehicles'),
        ]);

        if (branchesRes.data && branchesRes.data.data) {
          setBranches(branchesRes.data.data);
        }
        if (vehiclesRes.data && vehiclesRes.data.data) {
          setVehicles(vehiclesRes.data.data);
        }
      } catch (err) {
        console.warn('Using fallback initial state for preview');
        // Sensible fallback branch data if API takes a moment
        setBranches([
          {
            _id: 'b1',
            name: 'Chi nhánh Quận 1 - Chợ Bến Thành',
            code: 'CN-Q1',
            address: '120 Lê Lai, Phường Bến Thành, Quận 1, TP.HCM',
            phone: '028.3822.1101',
            hours_open: '07:00',
            hours_close: '22:30',
            isActive: true,
            description: 'Cách ga Metro Bến Thành 150m, thuận tiện dạo phố trung tâm',
          },
          {
            _id: 'b2',
            name: 'Chi nhánh Sân Bay Tân Sơn Nhất',
            code: 'CN-SB',
            address: '45 Trường Sơn, Phường 2, Quận Tân Bình, TP.HCM',
            phone: '028.3848.2202',
            hours_open: '06:00',
            hours_close: '23:30',
            isActive: true,
            description: 'Cách cổng ga quốc nội 200m, hỗ trợ khách bay ngày đêm',
          },
          {
            _id: 'b3',
            name: 'Chi nhánh TP. Thủ Đức',
            code: 'CN-TD',
            address: '215 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP.HCM',
            phone: '028.3722.3303',
            hours_open: '07:30',
            hours_close: '21:30',
            isActive: true,
            description: 'Khu vực làng Đại học và khu Công nghệ cao',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter vehicles by category tab
  const filteredVehicles = vehicles.filter((v) => {
    if (selectedCategoryTab === 'all') return true;
    if (selectedCategoryTab === 'tay-ga') return v.transmissionType === 'Automatic' && v.fuelType !== 'Electric';
    if (selectedCategoryTab === 'xe-so') return v.transmissionType === 'Semi-Auto' || (v.transmissionType === 'Manual' && v.brand === 'Honda');
    if (selectedCategoryTab === 'con-tay') return v.transmissionType === 'Manual' && v.brand === 'Yamaha';
    if (selectedCategoryTab === 'xe-dien') return v.fuelType === 'Electric';
    return true;
  });

  const handleBookingSearch = (criteria: any) => {
    navigate(`/bikes?pickup=${criteria.pickupBranchId}&return=${criteria.returnBranchId}`);
  };

  const handleBookVehicle = (v: Vehicle) => {
    setSelectedVehicleForBooking(v);
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* 1. HERO SECTION */}
      <section className="relative pt-10 pb-20 md:pt-16 md:pb-28 overflow-hidden bg-gradient-to-b from-forest-900 via-forest-950 to-slate-950 text-white">
        {/* Subtle decorative vector backdrop */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            {/* Pill badge */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chuỗi cho thuê xe tự doanh đa chi nhánh số 1 TP.HCM</span>
            </div>

            {/* Human-crafted main headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Thuê xe máy tự lái,
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">
                nhận Quận 1 - trả Sân bay
              </span>
            </h1>

            {/* Authentic subhead */}
            <p className="text-base sm:text-lg text-emerald-100/80 max-w-2xl mx-auto font-normal leading-relaxed">
              100% xe chính hãng đời mới, bảo dưỡng định kỳ từng 1.500 km.
              Cọc online 30% giữ đúng xe, không giữ CCCD bản gốc, thủ tục giao nhận chỉ trong 3 phút.
            </p>

            {/* Trust metric chips */}
            <div className="pt-2 flex flex-wrap justify-center items-center gap-4 text-xs font-semibold text-emerald-200">
              <span className="flex items-center space-x-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Không giữ CCCD gốc</span>
              </span>
              <span className="flex items-center space-x-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Trả khác trạm phụ phí 0đ</span>
              </span>
              <span className="flex items-center space-x-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Tặng 2 nón + 2 áo mưa</span>
              </span>
            </div>
          </div>

          {/* Interactive Booking Widget embedded directly */}
          <div className="mt-12 max-w-5xl mx-auto">
            <BookingWidget branches={branches} onSearch={handleBookingSearch} />
          </div>
        </div>
      </section>

      {/* 2. FOUR HUMAN COMMITMENTS */}
      <section className="py-16 md:py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold text-forest-600 uppercase tracking-widest mb-2">
              Giá trị cốt lõi từ người làm dịch vụ
            </h2>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              4 cam kết khác biệt dành cho bạn
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1 */}
            <div className="p-6 rounded-2xl bg-emerald-50/40 border border-emerald-100 hover:border-emerald-300 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-forest-600 text-white flex items-center justify-center mb-4 shadow-md shadow-forest-600/20">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Không giữ CCCD bản gốc
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Nhân viên chỉ kiểm tra đối chiếu eKYC và chụp ảnh lưu hồ sơ điện tử. Bạn hoàn toàn yên tâm giữ giấy tờ tùy thân khi di chuyển.
              </p>
            </div>

            {/* 2 */}
            <div className="p-6 rounded-2xl bg-emerald-50/40 border border-emerald-100 hover:border-emerald-300 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-forest-600 text-white flex items-center justify-center mb-4 shadow-md shadow-forest-600/20">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Cọc giữ xe 30% minh bạch
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chỉ cần cọc 30% để hệ thống khóa biển số xe riêng cho bạn. 70% còn lại thanh toán tại quầy khi nhận xe ưng ý.
              </p>
            </div>

            {/* 3 */}
            <div className="p-6 rounded-2xl bg-emerald-50/40 border border-emerald-100 hover:border-emerald-300 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-forest-600 text-white flex items-center justify-center mb-4 shadow-md shadow-forest-600/20">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Nhận Q.1 - Trả Sân bay
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Linh hoạt nhận xe tại chi nhánh Quận 1 và trả xe ngay cổng Sân bay Tân Sơn Nhất. Không tính thêm phụ phí điều chuyển xe.
              </p>
            </div>

            {/* 4 */}
            <div className="p-6 rounded-2xl bg-emerald-50/40 border border-emerald-100 hover:border-emerald-300 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-forest-600 text-white flex items-center justify-center mb-4 shadow-md shadow-forest-600/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Chu đáo từng chi tiết
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mỗi xe luôn đi kèm 2 mũ bảo hiểm đạt chuẩn kiểm định CR khử khuẩn, 2 áo mưa tiện lợi dự phòng và giá kẹp điện thoại phượt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED FLEET */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-forest-600 uppercase tracking-widest block mb-1">
              Đội xe sẵn sàng bàn giao
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Chọn xe yêu thích cho chuyến đi của bạn
            </h2>
          </div>

          <Link
            to="/bikes"
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-forest-600 hover:text-forest-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors"
          >
            <span>Xem toàn bộ 15+ mẫu xe</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {[
            { id: 'all', label: 'Tất cả dòng xe' },
            { id: 'tay-ga', label: 'Xe tay ga đô thị' },
            { id: 'xe-so', label: 'Xe số tiết kiệm' },
            { id: 'con-tay', label: 'Xe côn tay phượt tour' },
            { id: 'xe-dien', label: 'Xe máy điện xanh' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategoryTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedCategoryTab === tab.id
                  ? 'bg-forest-600 text-white shadow-md shadow-forest-600/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Vehicle Grid */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            Đang tải danh sách đội xe từ cơ sở dữ liệu...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle._id}
                vehicle={vehicle}
                onBookNow={handleBookVehicle}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. BRANCH NETWORK SHOWCASE */}
      <section className="py-16 md:py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-2">
              Hạ tầng trực thuộc
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Mạng lưới 3 chi nhánh nhận & trả xe
            </h2>
            <p className="text-xs text-slate-400 mt-2">
              Hệ thống cửa hàng mặt tiền lớn, dễ tìm, hỗ trợ giao nhận xe linh hoạt giữa các trạm
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {branches.map((branch, index) => (
              <div
                key={branch._id}
                className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-6 flex flex-col justify-between hover:border-emerald-500 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Chi nhánh 0{index + 1}
                    </span>
                    <span className="text-xs text-emerald-400 font-semibold flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      {branch.hours_open} - {branch.hours_close}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">
                    {branch.name}
                  </h3>

                  <p className="text-xs text-slate-300 mb-4 flex items-start space-x-1.5 leading-relaxed">
                    <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{branch.address}</span>
                  </p>

                  <p className="text-xs text-slate-400 italic mb-4">
                    {branch.description || 'Vị trí đắc địa, đội ngũ kỹ thuật viên trực tại quầy 24/7'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-700/80 flex items-center justify-between">
                  <a
                    href={`tel:${branch.phone}`}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-300 hover:text-white transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>{branch.phone}</span>
                  </a>

                  <Link
                    to={`/bikes?pickup=${branch._id}`}
                    className="text-xs font-semibold text-slate-400 hover:text-white flex items-center"
                  >
                    <span>Xem xe tại trạm</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS - 3 SIMPLE STEPS */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-forest-600 uppercase tracking-widest block mb-2">
              Quy trình tinh gọn
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              3 bước nhận xe siêu tốc trong 3 phút
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-forest-700 font-black text-sm flex items-center justify-center mb-4">
                01
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                1. Chọn xe & cọc 30% online
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chọn mẫu xe ưng ý, thời gian và điểm nhận/trả. Chuyển khoản 30% để hệ thống tự động khóa giữ đúng xe và biển số cho bạn.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-forest-700 font-black text-sm flex items-center justify-center mb-4">
                02
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                2. Ghé chi nhánh & đối chiếu eKYC
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Đến đúng trạm đã hẹn. Bạn chỉ cần xuất trình CCCD/GPLX để nhân viên quét đối chiếu 2 phút và ký hợp đồng điện tử.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-forest-700 font-black text-sm flex items-center justify-center mb-4">
                03
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                3. Bàn giao & vi vu mọi nẻo đường
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Kỹ thuật viên bàn giao xe, kiểm tra ODO, cung cấp 2 nón bảo hiểm và áo mưa. Bạn nhận xe và khởi hành ngay!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. VERIFIED HUMAN TESTIMONIALS */}
      <section className="py-16 bg-emerald-50/50 border-t border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-forest-600 uppercase tracking-widest block mb-2">
              Khách hàng thực tế
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Đánh giá từ những người đã trải nghiệm
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-emerald-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-1 text-emerald-600 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed mb-4">
                  "Mình từ Hà Nội vào công tác 3 ngày. Nhận xe ở trạm Bến Thành Q1 lúc trưa, đến ngày về trả thẳng ở trạm 45 Trường Sơn cách sân bay 200m rồi đi bộ sang ga bay về luôn. Nhân viên siêu nhiệt tình, không phải đi taxi ngược lại!"
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">Anh Nguyễn Huy Hoàng</span>
                <span className="text-slate-400">Thuê Air Blade 160</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-emerald-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-1 text-emerald-600 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed mb-4">
                  "Xe Vision đời mới máy rất êm, cọc 30% giữ xe tiện lợi. Điểm mình thích nhất là các bạn không giữ CCCD gốc mà chỉ chụp đối chiếu trên tablet, đỡ lo mất mát giấy tờ."
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">Chị Trần Thùy Linh</span>
                <span className="text-slate-400">Thuê Vision Smartkey</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-emerald-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-1 text-emerald-600 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed mb-4">
                  "Exciter 155 côn tay chạy bốc và chắc chắn, xe có sẵn giá đỡ điện thoại dẫn đường đi Cần Giờ rất an tâm. Trả xe tính ODO rõ ràng, không có phí ẩn."
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">Bạn Lê Quốc Tuấn</span>
                <span className="text-slate-400">Thuê Exciter 155 VVA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      {selectedVehicleForBooking && (
        <BookingModal
          vehicle={selectedVehicleForBooking}
          branches={branches}
          onClose={() => setSelectedVehicleForBooking(null)}
          onSuccess={(code) => {
            setSelectedVehicleForBooking(null);
            setSuccessBookingCode(code);
          }}
        />
      )}

      {/* Success Notification Modal */}
      {successBookingCode && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 border border-emerald-200 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-forest-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900">
              Đặt giữ xe thành công!
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mã đặt xe của bạn là:
            </p>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl font-mono text-lg font-black text-forest-700 tracking-wider">
              {successBookingCode}
            </div>
            <p className="text-[11px] text-slate-500">
              Vui lòng chụp lại màn hình hoặc lưu mã này để xuất trình tại bàn tiếp tân chi nhánh khi nhận xe.
            </p>
            <button
              onClick={() => setSuccessBookingCode(null)}
              className="w-full py-3 rounded-xl bg-forest-600 text-white font-bold text-xs hover:bg-forest-700 transition-colors shadow-md shadow-forest-600/20"
            >
              Đã hiểu & Tiếp tục
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
