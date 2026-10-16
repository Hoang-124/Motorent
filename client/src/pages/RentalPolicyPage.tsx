import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { api } from '../services/api';

interface PublicStaticPage {
  slug: string;
  title: string;
  content: string;
  updatedAt?: string;
}

export const RentalPolicyPage: React.FC = () => {
  const [page, setPage] = useState<PublicStaticPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/pages/dieu-khoan-dich-vu')
      .then((response) => { if (active) setPage(response.data?.data || null); })
      .catch(() => { if (active) setErrorMessage('Chưa có điều khoản thuê xe được xuất bản. Vui lòng thử lại sau.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-[70vh] bg-[#060B0A] py-12 text-slate-100 sm:py-16">
      <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link to="/bikes" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Danh sách xe
        </Link>
        <div className="mt-7 rounded-[2rem] border border-white/10 bg-[#0B1513] p-6 shadow-2xl sm:p-10">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
            <FileText className="h-6 w-6" />
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">Đang tải điều khoản…</p>
          ) : errorMessage ? (
            <p role="alert" className="text-sm text-amber-200">{errorMessage}</p>
          ) : page ? (
            <>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{page.title}</h1>
              {page.updatedAt && <p className="mt-3 text-xs text-slate-500">Cập nhật {new Date(page.updatedAt).toLocaleDateString('vi-VN')}</p>}
              <div className="mt-8 whitespace-pre-line text-sm leading-8 text-slate-300 sm:text-base">{page.content}</div>
            </>
          ) : (
            <p className="text-sm text-slate-400">Nội dung điều khoản hiện chưa khả dụng.</p>
          )}
        </div>
      </article>
    </main>
  );
};
