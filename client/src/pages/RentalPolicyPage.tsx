import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface PublicStaticPage {
  slug: string;
  title: string;
  content: string;
  updatedAt?: string;
}

export const RentalPolicyPage: React.FC = () => {
  const location = useLocation();
  const navigationState = location.state as { fleetSearch?: string } | null;
  const fleetSearch = typeof navigationState?.fleetSearch === 'string' && navigationState.fleetSearch.startsWith('?')
    ? navigationState.fleetSearch : location.search;
  const [page, setPage] = useState<PublicStaticPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage('');
    setPage(null);
    api.get<{ data: PublicStaticPage }>('/pages/dieu-khoan-dich-vu')
      .then((response) => { if (active) setPage(response.data?.data || null); })
      .catch(() => { if (active) setErrorMessage('Chưa tải được điều khoản thuê xe đã xuất bản. Vui lòng thử lại sau.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  return (
    <div className="min-h-[70vh] bg-[#101010] py-8 text-[#F5F5F5] sm:py-14 bg-editorial-grain">
      <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link to={`/bikes${fleetSearch}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[#A0A0A0] hover:text-[#FFC799]">
          <ArrowLeft className="h-4 w-4" /> Danh sách xe
        </Link>
        <div className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-[#161616] p-5 sm:p-10">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FFC799]/20 bg-[#FFC799]/10 text-[#FFC799]">
            <FileText className="h-6 w-6" />
          </div>
          {loading ? (
            <p role="status" className="flex items-center gap-2 py-6 text-sm text-[#A0A0A0]"><Loader2 className="h-4 w-4 animate-spin text-[#FFC799]" /> Đang tải điều khoản…</p>
          ) : errorMessage ? (
            <div role="alert" className="rounded-2xl border border-[#FFC799]/20 bg-[#FFC799]/5 p-5 text-sm text-[#FFC799]"><p className="leading-relaxed">{errorMessage}</p><button type="button" onClick={() => setReload((value) => value + 1)} className="mt-4 inline-flex items-center gap-2 font-semibold underline underline-offset-4"><RefreshCw className="h-4 w-4" /> Tải lại điều khoản</button></div>
          ) : page ? (
            <>
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[#FFC799]">Thông tin thuê xe</p>
              <h1 className="break-words text-3xl font-bold tracking-tight text-white sm:text-4xl">{page.title}</h1>
              {page.updatedAt && <p className="mt-3 text-xs text-[#6E6E6E]">Cập nhật {new Date(page.updatedAt).toLocaleDateString('vi-VN')}</p>}
              {/* The existing publishing script stores plain text. React escapes all markup. */}
              <div className="mt-7 whitespace-pre-wrap break-words border-t border-white/10 pt-7 text-sm leading-8 text-[#A0A0A0] sm:text-base sm:leading-8">{page.content || 'Nội dung điều khoản đang được cập nhật.'}</div>
            </>
          ) : (
            <p className="text-sm text-[#A0A0A0]">Nội dung điều khoản hiện chưa khả dụng.</p>
          )}
        </div>
      </article>
    </div>
  );
};

