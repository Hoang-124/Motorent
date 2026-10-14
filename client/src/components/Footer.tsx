import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Clock,
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

  return (
    <>
      <footer className="bg-[#05080E] text-slate-400 pt-16 pb-12 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Main 4-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-12 border-b border-white/[0.06]">

            {/* Column 1: Brand Info & Legal (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center text-[#060D0B] font-bold shadow-lg shadow-orange-500/20">
                  <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <circle cx="5.5" cy="17.5" r="3.5" />
                    <circle cx="18.5" cy="17.5" r="3.5" />
                    <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4" />
                  </svg>
                </div>
                <span className="text-2xl font-black text-white tracking-tight">
                  MOTO<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200">RENT</span>
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pr-4">
                Hệ thống chuỗi cho thuê xe máy tự lái tự doanh đa chi nhánh tại TP. Đà Nẵng. 100% xe mới chính hãng đời 2023 - 2024, giao nhận tại Sân bay Đà Nẵng và Biển Mỹ Khê, hợp đồng số hóa eKYC <strong>không giữ CCCD gốc</strong>.
              </p>

              <div className="space-y-2 text-xs text-slate-400 pt-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Giấy chứng nhận ĐKKD: 0402198010 do Sở KH&ĐT TP. Đà Nẵng cấp</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Bảo hiểm trách nhiệm dân sự bắt buộc & cứu hộ xe máy 24/7</span>
                </div>
              </div>
            </div>

            {/* Column 2: Vehicle Categories (2 cols) */}
            <div className="lg:col-span-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-4">
                Dòng xe tự lái
              </h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link to="/bikes" className="hover:text-amber-200 transition-colors flex items-center justify-between font-semibold text-slate-300">
                    <span>Xem toàn bộ xe</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                  </Link>
                </li>
                <li>
                  <Link to="/bikes?type=xe-tay-ga" className="hover:text-amber-200 transition-colors">
                    Xe tay ga (Vision, Air Blade)
                  </Link>
                </li>
                <li>
                  <Link to="/bikes?type=xe-so" className="hover:text-amber-200 transition-colors">
                    Xe số tiết kiệm (Wave Alpha)
                  </Link>
                </li>
                <li>
                  <Link to="/bikes?type=xe-con-tay" className="hover:text-amber-200 transition-colors">
                    Xe côn tay thể thao (Exciter)
                  </Link>
                </li>
                <li>
                  <Link to="/bikes?type=xe-dien" className="hover:text-amber-200 transition-colors">
                    Xe máy điện (VinFast Feliz)
                  </Link>
                </li>
                <li>
                  <Link to="/bikes?type=xe-phan-khoi-lon" className="hover:text-amber-200 transition-colors">
                    Xe phân khối lớn (CB500X)
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Customer Support & Policies with FAQ Trigger (3 cols) */}
            <div className="lg:col-span-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-4">
                Hỗ trợ & Chính sách
              </h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <button
                    onClick={() => setIsFaqOpen(true)}
                    className="w-full text-left inline-flex items-center space-x-1.5 text-amber-200 hover:text-amber-300 font-bold transition-colors cursor-pointer group"
                  >
                    <HelpCircle className="w-4 h-4 text-amber-400 transition-transform group-hover:scale-110" />
                    <span>Câu hỏi thường gặp (FAQ)</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </li>
                <li>
                  <span className="flex items-center space-x-1.5 text-slate-300">
                    <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quy trình cọc 30% khóa biển số</span>
                  </span>
                </li>
                <li>
                  <span className="flex items-center space-x-1.5 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Chính sách hoàn cọc 100% trước 24h</span>
                  </span>
                </li>
                <li>
                  <span className="text-slate-400">
                    Gói SafeRide: 2 Mũ bảo hiểm UV 3/4 & 2 Áo mưa
                  </span>
                </li>
                <li>
                  <span className="text-slate-400">
                    Giao nhận xe Sân bay Đà Nẵng phụ phí 0đ
                  </span>
                </li>
              </ul>
            </div>

            {/* Column 4: 3 Branches & Direct Hotline (3 cols) */}
            <div className="lg:col-span-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-4">
                Hệ thống 3 chi nhánh Đà Nẵng
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="font-bold text-white text-xs">Trạm 1: Sân bay Quốc tế Đà Nẵng</p>
                  <p className="text-[11px] text-slate-400 flex items-center mt-0.5">
                    <MapPin className="w-3 h-3 text-amber-400 mr-1 flex-shrink-0" />
                    <span>Cổng Ga Quốc Nội & T2 Quốc Tế</span>
                  </p>
                  <p className="text-[11px] text-amber-400/90 flex items-center mt-0.5">
                    <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span>06:00 - 23:00 hàng ngày</span>
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="font-bold text-white text-xs">Trạm 2: Bãi biển Mỹ Khê</p>
                  <p className="text-[11px] text-slate-400 flex items-center mt-0.5">
                    <MapPin className="w-3 h-3 text-amber-400 mr-1 flex-shrink-0" />
                    <span>28 Võ Nguyên Giáp, Sơn Trà</span>
                  </p>
                  <p className="text-[11px] text-amber-400/90 flex items-center mt-0.5">
                    <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span>07:00 - 22:30 hàng ngày</span>
                  </p>
                </div>


                <a
                  href="tel:02363822101"
                  className="mt-3 inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 font-bold hover:bg-amber-500/25 transition-colors w-full justify-center"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Hotline: (0236) 3822 101</span>
                </a>
              </div>
            </div>

          </div>

          {/* Bottom Copyright & Legal Links */}
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 space-y-4 sm:space-y-0">
            <p>© 2026 MOTORENT Systems. Toàn bộ bản quyền thuộc về Hệ thống Chuỗi Cho Thuê Xe Máy Motorent Đà Nẵng.</p>
            <div className="flex space-x-6 text-[11px]">
              <button onClick={() => setIsFaqOpen(true)} className="hover:text-amber-400 transition-colors cursor-pointer">
                Hỏi đáp FAQ
              </button>
              <Link to="/branches" className="hover:text-slate-400 transition-colors">
                Danh sách trạm
              </Link>
              <Link to="/bikes" className="hover:text-slate-400 transition-colors">
                Bảng giá tự lái
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
