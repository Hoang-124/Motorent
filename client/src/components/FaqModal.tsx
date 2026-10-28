import React, { useState, useEffect } from 'react';
import { HelpCircle, X, ChevronDown, ShieldCheck, PhoneCall, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import type { Branch, StaticPage } from '../types';

interface FaqModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedFaqItem {
  q: string;
  a: string;
}

const stripHtmlTags = (html: string): string =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();

const parseFaqHtmlContent = (html: string): ParsedFaqItem[] => {
  if (!html) return [];
  const items: ParsedFaqItem[] = [];
  const regex = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const q = stripHtmlTags(match[1]);
    const a = stripHtmlTags(match[2]);
    if (q && a) {
      items.push({ q, a });
    }
  }
  if (items.length === 0) {
    const plain = stripHtmlTags(html);
    if (plain) {
      items.push({ q: 'Thông tin Câu hỏi thường gặp', a: plain });
    }
  }
  return items;
};

export const FaqModal: React.FC<FaqModalProps> = ({ isOpen, onClose }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [faqItems, setFaqItems] = useState<ParsedFaqItem[]>([]);
  const [hotline, setHotline] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    Promise.all([
      api.get('/pages/faq').catch(() => null),
      api.get('/branches').catch(() => null),
    ])
      .then(([pageRes, branchRes]) => {
        if (!active) return;
        const pageData: StaticPage | undefined = pageRes?.data?.data;
        if (pageData?.content) {
          setFaqItems(parseFaqHtmlContent(pageData.content));
        }
        const branchList: Branch[] = branchRes?.data?.data || [];
        if (branchList.length > 0 && branchList[0].phone) {
          setHotline(branchList[0].phone);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-2xl bg-[#161616] border border-[#FFC799]/30 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-white/10">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-bold text-[#FFC799] bg-[#101010] border border-[#FFC799]/30 px-3 py-1 rounded-full mb-2">
              <HelpCircle className="w-3.5 h-3.5 text-[#FFC799]" />
              <span>Trung tâm trợ giúp</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Câu hỏi thường gặp (FAQ)
            </h3>
            <p className="text-xs sm:text-sm text-[#A0A0A0] mt-1">
              Giải đáp trực tiếp từ cơ sở dữ liệu chính sách chính thức của Motorent
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#A0A0A0] hover:text-white transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FAQ list */}
        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="py-8 flex items-center justify-center space-x-2 text-xs text-[#A0A0A0]">
              <RefreshCw className="w-4 h-4 text-[#FFC799] animate-spin" />
              <span>Đang tải câu hỏi thường gặp...</span>
            </div>
          ) : faqItems.length === 0 ? (
            <div className="p-5 rounded-2xl border border-white/10 bg-[#101010] text-xs text-[#A0A0A0] text-center">
              Nội dung FAQ hiện đang được cập nhật trên hệ thống CMS.
            </div>
          ) : (
            faqItems.map((faq, index) => {
              const isOpenItem = openIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-white/10 bg-[#161616] overflow-hidden transition-all duration-200"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpenItem ? null : index)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-bold text-white pr-4">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-[#A0A0A0] transition-transform flex-shrink-0 ${isOpenItem ? 'rotate-180 text-[#FFC799]' : ''}`} />
                  </button>
                  {isOpenItem && (
                    <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-[#A0A0A0] leading-relaxed border-t border-white/10 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info in Modal */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-[#A0A0A0]">
            <ShieldCheck className="w-4 h-4 text-[#FFC799]" />
            <span>Hỗ trợ kỹ thuật &amp; Cứu hộ 24/7</span>
          </div>

          {hotline && (
            <a
              href={`tel:${hotline.replace(/[^0-9+]/g, '')}`}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#FFC799]/15 border border-[#FFC799]/30 text-[#F5F5F5] font-bold hover:bg-[#FFC799]/25 transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Tổng đài {hotline}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
