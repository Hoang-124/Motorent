import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  HeartOff,
  ArrowRight,
  ArrowLeft,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Star,
  Fuel,
  Gauge,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import type { WishlistItem, WishlistResponse } from '../types';
import { getOptimizedVehicleImageUrl } from '../utils/imageHelper';

export const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { toggleWishlist, isToggling, toast, clearToast } = useWishlist();

  const [wishlistData, setWishlistData] = useState<WishlistResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(8);

  const fetchWishlist = async (pageNum = 1) => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await api.get(`/wishlist?page=${pageNum}&limit=${limit}`);
      if (res.data?.success && res.data?.data) {
        setWishlistData(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách yêu thích:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?returnUrl=' + encodeURIComponent('/wishlist'));
      return;
    }
    fetchWishlist(page);
  }, [isAuthenticated, page]);

  const handleRemove = async (vehicleId: string) => {
    await toggleWishlist(vehicleId);
    // Refresh page data
    fetchWishlist(page);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] py-8 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl flex items-center space-x-2.5 text-xs font-semibold animate-fade-in border ${
            toast.type === 'success'
              ? 'bg-[#161616] border-[#99FFE4]/40 text-[#99FFE4]'
              : 'bg-[#161616] border-red-500/40 text-red-400'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 stroke-[2]" />
          ) : (
            <AlertCircle className="w-4 h-4 stroke-[2]" />
          )}
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={clearToast}
            className="ml-2 text-inherit hover:opacity-75 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Breadcrumb & Title */}
        <div className="space-y-3">
          <Link
            to="/bikes"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-[#A0A0A0] hover:text-[#FFC799] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2]" />
            <span>Khám phá thêm xe khác</span>
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FF8080]/15 border border-[#FF8080]/30 flex items-center justify-center text-[#FF8080]">
                <Heart className="w-5 h-5 fill-[#FF8080] stroke-[#FF8080]" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F5F5F5] tracking-tight">
                  Xe yêu thích của bạn
                </h1>
                <p className="text-xs text-[#A0A0A0] mt-0.5">
                  Danh sách những phương tiện bạn đã lưu để theo dõi và chuẩn bị cho chuyến đi
                </p>
              </div>
            </div>

            {wishlistData && (
              <span className="text-xs font-bold text-[#F5F5F5] bg-[#161616] border border-white/10 px-3 py-1.5 rounded-xl font-mono-tabular">
                {wishlistData.pagination.total} xe đã lưu
              </span>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#FFC799] animate-spin" />
            <p className="text-xs text-[#A0A0A0]">Đang tải danh sách xe yêu thích...</p>
          </div>
        ) : !wishlistData || wishlistData.items.length === 0 ? (
          /* Empty State */
          <div className="bg-[#161616] border border-white/10 rounded-3xl p-12 sm:p-16 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto text-[#6E6E6E]">
              <HeartOff className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-[#F5F5F5]">Danh sách yêu thích trống</h3>
              <p className="text-xs text-[#A0A0A0] leading-relaxed">
                Bạn chưa lưu xe nào vào danh sách yêu thích. Khám phá ngay các dòng xe tay ga, xe số và xe côn tay tại MOTORENT!
              </p>
            </div>
            <Link
              to="/bikes"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-[#FFC799] hover:bg-[#ffb67a] text-[#101010] text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer mt-2"
            >
              <span>Khám phá đội xe ngay</span>
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </Link>
          </div>
        ) : (
          /* Items Grid */
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {wishlistData.items.map((item) => {
                const v = item.vehicle;
                const isAvail = item.isAvailable;
                const vehicleId = item.vehicleId;

                if (!v) {
                  // Fallback for vehicle completely purged
                  return (
                    <div
                      key={item._id}
                      className="bg-[#161616] border border-red-500/20 rounded-2xl p-5 space-y-3 opacity-60 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full inline-block">
                          Xe không còn tồn tại
                        </span>
                        <p className="text-xs text-[#A0A0A0]">Phương tiện này đã được xóa khỏi hệ thống.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(vehicleId)}
                        className="w-full py-2 rounded-xl bg-white/5 hover:bg-red-500/15 text-xs text-red-400 border border-white/5 flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa khỏi danh sách</span>
                      </button>
                    </div>
                  );
                }

                const branchName =
                  typeof v.branchId === 'object' && v.branchId !== null
                    ? (v.branchId as any).name
                    : 'Trạm Trung tâm';

                const mainImage =
                  v.images && v.images.length > 0
                    ? getOptimizedVehicleImageUrl(v.images[0])
                    : '';

                return (
                  <div
                    key={item._id}
                    className={`bg-[#161616] rounded-2xl border transition-all flex flex-col overflow-hidden relative ${
                      isAvail
                        ? 'border-white/10 hover:border-white/20'
                        : 'border-white/5 opacity-65 grayscale-[25%]'
                    }`}
                  >
                    {/* Top Image Stage */}
                    <div className="relative w-full h-44 studio-paper-backdrop overflow-hidden flex items-center justify-center">
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={v.vehicleModel}
                          className="w-full h-full object-contain p-3"
                        />
                      ) : (
                        <div className="text-xs text-[#6E6E6E]">Không có ảnh</div>
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide ${
                            isAvail
                              ? 'bg-[#101010]/90 text-[#99FFE4] border border-[#99FFE4]/30'
                              : 'bg-[#101010]/90 text-[#FF8080] border border-[#FF8080]/30'
                          }`}
                        >
                          {isAvail ? 'Sẵn sàng thuê' : 'Tạm ngừng hoạt động'}
                        </span>
                      </div>

                      {/* Quick Delete Trash Button */}
                      <button
                        type="button"
                        disabled={isToggling(vehicleId)}
                        onClick={() => handleRemove(vehicleId)}
                        className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-lg bg-[#101010]/80 hover:bg-red-500 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-90 disabled:opacity-50"
                        title="Xóa khỏi danh sách yêu thích"
                      >
                        <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                      </button>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex flex-col flex-1 justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-[#A0A0A0] mb-1">
                          <span className="truncate max-w-[120px]">{v.brand}</span>
                          <span className="font-mono-tabular font-bold text-[#F5F5F5]">
                            {v.licensePlate}
                          </span>
                        </div>

                        <Link
                          to={`/bikes/${v._id}`}
                          className="text-sm font-bold text-[#F5F5F5] hover:text-[#FFC799] transition-colors line-clamp-1 block"
                        >
                          {v.vehicleModel}
                        </Link>

                        {/* Rating & ODO */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06] text-[11px]">
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 fill-[#FFC799] text-[#FFC799]" />
                            <span className="font-bold text-[#F5F5F5]">
                              {(v as unknown as { averageRating?: number }).averageRating && (v as unknown as { averageRating?: number }).averageRating! > 0
                                ? (v as unknown as { averageRating?: number }).averageRating!.toFixed(1)
                                : '5.0'}
                            </span>
                          </div>
                          <span className="text-[#6E6E6E] font-mono-tabular">
                            {v.odometer.toLocaleString('vi-VN')} km
                          </span>
                        </div>
                      </div>

                      {/* Pricing & CTA */}
                      <div className="pt-2 border-t border-white/[0.06] space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-base font-extrabold text-[#F5F5F5] font-mono-tabular">
                            {v.dailyPrice.toLocaleString('vi-VN')}đ
                            <span className="text-[10px] font-normal text-[#A0A0A0] ml-0.5">/ngày</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            to={`/bikes/${v._id}`}
                            className="py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-[#A0A0A0] hover:text-[#F5F5F5] text-xs font-semibold text-center transition-colors"
                          >
                            Chi tiết
                          </Link>

                          <button
                            type="button"
                            disabled={!isAvail}
                            onClick={() => navigate(`/booking/${v._id}`)}
                            className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
                              isAvail
                                ? 'bg-[#FFC799] hover:bg-[#ffb67a] active:scale-95 text-[#101010] cursor-pointer'
                                : 'bg-white/5 text-[#6E6E6E] cursor-not-allowed'
                            }`}
                          >
                            <span>{isAvail ? 'Đặt xe' : 'Hết xe'}</span>
                            {isAvail && <ArrowRight className="w-3 h-3 stroke-[2.5]" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {wishlistData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 border-t border-white/[0.08]">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#161616] border border-white/10 hover:border-[#FFC799] text-[#A0A0A0] hover:text-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2]" />
                  <span>Trang trước</span>
                </button>

                <span className="text-xs text-[#A0A0A0] font-mono">
                  Trang {page} / {wishlistData.pagination.totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= wishlistData.pagination.totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#161616] border border-white/10 hover:border-[#FFC799] text-[#A0A0A0] hover:text-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>Trang sau</span>
                  <ChevronRight className="w-4 h-4 stroke-[2]" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
