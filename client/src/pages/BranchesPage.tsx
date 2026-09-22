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
    <div className="min-h-screen bg-slate-50/60 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-10">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mạng lưới cơ sở tự doanh chuẩn hóa</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Hệ thống chi nhánh Motorent
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Các trạm giao nhận xe của Motorent đều tọa lạc tại các vị trí đắc địa: cửa ngõ Sân bay Tân Sơn Nhất, trung tâm Quận 1 Bến Thành, và trung tâm TP. Thủ Đức. Quý khách hoàn toàn có thể nhận xe tại một trạm và trả xe tại bất kỳ trạm nào khác trong hệ thống.
          </p>
        </div>

        {/* Branch Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {branches.map((branch, idx) => {
            const count = getBranchBikeCount(branch._id);
            return (
              <div
                key={branch._id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-500 transition-all p-7 flex flex-col justify-between"
              >
                <div>
                  {/* Top Branch ID chip */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-forest-50 text-forest-700 border border-forest-200">
                      Cơ sở 0{idx + 1} • {branch.code}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {count > 0 ? `${count} xe tại trạm` : 'Đang tiếp nhận'}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 mb-3">
                    {branch.name}
                  </h3>

                  {/* Address */}
                  <div className="space-y-3 text-xs text-slate-600">
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed">{branch.address}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Mở cửa: {branch.hours_open} - {branch.hours_close} (Hàng ngày kể cả Lễ)</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <PhoneCall className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <a href={`tel:${branch.phone}`} className="font-bold text-slate-800 hover:text-emerald-600">
                        {branch.phone}
                      </a>
                    </div>
                  </div>

                  {/* Perks at branch */}
                  <div className="mt-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1.5">
                    <p className="font-bold text-slate-800 flex items-center">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                      Tiện ích sẵn có tại trạm:
                    </p>
                    <p className="flex items-center space-x-1.5 text-[11px]">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                      <span>Khu vực chờ có điều hòa & nước suối miễn phí</span>
                    </p>
                    <p className="flex items-center space-x-1.5 text-[11px]">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                      <span>Kỹ thuật viên đối chiếu eKYC bàn giao xe trong 3 phút</span>
                    </p>
                    <p className="flex items-center space-x-1.5 text-[11px]">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                      <span>Nhận giữ hành lý cồng kềnh cho khách</span>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={`tel:${branch.phone}`}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                    title="Gọi hotline chi nhánh"
                  >
                    <Phone className="w-4 h-4" />
                  </a>

                  <Link
                    to={`/bikes?pickup=${branch._id}`}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-forest-600 hover:bg-forest-700 shadow-sm shadow-forest-600/20 transition-all text-center flex items-center justify-center space-x-1.5"
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
        <div className="bg-gradient-to-r from-forest-900 via-forest-800 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="max-w-2xl relative z-10 space-y-3">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 inline-block">
              Chính sách di chuyển linh hoạt
            </span>
            <h2 className="text-2xl sm:text-3xl font-black">
              Thuê xe một chiều giữa các chi nhánh
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
              Bạn có thể nhận xe tại chi nhánh Quận 1 để đi tham quan thành phố, sau đó kết thúc chuyến đi bằng việc trả xe thẳng tại chi nhánh Sân bay Tân Sơn Nhất trước giờ bay. Đội xe trung chuyển nội bộ của Motorent sẽ tự động điều phối xe mà không tính phí chuyển trạm của bạn.
            </p>
            <div className="pt-2">
              <Link
                to="/bikes"
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-lg shadow-emerald-400/20"
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
