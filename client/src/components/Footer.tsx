import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MapPin,
  ArrowUpRight,
  CheckCircle2,
  PhoneCall,
  HelpCircle,
  ShieldCheck,
  FileCheck2
} from 'lucide-react';
import { FaqModal } from './FaqModal';

export const Footer: React.FC = () => {
  const [isFaqOpen, setIsFaqOpen] = useState<boolean>(false);
  const location = useLocation();

  // Hide B2C marketing footer on the operational CounterDesk workspace
  if (location.pathname.startsWith('/counter')) {
    return null;
  }

  return (
    <>
      <footer className="bg-[#101010] text-[#A0A0A0] pt-16 pb-12 border-t border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Editorial Masthead Banner inside Footer */}
          <div className="pb-12 mb-12 border-b border-white/[0.08] flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#FFC799] font-medium">
                Dịch Vụ Thuê Xe Máy Đô Thị &amp; Du Lịch Đà Nẵng
              </p>
              <h2 className="text-2xl sm:text-4xl font-semibold text-[#F5F5F5] tracking-tight leading-snug">
                Mỗi chiếc xe rời trạm là một hành trình{' '}
                <span className="font-serif-display italic font-normal text-[#FFC799]">
                  dạo phố êm ái và an tâm.
                </span>
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="tel:02363822101"
                className="inline-flex items-center space-x-2.5 px-5 py-2.5 rounded-full bg-[#1E1E1E] border border-white/12 text-[#F5F5F5] hover:border-[#FFC799]/50 text-xs font-medium transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#FFC799]" />
                <span>Tổng đài điều phối:</span>
                <span className="font-mono-tabular font-semibold">(0236) 3822 101</span>
              </a>
              <button
                onClick={() => setIsFaqOpen(true)}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#F5F5F5] hover:bg-[#FFD6B3] text-[#101010] text-xs font-semibold transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Cẩm nang &amp; Câu hỏi thường gặp</span>
              </button>
            </div>
          </div>

          {/* Main 12-Column Editorial Directory */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/[0.08]">

            {/* Column 1: Atelier Identity & Legal (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-baseline space-x-2">
                <span className="text-lg font-bold tracking-[0.14em] text-[#F5F5F5] uppercase">
                  MOTORENT
                </span>
                <span className="font-serif-display italic text-base text-[#FFC799]">
                  Đà Nẵng
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#A0A0A0] leading-relaxed pr-4">
                Hệ thống trạm cho thuê xe máy tự lái đô thị tại TP. Đà Nẵng. Đội xe chính hãng đời 2023–2024 vận hành êm ái, tiết kiệm nhiên liệu, được kiểm tra an toàn trước mỗi chuyến đi. Giao nhận nhanh tại Sân bay Quốc tế, Trung tâm &amp; Biển Mỹ Khê, hợp đồng số hóa eKYC <strong className="text-[#F5F5F5] font-medium">không giữ CCCD gốc</strong>.
              </p>

              <div className="space-y-2 text-xs text-[#A0A0A0] pt-2 border-t border-white/[0.06]">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC799] flex-shrink-0" />
                  <span>Giấy chứng nhận ĐKKD: 0402198010 — Sở KH&amp;ĐT TP. Đà Nẵng</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FFC799] flex-shrink-0" />
                  <span>Bảo hiểm trách nhiệm dân sự &amp; Hỗ trợ kỹ thuật nội thành 24/7</span>
                </div>
              </div>
            </div>

            {/* Column 2: Vehicle Collection (2 cols) */}
            <div className="lg:col-span-2">
              <h4 className="text-[11px] font-semibold text-[#F5F5F5] uppercase tracking-[0.14em] mb-4">
                Danh mục xe
              </h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link to="/bikes" className="hover:text-[#F5F5F5] transition-colors flex items-center justify-between font-medium text-[#FFC799]">
                    <span>Toàn bộ đội xe</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </li>
                <li>
                  <Link to="/bikes?type=xe-tay-ga" className="hover:text-[#F5F5F5] transition-colors">
                    Xe tay ga đi phố (Vision, Air Blade)
                  </Link>
                </li>
                <li>
                  <Link to="/bikes?type=xe-so" className="hover:text-[#F5F5F5] transition-colors">
                    Xe số tiết kiệm xăng (Wave, Future)
                  </Link>
                </li>
                <li>
                  <Link to="/bikes?type=xe-con-tay" className="hover:text-[#F5F5F5] transition-colors">
                    Xe côn tay thể thao (Winner, Exciter)
                  </Link>
                </li>
                <li>
                  <Link to="/bikes?type=xe-dien" className="hover:text-[#F5F5F5] transition-colors">
                    Xe máy điện dạo phố (VinFast Feliz)
                  </Link>
                </li>
                <li>
                  <Link to="/bikes?type=xe-phan-khoi-lon" className="hover:text-[#F5F5F5] transition-colors">
                    Mô tô đi đường trường (CB500X)
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Service Principles (3 cols) */}
            <div className="lg:col-span-3">
              <h4 className="text-[11px] font-semibold text-[#F5F5F5] uppercase tracking-[0.14em] mb-4">
                Chuẩn mực phục vụ
              </h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link to="/rental-policy" className="inline-flex items-center space-x-1.5 text-[#F5F5F5] hover:text-[#FFC799] font-medium transition-colors">
                    <span>Chính sách thuê xe</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#FFC799]" />
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => setIsFaqOpen(true)}
                    className="w-full text-left inline-flex items-center space-x-1.5 text-[#F5F5F5] hover:text-[#FFC799] font-medium transition-colors cursor-pointer"
                  >
                    <span>Giải đáp thủ tục &amp; Chính sách (FAQ)</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#FFC799]" />
                  </button>
                </li>
                <li className="flex items-center space-x-2 text-[#A0A0A0]">
                  <FileCheck2 className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                  <span>Đặt cọc 30% khóa đích danh biển số xe</span>
                </li>
                <li className="flex items-center space-x-2 text-[#A0A0A0]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                  <span>Hoàn cọc 100% khi báo hủy trước 24 giờ</span>
                </li>
                <li className="text-[#A0A0A0]">
                  Trang bị tiêu chuẩn: 02 mũ 3/4 khử khuẩn UV &amp; 02 áo mưa
                </li>
                <li className="text-[#A0A0A0]">
                  Miễn phí chuyển trạm một chiều Sân bay — Mỹ Khê
                </li>
              </ul>
            </div>

            {/* Column 4: Open Typographic Station Ledger (3 cols) */}
            <div className="lg:col-span-3">
              <h4 className="text-[11px] font-semibold text-[#F5F5F5] uppercase tracking-[0.14em] mb-4">
                Trạm giao nhận tại Đà Nẵng
              </h4>
              <div className="divide-y divide-white/[0.08] border-y border-white/[0.08] text-xs">
                <div className="py-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[#F5F5F5]">Sân bay Quốc tế Đà Nẵng</p>
                    <span className="font-mono-tabular text-[10px] text-[#FFC799]">06:00–23:00</span>
                  </div>
                  <p className="text-[11px] text-[#A0A0A0] mt-0.5 flex items-center">
                    <MapPin className="w-3 h-3 text-[#A0A0A0] mr-1 flex-shrink-0" />
                    <span>Cổng Ga Quốc Nội T1 &amp; Ga Quốc Tế T2</span>
                  </p>
                </div>

                <div className="py-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[#F5F5F5]">Trạm Biển Mỹ Khê</p>
                    <span className="font-mono-tabular text-[10px] text-[#FFC799]">07:00–22:30</span>
                  </div>
                  <p className="text-[11px] text-[#A0A0A0] mt-0.5 flex items-center">
                    <MapPin className="w-3 h-3 text-[#A0A0A0] mr-1 flex-shrink-0" />
                    <span>28 Võ Nguyên Giáp, Quận Sơn Trà</span>
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Colophon */}
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-[#6E6E6E] space-y-4 sm:space-y-0">
            <p>© 2026 Motorent Đà Nẵng. Chế tác dành riêng cho những hành trình tự lái tử tế.</p>
            <div className="flex space-x-6 text-[11px]">
              <button onClick={() => setIsFaqOpen(true)} className="hover:text-[#F5F5F5] transition-colors cursor-pointer">
                Hỏi đáp FAQ
              </button>
              <Link to="/branches" className="hover:text-[#F5F5F5] transition-colors">
                Bản đồ trạm
              </Link>
              <Link to="/bikes" className="hover:text-[#F5F5F5] transition-colors">
                Danh mục xe &amp; Bảng giá
              </Link>
            </div>
          </div>

        </div>
      </footer>

      {/* Interactive FAQ Modal */}
      <FaqModal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} />
    </>
  );
};
