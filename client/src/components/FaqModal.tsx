import React, { useState } from 'react';
import { HelpCircle, X, ChevronDown, CheckCircle2, ShieldCheck, PhoneCall } from 'lucide-react';

interface FaqModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FAQS_DATA = [
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
    q: 'Tôi có thể thuê xe đi qua Đèo Hải Vân, Lăng Cô hoặc vào Phố cổ Hội An không?',
    a: 'Hoàn toàn được! Đội xe của Motorent đều là xe đời mới (2023 - 2024), bảo dưỡng ODO định kỳ mỗi 1.500 km và trang bị phanh an toàn. Bạn được tự do trải nghiệm mọi cung đường tuyệt đẹp tại Đà Nẵng, Thừa Thiên Huế và Quảng Nam.',
  },
  {
    q: 'Chi phí thuê xe đã bao gồm những phụ kiện và dịch vụ gì?',
    a: 'Giá thuê trọn gói đã bao gồm: 02 mũ bảo hiểm 3/4 đạt chuẩn CR tiệt trùng UV, 02 áo mưa tiện lợi, giá đỡ điện thoại nhôm giảm chấn OIS, bảo hiểm trách nhiệm dân sự bắt buộc và dịch vụ cứu hộ kỹ thuật 24/7 trên toàn địa bàn TP. Đà Nẵng.',
  },
];

export const FaqModal: React.FC<FaqModalProps> = ({ isOpen, onClose }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-2xl bg-[#0D131F] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-white/10">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-full mb-2">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Trung tâm trợ giúp</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Câu hỏi thường gặp (FAQ)
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Giải đáp nhanh các thắc mắc về quy trình cọc, nhận trả xe và thủ tục eKYC
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FAQ list */}
        <div className="mt-5 space-y-3">
          {FAQS_DATA.map((faq, index) => {
            const isOpenItem = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-[#0D131F] overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpenItem ? null : index)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold text-white pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isOpenItem ? 'rotate-180 text-amber-400' : ''}`} />
                </button>
                {isOpenItem && (
                  <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/10 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info in Modal */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Hỗ trợ kỹ thuật & Cứu hộ 24/7</span>
          </div>

          <a
            href="tel:02363822101"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 font-bold hover:bg-amber-500/25 transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Tổng đài 0236.3822.101</span>
          </a>
        </div>
      </div>
    </div>
  );
};
