import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  ShieldCheck, 
  FileText, 
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-forest-600 flex items-center justify-center text-white font-bold">
                <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <circle cx="5.5" cy="17.5" r="3.5" />
                  <circle cx="18.5" cy="17.5" r="3.5" />
                  <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4" />
                </svg>
              </div>
              <span className="text-2xl font-black text-white tracking-tight">
                MOTO<span className="text-forest-400">RENT</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed pr-6">
              Hệ thống chuỗi cửa hàng cho thuê xe máy tự lái tự doanh đa chi nhánh tại TP. Đà Nẵng. 100% xe mới chính hãng, hỗ trợ nhận xe tại Sân bay Đà Nẵng trả xe tại Biển Mỹ Khê, hợp đồng điện tử eKYC minh bạch không giữ CCCD gốc.
            </p>
            <div className="space-y-2 text-xs text-slate-400 pt-2">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Giấy chứng nhận ĐKKD: 0402198010 do Sở KH&ĐT TP. Đà Nẵng cấp</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Bảo hiểm trách nhiệm dân sự và cứu hộ xe máy 24/7</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 text-emerald-400">
              Dịch vụ thuê xe
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/bikes" className="hover:text-emerald-300 transition-colors flex items-center justify-between">
                  <span>Bảng giá thuê theo ngày</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                </Link>
              </li>
              <li>
                <Link to="/bikes?type=xe-tay-ga" className="hover:text-emerald-300 transition-colors">
                  Xe tay ga đô thị (Vision, Air Blade)
                </Link>
              </li>
              <li>
                <Link to="/bikes?type=xe-so" className="hover:text-emerald-300 transition-colors">
                  Xe số tiết kiệm (Wave Alpha)
                </Link>
              </li>
              <li>
                <Link to="/bikes?type=xe-con-tay" className="hover:text-emerald-300 transition-colors">
                  Xe côn tay phượt tour (Exciter)
                </Link>
              </li>
              <li>
                <Link to="/bikes?type=xe-dien" className="hover:text-emerald-300 transition-colors">
                  Xe máy điện thế hệ mới (VinFast)
                </Link>
              </li>
            </ul>
          </div>

          {/* Branches list */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 text-emerald-400">
              Mạng lưới chi nhánh trực thuộc
            </h4>
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-800">
                <p className="font-semibold text-white">1. Chi nhánh Sân Bay Quốc Tế Đà Nẵng</p>
                <p className="text-xs text-slate-400 mt-1 flex items-start space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>Cổng Ga Quốc Tế, Đường Duy Tân, Q. Hải Châu, TP. Đà Nẵng</span>
                </p>
                <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Mở cửa: 06:00 - 23:00 hàng ngày • Hotline: (0236) 3822 101</span>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-800">
                <p className="font-semibold text-white">2. Chi nhánh Bãi Biển Mỹ Khê - Sơn Trà</p>
                <p className="text-xs text-slate-400 mt-1 flex items-start space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>28 Võ Nguyên Giáp, P. Phước Mỹ, Q. Sơn Trà, TP. Đà Nẵng</span>
                </p>
                <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Mở cửa: 07:00 - 22:30 hàng ngày • Hotline: (0236) 3822 202</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 space-y-4 sm:space-y-0">
          <p>© 2026 MOTORENT Systems. Toàn bộ bản quyền thuộc về Hệ thống Chuỗi Cho Thuê Xe Máy Motorent.</p>
          <div className="flex space-x-6">
            <span className="hover:text-slate-400 cursor-pointer">Chính sách bảo mật</span>
            <span className="hover:text-slate-400 cursor-pointer">Điều khoản bồi thường</span>
            <span className="hover:text-slate-400 cursor-pointer">Quy trình đặt cọc 30%</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
