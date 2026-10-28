import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, MessageSquare } from 'lucide-react';
import { ManagerComplaintWorkspace } from '../components/ManagerComplaintWorkspace';
import { StaffComplaintDesk } from '../components/StaffComplaintDesk';

export const ManagerComplaintsPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'manager' | 'all'>('manager');
  const [pendingCount, setPendingCount] = useState<number>(0);

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
              Quản lý &amp; Kết luận Khiếu nại (UC-65 / UC-85)
            </h1>
            <p className="text-xs text-[#A0A0A0] mt-1">
              Tiếp nhận khiếu nại mới, phản hồi khách hàng, phê duyệt kết luận cuối cùng và đóng hồ sơ vĩnh viễn.
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

        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setSubTab('manager')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              subTab === 'manager'
                ? 'bg-[#FFC799] text-[#101010] shadow-sm font-black'
                : 'bg-[#161616] text-[#A0A0A0] hover:text-white border border-white/10'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>01. Tiếp nhận &amp; Kết luận (UC-85)</span>
            {pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#FF8080] text-[#101010] font-mono text-[10px] font-black">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              subTab === 'all'
                ? 'bg-[#FFC799] text-[#101010] shadow-sm font-black'
                : 'bg-[#161616] text-[#A0A0A0] hover:text-white border border-white/10'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>02. Toàn bộ hàng đợi &amp; Lịch sử đóng (UC-65)</span>
          </button>
        </div>

        {subTab === 'manager' ? (
          <ManagerComplaintWorkspace onPendingCountChange={setPendingCount} />
        ) : (
          <StaffComplaintDesk />
        )}
      </div>
    </div>
  );
};

export default ManagerComplaintsPage;
