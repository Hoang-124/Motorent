import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Sparkles, 
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List
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
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [selectedBranch, setSelectedBranch] = useState<string>(pickupParam);
  const [selectedCategory, setSelectedCategory] = useState<string>(typeParam || 'all');
  const [brand, setBrand] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sort, setSort] = useState<'price_asc' | 'price_desc' | 'rating_asc' | 'rating_desc'>('price_asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Booking Modal
  const [selectedVehicleForBooking, setSelectedVehicleForBooking] = useState<Vehicle | null>(null);
  const [successBookingCode, setSuccessBookingCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.get('/branches'), api.get('/categories')])
      .then(([branchesRes, categoriesRes]) => {
        if (!active) return;
        if (branchesRes.data?.data) setBranches(branchesRes.data.data);
        if (categoriesRes.data?.data) setCategories(categoriesRes.data.data);
      })
      .catch((err: unknown) => console.warn('Error fetching fleet filters', err));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage('');
    const timer = window.setTimeout(async () => {
      const params: Record<string, string | number> = { sort };
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedBranch) params.branchId = selectedBranch;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (brand.trim()) params.brand = brand.trim();
      if (/^\d+(\.\d+)?$/.test(minPrice)) params.minPrice = Number(minPrice);
      if (/^\d+(\.\d+)?$/.test(maxPrice)) params.maxPrice = Number(maxPrice);
      try {
        const response = await api.get('/vehicles', { params });
        if (active) setVehicles(response.data?.data || []);
      } catch (err) {
        if (active) {
          setVehicles([]);
          setErrorMessage('Không thể tải danh sách xe. Hãy kiểm tra kết nối máy chủ và thử lại.');
        }
        console.warn('Error fetching fleet data', err);
      } finally {
        if (active) setLoading(false);
      }
    }, searchQuery.trim() ? 250 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery, selectedBranch, selectedCategory, brand, minPrice, maxPrice, sort]);

  return (
    <div className="min-h-screen bg-[#060B0A] text-slate-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Title */}
        <div className="mb-8">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
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
        <div className="bg-[#0B1513] rounded-[2rem] p-5 md:p-6 border border-white/10 shadow-xl mb-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Box */}
            <div
              className="relative md:col-span-2"
              onBlur={(event) => {
                const nextFocus = event.relatedTarget as Node | null;
                if (!nextFocus || !event.currentTarget.contains(nextFocus)) {
                  setIsSearchFocused(false);
                }
              }}
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Tìm theo mẫu xe, hãng hoặc biển số"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Tìm xe theo mẫu xe, hãng hoặc biển số"
                aria-autocomplete="list"
                aria-expanded={isSearchFocused && searchQuery.trim().length > 0}
                aria-controls="fleet-search-suggestions"
                autoComplete="off"
                className="w-full pl-10 pr-4 py-2.5 bg-[#060B0A] border border-white/10 rounded-xl text-xs font-medium text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition-all"
              />
              {isSearchFocused && searchQuery.trim() && (
                <div
                  id="fleet-search-suggestions"
                  role="listbox"
                  aria-label="Gợi ý xe phù hợp"
                  className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-[#0B1513] p-2 shadow-2xl shadow-black/50"
                >
                  {loading ? (
                    <p className="px-3 py-3 text-xs text-slate-400">Đang tìm xe phù hợp...</p>
                  ) : errorMessage ? (
                    <p className="px-3 py-3 text-xs text-red-300">Không tải được gợi ý xe.</p>
                  ) : vehicles.length > 0 ? (
                    <>
                      <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Gợi ý xe ({vehicles.length})
                      </p>
                      {vehicles.slice(0, 6).map((vehicle) => (
                        <button
                          key={vehicle._id}
                          type="button"
                          role="option"
                          aria-selected="false"
                          onClick={() => {
                            setIsSearchFocused(false);
                            navigate(`/bikes/${vehicle._id}`);
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] focus:bg-white/[0.06] focus:outline-none"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-bold text-white">{vehicle.vehicleModel}</span>
                            <span className="mt-1 block truncate text-[11px] text-slate-400">
                              {vehicle.brand} · {vehicle.licensePlate}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-bold text-emerald-300">
                            {vehicle.dailyPrice.toLocaleString('vi-VN')} đ/ngày
                          </span>
                        </button>
                      ))}
                    </>
                  ) : (
                    <p className="px-3 py-3 text-xs text-slate-400">Không có xe khớp với từ khóa này.</p>
                  )}
                </div>
              )}
            </div>

            {/* Branch Filter */}
            <div>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full py-2.5 px-3 bg-[#060B0A] border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="" className="bg-[#0B1513] text-white">Tất cả các chi nhánh</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id} className="bg-[#0B1513] text-white">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Lọc theo hãng xe"
                className="w-full py-2.5 px-3 bg-[#060B0A] border border-white/10 rounded-xl text-xs font-semibold text-white placeholder:text-slate-500 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Giá từ"
                aria-label="Giá thuê tối thiểu mỗi ngày"
                className="w-full min-w-0 py-2.5 px-3 bg-[#060B0A] border border-white/10 rounded-xl text-xs font-semibold text-white placeholder:text-slate-500 outline-none focus:border-emerald-500"
              />
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Giá đến"
                aria-label="Giá thuê tối đa mỗi ngày"
                className="w-full min-w-0 py-2.5 px-3 bg-[#060B0A] border border-white/10 rounded-xl text-xs font-semibold text-white placeholder:text-slate-500 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Sort */}
            <div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="w-full py-2.5 px-3 bg-[#060B0A] border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="price_asc" className="bg-[#0B1513] text-white">Giá: thấp đến cao</option>
                <option value="price_desc" className="bg-[#0B1513] text-white">Giá: cao đến thấp</option>
                <option value="rating_desc" className="bg-[#0B1513] text-white">Đánh giá: cao đến thấp</option>
                <option value="rating_asc" className="bg-[#0B1513] text-white">Đánh giá: thấp đến cao</option>
              </select>
            </div>
          </div>

          {/* Dynamic Category Chips from API */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
            <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Phân loại:</span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedCategory === 'all'
                  ? 'bg-emerald-500 text-[#060D0B] shadow-lg shadow-emerald-500/25'
                  : 'bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              Tất cả
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedCategory === cat.slug
                    ? 'bg-emerald-500 text-[#060D0B] shadow-lg shadow-emerald-500/25'
                    : 'bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.08]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between gap-3 mb-6 text-xs text-slate-400">
          <span>Tìm thấy <strong className="text-white font-bold">{vehicles.length}</strong> phương tiện</span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex text-emerald-400 font-semibold items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Tình trạng xe được cập nhật từ hệ thống
            </span>
            <div className="flex rounded-xl border border-white/10 bg-[#0B1513] p-1" aria-label="Kiểu hiển thị">
              <button type="button" aria-label="Hiển thị dạng lưới" aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')} className={`rounded-lg p-2 ${viewMode === 'grid' ? 'bg-emerald-500 text-[#060D0B]' : 'text-slate-400 hover:text-white'}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button type="button" aria-label="Hiển thị dạng danh sách" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')} className={`rounded-lg p-2 ${viewMode === 'list' ? 'bg-emerald-500 text-[#060D0B]' : 'text-slate-400 hover:text-white'}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Fleet Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Đang tải dữ liệu đội xe...
          </div>
        ) : errorMessage ? (
          <div className="py-16 text-center bg-[#0B1513] rounded-[2rem] border border-red-500/20 p-8">
            <AlertCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-white">{errorMessage}</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="py-16 text-center bg-[#0B1513] rounded-[2rem] border border-white/10 p-8 shadow-xl">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-base font-bold text-white">Không tìm thấy xe phù hợp tiêu chí</p>
            <p className="text-xs text-slate-400 mt-1">Vui lòng thử bỏ bớt bộ lọc hoặc chọn chi nhánh khác.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedBranch('');
                setSelectedCategory('all');
                setBrand('');
                setMinPrice('');
                setMaxPrice('');
                setSort('price_asc');
              }}
              className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-xl text-xs font-bold text-[#060D0B] transition-colors"
            >
              Đặt lại tất cả bộ lọc
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'flex flex-col gap-5'}>
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle._id}
                vehicle={vehicle}
                onBookNow={(v) => navigate(`/booking/${v._id}`)}
                variant={viewMode}
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
            <div className="bg-[#0B1513] rounded-[2rem] max-w-md w-full p-8 text-center space-y-4 border border-emerald-500/40 shadow-2xl">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">
                Đặt giữ xe thành công!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Mã đặt xe của bạn là:
              </p>
              <div className="p-3 bg-black/60 border border-emerald-500/40 rounded-xl font-mono text-lg font-black text-emerald-400 tracking-wider">
                {successBookingCode}
              </div>
              <p className="text-[11px] text-slate-400">
                Vui lòng lưu lại mã để xuất trình tại bàn tiếp tân chi nhánh khi nhận xe.
              </p>
              <button
                onClick={() => setSuccessBookingCode(null)}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#060D0B] font-bold text-xs transition-colors shadow-lg shadow-emerald-500/25"
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
