import React, { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { api } from '../services/api';
import type { Category } from '../types';

interface CategoryDraft {
  name: string;
  slug: string;
  description: string;
}

const emptyDraft: CategoryDraft = { name: '', slug: '', description: '' };

const toSlug = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[đĐ]/g, 'd')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? 'Không thể kết nối tới máy chủ. Vui lòng thử lại.';
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
};

export const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [draft, setDraft] = useState<CategoryDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<{ data: Category[] }>('/categories');
      setCategories(response.data.data ?? []);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const resetForm = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setErrorMessage('');
    setNotice('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setNotice('');

    try {
      if (editingId) {
        const response = await api.put(`/categories/${editingId}`, {
          name: draft.name.trim(),
          description: draft.description.trim(),
        });
        setNotice(response.data.message ?? 'Cập nhật danh mục thành công.');
      } else {
        const response = await api.post('/categories', {
          name: draft.name.trim(),
          slug: draft.slug.trim(),
          description: draft.description.trim(),
        });
        setNotice(response.data.message ?? 'Tạo danh mục thành công.');
      }

      setDraft(emptyDraft);
      setEditingId(null);
      await loadCategories();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (category: Category) => {
    setEditingId(category._id);
    setDraft({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
    });
    setErrorMessage('');
    setNotice('');
  };

  const handleDelete = async (category: Category) => {
    const confirmed = window.confirm(`Xóa danh mục "${category.name}"? Danh mục còn xe được gán sẽ không thể xóa.`);
    if (!confirmed) return;

    setDeletingId(category._id);
    setErrorMessage('');
    setNotice('');
    try {
      const response = await api.delete(`/categories/${category._id}`);
      setCategories((current) => current.filter((item) => item._id !== category._id));
      if (editingId === category._id) resetForm();
      setNotice(response.data.message ?? 'Xóa danh mục thành công.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  const handleNameChange = (name: string) => {
    setDraft((current) => ({
      ...current,
      name,
      ...(editingId ? {} : { slug: toSlug(name) }),
    }));
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:pt-16">
      <div className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-emerald-400">Quản trị hệ thống</p>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Danh mục xe</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Tạo và cập nhật nhóm xe dùng trong bộ lọc đội xe. Danh mục đang được xe sử dụng sẽ được bảo vệ khỏi thao tác xóa.
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] px-5 py-3 sm:min-w-36">
          <p className="text-xs font-semibold text-slate-400">Tổng danh mục</p>
          <p className="mt-1 text-2xl font-black text-emerald-300">{categories.length}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
        <form onSubmit={handleSubmit} className="h-fit rounded-3xl border border-white/10 bg-[#091512] p-5 shadow-xl shadow-black/20 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">{editingId ? 'Cập nhật danh mục' : 'Thêm danh mục'}</h2>
              <p className="mt-1 text-xs text-slate-400">Các trường có dấu * là bắt buộc.</p>
            </div>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-xs font-semibold text-slate-400 transition hover:text-white">
                Hủy sửa
              </button>
            )}
          </div>

          <label className="mb-4 block text-xs font-semibold text-slate-300">
            Tên danh mục *
            <input
              required
              minLength={2}
              maxLength={80}
              value={draft.name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Ví dụ: Xe tay ga"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60"
            />
          </label>

          <label className="mb-4 block text-xs font-semibold text-slate-300">
            Slug *
            <input
              required
              minLength={2}
              maxLength={80}
              pattern="[A-Za-z0-9]+(-[A-Za-z0-9]+)*"
              title="Chỉ dùng chữ cái không dấu, số và dấu gạch ngang."
              value={draft.slug}
              onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))}
              readOnly={Boolean(editingId)}
              placeholder="xe-tay-ga"
              className={`mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60 ${editingId ? 'cursor-not-allowed text-slate-500' : ''}`}
            />
            <span className="mt-2 block font-normal text-slate-500">
              {editingId ? 'Slug được giữ ổn định khi sửa để không ảnh hưởng liên kết lọc xe.' : 'Slug tự tạo từ tên và có thể chỉnh sửa.'}
            </span>
          </label>

          <label className="mb-5 block text-xs font-semibold text-slate-300">
            Mô tả
            <textarea
              maxLength={500}
              rows={4}
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="Mô tả ngắn về nhóm xe"
              className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60"
            />
            <span className="mt-1 block text-right font-normal text-slate-500">{draft.description.length}/500</span>
          </label>

          {errorMessage && <p role="alert" className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs leading-5 text-red-300">{errorMessage}</p>}
          {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs leading-5 text-emerald-300">{notice}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-[#06100D] transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo danh mục'}
          </button>
        </form>

        <div className="rounded-3xl border border-white/10 bg-[#091512] p-5 shadow-xl shadow-black/20 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Danh sách hiện có</h2>
              <p className="mt-1 text-xs text-slate-400">Danh mục được sắp xếp theo tên.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadCategories()}
              disabled={loading}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-emerald-400/40 hover:text-white disabled:opacity-50"
            >
              {loading ? 'Đang tải...' : 'Tải lại'}
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-10 text-center text-sm text-slate-400">Đang tải danh mục...</div>
          ) : categories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
              <p className="text-sm font-semibold text-slate-300">Chưa có danh mục nào</p>
              <p className="mt-1 text-xs text-slate-500">Tạo danh mục đầu tiên bằng biểu mẫu bên cạnh.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {categories.map((category) => (
                <li key={category._id} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-white">{category.name}</h3>
                      <p className="mt-1 break-all font-mono text-xs text-emerald-300">{category.slug}</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                        {category.description || 'Chưa có mô tả.'}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(category)}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-300"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(category)}
                        disabled={deletingId === category._id}
                        className="rounded-lg border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {deletingId === category._id ? 'Đang xóa...' : 'Xóa'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};
