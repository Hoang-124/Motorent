import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  HelpCircle,
  FileCheck2,
  Shield,
  ArrowLeft,
  Calendar,
  Sparkles,
  PhoneCall,
  Compass,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Home,
} from 'lucide-react';
import { pageService } from '../services/pageService';
import type { StaticPage } from '../types';

export const StaticPageView: React.FC = () => {
  const { slug: paramSlug } = useParams<{ slug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active slug: either /pages/:slug or direct aliases /faq, /terms, /privacy
  let activeSlug = paramSlug;
  if (!activeSlug) {
    const directSlug = location.pathname.replace(/^\//, '').split('/')[0];
    if (['faq', 'terms', 'privacy'].includes(directSlug)) {
      activeSlug = directSlug;
    }
  }

  const [page, setPage] = useState<StaticPage | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);

  useEffect(() => {
    if (!activeSlug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setNotFound(false);

    pageService
      .getPublicPage(activeSlug)
      .then((data) => {
        if (!isMounted) return;
        setPage(data);
        // Rule: Set document title theo title
        document.title = `${data.title} | MOTORENT Đà Nẵng`;
      })
      .catch(() => {
        if (!isMounted) return;
        setNotFound(true);
        document.title = '404 - Không Tìm Thấy Trang | MOTORENT';
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeSlug]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-[#101010] text-[#F5F5F5] pt-28 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse">
          <div className="h-4 w-32 bg-white/10 rounded-full" />
          <div className="space-y-3">
            <div className="h-10 w-3/4 bg-white/10 rounded-xl" />
            <div className="h-4 w-1/3 bg-white/5 rounded-full" />
          </div>
          <div className="space-y-4 pt-8 border-t border-white/[0.08]">
            <div className="h-5 w-full bg-white/5 rounded" />
            <div className="h-5 w-5/6 bg-white/5 rounded" />
            <div className="h-5 w-4/6 bg-white/5 rounded" />
            <div className="h-24 w-full bg-white/5 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // 404 Not Found View
  if (notFound || !page) {
    return (
      <div className="min-h-screen bg-[#101010] text-[#F5F5F5] pt-32 pb-24 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#FFC799]">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <p className="font-mono text-xs text-[#FFC799] uppercase tracking-widest">
              LỖI TRUY CẬP 404
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F5F5F5]">
              Không Tìm Thấy Trang
            </h1>
            <p className="text-xs sm:text-sm text-[#A0A0A0] leading-relaxed">
              Trang bạn đang tìm kiếm không tồn tại, đã bị gỡ bỏ hoặc đang ở chế độ bản nháp chưa công bố.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] text-xs font-semibold transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Về Trang Chủ</span>
            </Link>
            <Link
              to="/bikes"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-[#1E1E1E] hover:bg-white/[0.08] text-[#F5F5F5] border border-white/10 text-xs font-semibold transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-[#FFC799]" />
              <span>Khám Phá Đội Xe</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Breadcrumbs & System Hub Quick Links */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center space-x-2 text-xs text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại</span>
          </button>

          {/* Quick tab switch between 3 primary system documents */}
          <div className="flex items-center space-x-1.5 p-1 rounded-full bg-[#181818] border border-white/[0.08]">
            <Link
              to="/faq"
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                activeSlug === 'faq'
                  ? 'bg-[#FFC799] text-[#101010]'
                  : 'text-[#A0A0A0] hover:text-[#F5F5F5]'
              }`}
            >
              FAQ
            </Link>
            <Link
              to="/terms"
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                activeSlug === 'terms'
                  ? 'bg-[#FFC799] text-[#101010]'
                  : 'text-[#A0A0A0] hover:text-[#F5F5F5]'
              }`}
            >
              Điều khoản
            </Link>
            <Link
              to="/privacy"
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                activeSlug === 'privacy'
                  ? 'bg-[#FFC799] text-[#101010]'
                  : 'text-[#A0A0A0] hover:text-[#F5F5F5]'
              }`}
            >
              Bảo mật
            </Link>
          </div>
        </div>

        {/* Page Article Header */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-[11px] font-mono uppercase tracking-wider text-[#FFC799]">
            {page.type === 'FAQ' && <HelpCircle className="w-3.5 h-3.5" />}
            {page.type === 'Terms' && <FileCheck2 className="w-3.5 h-3.5" />}
            {page.type === 'Privacy' && <Shield className="w-3.5 h-3.5" />}
            {page.type === 'Other' && <FileText className="w-3.5 h-3.5" />}
            <span>TRANG THÔNG TIN MOTORENT ĐÀ NẴNG</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#F5F5F5] leading-snug">
            {page.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[#707070] pt-2">
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#FFC799]" />
              <span>
                Cập nhật:{' '}
                {new Date(page.updatedAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FFC799]" />
              <span>Chính sách áp dụng toàn hệ thống</span>
            </div>
          </div>
        </div>

        {/* Sanitized Article Body */}
        <div className="p-6 sm:p-10 rounded-2xl bg-[#141414] border border-white/[0.08] shadow-xl">
          <div
            className="prose prose-invert max-w-none text-[#D0D0D0] text-sm leading-relaxed space-y-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-[#F5F5F5] [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#FFC799] [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[#F5F5F5] [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:text-sm [&_p]:text-[#C8C8C8] [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_li]:text-sm [&_li]:text-[#C8C8C8] [&_blockquote]:border-l-2 [&_blockquote]:border-[#FFC799] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#A0A0A0] [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-white/10 [&_th]:p-3 [&_th]:bg-white/[0.04] [&_th]:text-left [&_td]:border [&_td]:border-white/10 [&_td]:p-3 [&_a]:text-[#FFC799] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[#FFD6B3]"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </div>

        {/* Assistance Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#1B1B1B] to-[#161616] border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm font-semibold text-[#F5F5F5]">
              Cần hỗ trợ trực tiếp từ điều phối viên?
            </h4>
            <p className="text-xs text-[#A0A0A0]">
              Hotline hỗ trợ kỹ thuật và giao xe tận nơi hoạt động 24/7 tại Đà Nẵng.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="tel:02363822101"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#1E1E1E] hover:bg-white/[0.08] text-[#F5F5F5] border border-white/12 text-xs font-medium transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#FFC799]" />
              <span className="font-mono">(0236) 3822 101</span>
            </a>
            <Link
              to="/bikes"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] text-xs font-bold transition-colors"
            >
              <span>Đặt xe ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
