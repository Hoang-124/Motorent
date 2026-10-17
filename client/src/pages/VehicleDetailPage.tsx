import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Fuel,
  Gauge,
  ImageOff,
  Loader2,
  MapPin,
  RefreshCw,
  Star,
  Timer,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';
import type { Vehicle, VehicleReview } from '../types';
import { getOptimizedVehicleImageUrl, getUserAvatarUrl, getVehicleImageProps } from '../utils/imageHelper';

interface ReviewPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const toDateKey = (year: number, monthIndex: number, day: number): string =>
  `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const money = (amount: number): string => `${amount.toLocaleString('vi-VN')} đ`;

const initialCalendarMonth = (search: string): Date => {
  const pickupDate = new URLSearchParams(search).get('pickupDate') || '';
  if (/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(pickupDate)) {
    const [year, month] = pickupDate.split('-').map(Number);
    if (year >= 2000 && year <= 2100) return new Date(year, month - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

// Photos are links as well as image sources. Reject executable URL schemes.
const safeImageUrl = (value: string | null | undefined): string => {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? value : '';
  } catch {
    return '';
  }
};

export const VehicleDetailPage: React.FC = () => {
  const { vehicleId = '' } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = location.state as { fleetSearch?: string } | null;
  const fleetSearch = typeof navigationState?.fleetSearch === 'string' && /^\/bikes(?:\?|$)/.test(navigationState.fleetSearch)
    ? navigationState.fleetSearch.slice('/bikes'.length) : location.search;
  const backToFleet = `/bikes${fleetSearch}`;
  const bookingParams = new URLSearchParams();
  const incomingParams = new URLSearchParams(location.search);
  for (const key of ['pickup', 'return', 'pickupDate', 'returnDate', 'voucher']) {
    const value = incomingParams.get(key);
    if (value) bookingParams.set(key, value);
  }
  const bookingSearch = bookingParams.toString();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [vehicleReload, setVehicleReload] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [reviews, setReviews] = useState<VehicleReview[]>([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPagination, setReviewPagination] = useState<ReviewPagination>({ page: 1, limit: 5, total: 0, pages: 0 });
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewsReload, setReviewsReload] = useState(0);
  const [calendarMonth, setCalendarMonth] = useState(() => initialCalendarMonth(location.search));
  const [blockedDates, setBlockedDates] = useState<string[] | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilityReload, setAvailabilityReload] = useState(0);

  useEffect(() => {
    setReviewPage(1);
    setReviewPagination({ page: 1, limit: 5, total: 0, pages: 0 });
    setCalendarMonth(initialCalendarMonth(location.search));
  }, [vehicleId]);

  useEffect(() => { setImageFailed(false); }, [vehicleId, activeImage]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage('');
    setVehicle(null);
    api.get<{ data: Vehicle }>(`/vehicles/${vehicleId}`)
      .then((response) => {
        if (!active) return;
        setVehicle(response.data?.data || null);
        setActiveImage(0);
      })
      .catch(() => {
        if (active) setErrorMessage('Không thể tải thông tin xe. Xe có thể đã bị gỡ khỏi danh sách.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [vehicleId, vehicleReload]);

  useEffect(() => {
    let active = true;
    setReviewsLoading(true);
    setReviewsError('');
    setReviews([]);
    api.get<{ data: VehicleReview[]; pagination: ReviewPagination }>(`/vehicles/${vehicleId}/reviews`, { params: { page: reviewPage, limit: 5 } })
      .then((response) => {
        if (!active) return;
        setReviews(response.data?.data || []);
        setReviewPagination(response.data?.pagination || { page: reviewPage, limit: 5, total: 0, pages: 0 });
      })
      .catch(() => { if (active) setReviewsError('Chưa tải được đánh giá. Vui lòng thử lại.'); })
      .finally(() => { if (active) setReviewsLoading(false); });
    return () => { active = false; };
  }, [vehicleId, reviewPage, reviewsReload]);

  const monthKey = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`;
  useEffect(() => {
    let active = true;
    setAvailabilityLoading(true);
    setAvailabilityError('');
    setBlockedDates(null);
    api.get<{ data: { month: string; blockedDates: string[] } }>(`/vehicles/${vehicleId}/availability`, { params: { month: monthKey } })
      .then((response) => {
        if (!Array.isArray(response.data?.data?.blockedDates)) throw new Error('Invalid calendar response');
        if (active) setBlockedDates(response.data.data.blockedDates);
      })
      .catch(() => { if (active) setAvailabilityError('Chưa tải được lịch xe của tháng này. Vui lòng thử lại.'); })
      .finally(() => { if (active) setAvailabilityLoading(false); });
    return () => { active = false; };
  }, [vehicleId, monthKey, availabilityReload]);

  const calendarDays = useMemo<Array<number | null>>(() => {
    const year = calendarMonth.getFullYear();
    const monthIndex = calendarMonth.getMonth();
    const startOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    return [...Array<number | null>(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  }, [calendarMonth]);

  if (loading) {
    return <div role="status" className="min-h-[65vh] bg-[#101010] px-4 py-24 text-center text-[#A0A0A0]"><Loader2 className="mx-auto mb-4 h-7 w-7 animate-spin text-[#FFC799]" />Đang tải thông tin xe…</div>;
  }

  if (!vehicle || errorMessage) {
    return (
      <div className="min-h-[65vh] bg-[#101010] px-4 py-24 text-center text-[#F5F5F5]">
        <AlertCircle className="mx-auto mb-4 h-9 w-9 text-[#FFC799]" />
        <p role="alert" className="mx-auto max-w-lg text-base font-semibold leading-relaxed">{errorMessage || 'Không tìm thấy xe.'}</p>
        <button type="button" onClick={() => setVehicleReload((value) => value + 1)} className="mx-auto mt-6 flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm hover:bg-white/5"><RefreshCw className="h-4 w-4" /> Thử lại</button>
        <Link to={backToFleet} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#FFC799] px-5 py-3 text-sm font-bold text-[#101010]">
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách xe
        </Link>
      </div>
    );
  }

  const branch = typeof vehicle.branchId === 'object' && vehicle.branchId ? vehicle.branchId : null;
  const category = typeof vehicle.category === 'object' && vehicle.category ? vehicle.category : null;
  const images = (vehicle.images || []).map((image) => safeImageUrl(getOptimizedVehicleImageUrl(image))).filter(Boolean);
  const imageUrl = images[activeImage] || '';
  const canBook = vehicle.status === 'Available' && !vehicle.requiresMaintenance;
  const statusLabel = vehicle.requiresMaintenance ? 'Cần bảo dưỡng trước khi cho thuê' : vehicle.status === 'Available'
    ? 'Sẵn sàng nhận đặt xe'
    : vehicle.status === 'Rented'
      ? 'Đang có khách thuê'
      : vehicle.status === 'Transferring'
        ? 'Đang điều chuyển'
        : 'Đang bảo dưỡng';
  const blocked = new Set(blockedDates || []);
  const todayParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const todayPart = (part: string) => todayParts.find((value) => value.type === part)?.value || '';
  const todayKey = `${todayPart('year')}-${todayPart('month')}-${todayPart('day')}`;

  return (
    <div className="min-h-screen bg-[#101010] py-8 text-[#F5F5F5] sm:py-12 bg-editorial-grain">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link to={backToFleet} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#A0A0A0] transition hover:text-[#FFC799]">
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách xe
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section aria-label="Hình ảnh xe" className="min-w-0 self-start overflow-hidden rounded-3xl border border-white/10 bg-[#161616]">
            <div className="relative flex h-[280px] items-center justify-center studio-paper-backdrop p-5 sm:h-[480px] sm:p-8">
              {imageUrl && !imageFailed ? (
                <img {...getVehicleImageProps(imageUrl, { width: 1280, widths: [480, 640, 960, 1280], sizes: '(min-width: 1024px) 55vw, 100vw', priority: true })} alt={`${vehicle.vehicleModel}, ảnh ${activeImage + 1}`} onError={() => setImageFailed(true)} className="h-full w-full object-contain mix-blend-multiply" />
              ) : (
                <div className="flex flex-col items-center gap-3 p-8 text-center text-[#6E6E6E]"><ImageOff className="h-10 w-10" />{imageFailed ? 'Ảnh này hiện chưa tải được.' : 'Xe chưa có hình ảnh.'}</div>
              )}
              {images.length > 1 && <><button type="button" onClick={() => setActiveImage((index) => (index - 1 + images.length) % images.length)} aria-label="Ảnh trước" className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#101010]/80 text-white hover:bg-[#101010]"><ChevronLeft className="h-5 w-5" /></button><button type="button" onClick={() => setActiveImage((index) => (index + 1) % images.length)} aria-label="Ảnh tiếp theo" className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#101010]/80 text-white hover:bg-[#101010]"><ChevronRight className="h-5 w-5" /></button></>}
            </div>
            {images.length > 0 && (
              <div className="flex gap-3 overflow-x-auto p-4 sm:p-5">
                {images.map((image, index) => (
                  <button key={`${image}-${index}`} type="button" onClick={() => setActiveImage(index)} aria-label={`Xem ảnh ${index + 1}`} aria-pressed={activeImage === index}
                    className={`h-20 w-24 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition ${activeImage === index ? 'border-[#FFC799]' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                    <img {...getVehicleImageProps(image, { width: 160, widths: [160, 320], sizes: '96px' })} alt={`${vehicle.vehicleModel}, ảnh ${index + 1}`} className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="min-w-0 space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-[#161616] p-6 sm:p-8">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${canBook ? 'border-[#99FFE4]/25 bg-[#99FFE4]/10 text-[#99FFE4]' : 'border-[#FFC799]/30 bg-[#FFC799]/10 text-[#FFC799]'}`}>
                  {statusLabel}
                </span>
                {category && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#A0A0A0]">{category.name}</span>}
              </div>
              <p className="text-sm font-semibold uppercase tracking-widest text-[#FFC799]">{vehicle.brand}</p>
              <h1 className="mt-1 break-words text-3xl font-bold tracking-tight text-white sm:text-4xl">{vehicle.vehicleModel}</h1>
              <p className="mt-2 font-mono-tabular text-xs text-[#A0A0A0]">Biển số: {vehicle.licensePlate}</p>
              <a href="#vehicle-reviews" className="mt-3 inline-flex flex-wrap items-center gap-2 text-sm text-[#A0A0A0] hover:text-white">
                <Star className="h-4 w-4 fill-[#FFC799] text-[#FFC799]" />
                <span className="font-bold">{vehicle.reviewCount ? (vehicle.ratingAverage || 0).toFixed(1) : 'Chưa có đánh giá'}</span>
                {!!vehicle.reviewCount && <span className="text-[#6E6E6E]">({vehicle.reviewCount} đánh giá)</span>}
              </a>

              <div className="mt-6 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
                <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4">
                  <p className="text-xs text-[#A0A0A0]">Thuê theo ngày</p>
                  <p className="mt-1 text-xl font-black text-white">{money(vehicle.dailyPrice)}<span className="ml-1 text-xs font-semibold text-[#A0A0A0]">/ngày</span></p>
                </div>
                {vehicle.hourlyPrice ? (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4">
                    <p className="text-xs text-[#A0A0A0]">Thuê theo giờ</p>
                    <p className="mt-1 text-xl font-black text-white">{money(vehicle.hourlyPrice)}<span className="ml-1 text-xs font-semibold text-[#A0A0A0]">/giờ</span></p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4">
                    <p className="text-xs text-[#A0A0A0]">Thuê theo giờ</p>
                    <p className="mt-1 text-sm font-semibold leading-7 text-[#A0A0A0]">Chưa có giá theo giờ</p>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
                <div className="flex items-start gap-3 text-[#A0A0A0]"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#FFC799]" /><div><p className="font-medium text-[#F5F5F5]">{branch?.name || 'Chi nhánh Motorent'}</p>{branch?.address && <p className="mt-1 text-xs leading-relaxed">{branch.address}</p>}</div></div>
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 text-[#A0A0A0]">
                  <span className="flex items-center gap-2"><Gauge className="h-4 w-4 text-[#FFC799]" />{vehicle.odometer.toLocaleString('vi-VN')} km</span>
                  <span className="flex items-center gap-2">{vehicle.fuelType === 'Electric' ? <Zap className="h-4 w-4 text-[#FFC799]" /> : <Fuel className="h-4 w-4 text-[#FFC799]" />}{vehicle.fuelType === 'Electric' ? 'Điện' : 'Xăng'}</span>
                  <span className="flex items-center gap-2"><Timer className="h-4 w-4 text-[#FFC799]" />{vehicle.transmissionType === 'Automatic' ? 'Tự động' : vehicle.transmissionType === 'Manual' ? 'Côn tay' : 'Bán tự động'}</span>
                  <span>{vehicle.yearManufactured ? `Đời ${vehicle.yearManufactured}` : 'Chưa cập nhật đời xe'}{vehicle.color ? ` · ${vehicle.color}` : ''}</span>
                </div>
              </div>

              <button type="button" disabled={!canBook} onClick={() => navigate(`/booking/${vehicle._id}${bookingSearch ? `?${bookingSearch}` : ''}`)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFC799] px-5 py-3.5 text-sm font-semibold text-[#101010] transition hover:bg-[#FFD9BA] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#6E6E6E]">
                {canBook ? 'Chọn thời gian và đặt xe' : 'Xe hiện chưa nhận đặt'}
                {canBook && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>

            <section className="rounded-[2rem] border border-white/10 bg-[#161616] p-5 sm:p-6" aria-labelledby="availability-heading">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 id="availability-heading" className="flex items-center gap-2 text-lg font-black text-white"><CalendarDays className="h-5 w-5 text-[#FFC799]" /> Lịch xe</h2>
                  <p className="mt-1 text-xs text-[#6E6E6E]">Xem những ngày xe đã có lịch thuê.</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} aria-label="Tháng trước" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-[#A0A0A0] hover:bg-white/5"><ChevronLeft className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} aria-label="Tháng sau" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-[#A0A0A0] hover:bg-white/5"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="mb-3 text-sm font-bold capitalize text-white">{calendarMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</p>
              {availabilityError ? (
                <div role="alert" className="rounded-xl border border-[#FFC799]/20 bg-[#FFC799]/5 p-4 text-sm text-[#FFC799]"><p>{availabilityError}</p><button type="button" onClick={() => setAvailabilityReload((value) => value + 1)} className="mt-3 inline-flex items-center gap-2 font-semibold underline underline-offset-4"><RefreshCw className="h-3.5 w-3.5" /> Tải lại lịch</button></div>
              ) : <div className="grid grid-cols-7 gap-1.5 text-center text-xs" aria-busy={availabilityLoading}>
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day} className="py-2 font-semibold text-[#6E6E6E]">{day}</span>)}
                {calendarDays.map((day, index) => {
                  if (day === null) return <span key={`empty-${index}`} />;
                  const dateKey = toDateKey(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                  const isBooked = blocked.has(dateKey);
                  const isPast = dateKey < todayKey;
                  const known = blockedDates !== null && !availabilityLoading;
                  const label = !known ? 'đang tải lịch' : isBooked ? 'đã có lịch thuê' : isPast ? 'ngày đã qua, chưa có lịch thuê' : 'chưa có lịch thuê';
                  return <span key={dateKey} aria-label={`${day}/${calendarMonth.getMonth() + 1}, ${label}`} className={`rounded-lg py-2.5 font-mono-tabular ${!known ? 'animate-pulse bg-white/5 text-[#6E6E6E]' : isBooked ? 'bg-[#FFC799]/15 font-semibold text-[#FFC799]' : isPast ? 'text-[#6E6E6E]' : 'bg-[#99FFE4]/[0.07] text-[#99FFE4]'}`}>{day}</span>;
                })}
              </div>}
              {availabilityLoading && <p role="status" className="mt-3 flex items-center gap-2 text-xs text-[#A0A0A0]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang cập nhật lịch xe…</p>}
              {!availabilityError && !availabilityLoading && <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[#A0A0A0]">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#99FFE4]" />Chưa có lịch thuê</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#FFC799]" />Đã có lịch thuê</span>
              </div>}
              <p className="mt-3 text-[11px] leading-relaxed text-[#6E6E6E]">Lịch theo giờ Việt Nam. Thời gian nhận và trả xe sẽ được kiểm tra lại khi đặt xe.</p>
            </section>
          </section>
        </div>

        <section id="vehicle-reviews" className="mt-10 scroll-mt-24 rounded-3xl border border-white/10 bg-[#161616] p-5 sm:p-8" aria-labelledby="reviews-heading" aria-busy={reviewsLoading}>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="reviews-heading" className="text-2xl font-black text-white">Đánh giá từ khách thuê</h2>
              <p className="mt-1 text-sm text-[#A0A0A0]">{vehicle.reviewCount || 0} đánh giá đã được công khai</p>
            </div>
            <div className="flex items-center gap-2 text-[#FFC799]">
              <Star className="h-5 w-5 fill-current" />
              <span className="text-lg font-black">{vehicle.reviewCount ? (vehicle.ratingAverage || 0).toFixed(1) : '—'}</span>
            </div>
          </div>

          {reviewsLoading ? (
            <p role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-[#A0A0A0]"><Loader2 className="h-4 w-4 animate-spin text-[#FFC799]" /> Đang tải đánh giá…</p>
          ) : reviewsError ? (
            <div role="alert" className="rounded-2xl border border-[#FFC799]/20 bg-[#FFC799]/5 p-5 text-sm text-[#FFC799]"><p>{reviewsError}</p><button type="button" onClick={() => setReviewsReload((value) => value + 1)} className="mt-3 inline-flex items-center gap-2 font-semibold underline underline-offset-4"><RefreshCw className="h-4 w-4" /> Tải lại đánh giá</button></div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-[#A0A0A0]">Xe chưa có đánh giá công khai.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {reviews.map((review) => {
                const reviewer = typeof review.userId === 'object' && review.userId ? review.userId : null;
                const reviewerName = [reviewer?.firstName, reviewer?.lastName].filter(Boolean).join(' ') || 'Khách thuê';
                const avatar = safeImageUrl(getUserAvatarUrl(reviewer?.avatarUrl));
                const photos = (review.imageUrls || []).map((url) => safeImageUrl(getOptimizedVehicleImageUrl(url))).filter(Boolean);
                return (
                  <article key={review._id} className="min-w-0 rounded-2xl border border-white/[0.07] bg-[#101010] p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {avatar ? <img src={avatar} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-full object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFC799]/15 font-bold text-[#FFC799]">{reviewerName.slice(0, 1).toUpperCase()}</div>}
                        <div className="min-w-0"><p className="break-words text-sm font-semibold text-white">{reviewerName}</p><p className="mt-1 text-xs text-[#6E6E6E]">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</p></div>
                      </div>
                      <div className="flex gap-0.5" role="img" aria-label={`${review.rating} trên 5 sao`}>
                        {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < review.rating ? 'fill-[#FFC799] text-[#FFC799]' : 'text-[#4A4A4A]'}`} />)}
                      </div>
                    </div>
                    {review.comment && <p className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-[#A0A0A0]">{review.comment}</p>}
                    {photos.length > 0 && <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{photos.map((url, index) => <a key={`${url}-${index}`} href={url} target="_blank" rel="noopener noreferrer" aria-label={`Mở ảnh đánh giá ${index + 1} trong tab mới`} className="h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10"><img src={url} alt={`Ảnh đánh giá ${index + 1}`} loading="lazy" className="h-full w-full object-cover" /></a>)}</div>}
                    {review.response && <p className="mt-4 whitespace-pre-line break-words rounded-xl border-l-2 border-[#FFC799] bg-[#FFC799]/5 p-3 text-xs leading-relaxed text-[#A0A0A0]"><span className="font-bold text-[#FFC799]">Motorent phản hồi: </span>{review.response}</p>}
                  </article>
                );
              })}
            </div>
          )}

          {reviewPagination.pages > 1 && (
            <nav aria-label="Phân trang đánh giá" className="mt-6 flex items-center justify-center gap-4">
              <button type="button" aria-label="Trang đánh giá trước" disabled={reviewsLoading || reviewPage <= 1} onClick={() => setReviewPage((page) => page - 1)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-[#A0A0A0] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <span aria-live="polite" className="text-xs text-[#A0A0A0]">Trang {reviewPage} / {reviewPagination.pages}</span>
              <button type="button" aria-label="Trang đánh giá sau" disabled={reviewsLoading || reviewPage >= reviewPagination.pages} onClick={() => setReviewPage((page) => page + 1)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-[#A0A0A0] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </nav>
          )}
        </section>

        <div className="mt-6 flex justify-center">
          <Link to={`/rental-policy${location.search}`} state={{ fleetSearch }} className="inline-flex items-center gap-2 text-sm font-semibold text-[#FFC799] hover:text-[#FFD9BA]"><CheckCircle2 className="h-4 w-4" /> Đọc điều khoản thuê xe</Link>
        </div>
      </div>
    </div>
  );
};

