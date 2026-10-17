import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { AlertCircle, Bike, CheckCircle2, FolderPlus, Layers3, Loader2, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { api } from '../services/api';
import type { Category } from '../types';

interface ManagedCategory extends Category {
  vehicleCount: number;
}

interface CategoryResponse {
  success: boolean;
  message?: string;
  data: ManagedCategory;
}

type CategoryDialog = { kind: 'create' } | { kind: 'edit' | 'delete'; category: ManagedCategory };

const normalizeSlug = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[đĐ]/g, 'd')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const apiMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError<{ message?: string }>(error)) return error.response?.data?.message || fallback;
  return fallback;
};

const inputClass = 'w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3.5 py-3 text-sm text-[#F5F5F5] outline-none transition focus:border-[#FFC799]/50 focus:ring-2 focus:ring-[#FFC799]/10 disabled:opacity-50';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#1E1E1E] px-4 py-2.5 text-sm font-medium text-[#F5F5F5] transition hover:bg-[#262626] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFC799] disabled:cursor-not-allowed disabled:opacity-40';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFC799] px-4 py-2.5 text-sm font-semibold text-[#101010] transition hover:bg-[#FFD6B3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFC799] disabled:cursor-not-allowed disabled:opacity-40';

export const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<ManagedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<CategoryDialog | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestRef = useRef(0);

  const loadCategories = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get<{ success: boolean; data: ManagedCategory[] }>('/categories', { signal });
      if (signal?.aborted || requestId !== requestRef.current) return;
      if (!response.data.success || !Array.isArray(response.data.data)) throw new Error('Invalid category response');
      setCategories(response.data.data);
    } catch (error) {
      if (!signal?.aborted && requestId === requestRef.current) {
        setLoadError(apiMessage(error, 'Không tải được danh mục xe. Vui lòng thử lại.'));
      }
    } finally {
      if (!signal?.aborted && requestId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadCategories(controller.signal);
    return () => controller.abort();
  }, [loadCategories]);

  useEffect(() => {
    if (dialog && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [dialog]);

  const visibleCategories = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return categories.filter((category) => `${category.name} ${category.slug} ${category.description || ''}`.toLocaleLowerCase('vi').includes(query));
  }, [categories, search]);
  const assignedVehicles = categories.reduce((total, category) => total + category.vehicleCount, 0);
  const unusedCategories = categories.filter((category) => category.vehicleCount === 0).length;

  const openDialog = (nextDialog: CategoryDialog) => {
    setDialog(nextDialog);
    setFormError('');
    setSuccess('');
    if (nextDialog.kind === 'create') {
      setName('');
      setSlug('');
      setDescription('');
      setSlugEdited(false);
    } else {
      setName(nextDialog.category.name);
      setSlug(nextDialog.category.slug);
      setDescription(nextDialog.category.description || '');
      setSlugEdited(true);
    }
  };

  const closeDialog = () => {
    if (!pending) setDialog(null);
  };

  const saveCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dialog || dialog.kind === 'delete' || pending) return;
    const cleanName = name.trim().replace(/\s+/g, ' ');
    const cleanSlug = normalizeSlug(slug);
    const cleanDescription = description.trim();
    if (cleanName.length < 2 || cleanSlug.length < 2) {
      setFormError('Tên và slug danh mục phải có ít nhất 2 ký tự.');
      return;
    }
    if (/[<>]/.test(`${cleanName}${slug}${cleanDescription}`)) {
      setFormError('Chỉ nhập văn bản thuần, không chứa thẻ HTML.');
      return;
    }
    setPending(true);
    setFormError('');
    try {
      const payload = { name: cleanName, slug: cleanSlug, description: cleanDescription };
      const response = dialog.kind === 'create'
        ? await api.post<CategoryResponse>('/categories', payload)
        : await api.put<CategoryResponse>(`/categories/${dialog.category._id}`, payload);
      if (!response.data.success || !response.data.data) throw new Error('Invalid category response');
      const saved = response.data.data;
      setCategories((current) => (dialog.kind === 'create'
        ? [...current, saved]
        : current.map((category) => category._id === saved._id ? saved : category)
      ).sort((left, right) => left.name.localeCompare(right.name, 'vi')));
      setSuccess(response.data.message || 'Đã lưu danh mục xe.');
      setDialog(null);
    } catch (error) {
      setFormError(apiMessage(error, 'Không lưu được danh mục. Vui lòng thử lại.'));
    } finally {
      setPending(false);
    }
  };

  const deleteCategory = async () => {
    if (!dialog || dialog.kind !== 'delete' || pending) return;
    setPending(true);
    setFormError('');
    try {
      const response = await api.delete<CategoryResponse>(`/categories/${dialog.category._id}`);
      if (!response.data.success) throw new Error('Invalid category response');
      setCategories((current) => current.filter((category) => category._id !== dialog.category._id));
      setSuccess(response.data.message || 'Đã xóa danh mục xe.');
      setDialog(null);
    } catch (error) {
      setFormError(apiMessage(error, 'Không xóa được danh mục. Vui lòng thử lại.'));
      // A vehicle may have been assigned after this page was loaded.
      if (isAxiosError(error) && error.response?.status === 409) void loadCategories();
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#101010] px-4 py-8 text-[#F5F5F5] sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FFC799]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Quản trị hệ thống
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Danh mục xe</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#A0A0A0]">Tổ chức các loại xe trên toàn hệ thống. Cập nhật tên, đường dẫn và mô tả để khách dễ tìm đúng loại xe.</p>
          </div>
          <button type="button" onClick={() => openDialog({ kind: 'create' })} disabled={pending || loading} className={primaryButton}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Thêm danh mục
          </button>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: 'Danh mục hiện có', value: categories.length, icon: Layers3 },
            { label: 'Xe đang được phân loại', value: assignedVehicles, icon: Bike },
            { label: 'Danh mục chưa có xe', value: unusedCategories, icon: FolderPlus },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#161616] p-5">
              <div className="rounded-xl border border-[#FFC799]/15 bg-[#FFC799]/10 p-3"><Icon className="h-5 w-5 text-[#FFC799]" aria-hidden="true" /></div>
              <div><p className="text-xs text-[#A0A0A0]">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{loading ? '—' : value}</p></div>
            </div>
          ))}
        </div>

        {success && <div role="status" className="flex items-center gap-3 rounded-xl border border-[#99FFE4]/20 bg-[#99FFE4]/[0.06] px-4 py-3 text-sm text-[#99FFE4]"><CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />{success}</div>}
        {loadError && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#FF8080]/20 bg-[#FF8080]/[0.06] px-4 py-3 text-sm text-[#FF8080]"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="flex-1">{loadError}</span><button type="button" onClick={() => void loadCategories()} disabled={loading || pending} className="font-semibold underline underline-offset-4 disabled:opacity-40">Thử lại</button></div>}

        <section aria-label="Danh sách danh mục xe" className="overflow-hidden rounded-2xl border border-white/10 bg-[#161616]">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <label className="relative block w-full sm:max-w-md"><Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[#6E6E6E]" aria-hidden="true" /><span className="sr-only">Tìm danh mục</span><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Tìm theo tên, slug hoặc mô tả…" className={`${inputClass} pl-10`} /></label>
            <button type="button" onClick={() => void loadCategories()} disabled={loading || pending} className={secondaryButton}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Làm mới</button>
          </div>

          {loading ? (
            <div role="status" className="flex min-h-64 items-center justify-center gap-3 text-sm text-[#A0A0A0]"><Loader2 className="h-5 w-5 animate-spin text-[#FFC799]" aria-hidden="true" />Đang tải danh mục xe…</div>
          ) : visibleCategories.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-white/[0.06] bg-[#1E1E1E]/50 text-[11px] uppercase tracking-wider text-[#A0A0A0]"><tr><th scope="col" className="px-5 py-3.5 font-medium">Danh mục</th><th scope="col" className="px-5 py-3.5 font-medium">Mô tả</th><th scope="col" className="px-5 py-3.5 text-center font-medium">Số xe</th><th scope="col" className="px-5 py-3.5 text-right font-medium">Thao tác</th></tr></thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {visibleCategories.map((category) => (
                    <tr key={category._id} className="transition hover:bg-white/[0.02]">
                      <th scope="row" className="max-w-xs px-5 py-5 font-normal"><p className="break-words font-semibold text-[#F5F5F5]">{category.name}</p><p className="mt-1 break-all font-mono text-xs text-[#FFC799]">{category.slug}</p></th>
                      <td className="max-w-md px-5 py-5 text-xs leading-relaxed text-[#A0A0A0]"><p className="whitespace-pre-line break-words">{category.description || 'Chưa có mô tả.'}</p></td>
                      <td className="px-5 py-5 text-center"><span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs tabular-nums ${category.vehicleCount > 0 ? 'border-[#FFC799]/20 bg-[#FFC799]/[0.06] text-[#FFC799]' : 'border-white/10 text-[#A0A0A0]'}`}>{category.vehicleCount} xe</span></td>
                      <td className="px-5 py-5"><div className="flex justify-end gap-2"><button type="button" onClick={() => openDialog({ kind: 'edit', category })} disabled={pending} aria-label={`Sửa danh mục ${category.name}`} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-[#F5F5F5] transition hover:border-[#FFC799]/40 hover:text-[#FFC799] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFC799] disabled:opacity-40"><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Sửa</button><button type="button" onClick={() => openDialog({ kind: 'delete', category })} disabled={pending} aria-label={`Xóa danh mục ${category.name}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#FF8080]/20 px-3 py-2 text-xs text-[#FF8080] transition hover:bg-[#FF8080]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF8080] disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Xóa</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center"><Layers3 className="mb-4 h-9 w-9 text-[#FFC799]" aria-hidden="true" /><h2 className="font-semibold">{search ? 'Không tìm thấy danh mục' : loadError ? 'Danh mục chưa tải được' : 'Chưa có danh mục xe'}</h2><p className="mt-2 max-w-sm text-sm text-[#A0A0A0]">{search ? 'Thử tìm bằng tên hoặc slug khác.' : loadError ? 'Chọn “Thử lại” để lấy dữ liệu mới nhất.' : 'Tạo danh mục đầu tiên để phân loại đội xe.'}</p>{!search && !loadError && <button type="button" onClick={() => openDialog({ kind: 'create' })} className={`${primaryButton} mt-5`}><Plus className="h-4 w-4" aria-hidden="true" />Thêm danh mục</button>}</div>
          )}
          {!loading && <div className="border-t border-white/[0.06] px-5 py-3 text-xs text-[#6E6E6E]">Hiển thị {visibleCategories.length} / {categories.length} danh mục. Số xe không bao gồm xe đã xóa.</div>}
        </section>
      </div>

      {dialog && (
        <dialog ref={dialogRef} aria-labelledby="category-dialog-title" aria-describedby="category-dialog-description" onCancel={(event) => { event.preventDefault(); closeDialog(); }} className="m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#161616] p-0 text-[#F5F5F5] shadow-2xl backdrop:bg-black/75">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6"><div><h2 id="category-dialog-title" className="text-xl font-semibold">{dialog.kind === 'create' ? 'Thêm danh mục xe' : dialog.kind === 'edit' ? 'Sửa danh mục xe' : 'Xóa danh mục xe'}</h2><p id="category-dialog-description" className="mt-2 text-xs leading-relaxed text-[#A0A0A0]">{dialog.kind === 'delete' ? 'Danh mục chỉ có thể xóa khi không còn xe sử dụng.' : 'Tên và slug phải là duy nhất trên toàn hệ thống.'}</p></div><button type="button" onClick={closeDialog} disabled={pending} aria-label="Đóng hộp thoại" className="rounded-lg p-2 text-[#A0A0A0] transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFC799] disabled:opacity-40"><X className="h-5 w-5" aria-hidden="true" /></button></div>
          {dialog.kind === 'delete' ? (
            <div className="space-y-5 p-5 sm:p-6">
              <p className="break-words text-sm leading-relaxed">Xóa danh mục <strong className="text-[#FFC799]">{dialog.category.name}</strong>? Thao tác này không thể hoàn tác.</p>
              {dialog.category.vehicleCount > 0 && <p className="rounded-xl border border-[#FFC799]/20 bg-[#FFC799]/[0.06] p-3 text-sm leading-relaxed text-[#FFC799]">Danh mục đang có {dialog.category.vehicleCount} xe. Hãy đổi danh mục của các xe trước khi xóa.</p>}
              {formError && <p role="alert" className="rounded-xl border border-[#FF8080]/20 bg-[#FF8080]/[0.06] p-3 text-sm leading-relaxed text-[#FF8080]">{formError}</p>}
              <div className="flex justify-end gap-3 border-t border-white/10 pt-5"><button type="button" onClick={closeDialog} disabled={pending} className={secondaryButton}>Hủy</button><button type="button" onClick={() => void deleteCategory()} disabled={pending || dialog.category.vehicleCount > 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF8080] px-4 py-2.5 text-sm font-semibold text-[#101010] transition hover:bg-[#FF9999] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF8080] disabled:cursor-not-allowed disabled:opacity-40">{pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}{pending ? 'Đang xóa…' : 'Xác nhận xóa'}</button></div>
            </div>
          ) : (
            <form onSubmit={(event) => void saveCategory(event)} className="space-y-5 p-5 sm:p-6">
              <div><label htmlFor="category-name" className="mb-2 block text-sm font-medium">Tên danh mục <span className="text-[#FFC799]">*</span></label><input id="category-name" value={name} onChange={(event) => { setName(event.target.value); if (dialog.kind === 'create' && !slugEdited) setSlug(normalizeSlug(event.target.value)); }} required minLength={2} maxLength={100} disabled={pending} autoFocus className={inputClass} placeholder="Ví dụ: Xe tay ga điện" /></div>
              <div><label htmlFor="category-slug" className="mb-2 block text-sm font-medium">Slug <span className="text-[#FFC799]">*</span></label><input id="category-slug" value={slug} onChange={(event) => { setSlug(event.target.value); setSlugEdited(true); }} required minLength={2} maxLength={120} disabled={pending} aria-describedby="category-slug-hint" className={`${inputClass} font-mono`} placeholder="xe-tay-ga-dien" /><p id="category-slug-hint" className="mt-2 break-all text-xs leading-relaxed text-[#6E6E6E]">Slug sau khi chuẩn hóa: <span className="text-[#A0A0A0]">{normalizeSlug(slug) || 'Chưa có'}</span>. Dùng chữ thường, số và dấu gạch ngang; tối đa 80 ký tự.</p></div>
              <div><label htmlFor="category-description" className="mb-2 block text-sm font-medium">Mô tả</label><textarea id="category-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={2000} disabled={pending} className={`${inputClass} resize-y`} placeholder="Đặc điểm của loại xe và nhu cầu sử dụng phù hợp…" /><p className="mt-1 text-right text-xs tabular-nums text-[#6E6E6E]">{description.length} / 2.000</p></div>
              {formError && <p role="alert" className="rounded-xl border border-[#FF8080]/20 bg-[#FF8080]/[0.06] p-3 text-sm leading-relaxed text-[#FF8080]">{formError}</p>}
              <div className="flex justify-end gap-3 border-t border-white/10 pt-5"><button type="button" onClick={closeDialog} disabled={pending} className={secondaryButton}>Hủy</button><button type="submit" disabled={pending} className={primaryButton}>{pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{pending ? 'Đang lưu…' : dialog.kind === 'create' ? 'Tạo danh mục' : 'Lưu thay đổi'}</button></div>
            </form>
          )}
        </dialog>
      )}
    </main>
  );
};

export default AdminCategoriesPage;
