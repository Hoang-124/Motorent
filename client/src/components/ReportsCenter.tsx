import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Building2,
  Bike,
  Sparkles,
  PieChart,
  RefreshCw,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  ShieldAlert,
  Sliders,
  Filter,
  Star,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type {
  DailyRevenueReport,
  MonthlyRevenueReport,
  FleetStatsReport,
  ChainRevenueReport,
  BranchComparisonReport,
  KpiDashboardData,
  DemandForecastData,
  Branch,
} from '../types';

type ReportTab = 'daily' | 'monthly' | 'fleet' | 'chain' | 'forecast' | 'kpi';

export const ReportsCenter: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles === 'SystemAdmin';
  const isManager = user?.roles === 'BranchManager';

  const [activeTab, setActiveTab] = useState<ReportTab>('daily');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  // Daily State
  const [dailyDate, setDailyDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [dailyData, setDailyData] = useState<DailyRevenueReport | null>(null);

  // Monthly State
  const [monthlyMonth, setMonthlyMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [monthlyYear, setMonthlyYear] = useState<number>(() => new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenueReport | null>(null);

  // Fleet Stats State
  const [fleetData, setFleetData] = useState<FleetStatsReport | null>(null);

  // Chain & Comparison State
  const [chainPeriod, setChainPeriod] = useState<string>('this_month');
  const [chainData, setChainData] = useState<ChainRevenueReport | null>(null);
  const [comparisonData, setComparisonData] = useState<BranchComparisonReport | null>(null);

  // KPI Dashboard State
  const [kpiData, setKpiData] = useState<KpiDashboardData | null>(null);

  // Forecast State
  const [forecastData, setForecastData] = useState<DemandForecastData | null>(null);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data?.success) setBranches(res.data.data);
    } catch {
      // Ignore
    }
  };

  const getEffectiveBranch = () => {
    if (isManager && user?.branchId) {
      return typeof user.branchId === 'object' ? user.branchId._id : user.branchId;
    }
    return selectedBranchId !== 'all' ? selectedBranchId : undefined;
  };

  const fetchDailyReport = async () => {
    setLoading(true);
    try {
      const branchId = getEffectiveBranch();
      const res = await api.get('/reports/revenue/daily', {
        params: { branchId, date: dailyDate },
      });
      if (res.data?.success) setDailyData(res.data.data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyReport = async () => {
    setLoading(true);
    try {
      const branchId = getEffectiveBranch();
      const res = await api.get('/reports/revenue/monthly', {
        params: { branchId, month: monthlyMonth, year: monthlyYear },
      });
      if (res.data?.success) setMonthlyData(res.data.data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const fetchFleetReport = async () => {
    setLoading(true);
    try {
      const branchId = getEffectiveBranch();
      const res = await api.get('/reports/fleet', { params: { branchId } });
      if (res.data?.success) setFleetData(res.data.data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const fetchChainReport = async () => {
    setLoading(true);
    try {
      const [chainRes, compRes] = await Promise.all([
        api.get('/reports/chain', { params: { period: chainPeriod } }),
        api.get('/reports/compare', { params: { period: chainPeriod } }),
      ]);
      if (chainRes.data?.success) setChainData(chainRes.data.data);
      if (compRes.data?.success) setComparisonData(compRes.data.data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const fetchKpiDashboard = async () => {
    setLoading(true);
    try {
      const branchId = getEffectiveBranch();
      const res = await api.get('/reports/dashboard', { params: { branchId } });
      if (res.data?.success) setKpiData(res.data.data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const fetchDemandForecast = async () => {
    setLoading(true);
    try {
      const branchId = getEffectiveBranch();
      const res = await api.get('/reports/forecast', { params: { branchId } });
      if (res.data?.success) setForecastData(res.data.data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (activeTab === 'daily') fetchDailyReport();
    else if (activeTab === 'monthly') fetchMonthlyReport();
    else if (activeTab === 'fleet') fetchFleetReport();
    else if (activeTab === 'chain') fetchChainReport();
    else if (activeTab === 'kpi') fetchKpiDashboard();
    else if (activeTab === 'forecast') fetchDemandForecast();
  }, [activeTab, dailyDate, monthlyMonth, monthlyYear, selectedBranchId, chainPeriod]);

  // UC-89: Export handler for Excel and PDF
  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(true);
    try {
      const branchId = getEffectiveBranch();
      const reportType = activeTab === 'monthly' ? 'monthly' : 'daily';

      const res = await api.get('/reports/export', {
        params: {
          format,
          reportType,
          branchId,
          date: dailyDate,
          month: monthlyMonth,
          year: monthlyYear,
        },
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type:
          format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `motorent-${reportType}-${dailyDate}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Không thể xuất báo cáo. Vui lòng thử lại sau.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#FFC799] font-bold">
            <BarChart3 size={15} />
            <span>Trung tâm Báo cáo & Phân tích Doanh thu (S3)</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            Báo Cáo Hoạt Động & Hiệu Suất Hệ Thống
          </h2>
          <p className="text-xs text-[#A0A0A0] mt-0.5">
            Theo dõi dòng tiền thực tế, tỷ lệ lấp đầy đội xe và dự báo nhu cầu di chuyển tại Đà Nẵng.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:border-[#FFC799] focus:outline-none"
            >
              <option value="all">Toàn chuỗi chi nhánh</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}

          {/* UC-89: Export Buttons */}
          <div className="inline-flex rounded-xl bg-[#161616] border border-white/10 p-0.5">
            <button
              type="button"
              disabled={exporting}
              onClick={() => handleExport('excel')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
              title="Xuất file bảng tính Excel (UC-89)"
            >
              <FileSpreadsheet size={15} />
              <span>Xuất Excel</span>
            </button>

            <button
              type="button"
              disabled={exporting}
              onClick={() => handleExport('pdf')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
              title="Xuất bản in PDF có logo Motorent (UC-89)"
            >
              <FileText size={15} />
              <span>Xuất PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center bg-[#161616] border border-white/10 rounded-2xl p-1.5 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'daily'
              ? 'bg-[#FFC799] text-[#101010] shadow-md'
              : 'text-[#A0A0A0] hover:text-white'
          }`}
        >
          <Clock size={15} />
          <span>Doanh thu ngày (UC-86)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('monthly')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'monthly'
              ? 'bg-[#FFC799] text-[#101010] shadow-md'
              : 'text-[#A0A0A0] hover:text-white'
          }`}
        >
          <Calendar size={15} />
          <span>Doanh thu tháng (UC-87-88)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fleet')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'fleet'
              ? 'bg-[#FFC799] text-[#101010] shadow-md'
              : 'text-[#A0A0A0] hover:text-white'
          }`}
        >
          <Bike size={15} />
          <span>Hiệu suất đội xe (UC-90-92)</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('chain')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'chain'
                ? 'bg-[#FFC799] text-[#101010] shadow-md'
                : 'text-[#A0A0A0] hover:text-white'
            }`}
          >
            <Building2 size={15} />
            <span>Doanh thu chuỗi & So sánh (UC-103-104)</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('kpi')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'kpi'
              ? 'bg-[#FFC799] text-[#101010] shadow-md'
              : 'text-[#A0A0A0] hover:text-white'
          }`}
        >
          <Layers size={15} />
          <span>KPI Executive Dashboard (UC-105)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('forecast')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'forecast'
              ? 'bg-[#FFC799] text-[#101010] shadow-md'
              : 'text-[#A0A0A0] hover:text-white'
          }`}
        >
          <Sparkles size={15} />
          <span>Dự báo nhu cầu xe (UC-106)</span>
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-16 text-center text-[#A0A0A0] flex flex-col items-center justify-center gap-3">
          <RefreshCw size={26} className="animate-spin text-[#FFC799]" />
          <span className="text-xs font-medium">Đang tính toán dữ liệu báo cáo chuyên sâu...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: DAILY REVENUE (UC-86) */}
          {activeTab === 'daily' && dailyData && (
            <div className="space-y-6">
              {/* Daily Filter Bar */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-[#FFC799]" />
                  <span className="text-xs font-bold text-white">Chọn ngày báo cáo:</span>
                  <input
                    type="date"
                    value={dailyDate}
                    onChange={(e) => setDailyDate(e.target.value)}
                    className="bg-[#101010] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#FFC799] focus:outline-none"
                  />
                </div>

                <div className="text-xs text-[#A0A0A0]">
                  Phạm vi:{' '}
                  <span className="text-white font-semibold">
                    {dailyData.branch ? `${dailyData.branch.name} (${dailyData.branch.code})` : 'Toàn hệ thống'}
                  </span>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-[#A0A0A0] uppercase">Tổng doanh thu thuần</div>
                  <div className="text-2xl font-black text-[#FFC799] mt-1">
                    {(dailyData.metrics.netRevenue || 0).toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-1">
                    Sau khi trừ hoàn tiền {dailyData.metrics.refunds.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-[#A0A0A0] uppercase">Cọc Online VNPay (30%)</div>
                  <div className="text-2xl font-black text-sky-400 mt-1">
                    {(dailyData.metrics.onlineDepositRevenue || 0).toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[10px] text-[#A0A0A0] mt-1">Cổng thanh toán tự động</div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-[#A0A0A0] uppercase">Tất toán tại quầy (70%)</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {(dailyData.metrics.counterSettlementRevenue || 0).toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[10px] text-[#A0A0A0] mt-1">Tiền mặt & Quẹt thẻ quầy</div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-[#A0A0A0] uppercase">Lượt giao & nhận xe</div>
                  <div className="text-2xl font-black text-white mt-1">
                    {dailyData.metrics.pickupsCount} nhận / {dailyData.metrics.returnsCount} trả
                  </div>
                  <div className="text-[10px] text-[#A0A0A0] mt-1">
                    Tổng đơn hôm nay: {dailyData.metrics.totalBookings}
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <DollarSign size={16} className="text-[#FFC799]" />
                    Danh sách đơn phát sinh trong ngày ({dailyData.bookings.length})
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#101010] border-b border-white/10 text-[11px] text-[#A0A0A0] uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Mã đơn</th>
                        <th className="py-3 px-4">Khách hàng</th>
                        <th className="py-3 px-4">Xe thuê & Biển số</th>
                        <th className="py-3 px-4">Phương thức</th>
                        <th className="py-3 px-4">Tổng tiền</th>
                        <th className="py-3 px-4">Đã thanh toán</th>
                        <th className="py-3 px-4">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {dailyData.bookings.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-[#606060] italic">
                            Không có đơn hàng nào phát sinh trong ngày {dailyData.dateFormatted}.
                          </td>
                        </tr>
                      ) : (
                        dailyData.bookings.map((b) => (
                          <tr key={b._id} className="hover:bg-white/[0.02]">
                            <td className="py-3 px-4 font-mono font-bold text-[#FFC799]">
                              {b.bookingCode}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white">{b.customerName}</div>
                              <div className="text-[10px] text-[#808080] font-mono">{b.customerPhone}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-white font-medium">{b.vehicleModel}</div>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#FFC799]">
                                {b.licensePlate}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[#D0D0D0]">
                              {b.paymentMethod === 'Banking' ? 'VNPay / Banking' : 'Tiền mặt tại quầy'}
                            </td>
                            <td className="py-3 px-4 font-bold text-white">
                              {(b.totalAmount || 0).toLocaleString('vi-VN')} đ
                            </td>
                            <td className="py-3 px-4 font-bold text-emerald-400">
                              {(b.paidAmount || 0).toLocaleString('vi-VN')} đ
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-white/5 border-white/10 text-white">
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MONTHLY REVENUE (UC-87-88) */}
          {activeTab === 'monthly' && monthlyData && (
            <div className="space-y-6">
              {/* Month selector */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-[#FFC799]" />
                  <span className="text-xs font-bold text-white">Tháng:</span>
                  <select
                    value={monthlyMonth}
                    onChange={(e) => setMonthlyMonth(Number(e.target.value))}
                    className="bg-[#101010] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#FFC799] focus:outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Tháng {i + 1}
                      </option>
                    ))}
                  </select>

                  <span className="text-xs font-bold text-white">Năm:</span>
                  <select
                    value={monthlyYear}
                    onChange={(e) => setMonthlyYear(Number(e.target.value))}
                    className="bg-[#101010] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#FFC799] focus:outline-none"
                  >
                    {[2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#A0A0A0]">So với tháng trước:</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      monthlyData.summary.growthPercent >= 0
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {monthlyData.summary.growthPercent >= 0 ? (
                      <ArrowUpRight size={14} />
                    ) : (
                      <ArrowDownRight size={14} />
                    )}
                    {monthlyData.summary.growthPercent >= 0 ? '+' : ''}
                    {monthlyData.summary.growthPercent}%
                  </span>
                </div>
              </div>

              {/* Monthly KPI Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Tổng doanh thu tháng</div>
                  <div className="text-3xl font-black text-[#FFC799] mt-1.5">
                    {monthlyData.summary.totalRevenue.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-xs text-[#A0A0A0] mt-1">
                    Tháng trước: {monthlyData.summary.previousMonthRevenue.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Tổng số chuyến xe</div>
                  <div className="text-3xl font-black text-white mt-1.5">
                    {monthlyData.summary.totalBookings} đơn
                  </div>
                  <div className="text-xs text-emerald-400 mt-1">Đã hoàn tất thanh toán</div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Giá trị đơn TB (AOV)</div>
                  <div className="text-3xl font-black text-sky-400 mt-1.5">
                    {monthlyData.summary.averageOrderValue.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-xs text-[#A0A0A0] mt-1">Bao gồm cọc & phụ phí</div>
                </div>
              </div>

              {/* Pure Vector SVG Daily Revenue Chart */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 size={16} className="text-[#FFC799]" />
                    Biểu đồ doanh thu từng ngày trong tháng
                  </h3>
                  <span className="text-xs text-[#A0A0A0]">Đơn vị: VNĐ</span>
                </div>

                {/* Vector SVG Bar Chart */}
                <div className="w-full h-56 pt-4">
                  {(() => {
                    const maxRevenue = Math.max(...monthlyData.dailyBreakdown.map((d) => d.revenue), 100000);
                    return (
                      <div className="h-full flex items-end gap-1.5 border-b border-white/10 pb-2">
                        {monthlyData.dailyBreakdown.map((item) => {
                          const heightPercent = Math.max(4, Math.round((item.revenue / maxRevenue) * 100));
                          return (
                            <div
                              key={item.day}
                              className="flex-1 flex flex-col items-center group relative h-full justify-end"
                            >
                              {/* Hover Tooltip */}
                              <div className="absolute -top-12 bg-[#101010] border border-white/15 px-2.5 py-1 rounded-lg text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                                <div className="font-bold">Ngày {item.day}: {item.revenue.toLocaleString('vi-VN')} đ</div>
                                <div className="text-[#A0A0A0]">{item.bookingsCount} đơn</div>
                              </div>

                              {/* Bar */}
                              <div
                                style={{ height: `${heightPercent}%` }}
                                className="w-full bg-gradient-to-t from-[#FFC799]/30 to-[#FFC799] rounded-t hover:brightness-125 transition-all"
                              />

                              <span className="text-[9px] text-[#707070] mt-1">{item.day}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FLEET STATS (UC-90-92) */}
          {activeTab === 'fleet' && fleetData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Tổng số xe tại trạm</div>
                  <div className="text-3xl font-black text-white mt-1.5">{fleetData.totalVehicles}</div>
                  <div className="text-xs text-emerald-400 mt-1">Đang quản lý vận hành</div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Tỷ lệ lấp đầy (Utilization)</div>
                  <div className="text-3xl font-black text-[#FFC799] mt-1.5">{fleetData.utilizationRate}%</div>
                  <div className="text-xs text-[#A0A0A0] mt-1">Xe đang phục vụ khách</div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Đánh giá trung bình</div>
                  <div className="text-3xl font-black text-amber-400 mt-1.5">{fleetData.averageRating} / 5.0</div>
                  <div className="text-xs text-[#A0A0A0] mt-1">Từ phản hồi khách hàng</div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Chi phí bảo dưỡng tháng</div>
                  <div className="text-3xl font-black text-rose-400 mt-1.5">
                    {fleetData.maintenanceStats.monthlyCost.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-xs text-[#A0A0A0] mt-1">
                    {fleetData.maintenanceStats.inMaintenance} xe đang sửa chữa
                  </div>
                </div>
              </div>

              {/* Status breakdown bars */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white">Phân bổ trạng thái đội xe hiện tại</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-emerald-400 font-bold">Sẵn sàng (Available)</span>
                    <div className="text-xl font-black text-white mt-1">{fleetData.statusBreakdown.available} xe</div>
                  </div>

                  <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                    <span className="text-sky-400 font-bold">Đang cho thuê (Rented)</span>
                    <div className="text-xl font-black text-white mt-1">{fleetData.statusBreakdown.rented} xe</div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <span className="text-amber-400 font-bold">Bảo dưỡng (Maintenance)</span>
                    <div className="text-xl font-black text-white mt-1">{fleetData.statusBreakdown.maintenance} xe</div>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <span className="text-purple-400 font-bold">Điều chuyển (Transferring)</span>
                    <div className="text-xl font-black text-white mt-1">{fleetData.statusBreakdown.transferring} xe</div>
                  </div>
                </div>
              </div>

              {/* Top Vehicles Table */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white">Top 5 xe được đánh giá cao nhất</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#101010] text-[#A0A0A0] uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Dòng xe</th>
                        <th className="py-3 px-4">Biển số</th>
                        <th className="py-3 px-4">Hãng</th>
                        <th className="py-3 px-4">Số ODO</th>
                        <th className="py-3 px-4">Đánh giá</th>
                        <th className="py-3 px-4">Giá thuê/ngày</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {fleetData.topVehicles.map((v) => (
                        <tr key={v._id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4 font-semibold text-white">{v.vehicleModel}</td>
                          <td className="py-3 px-4 font-mono text-[#FFC799]">{v.licensePlate}</td>
                          <td className="py-3 px-4 text-[#A0A0A0]">{v.brand}</td>
                          <td className="py-3 px-4 text-white">{(v.odometer || 0).toLocaleString('vi-VN')} km</td>
                          <td className="py-3 px-4 font-bold text-amber-400">
                            <span className="inline-flex items-center gap-1">
                              {v.averageRating}
                              <Star size={12} className="fill-amber-400 text-amber-400" />
                            </span>
                          </td>
                          <td className="py-3 px-4 text-emerald-400 font-bold">{v.dailyPrice.toLocaleString('vi-VN')} đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CHAIN REVENUE & COMPARISON (UC-103 & UC-104) */}
          {activeTab === 'chain' && chainData && comparisonData && (
            <div className="space-y-6">
              <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-xs font-bold text-white">Khoảng thời gian:</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'today', label: 'Hôm nay' },
                    { id: 'this_month', label: 'Tháng này' },
                    { id: 'this_year', label: 'Năm nay' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setChainPeriod(p.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        chainPeriod === p.id
                          ? 'bg-[#FFC799] text-[#101010]'
                          : 'bg-[#101010] text-[#A0A0A0] hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chain Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Tổng doanh thu toàn chuỗi</div>
                  <div className="text-3xl font-black text-[#FFC799] mt-1.5">
                    {chainData.totalChainRevenue.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-xs text-white mt-1">Từ {chainData.totalBranches} chi nhánh trạm xe</div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Tổng đơn thuê toàn chuỗi</div>
                  <div className="text-3xl font-black text-white mt-1.5">{chainData.totalBookings} đơn</div>
                  <div className="text-xs text-[#A0A0A0] mt-1">Tất cả chi nhánh</div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Trạm dẫn đầu doanh thu</div>
                  <div className="text-xl font-black text-emerald-400 mt-2 truncate">
                    {comparisonData.highlights.topRevenueBranch}
                  </div>
                  <div className="text-xs text-[#A0A0A0] mt-1">
                    Lấp đầy cao nhất: {comparisonData.highlights.highestUtilizationBranch}
                  </div>
                </div>
              </div>

              {/* Side-by-side Branch Comparison Table (UC-104) */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white">So sánh hiệu suất các chi nhánh (UC-104)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#101010] text-[#A0A0A0] uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Tên chi nhánh</th>
                        <th className="py-3 px-4">Mã trạm</th>
                        <th className="py-3 px-4">Doanh thu</th>
                        <th className="py-3 px-4">Đóng góp chuỗi</th>
                        <th className="py-3 px-4">Số đơn</th>
                        <th className="py-3 px-4">AOV</th>
                        <th className="py-3 px-4">Quy mô xe</th>
                        <th className="py-3 px-4">Tỷ lệ lấp đầy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {comparisonData.branches.map((br) => (
                        <tr key={br.branchId} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4 font-bold text-white">{br.branchName}</td>
                          <td className="py-3 px-4 font-mono text-[#FFC799]">{br.branchCode}</td>
                          <td className="py-3 px-4 font-bold text-white">{br.revenue.toLocaleString('vi-VN')} đ</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-white/10 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-[#FFC799] h-full rounded-full"
                                  style={{ width: `${br.contributionPercent}%` }}
                                />
                              </div>
                              <span className="font-semibold text-white">{br.contributionPercent}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-white font-semibold">{br.bookingsCount}</td>
                          <td className="py-3 px-4 text-[#A0A0A0]">{br.averageOrderValue.toLocaleString('vi-VN')} đ</td>
                          <td className="py-3 px-4 text-white">{br.activeVehicles} xe</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {br.utilizationRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: KPI DASHBOARD (UC-105) */}
          {activeTab === 'kpi' && kpiData && (
            <div className="space-y-6">
              {/* Executive Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Tổng doanh thu lũy kế</div>
                  <div className="text-2xl font-black text-[#FFC799] mt-1.5">
                    {kpiData.kpi.totalRevenue.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Hợp đồng đang thuê</div>
                  <div className="text-2xl font-black text-sky-400 mt-1.5">{kpiData.kpi.activeRentals} xe</div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Tỷ lệ hủy đơn</div>
                  <div className="text-2xl font-black text-rose-400 mt-1.5">{kpiData.kpi.cancellationRate}%</div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Công suất đội xe</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1.5">{kpiData.kpi.fleetUtilization}%</div>
                </div>
              </div>

              {/* Conversion Funnel */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers size={16} className="text-[#FFC799]" />
                  Phễu chuyển đổi vận hành thuê xe (Rental Funnel)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {kpiData.funnel.map((step, idx) => (
                    <div key={idx} className="bg-[#101010] border border-white/5 rounded-xl p-3.5 space-y-2">
                      <div className="text-[11px] font-bold text-[#A0A0A0]">0{idx + 1}. {step.stage}</div>
                      <div className="text-xl font-black text-white">{step.count}</div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#FFC799] h-full" style={{ width: `${step.percent}%` }} />
                      </div>
                      <div className="text-[10px] text-right font-bold text-[#FFC799]">{step.percent}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DEMAND FORECAST (UC-106) */}
          {activeTab === 'forecast' && forecastData && (
            <div className="space-y-6">
              {/* Insights banner */}
              <div className="bg-gradient-to-r from-amber-500/10 via-[#161616] to-[#161616] border border-amber-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Sparkles size={18} />
                  <span>Dự Báo & Khuyến Nghị Vận Hành 07 Ngày Tới</span>
                </div>
                <ul className="space-y-1.5 text-xs text-[#D0D0D0]">
                  {forecastData.insights.map((msg, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#FFC799] mt-0.5">•</span>
                      <span>{msg}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 7-day forecast cards */}
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
                {forecastData.forecast7Days.map((d) => (
                  <div
                    key={d.date}
                    className={`bg-[#161616] border rounded-2xl p-3.5 flex flex-col justify-between transition-all ${
                      d.capacityRisk === 'Overload'
                        ? 'border-rose-500/40 bg-rose-500/[0.03]'
                        : d.capacityRisk === 'High'
                        ? 'border-amber-500/40 bg-amber-500/[0.03]'
                        : 'border-white/10'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-bold text-[#A0A0A0] uppercase">{d.dayLabel}</div>
                      <div className="text-xl font-black text-white mt-1">{d.predictedBookings} xe</div>
                      <div className="text-[11px] text-[#FFC799] font-bold mt-0.5">
                        {d.predictedRevenue.toLocaleString('vi-VN')} đ
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5">
                      <div className="flex justify-between text-[10px] text-[#A0A0A0]">
                        <span>Tải dự kiến:</span>
                        <span className="font-bold text-white">{d.expectedUtilization}%</span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            d.capacityRisk === 'Overload'
                              ? 'bg-rose-500'
                              : d.capacityRisk === 'High'
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.min(100, d.expectedUtilization)}%` }}
                        />
                      </div>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          d.capacityRisk === 'Overload'
                            ? 'text-rose-400 bg-rose-500/10'
                            : d.capacityRisk === 'High'
                            ? 'text-amber-400 bg-amber-500/10'
                            : 'text-emerald-400 bg-emerald-500/10'
                        }`}
                      >
                        {d.capacityRisk === 'Overload'
                          ? 'Nguy cơ quá tải'
                          : d.capacityRisk === 'High'
                          ? 'Tải cao'
                          : 'Bình thường'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
