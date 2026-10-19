import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Tag,
  Copy,
  Check,
  Calendar,
  MapPin,
  X,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
  ArrowUpDown,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { VehicleCard } from '../components/VehicleCard';
import { BookingModal } from '../components/BookingModal';
import type { Vehicle, Branch, Category } from '../types';
import { api } from '../services/api';
import { getOptimizedVehicleImageUrl } from '../utils/imageHelper';

const PROMO_VOUCHERS = [
  {
    code: 'CHAOBANMOI',
    discountText: 'Giảm 20.000đ',
    title: 'Ưu đãi Khách hàng mới đi phố',
    condition: 'Áp dụng mọi dòng xe • Không giới hạn số ngày thuê',
  },
  {
    code: 'MOTORENT30',
    discountText: 'Giảm 30.000đ',
    title: 'Ưu đãi Đặt lịch Sớm Trực tuyến',
    condition: 'Áp dụng đặt trực tuyến • Cọc 30% giữ biển số tức thì',
  },
  {
    code: 'LIENTRAM0D',
    discountText: 'Phụ phí 0đ',
    title: 'Miễn phí 100% Trả xe Liên trạm',
    condition: 'Nhận xe tại Sân bay — Trả xe tại Biển Mỹ Khê (hoặc ngược lại)',
  },
];

export const FleetPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const pickupParam = searchParams.get('pickup') || '';
  const returnParam = searchParams.get('return') || '';
  const pickupDateParam = searchParams.get('pickupDate') || '';
  const returnDateParam = searchParams.get('returnDate') || '';
  const typeParam = searchParams.get('type') || '';
  const promoParam = searchParams.get('promo') === 'true';
  const voucherParam = searchParams.get('voucher') || '';

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [catalogVehicles, setCatalogVehicles] = useState<Vehicle[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [metadataError, setMetadataError] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 });

  // Keep filters in the URL so detail/back navigation preserves the selected fleet.
  const searchQuery = searchParams.get('q') || '';
  const selectedBranch = pickupParam;
  const selectedCategory = typeParam || 'all';
  const selectedBrand = searchParams.get('brand') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const onlyAvailable = searchParams.get('available') === 'true';
  const rawSort = searchParams.get('sort') || 'default';
  const priceSort = ['asc', 'desc', 'rating_asc', 'rating_desc'].includes(rawSort) ? rawSort : 'default';
  const requestedPage = Number(searchParams.get('page') || '1');
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const viewMode = searchParams.get('view') === 'list' ? 'list' : 'grid';
  const priceRangeError =
    (minPrice && (!Number.isFinite(Number(minPrice)) || Number(minPrice) < 0)) ||
    (maxPrice && (!Number.isFinite(Number(maxPrice)) || Number(maxPrice) < 0))
      ? 'Giá thuê phải là số lớn hơn hoặc bằng 0.'
      : minPrice && maxPrice && Number(minPrice) > Number(maxPrice)
      ? 'Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.'
      : '';

  const updateFilter = (key: string, value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page' && key !== 'view') next.delete('page');
      return next;
    }, { replace: true });
  };
  const setSearchQuery = (value: string) => updateFilter('q', value);
  const setSelectedBranch = (value: string) => updateFilter('pickup', value);
  const setSelectedCategory = (value: string) => updateFilter('type', value === 'all' ? '' : value);
  const setOnlyAvailable = (value: boolean) => updateFilter('available', value ? 'true' : '');
  const setPriceSort = (value: string) => updateFilter('sort', value === 'default' ? '' : value);
  const resetFilters = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      ['q', 'pickup', 'type', 'brand', 'minPrice', 'maxPrice', 'available', 'sort', 'page'].forEach((key) => next.delete(key));
      return next;
    }, { replace: true });
  };

  // Promo & Voucher State
  const [showPromoBanner, setShowPromoBanner] = useState<boolean>(promoParam || Boolean(voucherParam));
  const [selectedVoucher, setSelectedVoucher] = useState<string>(voucherParam || 'CHAOBANMOI');
  const [copiedVoucher, setCopiedVoucher] = useState<string>('');

  useEffect(() => {
    if (promoParam || voucherParam) {
      setShowPromoBanner(true);
    }
    if (voucherParam) {
      setSelectedVoucher(voucherParam);
    }
  }, [promoParam, voucherParam]);

  // Booking Modal
  const [selectedVehicleForBooking, setSelectedVehicleForBooking] = useState<Vehicle | null>(null);
  const [successBookingCode, setSuccessBookingCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const [branchesRes, vehiclesRes, categoriesRes] = await Promise.all([
          api.get('/branches'),
          api.get('/vehicles'),
          api.get('/categories'),
        ]);

        if (!active) return;
        if (branchesRes.data?.data) setBranches(branchesRes.data.data);
        if (vehiclesRes.data?.data) setCatalogVehicles(vehiclesRes.data.data);
        if (categoriesRes.data?.data) setCategories(categoriesRes.data.data);
      } catch {
        if (active) setMetadataError('Không tải được danh mục hoặc chi nhánh. Vui lòng tải lại trang.');
      }
    };
    fetchData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setErrorMessage('');
    if (priceRangeError) {
      setVehicles([]);
      setPagination({ page: 1, limit: 12, total: 0, pages: 0 });
      setLoading(false);
      return () => { active = false; controller.abort(); };
    }
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.get('/vehicles', {
          signal: controller.signal,
          params: {
            page,
            limit: 12,
            q: searchQuery.trim() || undefined,
            branchId: selectedBranch || undefined,
            category: selectedCategory === 'all' ? undefined : selectedCategory,
            brand: selectedBrand || undefined,
            minPrice: minPrice === '' ? undefined : Number(minPrice),
            maxPrice: maxPrice === '' ? undefined : Number(maxPrice),
            status: onlyAvailable ? 'Available' : undefined,
            sort: priceSort === 'asc' ? 'price_asc' : priceSort === 'desc' ? 'price_desc' : priceSort === 'default' ? undefined : priceSort,
          },
        });
        if (!active) return;
        setVehicles(response.data.data ?? []);
        setPagination(response.data.pagination ?? { page, limit: 12, total: response.data.data?.length ?? 0, pages: 1 });
      } catch {
        if (!active) return;
        setVehicles([]);
        setPagination({ page: 1, limit: 12, total: 0, pages: 0 });
        setErrorMessage('Không tải được danh sách xe. Vui lòng kiểm tra kết nối và tải lại trang.');
      } finally {
        if (active) setLoading(false);
      }
    }, searchQuery.trim() ? 200 : 0);
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [page, searchQuery, selectedBranch, selectedCategory, selectedBrand, minPrice, maxPrice, onlyAvailable, priceSort, priceRangeError]);

  const handleCopyVoucher = (code: string) => {
    setSelectedVoucher(code);
    setCopiedVoucher(code);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setTimeout(() => setCopiedVoucher(''), 2000);
  };

  const handleNavigateToBooking = (v: Vehicle) => {
    const params = new URLSearchParams();
    const effectivePickup = selectedBranch || pickupParam;
    if (effectivePickup) params.set('pickup', effectivePickup);
    if (returnParam) params.set('return', returnParam);
    if (pickupDateParam) params.set('pickupDate', pickupDateParam);
    if (returnDateParam) params.set('returnDate', returnDateParam);
    if (selectedVoucher) params.set('voucher', selectedVoucher);
    const qs = params.toString();
    navigate(`/booking/${v._id}${qs ? `?${qs}` : ''}`);
  };

  const handleNavigateToDetail = (vehicle: Vehicle) => {
    setIsSearchFocused(false);
    const query = searchParams.toString();
    navigate(`/bikes/${vehicle._id}${query ? `?${query}` : ''}`, {
      state: { fleetSearch: `/bikes${query ? `?${query}` : ''}` },
    });
  };

  // Helper to get category vehicle count and representative thumbnail
  const getCategoryMeta = (slug: string) => {
    const matched = catalogVehicles.filter((v) => {
      const catSlug = typeof v.category === 'object' && v.category !== null ? v.category.slug : v.category;
      return catSlug === slug;
    });
    const repBike = matched[0];
    const thumb = getOptimizedVehicleImageUrl(repBike?.images?.[1] || repBike?.images?.[0]);
    const minPrice =
      matched.length > 0
        ? Math.min(...matched.map((m) => m.dailyPrice))
        : null;
    return {
      count: matched.length,
      thumb,
      minPrice,
    };
  };

  const filteredVehicles = vehicles;
  const brands = [...new Set(catalogVehicles.map((vehicle) => vehicle.brand))].sort((a, b) => a.localeCompare(b));
  const availableCount = catalogVehicles.filter((v) => v.status === 'Available' && !v.requiresMaintenance).length;
  const allThumb = getOptimizedVehicleImageUrl(catalogVehicles[0]?.images?.[1] || catalogVehicles[0]?.images?.[0]);

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] py-10 sm:py-14 bg-editorial-grain">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* =====================================================================
            1. SHOWROOM HEADER & SERVICE TRUST STRIP
            ===================================================================== */}
        <div className="pb-8 mb-8 border-b border-white/[0.08] animate-fade-up">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center space-x-2 text-[11px] uppercase tracking-[0.16em] text-[#FFC799] font-semibold mb-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#99FFE4]" />
                <span>Danh Mục Xe Đô Thị &amp; Bảng Giá Niêm Yết</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold text-[#F5F5F5] tracking-tight leading-[1.12]">
                Chọn chiếc xe phù hợp,{' '}
                <span className="font-serif-display italic font-normal text-[#FFC799]">
                  dạo phố Đà Nẵng thật êm.
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-[#A0A0A0] mt-3 leading-relaxed">
                Toàn bộ xe tay ga, xe máy điện và xe số đều là xe đời mới 2023–2024, chụp ảnh thực tế theo từng biển số tại trạm. Giá niêm yết trọn gói kèm 02 mũ bảo hiểm 3/4 khử khuẩn UV và 02 áo mưa.
              </p>
            </div>

            {/* Right Quick Stats & Promo Button */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2.5 rounded-xl bg-[#161616] border border-white/10 flex items-center space-x-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#6E6E6E] block">
                    Sẵn sàng tại trạm
                  </span>
                  <span className="text-sm font-bold text-[#F5F5F5] font-mono-tabular">
                    {availableCount} / {catalogVehicles.length} phương tiện
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPromoBanner((prev) => !prev)}
                className={`inline-flex items-center space-x-2 px-4 py-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  showPromoBanner
                    ? 'bg-[#FFC799] text-[#101010] border-[#FFC799]'
                    : 'bg-[#161616] hover:border-[#FFC799] border-white/12 text-[#F5F5F5]'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>{showPromoBanner ? 'Ẩn mã ưu đãi' : 'Lấy mã giảm giá (30.000đ)'}</span>
              </button>
            </div>
          </div>

          {/* 3-Pillar Service Guarantee Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/[0.06] text-xs text-[#A0A0A0]">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#FFC799] shrink-0" />
              <span>
                <strong className="text-[#F5F5F5] font-medium">Giữ đúng biển số:</strong> Chọn xe nào trên web, nhận đúng chiếc đó tại trạm
              </span>
            </div>
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-[#FFC799] shrink-0" />
              <span>
                <strong className="text-[#F5F5F5] font-medium">Không giữ CCCD gốc:</strong> Đối soát eKYC 30 giây, giữ trọn giấy tờ tùy thân
              </span>
            </div>
            <div className="flex items-center space-x-2.5">
              <Sparkles className="w-4 h-4 text-[#FFC799] shrink-0" />
              <span>
                <strong className="text-[#F5F5F5] font-medium">Trả xe liên trạm 0đ:</strong> Nhận tại Sân bay, trả tại Biển Mỹ Khê miễn phí
              </span>
            </div>
          </div>
        </div>

        {/* =====================================================================
            2. INTERACTIVE PROMO VOUCHER DRAWER
            ===================================================================== */}
        {showPromoBanner && (
          <div className="mb-8 rounded-2xl bg-[#161616] border border-[#FFC799]/40 p-5 sm:p-6 shadow-2xl relative overflow-hidden animate-fade-scale">
            <div className="flex items-start justify-between gap-4 mb-4 pb-3.5 border-b border-white/[0.08]">
              <div>
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#FFC799] font-semibold block">
                  Phiếu Ưu Đãi Đặt Trực Tuyến
                </span>
                <h2 className="text-base sm:text-lg font-bold text-[#F5F5F5] tracking-tight mt-0.5">
                  Bấm chọn mã ưu đãi — Tự động áp dụng khi bạn bấm chọn xe bên dưới
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPromoBanner(false);
                  if (promoParam) {
                    const next = new URLSearchParams(searchParams);
                    next.delete('promo');
                    setSearchParams(next, { replace: true });
                  }
                }}
                className="p-1.5 rounded-lg text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Đóng khung ưu đãi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {PROMO_VOUCHERS.map((v) => {
                const isSelected = selectedVoucher === v.code;
                const isCopied = copiedVoucher === v.code;
                return (
                  <div
                    key={v.code}
                    onClick={() => handleCopyVoucher(v.code)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-[#101010] border-[#FFC799]'
                        : 'bg-[#101010]/60 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2.5">
                        <span className="px-2.5 py-0.5 rounded bg-[#FFC799] text-[#101010] font-mono-tabular text-xs font-bold tracking-wider">
                          {v.code}
                        </span>
                        <span className="font-serif-display italic text-base text-[#FFC799] font-semibold">
                          {v.discountText}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#F5F5F5] truncate">{v.title}</p>
                      <p className="text-[11px] text-[#6E6E6E]">{v.condition}</p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyVoucher(v.code);
                      }}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0 flex items-center space-x-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#F5F5F5] text-[#101010]'
                          : 'bg-white/5 text-[#F5F5F5] hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã chọn</span>
                        </>
                      ) : isSelected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đang áp dụng</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Áp dụng</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Schedule Carry-over Strip from HomePage */}
        {(pickupDateParam || returnDateParam || returnParam) && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-[#161616] border border-[#FFC799]/30 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-[#A0A0A0]">
              {(pickupDateParam || returnDateParam) && (
                <span className="flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-[#FFC799]" />
                  <span>
                    Lịch trình đã chọn:{' '}
                    <strong className="text-[#F5F5F5] font-mono-tabular">
                      {pickupDateParam || 'Hôm nay'}
                    </strong>{' '}
                    đến{' '}
                    <strong className="text-[#F5F5F5] font-mono-tabular">
                      {returnDateParam || '...'}
                    </strong>
                  </span>
                </span>
              )}
              {returnParam && (
                <span className="flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-[#FFC799]" />
                  <span>
                    Trạm trả xe:{' '}
                    <strong className="text-[#F5F5F5]">
                      {branches.find((b) => b._id === returnParam)?.name || 'Đã chọn'}
                    </strong>
                  </span>
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#FFC799] font-medium">
              Tự động chuyển sang phiếu Đặt giữ xe
            </span>
          </div>
        )}

        {/* =====================================================================
            3. UNIFIED CONTROL & FILTER DECK (SEARCH, SORT, VEHICLE LINES & STATIONS)
            ===================================================================== */}
        <div className="bg-[#161616] rounded-2xl p-4 sm:p-5 border border-white/10 mb-8 space-y-4 animate-fade-up-delay-1">
          {/* Row 1: Search Input + Availability Toggle + Price Sort Pills */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1" onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsSearchFocused(false);
            }}>
              <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo mẫu xe hoặc biển số (VD: Vision, Air Blade, Feliz, Winner, 43A...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setIsSearchFocused(false);
                  if (event.key === 'ArrowDown') {
                    const firstSuggestion = document.querySelector<HTMLButtonElement>('#fleet-search-suggestions button');
                    if (firstSuggestion) { event.preventDefault(); firstSuggestion.focus(); }
                  }
                }}
                aria-label="Tìm xe theo mẫu xe, hãng hoặc biển số"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isSearchFocused && Boolean(searchQuery.trim())}
                aria-controls="fleet-search-suggestions"
                autoComplete="off"
                className="w-full pl-10 pr-9 py-2.5 bg-[#101010] border border-white/10 rounded-xl text-xs font-medium text-[#F5F5F5] placeholder:text-[#6E6E6E] outline-none focus:border-[#FFC799] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-[#F5F5F5] cursor-pointer"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {isSearchFocused && searchQuery.trim() && (
                <div id="fleet-search-suggestions" role="listbox" aria-label="Gợi ý xe phù hợp" className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-xl border border-white/15 bg-[#1A1A1A] p-2 shadow-2xl">
                  {loading ? <p className="p-3 text-xs text-[#A0A0A0]">Đang tìm xe...</p> : errorMessage || priceRangeError ? (
                    <p className="p-3 text-xs text-red-300">Không tải được gợi ý. Kiểm tra bộ lọc hoặc kết nối.</p>
                  ) : filteredVehicles.length ? (
                    <>
                      <p className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#A0A0A0]">Gợi ý xe phù hợp</p>
                      {filteredVehicles.slice(0, 6).map((vehicle) => (
                        <button key={vehicle._id} type="button" role="option" aria-selected="false" onClick={() => handleNavigateToDetail(vehicle)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/5 focus:bg-white/5 focus:outline-none">
                          <span className="min-w-0"><span className="block truncate text-xs font-semibold">{vehicle.vehicleModel}</span><span className="mt-1 block text-[11px] text-[#A0A0A0]">{vehicle.brand} · {vehicle.licensePlate}</span></span>
                          <span className="shrink-0 text-xs text-[#FFC799]">{vehicle.dailyPrice.toLocaleString('vi-VN')} đ/ngày</span>
                        </button>
                      ))}
                    </>
                  ) : <p className="p-3 text-xs text-[#A0A0A0]">Không có xe khớp từ khóa này.</p>}
                </div>
              )}
            </div>

            {/* Right Controls: Available Filter + Sort Segmented Pills */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Toggle Only Available */}
              <button
                type="button"
                onClick={() => setOnlyAvailable(!onlyAvailable)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-all flex items-center space-x-2 cursor-pointer ${
                  onlyAvailable
                    ? 'bg-[#F5F5F5] text-[#101010] border-[#F5F5F5] font-semibold'
                    : 'bg-[#101010] text-[#A0A0A0] border-white/10 hover:text-[#F5F5F5]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    onlyAvailable ? 'bg-[#FFC799]' : 'bg-[#99FFE4]'
                  }`}
                />
                <span>Chỉ xe sẵn sàng</span>
              </button>

              <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#101010] px-3 py-2 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-[#FFC799]" />
                <select aria-label="Sắp xếp xe" value={priceSort} onChange={(event) => setPriceSort(event.target.value)} className="min-w-0 bg-[#101010] py-0.5 text-[#F5F5F5] outline-none">
                  <option value="default">Sắp xếp mặc định</option>
                  <option value="asc">Giá: thấp đến cao</option>
                  <option value="desc">Giá: cao đến thấp</option>
                  <option value="rating_desc">Đánh giá: cao đến thấp</option>
                  <option value="rating_asc">Đánh giá: thấp đến cao</option>
                </select>
              </label>
              <div role="group" aria-label="Chế độ hiển thị danh sách xe" className="inline-flex rounded-xl border border-white/10 bg-[#101010] p-1">
                <button type="button" aria-label="Hiển thị dạng lưới" aria-pressed={viewMode === 'grid'} onClick={() => updateFilter('view', 'grid')} className={`rounded-lg p-2 ${viewMode === 'grid' ? 'bg-[#F5F5F5] text-[#101010]' : 'text-[#A0A0A0]'}`}><LayoutGrid className="h-4 w-4" /></button>
                <button type="button" aria-label="Hiển thị dạng danh sách" aria-pressed={viewMode === 'list'} onClick={() => updateFilter('view', 'list')} className={`rounded-lg p-2 ${viewMode === 'list' ? 'bg-[#F5F5F5] text-[#101010]' : 'text-[#A0A0A0]'}`}><List className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/[0.08] pt-4 sm:grid-cols-3">
            <label className="text-[11px] text-[#A0A0A0]">Hãng xe
              <select aria-label="Hãng xe" value={selectedBrand} onChange={(event) => updateFilter('brand', event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#101010] px-3 py-2.5 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]">
                <option value="">Tất cả hãng</option>{brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
              </select>
            </label>
            <label className="text-[11px] text-[#A0A0A0]">Giá ngày từ (đ)
              <input aria-label="Giá ngày tối thiểu" type="number" min="0" step="1000" placeholder="Không giới hạn" value={minPrice} onChange={(event) => updateFilter('minPrice', event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#101010] px-3 py-2.5 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]" />
            </label>
            <label className="text-[11px] text-[#A0A0A0]">Đến (đ)
              <input aria-label="Giá ngày tối đa" type="number" min="0" step="1000" placeholder="Không giới hạn" value={maxPrice} onChange={(event) => updateFilter('maxPrice', event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#101010] px-3 py-2.5 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]" />
            </label>
          </div>
          {priceRangeError && <p role="alert" className="text-xs text-red-300">{priceRangeError}</p>}
          {metadataError && <p role="alert" className="text-xs text-red-300">{metadataError}</p>}

          {/* Row 2: Integrated Visual Vehicle Line Selector (Single Non-Wrapping Row) */}
          {categories.length > 0 && (
            <div className="pt-3.5 border-t border-white/[0.08]">
              <div className="flex items-center gap-1.5 overflow-x-auto flex-nowrap pb-0.5">
                <span className="text-[11px] uppercase tracking-[0.1em] text-[#6E6E6E] mr-1 shrink-0 whitespace-nowrap">
                  Dòng xe:
                </span>

                {/* "All Vehicles" Pill with Thumbnail */}
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`group pl-1.5 pr-2.5 py-1.5 rounded-xl border text-[11px] sm:text-xs transition-all cursor-pointer inline-flex items-center justify-between gap-1.5 shrink-0 lg:flex-1 whitespace-nowrap ${
                    selectedCategory === 'all'
                      ? 'bg-[#F5F5F5] text-[#101010] border-[#F5F5F5] font-semibold shadow-sm'
                      : 'bg-[#101010] text-[#A0A0A0] border-white/10 hover:text-[#F5F5F5] hover:border-white/25'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <span className="w-8 h-5 rounded-md studio-paper-backdrop overflow-hidden flex items-center justify-center p-0.5 shrink-0 border border-black/10">
                      {allThumb ? (
                        <img
                          src={allThumb}
                          alt="Tất cả xe"
                          loading="lazy"
                          crossOrigin="anonymous"
                          className="w-full h-full object-contain scale-110 mix-blend-multiply"
                        />
                      ) : (
                        <span className="text-[8px] font-bold text-slate-700">ALL</span>
                      )}
                    </span>
                    <span className="truncate">Tất cả xe</span>
                  </span>
                  <span
                    className={`text-[10px] font-mono-tabular px-1.5 py-0.5 rounded-md font-semibold shrink-0 ${
                      selectedCategory === 'all'
                        ? 'bg-[#101010]/15 text-[#101010]'
                        : 'bg-white/[0.05] text-[#FFC799]'
                    }`}
                  >
                    {vehicles.length}
                  </span>
                </button>

                {/* Dynamic Categories Sorted by Urban Priority (All on 1 Row) */}
                {[...categories]
                  .sort((a, b) => {
                    const order: Record<string, number> = {
                      'xe-tay-ga': 1,
                      'xe-dien': 2,
                      'xe-may-dien': 2,
                      'xe-so': 3,
                      'xe-50cc': 4,
                      'xe-con-tay': 5,
                      'xe-phan-khoi-lon': 6,
                    };
                    return (order[a.slug] ?? 99) - (order[b.slug] ?? 99);
                  })
                  .map((cat) => {
                    const active = selectedCategory === cat.slug;
                    const meta = getCategoryMeta(cat.slug);
                    const cleanName = cat.name.replace(/\s*\(.*?\)\s*/g, '').trim();
                    return (
                      <button
                        key={cat._id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.slug)}
                        className={`group pl-1.5 pr-2.5 py-1.5 rounded-xl border text-[11px] sm:text-xs transition-all cursor-pointer inline-flex items-center justify-between gap-1.5 shrink-0 lg:flex-1 whitespace-nowrap ${
                          active
                            ? 'bg-[#F5F5F5] text-[#101010] border-[#F5F5F5] font-semibold shadow-sm'
                            : 'bg-[#101010] text-[#A0A0A0] border-white/10 hover:text-[#F5F5F5] hover:border-white/25'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          <span className="w-8 h-5 rounded-md studio-paper-backdrop overflow-hidden flex items-center justify-center p-0.5 shrink-0 border border-black/10">
                            {meta.thumb ? (
                              <img
                                src={meta.thumb}
                                alt={cleanName}
                                loading="lazy"
                                crossOrigin="anonymous"
                                className="w-full h-full object-contain scale-110 mix-blend-multiply"
                              />
                            ) : (
                              <span className="text-[8px] font-semibold text-slate-600">XE</span>
                            )}
                          </span>
                          <span className="truncate">{cleanName}</span>
                        </span>
                        <span
                          className={`text-[10px] font-mono-tabular px-1.5 py-0.5 rounded-md font-semibold shrink-0 ${
                            active
                              ? 'bg-[#101010]/15 text-[#101010]'
                              : 'bg-white/[0.05] text-[#FFC799]'
                          }`}
                        >
                          {meta.count}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Row 3: Interactive Station Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-3.5 border-t border-white/[0.08]">
            <span className="text-[11px] uppercase tracking-[0.12em] text-[#6E6E6E] flex items-center mr-1">
              <MapPin className="w-3.5 h-3.5 text-[#FFC799] mr-1" />
              Trạm nhận xe:
            </span>

            <button
              type="button"
              onClick={() => setSelectedBranch('')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                selectedBranch === ''
                  ? 'bg-[#F5F5F5] text-[#101010] font-semibold'
                  : 'bg-[#101010] text-[#A0A0A0] border border-white/10 hover:text-[#F5F5F5]'
              }`}
            >
              Tất cả trạm Đà Nẵng
            </button>

            {branches.map((b) => {
              const active = selectedBranch === b._id;
              return (
                <button
                  key={b._id}
                  type="button"
                  onClick={() => setSelectedBranch(b._id)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    active
                      ? 'bg-[#F5F5F5] text-[#101010] font-semibold'
                      : 'bg-[#101010] text-[#A0A0A0] border border-white/10 hover:text-[#F5F5F5]'
                  }`}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* =====================================================================
            5. RESULTS SUMMARY BAR
            ===================================================================== */}
        <div id="fleet-results" aria-live="polite" className="scroll-mt-32 flex flex-wrap items-center justify-between gap-3 mb-6 text-xs text-[#A0A0A0]">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#FFC799]" />
            <span>
              Đang hiển thị{' '}
              <strong className="text-[#F5F5F5] font-mono-tabular">
                {filteredVehicles.length}
              </strong>{' '}
              / {pagination.total} phương tiện phù hợp
            </span>
            {(searchQuery || selectedBranch || selectedCategory !== 'all' || selectedBrand || minPrice || maxPrice || onlyAvailable || priceSort !== 'default') && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[#FFC799] hover:underline font-medium ml-2 cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          <span className="text-[#FFC799] font-medium flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Đặt cọc 30% giữ đích danh biển số xe
          </span>
        </div>

        {/* =====================================================================
            6. VEHICLE SHOWROOM GRID
            ===================================================================== */}
        {errorMessage ? (
          <div role="alert" className="rounded-2xl border border-red-400/20 bg-[#161616] px-6 py-12 text-center">
            <p className="text-sm text-red-300">{errorMessage}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-[#F5F5F5] px-4 py-2 text-xs font-semibold text-[#101010]">Tải lại trang</button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-[#161616] rounded-2xl border border-white/[0.08] overflow-hidden flex flex-col animate-pulse"
              >
                <div className="w-full h-56 sm:h-60 bg-white/5 p-3 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-28 h-6 rounded-full bg-white/10" />
                    <div className="w-24 h-6 rounded-lg bg-white/10" />
                  </div>
                  <div className="w-36 h-6 rounded-lg bg-white/10 ml-auto" />
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="w-32 h-4 rounded bg-white/10" />
                    <div className="w-48 h-6 rounded bg-white/10" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-12 rounded-xl bg-white/5" />
                    <div className="h-12 rounded-xl bg-white/5" />
                    <div className="h-12 rounded-xl bg-white/5" />
                  </div>
                  <div className="flex items-end justify-between pt-3 border-t border-white/[0.08]">
                    <div className="space-y-1.5">
                      <div className="w-28 h-6 rounded bg-white/10" />
                      <div className="w-24 h-3 rounded bg-white/5" />
                    </div>
                    <div className="w-28 h-10 rounded-xl bg-white/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="py-16 text-center bg-[#161616] rounded-2xl border border-white/10 p-8">
            <AlertCircle className="w-9 h-9 text-[#FFC799] mx-auto mb-3" />
            <p className="text-base font-bold text-[#F5F5F5]">
              Không tìm thấy phương tiện nào khớp bộ lọc hiện tại
            </p>
            <p className="text-xs text-[#A0A0A0] mt-1">
              Bạn hãy thử chuyển sang trạm khác hoặc xem lại toàn bộ danh mục xe.
            </p>
            <button
              onClick={resetFilters}
              className="mt-4 px-5 py-2.5 bg-[#F5F5F5] hover:bg-[#FFC799] rounded-xl text-xs font-semibold text-[#101010] transition-colors cursor-pointer"
            >
              Xem lại toàn bộ đội xe ({catalogVehicles.length})
            </button>
          </div>
        ) : (
          <div className={viewMode === 'list' ? 'space-y-4' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'}>
            {filteredVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle._id}
                vehicle={vehicle}
                onBookNow={handleNavigateToBooking}
                onViewDetails={handleNavigateToDetail}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}

        {!loading && !errorMessage && pagination.pages > 1 && (
          <nav aria-label="Phân trang danh sách xe" className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs">
            <button type="button" disabled={page <= 1} onClick={() => { updateFilter('page', String(page - 1)); document.getElementById('fleet-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="inline-flex items-center gap-1 rounded-xl border border-white/15 px-4 py-2.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Trang trước</button>
            <span className="text-[#A0A0A0]">Trang <strong className="text-[#F5F5F5]">{page}</strong> / {pagination.pages} · {pagination.total} xe</span>
            <button type="button" disabled={page >= pagination.pages} onClick={() => { updateFilter('page', String(page + 1)); document.getElementById('fleet-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="inline-flex items-center gap-1 rounded-xl border border-white/15 px-4 py-2.5 disabled:opacity-40">Trang sau<ChevronRight className="h-4 w-4" /></button>
          </nav>
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
            <div className="bg-[#161616] rounded-3xl max-w-md w-full p-8 text-center space-y-4 border border-white/15 shadow-2xl">
              <div className="w-14 h-14 rounded-full bg-white/5 text-[#FFC799] flex items-center justify-center mx-auto border border-white/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#F5F5F5]">
                Đặt giữ xe thành công!
              </h3>
              <p className="text-xs text-[#A0A0A0] leading-relaxed">
                Mã hợp đồng đặt xe của bạn là:
              </p>
              <div className="p-3 bg-[#101010] border border-[#FFC799]/40 rounded-xl font-mono-tabular text-lg font-bold text-[#FFC799] tracking-wider">
                {successBookingCode}
              </div>
              <p className="text-[11px] text-[#A0A0A0]">
                Vui lòng lưu lại mã để xuất trình tại quầy chi nhánh khi nhận xe.
              </p>
              <button
                onClick={() => setSuccessBookingCode(null)}
                className="w-full py-3 rounded-xl bg-[#F5F5F5] hover:bg-[#FFC799] text-[#101010] font-bold text-xs transition-colors cursor-pointer"
              >
                Đã hiểu &amp; Tiếp tục
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
