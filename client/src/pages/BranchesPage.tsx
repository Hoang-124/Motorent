import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  PhoneCall,
  Clock,
  ShieldCheck,
  ArrowRight,
  Navigation,
  Sparkles,
  Building2,
  CheckCircle2,
  Phone
} from 'lucide-react';
import type { Branch, Vehicle } from '../types';
import { api } from '../services/api';

export const BranchesPage: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bRes, vRes] = await Promise.all([
          api.get('/branches'),
          api.get('/vehicles'),
        ]);
        if (bRes.data?.data) setBranches(bRes.data.data);
        if (vRes.data?.data) setVehicles(vRes.data.data);
      } catch (err) {
        console.warn('Error fetching branch directory');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getBranchBikeCount = (branchId: string) => {
    return vehicles.filter((v) => {
      const bId = typeof v.branchId === 'object' && v.branchId !== null ? v.branchId._id : v.branchId;
      return bId === branchId;
    }).length;
  };

  return (
    <div className="min-h-screen bg-[#070A11] text-slate-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-10">
          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-200 border border-amber-500/30 mb-3">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Mạng lưới {branches.length > 0 ? `${branches.length} cơ sở tự doanh` : 'chuỗi cơ sở'} tại TP. Đà Nẵng</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Hệ thống chi nhánh Motorent Đà Nẵng
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
            Hệ thống các trạm giao nhận xe của Motorent tọa lạc tại các vị trí đắc địa nhất TP. Đà Nẵng: cửa ngõ Sân bay Quốc tế Đà Nẵng, bến xe trung tâm và dải bờ biển du lịch Mỹ Khê - Sơn Trà. Quý khách hoàn toàn có thể nhận xe tại Sân bay và trả xe tại Bãi biển Mỹ Khê (hoặc ngược lại) với phụ phí 0đ.
          </p>
        </div>

        {/* Branch Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 max-w-7xl mx-auto">
          {branches.map((branch, idx) => {
            const count = getBranchBikeCount(branch._id);
            return (
              <div
                key={branch._id}
                className="bg-[#0D131F] rounded-[2rem] border border-white/10 hover:border-amber-500/50 shadow-xl transition-all p-7 flex flex-col justify-between"
              >
                <div>
                  {/* Top Branch ID chip */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-200 border border-amber-500/30">
                      Cơ sở 0{idx + 1} • {branch.code}
                    </span>
                    <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                      {count > 0 ? `${count} xe tại trạm` : 'Đang tiếp nhận'}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white mb-3">
                    {branch.name}
                  </h3>

                  {/* Address */}
                  <div className="space-y-3 text-xs text-slate-300">
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed">{branch.address}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>Mở cửa: {branch.hours_open} - {branch.hours_close} (Hàng ngày kể cả Lễ)</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <PhoneCall className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <a href={`tel:${branch.phone}`} className="font-bold text-white hover:text-amber-400 transition-colors">
                        {branch.phone}
                      </a>
                    </div>
                  </div>

                  {/* Perks at branch */}
                  <div className="mt-5 p-3.5 bg-white/[0.03] rounded-2xl border border-white/5 text-xs text-slate-300 space-y-1.5">
                    <p className="font-bold text-white flex items-center">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
                      Tiện ích sẵn có tại trạm:
                    </p>
                    <p className="flex items-center space-x-1.5 text-[11px]">
                      <CheckCircle2 className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span>Khu vực chờ máy lạnh & nước khoáng miễn phí</span>
                    </p>
                    <p className="flex items-center space-x-1.5 text-[11px]">
                      <CheckCircle2 className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span>Kỹ thuật viên đối chiếu eKYC bàn giao xe trong 3 phút</span>
                    </p>
                    <p className="flex items-center space-x-1.5 text-[11px]">
                      <CheckCircle2 className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span>Hỗ trợ giữ hành lý cồng kềnh miễn phí cho khách</span>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between gap-2">
                  <a
                    href={`tel:${branch.phone}`}
                    className="p-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/[0.06] transition-colors"
                    title="Gọi hotline chi nhánh"
                  >
                    <Phone className="w-4 h-4" />
                  </a>

                  <Link
                    to={`/bikes?pickup=${branch._id}`}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 shadow-md shadow-orange-500/30 transition-all text-center flex items-center justify-center space-x-1.5 active:scale-95"
                  >
                    <span>Đặt xe tại trạm này</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* One-Way Transfer Explainer Banner */}
        <div className="bg-gradient-to-r from-[#0B1513] via-[#0D1D18] to-[#040C0A] rounded-[2.5rem] p-8 md:p-12 text-white border border-amber-500/30 relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl relative z-10 space-y-3">
            <span className="px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-200 border border-amber-500/30 inline-block">
              Chính sách di chuyển linh hoạt
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Thuê xe một chiều giữa các chi nhánh
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Bạn có thể nhận xe ngay khi vừa hạ cánh tại Sân bay Quốc tế Đà Nẵng để khám phá đèo Hải Vân, bán đảo Sơn Trà, sau đó kết thúc chuyến đi bằng việc trả xe thẳng tại chi nhánh Bãi biển Mỹ Khê hoặc ngược lại trước giờ bay. Đội xe điều chuyển nội bộ của Motorent sẽ tự động hỗ trợ mà không tính phí chuyển trạm.
            </p>
            <div className="pt-2">
              <Link
                to="/bikes"
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-full text-xs font-black text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/25 active:scale-95"
              >
                <span>Trải nghiệm dịch vụ ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
