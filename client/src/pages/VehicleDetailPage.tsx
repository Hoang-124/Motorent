import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  Fuel,
  Gauge,
  MapPin,
  ShieldCheck,
  Calendar,
  Clock,
  ArrowRight,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Camera,
  X,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Vehicle, Review, VehicleReviewsResponse } from '../types';
import { getOptimizedVehicleImageUrl } from '../utils/imageHelper';
import { ReviewModal } from '../components/ReviewModal';

const ANGLE_VIEWS = [
  { id: 1, label: 'Góc ngang', title: 'Góc ngang thân xe' },
  { id: 0, label: 'Góc trước', title: 'Góc 3/4 mặt trước' },
  { id: 2, label: 'Góc sau', title: 'Góc đuôi xe & khoang lái' },
];

export const VehicleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [reviewsData, setReviewsData] = useState<VehicleReviewsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [activeAngle, setActiveAngle] = useState<number>(1);
  const [imgError, setImgError] = useState<boolean>(false);

  // Review Edit/Delete Modals
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Photo Lightbox modal
  const [activePhotoZoom, setActivePhotoZoom] = useState<string | null>(null);

  const fetchVehicle = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/vehicles/${id}`);
      if (res.data?.data) {
        setVehicle(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching vehicle', err);
    }
  };

  const fetchReviews = async (pageNum = 1) => {
    if (!id) return;
    setReviewsLoading(true);
    try {
      const res = await api.get(`/vehicles/${id}/reviews?page=${pageNum}&limit=5`);
      if (res.data?.data) {
        setReviewsData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching reviews', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchVehicle(), fetchReviews(1)]);
      setLoading(false);
    };
    init();
  }, [id]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchReviews(newPage);
  };

  const handleDeleteReview = async () => {
    if (!reviewToDelete) return;
    setDeleteLoading(true);
    setFeedbackMsg(null);
    try {
      await api.delete(`/reviews/${reviewToDelete._id}`);
      setFeedbackMsg({ type: 'success', text: 'Đã xóa đánh giá thành công.' });
      setReviewToDelete(null);
      await Promise.all([fetchVehicle(), fetchReviews(page)]);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi xóa đánh giá.';
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#FFC799] animate-spin" />
        <p className="text-sm text-[#A0A0A0]">Đang tải thông tin xe và đánh giá...</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-[#FFC799] mx-auto mb-4 stroke-[1.5]" />
        <h2 className="text-xl font-bold text-[#F5F5F5] mb-2">Không tìm thấy thông tin phương tiện</h2>
        <p className="text-sm text-[#A0A0A0] mb-6">Xe có thể đã ngừng kinh doanh hoặc đường dẫn không đúng.</p>
        <Link
          to="/bikes"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#FFC799] text-[#101010] font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2]" />
          <span>Quay lại danh sách xe</span>
        </Link>
      </div>
    );
  }

  const isAvailable = vehicle.status === 'Available';
  const branchName =
    typeof vehicle.branchId === 'object' && vehicle.branchId !== null
      ? vehicle.branchId.name
      : 'Trạm Trung tâm Đà Nẵng';
  const depositPreview = Math.round(vehicle.dailyPrice * 0.3);

  const transmissionLabel =
    vehicle.transmissionType === 'Manual'
      ? 'Xe côn tay'
      : vehicle.transmissionType === 'Automatic'
      ? 'Xe tay ga đô thị'
      : 'Xe số tiết kiệm';

  const averageRating = vehicle.averageRating || reviewsData?.vehicleStats.averageRating || 0;
  const reviewCount = vehicle.reviewCount !== undefined ? vehicle.reviewCount : reviewsData?.vehicleStats.reviewCount || 0;
  const starBreakdown = reviewsData?.vehicleStats.starBreakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  const currentImageUrl =
    vehicle.images && vehicle.images[activeAngle]
      ? getOptimizedVehicleImageUrl(vehicle.images[activeAngle])
      : '';

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/bikes"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-[#A0A0A0] hover:text-[#FFC799] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2]" />
            <span>Quay lại danh mục đội xe</span>
          </Link>

          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              isAvailable
                ? 'bg-[#99FFE4]/10 text-[#99FFE4] border border-[#99FFE4]/30'
                : 'bg-[#FFC799]/10 text-[#FFC799] border border-[#FFC799]/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full mr-2 ${
                isAvailable ? 'bg-[#99FFE4]' : 'bg-[#FFC799]'
              }`}
            />
            {isAvailable ? 'Sẵn sàng giao xe tại trạm' : 'Đang có khách thuê'}
          </span>
        </div>

        {feedbackMsg && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between text-xs ${
              feedbackMsg.type === 'success'
                ? 'bg-[#99FFE4]/10 text-[#99FFE4] border border-[#99FFE4]/30'
                : 'bg-red-500/10 text-red-400 border border-red-500/30'
            }`}
          >
            <div className="flex items-center space-x-2">
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 stroke-[2]" />
              ) : (
                <AlertCircle className="w-4 h-4 stroke-[2]" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-inherit hover:opacity-75 cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        )}

        {/* Top Showcase: Images & Key Specs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Studio Angles Showcase */}
          <div className="lg:col-span-7 bg-[#161616] border border-white/10 rounded-3xl p-6 overflow-hidden flex flex-col items-center">
            <div className="w-full relative h-72 sm:h-84 studio-paper-backdrop rounded-2xl overflow-hidden flex items-center justify-center">
              {currentImageUrl && !imgError ? (
                <img
                  src={currentImageUrl}
                  alt={vehicle.vehicleModel}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-contain p-4 drop-shadow-2xl transition-all duration-300"
                />
              ) : (
                <div className="flex flex-col items-center text-[#6E6E6E]">
                  <Camera className="w-12 h-12 stroke-[1.5] mb-2" />
                  <span className="text-xs">Ảnh đang được cập nhật</span>
                </div>
              )}

              {/* License Plate Floating Badge */}
              <div className="absolute top-4 left-4 z-10 bg-white/95 text-[#101010] font-mono-tabular font-bold text-xs px-3 py-1 rounded-lg border border-slate-300 shadow">
                {vehicle.licensePlate}
              </div>
            </div>

            {/* Studio Angle Switcher */}
            <div className="flex items-center justify-center space-x-2 mt-5">
              {ANGLE_VIEWS.map((angle) => (
                <button
                  key={angle.id}
                  type="button"
                  onClick={() => setActiveAngle(angle.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeAngle === angle.id
                      ? 'bg-[#FFC799] text-[#101010] shadow-sm'
                      : 'bg-[#101010] text-[#A0A0A0] hover:text-[#F5F5F5] border border-white/[0.08]'
                  }`}
                >
                  {angle.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Title, Specs & Booking CTA */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2 text-xs text-[#FFC799] font-semibold uppercase tracking-wider mb-1">
                    <span>{vehicle.brand}</span>
                    <span>•</span>
                    <span>{transmissionLabel}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F5F5F5] tracking-tight">
                    {vehicle.vehicleModel}
                  </h1>
                </div>
              </div>

              {/* Rating summary bar */}
              <div className="flex items-center space-x-3 mt-3">
                <div className="flex items-center space-x-1 bg-[#161616] border border-white/10 px-2.5 py-1 rounded-lg">
                  <Star className="w-4 h-4 fill-[#FFC799] text-[#FFC799]" />
                  <span className="text-sm font-bold text-[#F5F5F5]">
                    {averageRating > 0 ? averageRating.toFixed(2) : '0.00'}
                  </span>
                </div>
                <a
                  href="#reviews-section"
                  className="text-xs text-[#A0A0A0] hover:text-[#FFC799] transition-colors underline"
                >
                  {reviewCount} lượt đánh giá từ khách hàng
                </a>
              </div>
            </div>

            {/* Specs Matrix */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#161616] border border-white/[0.08] rounded-2xl p-3.5">
                <span className="text-[11px] text-[#6E6E6E] block">Nhiên liệu</span>
                <span className="font-semibold text-xs text-[#F5F5F5] flex items-center mt-1">
                  <Fuel className="w-3.5 h-3.5 text-[#FFC799] mr-1.5 shrink-0" />
                  {vehicle.fuelType === 'Electric' ? 'Thuần điện 100%' : 'Xăng 95 RON'}
                </span>
              </div>

              <div className="bg-[#161616] border border-white/[0.08] rounded-2xl p-3.5">
                <span className="text-[11px] text-[#6E6E6E] block">Hộp số / Vận hành</span>
                <span className="font-semibold text-xs text-[#F5F5F5] flex items-center mt-1">
                  <Gauge className="w-3.5 h-3.5 text-[#FFC799] mr-1.5 shrink-0" />
                  {transmissionLabel}
                </span>
              </div>

              <div className="bg-[#161616] border border-white/[0.08] rounded-2xl p-3.5">
                <span className="text-[11px] text-[#6E6E6E] block">Trạm hiện tại</span>
                <span className="font-semibold text-xs text-[#F5F5F5] flex items-center mt-1 truncate">
                  <MapPin className="w-3.5 h-3.5 text-[#FFC799] mr-1.5 shrink-0" />
                  {branchName}
                </span>
              </div>

              <div className="bg-[#161616] border border-white/[0.08] rounded-2xl p-3.5">
                <span className="text-[11px] text-[#6E6E6E] block">Phụ kiện đi kèm</span>
                <span className="font-semibold text-xs text-[#F5F5F5] flex items-center mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FFC799] mr-1.5 shrink-0" />
                  02 Mũ bảo hiểm + Áo mưa
                </span>
              </div>
            </div>

            {/* Pricing Box & CTA */}
            <div className="bg-[#161616] border border-[#FFC799]/30 rounded-3xl p-6 space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#F5F5F5] font-mono-tabular">
                    {vehicle.dailyPrice.toLocaleString('vi-VN')}đ
                  </span>
                  <span className="text-xs text-[#A0A0A0] ml-1">/ ngày</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#6E6E6E] block">Cọc giữ biển số (30%)</span>
                  <span className="text-sm font-bold text-[#FFC799] font-mono-tabular">
                    {depositPreview.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={!isAvailable}
                onClick={() => navigate(`/booking/${vehicle._id}`)}
                className={`w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg ${
                  isAvailable
                    ? 'bg-[#FFC799] hover:bg-[#ffb67a] active:scale-98 text-[#101010]'
                    : 'bg-white/5 text-[#6E6E6E] cursor-not-allowed border border-white/5'
                }`}
              >
                <span>{isAvailable ? 'Đặt thuê chiếc này ngay' : 'Xe đang có khách thuê'}</span>
                {isAvailable && <ArrowRight className="w-4 h-4 stroke-[2.2]" />}
              </button>

              <div className="flex items-center justify-center space-x-4 text-[11px] text-[#6E6E6E] pt-1">
                <span>Miễn phí hủy trước 24h</span>
                <span>•</span>
                <span>Giao xe trong 03 phút</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div id="reviews-section" className="space-y-6 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold text-[#F5F5F5] flex items-center space-x-2.5">
                <MessageSquare className="w-6 h-6 text-[#FFC799] stroke-[2]" />
                <span>Đánh giá từ khách hàng</span>
              </h2>
              <p className="text-xs text-[#A0A0A0]">
                Nhận xét thực tế từ những khách hàng đã thuê và hoàn thành chuyến đi với chiếc xe này
              </p>
            </div>
          </div>

          {/* Rating Summary Card & Distribution */}
          <div className="bg-[#161616] border border-white/10 rounded-3xl p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Big Score Box */}
            <div className="md:col-span-4 text-center md:border-r md:border-white/10 md:pr-6 space-y-2">
              <span className="text-5xl font-extrabold text-[#F5F5F5] font-mono-tabular">
                {averageRating > 0 ? averageRating.toFixed(2) : '0.00'}
              </span>
              <div className="flex items-center justify-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(averageRating)
                        ? 'fill-[#FFC799] text-[#FFC799]'
                        : 'fill-transparent text-[#404040]'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-[#A0A0A0]">
                Dựa trên {reviewCount} lượt đánh giá thực tế
              </p>
            </div>

            {/* Star Distribution Bars */}
            <div className="md:col-span-8 space-y-2">
              {[5, 4, 3, 2, 1].map((s) => {
                const count = starBreakdown[s] || 0;
                const percentage = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
                return (
                  <div key={s} className="flex items-center space-x-3 text-xs">
                    <span className="w-10 font-bold text-[#A0A0A0] flex items-center space-x-1">
                      <span>{s}</span>
                      <Star className="w-3 h-3 fill-[#FFC799] text-[#FFC799]" />
                    </span>
                    <div className="flex-1 h-2.5 bg-[#101010] rounded-full overflow-hidden border border-white/[0.05]">
                      <div
                        className="h-full bg-[#FFC799] rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-[11px] text-[#6E6E6E]">
                      {count} ({percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reviews List */}
          {reviewsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-6 h-6 text-[#FFC799] animate-spin" />
              <p className="text-xs text-[#A0A0A0]">Đang tải danh sách đánh giá...</p>
            </div>
          ) : !reviewsData || reviewsData.reviews.length === 0 ? (
            <div className="bg-[#161616] border border-white/10 rounded-3xl p-12 text-center space-y-3">
              <MessageSquare className="w-10 h-10 text-[#404040] mx-auto stroke-[1.5]" />
              <h3 className="text-base font-semibold text-[#F5F5F5]">Chưa có đánh giá nào cho xe này</h3>
              <p className="text-xs text-[#6E6E6E] max-w-sm mx-auto">
                Hãy là người đầu tiên đặt thuê và chia sẻ trải nghiệm thực tế sau chuyến đi của bạn!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviewsData.reviews.map((rev) => {
                const isAuthor =
                  isAuthenticated &&
                  user &&
                  (typeof rev.userId === 'object' && rev.userId !== null
                    ? rev.userId._id === user._id
                    : rev.userId === user._id);

                const displayName = rev.user?.displayName || 'Khách hàng';
                const createdDate = new Date(rev.createdAt).toLocaleDateString('vi-VN');

                return (
                  <div
                    key={rev._id}
                    className="bg-[#161616] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-3.5 transition-colors"
                  >
                    {/* Header: User Info, Stars & Action Buttons */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-[#101010] border border-white/10 flex items-center justify-center overflow-hidden text-xs font-bold text-[#FFC799]">
                          {rev.user?.avatarUrl ? (
                            <img
                              src={rev.user.avatarUrl}
                              alt={displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            displayName.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-[#F5F5F5]">
                              {displayName}
                            </span>
                            <span className="text-[10px] font-semibold text-[#99FFE4] bg-[#99FFE4]/10 border border-[#99FFE4]/30 px-2 py-0.5 rounded-full">
                              Đã thuê xe
                            </span>
                          </div>
                          <span className="text-[11px] text-[#6E6E6E] block mt-0.5">
                            {createdDate}
                          </span>
                        </div>
                      </div>

                      {/* Stars & Author Actions */}
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= rev.rating
                                  ? 'fill-[#FFC799] text-[#FFC799]'
                                  : 'fill-transparent text-[#404040]'
                              }`}
                            />
                          ))}
                        </div>

                        {/* If current user is author -> show Sửa / Xóa */}
                        {isAuthor && (
                          <div className="flex items-center space-x-1 pl-2 border-l border-white/10">
                            <button
                              type="button"
                              onClick={() => setEditingReview(rev)}
                              className="p-1.5 text-[#A0A0A0] hover:text-[#FFC799] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                              title="Sửa đánh giá"
                            >
                              <Edit2 className="w-3.5 h-3.5 stroke-[2]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setReviewToDelete(rev)}
                              className="p-1.5 text-[#A0A0A0] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Xóa đánh giá"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Review Comment */}
                    {rev.comment && (
                      <p className="text-xs sm:text-sm text-[#D4D4D4] leading-relaxed">
                        {rev.comment}
                      </p>
                    )}

                    {/* Review Photos Gallery */}
                    {rev.photos && rev.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {rev.photos.map((photoUrl, pIdx) => (
                          <div
                            key={pIdx}
                            onClick={() => setActivePhotoZoom(photoUrl)}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-white/10 bg-[#101010] cursor-pointer hover:border-[#FFC799] transition-all group relative"
                          >
                            <img
                              src={photoUrl}
                              alt={`Ảnh đánh giá ${pIdx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Pagination Controls */}
              {reviewsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#161616] border border-white/10 hover:border-[#FFC799] text-[#A0A0A0] hover:text-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 stroke-[2]" />
                    <span>Trang trước</span>
                  </button>

                  <span className="text-xs text-[#A0A0A0] font-mono">
                    Trang {page} / {reviewsData.pagination.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={page >= reviewsData.pagination.totalPages}
                    onClick={() => handlePageChange(page + 1)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#161616] border border-white/10 hover:border-[#FFC799] text-[#A0A0A0] hover:text-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer"
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

      {/* Edit Review Modal */}
      {editingReview && (
        <ReviewModal
          isOpen={Boolean(editingReview)}
          onClose={() => setEditingReview(null)}
          existingReview={editingReview}
          vehicleName={vehicle.vehicleModel}
          onSuccess={async () => {
            setFeedbackMsg({ type: 'success', text: 'Đã cập nhật đánh giá thành công!' });
            await Promise.all([fetchVehicle(), fetchReviews(page)]);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {reviewToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#161616] border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <Trash2 className="w-5 h-5 stroke-[2]" />
            </div>

            <div>
              <h3 className="text-base font-bold text-[#F5F5F5]">Xác nhận xóa đánh giá?</h3>
              <p className="text-xs text-[#A0A0A0] mt-1.5 leading-relaxed">
                Đánh giá này sẽ bị gỡ bỏ khỏi trang công khai. Điểm trung bình và tổng số đánh giá của xe sẽ được hệ thống tự động tính toán lại.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setReviewToDelete(null)}
                disabled={deleteLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/5 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteReview}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Zoom Lightbox Modal */}
      {activePhotoZoom && (
        <div
          onClick={() => setActivePhotoZoom(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl">
            <img
              src={activePhotoZoom}
              alt="Phóng to ảnh đánh giá"
              className="w-full h-full object-contain"
            />
            <button
              type="button"
              onClick={() => setActivePhotoZoom(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
