import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  BarChart,
  PieChart as RechartsPieChart,
  Area,
  Bar,
  Line,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  FileSpreadsheet,
  FileText,
  Building2,
  Bike,
  Sparkles,
  PieChart as LucidePieChart,
  RefreshCw,
  Clock,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
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

// Curated Luxury Color Palette for Recharts (Strict Vector SVG)
const PALETTE = {
  brand: '#FFC799',
  brandDark: '#E59B5F',
  turquoise: '#99FFE4',
  sky: '#38BDF8',
  emerald: '#34D399',
  amber: '#FBBF24',
  rose: '#FB7185',
  purple: '#A78BFA',
  indigo: '#818CF8',
};

const CATEGORY_COLORS = [PALETTE.brand, PALETTE.turquoise, PALETTE.sky, PALETTE.purple, PALETTE.emerald];
const STATUS_COLORS: Record<string, string> = {
  Available: PALETTE.emerald,
  Rented: PALETTE.sky,
  Maintenance: PALETTE.amber,
  Transferring: PALETTE.purple,
};

// Custom Tooltip for Recharts with Dark Glassmorphism
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#121212]/95 backdrop-blur-md border border-white/15 px-3.5 py-2.5 rounded-xl shadow-2xl text-xs space-y-1.5 z-50">
        <p className="font-bold text-white border-b border-white/10 pb-1 font-mono-tabular">
          {label !== undefined ? (typeof label === 'number' ? `Ngày ${label}` : label) : ''}
        </p>
        {payload.map((entry: any, index: number) => {
          const val = entry.value;
          const formattedVal =
            typeof val === 'number'
              ? entry.dataKey?.toString().toLowerCase().includes('rate') ||
                entry.dataKey?.toString().toLowerCase().includes('percent') ||
                entry.dataKey?.toString().toLowerCase().includes('utilization')
                ? `${val}%`
                : val >= 10000
                ? `${val.toLocaleString('vi-VN')} đ`
                : `${val.toLocaleString('vi-VN')}`
              : val;

          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-[#A0A0A0]">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color || entry.fill || PALETTE.brand }}
                />
                <span>{entry.name || entry.dataKey}:</span>
              </span>
              <span className="font-bold font-mono-tabular text-white">{formattedVal}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

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
    else if (activeTab === 'chain' && isAdmin) fetchChainReport();
    else if (activeTab === 'kpi') fetchKpiDashboard();
    else if (activeTab === 'forecast') fetchDemandForecast();
  }, [activeTab, selectedBranchId, dailyDate, monthlyMonth, monthlyYear, chainPeriod]);

  // UC-89: Export handler
  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(true);
    try {
      const branchId = getEffectiveBranch();
      const params: Record<string, any> = { format, type: activeTab, branchId };

      if (activeTab === 'daily') params.date = dailyDate;
      if (activeTab === 'monthly') {
        params.month = monthlyMonth;
        params.year = monthlyYear;
      }
      if (activeTab === 'chain') params.period = chainPeriod;

      const res = await api.get('/reports/export', {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type:
          format === 'excel'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Motorent_Report_${activeTab}_${new Date().toISOString().slice(0, 10)}.${
        format === 'excel' ? 'xlsx' : 'pdf'
      }`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi khi xuất báo cáo:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Operational Filters (Responsive Optimized) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="text-[#FFC799] w-6 h-6 flex-shrink-0" />
            <span>Trung Tâm Báo Cáo & Phân Tích Vận Hành</span>
          </h1>
          <p className="text-xs text-[#A0A0A0] mt-1 leading-relaxed">
            Hệ thống phân tích tài chính thời gian thực, quản lý đội xe và phễu chuyển đổi vận hành
          </p>
        </div>

        {/* Global Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Branch Selector for Admin */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-[#101010] border border-white/10 rounded-xl px-3 py-1.5 text-xs">
              <Building2 size={14} className="text-[#FFC799] flex-shrink-0" />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-[#161616] text-white">
                  Toàn bộ trạm xe (Hợp nhất)
                </option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id} className="bg-[#161616] text-white">
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* UC-89: Export Buttons */}
          <div className="inline-flex rounded-xl bg-[#101010] border border-white/10 p-0.5">
            <button
              type="button"
              disabled={exporting}
              onClick={() => handleExport('excel')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50 cursor-pointer"
              title="Xuất bảng tính Excel (UC-89)"
            >
              <FileSpreadsheet size={14} />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>

            <button
              type="button"
              disabled={exporting}
              onClick={() => handleExport('pdf')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50 cursor-pointer"
              title="Xuất file in PDF có logo Motorent (UC-89)"
            >
              <FileText size={14} />
              <span className="hidden sm:inline">Xuất PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Responsive Swipeable Dock) */}
      <div className="flex items-center overflow-x-auto scrollbar-none flex-nowrap max-w-full bg-[#161616] border border-white/10 rounded-2xl p-1.5 gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
            activeTab === 'daily'
              ? 'bg-[#FFC799] text-[#101010] shadow-md font-black'
              : 'text-[#A0A0A0] hover:text-white'
          }`}
        >
          <Clock size={15} />
          <span>Doanh thu ngày (UC-86)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('monthly')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
            activeTab === 'monthly'
              ? 'bg-[#FFC799] text-[#101010] shadow-md font-black'
              : 'text-[#A0A0A0] hover:text-white'
          }`}
        >
          <Calendar size={15} />
          <span>Doanh thu tháng (UC-87-88)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fleet')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
            activeTab === 'fleet'
              ? 'bg-[#FFC799] text-[#101010] shadow-md font-black'
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
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
              activeTab === 'chain'
                ? 'bg-[#FFC799] text-[#101010] shadow-md font-black'
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
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
            activeTab === 'kpi'
              ? 'bg-[#FFC799] text-[#101010] shadow-md font-black'
              : 'text-[#A0A0A0] hover:text-white'
          }`}
        >
          <Layers size={15} />
          <span>KPI Executive Dashboard (UC-105)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('forecast')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
            activeTab === 'forecast'
              ? 'bg-[#FFC799] text-[#101010] shadow-md font-black'
              : 'text-[#A0A0A0] hover:text-white'
          }`}
        >
          <Sparkles size={15} />
          <span>Dự báo nhu cầu xe (UC-106)</span>
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="p-16 text-center text-[#A0A0A0] flex flex-col items-center justify-center gap-3">
          <RefreshCw size={26} className="animate-spin text-[#FFC799]" />
          <span className="text-xs font-medium">Đang tính toán dữ liệu báo cáo chuyên sâu...</span>
        </div>
      ) : (
        <>
          {/* =====================================================================
              TAB 1: DAILY REVENUE (UC-86)
              ===================================================================== */}
          {activeTab === 'daily' && dailyData && (
            <div className="space-y-6 animate-fade-up">
              {/* Date Filter Bar */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Calendar size={18} className="text-[#FFC799]" />
                  <span className="text-xs font-bold text-white">Ngày báo cáo:</span>
                  <input
                    type="date"
                    value={dailyDate}
                    onChange={(e) => setDailyDate(e.target.value)}
                    className="bg-[#101010] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#FFC799] focus:outline-none font-mono-tabular"
                  />
                </div>

                <div className="text-xs text-[#A0A0A0] flex items-center gap-2">
                  <span>Trạm:</span>
                  <span className="font-bold text-white font-mono-tabular">
                    {dailyData.branch?.name || 'Toàn bộ hệ thống trạm'}
                  </span>
                </div>
              </div>

              {/* 4 Summary Cards (Responsive Fluid Typography) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <span className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-wider block">
                    Doanh thu thuần ngày
                  </span>
                  <p className="text-lg sm:text-2xl font-black text-[#FFC799] mt-2 font-mono-tabular truncate">
                    {dailyData.metrics.netRevenue.toLocaleString('vi-VN')} đ
                  </p>
                  <span className="text-[11px] text-[#A0A0A0] mt-1 block">
                    Tổng thu: {dailyData.metrics.grossRevenue.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <span className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-wider block">
                    Tiền cọc trực tuyến
                  </span>
                  <p className="text-lg sm:text-2xl font-black text-[#99FFE4] mt-2 font-mono-tabular truncate">
                    {dailyData.metrics.onlineDepositRevenue.toLocaleString('vi-VN')} đ
                  </p>
                  <span className="text-[11px] text-[#A0A0A0] mt-1 block">Qua cổng VNPay</span>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <span className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-wider block">
                    Tất toán tại quầy
                  </span>
                  <p className="text-lg sm:text-2xl font-black text-sky-400 mt-2 font-mono-tabular truncate">
                    {dailyData.metrics.counterSettlementRevenue.toLocaleString('vi-VN')} đ
                  </p>
                  <span className="text-[11px] text-[#A0A0A0] mt-1 block">Tiền mặt / Thẻ POS</span>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <span className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-wider block">
                    Lượt nhận & trả xe
                  </span>
                  <p className="text-lg sm:text-2xl font-black text-white mt-2 font-mono-tabular">
                    {dailyData.metrics.pickupsCount} nhận / {dailyData.metrics.returnsCount} trả
                  </p>
                  <span className="text-[11px] text-[#A0A0A0] mt-1 block font-mono-tabular">
                    {dailyData.metrics.totalBookings} đơn phát sinh hôm nay
                  </span>
                </div>
              </div>

              {/* Transactions Table (Responsive Scroll) */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <Clock size={16} className="text-[#FFC799]" />
                    Danh sách đơn phát sinh trong ngày ({dailyData.bookings.length} đơn)
                  </h3>
                </div>

                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-[#101010] text-[#A0A0A0] uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Mã đơn</th>
                        <th className="py-3 px-4">Khách hàng</th>
                        <th className="py-3 px-4">Phương tiện</th>
                        <th className="py-3 px-4">Tổng tiền</th>
                        <th className="py-3 px-4">Đã thu</th>
                        <th className="py-3 px-4">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono-tabular">
                      {dailyData.bookings.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#707070]">
                            Chưa ghi nhận giao dịch nào trong ngày này.
                          </td>
                        </tr>
                      ) : (
                        dailyData.bookings.map((b) => (
                          <tr key={b._id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-[#FFC799]">{b.bookingCode}</td>
                            <td className="py-3 px-4 font-sans text-white">{b.customerName}</td>
                            <td className="py-3 px-4 font-sans text-[#D0D0D0]">
                              {b.vehicleModel} ({b.licensePlate})
                            </td>
                            <td className="py-3 px-4 font-bold text-white">
                              {b.totalAmount.toLocaleString('vi-VN')} đ
                            </td>
                            <td className="py-3 px-4 text-emerald-400 font-bold">
                              {b.paidAmount.toLocaleString('vi-VN')} đ
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  b.status === 'Completed'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : b.status === 'Ongoing'
                                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                    : 'bg-[#FFC799]/10 text-[#FFC799] border border-[#FFC799]/20'
                                }`}
                              >
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

          {/* =====================================================================
              TAB 2: MONTHLY REVENUE (UC-87-88) - RECHARTS POLISH
              ===================================================================== */}
          {activeTab === 'monthly' && monthlyData && (
            <div className="space-y-6 animate-fade-up">
              {/* Month Selector Bar */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Calendar size={18} className="text-[#FFC799]" />
                  <span className="text-xs font-bold text-white">Tháng:</span>
                  <select
                    value={monthlyMonth}
                    onChange={(e) => setMonthlyMonth(Number(e.target.value))}
                    className="bg-[#101010] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#FFC799] focus:outline-none cursor-pointer"
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
                    className="bg-[#101010] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#FFC799] focus:outline-none cursor-pointer"
                  >
                    {[2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#A0A0A0]">Tăng trưởng so với tháng trước:</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border font-mono-tabular ${
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

              {/* Monthly Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Tổng doanh thu tháng</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#FFC799] mt-1.5 font-mono-tabular truncate">
                    {monthlyData.summary.totalRevenue.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-xs text-[#A0A0A0] mt-1 font-mono-tabular">
                    Tháng trước: {monthlyData.summary.previousMonthRevenue.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Tổng số chuyến xe</div>
                  <div className="text-2xl sm:text-3xl font-black text-white mt-1.5 font-mono-tabular">
                    {monthlyData.summary.totalBookings} đơn
                  </div>
                  <div className="text-xs text-emerald-400 mt-1">Đã hoàn tất thanh toán</div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Giá trị đơn TB (AOV)</div>
                  <div className="text-2xl sm:text-3xl font-black text-sky-400 mt-1.5 font-mono-tabular truncate">
                    {monthlyData.summary.averageOrderValue.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-xs text-[#A0A0A0] mt-1">Bao gồm cọc & phụ phí</div>
                </div>
              </div>

              {/* RECHARTS POLISH 1: Composed Chart Daily Revenue in Month */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 size={16} className="text-[#FFC799]" />
                    Biểu đồ doanh thu từng ngày trong tháng ({monthlyData.dailyBreakdown.length} ngày)
                  </h3>
                  <span className="text-[11px] text-[#A0A0A0]">Đơn vị: VNĐ • Hover để xem chi tiết</span>
                </div>

                <div className="w-full h-72 sm:h-80 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={monthlyData.dailyBreakdown}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="monthRevArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={PALETTE.brand} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={PALETTE.brand} stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="monthRevBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={PALETTE.brand} stopOpacity={1} />
                          <stop offset="100%" stopColor={PALETTE.brandDark} stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        dataKey="day"
                        stroke="#707070"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(val) => `N${val}`}
                      />
                      <YAxis
                        stroke="#707070"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${val / 1000}k`)}
                      />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Bar
                        dataKey="revenue"
                        name="Doanh thu ngày"
                        fill="url(#monthRevBar)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                        animationDuration={1200}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Đường xu hướng"
                        stroke={PALETTE.brand}
                        strokeWidth={2.5}
                        fill="url(#monthRevArea)"
                        animationDuration={1500}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RECHARTS POLISH 2: Category Breakdown Donut Chart */}
              {monthlyData.categoryBreakdown && monthlyData.categoryBreakdown.length > 0 && (
                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <LucidePieChart size={16} className="text-[#99FFE4]" />
                      Cơ cấu doanh thu theo phân khúc dòng xe
                    </h3>
                  </div>

                  {(() => {
                    const totalCatRev =
                      monthlyData.categoryBreakdown.reduce((sum, c) => sum + (c.revenue || 0), 0) || 1;

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        {/* Donut Chart (5 cols) */}
                        <div className="md:col-span-5 h-64 flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={monthlyData.categoryBreakdown}
                                dataKey="revenue"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={4}
                                animationDuration={1200}
                              >
                                {monthlyData.categoryBreakdown.map((_, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                                    stroke="#161616"
                                    strokeWidth={2}
                                  />
                                ))}
                              </Pie>
                              <RechartsTooltip content={<CustomChartTooltip />} />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Breakdown List (7 cols) */}
                        <div className="md:col-span-7 space-y-3">
                          {monthlyData.categoryBreakdown.map((cat, idx) => {
                            const calculatedPercent = Math.round((cat.revenue / totalCatRev) * 100);

                            return (
                              <div
                                key={cat.name}
                                className="p-3 bg-[#101010] border border-white/5 rounded-xl flex items-center justify-between hover:border-white/15 transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                                  />
                                  <div>
                                    <p className="text-xs font-bold text-white">{cat.name}</p>
                                    <p className="text-[10px] text-[#A0A0A0] font-mono-tabular">
                                      {cat.bookingsCount} lượt thuê
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right font-mono-tabular">
                                  <p className="text-xs font-bold text-white">{cat.revenue.toLocaleString('vi-VN')} đ</p>
                                  <span className="text-[10px] font-bold text-[#FFC799]">{calculatedPercent}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              TAB 3: FLEET STATS (UC-90-92) - RECHARTS POLISH
              ===================================================================== */}
          {activeTab === 'fleet' && fleetData && (
            <div className="space-y-6 animate-fade-up">
              {/* Fleet Overview Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Tổng số xe tại trạm</div>
                  <div className="text-2xl sm:text-3xl font-black text-white mt-1.5 font-mono-tabular">
                    {fleetData.totalVehicles}
                  </div>
                  <div className="text-xs text-emerald-400 mt-1">Đang quản lý vận hành</div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Tỷ lệ lấp đầy (Utilization)</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#FFC799] mt-1.5 font-mono-tabular">
                    {fleetData.utilizationRate}%
                  </div>
                  <div className="text-xs text-[#A0A0A0] mt-1">Xe đang phục vụ khách</div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Đánh giá trung bình</div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1.5 font-mono-tabular">
                    {fleetData.averageRating} / 5.0
                  </div>
                  <div className="text-xs text-[#A0A0A0] mt-1">Từ phản hồi khách hàng</div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Chi phí bảo dưỡng tháng</div>
                  <div className="text-2xl sm:text-3xl font-black text-rose-400 mt-1.5 font-mono-tabular truncate">
                    {fleetData.maintenanceStats.monthlyCost.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-xs text-[#A0A0A0] mt-1 font-mono-tabular">
                    {fleetData.maintenanceStats.inMaintenance} xe đang sửa chữa
                  </div>
                </div>
              </div>

              {/* RECHARTS POLISH 3: Fleet Status Distribution */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bike size={16} className="text-[#FFC799]" />
                  Phân bổ trạng thái đội xe hiện tại
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Status Donut Chart (5 cols) */}
                  <div className="md:col-span-5 h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'Sẵn sàng', key: 'Available', value: fleetData.statusBreakdown.available },
                            { name: 'Đang thuê', key: 'Rented', value: fleetData.statusBreakdown.rented },
                            { name: 'Bảo dưỡng', key: 'Maintenance', value: fleetData.statusBreakdown.maintenance },
                            { name: 'Điều chuyển', key: 'Transferring', value: fleetData.statusBreakdown.transferring },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={4}
                          animationDuration={1200}
                        >
                          <Cell fill={STATUS_COLORS.Available} stroke="#161616" strokeWidth={2} />
                          <Cell fill={STATUS_COLORS.Rented} stroke="#161616" strokeWidth={2} />
                          <Cell fill={STATUS_COLORS.Maintenance} stroke="#161616" strokeWidth={2} />
                          <Cell fill={STATUS_COLORS.Transferring} stroke="#161616" strokeWidth={2} />
                        </Pie>
                        <RechartsTooltip content={<CustomChartTooltip />} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Status Metric Cards (7 cols) */}
                  <div className="md:col-span-7 grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                      <span className="text-emerald-400 font-bold block">Sẵn sàng (Available)</span>
                      <div className="text-2xl font-black text-white font-mono-tabular">
                        {fleetData.statusBreakdown.available} xe
                      </div>
                      <span className="text-[10px] text-[#A0A0A0] block">Khách có thể nhận ngay</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 space-y-1">
                      <span className="text-sky-400 font-bold block">Đang thuê (Rented)</span>
                      <div className="text-2xl font-black text-white font-mono-tabular">
                        {fleetData.statusBreakdown.rented} xe
                      </div>
                      <span className="text-[10px] text-[#A0A0A0] block">Đang lưu thông trên đường</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                      <span className="text-amber-400 font-bold block">Bảo dưỡng (Maintenance)</span>
                      <div className="text-2xl font-black text-white font-mono-tabular">
                        {fleetData.statusBreakdown.maintenance} xe
                      </div>
                      <span className="text-[10px] text-[#A0A0A0] block">Kiểm tra định kỳ & sửa chữa</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                      <span className="text-purple-400 font-bold block">Điều chuyển (Transferring)</span>
                      <div className="text-2xl font-black text-white font-mono-tabular">
                        {fleetData.statusBreakdown.transferring} xe
                      </div>
                      <span className="text-[10px] text-[#A0A0A0] block">Đang di chuyển giữa các trạm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Vehicles Table */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h3 className="text-xs sm:text-sm font-bold text-white">Top 5 xe được đánh giá cao nhất</h3>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs min-w-[650px]">
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
                    <tbody className="divide-y divide-white/5 font-mono-tabular">
                      {fleetData.topVehicles.map((v) => (
                        <tr key={v._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-semibold text-white font-sans">{v.vehicleModel}</td>
                          <td className="py-3 px-4 font-mono font-bold text-[#FFC799]">{v.licensePlate}</td>
                          <td className="py-3 px-4 text-[#A0A0A0] font-sans">{v.brand}</td>
                          <td className="py-3 px-4 text-white">{(v.odometer || 0).toLocaleString('vi-VN')} km</td>
                          <td className="py-3 px-4 font-bold text-amber-400">{v.averageRating} ★</td>
                          <td className="py-3 px-4 text-emerald-400 font-bold">
                            {v.dailyPrice.toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 4: CHAIN REVENUE & COMPARISON (UC-103-104) - RECHARTS POLISH
              ===================================================================== */}
          {activeTab === 'chain' && chainData && comparisonData && (
            <div className="space-y-6 animate-fade-up">
              {/* Period selector */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-[#FFC799]" />
                  <span className="text-xs font-bold text-white">Kỳ báo cáo:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: 'today', label: 'Hôm nay' },
                    { key: 'this_week', label: 'Tuần này' },
                    { key: 'this_month', label: 'Tháng này' },
                    { key: 'last_month', label: 'Tháng trước' },
                    { key: 'this_year', label: 'Năm nay' },
                  ].map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setChainPeriod(p.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        chainPeriod === p.key
                          ? 'bg-[#FFC799] text-[#101010] shadow'
                          : 'bg-[#101010] text-[#A0A0A0] hover:text-white border border-white/10'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chain Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Tổng doanh thu toàn chuỗi</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#FFC799] mt-1.5 font-mono-tabular truncate">
                    {chainData.totalChainRevenue.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-xs text-white mt-1">Từ {chainData.totalBranches} chi nhánh trạm xe</div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Tổng đơn thuê toàn chuỗi</div>
                  <div className="text-2xl sm:text-3xl font-black text-white mt-1.5 font-mono-tabular">
                    {chainData.totalBookings} đơn
                  </div>
                  <div className="text-xs text-[#A0A0A0] mt-1">Tất cả chi nhánh</div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Trạm dẫn đầu doanh thu</div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-2 truncate font-sans">
                    {comparisonData.highlights.topRevenueBranch}
                  </div>
                  <div className="text-xs text-[#A0A0A0] mt-1">
                    Lấp đầy cao nhất: {comparisonData.highlights.highestUtilizationBranch}
                  </div>
                </div>
              </div>

              {/* RECHARTS POLISH 4: Branch Revenue Comparison Bar Chart */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 size={16} className="text-[#FFC799]" />
                    Đối chiếu doanh thu các chi nhánh
                  </h3>
                  <span className="text-[11px] text-[#A0A0A0]">Đơn vị: VNĐ</span>
                </div>

                <div className="w-full h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={comparisonData.branches}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="branchName" stroke="#707070" fontSize={11} tickLine={false} />
                      <YAxis
                        stroke="#707070"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(val) =>
                          val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${val / 1000}k`
                        }
                      />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Bar
                        dataKey="revenue"
                        name="Doanh thu trạm"
                        fill={PALETTE.brand}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                        animationDuration={1200}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Side-by-side Branch Comparison Table (UC-104) */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h3 className="text-xs sm:text-sm font-bold text-white">So sánh hiệu suất các chi nhánh (UC-104)</h3>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs min-w-[700px]">
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
                    <tbody className="divide-y divide-white/5 font-mono-tabular">
                      {comparisonData.branches.map((br) => (
                        <tr key={br.branchId} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-bold text-white font-sans">{br.branchName}</td>
                          <td className="py-3 px-4 font-mono font-bold text-[#FFC799]">{br.branchCode}</td>
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

          {/* =====================================================================
              TAB 5: KPI DASHBOARD (UC-105) - RECHARTS POLISH
              ===================================================================== */}
          {activeTab === 'kpi' && kpiData && (
            <div className="space-y-6 animate-fade-up">
              {/* Executive Overview Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Tổng doanh thu lũy kế</div>
                  <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#FFC799] mt-1.5 font-mono-tabular truncate">
                    {kpiData.kpi.totalRevenue.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Hợp đồng đang thuê</div>
                  <div className="text-xl sm:text-2xl lg:text-3xl font-black text-sky-400 mt-1.5 font-mono-tabular">
                    {kpiData.kpi.activeRentals} xe
                  </div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Tỷ lệ hủy đơn</div>
                  <div className="text-xl sm:text-2xl lg:text-3xl font-black text-rose-400 mt-1.5 font-mono-tabular">
                    {kpiData.kpi.cancellationRate}%
                  </div>
                </div>

                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <div className="text-xs font-bold text-[#A0A0A0] uppercase">Công suất đội xe</div>
                  <div className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-400 mt-1.5 font-mono-tabular">
                    {kpiData.kpi.fleetUtilization}%
                  </div>
                </div>
              </div>

              {/* RECHARTS POLISH 5: 7-Day Revenue Trend Spline Area Chart */}
              {kpiData.trend && kpiData.trend.length > 0 && (
                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp size={16} className="text-[#FFC799]" />
                      Xu hướng tăng trưởng doanh thu 07 ngày gần nhất
                    </h3>
                    <span className="text-[11px] text-[#A0A0A0]">Đơn vị: VNĐ • Cập nhật tự động</span>
                  </div>

                  <div className="w-full h-72 sm:h-80 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={kpiData.trend}
                        margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="kpiAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={PALETTE.brand} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={PALETTE.brand} stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="label" stroke="#707070" fontSize={11} tickLine={false} />
                        <YAxis
                          stroke="#707070"
                          fontSize={10}
                          tickLine={false}
                          tickFormatter={(val) =>
                            val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${val / 1000}k`
                          }
                        />
                        <RechartsTooltip content={<CustomChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="Doanh thu ngày"
                          stroke={PALETTE.brand}
                          strokeWidth={3}
                          fill="url(#kpiAreaGrad)"
                          activeDot={{ r: 6, fill: PALETTE.brand, stroke: '#161616', strokeWidth: 2 }}
                          animationDuration={1500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Conversion Funnel (Interactive Step Funnel) */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers size={16} className="text-[#FFC799]" />
                  Phễu chuyển đổi vận hành thuê xe (Rental Funnel)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {kpiData.funnel.map((step, idx) => (
                    <div
                      key={idx}
                      className="bg-[#101010] border border-white/5 rounded-xl p-4 space-y-2.5 relative overflow-hidden group hover:border-[#FFC799]/30 transition-all"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#A0A0A0]">
                        <span>0{idx + 1}. {step.stage}</span>
                        <span className="text-[#FFC799] font-mono-tabular">{step.percent}%</span>
                      </div>

                      <div className="text-xl sm:text-2xl font-black text-white font-mono-tabular">
                        {step.count.toLocaleString('vi-VN')}
                      </div>

                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#FFC799]/80 to-[#FFC799] h-full rounded-full transition-all duration-1000"
                          style={{ width: `${step.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Vehicles by Revenue Bar Chart */}
              {kpiData.topVehicles && kpiData.topVehicles.length > 0 && (
                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Bike size={16} className="text-[#99FFE4]" />
                    Top 5 phương tiện mang lại doanh thu cao nhất
                  </h3>

                  <div className="w-full h-64 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={kpiData.topVehicles}
                        layout="vertical"
                        margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                        <XAxis
                          type="number"
                          stroke="#707070"
                          fontSize={10}
                          tickLine={false}
                          tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                        />
                        <YAxis
                          type="category"
                          dataKey="model"
                          stroke="#A0A0A0"
                          fontSize={11}
                          tickLine={false}
                          width={110}
                        />
                        <RechartsTooltip content={<CustomChartTooltip />} />
                        <Bar
                          dataKey="revenue"
                          name="Doanh thu xe"
                          fill={PALETTE.turquoise}
                          radius={[0, 4, 4, 0]}
                          maxBarSize={20}
                          animationDuration={1200}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              TAB 6: DEMAND FORECAST (UC-106) - RECHARTS & MOBILE CAROUSEL POLISH
              ===================================================================== */}
          {activeTab === 'forecast' && forecastData && (
            <div className="space-y-6 animate-fade-up">
              {/* Insights Banner */}
              <div className="bg-gradient-to-r from-amber-500/10 via-[#161616] to-[#161616] border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
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

              {/* RECHARTS POLISH 6: Forecast Dual-Axis Composed Chart */}
              <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp size={16} className="text-[#FFC799]" />
                    Mô hình dự báo số lượng xe & tỷ lệ công suất 07 ngày tới
                  </h3>
                  <div className="flex items-center gap-4 text-[11px] text-[#A0A0A0]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-[#FFC799]" /> Số xe dự kiến (Cột)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-[#99FFE4]" /> Tỷ lệ tải % (Đường)
                    </span>
                  </div>
                </div>

                <div className="w-full h-72 sm:h-80 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={forecastData.forecast7Days}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="dayLabel" stroke="#707070" fontSize={11} tickLine={false} />
                      <YAxis
                        yAxisId="left"
                        stroke="#707070"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(val) => `${val} xe`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#707070"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Bar
                        yAxisId="left"
                        dataKey="predictedBookings"
                        name="Số xe dự kiến"
                        fill={PALETTE.brand}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                        animationDuration={1200}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="expectedUtilization"
                        name="Tải dự kiến (%)"
                        stroke={PALETTE.turquoise}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: PALETTE.turquoise }}
                        animationDuration={1500}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 7-Day Forecast Cards (Mobile Swipeable Snap Strip) */}
              <div>
                <p className="text-xs font-bold text-[#A0A0A0] uppercase mb-2">Chi tiết từng ngày:</p>
                <div className="flex sm:grid sm:grid-cols-7 overflow-x-auto gap-3 snap-x pb-2 scrollbar-none">
                  {forecastData.forecast7Days.map((d) => (
                    <div
                      key={d.date}
                      className={`bg-[#161616] border rounded-2xl p-3.5 flex flex-col justify-between transition-all w-36 sm:w-auto flex-shrink-0 snap-center ${
                        d.capacityRisk === 'Overload'
                          ? 'border-rose-500/40 bg-rose-500/[0.03]'
                          : d.capacityRisk === 'High'
                          ? 'border-amber-500/40 bg-amber-500/[0.03]'
                          : 'border-white/10'
                      }`}
                    >
                      <div>
                        <div className="text-[11px] font-bold text-[#A0A0A0] uppercase font-sans truncate">
                          {d.dayLabel}
                        </div>
                        <div className="text-lg sm:text-xl font-black text-white mt-1 font-mono-tabular">
                          {d.predictedBookings} xe
                        </div>
                        <div className="text-[11px] text-[#FFC799] font-bold mt-0.5 font-mono-tabular truncate">
                          {d.predictedRevenue.toLocaleString('vi-VN')} đ
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5 font-mono-tabular">
                        <div className="flex justify-between text-[10px] text-[#A0A0A0]">
                          <span>Tải:</span>
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
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold font-sans ${
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
            </div>
          )}
        </>
      )}
    </div>
  );
};
