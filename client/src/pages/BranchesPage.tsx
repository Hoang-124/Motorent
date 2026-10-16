import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  PhoneCall,
  Clock,
  ArrowRight,
  CheckCircle2,
  Phone,
  Navigation,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  ArrowRightLeft,
  Settings,
  Layers,
  Map as MapIcon,
  RefreshCw,
  LocateFixed
} from 'lucide-react';
import type { Branch, Vehicle } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getOptimizedVehicleImageUrl } from '../utils/imageHelper';
import { BranchInteractiveMap } from '../components/BranchInteractiveMap';

export const BranchesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'cards' | 'map'>('cards');

  // GPS Nearest Branch Search (UC-27)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [nearestBranchId, setNearestBranchId] = useState<string | null>(null);

  const isSystemAdmin = isAuthenticated && user?.roles === 'SystemAdmin';

  const fetchData = async (coords?: { lat: number; lng: number }) => {
    try {
      const branchUrl = coords
        ? `/branches/nearby?lat=${coords.lat}&lng=${coords.lng}`
        : '/branches';

      const [bRes, vRes] = await Promise.all([
        api.get(branchUrl),
        api.get('/vehicles'),
      ]);

      if (bRes.data?.data) {
        setBranches(bRes.data.data);
        if (coords && bRes.data.data.length > 0) {
          setNearestBranchId(bRes.data.data[0]._id);
        }
      }
      if (vRes.data?.data) setVehicles(vRes.data.data);
    } catch (err) {
      console.warn('Error fetching branch directory', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle GPS Search (UC-27)
  const handleFindNearest = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị vị trí GPS.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserCoords(coords);
        fetchData(coords);
        setIsLocating(false);
      },
      (err) => {
        console.warn('GPS error', err);
        setIsLocating(false);
        // Fallback: Da Nang Center (16.054, 108.202)
        const fallback = { lat: 16.0544, lng: 108.2022 };
        setUserCoords(fallback);
        fetchData(fallback);
      },
      { timeout: 8000 }
    );
  };

  const getBranchVehicles = (branchId: string): Vehicle[] => {
    return vehicles.filter((v) => {
      const bId =
        typeof v.branchId === 'object' && v.branchId !== null ? v.branchId._id : v.branchId;
      return bId === branchId;
    });
  };

  const totalAvailable = vehicles.filter((v) => v.status === 'Available').length;

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] py-10 sm:py-14 bg-editorial-grain">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* SystemAdmin Quick Bar */}
        {isSystemAdmin && (
          <div className="mb-8 p-4 rounded-2xl bg-[#1C1812] border border-[#FFC799]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#2A2218] border border-[#FFC799]/40 flex items-center justify-center text-[#FFC799] shrink-0">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#FFC799] block">
                  Chế độ Quản Trị Viên (SystemAdmin Mode)
                </span>
                <span className="text-[11px] text-[#A0A0A0]">
                  Bạn có quyền thêm mới, chỉnh sửa, gán Quản lý và tạm ngưng chi nhánh trong mạng lưới.
                </span>
              </div>
            </div>

            <Link
              to="/admin"
              className="px-4 py-2 rounded-xl bg-[#FFC799] text-[#101010] text-xs font-semibold hover:bg-[#ffe2cc] transition-all flex items-center space-x-1.5 shrink-0 shadow-md"
            >
              <span>Vào Trung Tâm Điều Hành Admin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* =====================================================================
            1. EDITORIAL MASTHEAD & LIVE NETWORK SUMMARY
            ===================================================================== */}
        <div className="pb-8 mb-10 border-b border-white/[0.08] animate-fade-up">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center space-x-2 text-[11px] uppercase tracking-[0.16em] text-[#FFC799] font-semibold mb-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#99FFE4]" />
                <span>Hệ Thống Trạm Giao Nhận Đô Thị • Đà Nẵng</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold text-[#F5F5F5] tracking-tight leading-[1.12]">
                Nhận xe tại cửa ngõ,{' '}
                <span className="font-serif-display italic font-normal text-[#FFC799]">
                  trả xe bên phố biển.
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-[#A0A0A0] mt-3 leading-relaxed">
                Hệ thống trạm Motorent đặt tại những vị trí thuận tiện nhất cho lịch trình di chuyển trong phố: ngay cửa ga đến Sân bay Quốc tế Đà Nẵng và trục đường ven biển Mỹ Khê — Sơn Trà. Hỗ trợ nhận xe ở một trạm và trả xe tại trạm khác với{' '}
                <strong className="text-[#F5F5F5] font-medium">phụ phí liên trạm 0đ</strong>.
              </p>
            </div>

            {/* Right Network Telemetry Pills */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
              <div className="px-4 py-3 rounded-xl bg-[#161616] border border-white/10">
                <span className="text-[10px] uppercase tracking-wider text-[#6E6E6E] block">
                  Quy mô trạm
                </span>
                <span className="text-base sm:text-lg font-bold text-[#F5F5F5] font-mono-tabular mt-0.5 block">
                  0{branches.length || 2} trạm lớn
                </span>
              </div>

              <div className="px-4 py-3 rounded-xl bg-[#161616] border border-white/10">
                <span className="text-[10px] uppercase tracking-wider text-[#6E6E6E] block">
                  Xe sẵn sàng
                </span>
                <span className="text-base sm:text-lg font-bold text-[#FFC799] font-mono-tabular mt-0.5 block">
                  {totalAvailable} chiếc
                </span>
              </div>

              <div className="px-4 py-3 rounded-xl bg-[#161616] border border-white/10">
                <span className="text-[10px] uppercase tracking-wider text-[#6E6E6E] block">
                  Phí đổi trạm
                </span>
                <span className="text-base sm:text-lg font-bold text-[#F5F5F5] font-mono-tabular mt-0.5 block">
                  0đ (Miễn phí)
                </span>
              </div>
            </div>
          </div>

          {/* 3-Pillar Station Service Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/[0.06] text-xs text-[#A0A0A0]">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#FFC799] shrink-0" />
              <span>
                <strong className="text-[#F5F5F5] font-medium">Thủ tục 03 phút:</strong> Đối soát eKYC nhanh gọn, trả lại ngay CCCD gốc
              </span>
            </div>
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-[#FFC799] shrink-0" />
              <span>
                <strong className="text-[#F5F5F5] font-medium">Gửi hành lý miễn phí:</strong> Nhận giữ hộ vali cồng kềnh tại quầy khi bạn đi dạo phố
              </span>
            </div>
            <div className="flex items-center space-x-2.5">
              <Sparkles className="w-4 h-4 text-[#FFC799] shrink-0" />
              <span>
                <strong className="text-[#F5F5F5] font-medium">Trang bị đầy đủ:</strong> Kèm 02 mũ 3/4 khử trùng tia UV, áo mưa &amp; giá đỡ điện thoại
              </span>
            </div>
          </div>
        </div>

        {/* View Mode Toggle & GPS Search Toolbar (UC-02 & UC-27) */}
        <div className="mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#161616] border border-white/10 rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                viewMode === 'cards'
                  ? 'bg-[#FFC799] text-[#101010] shadow'
                  : 'bg-[#101010] text-[#A0A0A0] hover:text-[#F5F5F5] border border-white/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Danh sách trạm</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                viewMode === 'map'
                  ? 'bg-[#FFC799] text-[#101010] shadow'
                  : 'bg-[#101010] text-[#A0A0A0] hover:text-[#F5F5F5] border border-white/10'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Bản đồ tương tác GPS</span>
            </button>
          </div>

          {/* GPS Find Nearest Branch */}
          <div className="flex items-center space-x-3">
            {userCoords && (
              <span className="text-[11px] text-[#99FFE4] font-mono flex items-center space-x-1.5">
                <LocateFixed className="w-3.5 h-3.5" />
                <span>Đã định vị vị trí của bạn</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleFindNearest}
              disabled={isLocating}
              className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] border border-white/15 hover:border-[#FFC799] text-xs font-semibold text-[#FFC799] flex items-center space-x-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Đang dò GPS...' : 'Tìm trạm gần tôi nhất'}</span>
            </button>
          </div>
        </div>

        {/* MAP VIEW (UC-02) */}
        {viewMode === 'map' && (
          <div className="mb-12 animate-fade-in">
            <BranchInteractiveMap
              branches={branches}
              userCoords={userCoords}
              onFindNearest={handleFindNearest}
              isLocating={isLocating}
            />
          </div>
        )}

        {/* =====================================================================
            2. STATION SHOWCASE CARDS (WITH LIVE VEHICLE PREVIEWS & MAPS)
            ===================================================================== */}
        {viewMode === 'cards' && (
          <>
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 mb-12">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-[#161616] rounded-2xl border border-white/10 p-7 flex flex-col justify-between animate-pulse h-[480px]"
                  />
                ))}
              </div>
            ) : (
              <div
                className={`grid grid-cols-1 ${
                  branches.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'
                } gap-7 mb-12 animate-fade-up-delay-1`}
              >
                {branches.map((branch, idx) => {
                  const branchBikes = getBranchVehicles(branch._id);
                  const availableBikes = branchBikes.filter((v) => v.status === 'Available');
                  const previewBikes = (availableBikes.length > 0 ? availableBikes : branchBikes).slice(0, 3);
                  const isAirport =
                    branch.name.toLowerCase().includes('sân bay') ||
                    branch.code?.toLowerCase().includes('air') ||
                    idx === 0;

                  const isNearest = branch._id === nearestBranchId;
                  const mapsQuery = encodeURIComponent(`${branch.name} ${branch.address} Đà Nẵng`);
                  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

                  return (
                    <div
                      key={branch._id}
                      className={`bg-[#161616] rounded-2xl border smooth-card-hover p-6 sm:p-7 flex flex-col justify-between h-full transition-all ${
                        isNearest
                          ? 'border-[#FFC799] shadow-lg shadow-[#FFC799]/10'
                          : 'border-white/10'
                      }`}
                    >
                      <div className="flex flex-col space-y-5">
                        {/* Row 1: Top Station Badge & Live Availability */}
                        <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <span className="px-2.5 py-1 rounded-lg bg-[#101010] border border-white/10 font-mono-tabular text-xs font-bold text-[#FFC799] shrink-0">
                              TRẠM 0{idx + 1} • {branch.code}
                            </span>
                            {isNearest && (
                              <span className="px-2 py-0.5 rounded-full bg-[#99FFE4]/20 border border-[#99FFE4]/30 text-[10px] font-bold text-[#99FFE4] shrink-0">
                                Gần bạn nhất ({branch.distanceKm ?? '0.5'} km)
                              </span>
                            )}
                          </div>

                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#101010] border border-white/10 text-[11px] font-semibold text-[#F5F5F5] shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#99FFE4] mr-1.5" />
                            {availableBikes.length} / {branchBikes.length} xe sẵn sàng
                          </span>
                        </div>

                        {/* Row 2: Station Title & Address */}
                        <div className="min-h-[84px] flex flex-col justify-start">
                          <h2 className="text-xl sm:text-2xl font-bold text-[#F5F5F5] tracking-tight leading-snug">
                            {branch.name}
                          </h2>
                          <p className="text-xs sm:text-sm text-[#A0A0A0] mt-2 flex items-start space-x-2 line-clamp-2 leading-relaxed">
                            <MapPin className="w-4 h-4 text-[#FFC799] shrink-0 mt-0.5" />
                            <span>{branch.address}</span>
                          </p>
                        </div>

                        {/* Row 3: 2-Column Operational Details Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-[#101010]/80 border border-white/[0.07] rounded-xl p-3.5 flex flex-col justify-between">
                            <span className="text-[10px] uppercase tracking-wider text-[#6E6E6E] flex items-center">
                              <Clock className="w-3 h-3 text-[#FFC799] mr-1.5 shrink-0" />
                              <span>Khung giờ hoạt động</span>
                            </span>
                            <p className="font-mono-tabular font-bold text-xs sm:text-sm text-[#F5F5F5] mt-1.5">
                              {branch.hours_open || '06:00'} – {branch.hours_close || '23:00'}
                            </p>
                            <span className="text-[11px] text-[#A0A0A0] block mt-0.5 truncate">
                              Mở cửa cả Lễ &amp; Chủ Nhật
                            </span>
                          </div>

                          <div className="bg-[#101010]/80 border border-white/[0.07] rounded-xl p-3.5 flex flex-col justify-between">
                            <span className="text-[10px] uppercase tracking-wider text-[#6E6E6E] flex items-center">
                              <PhoneCall className="w-3 h-3 text-[#FFC799] mr-1.5 shrink-0" />
                              <span>Tổng đài trực tại trạm</span>
                            </span>
                            <a
                              href={`tel:${branch.phone}`}
                              className="font-mono-tabular font-bold text-xs sm:text-sm text-[#FFC799] hover:underline mt-1.5 block"
                            >
                              {branch.phone}
                            </a>
                            <span className="text-[11px] text-[#A0A0A0] block mt-0.5 truncate">
                              {isAirport ? 'Đón khách tại cổng ga T1 & T2' : 'Giao xe nhanh dọc biển Mỹ Khê'}
                            </span>
                          </div>
                        </div>

                        {/* Row 4: Live Vehicles Currently at This Station */}
                        <div className="pt-1">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[11px] uppercase tracking-[0.12em] text-[#A0A0A0] font-semibold">
                              Xe đang có tại trạm ({branchBikes.length})
                            </span>
                            <Link
                              to={`/bikes?pickup=${branch._id}`}
                              className="text-[11px] text-[#FFC799] hover:underline flex items-center space-x-1"
                            >
                              <span>Xem tất cả</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          </div>

                          <div className="grid grid-cols-3 gap-2.5">
                            {previewBikes.length > 0 ? (
                              previewBikes.map((bike) => (
                                <Link
                                  key={bike._id}
                                  to={`/bikes?pickup=${branch._id}&selected=${bike._id}`}
                                  className="group bg-[#101010] border border-white/[0.06] hover:border-white/20 rounded-xl p-2.5 transition-all text-center flex flex-col justify-between"
                                >
                                  <div className="h-16 flex items-center justify-center overflow-hidden rounded-lg bg-black/40">
                                    <img
                                      src={getOptimizedVehicleImageUrl(bike.images?.[0])}
                                      alt={bike.vehicleModel}
                                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                                      loading="lazy"
                                    />
                                  </div>
                                  <div className="mt-2 text-left">
                                    <span className="text-[11px] font-semibold text-[#F5F5F5] truncate block group-hover:text-[#FFC799] transition-colors">
                                      {bike.vehicleModel}
                                    </span>
                                    <span className="text-[10px] font-mono-tabular text-[#FFC799] block font-medium">
                                      {bike.dailyPrice?.toLocaleString('vi-VN')}đ/ngày
                                    </span>
                                  </div>
                                </Link>
                              ))
                            ) : (
                              <div className="col-span-3 py-6 text-center text-xs text-[#6E6E6E] bg-[#101010] rounded-xl border border-white/[0.06]">
                                Đội xe tại trạm đang được luân chuyển phục vụ khách
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Row 5: Station Amenities */}
                        <div className="grid grid-cols-3 gap-2.5 pt-1">
                          <div className="px-2.5 py-2 rounded-xl bg-[#101010] border border-white/[0.06] text-[11px] text-[#A0A0A0] flex items-center justify-center space-x-1.5 text-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                            <span className="truncate">Nước suối miễn phí</span>
                          </div>
                          <div className="px-2.5 py-2 rounded-xl bg-[#101010] border border-white/[0.06] text-[11px] text-[#A0A0A0] flex items-center justify-center space-x-1.5 text-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                            <span className="truncate">Gửi vali miễn phí</span>
                          </div>
                          <div className="px-2.5 py-2 rounded-xl bg-[#101010] border border-white/[0.06] text-[11px] text-[#A0A0A0] flex items-center justify-center space-x-1.5 text-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                            <span className="truncate">Giao xe eKYC 3 phút</span>
                          </div>
                        </div>
                      </div>

                      {/* Row 6: Symmetrical Card Footer Actions */}
                      <div className="mt-6 pt-5 border-t border-white/[0.08] flex items-center gap-2.5">
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-3 rounded-xl border border-white/10 bg-[#101010] text-[#F5F5F5] hover:border-[#FFC799] text-xs font-medium inline-flex items-center justify-center space-x-1.5 transition-colors shrink-0"
                        >
                          <Navigation className="w-3.5 h-3.5 text-[#FFC799]" />
                          <span>Chỉ đường Maps</span>
                        </a>

                        <a
                          href={`tel:${branch.phone}`}
                          className="p-3 rounded-xl border border-white/10 bg-[#101010] text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-white/25 transition-colors shrink-0"
                          title="Gọi trực tiếp cho trạm"
                        >
                          <Phone className="w-4 h-4" />
                        </a>

                        <Link
                          to={`/bikes?pickup=${branch._id}`}
                          className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold text-[#101010] bg-[#F5F5F5] hover:bg-[#FFC799] transition-all text-center flex items-center justify-center space-x-1.5 active:scale-95"
                        >
                          <span>Chọn xe tại trạm này ({branchBikes.length} xe)</span>
                          <ArrowRight className="w-3.5 h-3.5 stroke-[2.2]" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* =====================================================================
            3. VISUAL INTER-STATION ROUTE & ONE-WAY RETURN BANNER
            ===================================================================== */}
        <div className="rounded-2xl bg-[#161616] border border-white/10 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center space-x-2 text-xs uppercase tracking-[0.16em] text-[#FFC799] font-semibold">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Đặc Quyền Liên Trạm Motorent (Phụ Phí 0đ)</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] tracking-tight">
              Nhận xe tại Sân bay, dạo phố Sông Hàn rồi{' '}
              <span className="font-serif-display italic font-normal text-[#FFC799]">
                trả xe bên Biển Mỹ Khê.
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-[#A0A0A0] leading-relaxed">
              Khoảng cách giữa trạm Sân bay Quốc tế Đà Nẵng và trạm Biển Mỹ Khê chỉ khoảng{' '}
              <strong className="text-[#F5F5F5] font-medium">5,5 km (~12 phút di chuyển)</strong> đi qua trục đường Nguyễn Văn Linh và Cầu Rồng. Bạn có thể linh hoạt chọn nơi nhận xe và nơi trả xe khác nhau hoàn toàn miễn phí.
            </p>
          </div>

          {/* Visual Route Steps & Action */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-4 shrink-0">
            <div className="flex items-center space-x-2.5 bg-[#101010] border border-white/10 rounded-xl px-4 py-3 text-xs">
              <span className="font-semibold text-[#F5F5F5]">Trạm Sân Bay</span>
              <span className="text-[#FFC799] font-mono-tabular">── 12 phút qua Cầu Rồng ──►</span>
              <span className="font-semibold text-[#F5F5F5]">Trạm Mỹ Khê</span>
            </div>

            <Link
              to="/bikes"
              className="inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl text-xs font-semibold text-[#101010] bg-[#F5F5F5] hover:bg-[#FFC799] transition-all active:scale-95"
            >
              <span>Đặt xe liên trạm ngay</span>
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
