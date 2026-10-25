import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Download,
  Wallet,
  Scale,
  Receipt,
} from 'lucide-react';
import { api } from '../services/api';

interface DiscrepancyItem {
  bookingId: string;
  bookingCode: string;
  status: string;
  expectedPaid: number;
  recordedPaymentsTotal: number;
  difference: number;
  issue: string;
  createdAt: string;
}

interface ReconcileSummary {
  totalBookingsChecked: number;
  totalPaymentsChecked: number;
  totalRevenueRecorded: number;
  totalRefundsRecorded: number;
  netCashflow: number;
  matchedCount: number;
  discrepancyCount: number;
}

interface ReconcileResponse {
  range: { from: string | null; to: string | null };
  summary: ReconcileSummary;
  discrepancies: DiscrepancyItem[];
}

export const FinanceManager: React.FC = () => {
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [reconcileData, setReconcileData] = useState<ReconcileResponse | null>(null);
  const [reconcileLoading, setReconcileLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Tax Report export states (UC-121)
  const now = new Date();
  const [period, setPeriod] = useState<'month' | 'quarter'>('month');
  const [year, setYear] = useState<number>(now.getFullYear());
  const [periodNum, setPeriodNum] = useState<number>(now.getMonth() + 1);
  const [vatRate, setVatRate] = useState<number>(0.1);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<string>('');

  const fetchReconciliation = useCallback(async () => {
    setReconcileLoading(true);
    setErrorMsg('');
    try {
      const params: Record<string, string> = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await api.get('/finance/reconcile', { params });
      if (res.data?.success && res.data.data) {
        setReconcileData(res.data.data);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setErrorMsg(message || 'Không thể tải dữ liệu đối soát dòng tiền.');
    } finally {
      setReconcileLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchReconciliation();
  }, [fetchReconciliation]);

  const handleExportTaxExcel = async () => {
    setExporting(true);
    setExportSuccess('');
    setErrorMsg('');
    try {
      const res = await api.get('/finance/tax-report', {
        params: {
          period,
          year,
          n: periodNum,
          vatRate,
        },
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const label = period === 'month' ? `Thang_${periodNum}_${year}` : `Quy_${periodNum}_${year}`;
      link.href = url;
      link.download = `Bao_Cao_Thue_Motorent_${label}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(`Đã kết xuất thành công tệp Excel báo cáo thuế (${label}).`);
    } catch {
      setErrorMsg('Không thể kết xuất tệp Excel báo cáo thuế. Vui lòng kiểm tra quyền quản trị.');
    } finally {
      setExporting(false);
    }
  };

  const summary = reconcileData?.summary;

  return (
    <div className="space-y-6 animate-fade-up">
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {exportSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-[#99FFE4] flex items-center space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-[#99FFE4] shrink-0" />
          <span>{exportSuccess}</span>
        </div>
      )}

      {/* =====================================================================
          1. UC-121: KẾT XUẤT BÁO CÁO THUẾ & DOANH THU (.XLSX)
          ===================================================================== */}
      <div className="bg-[#161616] border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-[11px] uppercase tracking-wider text-[#FFC799] font-semibold mb-1">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Báo cáo Kế toán &amp; Thuế GTGT • UC-121</span>
            </div>
            <h2 className="text-lg font-bold text-[#F5F5F5]">
              Kết xuất Sổ cái Doanh thu &amp; Khấu trừ Thuế VAT (.xlsx)
            </h2>
            <p className="text-xs text-[#A0A0A0] mt-0.5">
              Tạo bảng kê hóa đơn điện tử theo tháng hoặc quý phục vụ kê khai thuế GTGT chuỗi chi nhánh.
            </p>
          </div>

          <button
            type="button"
            disabled={exporting}
            onClick={handleExportTaxExcel}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#ffe2cc] text-[#101010] text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {exporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang tạo tệp Excel...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Tải Báo Cáo Thuế (.xlsx)</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-[#A0A0A0] font-medium mb-1.5">Kỳ kê khai</label>
            <select
              value={period}
              onChange={(e) => {
                const nextPeriod = e.target.value as 'month' | 'quarter';
                setPeriod(nextPeriod);
                setPeriodNum(nextPeriod === 'quarter' ? Math.ceil((now.getMonth() + 1) / 3) : now.getMonth() + 1);
              }}
              className="w-full px-3.5 py-2.5 bg-[#101010] border border-white/10 rounded-xl text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
            >
              <option value="month">Theo Tháng</option>
              <option value="quarter">Theo Quý</option>
            </select>
          </div>

          <div>
            <label className="block text-[#A0A0A0] font-medium mb-1.5">
              {period === 'month' ? 'Chọn Tháng (1 - 12)' : 'Chọn Quý (1 - 4)'}
            </label>
            <select
              value={periodNum}
              onChange={(e) => setPeriodNum(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-[#101010] border border-white/10 rounded-xl text-[#F5F5F5] font-mono focus:outline-none focus:border-[#FFC799]"
            >
              {(period === 'month' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [1, 2, 3, 4]).map((num) => (
                <option key={num} value={num}>
                  {period === 'month' ? `Tháng ${num}` : `Quý ${num}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#A0A0A0] font-medium mb-1.5">Năm tài chính</label>
            <input
              type="number"
              min={2022}
              max={2035}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-[#101010] border border-white/10 rounded-xl text-[#F5F5F5] font-mono focus:outline-none focus:border-[#FFC799]"
            />
          </div>

          <div>
            <label className="block text-[#A0A0A0] font-medium mb-1.5">Thuế suất GTGT (VAT)</label>
            <select
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-[#101010] border border-white/10 rounded-xl text-[#F5F5F5] font-mono focus:outline-none focus:border-[#FFC799]"
            >
              <option value={0.08}>8% (Ưu đãi dịch vụ)</option>
              <option value={0.1}>10% (Tiêu chuẩn)</option>
              <option value={0}>0% (Không chịu thuế)</option>
            </select>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. UC-120: ĐỐI SOÁT DÒNG TIỀN VNPAY / VIETQR / TIỀN MẶT QUẦY
          ===================================================================== */}
      <div className="bg-[#161616] border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-[11px] uppercase tracking-wider text-[#99FFE4] font-semibold mb-1">
              <Scale className="w-3.5 h-3.5" />
              <span>Đối soát Giao dịch Thanh toán • UC-120</span>
            </div>
            <h2 className="text-lg font-bold text-[#F5F5F5]">
              Đối soát Sổ phụ Cổng VNPay, VietQR &amp; Thu hộ Tại quầy
            </h2>
            <p className="text-xs text-[#A0A0A0] mt-0.5">
              Tự động kiểm tra chéo giữa chứng từ giao dịch (Payment Ledger) và số tiền ghi nhận trên Hợp đồng (Booking).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="flex items-center space-x-1.5 bg-[#101010] border border-white/10 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#A0A0A0]" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-[#F5F5F5] outline-none [color-scheme:dark]"
                title="Từ ngày"
              />
              <span className="text-[#6E6E6E]">→</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-[#F5F5F5] outline-none [color-scheme:dark]"
                title="Đến ngày"
              />
            </div>

            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#A0A0A0] hover:text-white cursor-pointer"
              >
                Xóa lọc
              </button>
            )}

            <button
              type="button"
              onClick={fetchReconciliation}
              disabled={reconcileLoading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#101010] hover:border-[#FFC799] border border-white/10 text-[#F5F5F5] font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#FFC799] ${reconcileLoading ? 'animate-spin' : ''}`} />
              <span>Chạy đối soát</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#101010] border border-white/10">
            <span className="text-[11px] text-[#A0A0A0] flex items-center space-x-1.5">
              <Receipt className="w-3.5 h-3.5 text-[#FFC799]" />
              <span>Tổng hợp đồng kiểm tra</span>
            </span>
            <p className="text-2xl font-bold font-mono text-[#F5F5F5] mt-1.5">
              {summary ? summary.totalBookingsChecked : '--'}
            </p>
            <span className="text-[11px] text-[#6E6E6E] mt-0.5 block">
              {summary ? `${summary.totalPaymentsChecked} bút toán thanh toán` : 'Đang tải...'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#101010] border border-white/10">
            <span className="text-[11px] text-[#A0A0A0] flex items-center space-x-1.5">
              <Wallet className="w-3.5 h-3.5 text-[#99FFE4]" />
              <span>Dòng tiền thực thu ròng</span>
            </span>
            <p className="text-2xl font-bold font-mono text-[#99FFE4] mt-1.5">
              {summary ? `${summary.netCashflow.toLocaleString('vi-VN')} đ` : '--'}
            </p>
            <span className="text-[11px] text-[#6E6E6E] mt-0.5 block">
              Hoàn tiền: {summary ? `${summary.totalRefundsRecorded.toLocaleString('vi-VN')} đ` : '0 đ'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#101010] border border-white/10">
            <span className="text-[11px] text-[#A0A0A0] flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#99FFE4]" />
              <span>Khớp sổ 100%</span>
            </span>
            <p className="text-2xl font-bold font-mono text-[#F5F5F5] mt-1.5">
              {summary ? summary.matchedCount : '--'}
            </p>
            <span className="text-[11px] text-[#99FFE4] mt-0.5 block">Không phát sinh sai lệch</span>
          </div>

          <div className="p-4 rounded-xl bg-[#101010] border border-white/10">
            <span className="text-[11px] text-[#A0A0A0] flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#FFC799]" />
              <span>Cảnh báo lệch đối soát</span>
            </span>
            <p
              className={`text-2xl font-bold font-mono mt-1.5 ${
                (summary?.discrepancyCount || 0) > 0 ? 'text-[#FF8080]' : 'text-[#99FFE4]'
              }`}
            >
              {summary ? summary.discrepancyCount : '--'}
            </p>
            <span className="text-[11px] text-[#6E6E6E] mt-0.5 block">
              {(summary?.discrepancyCount || 0) > 0 ? 'Cần kiểm tra chứng từ' : 'Sổ cái cân đối tuyệt đối'}
            </span>
          </div>
        </div>

        {/* Discrepancies Table */}
        <div className="rounded-xl border border-white/10 overflow-hidden bg-[#101010]">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold text-[#F5F5F5]">
              Chi tiết các giao dịch chênh lệch cần hậu kiểm
            </span>
            <span className="text-[11px] text-[#A0A0A0]">
              {reconcileData?.discrepancies.length || 0} bản ghi
            </span>
          </div>

          {!reconcileData || reconcileData.discrepancies.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#A0A0A0] flex flex-col items-center space-y-2">
              <CheckCircle2 className="w-7 h-7 text-[#99FFE4]" />
              <p className="font-semibold text-[#F5F5F5]">
                Toàn bộ giao dịch VNPay, VietQR và Tiền mặt tại quầy đều khớp 100% với Hợp đồng!
              </p>
              <p className="text-[11px] text-[#6E6E6E]">
                Không phát sinh bất kỳ chênh lệch nào trong khoảng thời gian đã chọn.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#161616] text-[#A0A0A0] uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Mã đơn</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Ghi nhận trên Đơn</th>
                    <th className="px-4 py-3 text-right">Tổng chứng từ Payment</th>
                    <th className="px-4 py-3 text-right">Chênh lệch</th>
                    <th className="px-4 py-3">Mô tả nguyên nhân</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {reconcileData.discrepancies.map((item) => (
                    <tr key={item.bookingId} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono font-bold text-[#FFC799]">{item.bookingCode}</td>
                      <td className="px-4 py-3 text-[#E0E0E0]">{item.status}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#F5F5F5]">
                        {item.expectedPaid.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#99FFE4]">
                        {item.recordedPaymentsTotal.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#FF8080]">
                        {item.difference > 0 ? '+' : ''}
                        {item.difference.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-4 py-3 text-[#A0A0A0]">{item.issue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
