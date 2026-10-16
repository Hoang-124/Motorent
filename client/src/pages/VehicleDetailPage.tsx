import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Fuel,
  Gauge,
  MapPin,
  Star,
  Timer,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';
import type { Vehicle, VehicleReview } from '../types';
import { getOptimizedVehicleImageUrl } from '../utils/imageHelper';

interface ReviewPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const toDateKey = (year: number, monthIndex: number, day: number): string =>
  `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const money = (amount: number): string => `${amount.toLocaleString('vi-VN')} đ`;

export const VehicleDetailPage: React.FC = () => {
  const { vehicleId = '' } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [reviews, setReviews] = useState<VehicleReview[]>([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPagination, setReviewPagination] = useState<ReviewPagination>({ page: 1, limit: 5, total: 0, pages: 0 });
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage('');
    api.get(`/vehicles/${vehicleId}`)
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
  }, [vehicleId]);

  useEffect(() => {
    let active = true;
    api.get(`/vehicles/${vehicleId}/reviews`, { params: { page: reviewPage, limit: 5 } })
      .then((response) => {
        if (!active) return;
        setReviews(response.data?.data || []);
        setReviewPagination(response.data?.pagination || { page: reviewPage, limit: 5, total: 0, pages: 0 });
      })
      .catch(() => { if (active) setReviews([]); });
    return () => { active = false; };
  }, [vehicleId, reviewPage]);

  const monthKey = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`;
  useEffect(() => {
    let active = true;
    setAvailabilityLoading(true);
    api.get(`/vehicles/${vehicleId}/availability`, { params: { month: monthKey } })
      .then((response) => {
        if (active) setBlockedDates(response.data?.data?.blockedDates || []);
      })
      .catch(() => { if (active) setBlockedDates([]); })
      .finally(() => { if (active) setAvailabilityLoading(false); });
    return () => { active = false; };
  }, [vehicleId, monthKey]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const monthIndex = calendarMonth.getMonth();
    const startOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    return [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  }, [calendarMonth]);

  if (loading) {
    return <main className="min-h-[65vh] bg-[#060B0A] px-4 py-24 text-center text-slate-400">Đang tải thông tin xe…</main>;
  }

  if (!vehicle || errorMessage) {
    return (
      <main className="min-h-[65vh] bg-[#060B0A] px-4 py-24 text-center text-slate-200">
        <p className="text-lg font-bold">{errorMessage || 'Không tìm thấy xe.'}</p>
        <Link to="/bikes" className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-bold text-[#060D0B]">
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách xe
        </Link>
      </main>
    );
  }

  const branch = typeof vehicle.branchId === 'object' ? vehicle.branchId : null;
  const category = typeof vehicle.category === 'object' ? vehicle.category : null;
  const images = vehicle.images?.filter(Boolean) || [];
  const imageUrl = images[activeImage] ? getOptimizedVehicleImageUrl(images[activeImage]) : '';
  const statusLabel = vehicle.status === 'Available'
    ? 'Sẵn sàng nhận đặt xe'
    : vehicle.status === 'Rented'
      ? 'Đang có khách thuê'
      : vehicle.status === 'Transferring'
        ? 'Đang điều chuyển'
        : 'Đang bảo dưỡng';
  const blocked = new Set(blockedDates);
  const today = new Date();
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <main className="min-h-screen bg-[#060B0A] py-8 text-slate-100 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <button type="button" onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </button>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0B1513]">
            <div className="flex min-h-[300px] items-center justify-center bg-white sm:min-h-[480px]">
              {imageUrl ? (
                <img src={imageUrl} alt={vehicle.vehicleModel} className="h-full max-h-[520px] w-full object-contain" decoding="async" />
              ) : (
                <div className="p-12 text-center text-slate-500">Xe chưa có hình ảnh.</div>
              )}
            </div>
            {images.length > 0 && (
              <div className="flex gap-3 overflow-x-auto p-4 sm:p-5">
                {images.map((image, index) => (
                  <button key={`${image}-${index}`} type="button" onClick={() => setActiveImage(index)} aria-label={`Xem ảnh ${index + 1}`} aria-pressed={activeImage === index}
                    className={`h-20 w-24 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition ${activeImage === index ? 'border-emerald-400' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                    <img src={getOptimizedVehicleImageUrl(image)} alt={`${vehicle.vehicleModel}, ảnh ${index + 1}`} loading="lazy" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-[#0B1513] p-6 sm:p-8">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${vehicle.status === 'Available' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
                  {statusLabel}
                </span>
                {category && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{category.name}</span>}
              </div>
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">{vehicle.brand}</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">{vehicle.vehicleModel}</h1>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-bold">{vehicle.reviewCount ? vehicle.ratingAverage?.toFixed(1) : 'Chưa có đánh giá'}</span>
                {!!vehicle.reviewCount && <span className="text-slate-500">({vehicle.reviewCount} đánh giá)</span>}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4">
                  <p className="text-xs text-slate-400">Thuê theo ngày</p>
                  <p className="mt-1 text-xl font-black text-white">{money(vehicle.dailyPrice)}<span className="ml-1 text-xs font-semibold text-slate-400">/ngày</span></p>
                </div>
                {vehicle.hourlyPrice ? (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4">
                    <p className="text-xs text-slate-400">Thuê theo giờ</p>
                    <p className="mt-1 text-xl font-black text-white">{money(vehicle.hourlyPrice)}<span className="ml-1 text-xs font-semibold text-slate-400">/giờ</span></p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4">
                    <p className="text-xs text-slate-400">Tiền cọc tham khảo 30%</p>
                    <p className="mt-1 text-xl font-black text-emerald-300">{money(Math.round(vehicle.dailyPrice * 0.3))}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
                <div className="flex items-center gap-3 text-slate-300"><MapPin className="h-4 w-4 text-emerald-400" /><span>{branch?.name || 'Chi nhánh Motorent'}</span></div>
                <div className="grid grid-cols-2 gap-3 text-slate-300">
                  <span className="flex items-center gap-2"><Gauge className="h-4 w-4 text-emerald-400" />{vehicle.odometer.toLocaleString('vi-VN')} km</span>
                  <span className="flex items-center gap-2">{vehicle.fuelType === 'Electric' ? <Zap className="h-4 w-4 text-emerald-400" /> : <Fuel className="h-4 w-4 text-emerald-400" />}{vehicle.fuelType === 'Electric' ? 'Điện' : 'Xăng'}</span>
                  <span className="flex items-center gap-2"><Timer className="h-4 w-4 text-emerald-400" />{vehicle.transmissionType === 'Automatic' ? 'Tự động' : vehicle.transmissionType === 'Manual' ? 'Côn tay' : 'Bán tự động'}</span>
                  <span>{vehicle.yearManufactured ? `Đời ${vehicle.yearManufactured}` : 'Chưa cập nhật đời xe'}{vehicle.color ? ` · ${vehicle.color}` : ''}</span>
                </div>
              </div>

              <button type="button" disabled={vehicle.status !== 'Available'} onClick={() => navigate(`/booking/${vehicle._id}`)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3.5 text-sm font-black text-[#06100D] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500">
                {vehicle.status === 'Available' ? 'Chọn thời gian và đặt xe' : 'Xe hiện chưa nhận đặt'}
                {vehicle.status === 'Available' && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>

            <section className="rounded-[2rem] border border-white/10 bg-[#0B1513] p-5 sm:p-6" aria-labelledby="availability-heading">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 id="availability-heading" className="flex items-center gap-2 text-lg font-black text-white"><CalendarDays className="h-5 w-5 text-emerald-400" /> Lịch xe</h2>
                  <p className="mt-1 text-xs text-slate-500">Ngày có lịch thuê được đánh dấu màu hổ phách.</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} aria-label="Tháng trước" className="rounded-lg p-2 text-slate-300 hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} aria-label="Tháng sau" className="rounded-lg p-2 text-slate-300 hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="mb-3 text-sm font-bold capitalize text-white">{calendarMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}{availabilityLoading && <span className="ml-2 text-xs font-normal text-slate-500">Đang cập nhật…</span>}</p>
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day} className="py-2 font-semibold text-slate-500">{day}</span>)}
                {calendarDays.map((day, index) => {
                  if (day === null) return <span key={`empty-${index}`} />;
                  const dateKey = toDateKey(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                  const isBooked = blocked.has(dateKey);
                  const isPast = dateKey < todayKey;
                  return <span key={dateKey} aria-label={`${day}${isBooked ? ', đã có lịch thuê' : ', chưa có lịch thuê'}`} className={`rounded-lg py-2 font-semibold ${isBooked ? 'bg-amber-500/15 text-amber-300' : isPast ? 'text-slate-700' : 'bg-emerald-500/10 text-emerald-300'}`}>{day}</span>;
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Chưa có lịch thuê</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Đã có lịch thuê</span>
              </div>
            </section>
          </section>
        </div>

        <section className="mt-10 rounded-[2rem] border border-white/10 bg-[#0B1513] p-5 sm:p-8" aria-labelledby="reviews-heading">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="reviews-heading" className="text-2xl font-black text-white">Đánh giá từ khách thuê</h2>
              <p className="mt-1 text-sm text-slate-400">{reviewPagination.total} đánh giá đã được công khai</p>
            </div>
            <div className="flex items-center gap-2 text-amber-300">
              <Star className="h-5 w-5 fill-current" />
              <span className="text-lg font-black">{vehicle.reviewCount ? vehicle.ratingAverage?.toFixed(1) : '—'}</span>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-slate-400">Xe chưa có đánh giá công khai.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {reviews.map((review) => {
                const reviewer = typeof review.userId === 'object' ? review.userId : null;
                const reviewerName = reviewer?.firstName || 'Khách thuê';
                return (
                  <article key={review._id} className="rounded-2xl border border-white/5 bg-white/[0.025] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {reviewer?.avatarUrl ? <img src={reviewer.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 font-bold text-emerald-300">{reviewerName.slice(0, 1).toUpperCase()}</div>}
                        <div><p className="font-bold text-white">{reviewerName}</p><p className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</p></div>
                      </div>
                      <div className="flex gap-0.5" aria-label={`${review.rating} trên 5 sao`}>
                        {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} />)}
                      </div>
                    </div>
                    {review.comment && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-300">{review.comment}</p>}
                    {!!review.imageUrls?.length && <div className="mt-4 flex gap-2 overflow-x-auto">{review.imageUrls.map((url, index) => <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10"><img src={getOptimizedVehicleImageUrl(url)} alt={`Ảnh đánh giá ${index + 1}`} loading="lazy" className="h-full w-full object-cover" /></a>)}</div>}
                    {review.response && <p className="mt-4 rounded-xl border-l-2 border-emerald-500 bg-emerald-500/5 p-3 text-xs leading-relaxed text-slate-300"><span className="font-bold text-emerald-300">Motorent phản hồi: </span>{review.response}</p>}
                  </article>
                );
              })}
            </div>
          )}

          {reviewPagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button type="button" disabled={reviewPage <= 1} onClick={() => setReviewPage((page) => page - 1)} className="rounded-full border border-white/10 p-2 text-slate-300 hover:bg-white/10 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-xs text-slate-400">Trang {reviewPage} / {reviewPagination.pages}</span>
              <button type="button" disabled={reviewPage >= reviewPagination.pages} onClick={() => setReviewPage((page) => page + 1)} className="rounded-full border border-white/10 p-2 text-slate-300 hover:bg-white/10 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </section>

        <div className="mt-6 flex justify-center">
          <Link to="/rental-policy" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 hover:text-emerald-200"><CheckCircle2 className="h-4 w-4" /> Đọc điều khoản thuê xe</Link>
        </div>
      </div>
    </main>
  );
};
