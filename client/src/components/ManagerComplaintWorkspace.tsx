import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Lock,
  ShieldAlert,
  Send,
  FileText,
  X,
  Search,
  RefreshCw,
  User,
  Calendar,
  MapPin,
  AlertTriangle,
  ChevronRight,
  MessageSquare,
  Check,
  ShieldCheck,
  Eye,
  ExternalLink,
  Car
} from 'lucide-react';
import type { StaffComplaint, ComplaintStatus } from '../types';
import {
  getPendingComplaints,
  getStaffComplaintById,
  updateComplaintStatus,
  resolveComplaint,
  closeComplaint,
  addStaffComplaintResponse
} from '../services/complaintService';

interface ManagerComplaintWorkspaceProps {
  onPendingCountChange?: (count: number) => void;
}

export const ManagerComplaintWorkspace: React.FC<ManagerComplaintWorkspaceProps> = ({
  onPendingCountChange
}) => {
  // Pending queue states
  const [complaints, setComplaints] = useState<StaffComplaint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<StaffComplaint | null>(null);

  // Loading states
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [submittingResolve, setSubmittingResolve] = useState<boolean>(false);
  const [submittingClose, setSubmittingClose] = useState<boolean>(false);
  const [submittingResponse, setSubmittingResponse] = useState<boolean>(false);

  // Form states
  const [resolutionInput, setResolutionInput] = useState<string>('');
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Open' | 'InProgress' | 'Resolved'>('ALL');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Notifications
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Fetch pending complaints queue (InProgress & Resolved)
  const fetchPendingQueue = useCallback(async (targetPage = 1, selectFirst = false) => {
    setLoadingList(true);
    try {
      const res = await getPendingComplaints({ page: targetPage, limit: 15, includeOpen: true });
      if (res && res.success) {
        setComplaints(res.data);
        setPage(res.pagination.page);
        setTotalPages(res.pagination.totalPages);
        setTotalCount(res.pagination.total);
        if (onPendingCountChange) {
          onPendingCountChange(res.pagination.total);
        }

        if (selectFirst && res.data.length > 0) {
          setSelectedId(res.data[0]._id);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách khiếu nại cần kết luận.';
      showNotification('error', message);
    } finally {
      setLoadingList(false);
    }
  }, [onPendingCountChange]);

  useEffect(() => {
    fetchPendingQueue(1, true);
  }, [fetchPendingQueue]);

  // Fetch detail whenever selectedId changes
  const fetchDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await getStaffComplaintById(id);
      if (res && res.success && res.data) {
        setSelectedComplaint(res.data);
        setResolutionInput(res.data.finalResolution || '');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải chi tiết khiếu nại.';
      showNotification('error', message);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchDetail(selectedId);
    } else {
      setSelectedComplaint(null);
      setResolutionInput('');
    }
  }, [selectedId, fetchDetail]);

  // Filter complaints in memory by search query and status filter
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesStatus;

      const customerName = `${c.customerId?.firstName || ''} ${c.customerId?.lastName || ''} ${c.customerId?.username || ''}`.toLowerCase();
      const code = (c.code || '').toLowerCase();
      const category = (c.category || '').toLowerCase();
      const title = (c.title || '').toLowerCase();

      return (
        matchesStatus &&
        (code.includes(q) || customerName.includes(q) || category.includes(q) || title.includes(q))
      );
    });
  }, [complaints, statusFilter, searchQuery]);

  // Handle saving final resolution
  const handleSaveResolution = async () => {
    if (!selectedComplaint) return;
    const trimmed = resolutionInput.trim();
    if (trimmed.length < 10) {
      showNotification('error', 'Nội dung kết luận phải có ít nhất 10 ký tự.');
      return;
    }
    if (trimmed.length > 3000) {
      showNotification('error', 'Nội dung kết luận không được vượt quá 3.000 ký tự.');
      return;
    }

    setSubmittingResolve(true);
    try {
      if (selectedComplaint.status === 'Open') {
        await updateComplaintStatus(
          selectedComplaint._id,
          'InProgress',
          'Quản lý trực tiếp tiếp nhận và phê duyệt kết luận khiếu nại'
        );
      }
      const res = await resolveComplaint(selectedComplaint._id, trimmed);
      if (res && res.success) {
        showNotification(
          'success',
          res.message || 'Lưu kết luận giải quyết khiếu nại thành công! Trạng thái: Resolved.'
        );
        // Refresh detail & pending queue
        await fetchDetail(selectedComplaint._id);
        await fetchPendingQueue(page, false);
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Không thể lưu kết luận giải quyết.');
      showNotification('error', message);
    } finally {
      setSubmittingResolve(false);
    }
  };

  // Handle closing complaint
  const handleConfirmClose = async () => {
    if (!selectedComplaint) return;
    setSubmittingClose(true);
    try {
      const res = await closeComplaint(selectedComplaint._id);
      if (res && res.success) {
        showNotification(
          'success',
          'Đã đóng khiếu nại vĩnh viễn! Toàn bộ hồ sơ đã chuyển sang chế độ lưu trữ chỉ đọc.'
        );
        setShowCloseConfirmModal(false);
        // Refresh detail & pending queue
        await fetchDetail(selectedComplaint._id);
        await fetchPendingQueue(page, false);
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Không thể đóng khiếu nại.');
      showNotification('error', message);
    } finally {
      setSubmittingClose(false);
    }
  };

  // Handle sending response message into timeline
  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    const trimmed = replyMessage.trim();
    if (!trimmed) return;

    setSubmittingResponse(true);
    try {
      const res = await addStaffComplaintResponse(selectedComplaint._id, trimmed);
      if (res && res.success) {
        setReplyMessage('');
        showNotification('success', 'Đã thêm phản hồi trao đổi vào timeline.');
        await fetchDetail(selectedComplaint._id);
        await fetchPendingQueue(page, false);
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Không thể gửi phản hồi.');
      showNotification('error', message);
    } finally {
      setSubmittingResponse(false);
    }
  };

  const isClosed = selectedComplaint?.status === 'Closed';
  const isResolved = selectedComplaint?.status === 'Resolved';
  const hasFinalResolution = Boolean(
    (selectedComplaint?.finalResolution && selectedComplaint.finalResolution.trim().length >= 10) ||
      resolutionInput.trim().length >= 10
  );
  const canClose = !isClosed && isResolved && hasFinalResolution;
  const resolutionCharCount = resolutionInput.trim().length;

  const renderStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'Open':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFD166]/15 text-[#FFD166] border border-[#FFD166]/30">
            <Clock className="w-3 h-3" />
            <span>Mới tiếp nhận (Open)</span>
          </span>
        );
      case 'InProgress':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30">
            <Clock className="w-3 h-3" />
            <span>Đang xử lý (InProgress)</span>
          </span>
        );
      case 'Resolved':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#99FFE4]/15 text-[#99FFE4] border border-[#99FFE4]/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Đã xử lý (Resolved)</span>
          </span>
        );
      case 'Closed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-[#A0A0A0] border border-white/20">
            <Lock className="w-3 h-3" />
            <span>Đã đóng (Closed)</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Top Banner / Notice */}
      {notice && (
        <div
          className={`px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-medium border ${
            notice.type === 'success'
              ? 'bg-[#99FFE4]/10 border-[#99FFE4]/30 text-[#99FFE4]'
              : 'bg-[#FF8080]/10 border-[#FF8080]/30 text-[#FF8080]'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-white/60 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Container: Split Grid (Left List, Right Detail) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[700px]">
        {/* Left Column: Pending List (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col space-y-3 bg-[#161616] border border-white/10 rounded-2xl p-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-[#FFC799]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">
                  Cần kết luận
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#FFC799]/20 text-[#FFC799] font-mono text-[11px] font-bold">
                  {totalCount}
                </span>
              </div>
              <p className="text-[11px] text-[#A0A0A0] mt-0.5">
                Các khiếu nại mới tiếp nhận, đang xử lý hoặc chờ đóng hồ sơ
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchPendingQueue(page, false)}
              disabled={loadingList}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-[#A0A0A0] hover:text-white hover:border-[#FFC799]/40 transition-colors"
              title="Làm mới hàng đợi"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#A0A0A0] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã khiếu nại, khách hàng..."
                className="w-full bg-[#101010] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-[#6E6E6E] focus:outline-none focus:border-[#FFC799]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E6E6E] hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-[#FFC799] text-[#101010]'
                    : 'bg-white/5 text-[#A0A0A0] hover:text-white border border-white/10'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Open')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'Open'
                    ? 'bg-[#FFD166] text-[#101010]'
                    : 'bg-white/5 text-[#A0A0A0] hover:text-white border border-white/10'
                }`}
              >
                Mới tiếp nhận
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('InProgress')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'InProgress'
                    ? 'bg-[#FFC799] text-[#101010]'
                    : 'bg-white/5 text-[#A0A0A0] hover:text-white border border-white/10'
                }`}
              >
                Đang xử lý
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Resolved')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'Resolved'
                    ? 'bg-[#99FFE4] text-[#101010]'
                    : 'bg-white/5 text-[#A0A0A0] hover:text-white border border-white/10'
                }`}
              >
                Đã xử lý
              </button>
            </div>
          </div>

          {/* Complaints List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[550px]">
            {loadingList ? (
              <div className="p-8 text-center text-xs text-[#A0A0A0] space-y-2">
                <RefreshCw className="w-5 h-5 mx-auto animate-spin text-[#FFC799]" />
                <p>Đang tải danh sách khiếu nại...</p>
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#6E6E6E] space-y-2">
                <CheckCircle2 className="w-6 h-6 mx-auto text-[#99FFE4]/40" />
                <p>Hiện không có khiếu nại nào cần Manager xử lý.</p>
              </div>
            ) : (
              filteredComplaints.map((item) => {
                const isSelected = item._id === selectedId;
                const customerFullName =
                  item.customerId?.firstName || item.customerId?.lastName
                    ? `${item.customerId?.firstName || ''} ${item.customerId?.lastName || ''}`.trim()
                    : item.customerId?.username || 'Khách hàng';

                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => setSelectedId(item._id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FFC799]/10 border-[#FFC799] shadow-md shadow-[#FFC799]/5'
                        : 'bg-[#101010] border-white/10 hover:border-white/25 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#FFC799]">
                        {item.code}
                      </span>
                      {renderStatusBadge(item.status)}
                    </div>

                    <p className="text-xs font-semibold text-white mt-1.5 truncate">
                      {item.title || item.category}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-[#A0A0A0] mt-2">
                      <div className="flex items-center space-x-1.5 truncate max-w-[170px]">
                        <User className="w-3 h-3 shrink-0 text-[#A0A0A0]" />
                        <span className="truncate">{customerFullName}</span>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0 text-[#6E6E6E]">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(item.createdAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-[#A0A0A0]">
              <span>
                Trang {page} / {totalPages}
              </span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  disabled={page <= 1 || loadingList}
                  onClick={() => fetchPendingQueue(page - 1, false)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10"
                >
                  Trước
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loadingList}
                  onClick={() => fetchPendingQueue(page + 1, false)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Detail, Timeline & Resolution Actions (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-4 bg-[#161616] border border-white/10 rounded-2xl p-5">
          {loadingDetail ? (
            <div className="p-16 text-center text-xs text-[#A0A0A0] space-y-3 m-auto">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-[#FFC799]" />
              <p>Đang tải chi tiết hồ sơ khiếu nại...</p>
            </div>
          ) : !selectedComplaint ? (
            <div className="p-16 text-center text-xs text-[#6E6E6E] space-y-3 m-auto">
              <ShieldAlert className="w-8 h-8 mx-auto text-[#FFC799]/40" />
              <p className="text-sm font-semibold text-white">Chưa chọn khiếu nại</p>
              <p className="max-w-md mx-auto">
                Chọn một khiếu nại từ danh sách bên trái để kiểm tra toàn bộ diễn biến, nhập kết luận giải quyết và thực hiện đóng hồ sơ.
              </p>
            </div>
          ) : (
            <>
              {/* Detail Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-base font-black text-[#FFC799]">
                      {selectedComplaint.code}
                    </span>
                    {renderStatusBadge(selectedComplaint.status)}
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white/5 text-[#A0A0A0] border border-white/10">
                      {selectedComplaint.category}
                    </span>
                  </div>
                  <h1 className="text-base font-bold text-white mt-1">
                    {selectedComplaint.title || selectedComplaint.category}
                  </h1>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <div className="text-right">
                    <p className="text-[#A0A0A0] text-[11px]">Khách hàng</p>
                    <p className="font-semibold text-white">
                      {selectedComplaint.customerId?.firstName || selectedComplaint.customerId?.lastName
                        ? `${selectedComplaint.customerId?.firstName || ''} ${selectedComplaint.customerId?.lastName || ''}`.trim()
                        : selectedComplaint.customerId?.username}
                    </p>
                    {selectedComplaint.customerId?.phoneNumber && (
                      <p className="text-[10px] text-[#A0A0A0] font-mono">
                        {selectedComplaint.customerId?.phoneNumber}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Alert if Closed */}
              {isClosed && (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/15 flex items-start space-x-3 text-xs">
                  <Lock className="w-4 h-4 text-[#A0A0A0] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">Hồ sơ đã được đóng vĩnh viễn (Closed)</p>
                    <p className="text-[#A0A0A0] text-[11px] mt-0.5">
                      Thời điểm đóng:{' '}
                      {selectedComplaint.closedAt
                        ? new Date(selectedComplaint.closedAt).toLocaleString('vi-VN')
                        : 'N/A'}
                      . Mọi thông tin, phản hồi và kết luận giải quyết hiện ở trạng thái lưu trữ chỉ đọc.
                    </p>
                  </div>
                </div>
              )}

              {/* Booking & Branch metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {selectedComplaint.bookingId && (
                  <div className="p-3 rounded-xl bg-[#101010] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <Car className="w-4 h-4 text-[#FFC799]" />
                      <div>
                        <p className="text-[11px] text-[#A0A0A0]">Đơn thuê liên quan</p>
                        <p className="font-mono font-bold text-white">
                          {selectedComplaint.bookingId.bookingCode || selectedComplaint.bookingId._id}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedComplaint.branchId && (
                  <div className="p-3 rounded-xl bg-[#101010] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <MapPin className="w-4 h-4 text-[#99FFE4]" />
                      <div>
                        <p className="text-[11px] text-[#A0A0A0]">Chi nhánh thụ lý</p>
                        <p className="font-semibold text-white">
                          {selectedComplaint.branchId.name || selectedComplaint.branchId.code}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Initial Report */}
              <div className="p-4 rounded-xl bg-[#101010] border border-white/10 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-[#FFC799]">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Nội dung phản ánh từ khách hàng</span>
                </div>
                <p className="text-xs text-[#E0E0E0] whitespace-pre-wrap leading-relaxed">
                  {selectedComplaint.description}
                </p>

                {/* Attachments preview */}
                {selectedComplaint.attachments && selectedComplaint.attachments.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-[11px] text-[#A0A0A0] mb-2 font-semibold">
                      Tệp đính kèm ({selectedComplaint.attachments.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedComplaint.attachments.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPreviewImage(url)}
                          className="group relative w-16 h-16 rounded-lg overflow-hidden border border-white/15 bg-black/40 hover:border-[#FFC799] transition-all"
                        >
                          <img
                            src={url}
                            alt={`Đính kèm ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Complaint Timeline */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-[#FFC799]" />
                    <span>Lịch sử xử lý &amp; Phản hồi (Timeline)</span>
                  </div>
                  <span className="text-[11px] text-[#A0A0A0]">
                    {selectedComplaint.timeline?.length || 0} sự kiện
                  </span>
                </div>

                <div className="max-h-[220px] overflow-y-auto space-y-2.5 pr-1 border border-white/10 rounded-xl p-3 bg-[#101010]">
                  {!selectedComplaint.timeline || selectedComplaint.timeline.length === 0 ? (
                    <p className="text-xs text-[#6E6E6E] text-center py-4">Chưa có sự kiện nào.</p>
                  ) : (
                    selectedComplaint.timeline.map((evt, idx) => {
                      const isStatusChange = evt.type === 'status';
                      const actor = evt.performedBy || evt.user;

                      return (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg text-xs border ${
                            isStatusChange
                              ? 'bg-white/[0.03] border-white/10'
                              : 'bg-[#FFC799]/[0.05] border-[#FFC799]/20'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] text-[#A0A0A0] mb-1">
                            <div className="flex items-center space-x-1.5 font-semibold text-white">
                              {isStatusChange ? (
                                <RefreshCw className="w-3 h-3 text-[#FFC799]" />
                              ) : (
                                <MessageSquare className="w-3 h-3 text-[#99FFE4]" />
                              )}
                              <span>{actor?.name || 'Hệ thống'}</span>
                              <span className="text-[10px] text-[#A0A0A0] font-normal">
                                ({actor?.role || 'Staff'})
                              </span>
                            </div>
                            <span>
                              {new Date(evt.createdAt).toLocaleString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-[#E0E0E0] whitespace-pre-wrap">{evt.content}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Add Note / Internal Response (Disabled if Closed) */}
              {!isClosed && (
                <form onSubmit={handleSendResponse} className="flex items-center space-x-2 pt-1">
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Gửi phản hồi trao đổi thêm vào timeline..."
                    className="flex-1 bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-[#6E6E6E] focus:outline-none focus:border-[#FFC799]"
                  />
                  <button
                    type="submit"
                    disabled={!replyMessage.trim() || submittingResponse}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs font-bold text-white transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi</span>
                  </button>
                </form>
              )}

              {/* Final Resolution Workspace Card (UC-85 Core) */}
              <div className="mt-4 pt-4 border-t border-white/15 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-[#99FFE4]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      Kết luận giải quyết cuối cùng (Final Resolution)
                    </h3>
                  </div>
                  <div className="text-[11px] font-mono">
                    <span
                      className={
                        resolutionCharCount < 10 || resolutionCharCount > 3000
                          ? 'text-[#FF8080]'
                          : 'text-[#99FFE4]'
                      }
                    >
                      {resolutionCharCount}
                    </span>
                    <span className="text-[#6E6E6E]"> / 3.000 ký tự (Tối thiểu 10 ký tự)</span>
                  </div>
                </div>

                <p className="text-[11px] text-[#A0A0A0]">
                  Manager đưa ra phương án đền bù, xin lỗi hoặc giải quyết dứt điểm. Kết luận này sẽ hiển thị công khai cho Khách hàng khi khiếu nại ở trạng thái Resolved hoặc Closed.
                </p>

                {isClosed ? (
                  <div className="p-4 rounded-xl bg-[#101010] border border-white/15 space-y-2">
                    <p className="text-xs text-[#F5F5F5] whitespace-pre-wrap leading-relaxed">
                      {selectedComplaint.finalResolution || 'Không có nội dung kết luận.'}
                    </p>
                    {selectedComplaint.resolvedBy && (
                      <p className="text-[11px] text-[#A0A0A0] pt-2 border-t border-white/10">
                        Người phê chuẩn kết luận:{' '}
                        <span className="text-white font-semibold">
                          {typeof selectedComplaint.resolvedBy === 'object'
                            ? `${selectedComplaint.resolvedBy.firstName || ''} ${selectedComplaint.resolvedBy.lastName || ''}`.trim() || selectedComplaint.resolvedBy.username
                            : selectedComplaint.resolvedBy}
                        </span>
                      </p>
                    )}
                  </div>
                ) : (
                  <textarea
                    rows={4}
                    value={resolutionInput}
                    onChange={(e) => setResolutionInput(e.target.value)}
                    placeholder="Nhập chi tiết kết luận giải quyết của Manager (từ 10 đến 3.000 ký tự)..."
                    className="w-full bg-[#101010] border border-white/15 rounded-xl p-3 text-xs text-white placeholder-[#6E6E6E] focus:outline-none focus:border-[#99FFE4] leading-relaxed resize-y"
                  />
                )}

                {/* Action Buttons: Separate "Lưu kết luận" and "Đóng complaint" */}
                {!isClosed && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-[11px] text-[#A0A0A0]">
                      {selectedComplaint.status === 'Open' ? (
                        <span>
                          Lưu kết luận sẽ tự động tiếp nhận (<b>Open</b> &rarr; <b>InProgress</b>) và chuyển sang <b>Resolved</b>.
                        </span>
                      ) : selectedComplaint.status === 'InProgress' ? (
                        <span>
                          Lưu kết luận sẽ chuyển trạng thái từ <b>InProgress</b> sang <b>Resolved</b>.
                        </span>
                      ) : (
                        <span>
                          Khiếu nại đang ở trạng thái <b>Resolved</b>. Bạn có thể cập nhật kết luận hoặc đóng vĩnh viễn.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Button 1: Save Resolution */}
                      <button
                        type="button"
                        onClick={handleSaveResolution}
                        disabled={
                          submittingResolve ||
                          resolutionCharCount < 10 ||
                          resolutionCharCount > 3000
                        }
                        className="px-4 py-2.5 rounded-xl bg-[#FFC799] text-[#101010] font-bold text-xs hover:bg-[#ffa760] disabled:opacity-40 transition-colors flex items-center space-x-1.5 cursor-pointer shadow-md"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {submittingResolve ? 'Đang lưu...' : 'Lưu kết luận'}
                        </span>
                      </button>

                      {/* Button 2: Close Complaint (Requires Confirmation Modal) */}
                      <button
                        type="button"
                        onClick={() => setShowCloseConfirmModal(true)}
                        disabled={!canClose || submittingClose}
                        title={
                          !isResolved
                            ? 'Cần lưu kết luận để đưa khiếu nại về trạng thái Resolved trước khi đóng'
                            : !hasFinalResolution
                            ? 'Cần có kết luận giải quyết trước khi đóng'
                            : 'Đóng khiếu nại vĩnh viễn'
                        }
                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-[#FF8080]/20 hover:text-[#FF8080] hover:border-[#FF8080]/40 border border-white/15 text-xs font-bold text-white disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Đóng complaint</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Closing Complaint */}
      {showCloseConfirmModal && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#161616] border border-white/20 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-xl bg-[#FF8080]/15 text-[#FF8080] border border-[#FF8080]/30 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-white uppercase tracking-wide">
                  Xác nhận đóng khiếu nại
                </h3>
                <p className="font-mono text-xs text-[#FFC799]">
                  {selectedComplaint.code}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FF8080]/10 border border-[#FF8080]/20 text-xs text-[#FF8080] space-y-1">
              <p className="font-bold">Hành động này KHÔNG THỂ HOÀN TÁC!</p>
              <p className="text-[11px] text-[#E0E0E0] leading-relaxed">
                Sau khi đóng, khiếu nại sẽ chuyển sang trạng thái <b>Closed</b> vĩnh viễn. Kết luận giải quyết sẽ bị khóa chặt, không thể chỉnh sửa và không thể tiếp tục gửi phản hồi trao đổi.
              </p>
            </div>

            <div className="space-y-1 text-xs">
              <p className="text-[#A0A0A0] text-[11px]">Kết luận sẽ được lưu trữ:</p>
              <p className="p-2.5 rounded-lg bg-[#101010] border border-white/10 text-white italic max-h-24 overflow-y-auto">
                &ldquo;{resolutionInput.trim() || selectedComplaint.finalResolution}&rdquo;
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseConfirmModal(false)}
                disabled={submittingClose}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                disabled={submittingClose}
                className="px-4 py-2 rounded-xl bg-[#FF8080] hover:bg-[#ff6666] text-[#101010] text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-[#FF8080]/20"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{submittingClose ? 'Đang đóng...' : 'Xác nhận đóng vĩnh viễn'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Ảnh đính kèm"
              className="max-w-full max-h-[85vh] object-contain rounded-xl border border-white/20 shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-[#161616] border border-white/20 text-white hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
