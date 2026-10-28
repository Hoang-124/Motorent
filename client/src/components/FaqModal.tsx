import React, { useState, useEffect } from 'react';
import { HelpCircle, X, ChevronDown, ShieldCheck, PhoneCall, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface FaqModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FaqItem {
  q: string;
  a: string;
}

// Static fallback data — used when CMS API is unavailable
export const FAQS_DATA: FaqItem[] = [
  {
    q: 'Thủ tục nhận xe tại Sân bay Quốc tế Đà Nẵng diễn ra thế nào?',
    a: 'Khi hạ cánh tại Ga Quốc nội hoặc Ga T2 Quốc tế, bạn chỉ cần gọi hotline hoặc đi bộ 2 phút đến quầy Motorent đối diện cổng ga. Nhân viên chỉ kiểm tra đối soát eKYC trên điện thoại (không giữ CCCD gốc), ký hợp đồng số hóa và bàn giao xe cùng 2 mũ bảo hiểm 3/4 chỉ trong 3 phút.',
  },
  {
    q: 'Nếu chuyến bay của tôi bị delay hoặc hoãn giờ hạ cánh thì sao?',
    a: 'Motorent theo dõi số hiệu chuyến bay của quý khách theo thời gian thực. Khi bạn cọc giữ xe 30%, hệ thống tự động khóa biển số xe riêng cho bạn và bảo lưu lịch xe đến khi bạn thực tế hạ cánh mà không phát sinh thêm bất kỳ chi phí phạt trễ nào.',
  },
  {
    q: 'Chính sách hoàn cọc 30% giữ xe hoạt động ra sao?',
    a: 'Nếu kế hoạch thay đổi, bạn chỉ cần thông báo hủy chuyến trước 24 giờ so với giờ nhận xe dự kiến, hệ thống Motorent sẽ hoàn lại 100% tiền cọc về tài khoản ngân hàng của bạn trong vòng 1-2 giờ làm việc.',
  },
  {
    q: 'Xe của Motorent phù hợp đi lại trong phố hay có thể đi ngoại ô Hội An?',
    a: 'Đội xe Motorent chủ yếu là các dòng xe tay ga đô thị, xe điện và xe số đời mới (2023 - 2024) rất gọn nhẹ, cốp rộng để đi lại trong nội thành Đà Nẵng. Ngoài ra xe luôn được bảo dưỡng định kỳ mỗi 1.500 km nên bạn hoàn toàn yên tâm nếu muốn đi thêm các chuyến ngoại ô ngắn như Ngũ Hành Sơn hay Phố cổ Hội An.',
  },
  {
    q: 'Chi phí thuê xe đã bao gồm những phụ kiện và dịch vụ gì?',
    a: 'Giá thuê trọn gói đã bao gồm: 02 mũ bảo hiểm 3/4 đạt chuẩn CR tiệt trùng UV, 02 áo mưa tiện lợi, giá đỡ điện thoại nhôm giảm chấn OIS, bảo hiểm trách nhiệm dân sự bắt buộc và dịch vụ cứu hộ kỹ thuật 24/7 trên toàn địa bàn TP. Đà Nẵng.',
  },
  {
    q: 'Có hỗ trợ nhận xe tại chi nhánh này và trả tại chi nhánh khác không?',
    a: 'Có. Motorent có 3 chi nhánh tại Đà Nẵng (Sân bay Đà Nẵng, Bãi biển Mỹ Khê, Bán Đảo Sơn Trà). Bạn có thể chọn nhận xe tại Sân bay và trả xe tại Bãi biển Mỹ Khê hoàn toàn miễn phí phụ thu.',
  },
];

/**
 * Parse CMS HTML content for FAQ pages into Q&A pairs.
 * The seeded FAQ content uses <h2>Q</h2><p>A</p> structure.
 */
function parseFaqHtml(html: string): FaqItem[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const headings = Array.from(doc.querySelectorAll('h2'));
    const items: FaqItem[] = [];

    headings.forEach((h2) => {
      const qText = h2.textContent?.trim() ?? '';
      // Question text may start with "1. ", "2. " etc — strip numbering
      const q = qText.replace(/^\d+\.\s*/, '');
      // Get answer from the next sibling <p>
      let sibling = h2.nextElementSibling;
      let a = '';
      while (sibling && sibling.tagName !== 'H2') {
        a += (sibling.textContent?.trim() ?? '') + ' ';
        sibling = sibling.nextElementSibling;
      }
      if (q && a.trim()) {
        items.push({ q, a: a.trim() });
      }
    });

    return items.length > 0 ? items : FAQS_DATA;
  } catch {
    return FAQS_DATA;
  }
}

export const FaqModal: React.FC<FaqModalProps> = ({ isOpen, onClose }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [faqs, setFaqs] = useState<FaqItem[]>(FAQS_DATA);
  const [loading, setLoading] = useState(false);

  // UC-119: Fetch FAQ content from seeded CMS API on mount
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api
      .get('/pages?type=FAQ')
      .then((res) => {
        const pages: Array<{ content?: string }> = res.data?.data ?? [];
        // Prefer the 'faq' slug page — fallback to first FAQ page found
        const faqPage = pages[0];
        if (faqPage?.content) {
          const parsed = parseFaqHtml(faqPage.content);
          setFaqs(parsed);
        }
      })
      .catch(() => {
        // Silently fall back to static data
        setFaqs(FAQS_DATA);
      })
      .finally(() => setLoading(false));
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
              Giải đáp nhanh các thắc mắc về quy trình cọc, nhận trả xe và thủ tục eKYC
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
            // Skeleton loader while fetching from CMS
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-[#161616] overflow-hidden">
                <div className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="h-4 bg-white/[0.06] rounded animate-pulse flex-1 mr-8" />
                  <Loader2 className="w-4 h-4 text-[#A0A0A0] animate-spin flex-shrink-0" />
                </div>
              </div>
            ))
          ) : (
            faqs.map((faq, index) => {
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

        {/* Footer */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-[#A0A0A0]">
            <ShieldCheck className="w-4 h-4 text-[#FFC799]" />
            <span>Hỗ trợ kỹ thuật &amp; Cứu hộ 24/7</span>
          </div>

          <a
            href="tel:02363822101"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#FFC799]/15 border border-[#FFC799]/30 text-[#F5F5F5] font-bold hover:bg-[#FFC799]/25 transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Tổng đài 0236.3822.101</span>
          </a>
        </div>
      </div>
    </div>
  );
};
