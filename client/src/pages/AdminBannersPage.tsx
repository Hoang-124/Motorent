import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GripVertical,
  ArrowUp,
  ArrowDown,
  Edit3,
  Trash2,
  AlertTriangle,
  Plus,
  Check,
  X,
  ExternalLink,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  Upload,
  SlidersHorizontal,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';
import { deleteBanner } from '../services/bannerService';
import type { Banner } from '../types';
import { getBannerImageUrl } from '../utils/imageHelper';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export const AdminBannersPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modal States
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerToDelete, setBannerToDelete] = useState<Banner | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Form Fields
  const [editTitle, setEditTitle] = useState<string>('');
  const [editSubtitle, setEditSubtitle] = useState<string>('');
  const [editLinkUrl, setEditLinkUrl] = useState<string>('');
  const [editOrder, setEditOrder] = useState<number>(1);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string>('');

  // Add Form Fields
  const [addTitle, setAddTitle] = useState<string>('');
  const [addSubtitle, setAddSubtitle] = useState<string>('');
  const [addLinkUrl, setAddLinkUrl] = useState<string>('/bikes');
  const [addOrder, setAddOrder] = useState<number>(1);
  const [addIsActive, setAddIsActive] = useState<boolean>(true);
  const [addImageFile, setAddImageFile] = useState<File | null>(null);
  const [addImagePreview, setAddImagePreview] = useState<string>('');

  // Drag and drop tracking
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(pageSize));
      if (filterStatus === 'active') params.set('isActive', 'true');
      if (filterStatus === 'inactive') params.set('isActive', 'false');

      const res = await api.get(`/admin/banners?${params.toString()}`);
      if (res.data?.success && res.data.data?.items) {
        const sorted = (res.data.data.items as Banner[]).sort((a, b) => (a.order || 0) - (b.order || 0));
        setBanners(sorted);
        setTotalCount(res.data.data.total ?? sorted.length);
        setTotalPages(res.data.data.totalPages ?? Math.max(1, Math.ceil((res.data.data.total ?? sorted.length) / pageSize)));
      } else {
        setBanners([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch {
      setError('Không thể tải danh sách banner từ máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filterStatus]);

  useEffect(() => {
    fetchBanners();
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [fetchBanners]);

  // Clean object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (editImagePreview && editImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(editImagePreview);
      }
      if (addImagePreview && addImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(addImagePreview);
      }
    };
  }, [editImagePreview, addImagePreview]);

  // ==========================================
  // Optimistic Quick Toggle isActive
  // ==========================================
  const handleToggleStatus = async (bannerId: string, currentStatus: boolean) => {
    const previousBanners = [...banners];
    const nextStatus = !currentStatus;

    // Optimistic local update
    setBanners((prev) =>
      prev.map((b) => ((b._id || b.id) === bannerId ? { ...b, isActive: nextStatus } : b))
    );

    try {
      const res = await api.patch(`/admin/banners/${bannerId}/status`, { isActive: nextStatus });
      if (res.data?.success) {
        showToast(
          nextStatus ? 'Đã bật hiển thị banner trên trang chủ.' : 'Đã tạm ẩn banner khỏi trang chủ.'
        );
      } else {
        throw new Error(res.data?.message || 'Lỗi cập nhật');
      }
    } catch {
      // Rollback on error
      setBanners(previousBanners);
      showToast('Không thể cập nhật trạng thái banner. Đã hoàn tác.', 'error');
    }
  };

  // ==========================================
  // Atomic Reorder API caller with optimistic update
  // ==========================================
  const applyNewOrder = async (newOrderBanners: Banner[], successMessage = 'Đã cập nhật thứ tự hiển thị banner.') => {
    const previousBanners = [...banners];

    // Recalculate continuous order numbers 1..n
    const continuousBanners = newOrderBanners.map((b, idx) => ({
      ...b,
      order: idx + 1,
    }));

    // Optimistic local update
    setBanners(continuousBanners);

    const payload = continuousBanners.map((b) => ({
      id: b._id || b.id,
      order: b.order,
    }));

    try {
      const res = await api.patch('/admin/banners/reorder', payload);
      if (res.data?.success) {
        showToast(successMessage);
      } else {
        throw new Error(res.data?.message || 'Lỗi reorder');
      }
    } catch {
      // Rollback on error
      setBanners(previousBanners);
      showToast('Lỗi cập nhật thứ tự banner. Đã hoàn tác dữ liệu.', 'error');
    }
  };

  // Button Reorder: Move Up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...banners];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    applyNewOrder(updated, `Đã chuyển "${temp.title}" lên vị trí ${index}.`);
  };

  // Button Reorder: Move Down
  const handleMoveDown = (index: number) => {
    if (index >= banners.length - 1) return;
    const updated = [...banners];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    applyNewOrder(updated, `Đã chuyển "${temp.title}" xuống vị trí ${index + 2}.`);
  };

  // HTML5 Drag and Drop Reordering
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    const updated = [...banners];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    setDraggedIndex(null);
    applyNewOrder(updated, `Đã kéo-thả "${movedItem.title}" sang vị trí ${targetIndex + 1}.`);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // ==========================================
  // Open Edit Modal & Prefill Data (UC-117)
  // ==========================================
  const handleOpenEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setEditTitle(banner.title);
    setEditSubtitle(banner.subtitle || '');
    setEditLinkUrl(banner.linkUrl || '');
    setEditOrder(banner.order);
    setEditIsActive(banner.isActive);
    setEditImageFile(null);
    setEditImagePreview(getBannerImageUrl(banner.imageUrl));
    setFormError(null);
  };

  const handleCloseEdit = () => {
    setEditingBanner(null);
    setEditImageFile(null);
    setEditImagePreview('');
    setFormError(null);
  };

  // Handle Edit Image File Selection
  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setFormError('Chỉ chấp nhận file ảnh định dạng JPEG, PNG hoặc WebP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Dung lượng ảnh tối đa cho phép là 5MB.');
      return;
    }

    setFormError(null);
    setEditImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setEditImagePreview(objectUrl);
  };

  // Submit Edit Form (PATCH /admin/banners/:id)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;

    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setFormError('Tiêu đề banner không được để trống.');
      return;
    }

    if (trimmedTitle.length > 100) {
      setFormError('Tiêu đề banner tối đa 100 ký tự.');
      return;
    }

    const trimmedLink = editLinkUrl.trim();
    if (trimmedLink && !trimmedLink.startsWith('/') && !/^https?:\/\//i.test(trimmedLink)) {
      setFormError('Đường dẫn phải bắt đầu bằng "/" hoặc là URL hợp lệ (http/https).');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const bannerId = editingBanner._id || editingBanner.id;

    try {
      const formData = new FormData();
      formData.append('title', trimmedTitle);
      formData.append('subtitle', editSubtitle.trim());
      formData.append('linkUrl', trimmedLink);
      formData.append('order', String(editOrder));
      formData.append('isActive', String(editIsActive));

      if (editImageFile) {
        formData.append('image', editImageFile);
      }

      const res = await api.patch(`/admin/banners/${bannerId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data.data) {
        const updatedBanner = res.data.data as Banner;
        setBanners((prev) =>
          prev.map((b) => ((b._id || b.id) === bannerId ? updatedBanner : b))
        );
        showToast('Cập nhật thông tin banner thành công!');
        handleCloseEdit();
      } else {
        throw new Error(res.data?.message || 'Cập nhật thất bại.');
      }
    } catch (err: unknown) {
      const errMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể lưu thay đổi. Vui lòng kiểm tra lại dữ liệu.';
      setFormError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // UC-118: Execute Soft Delete Banner
  // ==========================================
  const handleConfirmDelete = async () => {
    if (!bannerToDelete) return;
    const bannerId = bannerToDelete._id || bannerToDelete.id;
    if (!bannerId) return;

    setIsDeleting(true);
    try {
      await deleteBanner(bannerId);
      showToast(`Đã xóa banner "${bannerToDelete.title}" thành công.`);
      setBannerToDelete(null);

      // Rule: Nếu xóa hết bản ghi của trang hiện tại thì lùi về trang trước
      if (banners.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        await fetchBanners();
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể xóa banner. Vui lòng thử lại sau.';
      showToast(errorMsg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ==========================================
  // Open Add Modal & Submit (POST /admin/banners)
  // ==========================================
  const handleOpenAdd = () => {
    const nextOrder = banners.length > 0 ? Math.max(...banners.map((b) => b.order || 0)) + 1 : 1;
    setAddTitle('');
    setAddSubtitle('');
    setAddLinkUrl('/bikes');
    setAddOrder(nextOrder);
    setAddIsActive(true);
    setAddImageFile(null);
    setAddImagePreview('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleCloseAdd = () => {
    setIsAddModalOpen(false);
    setAddImageFile(null);
    setAddImagePreview('');
    setFormError(null);
  };

  const handleAddFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setFormError('Chỉ chấp nhận file ảnh định dạng JPEG, PNG hoặc WebP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Dung lượng ảnh tối đa cho phép là 5MB.');
      return;
    }

    setFormError(null);
    setAddImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAddImagePreview(objectUrl);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = addTitle.trim();
    if (!trimmedTitle) {
      setFormError('Tiêu đề banner là bắt buộc.');
      return;
    }

    if (!addImageFile) {
      setFormError('Vui lòng chọn hình ảnh banner để tải lên.');
      return;
    }

    const trimmedLink = addLinkUrl.trim();
    if (trimmedLink && !trimmedLink.startsWith('/') && !/^https?:\/\//i.test(trimmedLink)) {
      setFormError('Đường dẫn phải bắt đầu bằng "/" hoặc là URL hợp lệ (http/https).');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append('title', trimmedTitle);
      formData.append('subtitle', addSubtitle.trim());
      formData.append('linkUrl', trimmedLink);
      formData.append('order', String(addOrder));
      formData.append('isActive', String(addIsActive));
      formData.append('image', addImageFile);

      const res = await api.post('/admin/banners', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data.data) {
        const createdBanner = res.data.data as Banner;
        setBanners((prev) => [...prev, createdBanner].sort((a, b) => (a.order || 0) - (b.order || 0)));
        showToast('Thêm banner mới thành công!');
        handleCloseAdd();
      } else {
        throw new Error(res.data?.message || 'Thêm banner thất bại.');
      }
    } catch (err: unknown) {
      const errMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể thêm banner. Vui lòng kiểm tra lại kết nối mạng.';
      setFormError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered list based on search and status tabs
  const filteredBanners = banners.filter((b) => {
    const matchQuery =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.subtitle && b.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.linkUrl && b.linkUrl.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchQuery) return false;
    if (filterStatus === 'active') return b.isActive;
    if (filterStatus === 'inactive') return !b.isActive;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl border shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-[#18261E] border-emerald-500/30 text-emerald-300'
              : 'bg-[#2A1616] border-red-500/30 text-red-300'
          }`}
        >
          {toast.type === 'success' ? (
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-2 text-xs uppercase tracking-wider text-[#FFC799] font-medium mb-1.5">
            <SlidersHorizontal className="w-4 h-4" />
            <span>CMS Quản trị Hệ Thống</span>
            <span className="text-white/30">•</span>
            <span>UC-116, UC-117 &amp; UC-118</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center space-x-3">
            <span>Quản Lý Banner Trang Chủ</span>
          </h1>
          <p className="text-sm text-[#A0A0A0] mt-1 max-w-2xl">
            Thêm mới, chỉnh sửa, xóa mềm tự động chuẩn hóa thứ tự (1..n), sắp xếp hiển thị bằng kéo-thả
            hoặc nút lên/xuống, và bật/tắt nhanh trạng thái hiển thị trực tiếp trên danh sách.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={fetchBanners}
            disabled={loading}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-sm text-[#F5F5F5] transition-all cursor-pointer disabled:opacity-50"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#FFC799]' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#FFC799] hover:bg-[#FFB77D] text-[#101010] font-semibold text-sm transition-all cursor-pointer shadow-lg shadow-[#FFC799]/10"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Thêm Banner Mới</span>
          </button>
        </div>
      </div>

      {/* Stats and Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
        <div className="bg-[#181818] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-[#A0A0A0] uppercase font-medium">Tổng Banner</div>
            <div className="text-2xl font-bold text-white mt-0.5">{banners.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-[#FFC799]">
            <ImageIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#181818] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-[#A0A0A0] uppercase font-medium">Đang Hiển Thị</div>
            <div className="text-2xl font-bold text-emerald-400 mt-0.5">
              {banners.filter((b) => b.isActive).length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#181818] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-[#A0A0A0] uppercase font-medium">Tạm Ẩn</div>
            <div className="text-2xl font-bold text-zinc-400 mt-0.5">
              {banners.filter((b) => !b.isActive).length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-zinc-400">
            <EyeOff className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 bg-[#181818] border border-white/10 rounded-2xl p-2.5">
        <div className="flex items-center space-x-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-[#FFC799] text-[#101010] font-semibold'
                : 'text-[#A0A0A0] hover:text-white'
            }`}
          >
            Tất cả ({banners.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterStatus === 'active'
                ? 'bg-emerald-500 text-white font-semibold'
                : 'text-[#A0A0A0] hover:text-white'
            }`}
          >
            Đang hiển thị ({banners.filter((b) => b.isActive).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterStatus === 'inactive'
                ? 'bg-zinc-700 text-white font-semibold'
                : 'text-[#A0A0A0] hover:text-white'
            }`}
          >
            Tạm ẩn ({banners.filter((b) => !b.isActive).length})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, link..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FFC799] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#181818] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#FFC799]" />
            <span className="text-sm text-[#A0A0A0]">Đang tải danh sách banner...</span>
          </div>
        ) : error ? (
          <div className="py-16 px-4 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-300 font-medium">{error}</p>
            <button
              type="button"
              onClick={fetchBanners}
              className="mt-4 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] rounded-xl text-xs text-white border border-white/10"
            >
              Thử lại
            </button>
          </div>
        ) : filteredBanners.length === 0 ? (
          <div className="py-20 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-3 text-zinc-500">
              <ImageIcon className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-white">Chưa có banner nào</h3>
            <p className="text-xs text-[#A0A0A0] mt-1 max-w-sm mx-auto">
              {searchQuery || filterStatus !== 'all'
                ? 'Không tìm thấy banner nào phù hợp với bộ lọc hiện tại.'
                : 'Bấm nút "Thêm Banner Mới" để tạo banner quảng cáo đầu tiên trên trang chủ.'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-[#FFC799] text-[#101010] font-semibold rounded-xl text-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm banner ngay</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/10 text-[#A0A0A0] uppercase font-semibold text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 w-28 text-center">Thứ tự</th>
                  <th className="py-3.5 px-4 w-44">Ảnh xem trước</th>
                  <th className="py-3.5 px-4">Thông tin Banner</th>
                  <th className="py-3.5 px-4 w-40">Đường dẫn</th>
                  <th className="py-3.5 px-4 w-36 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 w-48 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredBanners.map((banner, index) => {
                  const bannerId = banner._id || banner.id || '';
                  const isDragged = draggedIndex === index;
                  const isDragOver = dragOverIndex === index;

                  return (
                    <tr
                      key={bannerId}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`group transition-colors ${
                        isDragged ? 'opacity-30 bg-[#FFC799]/5' : ''
                      } ${isDragOver ? 'bg-[#FFC799]/10 border-t-2 border-[#FFC799]' : 'hover:bg-white/[0.02]'}`}
                    >
                      {/* Column 1: Order with Drag Handle & Up/Down Arrows */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Drag Handle */}
                          <div
                            className="p-1 rounded-md text-zinc-500 hover:text-white cursor-grab active:cursor-grabbing hover:bg-white/[0.05]"
                            title="Kéo-thả để đổi thứ tự"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Order Badge */}
                          <div className="w-7 h-7 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center font-bold text-white text-xs">
                            {banner.order}
                          </div>

                          {/* Up / Down Controls */}
                          <div className="flex flex-col space-y-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              className="p-0.5 rounded text-zinc-400 hover:text-[#FFC799] hover:bg-white/[0.08] disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer disabled:cursor-not-allowed"
                              title="Di chuyển lên"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveDown(index)}
                              disabled={index === banners.length - 1}
                              className="p-0.5 rounded text-zinc-400 hover:text-[#FFC799] hover:bg-white/[0.08] disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer disabled:cursor-not-allowed"
                              title="Di chuyển xuống"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Image Preview Thumbnail */}
                      <td className="py-3.5 px-4">
                        <div className="relative w-36 h-20 rounded-xl overflow-hidden bg-black/50 border border-white/10 group-hover:border-white/20 transition-all shadow-inner">
                          <img
                            src={getBannerImageUrl(banner.imageUrl)}
                            alt={banner.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80';
                            }}
                          />
                          {!banner.isActive && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 bg-black/80 px-2 py-0.5 rounded-full border border-white/10">
                                Đã ẩn
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Column 3: Title & Subtitle */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-md">
                          <div className="font-semibold text-white text-sm line-clamp-1 group-hover:text-[#FFC799] transition-colors">
                            {banner.title}
                          </div>
                          {banner.subtitle ? (
                            <div className="text-xs text-[#A0A0A0] line-clamp-1 mt-0.5">
                              {banner.subtitle}
                            </div>
                          ) : (
                            <div className="text-[11px] text-zinc-600 italic mt-0.5">
                              Chưa có phụ đề
                            </div>
                          )}
                          <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                            ID: {bannerId}
                          </div>
                        </div>
                      </td>

                      {/* Column 4: Link URL */}
                      <td className="py-3.5 px-4">
                        {banner.linkUrl ? (
                          <a
                            href={banner.linkUrl}
                            target={banner.linkUrl.startsWith('http') ? '_blank' : '_self'}
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#FFC799] border border-white/5 text-xs transition-colors max-w-[150px] truncate"
                            title={banner.linkUrl}
                          >
                            <span className="truncate">{banner.linkUrl}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                          </a>
                        ) : (
                          <span className="text-zinc-600 text-xs italic">Không có link</span>
                        )}
                      </td>

                      {/* Column 5: Interactive isActive Switch */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center space-y-1">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(bannerId, banner.isActive)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              banner.isActive ? 'bg-emerald-500' : 'bg-zinc-700'
                            }`}
                            role="switch"
                            aria-checked={banner.isActive}
                            title={banner.isActive ? 'Bấm để ẩn banner' : 'Bấm để hiển thị banner'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                banner.isActive ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span
                            className={`text-[10px] font-medium ${
                              banner.isActive ? 'text-emerald-400' : 'text-zinc-500'
                            }`}
                          >
                            {banner.isActive ? 'Đang bật' : 'Tắt'}
                          </span>
                        </div>
                      </td>

                      {/* Column 6: Action Buttons (Edit UC-117 & Delete UC-118) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center space-x-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(banner)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-[#FFC799] text-[#F5F5F5] hover:text-[#101010] border border-white/10 hover:border-[#FFC799] text-xs font-semibold transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Sửa</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setBannerToDelete(banner)}
                            title="Xóa banner"
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 bg-white/[0.02] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#A0A0A0]">
            <div>
              Hiển thị trang <span className="font-bold text-white">{currentPage}</span> /{' '}
              <span className="font-bold text-white">{totalPages}</span> (Tổng cộng {totalCount} banner)
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Trước</span>
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pNum = i + 1;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      className={`w-7 h-7 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer ${
                        pNum === currentPage
                          ? 'bg-[#FFC799] text-[#101010]'
                          : 'bg-white/[0.05] text-[#A0A0A0] hover:text-white'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || loading}
                className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <span>Sau</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          EDIT BANNER MODAL (UC-117)
          ========================================== */}
      {editingBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#181818] border border-white/15 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFC799]/10 border border-[#FFC799]/30 flex items-center justify-center text-[#FFC799]">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Chỉnh Sửa Banner (UC-117)</h3>
                  <p className="text-xs text-[#A0A0A0]">
                    Mã banner: <span className="font-mono text-[#FFC799]">{editingBanner._id || editingBanner.id}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseEdit}
                disabled={isSubmitting}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center space-x-3 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-5">
              {/* Image Preview & Replacement Section */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
                  Hình ảnh Banner <span className="text-zinc-500 font-normal">(Ảnh hiện tại &amp; thay thế)</span>
                </label>

                <div className="relative w-full h-44 sm:h-52 rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center group shadow-inner">
                  {editImagePreview ? (
                    <img
                      src={editImagePreview}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-zinc-600 flex flex-col items-center space-y-2">
                      <ImageIcon className="w-10 h-10" />
                      <span className="text-xs">Chưa có ảnh</span>
                    </div>
                  )}

                  {/* Overlay upload button */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                    <label
                      htmlFor="edit-banner-file"
                      className="px-4 py-2.5 rounded-xl bg-[#FFC799] text-[#101010] font-bold text-xs cursor-pointer flex items-center space-x-2 shadow-lg hover:bg-[#FFB77D] transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{editImageFile ? 'Đổi tệp ảnh khác' : 'Tải lên ảnh mới thay thế'}</span>
                    </label>
                    <span className="text-[11px] text-zinc-300 mt-2">Hỗ trợ JPEG, PNG, WebP tối đa 5MB</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                  <div>
                    {editImageFile ? (
                      <span className="text-emerald-400 font-medium flex items-center space-x-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã chọn ảnh mới: {editImageFile.name} ({(editImageFile.size / 1024).toFixed(0)} KB)</span>
                      </span>
                    ) : (
                      <span>Đang hiển thị hình ảnh hiện tại trên máy chủ</span>
                    )}
                  </div>

                  <input
                    id="edit-banner-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleEditFileChange}
                    className="hidden"
                  />

                  {editImageFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditImageFile(null);
                        setEditImagePreview(getBannerImageUrl(editingBanner.imageUrl));
                      }}
                      className="text-xs text-red-400 hover:underline cursor-pointer"
                    >
                      Hủy ảnh mới &amp; giữ ảnh cũ
                    </button>
                  )}
                </div>
              </div>

              {/* Title input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
                  Tiêu đề Banner <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Nhập tiêu đề banner khuyến mãi..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFC799] transition-colors"
                  maxLength={100}
                />
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>Tiêu đề chính hiển thị trên slider trang chủ</span>
                  <span>{editTitle.length}/100</span>
                </div>
              </div>

              {/* Subtitle input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
                  Phụ đề / Thông điệp phụ
                </label>
                <input
                  type="text"
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  placeholder="Ví dụ: Nhận xe sân bay 0đ, nhập mã CHAOBANMOI..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFC799] transition-colors"
                />
              </div>

              {/* Link URL input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
                  Đường dẫn liên kết (linkUrl)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editLinkUrl}
                    onChange={(e) => setEditLinkUrl(e.target.value)}
                    placeholder="/bikes hoặc https://example.com"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFC799] transition-colors pr-10"
                  />
                  <ExternalLink className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[11px] text-zinc-500">
                  Đường dẫn nội bộ bắt đầu bằng "/" hoặc URL trang ngoài (http/https).
                </p>
              </div>

              {/* Order & Status row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
                    Thứ tự hiển thị (Order)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editOrder}
                    onChange={(e) => setEditOrder(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#FFC799] transition-colors font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
                    Trạng thái hiển thị
                  </label>
                  <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl px-4 py-2">
                    <span className="text-xs text-white">
                      {editIsActive ? 'Hiển thị công khai' : 'Tạm ẩn banner'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditIsActive(!editIsActive)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        editIsActive ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                      role="switch"
                      aria-checked={editIsActive}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          editIsActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-sm text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#FFB77D] text-[#101010] font-bold text-sm transition-all cursor-pointer shadow-lg shadow-[#FFC799]/10 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Lưu Thay Đổi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          ADD NEW BANNER MODAL (UC-116)
          ========================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#181818] border border-white/15 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFC799]/10 border border-[#FFC799]/30 flex items-center justify-center text-[#FFC799]">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Thêm Banner Khuyến Mãi Mới</h3>
                  <p className="text-xs text-[#A0A0A0]">Đăng tải hình ảnh banner và cấu hình vị trí hiển thị</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseAdd}
                disabled={isSubmitting}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center space-x-3 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdd} className="space-y-5">
              {/* File upload section */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
                  Hình ảnh Banner <span className="text-red-400">*</span>
                </label>

                {addImagePreview ? (
                  <div className="relative w-full h-44 sm:h-52 rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center group">
                    <img src={addImagePreview} alt="New Banner" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label
                        htmlFor="add-banner-file"
                        className="px-4 py-2 rounded-xl bg-[#FFC799] text-[#101010] font-bold text-xs cursor-pointer flex items-center space-x-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Chọn ảnh khác</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="add-banner-file"
                    className="w-full h-40 rounded-2xl border-2 border-dashed border-white/15 hover:border-[#FFC799]/50 bg-black/30 hover:bg-black/50 transition-all flex flex-col items-center justify-center cursor-pointer p-4 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.05] group-hover:bg-[#FFC799]/10 text-zinc-400 group-hover:text-[#FFC799] flex items-center justify-center transition-colors mb-2">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-white">Bấm để tải lên ảnh banner</span>
                    <span className="text-xs text-zinc-500 mt-1">Định dạng JPEG, PNG, WebP (Tối đa 5MB)</span>
                  </label>
                )}

                <input
                  id="add-banner-file"
                  type="file"
                  required={!addImageFile}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAddFileChange}
                  className="hidden"
                />
              </div>

              {/* Title input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
                  Tiêu đề Banner <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  placeholder="Ví dụ: Ưu đãi chào hè Đà Nẵng 2026..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFC799] transition-colors"
                  maxLength={100}
                />
              </div>

              {/* Subtitle input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
                  Phụ đề / Khẩu hiệu
                </label>
                <input
                  type="text"
                  value={addSubtitle}
                  onChange={(e) => setAddSubtitle(e.target.value)}
                  placeholder="Ví dụ: Giảm 20.000đ khi cọc online qua VNPay..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFC799] transition-colors"
                />
              </div>

              {/* Link URL input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
                  Đường dẫn liên kết (linkUrl)
                </label>
                <input
                  type="text"
                  value={addLinkUrl}
                  onChange={(e) => setAddLinkUrl(e.target.value)}
                  placeholder="/bikes hoặc https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFC799] transition-colors"
                />
              </div>

              {/* Order & Status row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
                    Thứ tự hiển thị (Order)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={addOrder}
                    onChange={(e) => setAddOrder(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#FFC799] transition-colors font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
                    Trạng thái kích hoạt
                  </label>
                  <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl px-4 py-2">
                    <span className="text-xs text-white">
                      {addIsActive ? 'Hiển thị ngay lập tức' : 'Tạo ở trạng thái ẩn'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAddIsActive(!addIsActive)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        addIsActive ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                      role="switch"
                      aria-checked={addIsActive}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          addIsActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCloseAdd}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-sm text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#FFB77D] text-[#101010] font-bold text-sm transition-all cursor-pointer shadow-lg shadow-[#FFC799]/10 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 stroke-[2.5]" />
                      <span>Tạo Banner Mới</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          DELETE CONFIRMATION MODAL (UC-118)
          ========================================== */}
      {bannerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#181818] border border-red-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Xác nhận xóa banner (UC-118)</h3>
                <p className="text-xs text-[#A0A0A0]">
                  Thao tác này sẽ gỡ bỏ banner khỏi giao diện trang chủ theo chính sách xóa mềm (soft delete).
                </p>
              </div>
            </div>

            {/* Banner Preview Card inside confirmation modal */}
            <div className="bg-[#121212] border border-white/10 rounded-xl p-4 flex items-center space-x-4">
              <div className="w-20 h-14 rounded-lg overflow-hidden border border-white/10 bg-[#202020] shrink-0">
                <img
                  src={getBannerImageUrl(bannerToDelete.imageUrl)}
                  alt={bannerToDelete.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80';
                  }}
                />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-xs text-[#FFC799] font-mono font-bold">
                  Thứ tự hiện tại: #{bannerToDelete.order}
                </p>
                <h4 className="text-sm font-bold text-white truncate">
                  {bannerToDelete.title}
                </h4>
                {bannerToDelete.subtitle && (
                  <p className="text-xs text-[#808080] truncate">{bannerToDelete.subtitle}</p>
                )}
              </div>
            </div>

            {/* Business Rule Warning Note */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-xs text-red-300 space-y-1">
              <p className="font-semibold text-red-200">
                Bạn có chắc chắn muốn xóa banner &ldquo;{bannerToDelete.title}&rdquo; không?
              </p>
              <p className="text-red-300/80 leading-relaxed">
                Hệ thống sẽ cập nhật trạng thái xóa mềm (set <code className="text-white">deletedAt = now()</code>), giữ nguyên hình ảnh để phục vụ tra cứu sau này và tự động chuẩn hóa lại thứ tự (1..n) cho các banner còn lại.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setBannerToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-white/10 bg-[#222222] hover:bg-[#2c2c2c] text-white text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                <span>Hủy bỏ</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-red-900/30 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBannersPage;
