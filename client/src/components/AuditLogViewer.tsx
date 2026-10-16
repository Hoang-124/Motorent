import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Clock,
  Activity,
  Database,
  Globe,
  RotateCcw,
} from 'lucide-react';
import { api } from '../services/api';
import type { AuditLogEntry } from '../types';

interface AuditStats {
  totalAll: number;
  successCount: number;
  failedCount: number;
  todayCount: number;
  entities: string[];
  actions: string[];
}

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(12);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Telemetry stats
  const [stats, setStats] = useState<AuditStats>({
    totalAll: 0,
    successCount: 0,
    failedCount: 0,
    todayCount: 0,
    entities: ['Booking', 'Payment', 'Vehicle', 'User', 'Branch', 'Conversation', 'System'],
    actions: [],
  });

  // Selected Audit Entry for JSON Changes Inspection Modal
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (entityFilter) params.set('entity', entityFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const res = await api.get(`/audit?${params.toString()}`);
      const data = res.data?.data;
      if (data) {
        setLogs(data.items || data.logs || []);
        setTotal(data.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Không thể tải Nhật ký Audit:', err);
      setErrorMsg('Không thể tải dữ liệu Nhật ký hệ thống (Audit Log). Vui lòng kiểm tra quyền truy cập.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, entityFilter, actionFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setEntityFilter('');
    setActionFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const getMethodBadgeStyle = (method?: string, action?: string) => {
    const m = (method || '').toUpperCase();
    if (m === 'DELETE' || action?.includes('DELETE') || action?.includes('CANCEL')) {
      return 'bg-[#FF8080]/12 text-[#FF8080] border-[#FF8080]/30';
    }
    if (m === 'PUT' || m === 'PATCH' || action?.includes('UPDATE') || action?.includes('CHECK')) {
      return 'bg-[#FFC799]/15 text-[#FFC799] border-[#FFC799]/30';
    }
    return 'bg-[#FFC799]/15 text-[#FFC799] border-[#FFC799]/30';
  };

  return (
    <div className="space-y-6">
      {/* Top 4 Security Telemetry KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#161616] border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6E6E6E] block">
              TỔNG NHẬT KÝ CRUD
            </span>
            <span className="text-2xl font-mono font-black text-[#F5F5F5] mt-1 block">
              {stats.totalAll.toLocaleString('vi-VN')}
            </span>
            <span className="text-[11px] text-[#6E6E6E]">Tự động ghi qua Audit Middleware</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FFC799]/10 border border-[#FFC799]/25 text-[#FFC799] flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#161616] border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6E6E6E] block">
              THAO TÁC HỢP LỆ (2XX)
            </span>
            <span className="text-2xl font-mono font-black text-[#FFC799] mt-1 block">
              {stats.successCount.toLocaleString('vi-VN')}
            </span>
            <span className="text-[11px] text-[#6E6E6E]">Đã xác thực JWT & RBAC</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FFC799]/10 border border-[#FFC799]/25 text-[#FFC799] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#161616] border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6E6E6E] block">
              CẢNH BÁO / TỪ CHỐI
            </span>
            <span className="text-2xl font-mono font-black text-[#FF8080] mt-1 block">
              {stats.failedCount.toLocaleString('vi-VN')}
            </span>
            <span className="text-[11px] text-[#6E6E6E]">Sai mật khẩu / Chặn phân quyền</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FF8080]/12 border border-[#FF8080]/30 text-[#FF8080] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#161616] border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6E6E6E] block">
              PHÁT SINH HÔM NAY
            </span>
            <span className="text-2xl font-mono font-black text-[#FFC799] mt-1 block">
              {stats.todayCount.toLocaleString('vi-VN')}
            </span>
            <span className="text-[11px] text-[#6E6E6E]">Thời gian thực 24 giờ qua</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FFC799]/10 border border-[#FFC799]/25 text-[#FFC799] flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Search, Filter & Audit Table Container */}
      <div className="bg-[#161616] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header & Multi-Filter Bar */}
        <div className="p-5 bg-[#101010] border-b border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#FFC799] block">
                SECURITY & CRUD AUDIT LOG VIEWER
              </span>
              <h2 className="text-lg font-black text-[#F5F5F5] mt-0.5">
                Nhật ký Truy vết Hệ thống & Thay đổi Dữ liệu
              </h2>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-[#C8C2B8] flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại bộ lọc</span>
              </button>
              <button
                type="button"
                onClick={fetchAuditLogs}
                className="px-3.5 py-2 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] text-xs font-black flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {/* Filter Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Keyword Search */}
            <div className="lg:col-span-4 relative">
              <Search className="w-4 h-4 text-[#6E6E6E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo Action, User, Entity ID, IP, đường dẫn..."
                className="w-full bg-[#161616] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#F5F5F5] placeholder-[#6E6E6E] outline-none focus:border-[#FFC799]"
              />
            </div>

            {/* Entity Filter */}
            <div className="lg:col-span-2">
              <select
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#161616] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#F5F5F5] outline-none focus:border-[#FFC799] cursor-pointer"
              >
                <option value="">Tất cả Phân hệ (Entity)</option>
                {stats.entities.map((ent) => (
                  <option key={ent} value={ent}>
                    Phân hệ: {ent}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div className="lg:col-span-2">
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#161616] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#F5F5F5] outline-none focus:border-[#FFC799] cursor-pointer"
              >
                <option value="">Tất cả Hành động</option>
                {stats.actions.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="lg:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#161616] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#F5F5F5] outline-none focus:border-[#FFC799] cursor-pointer"
              >
                <option value="">Mọi trạng thái</option>
                <option value="SUCCESS">Thành công (SUCCESS)</option>
                <option value="FAILED">Thất bại (FAILED)</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="lg:col-span-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                title="Từ ngày"
                className="w-full bg-[#161616] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-[#FF8080]/12 border-b border-[#FF8080]/30 text-[#FF8080] text-xs">
            {errorMsg}
          </div>
        )}

        {/* Audit Trail Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0D1311] border-b border-white/10 text-[10px] font-mono font-bold uppercase tracking-wider text-[#6E6E6E]">
                <th className="py-3.5 px-4">Thời gian</th>
                <th className="py-3.5 px-4">Tác nhân (User / Actor)</th>
                <th className="py-3.5 px-4">Hành động (Action & Route)</th>
                <th className="py-3.5 px-4">Đối tượng (Entity)</th>
                <th className="py-3.5 px-4">IP & Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Dữ liệu Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-xs">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6E6E6E]">
                    Đang truy xuất nhật ký bảo mật...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6E6E6E]">
                    Không tìm thấy bản ghi Audit nào khớp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                logs.map((entry) => {
                  const actor = entry.userId;
                  const actorName = actor
                    ? [actor.lastName, actor.firstName].filter(Boolean).join(' ') || actor.username
                    : 'Hệ thống (System)';
                  const actorRole = actor?.roles || 'System';

                  return (
                    <tr
                      key={entry._id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5 font-mono text-[11px] text-[#F5F5F5]">
                          <Clock className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                          <span>
                            {new Date(entry.timestamp).toLocaleDateString('vi-VN')}{' '}
                            <strong className="text-[#FFC799]">
                              {new Date(entry.timestamp).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </strong>
                          </span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-[#F5F5F5]">{actorName}</span>
                            <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 font-mono text-[9px] font-bold text-[#FFC799]">
                              {actorRole}
                            </span>
                          </div>
                          {actor?.email && (
                            <span className="text-[11px] text-[#6E6E6E] font-mono">
                              {actor.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action & Method */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded border font-mono text-[10px] font-bold ${getMethodBadgeStyle(
                              entry.method,
                              entry.action
                            )}`}
                          >
                            {entry.method && <span>{entry.method} •</span>}
                            <span>{entry.action}</span>
                          </span>
                          {entry.path && (
                            <p className="text-[11px] font-mono text-[#6E6E6E] truncate max-w-[240px]">
                              {entry.path}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Entity & EntityId */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#F5F5F5]">{entry.entity}</span>
                          {entry.entityId && (
                            <span className="text-[10px] font-mono text-[#6E6E6E] truncate max-w-[150px]">
                              ID: {entry.entityId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* IP & Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                              entry.status === 'FAILED'
                                ? 'bg-[#FF8080]/12 text-[#FF8080] border border-[#FF8080]/30'
                                : 'bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30'
                            }`}
                          >
                            {entry.statusCode || 200} • {entry.status}
                          </span>
                          <div className="flex items-center space-x-1 text-[10px] font-mono text-[#6E6E6E]">
                            <Globe className="w-3 h-3" />
                            <span>{entry.ipAddress || '127.0.0.1'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Inspect Changes Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedEntry(entry)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-[#F5F5F5] transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#FFC799]" />
                          <span>Chi tiết Changes</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-4 bg-[#101010] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-[#6E6E6E] flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-[#FFC799]" />
            <span>
              Hiển thị <strong className="text-[#F5F5F5]">{logs.length}</strong> trên tổng số{' '}
              <strong className="text-[#F5F5F5]">{total}</strong> bản ghi khớp bộ lọc
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-[#161616] hover:bg-white/[0.08] disabled:opacity-40 border border-white/10 text-[#F5F5F5] flex items-center space-x-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Trước</span>
            </button>

            <span className="px-3 py-1.5 rounded-lg bg-[#161616] border border-white/10 font-mono font-bold text-[#FFC799]">
              Trang {page} / {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg bg-[#161616] hover:bg-white/[0.08] disabled:opacity-40 border border-white/10 text-[#F5F5F5] flex items-center space-x-1 cursor-pointer"
            >
              <span>Sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Audit Payload / Changes Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-white/15 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="p-5 bg-[#101010] border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FFC799] block">
                  CHI TIẾT BẢN GHI AUDIT LOG
                </span>
                <h3 className="text-base font-black text-[#F5F5F5] font-mono mt-0.5">
                  {selectedEntry.action} • {selectedEntry.entity}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#C8C2B8] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#101010] border border-white/10">
                  <span className="text-[10px] text-[#6E6E6E] block">Mã bản ghi (Log ID)</span>
                  <span className="font-mono font-bold text-[#F5F5F5] break-all">
                    {selectedEntry._id}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#101010] border border-white/10">
                  <span className="text-[10px] text-[#6E6E6E] block">Entity & ID đối tượng</span>
                  <span className="font-mono font-bold text-[#FFC799] break-all">
                    {selectedEntry.entity} ({selectedEntry.entityId || 'N/A'})
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#101010] border border-white/10">
                  <span className="text-[10px] text-[#6E6E6E] block">HTTP Status & IP</span>
                  <span className="font-mono font-bold text-[#FFC799]">
                    {selectedEntry.statusCode} {selectedEntry.status} • {selectedEntry.ipAddress || '127.0.0.1'}
                  </span>
                </div>
              </div>

              {selectedEntry.userAgent && (
                <div className="p-3 rounded-xl bg-[#101010] border border-white/10">
                  <span className="text-[10px] text-[#6E6E6E] block mb-1">Thiết bị / User-Agent:</span>
                  <p className="font-mono text-[11px] text-[#C8C2B8] break-all">
                    {selectedEntry.userAgent}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FFC799] block">
                  Dữ liệu Thay đổi (`changes` / `details` đã che thông tin nhạy cảm):
                </span>
                <pre className="p-4 rounded-xl bg-[#101010] border border-white/10 font-mono text-[11px] text-[#FFC799] overflow-x-auto leading-relaxed">
                  {JSON.stringify(
                    selectedEntry.changes || selectedEntry.details || {},
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-[#101010] border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="px-5 py-2 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] font-black text-xs cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer;
