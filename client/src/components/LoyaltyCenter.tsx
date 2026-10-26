import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgePercent, Check, Copy, Gift, LoaderCircle, RefreshCw, Ticket, Users } from 'lucide-react';
import axios from 'axios';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface LoyaltyVoucher {
  code: string;
  fixedDiscountAmount: number;
  redemptionPoints: number;
  startDate: string;
  endDate: string;
  usedCount: number;
  usageLimit: number;
  isActive: boolean;
}

interface LoyaltyReferral {
  username: string;
  referralRewarded: boolean;
  createdAt: string;
}

interface LoyaltySummary {
  points: number;
  referralCode: string;
  promoSubscribed: boolean;
  referralBonusPoints: number;
  referrals: LoyaltyReferral[];
  vouchers: LoyaltyVoucher[];
}

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.';
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
};

const formatVnd = (amount: number): string =>
  `${new Intl.NumberFormat('vi-VN').format(amount)} VND`;

export const LoyaltyCenter: React.FC = () => {
  const { updateUser, refreshProfile } = useAuth();
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState(100);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState('');

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/loyalty/me');
      setSummary(response.data.data as LoyaltySummary);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const referralLink = useMemo(
    () => summary?.referralCode
      ? `${window.location.origin}/register?ref=${encodeURIComponent(summary.referralCode)}`
      : '',
    [summary?.referralCode]
  );

  const handleCopy = async (value: string, kind: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(''), 1800);
    } catch (copyError: unknown) {
      setError(getErrorMessage(copyError));
    }
  };

  const handleRedeem = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const response = await api.post('/loyalty/redeem', { points: redeemPoints });
      const code = response.data.data.code as string;
      setNotice(`Đã đổi điểm thành công. Mã voucher của bạn là ${code}.`);
      await loadSummary();
      await refreshProfile();
    } catch (redeemError: unknown) {
      setError(getErrorMessage(redeemError));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromoSubscription = async (promoSubscribed: boolean) => {
    if (!summary) return;
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const response = await api.put('/auth/me/preferences', { promoSubscribed });
      updateUser(response.data.data);
      setSummary({ ...summary, promoSubscribed });
      setNotice(promoSubscribed ? 'Đã đăng ký nhận ưu đãi.' : 'Đã tắt email ưu đãi.');
    } catch (preferenceError: unknown) {
      setError(getErrorMessage(preferenceError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#161616] py-16 text-sm text-[#A0A0A0]">
        <LoaderCircle className="h-4 w-4 animate-spin text-[#FFC799]" />
        Đang tải quyền lợi thành viên
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#161616] p-6 text-center">
        <p className="text-sm text-[#FF9A9A]">{error || 'Không thể tải thông tin thành viên.'}</p>
        <button
          type="button"
          onClick={() => void loadSummary()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white hover:border-[#FFC799]/60"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-6" aria-label="Điểm thưởng và giới thiệu">
      {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{notice}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-[#FFC799]/25 bg-gradient-to-br from-[#FFC799]/12 to-transparent p-5 md:col-span-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FFC799]">
            <BadgePercent className="h-4 w-4" />
            Điểm thành viên
          </div>
          <p className="mt-4 font-mono text-4xl font-bold text-white">{summary.points.toLocaleString('vi-VN')}</p>
          <p className="mt-2 text-xs leading-5 text-[#A0A0A0]">1 điểm cho mỗi 10.000 VND giá trị đơn sau giảm giá.</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#161616] p-5 md:col-span-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#A0A0A0]">
            <Gift className="h-4 w-4 text-[#FFC799]" />
            Đổi điểm thành voucher
          </div>
          <p className="mt-3 text-xs leading-5 text-[#A0A0A0]">100 điểm đổi 10.000 VND giảm giá. Voucher dùng một lần, có hiệu lực trong 90 ngày.</p>
          <form onSubmit={handleRedeem} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="loyalty-points">Số điểm muốn đổi</label>
            <input
              id="loyalty-points"
              type="number"
              min={100}
              step={100}
              max={summary.points - (summary.points % 100)}
              value={redeemPoints}
              onChange={(event) => setRedeemPoints(Number(event.target.value))}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#101010] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FFC799]"
            />
            <button
              type="submit"
              disabled={submitting || redeemPoints > summary.points || redeemPoints < 100 || redeemPoints % 100 !== 0}
              className="rounded-xl bg-[#FFC799] px-5 py-2.5 text-xs font-bold text-[#101010] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? 'Đang xử lý...' : `Đổi lấy ${formatVnd(redeemPoints * 100)}`}
            </button>
          </form>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-[#161616] p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#A0A0A0]">
            <Users className="h-4 w-4 text-[#FFC799]" />
            Mời bạn bè
          </div>
          <p className="mt-3 text-xs leading-5 text-[#A0A0A0]">Bạn và người được mời nhận {summary.referralBonusPoints} điểm mỗi người sau khi họ hoàn tất chuyến thuê đầu tiên.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#6E6E6E]">Mã giới thiệu</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <code className="font-mono text-sm font-bold tracking-wider text-[#FFC799]">{summary.referralCode}</code>
                <button type="button" onClick={() => void handleCopy(summary.referralCode, 'code')} aria-label="Sao chép mã giới thiệu" className="rounded-lg p-2 text-[#A0A0A0] hover:bg-white/5 hover:text-white">
                  {copied === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#6E6E6E]">Liên kết mời</p>
              <button type="button" onClick={() => void handleCopy(referralLink, 'link')} className="mt-2 flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-white hover:text-[#FFC799]">
                <span className="truncate">{referralLink}</span>
                {copied === 'link' ? <Check className="h-4 w-4 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
              </button>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6E6E6E]">Lượt giới thiệu ({summary.referrals.length})</p>
            {summary.referrals.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-xs text-[#6E6E6E]">Chưa có lượt giới thiệu.</p>
            ) : summary.referrals.map((referral) => (
              <div key={`${referral.username}-${referral.createdAt}`} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2.5 text-xs">
                <span className="text-white">{referral.username}</span>
                <span className={referral.referralRewarded ? 'text-emerald-300' : 'text-[#A0A0A0]'}>
                  {referral.referralRewarded ? 'Đã thưởng' : 'Chờ chuyến đầu'}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#161616] p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#A0A0A0]">
            <Ticket className="h-4 w-4 text-[#FFC799]" />
            Voucher của tôi
          </div>
          <div className="mt-4 space-y-3">
            {summary.vouchers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-xs text-[#6E6E6E]">Voucher đổi điểm sẽ xuất hiện tại đây.</p>
            ) : summary.vouchers.map((voucher) => {
              const isAvailable = voucher.isActive && voucher.usedCount < voucher.usageLimit && new Date(voucher.endDate) >= new Date();
              return (
                <div key={voucher.code} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <code className="font-mono text-sm font-bold text-[#FFC799]">{voucher.code}</code>
                    <p className="mt-1 text-xs text-white">Giảm {formatVnd(voucher.fixedDiscountAmount)}</p>
                    <p className="mt-1 text-[10px] text-[#6E6E6E]">Hết hạn {new Date(voucher.endDate).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <button type="button" onClick={() => void handleCopy(voucher.code, voucher.code)} aria-label={`Sao chép voucher ${voucher.code}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white hover:border-[#FFC799]/40">
                    {copied === voucher.code ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {isAvailable ? 'Sao chép mã' : 'Đã sử dụng / hết hạn'}
                  </button>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      <article className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#161616] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Nhận ưu đãi qua email</h2>
          <p className="mt-1 text-xs text-[#A0A0A0]">Chỉ gửi thông tin khuyến mãi. Email giao dịch và xác nhận đặt xe vẫn được gửi riêng.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={summary.promoSubscribed}
          disabled={submitting}
          onClick={() => void handlePromoSubscription(!summary.promoSubscribed)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${summary.promoSubscribed ? 'bg-[#FFC799]' : 'bg-white/15'}`}
          aria-label="Bật hoặc tắt email ưu đãi"
        >
          <span className={`h-5 w-5 rounded-full bg-white transition-transform ${summary.promoSubscribed ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </article>
    </section>
  );
};
