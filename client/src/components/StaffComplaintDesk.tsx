import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  User as UserIcon,
  Phone,
  Mail,
  Calendar,
  Send,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Shield,
  ArrowRight,
  Lock,
  FileText,
  Bike,
  Sparkles,
  X,
  ExternalLink,
  Info,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import type {
  ComplaintStatus,
  StaffComplaint,
  ComplaintTimelineItem,
} from '../types';
import * as complaintService from '../services/complaintService';
import { getUserAvatarUrl } from '../utils/imageHelper';

export const StaffComplaintDesk: React.FC = () => {
  const { user } = useAuth();

  // State: Queue
  const [complaints, setComplaints] = useState<StaffComplaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);

  // State: Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // State: Detail
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<StaffComplaint | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // State: Response input
  const [responseText, setResponseText] = useState<string>('');
  const [sendingResponse, setSendingResponse] = useState<boolean>(false);

  // State: Status Transition Modal / Note
  const [transitionTarget, setTransitionTarget] = useState<ComplaintStatus | null>(null);
  const [transitionNote, setTransitionNote] = useState<string>('');
  const [transitioning, setTransitioning] = useState<boolean>(false);

  // Toast / Alert banner
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  const showToast = useCallback(
    (type: 'success' | 'error' | 'warning', text: string) => {
      setToastMessage({ type, text });
      setTimeout(() => {
        setToastMessage((prev) => (prev?.text === text ? null : prev));
      }, 5000);
    },
    []
  );

  // 1. Fetch complaints queue
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await complaintService.getStaffComplaints({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        q: searchQuery.trim() || undefined,
        page,
        limit,
      });

      if (res.success) {
        setComplaints(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);

        // Auto select first complaint if none selected or not in current list
        if (res.data && res.data.length > 0) {
          if (!selectedComplaintId || !res.data.some((c) => c._id === selectedComplaintId)) {
            setSelectedComplaintId(res.data[0]._id);
          }
        } else {
          setSelectedComplaint(null);
          setSelectedComplaintId(null);
        }
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        showToast('error', err.response?.data?.message || 'Không thể tải danh sách khiếu nại.');
      } else {
        showToast('error', 'Đã xảy ra lỗi khi tải hàng đợi khiếu nại.');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, searchQuery, page, limit, selectedComplaintId, showToast]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // 2. Fetch complaint detail
  const fetchDetail = useCallback(
    async (id: string, isAutoReload = false) => {
      setDetailLoading(true);
      try {
        const res = await complaintService.getStaffComplaintById(id);
        if (res.success && res.data) {
          setSelectedComplaint(res.data);
          if (isAutoReload) {
            showToast('warning', 'Dữ liệu khiếu nại đã được tự động làm mới từ máy chủ.');
          }
        }
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          showToast('error', err.response?.data?.message || 'Không thể tải chi tiết khiếu nại.');
        }
      } finally {
        setDetailLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (selectedComplaintId) {
      fetchDetail(selectedComplaintId);
    }
  }, [selectedComplaintId, fetchDetail]);

  // 3. Send response message
  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !responseText.trim()) return;

    const trimmed = responseText.trim();
    if (trimmed.length > 2000) {
      showToast('error', 'Nội dung phản hồi không được vượt quá 2000 ký tự.');
      return;
    }

    setSendingResponse(true);
    try {
      const res = await complaintService.addStaffComplaintResponse(
        selectedComplaint._id,
        trimmed
      );
      if (res.success) {
        setResponseText('');
        showToast('success', 'Đã gửi phản hồi thành công.');
        // Refresh detail and queue
        await fetchDetail(selectedComplaint._id);
        fetchQueue();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const msg = err.response?.data?.message || 'Không thể gửi phản hồi.';

        if (status === 409) {
          showToast('warning', `${msg} Đang tự động làm mới chi tiết...`);
          await fetchDetail(selectedComplaint._id, true);
          fetchQueue();
        } else {
          showToast('error', msg);
        }
      } else {
        showToast('error', 'Lỗi không xác định khi gửi phản hồi.');
      }
    } finally {
      setSendingResponse(false);
    }
  };

  // 4. Update status transition
  const handleConfirmTransition = async () => {
    if (!selectedComplaint || !transitionTarget) return;

    setTransitioning(true);
    try {
      const res = await complaintService.updateComplaintStatus(
        selectedComplaint._id,
        transitionTarget,
        transitionNote.trim() || undefined
      );

      if (res.success) {
        showToast(
          'success',
          `Đã chuyển trạng thái khiếu nại sang ${transitionTarget} thành công.`
        );
        setTransitionTarget(null);
        setTransitionNote('');
        await fetchDetail(selectedComplaint._id);
        fetchQueue();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const msg = err.response?.data?.message || 'Không thể cập nhật trạng thái khiếu nại.';

        // UC-65 Rule: Xử lý lỗi 409 bằng toast + tự reload chi tiết
        if (status === 409) {
          showToast('warning', `Xung đột trạng thái: ${msg} Đang tự động làm mới dữ liệu...`);
          setTransitionTarget(null);
          setTransitionNote('');
          await fetchDetail(selectedComplaint._id, true);
          fetchQueue();
        } else {
          showToast('error', msg);
        }
      } else {
        showToast('error', 'Lỗi không xác định khi cập nhật trạng thái khiếu nại.');
      }
    } finally {
      setTransitioning(false);
    }
  };

  // Helpers: Render badges with pure SVG only (no emoji)
  const renderStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'Open':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Mới tiếp nhận (Open)
          </span>
        );
      case 'InProgress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Đang xử lý (InProgress)
          </span>
        );
      case 'Resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã giải quyết (Resolved)
          </span>
        );
      case 'Closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            <Lock className="w-3.5 h-3.5" />
            Đã đóng (Closed)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            {status}
          </span>
        );
    }
  };

  const renderCategoryName = (cat: string) => {
    switch (cat) {
      case 'Vehicle':
        return 'Phương tiện';
      case 'Service':
        return 'Dịch vụ';
      case 'Payment':
        return 'Thanh toán';
      case 'Staff':
        return 'Nhân viên';
      case 'Other':
      default:
        return 'Khác';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-950 text-slate-100 overflow-hidden">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between px-4 py-2.5 text-sm font-medium border-b animate-in fade-in duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
              : toastMessage.type === 'warning'
              ? 'bg-amber-950/80 border-amber-500/30 text-amber-300'
              : 'bg-rose-950/80 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toastMessage.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Bàn Xử Lý Khiếu Nại
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                UC-65
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Quản lý hàng đợi khiếu nại, phản hồi khách hàng và cập nhật tiến độ giải quyết
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchQueue();
              if (selectedComplaintId) fetchDetail(selectedComplaintId);
            }}
            disabled={loading || detailLoading}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới hàng đợi</span>
          </button>
        </div>
      </div>

      {/* Split Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Complaints Queue & Filters */}
        <div className="w-1/2 xl:w-5/12 border-r border-slate-800 flex flex-col bg-slate-900/60 overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-800/80 space-y-3 bg-slate-900/90">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo mã khiếu nại (CMP-...)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors font-mono"
                />
              </div>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg bg-slate-800 hover:bg-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Lọc:</span>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="flex-1 px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500/50"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Open">Mới tiếp nhận (Open)</option>
                <option value="InProgress">Đang xử lý (InProgress)</option>
                <option value="Resolved">Đã giải quyết (Resolved)</option>
                <option value="Closed">Đã đóng (Closed)</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="flex-1 px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500/50"
              >
                <option value="">Tất cả danh mục</option>
                <option value="Vehicle">Phương tiện</option>
                <option value="Service">Dịch vụ</option>
                <option value="Payment">Thanh toán</option>
                <option value="Staff">Nhân viên</option>
                <option value="Other">Khác</option>
              </select>
            </div>
          </div>

          {/* Complaints Table List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-500 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500/80" />
                <span>Đang tải hàng đợi khiếu nại...</span>
              </div>
            ) : complaints.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-xs gap-2">
                <MessageSquare className="w-8 h-8 text-slate-600 stroke-[1.5]" />
                <p className="font-medium text-slate-400">Không tìm thấy khiếu nại nào</p>
                <p className="text-[11px] text-slate-500">
                  Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                </p>
              </div>
            ) : (
              complaints.map((c) => {
                const isSelected = selectedComplaintId === c._id;
                const customerName = c.customerId
                  ? `${c.customerId.firstName || ''} ${c.customerId.lastName || ''}`.trim() ||
                    c.customerId.username ||
                    'Khách hàng'
                  : 'Khách hàng';

                return (
                  <div
                    key={c._id}
                    onClick={() => setSelectedComplaintId(c._id)}
                    className={`p-3.5 cursor-pointer transition-all border-l-4 ${
                      isSelected
                        ? 'bg-slate-800/80 border-amber-500 shadow-sm'
                        : 'border-transparent hover:bg-slate-800/40 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          {c.code}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                          {renderCategoryName(c.category)}
                        </span>
                      </div>
                      {renderStatusBadge(c.status)}
                    </div>

                    <h4 className="text-xs font-semibold text-slate-200 line-clamp-1 mb-1">
                      {c.title || c.description}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="w-3 h-3 text-slate-500" />
                        <span className="line-clamp-1">{customerName}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Queue Pagination Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <span>
              Tổng số: <strong className="text-slate-200 font-mono">{total}</strong> khiếu nại
            </span>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px]">
                Trang {page} / {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                  title="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Complaint Detail, Timeline & Actions */}
        <div className="w-1/2 xl:w-7/12 flex flex-col bg-slate-950 overflow-hidden">
          {detailLoading && !selectedComplaint ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm">
              <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
              <span>Đang tải thông tin chi tiết khiếu nại...</span>
            </div>
          ) : !selectedComplaint ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm p-6 text-center gap-2">
              <FileText className="w-10 h-10 text-slate-700 stroke-[1.5]" />
              <p className="font-semibold text-slate-300">Chưa chọn khiếu nại nào</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Vui lòng chọn một khiếu nại từ danh sách bên trái để xem đầy đủ thông tin khách hàng,
                đơn đặt, dòng thời gian và thực hiện phản hồi.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Complaint Detail Header */}
              <div className="p-4 bg-slate-900 border-b border-slate-800 shrink-0 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-base font-bold text-amber-400">
                        {selectedComplaint.code}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {renderCategoryName(selectedComplaint.category)}
                      </span>
                      {selectedComplaint.priority && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          Ưu tiên: {selectedComplaint.priority}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-white">
                      {selectedComplaint.title || 'Khiếu nại khách hàng'}
                    </h2>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {renderStatusBadge(selectedComplaint.status)}
                    <span className="text-[11px] text-slate-500 font-mono">
                      Tạo lúc:{' '}
                      {new Date(selectedComplaint.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>

                {/* Status Transition Action Buttons Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Phụ trách:</span>
                    {selectedComplaint.handledBy ? (
                      <span className="font-medium text-slate-200 flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                        {selectedComplaint.handledBy.firstName
                          ? `${selectedComplaint.handledBy.firstName} ${selectedComplaint.handledBy.lastName || ''}`.trim()
                          : selectedComplaint.handledBy.username}
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded font-mono">
                          {selectedComplaint.handledBy.roles}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Chưa tiếp nhận</span>
                    )}
                  </div>

                  {/* Transition Buttons (Strictly filtered by allowedTransitions from BE) */}
                  <div className="flex items-center gap-2">
                    {selectedComplaint.allowedTransitions &&
                    selectedComplaint.allowedTransitions.length > 0 ? (
                      selectedComplaint.allowedTransitions.map((target) => {
                        let btnStyle = 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700';
                        let label = `Chuyển ${target}`;

                        if (target === 'InProgress') {
                          btnStyle =
                            'bg-sky-600 hover:bg-sky-500 text-white shadow-sm shadow-sky-900/50';
                          label = 'Tiếp nhận xử lý (InProgress)';
                        } else if (target === 'Resolved') {
                          btnStyle =
                            'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-900/50';
                          label = 'Đã giải quyết (Resolved)';
                        } else if (target === 'Closed') {
                          btnStyle =
                            'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600';
                          label = 'Đóng khiếu nại (Closed)';
                        }

                        return (
                          <button
                            key={target}
                            onClick={() => {
                              setTransitionTarget(target);
                              setTransitionNote('');
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${btnStyle}`}
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>{label}</span>
                          </button>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        Không có bước chuyển trạng thái khả dụng cho vai trò của bạn
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Information Cards (Customer & Booking) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Customer Card */}
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-2.5 pb-1.5 border-b border-slate-800">
                      <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Thông tin Khách Hàng</span>
                    </div>

                    <div className="flex items-start gap-3">
                      <img
                        src={getUserAvatarUrl(selectedComplaint.customerId?.avatarUrl)}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full bg-slate-800 object-cover border border-slate-700 shrink-0"
                      />
                      <div className="space-y-1 text-xs">
                        <p className="font-bold text-slate-200">
                          {selectedComplaint.customerId?.firstName
                            ? `${selectedComplaint.customerId.firstName} ${selectedComplaint.customerId.lastName || ''}`.trim()
                            : selectedComplaint.customerId?.username || 'Khách hàng'}
                        </p>
                        <p className="text-slate-400 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{selectedComplaint.customerId?.phoneNumber || 'Chưa cập nhật SĐT'}</span>
                        </p>
                        <p className="text-slate-400 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{selectedComplaint.customerId?.email || 'Chưa có email'}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Booking Card */}
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-2.5 pb-1.5 border-b border-slate-800">
                      <Bike className="w-3.5 h-3.5 text-sky-400" />
                      <span>Thông tin Đơn Thuê Xe</span>
                    </div>

                    {selectedComplaint.bookingId ? (
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sky-400">
                            {selectedComplaint.bookingId.bookingCode}
                          </span>
                          {selectedComplaint.bookingId.status && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {selectedComplaint.bookingId.status}
                            </span>
                          )}
                        </div>

                        {typeof selectedComplaint.bookingId.vehicleId === 'object' &&
                          selectedComplaint.bookingId.vehicleId && (
                            <p className="text-slate-300 font-medium flex items-center gap-1.5">
                              <span>
                                {selectedComplaint.bookingId.vehicleId.brand}{' '}
                                {selectedComplaint.bookingId.vehicleId.vehicleModel}
                              </span>
                              <span className="font-mono text-amber-400">
                                ({selectedComplaint.bookingId.vehicleId.licensePlate})
                              </span>
                            </p>
                          )}

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>
                              {selectedComplaint.bookingId.pickupDateTime
                                ? new Date(selectedComplaint.bookingId.pickupDateTime).toLocaleDateString(
                                    'vi-VN'
                                  )
                                : '—'}
                            </span>
                          </span>
                          {selectedComplaint.bookingId.totalAmount && (
                            <span className="font-mono text-slate-200 font-semibold">
                              {selectedComplaint.bookingId.totalAmount.toLocaleString('vi-VN')} đ
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic py-2">
                        Khiếu nại chung (không gắn trực tiếp với mã đơn cụ thể)
                      </div>
                    )}
                  </div>
                </div>

                {/* Complaint Description Section */}
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Nội Dung Khiếu Nại Của Khách Hàng:</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-slate-950 p-3 rounded-lg border border-slate-800 font-sans">
                    {selectedComplaint.description}
                  </p>

                  {/* Attachments if any */}
                  {selectedComplaint.attachments && selectedComplaint.attachments.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                        Tệp đính kèm ({selectedComplaint.attachments.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {selectedComplaint.attachments.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 border border-slate-700 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Tệp #{i + 1}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Final Resolution (If Resolved or Closed) */}
                {selectedComplaint.finalResolution && (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Kết Luận Giải Quyết Cuối Cùng (Final Resolution):</span>
                    </div>
                    <p className="text-xs text-emerald-200 whitespace-pre-line bg-slate-950/80 p-3 rounded-lg border border-emerald-500/20">
                      {selectedComplaint.finalResolution}
                    </p>
                  </div>
                )}

                {/* Unified Chronological Timeline */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Dòng Thời Gian Xử Lý (Timeline)</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {selectedComplaint.timeline?.length || 0} sự kiện
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                    {selectedComplaint.timeline && selectedComplaint.timeline.length > 0 ? (
                      selectedComplaint.timeline.map((item: ComplaintTimelineItem, index: number) => {
                        const isResponse = item.type === 'response';
                        const actor = item.performedBy || item.user || { name: 'Hệ thống', role: 'Staff' };

                        return (
                          <div key={index} className="relative">
                            {/* Dot icon on timeline */}
                            <div
                              className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${
                                isResponse
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                  : 'bg-sky-500/20 border-sky-500 text-sky-400'
                              }`}
                            >
                              {isResponse ? (
                                <MessageSquare className="w-2.5 h-2.5" />
                              ) : (
                                <RefreshCw className="w-2.5 h-2.5" />
                              )}
                            </div>

                            <div
                              className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                                isResponse
                                  ? 'bg-amber-950/10 border-amber-500/20 text-slate-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-white">
                                    {actor.name}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                    {actor.role}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {new Date(item.createdAt).toLocaleString('vi-VN')}
                                </span>
                              </div>

                              <p className="text-xs leading-relaxed whitespace-pre-line text-slate-300">
                                {item.content}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2">
                        Chưa có lịch sử phản hồi hay thay đổi trạng thái
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Staff Response Input Form (At bottom of detail) */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
                {selectedComplaint.status === 'Closed' ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-500">
                    <Lock className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>
                      Khiếu nại này đã đóng (Closed). Không thể gửi thêm phản hồi hoặc thay đổi trạng thái.
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleSendResponse} className="space-y-2">
                    {selectedComplaint.status === 'Open' && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Gửi phản hồi sẽ tự động tiếp nhận khiếu nại (chuyển sang trạng thái Đang xử lý - InProgress).
                        </span>
                      </div>
                    )}

                    <div className="relative">
                      <textarea
                        rows={3}
                        placeholder="Nhập nội dung phản hồi chính thức cho khách hàng (1 - 2000 ký tự)..."
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        maxLength={2000}
                        className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none font-sans"
                      />
                      <span className="absolute right-2.5 bottom-2 text-[10px] text-slate-500 font-mono">
                        {responseText.length}/2000
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        Phản hồi bởi: <strong className="text-slate-300">{user?.username}</strong> ({user?.roles})
                      </span>

                      <button
                        type="submit"
                        disabled={sendingResponse || !responseText.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-amber-900/40"
                      >
                        <Send className={`w-3.5 h-3.5 ${sendingResponse ? 'animate-spin' : ''}`} />
                        <span>{sendingResponse ? 'Đang gửi...' : 'Gửi phản hồi'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Transition Confirmation Modal */}
      {transitionTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Xác Nhận Chuyển Trạng Thái</span>
              </h3>
              <button
                onClick={() => setTransitionTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Bạn sắp chuyển khiếu nại{' '}
                <strong className="text-amber-400 font-mono">{selectedComplaint?.code}</strong>{' '}
                từ <span className="font-semibold">{selectedComplaint?.status}</span> sang{' '}
                <strong className="text-white font-semibold underline">{transitionTarget}</strong>.
              </p>

              {transitionTarget === 'Resolved' && (
                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Chỉ chuyển sang Resolved khi sự cố của khách hàng đã được hỗ trợ xử lý thỏa đáng qua tin nhắn.
                  </span>
                </div>
              )}

              {transitionTarget === 'Closed' && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    Hành động Đóng khiếu nại (Closed) là vĩnh viễn và không thể đảo ngược. Khiếu nại sẽ không nhận thêm phản hồi mới.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Ghi chú chuyển trạng thái (tùy chọn):
                </label>
                <textarea
                  rows={2}
                  placeholder="Nhập lý do hoặc tóm tắt tiến độ..."
                  value={transitionNote}
                  onChange={(e) => setTransitionNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTransitionTarget(null)}
                disabled={transitioning}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmTransition}
                disabled={transitioning}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${transitioning ? 'animate-spin' : ''}`} />
                <span>{transitioning ? 'Đang cập nhật...' : 'Xác nhận chuyển'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
