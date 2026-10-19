import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Bike,
  Paperclip,
  MessageSquare,
  ShieldCheck,
  Check,
  Send,
  Upload,
  ArrowRight,
  ExternalLink,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Complaint, ComplaintStatus, Booking } from '../types';

const STATUS_CONFIG: Record<
  ComplaintStatus,
  { label: string; bg: string; text: string; border: string; stepIndex: number }
> = {
  Open: {
    label: 'Tiếp nhận',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    stepIndex: 0,
  },
  InProgress: {
    label: 'Đang xử lý',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    stepIndex: 1,
  },
  Resolved: {
    label: 'Đã giải quyết',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    stepIndex: 2,
  },
  Closed: {
    label: 'Đã đóng',
    bg: 'bg-zinc-800/80',
    text: 'text-zinc-400',
    border: 'border-zinc-700',
    stepIndex: 3,
  },
};

const CATEGORY_NAMES: Record<string, string> = {
  Vehicle: 'Phương tiện & Kỹ thuật',
  Service: 'Dịch vụ & Bàn giao',
  Payment: 'Thanh toán & Cọc VNPay',
  Staff: 'Thái độ nhân viên',
  Other: 'Vấn đề phát sinh khác',
};

const PROGRESS_STEPS: { status: ComplaintStatus; label: string; desc: string }[] = [
  { status: 'Open', label: 'Tiếp nhận', desc: 'Hệ thống ghi nhận khiếu nại' },
  { status: 'InProgress', label: 'Đang xử lý', desc: 'Nhân viên kiểm tra & đối soát' },
  { status: 'Resolved', label: 'Đã giải quyết', desc: 'Quản lý đưa ra kết luận' },
  { status: 'Closed', label: 'Đã đóng', desc: 'Hoàn tất thủ tục khiếu nại' },
];

export const ComplaintsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation & Filter states
  const paramStatus = searchParams.get('status') as ComplaintStatus | null;
  const paramId = searchParams.get('id');

  const [statusFilter, setStatusFilter] = useState<string>(paramStatus || 'ALL');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(6);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Data states
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(paramId || null);
  const [selectedDetail, setSelectedDetail] = useState<Complaint | null>(null);

  // Loading states
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Create Complaint Modal (UC-42 Integration)
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState<boolean>(false);
  const [formBookingId, setFormBookingId] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Vehicle');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch complaints list
  const fetchComplaints = useCallback(
    async (showRefreshSpinner = false) => {
      if (showRefreshSpinner) setIsRefreshing(true);
      else setLoadingList(true);
      setErrorMsg(null);

      try {
        const queryParams = new URLSearchParams();
        if (statusFilter && statusFilter !== 'ALL') {
          queryParams.set('status', statusFilter);
        }
        queryParams.set('page', String(page));
        queryParams.set('limit', String(limit));

        const res = await api.get(`/me/complaints?${queryParams.toString()}`);
        if (res.data?.success) {
          const list = Array.isArray(res.data.data) ? res.data.data : [];
          setComplaints(list);
          setTotal(res.data.total || list.length);
          setTotalPages(res.data.totalPages || 1);

          // If no complaint is selected or selected is not in current list, select first item
          if (list.length > 0 && !selectedComplaintId) {
            setSelectedComplaintId(list[0]._id || list[0].id || null);
          } else if (list.length === 0) {
            setSelectedComplaintId(null);
            setSelectedDetail(null);
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Không thể tải danh sách khiếu nại.';
        setErrorMsg(message);
      } finally {
        setLoadingList(false);
        setIsRefreshing(false);
      }
    },
    [statusFilter, page, limit, selectedComplaintId]
  );

  // 2. Fetch complaint detail when selectedComplaintId changes
  const fetchDetail = useCallback(async (id: string, showSpinner = true) => {
    if (!id) return;
    if (showSpinner) setLoadingDetail(true);

    try {
      const res = await api.get(`/me/complaints/${id}`);
      if (res.data?.success && res.data.data) {
        setSelectedDetail(res.data.data);
      }
    } catch {
      setSelectedDetail(null);
    } finally {
      if (showSpinner) setLoadingDetail(false);
    }
  }, []);

  // 3. Load user bookings for create modal
  const fetchUserBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await api.get('/bookings/my?limit=20');
      if (res.data?.success) {
        const bks = res.data.data?.bookings || res.data.data?.items || res.data.data || [];
        setUserBookings(Array.isArray(bks) ? bks : []);
        if (Array.isArray(bks) && bks.length > 0 && !formBookingId) {
          setFormBookingId(bks[0]._id);
        }
      }
    } catch {
      setUserBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  useEffect(() => {
    if (selectedComplaintId) {
      fetchDetail(selectedComplaintId);
    } else {
      setSelectedDetail(null);
    }
  }, [selectedComplaintId, fetchDetail]);

  const handleFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (newStatus === 'ALL') {
      newParams.delete('status');
    } else {
      newParams.set('status', newStatus);
    }
    setSearchParams(newParams);
  };

  const handleSelectComplaint = (id: string) => {
    setSelectedComplaintId(id);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('id', id);
    setSearchParams(newParams);
  };

  // Submit new complaint (UC-42)
  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formBookingId) {
      setFormError('Vui lòng chọn đơn đặt xe cần khiếu nại.');
      return;
    }

    const trimmedDesc = formDescription.trim();
    if (!trimmedDesc || trimmedDesc.length < 10) {
      setFormError('Nội dung khiếu nại phải có ít nhất 10 ký tự.');
      return;
    }
    if (trimmedDesc.length > 2000) {
      setFormError('Nội dung khiếu nại không được vượt quá 2000 ký tự.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('bookingId', formBookingId);
      formData.append('category', formCategory);
      formData.append('description', trimmedDesc);
      if (formTitle.trim()) {
        formData.append('title', formTitle.trim());
      }
      for (const file of formFiles) {
        formData.append('attachments', file);
      }

      const res = await api.post('/complaints', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        showToast('Gửi khiếu nại thành công! MOTORENT sẽ tiếp nhận và xử lý sớm nhất.', 'success');
        setIsCreateOpen(false);
        setFormDescription('');
        setFormTitle('');
        setFormFiles([]);
        const createdId = res.data.data?._id || res.data.data?.id;
        if (createdId) {
          setSelectedComplaintId(createdId);
        }
        fetchComplaints();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể gửi khiếu nại. Vui lòng kiểm tra lại.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      if (formFiles.length + fileList.length > 5) {
        setFormError('Chỉ được đính kèm tối đa 5 tệp (JPG, PNG hoặc PDF).');
        return;
      }
      setFormFiles((prev) => [...prev, ...fileList].slice(0, 5));
    }
  };

  const removeFile = (index: number) => {
    setFormFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const currentStepIndex = selectedDetail ? STATUS_CONFIG[selectedDetail.status]?.stepIndex ?? 0 : 0;

  return (
    <div className="min-h-screen bg-[#101010] text-zinc-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-sm transition-all duration-300 animate-slide-up ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
              : 'bg-red-950/90 text-red-200 border-red-500/40'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-zinc-400 hover:text-zinc-200 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Theo dõi khiếu nại & Hỗ trợ kỹ thuật
                </h1>
                <p className="text-sm text-zinc-400 mt-0.5">
                  Theo dõi tiến độ, trao đổi với bộ phận hỗ trợ và xem kết luận giải quyết minh bạch
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchComplaints(true);
                if (selectedComplaintId) fetchDetail(selectedComplaintId, true);
              }}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700/80 hover:bg-zinc-800 text-zinc-300 hover:text-white text-sm transition disabled:opacity-50"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              onClick={() => {
                setIsCreateOpen(true);
                fetchUserBookings();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm transition shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Gửi khiếu nại mới</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/80 pb-3">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'Open', label: 'Tiếp nhận' },
            { id: 'InProgress', label: 'Đang xử lý' },
            { id: 'Resolved', label: 'Đã giải quyết' },
            { id: 'Closed', label: 'Đã đóng' },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleFilterChange(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-zinc-800 text-orange-400 border border-orange-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Content: Split List and Detail */}
        {loadingList ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 text-zinc-500">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
            <p className="text-sm">Đang tải danh sách khiếu nại...</p>
          </div>
        ) : errorMsg ? (
          <div className="p-6 rounded-2xl bg-red-950/30 border border-red-500/30 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-sm text-red-300">{errorMsg}</p>
            <button
              onClick={() => fetchComplaints()}
              className="px-4 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-200 rounded-xl text-xs font-medium"
            >
              Thử lại
            </button>
          </div>
        ) : complaints.length === 0 ? (
          /* Empty State */
          <div className="py-20 px-4 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400">
              <ShieldAlert className="w-8 h-8 text-zinc-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white">Chưa có khiếu nại nào</h3>
              <p className="text-sm text-zinc-400 max-w-md mx-auto">
                {statusFilter !== 'ALL'
                  ? `Không có khiếu nại nào ở trạng thái "${STATUS_CONFIG[statusFilter as ComplaintStatus]?.label}".`
                  : 'Bạn chưa có khiếu nại nào trong hệ thống. Nếu có sự cố về chuyến xe hoặc thanh toán, hãy tạo khiếu nại ngay.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => {
                  setIsCreateOpen(true);
                  fetchUserBookings();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition shadow-lg shadow-orange-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Gửi khiếu nại</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Complaints List (5 cols on lg) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span>
                  Hiển thị <span className="text-white font-medium">{complaints.length}</span> / {total} khiếu nại
                </span>
                <span>Trang {page} / {totalPages}</span>
              </div>

              <div className="space-y-3">
                {complaints.map((item) => {
                  const isSelected = selectedComplaintId === (item._id || item.id);
                  const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.Open;
                  const categoryName = CATEGORY_NAMES[item.category] || item.category;
                  const createdDate = new Date(item.createdAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={item._id || item.id}
                      onClick={() => handleSelectComplaint(item._id || item.id || '')}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-zinc-850 border-orange-500/60 shadow-lg shadow-orange-500/5'
                          : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-semibold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                          {item.code}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      <h4 className="font-medium text-white text-sm line-clamp-1 mb-1">
                        {item.title || categoryName}
                      </h4>

                      <p className="text-xs text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-800/60 pt-2.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {createdDate}
                        </span>

                        {item.booking?.bookingCode && (
                          <span className="flex items-center gap-1 font-mono text-zinc-400">
                            <Bike className="w-3.5 h-3.5 text-zinc-500" />
                            {item.booking.bookingCode}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 px-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-40 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-zinc-400">
                    Trang {page} trên {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-40 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Complaint Detail (7 cols on lg) */}
            <div className="lg:col-span-7">
              {loadingDetail ? (
                <div className="p-12 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
                  <p className="text-sm text-zinc-400">Đang tải chi tiết khiếu nại...</p>
                </div>
              ) : !selectedDetail ? (
                <div className="p-12 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center space-y-2 text-zinc-500">
                  <Info className="w-8 h-8 mx-auto text-zinc-600" />
                  <p className="text-sm">Vui lòng chọn một khiếu nại từ danh sách bên trái để xem chi tiết.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Detail Card Header */}
                  <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800/80 pb-5">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-mono text-sm font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/20">
                            {selectedDetail.code}
                          </span>
                          <span className="text-xs text-zinc-400">
                            Danh mục: <span className="text-zinc-200 font-medium">{CATEGORY_NAMES[selectedDetail.category] || selectedDetail.category}</span>
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-white">
                          {selectedDetail.title || 'Chi tiết khiếu nại dịch vụ'}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                            STATUS_CONFIG[selectedDetail.status]?.bg
                          } ${STATUS_CONFIG[selectedDetail.status]?.text} ${
                            STATUS_CONFIG[selectedDetail.status]?.border
                          }`}
                        >
                          {STATUS_CONFIG[selectedDetail.status]?.label}
                        </span>
                      </div>
                    </div>

                    {/* 4-Step Progress Bar */}
                    <div className="py-2">
                      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                        Tiến trình giải quyết (4 bước)
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {PROGRESS_STEPS.map((step, idx) => {
                          const isPassed = idx <= currentStepIndex;
                          const isCurrent = idx === currentStepIndex;

                          return (
                            <div
                              key={step.status}
                              className={`p-3 rounded-xl border transition-all ${
                                isCurrent
                                  ? 'bg-orange-500/10 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                  : isPassed
                                  ? 'bg-zinc-850/80 border-emerald-500/30 text-zinc-200'
                                  : 'bg-zinc-900/40 border-zinc-800 text-zinc-500'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-mono text-zinc-400">0{idx + 1}</span>
                                {isPassed && !isCurrent ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : isCurrent ? (
                                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                                ) : null}
                              </div>
                              <div className="font-semibold text-xs text-white">{step.label}</div>
                              <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                                {step.desc}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Booking Summary Box (If attached to booking) */}
                    {selectedDetail.booking && (
                      <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
                        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Bike className="w-3.5 h-3.5 text-orange-400" />
                          Thông tin đơn đặt xe liên quan
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                          <div>
                            <span className="text-zinc-500">Mã đơn đặt xe:</span>{' '}
                            <span className="font-mono text-orange-400 font-medium">
                              {selectedDetail.booking.bookingCode}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Phương tiện:</span>{' '}
                            <span className="text-zinc-200 font-medium">
                              {selectedDetail.booking.vehicle}
                            </span>
                          </div>
                          {selectedDetail.booking.pickupDateTime && (
                            <div>
                              <span className="text-zinc-500">Nhận xe:</span>{' '}
                              <span className="text-zinc-300">
                                {new Date(selectedDetail.booking.pickupDateTime).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                          )}
                          {selectedDetail.booking.returnDateTime && (
                            <div>
                              <span className="text-zinc-500">Trả xe:</span>{' '}
                              <span className="text-zinc-300">
                                {new Date(selectedDetail.booking.returnDateTime).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Complaint Description */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Nội dung chi tiết khiếu nại
                      </div>
                      <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-800 text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
                        {selectedDetail.description}
                      </div>
                    </div>

                    {/* Attachments Preview */}
                    {selectedDetail.attachments && selectedDetail.attachments.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-zinc-400" />
                          Tệp đính kèm ({selectedDetail.attachments.length})
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                          {selectedDetail.attachments.map((fileUrl, index) => {
                            const isPdf = fileUrl.toLowerCase().endsWith('.pdf');
                            return (
                              <a
                                key={index}
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block p-2 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-orange-500/50 transition overflow-hidden"
                              >
                                {isPdf ? (
                                  <div className="h-24 flex flex-col items-center justify-center gap-1 text-zinc-400 group-hover:text-orange-400">
                                    <FileText className="w-8 h-8" />
                                    <span className="text-[11px]">Tệp PDF</span>
                                  </div>
                                ) : (
                                  <div className="h-24 rounded-lg overflow-hidden bg-black flex items-center justify-center">
                                    <img
                                      src={fileUrl}
                                      alt={`Đính kèm ${index + 1}`}
                                      className="w-full h-full object-cover group-hover:scale-105 transition"
                                    />
                                  </div>
                                )}
                                <div className="text-[11px] text-zinc-400 truncate mt-1 flex items-center justify-between">
                                  <span>Tệp {index + 1}</span>
                                  <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-orange-400" />
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Final Resolution Section (ONLY visible if Resolved or Closed) */}
                    {(selectedDetail.status === 'Resolved' || selectedDetail.status === 'Closed') &&
                      selectedDetail.finalResolution && (
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/40 space-y-3">
                          <div className="flex items-center gap-2 text-emerald-400">
                            <ShieldCheck className="w-5 h-5" />
                            <h3 className="font-bold text-sm uppercase tracking-wider">
                              Kết luận & Phương án giải quyết chính thức
                            </h3>
                          </div>
                          <div className="text-sm text-emerald-100 leading-relaxed whitespace-pre-line pl-7">
                            {selectedDetail.finalResolution}
                          </div>
                          {selectedDetail.closedAt && (
                            <div className="text-xs text-zinc-400 pl-7 pt-1 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-zinc-500" />
                              Thời gian đóng khiếu nại:{' '}
                              {new Date(selectedDetail.closedAt).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                        </div>
                      )}
                  </div>

                  {/* Chronological Timeline Section */}
                  <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-400" />
                        <h3 className="font-bold text-sm text-white">
                          Nhật ký xử lý & Phản hồi ({selectedDetail.timeline?.length || 0})
                        </h3>
                      </div>
                      <span className="text-xs text-zinc-400">Thứ tự thời gian tăng dần</span>
                    </div>

                    {!selectedDetail.timeline || selectedDetail.timeline.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic py-4 text-center">
                        Chưa có lịch sử trạng thái hoặc phản hồi nào.
                      </p>
                    ) : (
                      <div className="space-y-4 pt-2">
                        {selectedDetail.timeline.map((item, idx) => {
                          const isStatus = item.type === 'status';
                          const actor = item.performedBy || item.user || { name: 'Hệ thống', role: 'Staff' };
                          const itemDate = new Date(item.createdAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          return (
                            <div key={idx} className="flex items-start gap-3 relative group">
                              {/* Indicator dot */}
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mt-0.5 ${
                                  isStatus
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                }`}
                              >
                                {isStatus ? (
                                  <Clock className="w-4 h-4" />
                                ) : (
                                  <MessageSquare className="w-4 h-4" />
                                )}
                              </div>

                              <div className="flex-1 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80 space-y-1.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs text-white">
                                      {actor.name}
                                    </span>
                                    <span
                                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium border ${
                                        actor.role === 'Customer'
                                          ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                          : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                      }`}
                                    >
                                      {actor.role === 'Customer' ? 'Khách hàng' : 'Nhân viên MOTORENT'}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-zinc-400 font-mono">
                                    {itemDate}
                                  </span>
                                </div>

                                <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-line">
                                  {item.content}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Gửi khiếu nại mới (UC-42 Integration) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Gửi khiếu nại dịch vụ</h3>
                  <p className="text-xs text-zinc-400">Tiếp nhận và phản hồi nhanh chóng trong 24 giờ</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              {/* Select Booking */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Chọn đơn đặt xe cần khiếu nại <span className="text-red-400">*</span>
                </label>
                {loadingBookings ? (
                  <div className="text-xs text-zinc-500 py-2">Đang tải danh sách đơn thuê...</div>
                ) : userBookings.length === 0 ? (
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-amber-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Bạn chưa có đơn đặt xe nào để gửi khiếu nại.</span>
                  </div>
                ) : (
                  <select
                    value={formBookingId}
                    onChange={(e) => setFormBookingId(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-orange-500 transition"
                  >
                    {userBookings.map((b) => {
                      const veh = typeof b.vehicleId === 'object' ? b.vehicleId : null;
                      const vehName = veh?.vehicleModel || 'Xe máy';
                      return (
                        <option key={b._id} value={b._id}>
                          {b.bookingCode || b._id} - {vehName} ({b.status})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Danh mục khiếu nại <span className="text-red-400">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-orange-500 transition"
                >
                  <option value="Vehicle">Phương tiện & Kỹ thuật (Hỏng hóc, rung giật, lỗi động cơ)</option>
                  <option value="Service">Dịch vụ & Bàn giao (Thời gian chờ, quy trình nhận xe)</option>
                  <option value="Payment">Thanh toán & Cọc (Sự cố trừ tiền, cọc VNPay)</option>
                  <option value="Staff">Thái độ nhân viên hỗ trợ</option>
                  <option value="Other">Các vấn đề khác</option>
                </select>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Tiêu đề ngắn gọn</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Xe rung đầu ga ở dải tốc độ 30km/h"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  maxLength={100}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    Mô tả sự cố chi tiết <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    {formDescription.length}/2000 ký tự (tối thiểu 10)
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="Mô tả cụ thể thời gian, địa điểm, hiện tượng sự cố để kỹ thuật viên hỗ trợ nhanh nhất..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition leading-relaxed resize-none"
                />
              </div>

              {/* File Attachments */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Tệp đính kèm (Ảnh / PDF)</span>
                  <span className="text-[11px] text-zinc-500">Tối đa 5 tệp</span>
                </label>

                {formFiles.length < 5 && (
                  <label className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-700 hover:border-orange-500/60 rounded-xl cursor-pointer bg-zinc-950/40 hover:bg-zinc-950 transition">
                    <Upload className="w-5 h-5 text-zinc-400 mb-1" />
                    <span className="text-xs text-zinc-300">Nhấn để tải lên ảnh hoặc PDF</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">JPG, PNG hoặc PDF hợp lệ</span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Selected Files List */}
                {formFiles.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {formFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300"
                      >
                        <span className="truncate max-w-[280px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || userBookings.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition disabled:opacity-50 shadow-lg shadow-orange-500/20"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'Đang gửi...' : 'Gửi khiếu nại'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsPage;
