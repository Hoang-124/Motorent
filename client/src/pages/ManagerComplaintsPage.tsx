import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { ManagerComplaintWorkspace } from '../components/ManagerComplaintWorkspace';

export const ManagerComplaintsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-widest text-[#FFC799]">
              <ShieldAlert className="w-4 h-4 text-[#FFC799]" />
              <span>TRUNG TÂM PHÊ CHUẨN • COMPLAINT RESOLUTION</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#F5F5F5] mt-1">
              Kết luận &amp; Đóng khiếu nại (UC-85)
            </h1>
            <p className="text-xs text-[#A0A0A0] mt-1">
              Phê duyệt kết luận giải quyết cuối cùng và đóng hồ sơ khiếu nại vĩnh viễn (chống race condition).
            </p>
          </div>

          <Link
            to="/counter"
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#161616] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-[#F5F5F5] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#FFC799]" />
            <span>Quay lại Bàn quầy Counter</span>
          </Link>
        </div>

        <ManagerComplaintWorkspace />
      </div>
    </div>
  );
};

export default ManagerComplaintsPage;
