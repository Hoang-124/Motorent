import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { AuditLogViewer } from '../components/AuditLogViewer';

export const AuditLogPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-widest text-[#FFC799]">
              <ShieldCheck className="w-4 h-4 text-[#FFC799]" />
              <span>TRUNG TÂM GIÁM SÁT BẢO MẬT • AUDIT TRAIL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#F5F5F5] mt-1">
              Nhật ký Truy vết Hệ thống
            </h1>
          </div>

          <Link
            to="/counter"
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#161616] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-[#F5F5F5] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#FFC799]" />
            <span>Quay lại Bàn giao quầy & Tổng đài</span>
          </Link>
        </div>

        <AuditLogViewer />
      </div>
    </div>
  );
};

export default AuditLogPage;
