import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../services/api';

interface PublicStaticPage {
  slug: string;
  title: string;
  content: string;
  updatedAt?: string;
}

const ALLOWED_TAGS = new Set([
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'UL',
  'OL',
  'LI',
  'STRONG',
  'EM',
  'B',
  'I',
  'U',
  'S',
  'STRIKE',
  'A',
  'BR',
  'HR',
  'BLOCKQUOTE',
  'TABLE',
  'THEAD',
  'TBODY',
  'TFOOT',
  'TR',
  'TH',
  'TD',
  'CODE',
  'PRE',
  'SPAN',
]);

const sanitizePolicyHtml = (rawHtml: string): string => {
  if (!rawHtml || typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return rawHtml || '';
  }

  const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
  const sanitizeElement = (el: Element) => {
    const children = Array.from(el.children);
    for (const child of children) {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'].includes(child.tagName)) {
          child.remove();
        } else {
          sanitizeElement(child);
          child.replaceWith(...Array.from(child.childNodes));
        }
        continue;
      }

      for (const attr of Array.from(child.attributes)) {
        const attrName = attr.name.toLowerCase();
        if (attrName.startsWith('on') || attrName === 'style') {
          child.removeAttribute(attr.name);
          continue;
        }
        if (child.tagName === 'A' && attrName === 'href') {
          const hrefVal = attr.value.trim();
          const isSafeHref =
            hrefVal.startsWith('/') ||
            hrefVal.startsWith('#') ||
            /^(https?:|mailto:|tel:)/i.test(hrefVal);
          if (!isSafeHref) {
            child.removeAttribute('href');
          }
        } else if (
          !(
            (child.tagName === 'A' && ['target', 'rel', 'title', 'name'].includes(attrName)) ||
            (['TH', 'TD'].includes(child.tagName) && ['colspan', 'rowspan', 'scope', 'align'].includes(attrName)) ||
            attrName === 'class'
          )
        ) {
          child.removeAttribute(attr.name);
        }
      }

      if (child.tagName === 'A' && child.getAttribute('target') === '_blank') {
        child.setAttribute('rel', 'noopener noreferrer');
      }

      sanitizeElement(child);
    }
  };

  sanitizeElement(doc.body);
  return doc.body.innerHTML;
};

export const RentalPolicyPage: React.FC = () => {
  const location = useLocation();
  const navigationState = location.state as { fleetSearch?: string } | null;
  const fleetSearch =
    typeof navigationState?.fleetSearch === 'string' && navigationState.fleetSearch.startsWith('?')
      ? navigationState.fleetSearch
      : location.search;
  const [page, setPage] = useState<PublicStaticPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage('');
    setPage(null);
    api
      .get<{ data: PublicStaticPage }>('/pages/dieu-khoan-dich-vu')
      .then((response) => {
        if (active) setPage(response.data?.data || null);
      })
      .catch(() => {
        if (active) {
          setErrorMessage('Chưa tải được điều khoản thuê xe đã xuất bản. Vui lòng thử lại sau.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  const renderedHtml = useMemo(() => {
    if (!page?.content) return '';
    const hasHtmlMarkup = /<[a-z][\s\S]*>/i.test(page.content);
    if (!hasHtmlMarkup) return '';
    return sanitizePolicyHtml(page.content);
  }, [page?.content]);

  return (
    <div className="min-h-[70vh] bg-[#101010] py-8 text-[#F5F5F5] sm:py-14 bg-editorial-grain">
      <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link
          to={`/bikes${fleetSearch}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#A0A0A0] hover:text-[#FFC799] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Danh sách xe
        </Link>
        <div className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-[#161616] p-5 sm:p-10 shadow-xl">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FFC799]/20 bg-[#FFC799]/10 text-[#FFC799]">
            <FileText className="h-6 w-6" />
          </div>
          {loading ? (
            <p role="status" className="flex items-center gap-2 py-6 text-sm text-[#A0A0A0]">
              <Loader2 className="h-4 w-4 animate-spin text-[#FFC799]" /> Đang tải điều khoản…
            </p>
          ) : errorMessage ? (
            <div
              role="alert"
              className="rounded-2xl border border-[#FFC799]/20 bg-[#FFC799]/5 p-5 text-sm text-[#FFC799]"
            >
              <p className="leading-relaxed">{errorMessage}</p>
              <button
                type="button"
                onClick={() => setReload((value) => value + 1)}
                className="mt-4 inline-flex items-center gap-2 font-semibold underline underline-offset-4"
              >
                <RefreshCw className="h-4 w-4" /> Tải lại điều khoản
              </button>
            </div>
          ) : page ? (
            <>
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[#FFC799]">
                Thông tin thuê xe • Motorent Đà Nẵng
              </p>
              <h1 className="break-words text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {page.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#707070]">
                {page.updatedAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#FFC799]" />
                    <span>Cập nhật {new Date(page.updatedAt).toLocaleDateString('vi-VN')}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#FFC799]" />
                  <span>Chính sách áp dụng toàn hệ thống</span>
                </span>
              </div>

              {renderedHtml ? (
                <div
                  className="mt-7 border-t border-white/10 pt-7 prose prose-invert max-w-none text-[#D0D0D0] text-sm leading-relaxed space-y-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-[#F5F5F5] [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#FFC799] [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[#F5F5F5] [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:text-sm [&_p]:text-[#C8C8C8] [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_li]:text-sm [&_li]:text-[#C8C8C8] [&_strong]:text-[#F5F5F5] [&_blockquote]:border-l-2 [&_blockquote]:border-[#FFC799] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#A0A0A0] [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-white/10 [&_th]:p-3 [&_th]:bg-white/[0.04] [&_th]:text-left [&_td]:border [&_td]:border-white/10 [&_td]:p-3 [&_a]:text-[#FFC799] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[#FFD6B3]"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              ) : (
                <div className="mt-7 whitespace-pre-wrap break-words border-t border-white/10 pt-7 text-sm leading-8 text-[#C8C8C8] sm:text-base sm:leading-8">
                  {page.content || 'Nội dung điều khoản đang được cập nhật.'}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-[#A0A0A0]">Nội dung điều khoản hiện chưa khả dụng.</p>
          )}
        </div>
      </article>
    </div>
  );
};
