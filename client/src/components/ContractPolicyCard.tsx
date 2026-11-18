import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const ContractPolicyCard: React.FC = () => {
  return (
    <div className="p-4 rounded-2xl bg-[#101010] border border-white/10 text-xs text-[#A0A0A0] space-y-1.5">
      <div className="flex items-center space-x-2 text-[#FFC799] font-bold">
        <ShieldCheck className="w-4 h-4 shrink-0" />
        <span>Điều khoản hợp đồng điện tử song phương</span>
      </div>
      <p>
        • <strong className="text-[#FF8080]">Chính sách KHÔNG HOÀN TIỀN:</strong> Không hoàn trả tiền cọc hoặc tiền thuê trong mọi trường hợp hủy đơn hoặc trả xe trước thời hạn thỏa thuận.
      </p>
      <p>
        • <strong className="text-[#F5F5F5]">Bàn giao &amp; Ký nhận:</strong> Xuất trình CCCD/GPLX đối chiếu eKYC (không giữ giấy tờ gốc) và ký xác nhận điện tử song phương khi nhận xe.
      </p>
    </div>
  );
};
