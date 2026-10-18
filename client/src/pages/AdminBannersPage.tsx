import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Image as ImageIcon,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UploadCloud,
  X,
  Loader2,
  RotateCcw,
  Sparkles,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import type { Banner } from '../types';
import { getBannerImageUrl } from '../utils/imageHelper';

export const AdminBannersPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pagination & Filtering
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');

  // Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState<string>('');
  const [formLinkUrl, setFormLinkUrl] = useState<string>('');
  const [formOrder, setFormOrder] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (activeFilter !== 'all') {
        params.set('isActive', activeFilter);
      }

      const res = await api.get(`/admin/banners?${params.toString()}`);
      if (res.data?.success && res.data.data) {
        setBanners(res.data.data.items || []);
        setTotalPages(res.data.data.totalPages || 1);
        setTotalCount(res.data.data.total || 0);
      } else {
        setBanners([]);
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Không thể tải danh sách banner từ máy chủ.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, limit, activeFilter]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // Clean up object URL when modal closes or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle immediate file validation and preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (JPEG, JPG, PNG, WebP)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validExt = /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!allowedTypes.includes(file.type.toLowerCase()) && !validExt) {
      setFormError('Định dạng tệp không hợp lệ! Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.');
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFormError('Dung lượng tệp quá lớn! Vui lòng chọn tệp dưới 5MB.');
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Set file and preview
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemoveSelectedFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenAddModal = () => {
    setFormTitle('');
    setFormLinkUrl('');
    setFormOrder('');
    setFormIsActive(true);
    handleRemoveSelectedFile();
    setFormError(null);
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    handleRemoveSelectedFile();
    setFormError(null);
    setShowAddModal(false);
  };

  const handleSubmitBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate Title
    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle) {
      setFormError('Vui lòng nhập tiêu đề cho banner.');
      return;
    }
    if (trimmedTitle.length > 100) {
      setFormError('Tiêu đề banner không được vượt quá 100 ký tự.');
      return;
    }

    // Validate Image
    if (!selectedFile) {
      setFormError('Vui lòng chọn hình ảnh banner.');
      return;
    }

    // Validate LinkUrl if provided
    if (formLinkUrl.trim()) {
      const link = formLinkUrl.trim().toLowerCase();
      if (
        link.startsWith('javascript:') ||
        link.startsWith('data:') ||
        link.startsWith('vbscript:') ||
        link.startsWith('//')
      ) {
        setFormError('Đường dẫn linkUrl không an toàn hoặc chứa mã thực thi.');
        return;
      }
      if (!link.startsWith('/') && !link.startsWith('http://') && !link.startsWith('https://')) {
        setFormError('Đường dẫn phải bắt đầu bằng "/" (nội bộ) hoặc URL đầy đủ (http://, https://).');
        return;
      }
    }

    // Validate Order if provided
    if (formOrder.trim()) {
      const ord = Number(formOrder.trim());
      if (isNaN(ord) || ord < 1 || !Number.isInteger(ord)) {
        setFormError('Thứ tự hiển thị phải là số nguyên dương lớn hơn hoặc bằng 1.');
        return;
      }
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('title', trimmedTitle);
      formData.append('image', selectedFile);
      if (formLinkUrl.trim()) {
        formData.append('linkUrl', formLinkUrl.trim());
      }
      if (formOrder.trim()) {
        formData.append('order', formOrder.trim());
      }
      formData.append('isActive', String(formIsActive));

      const res = await api.post('/admin/banners', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.success) {
        setSuccessMsg(`Thêm banner "${trimmedTitle}" thành công!`);
        setTimeout(() => setSuccessMsg(null), 4000);
        handleCloseAddModal();
        fetchBanners();
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Không thể thêm banner. Vui lòng kiểm tra lại thông tin.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-widest text-[#FFC799]">
              <Layers className="w-4 h-4 text-[#FFC799]" />
              <span>HỆ THỐNG QUẢN TRỊ CMS • HOME BANNER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#F5F5F5] mt-1">
              Quản lý Banner Trang Chủ (UC-116)
            </h1>
            <p className="text-xs text-[#A0A0A0] mt-1">
              Thêm banner mới, cấu hình đường dẫn liên kết và quản lý trạng thái hiển thị trên giao diện trang chủ.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/counter"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#161616] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-[#F5F5F5] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#FFC799]" />
              <span>Quay lại Bàn giao</span>
            </Link>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#ffb67a] text-[#101010] font-bold text-xs transition-colors cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Thêm Banner mới</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Messages */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-[#FFC799]/10 border border-[#FFC799]/40 flex items-center space-x-3 text-xs sm:text-sm text-[#FFC799] animate-fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 flex items-center justify-between text-xs sm:text-sm text-red-200">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchBanners}
              className="px-3 py-1 rounded bg-red-900/60 hover:bg-red-800 text-xs font-semibold flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          </div>
        )}

        {/* Filter & Control Bar */}
        <div className="bg-[#161616] rounded-2xl border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#A0A0A0] font-medium mr-1">Bộ lọc hiển thị:</span>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('all');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-[#F5F5F5] text-[#101010]'
                  : 'bg-[#1E1E1E] text-[#A0A0A0] hover:text-[#F5F5F5]'
              }`}
            >
              Tất cả ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('true');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === 'true'
                  ? 'bg-[#FFC799] text-[#101010]'
                  : 'bg-[#1E1E1E] text-[#A0A0A0] hover:text-[#F5F5F5]'
              }`}
            >
              Đang hiển thị
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('false');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === 'false'
                  ? 'bg-white/20 text-[#F5F5F5]'
                  : 'bg-[#1E1E1E] text-[#A0A0A0] hover:text-[#F5F5F5]'
              }`}
            >
              Tạm ẩn
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={fetchBanners}
              disabled={loading}
              className="p-2 rounded-lg bg-[#1E1E1E] hover:bg-white/10 text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors cursor-pointer"
              title="Tải lại danh sách"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-[#FFC799]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Banner Table */}
        <div className="bg-[#161616] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#121212] border-b border-white/10 text-[#A0A0A0] uppercase font-mono-tabular tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold w-12 text-center">#</th>
                  <th className="py-3.5 px-4 font-semibold w-36">Ảnh Banner</th>
                  <th className="py-3.5 px-4 font-semibold">Tiêu đề Banner</th>
                  <th className="py-3.5 px-4 font-semibold">Đường dẫn liên kết</th>
                  <th className="py-3.5 px-4 font-semibold w-24 text-center">Thứ tự</th>
                  <th className="py-3.5 px-4 font-semibold w-32 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 font-semibold w-36 text-right">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {loading && banners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-[#A0A0A0]">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFC799] mb-3" />
                      <p>Đang tải danh sách banner hệ thống...</p>
                    </td>
                  </tr>
                ) : banners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-[#6E6E6E]">
                      <ImageIcon className="w-12 h-12 mx-auto stroke-1 text-white/20 mb-3" />
                      <p className="text-sm font-semibold text-[#A0A0A0]">Chưa có banner nào</p>
                      <p className="text-xs text-[#6E6E6E] mt-1">
                        Nhấn nút "Thêm Banner mới" ở góc phải trên để tạo banner đầu tiên cho trang chủ.
                      </p>
                    </td>
                  </tr>
                ) : (
                  banners.map((item, index) => {
                    const rowNum = (page - 1) * limit + index + 1;
                    const bannerImg = getBannerImageUrl(item.imageUrl);
                    return (
                      <tr
                        key={item._id || item.id || index}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono-tabular text-center text-[#6E6E6E]">
                          {rowNum}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="w-28 h-16 rounded-lg bg-[#101010] border border-white/10 overflow-hidden flex items-center justify-center relative group">
                            {bannerImg ? (
                              <img
                                src={bannerImg}
                                alt={item.title}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-white/20" />
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-[#F5F5F5] text-sm line-clamp-2">{item.title}</p>
                          <p className="text-[10px] font-mono text-[#6E6E6E] mt-0.5">
                            ID: {item._id || item.id}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          {item.linkUrl ? (
                            <a
                              href={item.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1.5 text-xs text-[#FFC799] hover:underline font-mono truncate max-w-xs"
                            >
                              <span className="truncate">{item.linkUrl}</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-[#6E6E6E] italic">Không liên kết</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-md bg-[#101010] border border-white/10 font-mono-tabular font-bold text-xs text-[#F5F5F5]">
                            {item.order}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {item.isActive ? (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>Hiển thị</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#A0A0A0] text-[11px] font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#6E6E6E]" />
                              <span>Tạm ẩn</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular text-[#A0A0A0]">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 bg-[#121212] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#A0A0A0]">
              <div>
                Hiển thị trang <span className="font-bold text-[#F5F5F5]">{page}</span> /{' '}
                <span className="font-bold text-[#F5F5F5]">{totalPages}</span> (Tổng cộng {totalCount} banner)
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="px-3 py-1.5 rounded-lg bg-[#1E1E1E] hover:bg-white/10 text-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors cursor-pointer"
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
                        onClick={() => setPage(pNum)}
                        className={`w-8 h-8 rounded-lg font-mono-tabular text-xs font-bold transition-colors cursor-pointer ${
                          pNum === page
                            ? 'bg-[#FFC799] text-[#101010]'
                            : 'bg-[#1E1E1E] text-[#A0A0A0] hover:text-[#F5F5F5]'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="px-3 py-1.5 rounded-lg bg-[#1E1E1E] hover:bg-white/10 text-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <span>Sau</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* =========================================================================
          ADD BANNER MODAL (FORM THÊM CÓ PREVIEW & VALIDATE TYPE/SIZE NGAY KHI CHỌN)
          ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-[#161616] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FFC799]/15 border border-[#FFC799]/30 flex items-center justify-center text-[#FFC799]">
                  <Plus className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F5F5F5]">Thêm Banner Mới</h3>
                  <p className="text-xs text-[#A0A0A0]">Thiết lập hình ảnh và thông số hiển thị trang chủ</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseAddModal}
                disabled={submitting}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Error Alert */}
            {formError && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 flex items-start space-x-2.5 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Add Banner Form */}
            <form onSubmit={handleSubmitBanner} className="space-y-5">

              {/* Title Field (Required, 1-100 chars, with live counter) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#F5F5F5] uppercase tracking-wider">
                    Tiêu đề Banner <span className="text-[#FFC799]">*</span>
                  </label>
                  <span
                    className={`text-[11px] font-mono-tabular ${
                      formTitle.length > 100 ? 'text-red-400 font-bold' : 'text-[#6E6E6E]'
                    }`}
                  >
                    {formTitle.length} / 100
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ví dụ: Khám Phá Đà Nẵng Trọn Vẹn Cùng Motorent"
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-xl bg-[#101010] border border-white/15 focus:border-[#FFC799] focus:outline-none text-sm text-[#F5F5F5] placeholder-[#6E6E6E] transition-colors"
                />
              </div>

              {/* Image Upload Area with Immediate Validation & Preview */}
              <div>
                <label className="block text-xs font-semibold text-[#F5F5F5] uppercase tracking-wider mb-1.5">
                  Hình ảnh Banner <span className="text-[#FFC799]">*</span>
                </label>

                {previewUrl ? (
                  /* Image Preview Box */
                  <div className="relative rounded-2xl border border-[#FFC799]/40 bg-[#101010] p-3 overflow-hidden group">
                    <div className="w-full h-48 sm:h-56 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center relative">
                      <img
                        src={previewUrl}
                        alt="Xem trước banner"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3.5 py-1.5 rounded-lg bg-[#FFC799] text-[#101010] text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-lg"
                        >
                          Đổi ảnh khác
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveSelectedFile}
                          className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-lg"
                        >
                          Xóa ảnh
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 px-1 flex items-center justify-between text-xs text-[#A0A0A0]">
                      <span className="truncate max-w-[280px] font-mono text-[11px] text-[#F5F5F5]">
                        {selectedFile?.name}
                      </span>
                      <span className="font-mono text-[11px] text-[#FFC799]">
                        {selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) : '0'} MB
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Upload Dropzone / Picker */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-44 rounded-2xl border-2 border-dashed border-white/20 hover:border-[#FFC799] bg-[#101010]/60 hover:bg-[#101010] transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-[#FFC799]/15 flex items-center justify-center text-[#A0A0A0] group-hover:text-[#FFC799] transition-colors mb-2.5">
                      <UploadCloud className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <p className="text-sm font-bold text-[#F5F5F5] group-hover:text-[#FFC799] transition-colors">
                      Nhấp để chọn ảnh tải lên
                    </p>
                    <p className="text-xs text-[#6E6E6E] mt-1">
                      Định dạng JPG, PNG hoặc WebP • Dung lượng tối đa 5MB
                    </p>
                  </div>
                )}

                {/* Hidden File Input with accept filter */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Link URL Field (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-[#F5F5F5] uppercase tracking-wider mb-1.5">
                  Đường dẫn liên kết (linkUrl) <span className="text-[#6E6E6E] font-normal lowercase">(tùy chọn)</span>
                </label>
                <input
                  type="text"
                  value={formLinkUrl}
                  onChange={(e) => setFormLinkUrl(e.target.value)}
                  placeholder="Ví dụ: /bikes hoặc https://motorent.vn/khuyen-mai"
                  className="w-full px-4 py-3 rounded-xl bg-[#101010] border border-white/15 focus:border-[#FFC799] focus:outline-none text-sm text-[#F5F5F5] placeholder-[#6E6E6E] transition-colors"
                />
                <p className="text-[11px] text-[#6E6E6E] mt-1">
                  Đường dẫn nội bộ phải bắt đầu bằng "/" hoặc URL hợp lệ có http(s)://
                </p>
              </div>

              {/* Order & Active Switch Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Order Input */}
                <div>
                  <label className="block text-xs font-semibold text-[#F5F5F5] uppercase tracking-wider mb-1.5">
                    Thứ tự hiển thị (order) <span className="text-[#6E6E6E] font-normal lowercase">(tùy chọn)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formOrder}
                    onChange={(e) => setFormOrder(e.target.value)}
                    placeholder="Mặc định: Tự động tăng"
                    className="w-full px-4 py-3 rounded-xl bg-[#101010] border border-white/15 focus:border-[#FFC799] focus:outline-none text-sm text-[#F5F5F5] placeholder-[#6E6E6E] font-mono transition-colors"
                  />
                  <p className="text-[10px] text-[#6E6E6E] mt-1">
                    Nếu để trống = số lớn nhất hiện tại + 1
                  </p>
                </div>

                {/* IsActive Toggle Box */}
                <div>
                  <label className="block text-xs font-semibold text-[#F5F5F5] uppercase tracking-wider mb-1.5">
                    Trạng thái kích hoạt
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-xl bg-[#101010] border border-white/15 cursor-pointer hover:border-white/25 transition-colors">
                    <span className="text-xs text-[#F5F5F5] font-medium">Bật hiển thị ngay</span>
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-[#FFC799] bg-[#1E1E1E] border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#FFC799]"
                    />
                  </label>
                  <p className="text-[10px] text-[#6E6E6E] mt-1">
                    Trang chủ chỉ hiển thị các banner đang bật
                  </p>
                </div>

              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#1E1E1E] hover:bg-white/10 text-[#F5F5F5] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#ffb67a] text-[#101010] text-xs font-bold transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer shadow-lg active:scale-95"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#101010]" />
                      <span>Đang tải lên &amp; lưu...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
                      <span>Lưu Banner</span>
                    </>
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

export default AdminBannersPage;
