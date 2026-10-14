import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Sparkles, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { VehicleCard } from '../components/VehicleCard';
import { BookingModal } from '../components/BookingModal';
import type { Vehicle, Branch, Category } from '../types';
import { api } from '../services/api';

export const FleetPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pickupParam = searchParams.get('pickup') || '';
  const returnParam = searchParams.get('return') || '';
  const typeParam = searchParams.get('type') || '';

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>(pickupParam);
  const [selectedCategory, setSelectedCategory] = useState<string>(typeParam || 'all');
  const [priceSort, setPriceSort] = useState<'asc' | 'desc' | 'default'>('default');

  // Booking Modal
  const [selectedVehicleForBooking, setSelectedVehicleForBooking] = useState<Vehicle | null>(null);
  const [successBookingCode, setSuccessBookingCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [branchesRes, vehiclesRes, categoriesRes] = await Promise.all([
          api.get('/branches'),
          api.get('/vehicles'),
          api.get('/categories'),
        ]);

        if (branchesRes.data?.data) setBranches(branchesRes.data.data);
        if (vehiclesRes.data?.data) setVehicles(vehiclesRes.data.data);
        if (categoriesRes.data?.data) setCategories(categoriesRes.data.data);
      } catch (err) {
        console.warn('Error fetching fleet data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter and sort logic
  const filteredVehicles = vehicles
    .filter((v) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchModel = v.vehicleModel.toLowerCase().includes(q);
        const matchBrand = v.brand.toLowerCase().includes(q);
        const matchPlate = v.licensePlate.toLowerCase().includes(q);
        if (!matchModel && !matchBrand && !matchPlate) return false;
      }

      // Branch filter
      if (selectedBranch) {
        const branchId = typeof v.branchId === 'object' && v.branchId !== null ? v.branchId._id : v.branchId;
        if (branchId !== selectedBranch) return false;
      }

      // Category filter by slug
      if (selectedCategory && selectedCategory !== 'all') {
        const catSlug = typeof v.category === 'object' && v.category !== null ? v.category.slug : v.category;
        if (catSlug !== selectedCategory) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (priceSort === 'asc') return a.dailyPrice - b.dailyPrice;
      if (priceSort === 'desc') return b.dailyPrice - a.dailyPrice;
      return 0;
    });

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Title */}
        <div className="mb-8">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/15 text-orange-300 border border-orange-500/30 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>100% Xe tự doanh chính hãng • Bảo dưỡng định kỳ</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            Đội xe & Bảng giá thuê tự lái
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Tất cả các dòng xe đều được kiểm định kỹ thuật nghiêm ngặt trước khi giao, đi kèm 2 mũ bảo hiểm chuẩn CR và 2 áo mưa tiện lợi.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#111827] rounded-[2rem] p-5 md:p-6 border border-white/10 shadow-xl mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search Box */}
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên xe (Vision, Air Blade, Exciter, VinFast...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#0D1524] border border-white/10 rounded-xl text-xs font-medium text-white placeholder:text-slate-500 outline-none focus:border-orange-500 transition-all"
              />
            </div>

            {/* Branch Filter */}
            <div>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full py-2.5 px-3 bg-[#0D1524] border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="" className="bg-[#111827] text-white">Tất cả các chi nhánh</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id} className="bg-[#111827] text-white">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Sort */}
            <div>
              <select
                value={priceSort}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'asc' || val === 'desc' || val === 'default') {
                    setPriceSort(val);
                  }
                }}
                className="w-full py-2.5 px-3 bg-[#0D1524] border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="default" className="bg-[#111827] text-white">Sắp xếp theo giá</option>
                <option value="asc" className="bg-[#111827] text-white">Giá thuê: Thấp đến Cao</option>
                <option value="desc" className="bg-[#111827] text-white">Giá thuê: Cao đến Thấp</option>
              </select>
            </div>
          </div>

          {/* Dynamic Category Chips from API */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
            <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Phân loại:</span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              Tất cả
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat.slug
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                    : 'bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.08]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-6 text-xs text-slate-400">
          <span>Tìm thấy <strong className="text-white font-bold">{filteredVehicles.length}</strong> phương tiện sẵn sàng bàn giao</span>
          <span className="text-orange-400 font-semibold flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Cọc 30% giữ xe trực tuyến tức thì
          </span>
        </div>

        {/* Fleet Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Đang tải dữ liệu đội xe...
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="py-16 text-center bg-[#111827] rounded-[2rem] border border-white/10 p-8 shadow-xl">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-base font-bold text-white">Không tìm thấy xe phù hợp tiêu chí</p>
            <p className="text-xs text-slate-400 mt-1">Vui lòng thử bỏ bớt bộ lọc hoặc chọn chi nhánh khác.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedBranch('');
                setSelectedCategory('all');
                setPriceSort('default');
              }}
              className="mt-4 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-orange-500/25"
            >
              Đặt lại tất cả bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle._id}
                vehicle={vehicle}
                onBookNow={(v) => navigate(`/booking/${v._id}`)}
              />
            ))}
          </div>
        )}

        {/* Booking Modal */}
        {selectedVehicleForBooking && (
          <BookingModal
            vehicle={selectedVehicleForBooking}
            branches={branches}
            initialPickupBranchId={selectedBranch || pickupParam}
            initialReturnBranchId={returnParam}
            onClose={() => setSelectedVehicleForBooking(null)}
            onSuccess={(code) => {
              setSelectedVehicleForBooking(null);
              setSuccessBookingCode(code);
            }}
          />
        )}

        {/* Success Modal */}
        {successBookingCode && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#111827] rounded-[2rem] max-w-md w-full p-8 text-center space-y-4 border border-orange-500/40 shadow-2xl">
              <div className="w-14 h-14 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center mx-auto border border-orange-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">
                Đặt giữ xe thành công!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Mã đặt xe của bạn là:
              </p>
              <div className="p-3 bg-black/60 border border-orange-500/40 rounded-xl font-mono text-lg font-black text-orange-400 tracking-wider">
                {successBookingCode}
              </div>
              <p className="text-[11px] text-slate-400">
                Vui lòng lưu lại mã để xuất trình tại bàn tiếp tân chi nhánh khi nhận xe.
              </p>
              <button
                onClick={() => setSuccessBookingCode(null)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold text-xs transition-all shadow-lg shadow-orange-500/25"
              >
                Đã hiểu & Tiếp tục
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
