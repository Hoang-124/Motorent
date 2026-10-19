import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Search,
  Filter,
} from 'lucide-react';
import type { Banner } from '../types';
import {
  getAdminBanners,
  deleteBanner,
  toggleBannerStatus,
  createBanner,
} from '../services/bannerService';

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

export const BannerManager: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const pageSize = 8;

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Delete Confirmation Modal State
  const [bannerToDelete, setBannerToDelete] = useState<Banner | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Add Banner Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newSubtitle, setNewSubtitle] = useState<string>('');
  const [newLinkUrl, setNewLinkUrl] = useState<string>('');
  const [newOrder, setNewOrder] = useState<string>('');
  const [newIsActive, setNewIsActive] = useState<boolean>(true);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImageUrlInput, setNewImageUrlInput] = useState<string>('');
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [formError, setFormError] = useState<string | null>(null);

  // Notification Toast State
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadBanners = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const activeParam =
        statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined;
      const res = await getAdminBanners(page, pageSize, activeParam);
      setBanners(res.items || []);
      setTotalCount(res.total || 0);
      setTotalPages(Math.max(1, res.totalPages || 1));
    } catch {
      setToast({
        type: 'error',
        message: 'Không thể tải danh sách banner từ máy chủ.',
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadBanners(currentPage);
  }, [currentPage, loadBanners]);

  // UC-118: Execute Delete Banner with business rules
  const handleConfirmDelete = async () => {
    if (!bannerToDelete) return;
    const bannerId = bannerToDelete._id || bannerToDelete.id;
    if (!bannerId) return;

    setSubmitting(true);
    try {
      await deleteBanner(bannerId);

      // Toast notification
      setToast({
        type: 'success',
        message: `Đã xóa banner "${bannerToDelete.title}" thành công.`,
      });

      setBannerToDelete(null);

      // Rule: Nếu xóa hết bản ghi của trang hiện tại thì lùi về trang trước
      if (banners.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        await loadBanners(currentPage);
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể xóa banner. Vui lòng thử lại sau.';
      setToast({
        type: 'error',
        message: errorMsg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Quick toggle active status
  const handleToggleStatus = async (banner: Banner) => {
    const bannerId = banner._id || banner.id;
    if (!bannerId) return;

    try {
      const updated = await toggleBannerStatus(bannerId, !banner.isActive);
      setBanners((prev) =>
        prev.map((b) => ((b._id || b.id) === bannerId ? { ...b, isActive: updated.isActive } : b))
      );
      setToast({
        type: 'success',
        message: `Đã ${updated.isActive ? 'hiển thị' : 'tạm ẩn'} banner "${banner.title}".`,
      });
    } catch {
      setToast({
        type: 'error',
        message: 'Không thể cập nhật trạng thái banner.',
      });
    }
  };

  // Add Banner submit (UC-116)
  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newTitle.trim()) {
      setFormError('Vui lòng nhập tiêu đề banner.');
      return;
    }

    if (imageMode === 'upload' && !newImageFile) {
      setFormError('Vui lòng chọn tệp hình ảnh để tải lên.');
      return;
    }

    if (imageMode === 'url' && !newImageUrlInput.trim()) {
      setFormError('Vui lòng nhập đường dẫn hình ảnh.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', newTitle.trim());
      if (newSubtitle.trim()) formData.append('subtitle', newSubtitle.trim());
      if (newLinkUrl.trim()) formData.append('linkUrl', newLinkUrl.trim());
      if (newOrder.trim()) formData.append('order', newOrder.trim());
      formData.append('isActive', String(newIsActive));

      if (imageMode === 'upload' && newImageFile) {
        formData.append('image', newImageFile);
      } else if (imageMode === 'url' && newImageUrlInput.trim()) {
        formData.append('imageUrl', newImageUrlInput.trim());
      }

      await createBanner(formData);

      setToast({
        type: 'success',
        message: 'Thêm mới banner quảng cáo thành công!',
      });

      // Reset modal form
      setIsAddModalOpen(false);
      setNewTitle('');
      setNewSubtitle('');
      setNewLinkUrl('');
      setNewOrder('');
      setNewIsActive(true);
      setNewImageFile(null);
      setNewImageUrlInput('');

      // Refresh list at page 1
      if (currentPage === 1) {
        await loadBanners(1);
      } else {
        setCurrentPage(1);
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể thêm banner mới. Vui lòng kiểm tra lại thông tin.';
      setFormError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBanners = banners.filter((b) => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      b.title.toLowerCase().includes(kw) ||
      (b.subtitle && b.subtitle.toLowerCase().includes(kw)) ||
      (b.linkUrl && b.linkUrl.toLowerCase().includes(kw))
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl shadow-2xl border text-sm transition-all duration-300 animate-slide-in ${
            toast.type === 'success'
              ? 'bg-[#18261e] border-emerald-500/30 text-emerald-300'
              : 'bg-[#291717] border-red-500/30 text-red-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161616] border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFC799]/10 border border-[#FFC799]/30 flex items-center justify-center text-[#FFC799]">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Quản lý Banner Quảng cáo (CMS UC-116 & UC-118)
              </h2>
              <p className="text-xs text-[#A0A0A0]">
                Cấu hình chuỗi banner xoay vòng trên trang chủ, áp dụng quy chuẩn xóa mềm (soft delete) và chuẩn hóa thứ tự tự động.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => loadBanners(currentPage)}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#202020] hover:bg-[#282828] text-[#F5F5F5] text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#ffb77d] text-[#101010] text-xs font-bold flex items-center space-x-2 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Banner Mới</span>
          </button>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#161616]/60 border border-white/5 rounded-xl p-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm theo tiêu đề hoặc liên kết..."
            className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#606060] focus:outline-none focus:border-[#FFC799] transition-all"
          />
          {searchKeyword && (
            <button
              type="button"
              onClick={() => setSearchKeyword('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center text-xs text-[#A0A0A0] mr-2">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <span>Lọc:</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#FFC799] text-[#101010]'
                : 'bg-[#202020] text-[#A0A0A0] hover:text-white'
            }`}
          >
            Tất cả ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('active');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-[#FFC799] text-[#101010]'
                : 'bg-[#202020] text-[#A0A0A0] hover:text-white'
            }`}
          >
            Đang hiển thị
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('inactive');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-[#FFC799] text-[#101010]'
                : 'bg-[#202020] text-[#A0A0A0] hover:text-white'
            }`}
          >
            Tạm ẩn
          </button>
        </div>
      </div>

      {/* Main Banner Table */}
      <div className="bg-[#161616] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-[#1A1A1A]/90 text-[#A0A0A0] uppercase font-bold tracking-wider">
                <th className="py-3.5 px-4 w-16 text-center">STT</th>
                <th className="py-3.5 px-4 w-36">Ảnh Banner</th>
                <th className="py-3.5 px-4">Tiêu đề & Nội dung</th>
                <th className="py-3.5 px-4 w-44">Liên kết (linkUrl)</th>
                <th className="py-3.5 px-4 w-32 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 w-36">Ngày tạo</th>
                <th className="py-3.5 px-4 w-28 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[#A0A0A0]">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Loader2 className="w-8 h-8 text-[#FFC799] animate-spin" />
                      <span>Đang tải danh sách banner quảng cáo...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBanners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[#A0A0A0]">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-[#A0A0A0]">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-white">Chưa có banner nào trong danh sách</p>
                      <p className="text-xs text-[#808080]">
                        Nhấn nút &ldquo;Thêm Banner Mới&rdquo; ở trên để khởi tạo banner đầu tiên.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBanners.map((banner) => {
                  const bannerId = banner._id || banner.id || '';
                  return (
                    <tr
                      key={bannerId}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Order Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#222222] border border-white/10 text-white font-mono font-bold text-xs">
                          {banner.order}
                        </span>
                      </td>

                      {/* Thumbnail Preview */}
                      <td className="py-3.5 px-4">
                        <div className="w-28 h-16 rounded-lg overflow-hidden border border-white/10 bg-[#202020] relative shrink-0">
                          <img
                            src={banner.imageUrl}
                            alt={banner.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://placehold.co/400x225/202020/white?text=No+Image';
                            }}
                          />
                        </div>
                      </td>

                      {/* Title & Subtitle */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <h4 className="font-bold text-white text-sm leading-tight line-clamp-1">
                            {banner.title}
                          </h4>
                          {banner.subtitle && (
                            <p className="text-xs text-[#A0A0A0] line-clamp-1">
                              {banner.subtitle}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Link URL */}
                      <td className="py-3.5 px-4">
                        {banner.linkUrl ? (
                          <a
                            href={banner.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1.5 text-xs text-[#FFC799] hover:underline font-mono truncate max-w-[160px]"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{banner.linkUrl}</span>
                          </a>
                        ) : (
                          <span className="text-[#606060] italic">Không liên kết</span>
                        )}
                      </td>

                      {/* Status Toggle Button */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(banner)}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all border ${
                            banner.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                          }`}
                        >
                          {banner.isActive ? (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>Hiển thị</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>Tạm ẩn</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-[#A0A0A0] text-xs">
                        {banner.createdAt
                          ? new Date(banner.createdAt).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Action: Delete Button */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setBannerToDelete(banner)}
                          title="Xóa banner"
                          className="px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center space-x-1.5 mx-auto transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#1A1A1A]/60">
            <div className="text-xs text-[#A0A0A0]">
              Hiển thị <span className="font-bold text-white">{filteredBanners.length}</span> trên tổng số{' '}
              <span className="font-bold text-white">{totalCount}</span> banner
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                className="p-2 rounded-lg border border-white/10 bg-[#202020] hover:bg-[#282828] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-xs font-mono font-bold text-white px-3 py-1 bg-[#101010] rounded-lg border border-white/10">
                Trang {currentPage} / {totalPages}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || loading}
                className="p-2 rounded-lg border border-white/10 bg-[#202020] hover:bg-[#282828] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* UC-118: DELETE CONFIRMATION MODAL (Nêu rõ tên banner & nguyên tắc xóa mềm) */}
      {/* ========================================================================= */}
      {bannerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#181818] border border-red-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Xác nhận xóa banner</h3>
                <p className="text-xs text-[#A0A0A0]">
                  Thao tác này sẽ gỡ bỏ banner khỏi giao diện trang chủ theo chính sách xóa mềm (soft delete).
                </p>
              </div>
            </div>

            {/* Banner Preview Card inside confirmation modal */}
            <div className="bg-[#121212] border border-white/10 rounded-xl p-4 flex items-center space-x-4">
              <div className="w-20 h-14 rounded-lg overflow-hidden border border-white/10 bg-[#202020] shrink-0">
                <img
                  src={bannerToDelete.imageUrl}
                  alt={bannerToDelete.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://placehold.co/400x225/202020/white?text=No+Image';
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
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-white/10 bg-[#222222] hover:bg-[#2c2c2c] text-white text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Hủy bỏ</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-red-900/30 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
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

      {/* ========================================================================= */}
      {/* UC-116: ADD BANNER MODAL (Dependency) */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[#181818] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#FFC799]/10 border border-[#FFC799]/30 flex items-center justify-center text-[#FFC799]">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Thêm Banner Quảng Cáo Mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBanner} className="space-y-4 text-xs">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-white">
                  Tiêu đề banner <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Ưu Đãi Chào Bạn Mới Giảm 20.000đ"
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-[#606060] focus:outline-none focus:border-[#FFC799]"
                />
              </div>

              {/* Subtitle */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-[#A0A0A0]">Phụ đề / Thông điệp phụ</label>
                <input
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="Ví dụ: Nhập mã CHAOBANMOI khi thanh toán cọc trực tuyến"
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-[#606060] focus:outline-none focus:border-[#FFC799]"
                />
              </div>

              {/* Image Input Selection Mode */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-white">
                    Hình ảnh banner <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setImageMode('upload')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                        imageMode === 'upload'
                          ? 'bg-[#FFC799] text-[#101010]'
                          : 'bg-[#222222] text-[#A0A0A0]'
                      }`}
                    >
                      Tải tệp lên
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode('url')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                        imageMode === 'url'
                          ? 'bg-[#FFC799] text-[#101010]'
                          : 'bg-[#222222] text-[#A0A0A0]'
                      }`}
                    >
                      Nhập URL ảnh
                    </button>
                  </div>
                </div>

                {imageMode === 'upload' ? (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewImageFile(e.target.files?.[0] || null)}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-white file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#FFC799] file:text-[#101010] cursor-pointer"
                  />
                ) : (
                  <input
                    type="url"
                    value={newImageUrlInput}
                    onChange={(e) => setNewImageUrlInput(e.target.value)}
                    placeholder="https://example.com/banner-image.jpg"
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-[#606060] focus:outline-none focus:border-[#FFC799]"
                  />
                )}
              </div>

              {/* Link URL */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-[#A0A0A0]">Đường dẫn điều hướng (linkUrl)</label>
                <input
                  type="text"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="/bikes hoặc https://motorent.vn/offers"
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-[#606060] focus:outline-none focus:border-[#FFC799]"
                />
              </div>

              {/* Order & Active Toggle */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-[#A0A0A0]">Thứ tự hiển thị (tùy chọn)</label>
                  <input
                    type="number"
                    min="1"
                    value={newOrder}
                    onChange={(e) => setNewOrder(e.target.value)}
                    placeholder="Tự động xếp cuối"
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-[#606060] focus:outline-none focus:border-[#FFC799]"
                  />
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="flex items-center space-x-2.5 p-2.5 bg-[#121212] border border-white/10 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsActive}
                      onChange={(e) => setNewIsActive(e.target.checked)}
                      className="rounded border-white/20 text-[#FFC799] focus:ring-0 cursor-pointer"
                    />
                    <span className="font-semibold text-white text-xs">Hiển thị ngay</span>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl border border-white/10 bg-[#222222] hover:bg-[#2c2c2c] text-white font-semibold transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#ffb77d] text-[#101010] font-bold flex items-center space-x-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu Banner</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
