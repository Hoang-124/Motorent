import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock,
  Globe,
  RefreshCw,
  ExternalLink,
  X,
  HelpCircle,
  Shield,
  FileCheck2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { pageService } from '../services/pageService';
import type { StaticPage, StaticPageType } from '../types';
import { RichTextEditor } from '../components/RichTextEditor';

const SYSTEM_SLUGS = ['faq', 'terms', 'privacy'];

function generateSlugClient(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

export const AdminPagesPage: React.FC = () => {
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [publishFilter, setPublishFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingPage, setEditingPage] = useState<StaticPage | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    slug: string;
    type: StaticPageType;
    content: string;
    isPublished: boolean;
  }>({
    title: '',
    slug: '',
    type: 'Other',
    content: '',
    isPublished: false,
  });
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState<boolean>(false);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  // Preview modal state
  const [previewPage, setPreviewPage] = useState<{
    title: string;
    slug: string;
    type: StaticPageType;
    content: string;
    isPublished: boolean;
  } | null>(null);

  // Delete modal state
  const [pageToDelete, setPageToDelete] = useState<StaticPage | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const fetchPages = useCallback(async () => {
    try {
      setLoading(true);
      const params: {
        page: number;
        limit: number;
        type?: string;
        isPublished?: string;
        search?: string;
      } = {
        page: currentPage,
        limit: 10,
      };

      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (publishFilter === 'PUBLISHED') params.isPublished = 'true';
      if (publishFilter === 'DRAFT') params.isPublished = 'false';
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await pageService.getAdminPages(params);
      setPages(res.pages);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Không thể tải danh sách trang tĩnh.';
      setFeedback({ type: 'error', text: errorMsg || 'Lỗi khi tải dữ liệu.' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, typeFilter, publishFilter, searchQuery]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  // Handle open create modal
  const handleOpenCreate = () => {
    setEditingPage(null);
    setFormData({
      title: '',
      slug: '',
      type: 'Other',
      content: '<p>Nội dung trang bắt đầu tại đây...</p>',
      isPublished: true,
    });
    setIsSlugManuallyEdited(false);
    setIsFormOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (page: StaticPage) => {
    setEditingPage(page);
    setFormData({
      title: page.title,
      slug: page.slug,
      type: page.type,
      content: page.content,
      isPublished: page.isPublished,
    });
    setIsSlugManuallyEdited(true);
    setIsFormOpen(true);
  };

  // Title change -> auto-generate slug if not manually edited and not a system page
  const handleTitleChange = (val: string) => {
    const isSystem = editingPage && SYSTEM_SLUGS.includes(editingPage.slug);
    if (!isSlugManuallyEdited && !isSystem) {
      setFormData((prev) => ({
        ...prev,
        title: val,
        slug: generateSlugClient(val),
      }));
    } else {
      setFormData((prev) => ({ ...prev, title: val }));
    }
  };

  // Slug change
  const handleSlugChange = (val: string) => {
    setIsSlugManuallyEdited(true);
    setFormData((prev) => ({ ...prev, slug: val.toLowerCase().trim() }));
  };

  // Submit create or edit form
  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFeedback({ type: 'error', text: 'Vui lòng nhập tiêu đề trang.' });
      return;
    }

    try {
      setFormSubmitting(true);
      if (editingPage) {
        await pageService.updateAdminPage(editingPage._id, {
          title: formData.title,
          slug: formData.slug,
          type: formData.type,
          content: formData.content,
          isPublished: formData.isPublished,
        });
        setFeedback({ type: 'success', text: `Cập nhật trang "${formData.title}" thành công!` });
      } else {
        await pageService.createAdminPage({
          title: formData.title,
          slug: formData.slug || undefined,
          type: formData.type,
          content: formData.content,
          isPublished: formData.isPublished,
        });
        setFeedback({ type: 'success', text: `Tạo trang mới "${formData.title}" thành công!` });
      }

      setIsFormOpen(false);
      fetchPages();
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Thao tác không thành công.';
      setFeedback({ type: 'error', text: errorMsg || 'Lỗi khi lưu trang.' });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle publish status directly from list
  const handleTogglePublish = async (page: StaticPage) => {
    try {
      await pageService.updateAdminPage(page._id, {
        isPublished: !page.isPublished,
      });
      setFeedback({
        type: 'success',
        text: `Đã ${!page.isPublished ? 'xuất bản' : 'chuyển sang bản nháp'} trang "${page.title}".`,
      });
      fetchPages();
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Lỗi khi cập nhật trạng thái.';
      setFeedback({ type: 'error', text: errorMsg || 'Lỗi khi cập nhật.' });
    }
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!pageToDelete) return;
    try {
      setDeleteLoading(true);
      await pageService.deleteAdminPage(pageToDelete._id);
      setFeedback({ type: 'success', text: `Đã xóa trang "${pageToDelete.title}".` });
      setPageToDelete(null);
      fetchPages();
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Không thể xóa trang.';
      setFeedback({ type: 'error', text: errorMsg || 'Lỗi khi xóa trang.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const getTypeBadge = (type: StaticPageType) => {
    switch (type) {
      case 'FAQ':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#1D2E49] text-[#70A5FF] border border-[#2D456E]">
            <HelpCircle className="w-3 h-3" />
            FAQ
          </span>
        );
      case 'Terms':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#3B2C1A] text-[#FFC799] border border-[#5E4226]">
            <FileCheck2 className="w-3 h-3" />
            Điều khoản
          </span>
        );
      case 'Privacy':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#1B3629] text-[#7CE4AB] border border-[#26533D]">
            <Shield className="w-3 h-3" />
            Bảo mật
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#242424] text-[#D0D0D0] border border-white/10">
            <Layers className="w-3 h-3" />
            Khác
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Masthead Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#FFC799]">
              <Globe className="w-4 h-4" />
              <span>CMS CONTENT HUB • UC-119</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F5F5F5]">
              Quản Lý Trang Tĩnh &amp; Cẩm Nang Dịch Vụ
            </h1>
            <p className="text-xs sm:text-sm text-[#A0A0A0]">
              Quản lý các trang thông tin hệ thống (FAQ, Điều khoản, Bảo mật) và các bài viết cẩm nang công khai.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchPages}
              className="p-2.5 rounded-xl border border-white/12 bg-[#1A1A1A] hover:bg-white/[0.06] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors cursor-pointer"
              title="Tải lại danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Trang Mới</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs transition-all ${
              feedback.type === 'success'
                ? 'bg-[#183120] border-[#2A5C39] text-[#7CE4AB]'
                : 'bg-[#371919] border-[#692929] text-[#FF8585]'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="font-medium">{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="p-1 hover:opacity-75 transition-opacity cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-2xl bg-[#161616] border border-white/[0.08]">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#707070]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tiêu đề hoặc đường dẫn slug..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1E1E1E] border border-white/10 text-xs text-[#F5F5F5] placeholder-[#707070] focus:outline-none focus:border-[#FFC799]/50 transition-colors"
            />
          </div>

          {/* Type Filter */}
          <div className="md:col-span-4 flex items-center gap-1 overflow-x-auto p-1 bg-[#1A1A1A] rounded-xl border border-white/[0.06]">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'FAQ', label: 'FAQ' },
              { id: 'Terms', label: 'Điều khoản' },
              { id: 'Privacy', label: 'Bảo mật' },
              { id: 'Other', label: 'Khác' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setTypeFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  typeFilter === tab.id
                    ? 'bg-[#FFC799] text-[#101010]'
                    : 'text-[#A0A0A0] hover:text-[#F5F5F5]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Published Status Filter */}
          <div className="md:col-span-3 flex items-center gap-1 p-1 bg-[#1A1A1A] rounded-xl border border-white/[0.06]">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'PUBLISHED', label: 'Công khai' },
              { id: 'DRAFT', label: 'Bản nháp' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setPublishFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  publishFilter === tab.id
                    ? 'bg-white/20 text-[#F5F5F5]'
                    : 'text-[#A0A0A0] hover:text-[#F5F5F5]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#161616] overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-[#FFC799]" />
              <p className="text-xs text-[#A0A0A0]">Đang tải dữ liệu trang tĩnh...</p>
            </div>
          ) : pages.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <FileText className="w-10 h-10 mx-auto text-[#505050]" />
              <p className="text-sm font-medium text-[#A0A0A0]">Không tìm thấy trang tĩnh nào</p>
              <p className="text-xs text-[#707070]">Thử điều chỉnh bộ lọc hoặc tạo trang mới</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#1A1A1A] text-[#A0A0A0] uppercase font-mono tracking-wider">
                    <th className="py-3.5 px-4">Tiêu đề &amp; Đường dẫn</th>
                    <th className="py-3.5 px-4">Phân loại</th>
                    <th className="py-3.5 px-4 text-center">Trạng thái</th>
                    <th className="py-3.5 px-4">Cập nhật lần cuối</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {pages.map((p) => {
                    const isSystem = SYSTEM_SLUGS.includes(p.slug);
                    return (
                      <tr key={p._id} className="hover:bg-white/[0.02] transition-colors">
                        {/* Title & Slug */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-sm text-[#F5F5F5]">{p.title}</span>
                              {isSystem && (
                                <span
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] bg-[#3B2C1A] text-[#FFC799] border border-[#5E4226]"
                                  title="Trang hệ thống: Được bảo vệ vĩnh viễn, không được xóa hoặc đổi slug."
                                >
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Hệ thống</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <code className="text-[11px] font-mono text-[#FFC799] bg-[#1E1E1E] px-2 py-0.5 rounded border border-white/[0.06]">
                                /{p.slug}
                              </code>
                              {p.isPublished && (
                                <a
                                  href={`/pages/${p.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#707070] hover:text-[#F5F5F5] transition-colors"
                                  title="Xem trang công khai"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-4 px-4">{getTypeBadge(p.type)}</td>

                        {/* Publish Status Toggle */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(p)}
                            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                              p.isPublished
                                ? 'bg-[#183120] text-[#7CE4AB] border border-[#2A5C39] hover:bg-[#20402A]'
                                : 'bg-[#2A2A2A] text-[#909090] border border-white/10 hover:bg-[#333333]'
                            }`}
                            title="Nhấp để thay đổi trạng thái xuất bản"
                          >
                            {p.isPublished ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Công khai</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                <span>Bản nháp</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Updated Info */}
                        <td className="py-4 px-4 text-[#A0A0A0]">
                          <div className="space-y-0.5">
                            <p className="font-mono text-[11px]">
                              {new Date(p.updatedAt).toLocaleDateString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </p>
                            {p.updatedBy && typeof p.updatedBy === 'object' && (
                              <p className="text-[10px] text-[#707070]">
                                Bởi {p.updatedBy.firstName || p.updatedBy.username}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Preview */}
                            <button
                              onClick={() => setPreviewPage(p)}
                              className="p-2 rounded-lg bg-[#1E1E1E] hover:bg-white/[0.08] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors cursor-pointer"
                              title="Xem trước nội dung"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-2 rounded-lg bg-[#1E1E1E] hover:bg-[#FFC799]/20 text-[#A0A0A0] hover:text-[#FFC799] transition-colors cursor-pointer"
                              title="Chỉnh sửa trang"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete (Disabled if system page) */}
                            {isSystem ? (
                              <div
                                className="p-2 text-[#404040] cursor-not-allowed"
                                title="Trang hệ thống không thể xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5 opacity-30" />
                              </div>
                            ) : (
                              <button
                                onClick={() => setPageToDelete(p)}
                                className="p-2 rounded-lg bg-[#1E1E1E] hover:bg-red-500/20 text-[#A0A0A0] hover:text-red-400 transition-colors cursor-pointer"
                                title="Xóa trang"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="py-3 px-4 border-t border-white/[0.08] bg-[#1A1A1A] flex items-center justify-between text-xs text-[#A0A0A0]">
              <p>
                Hiển thị trang <span className="text-[#F5F5F5] font-semibold">{currentPage}</span> / {totalPages} (Tổng số {total} trang)
              </p>
              <div className="flex items-center space-x-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-[#161616] text-[#A0A0A0] hover:text-[#F5F5F5] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  Trang trước
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-[#161616] text-[#A0A0A0] hover:text-[#F5F5F5] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  Trang kế
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#181818] border border-white/12 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#1F1F1F]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#FFC799]/10 text-[#FFC799]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#F5F5F5]">
                    {editingPage ? `Chỉnh Sửa Trang: ${editingPage.title}` : 'Thêm Trang Tĩnh Mới'}
                  </h3>
                  <p className="text-xs text-[#A0A0A0]">
                    {editingPage && SYSTEM_SLUGS.includes(editingPage.slug)
                      ? 'Trang hệ thống: được bảo vệ slug, cho phép chỉnh sửa nội dung & giao diện.'
                      : 'Định dạng nội dung bài viết và cấu hình đường dẫn công khai.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePage} className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#D0D0D0]">
                    Tiêu đề trang <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Ví dụ: Quy định giao xe tại sân bay Đà Nẵng"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#121212] border border-white/12 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]/50 transition-colors"
                  />
                </div>

                {/* Slug */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#D0D0D0] flex items-center justify-between">
                    <span>Đường dẫn định danh (Slug)</span>
                    {editingPage && SYSTEM_SLUGS.includes(editingPage.slug) && (
                      <span className="text-[10px] font-mono text-[#FFC799] flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Cố định hệ thống
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#707070]">
                      /pages/
                    </span>
                    <input
                      type="text"
                      required
                      disabled={Boolean(editingPage && SYSTEM_SLUGS.includes(editingPage.slug))}
                      value={formData.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="quy-dinh-giao-xe"
                      className="w-full pl-18 pr-3.5 py-2.5 rounded-xl bg-[#121212] border border-white/12 text-xs font-mono text-[#FFC799] focus:outline-none focus:border-[#FFC799]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#D0D0D0]">Phân loại trang</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as StaticPageType })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#121212] border border-white/12 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]/50 transition-colors"
                  >
                    <option value="FAQ">FAQ (Câu hỏi thường gặp)</option>
                    <option value="Terms">Terms (Điều khoản dịch vụ)</option>
                    <option value="Privacy">Privacy (Chính sách bảo mật)</option>
                    <option value="Other">Other (Trang tĩnh / Cẩm nang khác)</option>
                  </select>
                </div>

                {/* Published Toggle Switch */}
                <div className="space-y-1.5 pt-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                      className="w-4 h-4 accent-[#FFC799] rounded cursor-pointer"
                    />
                    <div>
                      <p className="text-xs font-semibold text-[#F5F5F5]">Xuất bản công khai (Published)</p>
                      <p className="text-[11px] text-[#A0A0A0]">
                        {formData.isPublished
                          ? 'Trang sẽ hiển thị công khai cho mọi khách truy cập.'
                          : 'Trang chỉ ở chế độ bản nháp nội bộ, khách hàng xem sẽ nhận mã lỗi 404.'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Rich Text Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#D0D0D0]">Nội dung trang</label>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewPage({
                        title: formData.title || 'Xem trước tiêu đề',
                        slug: formData.slug || 'slug-xem-truoc',
                        type: formData.type,
                        content: formData.content,
                        isPublished: formData.isPublished,
                      })
                    }
                    className="inline-flex items-center space-x-1.5 text-xs text-[#FFC799] hover:text-[#FFD6B3] font-medium cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem trước trang</span>
                  </button>
                </div>
                <RichTextEditor
                  value={formData.content}
                  onChange={(html) => setFormData((prev) => ({ ...prev, content: html }))}
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/12 text-xs font-medium text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] text-xs font-bold transition-all shadow disabled:opacity-50 cursor-pointer flex items-center space-x-2"
                >
                  {formSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingPage ? 'Lưu Thay Đổi' : 'Tạo Trang'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#121212] border border-white/12 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Top Bar */}
            <div className="px-6 py-3.5 border-b border-white/[0.08] bg-[#1A1A1A] flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs">
                <Sparkles className="w-4 h-4 text-[#FFC799]" />
                <span className="font-semibold text-[#F5F5F5]">Xem Trước Trang Công Khai</span>
                <span className="text-[#707070]">•</span>
                <span className="font-mono text-[#FFC799]">/pages/{previewPage.slug}</span>
              </div>
              <button
                onClick={() => setPreviewPage(null)}
                className="p-1 rounded-lg text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Public Page Header */}
            <div className="p-6 border-b border-white/[0.06] bg-[#161616]">
              <div className="flex items-center space-x-2 mb-2">
                {getTypeBadge(previewPage.type)}
                {!previewPage.isPublished && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Bản nháp (Khách xem &rarr; 404)
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F5F5]">
                {previewPage.title}
              </h2>
            </div>

            {/* Simulated Content Area */}
            <div className="p-6 overflow-y-auto bg-[#101010] flex-1">
              <div
                className="prose prose-invert max-w-none text-[#D0D0D0] text-sm leading-relaxed space-y-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-[#F5F5F5] [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#FFC799] [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[#F5F5F5] [&_p]:text-sm [&_p]:text-[#D0D0D0] [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-sm [&_blockquote]:border-l-2 [&_blockquote]:border-[#FFC799] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#A0A0A0] [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-white/10 [&_th]:p-2 [&_td]:border [&_td]:border-white/10 [&_td]:p-2"
                dangerouslySetInnerHTML={{ __html: previewPage.content }}
              />
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {pageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#181818] border border-white/12 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="p-2.5 rounded-full bg-red-500/10 border border-red-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-[#F5F5F5]">Xác Nhận Xóa Trang Tĩnh</h3>
            </div>
            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              Bạn có chắc chắn muốn xóa trang{' '}
              <strong className="text-[#F5F5F5] font-semibold">"{pageToDelete.title}"</strong> (
              <span className="font-mono text-[#FFC799]">/{pageToDelete.slug}</span>)? Hành động này không thể hoàn tác.
            </p>
            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setPageToDelete(null)}
                className="px-4 py-2 rounded-xl border border-white/12 text-xs font-medium text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteConfirm}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center space-x-2"
              >
                {deleteLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Xóa Vĩnh Viễn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
