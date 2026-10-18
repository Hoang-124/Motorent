import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  UploadCloud,
  X,
  Copy,
  Check,
  Calendar,
  Bike,
  CreditCard,
  User as UserIcon,
  HelpCircle,
  ShieldAlert,
  Loader2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  getComplaintCategories,
  submitComplaint,
  type ComplaintCategoryItem
} from '../services/complaintService';
import type { Booking, Vehicle, Branch } from '../types';

export const SubmitComplaintPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedBookingId = searchParams.get('bookingId');

  // Data states
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>(preselectedBookingId || '');
  const [categories, setCategories] = useState<ComplaintCategoryItem[]>([
    { id: 'Vehicle', name: 'Phương tiện', description: 'Sự cố hỏng hóc hoặc tình trạng xe' },
    { id: 'Service', name: 'Dịch vụ', description: 'Chất lượng dịch vụ hỗ trợ và thuê xe' },
    { id: 'Payment', name: 'Thanh toán', description: 'Sự cố cọc, hoàn tiền, cổng thanh toán' },
    { id: 'Staff', name: 'Nhân viên', description: 'Thái độ phục vụ của nhân viên chi nhánh' },
    { id: 'Other', name: 'Khác', description: 'Các ý kiến hoặc thắc mắc phát sinh khác' },
  ]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Vehicle');
  const [description, setDescription] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<{ name: string; url: string; isPdf: boolean }[]>([]);

  // UI status states
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successComplaintCode, setSuccessComplaintCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load customer bookings and categories
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/complaints/new', { replace: true });
      return;
    }

    const loadData = async () => {
      setLoadingInitial(true);
      try {
        const [bookingsRes, categoriesRes] = await Promise.allSettled([
          api.get('/bookings/my'),
          getComplaintCategories(),
        ]);

        if (bookingsRes.status === 'fulfilled' && bookingsRes.value.data?.success) {
          const list: Booking[] = bookingsRes.value.data.data || [];
          setBookings(list);
          if (preselectedBookingId && list.some((b) => b._id === preselectedBookingId)) {
            setSelectedBookingId(preselectedBookingId);
          } else if (list.length > 0 && !selectedBookingId) {
            setSelectedBookingId(list[0]._id);
          }
        }

        if (categoriesRes.status === 'fulfilled' && categoriesRes.value?.data) {
          setCategories(categoriesRes.value.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin khiếu nại:', err);
      } finally {
        setLoadingInitial(false);
      }
    };

    loadData();
  }, [isAuthenticated, navigate, preselectedBookingId]);

  // Selected booking object
  const selectedBooking = bookings.find((b) => b._id === selectedBookingId);

  // File selection and client validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (attachments.length + files.length > 5) {
      setFileError('Tối đa 5 tệp đính kèm cho mỗi khiếu nại.');
      return;
    }

    const validNewFiles: File[] = [];
    const validNewPreviews: { name: string; url: string; isPdf: boolean }[] = [];

    const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isAllowedExt = ext && ['jpg', 'jpeg', 'png', 'pdf'].includes(ext);
      const isAllowedMime = allowedMime.includes(file.type.toLowerCase()) || (ext === 'pdf' && !file.type);

      if (!isAllowedExt && !isAllowedMime) {
        setFileError(`Tệp "${file.name}" không hợp lệ. Chỉ chấp nhận JPG, PNG hoặc PDF.`);
        return;
      }

      if (file.size > maxFileSize) {
        setFileError(`Tệp "${file.name}" vượt quá dung lượng tối đa 5MB.`);
        return;
      }

      validNewFiles.push(file);
      const isPdf = file.type === 'application/pdf' || ext === 'pdf';
      const url = isPdf ? '' : URL.createObjectURL(file);
      validNewPreviews.push({ name: file.name, url, isPdf });
    }

    setAttachments((prev) => [...prev, ...validNewFiles]);
    setAttachmentPreviews((prev) => [...prev, ...validNewPreviews]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachmentPreviews((prev) => {
      const item = prev[index];
      if (item && item.url) {
        URL.revokeObjectURL(item.url);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedBookingId) {
      setErrorMessage('Vui lòng chọn đơn đặt xe cần khiếu nại.');
      return;
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc || trimmedDesc.length < 10) {
      setErrorMessage('Nội dung khiếu nại phải có ít nhất 10 ký tự.');
      return;
    }

    if (trimmedDesc.length > 2000) {
      setErrorMessage('Nội dung khiếu nại không được vượt quá 2000 ký tự.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitComplaint({
        bookingId: selectedBookingId,
        category: selectedCategory,
        description: trimmedDesc,
        title: title.trim() || undefined,
        attachments,
      });

      if (result.success && result.code) {
        setSuccessComplaintCode(result.code);
      } else {
        setErrorMessage('Không nhận được mã khiếu nại từ máy chủ.');
      }
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Có lỗi xảy ra trong quá trình gửi khiếu nại. Vui lòng thử lại.';
      setErrorMessage(serverMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    if (!successComplaintCode) return;
    try {
      await navigator.clipboard.writeText(successComplaintCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'Vehicle':
        return <Bike className="w-4 h-4 text-[#FFC799]" />;
      case 'Service':
        return <ShieldAlert className="w-4 h-4 text-[#99FFE4]" />;
      case 'Payment':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'Staff':
        return <UserIcon className="w-4 h-4 text-sky-400" />;
      default:
        return <HelpCircle className="w-4 h-4 text-amber-400" />;
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#FFC799] animate-spin mx-auto" />
          <p className="text-sm text-[#A0A0A0]">Đang tải thông tin chuyến xe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Top Breadcrumb & Title */}
      <div className="mb-8">
        <Link
          to="/profile?tab=bookings"
          className="inline-flex items-center space-x-2 text-xs text-[#A0A0A0] hover:text-[#FFC799] transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại lịch sử chuyến xe</span>
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F5F5]">
              Gửi khiếu nại dịch vụ
            </h1>
            <p className="text-sm text-[#A0A0A0] mt-1">
              MOTORENT cam kết giải quyết mọi khiếu nại trong vòng 24 giờ làm việc vì quyền lợi của bạn.
            </p>
          </div>
        </div>
      </div>

      {/* Success Modal / Banner */}
      {successComplaintCode ? (
        <div className="rounded-2xl bg-[#161616] border border-emerald-500/30 p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h2 className="text-xl font-bold text-[#F5F5F5]">Gửi khiếu nại thành công!</h2>
              <p className="text-sm text-[#A0A0A0] leading-relaxed">
                Yêu cầu của bạn đã được ghi nhận trên hệ thống với trạng thái{' '}
                <span className="font-semibold text-emerald-400">Tiếp nhận (Open)</span>. Đội ngũ CSKH và Quản lý chi
                nhánh MOTORENT sẽ kiểm tra hợp đồng, trích xuất dữ liệu xe và phản hồi lại sớm nhất.
              </p>
            </div>
          </div>

          {/* Ticket Code Box */}
          <div className="p-4 rounded-xl bg-[#101010] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#6E6E6E] font-medium block">
                Mã tra cứu khiếu nại
              </span>
              <span className="font-mono-tabular text-lg sm:text-xl font-bold text-[#FFC799]">
                {successComplaintCode}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#F5F5F5] font-semibold transition-colors cursor-pointer border border-white/10"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Đã sao chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép mã</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/profile?tab=bookings"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#ffb67a] text-[#101010] text-sm font-bold transition-all shadow-md cursor-pointer"
            >
              <span>Về danh sách chuyến xe</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setSuccessComplaintCode(null);
                setDescription('');
                setTitle('');
                setAttachments([]);
                setAttachmentPreviews([]);
              }}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#161616] hover:bg-white/5 text-[#F5F5F5] text-sm font-medium border border-white/10 transition-colors cursor-pointer"
            >
              <span>Gửi thêm khiếu nại khác</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start space-x-3 text-red-400 text-sm animate-in fade-in duration-150">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-400/80 hover:text-red-300 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 1. Select Booking */}
          <div className="p-6 rounded-2xl bg-[#161616] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-[#F5F5F5] flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#FFC799]/10 text-[#FFC799] flex items-center justify-center text-xs">
                  1
                </span>
                <span>Chọn chuyến xe cần khiếu nại</span>
              </label>
              <span className="text-xs text-[#A0A0A0]">Bắt buộc</span>
            </div>

            {bookings.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#101010] border border-white/[0.07] text-center space-y-3">
                <p className="text-sm text-[#A0A0A0]">
                  Bạn chưa có chuyến xe nào trong lịch sử để gửi khiếu nại.
                </p>
                <Link
                  to="/bikes"
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#FFC799] text-[#101010] text-xs font-bold hover:bg-[#ffb67a] transition-colors"
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>Đặt xe ngay</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <select
                    value={selectedBookingId}
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    className="w-full appearance-none bg-[#101010] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#FFC799] transition-colors cursor-pointer"
                  >
                    {bookings.map((b) => {
                      const v = typeof b.vehicleId === 'object' && b.vehicleId !== null ? (b.vehicleId as Vehicle) : null;
                      const model = v?.vehicleModel || 'Xe máy';
                      const plate = v?.licensePlate ? ` [${v.licensePlate}]` : '';
                      const dateStr = b.pickupDateTime ? new Date(b.pickupDateTime).toLocaleDateString('vi-VN') : '';
                      return (
                        <option key={b._id} value={b._id} className="bg-[#161616] text-[#F5F5F5]">
                          {b.bookingCode} - {model}
                          {plate} ({dateStr}) - {b.status}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#A0A0A0] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Selected Booking Info Card */}
                {selectedBooking && (
                  <div className="p-4 rounded-xl bg-[#101010] border border-white/[0.07] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[#6E6E6E] block mb-0.5">Phương tiện</span>
                      <span className="text-[#F5F5F5] font-semibold flex items-center space-x-1.5">
                        <Bike className="w-3.5 h-3.5 text-[#FFC799]" />
                        <span>
                          {typeof selectedBooking.vehicleId === 'object' && selectedBooking.vehicleId !== null
                            ? (selectedBooking.vehicleId as Vehicle).vehicleModel
                            : 'Xe máy Motorent'}
                        </span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6E6E6E] block mb-0.5">Thời gian nhận</span>
                      <span className="text-[#F5F5F5] font-mono-tabular">
                        {selectedBooking.pickupDateTime
                          ? new Date(selectedBooking.pickupDateTime).toLocaleDateString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : 'Chưa cập nhật'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6E6E6E] block mb-0.5">Trạng thái hợp đồng</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-white/5 border border-white/10 text-[#FFC799]">
                        {selectedBooking.status}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Select Category */}
          <div className="p-6 rounded-2xl bg-[#161616] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-[#F5F5F5] flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#FFC799]/10 text-[#FFC799] flex items-center justify-center text-xs">
                  2
                </span>
                <span>Phân loại sự cố (Danh mục)</span>
              </label>
              <span className="text-xs text-[#A0A0A0]">Bắt buộc</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? 'bg-[#FFC799]/10 border-[#FFC799] shadow-sm'
                        : 'bg-[#101010] border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-2 font-semibold text-xs text-[#F5F5F5]">
                        {getCategoryIcon(cat.id)}
                        <span>{cat.name}</span>
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#FFC799]" />}
                    </div>
                    <p className="text-[11px] text-[#A0A0A0] leading-snug">{cat.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Description & Details */}
          <div className="p-6 rounded-2xl bg-[#161616] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-[#F5F5F5] flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#FFC799]/10 text-[#FFC799] flex items-center justify-center text-xs">
                  3
                </span>
                <span>Chi tiết nội dung khiếu nại</span>
              </label>
              <span
                className={`text-xs font-mono-tabular ${
                  description.trim().length >= 10 && description.trim().length <= 2000
                    ? 'text-[#99FFE4]'
                    : description.trim().length > 0
                    ? 'text-amber-400'
                    : 'text-[#6E6E6E]'
                }`}
              >
                {description.trim().length} / 2000 ký tự (tối thiểu 10)
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#A0A0A0] mb-1.5 font-medium">
                  Tiêu đề tóm tắt (tùy chọn)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Xe bị hỏng phanh trước trên đường Nguyễn Văn Thoại..."
                  className="w-full bg-[#101010] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6E6E6E] focus:outline-none focus:border-[#FFC799] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A0A0A0] mb-1.5 font-medium">
                  Mô tả chi tiết sự cố <span className="text-[#FFC799]">*</span>
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Vui lòng mô tả chi tiết sự việc, thời điểm, địa điểm phát sinh sự cố và yêu cầu bồi thường/hỗ trợ cụ thể của bạn..."
                  className={`w-full bg-[#101010] border rounded-xl p-4 text-sm text-[#F5F5F5] placeholder-[#6E6E6E] focus:outline-none transition-colors resize-y leading-relaxed ${
                    description.trim().length > 0 && description.trim().length < 10
                      ? 'border-amber-500/50 focus:border-amber-500'
                      : 'border-white/10 focus:border-[#FFC799]'
                  }`}
                />
                {description.trim().length > 0 && description.trim().length < 10 && (
                  <p className="text-[11px] text-amber-400 mt-1 flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Nội dung mô tả cần thêm ít nhất {10 - description.trim().length} ký tự nữa.</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 4. File Attachments */}
          <div className="p-6 rounded-2xl bg-[#161616] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-[#F5F5F5] flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#FFC799]/10 text-[#FFC799] flex items-center justify-center text-xs">
                  4
                </span>
                <span>Tệp đính kèm / Bằng chứng thực tế</span>
              </label>
              <span className="text-xs text-[#A0A0A0]">Tối đa 5 tệp (JPG, PNG, PDF &lt;= 5MB)</span>
            </div>

            {fileError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            {/* Upload Area */}
            {attachments.length < 5 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/15 hover:border-[#FFC799]/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#101010]/50 hover:bg-[#101010]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <UploadCloud className="w-8 h-8 text-[#A0A0A0] mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#F5F5F5]">
                  Nhấn để chọn ảnh hoặc tài liệu PDF minh chứng
                </p>
                <p className="text-[11px] text-[#6E6E6E] mt-1">
                  Hình ảnh vết trầy xước, biên lai cứu hộ, ảnh đồng hồ xăng/ODO, hoá đơn sửa chữa...
                </p>
              </div>
            )}

            {/* Attachment Preview Grid */}
            {attachmentPreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                {attachmentPreviews.map((preview, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-xl border border-white/10 bg-[#101010] overflow-hidden aspect-square flex flex-col items-center justify-center p-2 text-center"
                  >
                    {preview.isPdf ? (
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <FileText className="w-8 h-8 text-rose-400" />
                        <span className="text-[10px] text-[#A0A0A0] truncate max-w-full px-1">
                          {preview.name}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={preview.url}
                        alt={preview.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-red-500 text-white transition-colors cursor-pointer"
                      title="Xóa tệp"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-xs text-[#6E6E6E] text-center sm:text-left">
              Hệ thống tự động chống spam: Mỗi tài khoản được gửi tối đa 05 khiếu nại trong một ngày.
            </p>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <Link
                to="/profile?tab=bookings"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-[#A0A0A0] hover:text-[#F5F5F5] font-semibold text-center transition-colors cursor-pointer"
              >
                Hủy bỏ
              </Link>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !selectedBookingId ||
                  description.trim().length < 10 ||
                  description.trim().length > 2000
                }
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#ffb67a] active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-[#101010] text-xs font-bold transition-all shadow-md inline-flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gửi khiếu nại...</span>
                  </>
                ) : (
                  <span>Xác nhận gửi khiếu nại</span>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default SubmitComplaintPage;
