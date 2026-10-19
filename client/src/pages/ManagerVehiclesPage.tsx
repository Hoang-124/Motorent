import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, Bike, CheckCircle2, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Branch, Category, Vehicle } from '../types';
import { VehiclePricingPanel } from '../components/VehiclePricingPanel';

const inputClass = 'w-full rounded-xl border border-white/15 bg-[#101010] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#FFC799] disabled:text-[#888] disabled:cursor-not-allowed';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm hover:border-[#FFC799] disabled:opacity-50 disabled:cursor-not-allowed';
const statusLabels: Record<Vehicle['status'], string> = { Available: 'Sẵn sàng', Rented: 'Đang thuê', Maintenance: 'Bảo dưỡng', Transferring: 'Điều chuyển' };
const refId = (value: string | { _id: string } | undefined) => typeof value === 'string' ? value : value?._id ?? '';
const errorText = (error: unknown) => axios.isAxiosError(error) ? error.response?.data?.message || 'Không kết nối được máy chủ. Vui lòng thử lại.' : 'Thao tác chưa thành công. Vui lòng thử lại.';

interface FormState {
  branchId: string; category: string; brand: string; vehicleModel: string; licensePlate: string;
  dailyPrice: string; hourlyPrice: string; transmissionType: Vehicle['transmissionType']; fuelType: Vehicle['fuelType'];
  yearManufactured: string; color: string; odometer: string; images: string; status: Vehicle['status'];
}
const emptyForm = (branchId: string): FormState => ({ branchId, category: '', brand: '', vehicleModel: '', licensePlate: '', dailyPrice: '200000', hourlyPrice: '30000', transmissionType: 'Automatic', fuelType: 'Gasoline', yearManufactured: String(new Date().getFullYear()), color: '', odometer: '0', images: '', status: 'Available' });

export function ManagerVehiclesPage() {
  const { user } = useAuth();
  const ownBranchId = refId(user?.branchId);
  const isAdmin = user?.roles === 'SystemAdmin';
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(() => emptyForm(ownBranchId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pricingId, setPricingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const editRef = useRef<HTMLElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [fleet, branchResponse, categoryResponse] = await Promise.all([api.get('/vehicles/management'), api.get('/branches'), api.get('/categories')]);
      setVehicles(fleet.data.data);
      setBranches(branchResponse.data.data);
      setCategories(categoryResponse.data.data);
      setError('');
    } catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { if (pricingId) priceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [pricingId]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm(ownBranchId)); };
  const edit = (vehicle: Vehicle) => {
    setEditingId(vehicle._id); setError(''); setNotice('');
    setForm({ branchId: refId(vehicle.branchId), category: refId(vehicle.category), brand: vehicle.brand, vehicleModel: vehicle.vehicleModel, licensePlate: vehicle.licensePlate, dailyPrice: String(vehicle.dailyPrice), hourlyPrice: vehicle.hourlyPrice === undefined ? '' : String(vehicle.hourlyPrice), transmissionType: vehicle.transmissionType, fuelType: vehicle.fuelType, yearManufactured: String(vehicle.yearManufactured ?? ''), color: vehicle.color ?? '', odometer: String(vehicle.odometer), images: vehicle.images.join('\n'), status: vehicle.status });
    editRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    const imageUrls = form.images.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (imageUrls.length > 10) { setError('Mỗi xe có tối đa 10 ảnh. Hãy giảm số URL ảnh.'); return; }
    if (imageUrls.some((url) => { try { return !['http:', 'https:'].includes(new URL(url).protocol); } catch { return true; } })) { setError('Mỗi dòng ảnh cần là một URL http hoặc https hợp lệ.'); return; }
    const payload = { branchId: form.branchId, category: form.category, brand: form.brand.trim(), vehicleModel: form.vehicleModel.trim(), transmissionType: form.transmissionType, fuelType: form.fuelType, ...(form.yearManufactured ? { yearManufactured: Number(form.yearManufactured) } : {}), color: form.color.trim(), odometer: Number(form.odometer), images: imageUrls };
    setPending(true);
    try {
      if (editingId) {
        const existing = vehicles.find((vehicle) => vehicle._id === editingId);
        await api.put(`/vehicles/${editingId}`, { ...payload, ...(existing?.status !== form.status ? { status: form.status } : {}) });
      } else {
        await api.post('/vehicles', { ...payload, licensePlate: form.licensePlate.trim(), dailyPrice: Number(form.dailyPrice), ...(form.hourlyPrice ? { hourlyPrice: Number(form.hourlyPrice) } : {}) });
      }
      const wasEditing = Boolean(editingId);
      cancelEdit(); await reload(); setNotice(wasEditing ? 'Đã lưu thông tin xe.' : 'Đã thêm xe. Biển số sẽ không thể thay đổi.');
    } catch (cause) { setError(errorText(cause)); }
    finally { setPending(false); }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    setPending(true); setError(''); setNotice('');
    try {
      await api.delete(`/vehicles/${deleteTarget._id}`);
      if (editingId === deleteTarget._id) cancelEdit();
      if (pricingId === deleteTarget._id) setPricingId(null);
      setDeleteTarget(null); await reload(); setNotice('Đã ngừng khai thác xe. Lịch sử đơn thuê được giữ lại.');
    } catch (cause) { setError(errorText(cause)); setDeleteTarget(null); }
    finally { setPending(false); }
  };
  const filtered = vehicles.filter((vehicle) => `${vehicle.brand} ${vehicle.vehicleModel} ${vehicle.licensePlate}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const pricingVehicle = vehicles.find((vehicle) => vehicle._id === pricingId);
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[#F5F5F5]">
    <header className="flex flex-wrap items-start justify-between gap-4 pb-6 mb-6 border-b border-white/10">
      <div><p className="text-xs uppercase tracking-widest text-[#FFC799] mb-2">UC67–72 · {isAdmin ? 'Quản trị hệ thống' : 'Quản lý chi nhánh'}</p><h1 className="text-3xl font-semibold">Quản lý xe & giá thuê</h1><p className="text-sm text-[#A0A0A0] mt-2">Biển số duy nhất, tối đa 10 ảnh mỗi xe. Giá mùa vụ được tính vào báo giá đặt xe.</p></div>
      <Link to="/manager/fleet" className={buttonClass}>Điều chuyển & bảo dưỡng</Link>
    </header>
    {error && <div role="alert" className="mb-5 rounded-xl border border-[#FF8080]/40 bg-[#FF8080]/10 p-4 text-[#FFAAAA] flex gap-2"><AlertCircle size={18} className="shrink-0" />{error}</div>}
    {notice && <div role="status" className="mb-5 rounded-xl border border-[#FFC799]/30 p-4 text-[#FFC799] flex gap-2"><CheckCircle2 size={18} />{notice}</div>}
    <div className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
      <section ref={editRef} className="scroll-mt-28 rounded-2xl border border-white/15 bg-[#161616] p-5">
        <div className="flex items-center justify-between mb-5"><h2 className="font-semibold text-lg">{editingId ? 'Cập nhật thông tin xe' : 'Thêm xe mới'}</h2>{editingId && <button type="button" className="text-sm text-[#FFC799]" onClick={cancelEdit} disabled={pending}>Hủy sửa</button>}</div>
        <form onSubmit={submit}><fieldset disabled={pending} className="space-y-4">
          <label className="block text-sm">Chi nhánh *<select aria-label="Chi nhánh xe" className={`${inputClass} mt-1`} value={form.branchId} onChange={(event) => setField('branchId', event.target.value)} disabled={!isAdmin || Boolean(editingId)} required><option value="">Chọn chi nhánh</option>{branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm">Thương hiệu *<input className={`${inputClass} mt-1`} required minLength={2} value={form.brand} onChange={(event) => setField('brand', event.target.value)} placeholder="Yamaha" /></label><label className="text-sm">Tên mẫu xe *<input className={`${inputClass} mt-1`} required minLength={2} value={form.vehicleModel} onChange={(event) => setField('vehicleModel', event.target.value)} placeholder="Sirius Test UC67" /></label></div>
          <label className="block text-sm">Biển số *<input className={`${inputClass} mt-1 uppercase`} required minLength={6} maxLength={24} value={form.licensePlate} onChange={(event) => setField('licensePlate', event.target.value)} disabled={Boolean(editingId)} placeholder="43-TA 670.01" /><span className="text-xs text-[#A0A0A0]">Được giữ duy nhất kể cả khi xe đã ngừng khai thác.</span></label>
          <label className="block text-sm">Danh mục *<select className={`${inputClass} mt-1`} required value={form.category} onChange={(event) => setField('category', event.target.value)}><option value="">Chọn danh mục</option>{categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
          {!editingId ? <div className="grid grid-cols-2 gap-3"><label className="text-sm">Giá ngày (đ) *<input className={`${inputClass} mt-1`} type="number" min="1" step="1" required value={form.dailyPrice} onChange={(event) => setField('dailyPrice', event.target.value)} /></label><label className="text-sm">Giá giờ (đ)<input className={`${inputClass} mt-1`} type="number" min="1" step="1" value={form.hourlyPrice} onChange={(event) => setField('hourlyPrice', event.target.value)} /></label></div> : <p className="text-xs text-[#FFC799]">Để đổi giá ngày/giờ hoặc kỳ giá, bấm “Giá & mùa vụ” ở xe tương ứng.</p>}
          <div className="grid grid-cols-2 gap-3"><label className="text-sm">Truyền động<select className={`${inputClass} mt-1`} value={form.transmissionType} onChange={(event) => setField('transmissionType', event.target.value as Vehicle['transmissionType'])}><option value="Automatic">Tự động</option><option value="Manual">Số tay</option><option value="Semi-Auto">Bán tự động</option></select></label><label className="text-sm">Nhiên liệu<select className={`${inputClass} mt-1`} value={form.fuelType} onChange={(event) => setField('fuelType', event.target.value as Vehicle['fuelType'])}><option value="Gasoline">Xăng</option><option value="Electric">Điện</option></select></label></div>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm">Năm sản xuất<input className={`${inputClass} mt-1`} type="number" min="1950" max={new Date().getFullYear() + 1} step="1" value={form.yearManufactured} onChange={(event) => setField('yearManufactured', event.target.value)} /></label><label className="text-sm">Màu xe<input className={`${inputClass} mt-1`} value={form.color} onChange={(event) => setField('color', event.target.value)} placeholder="Xanh đen" /></label></div>
          <label className="block text-sm">Số km đã đi (ODO)<input className={`${inputClass} mt-1`} type="number" min={editingId ? vehicles.find((vehicle) => vehicle._id === editingId)?.odometer ?? 0 : 0} step="1" required value={form.odometer} onChange={(event) => setField('odometer', event.target.value)} /><span className="text-xs text-[#A0A0A0]">Không giảm ODO. Mỗi mốc 1.500 km phát cảnh báo bảo dưỡng.</span></label>
          {editingId && <label className="block text-sm">Trạng thái<select className={`${inputClass} mt-1`} value={form.status} onChange={(event) => setField('status', event.target.value as Vehicle['status'])}><option value="Available">Sẵn sàng</option><option value="Maintenance">Bảo dưỡng</option>{['Rented', 'Transferring'].includes(form.status) && <option value={form.status}>{statusLabels[form.status]}</option>}</select><span className="text-xs text-[#A0A0A0]">Xe có đơn thuê hoặc phiếu xử lý phải hoàn tất quy trình trước.</span></label>}
          <label className="block text-sm">URL ảnh, mỗi dòng một URL<textarea rows={5} className={`${inputClass} mt-1 resize-y`} value={form.images} onChange={(event) => setField('images', event.target.value)} placeholder="https://.../anh-truoc.jpg" /><span className="text-xs text-[#A0A0A0]">{form.images.split(/\r?\n/).filter((line) => line.trim()).length}/10 ảnh · URL http/https</span></label>
          <button disabled={pending || loading || !form.branchId} className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-[#FFC799] px-4 py-3 font-semibold text-[#101010] disabled:opacity-50"><Plus size={17} />{pending ? 'Đang lưu…' : editingId ? 'Lưu thông tin xe' : 'Thêm xe vào chi nhánh'}</button>
        </fieldset></form>
      </section>
      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3"><h2 className="text-xl font-semibold">Danh sách xe ({vehicles.length})</h2><button onClick={() => void reload()} disabled={loading || pending} className={buttonClass}><RefreshCw size={15} />Tải lại</button></div>
        <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#161616] px-3"><Search size={17} className="text-[#FFC799]" /><input aria-label="Tìm xe quản lý" className="w-full bg-transparent py-3 outline-none text-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên xe, thương hiệu, biển số…" /></label>
        {loading ? <p role="status" className="text-[#A0A0A0] p-5">Đang tải đội xe…</p> : filtered.length === 0 ? <p className="rounded-xl border border-white/15 p-5 text-[#A0A0A0]">Chưa có xe phù hợp.</p> : filtered.map((vehicle) => <article key={vehicle._id} className="rounded-2xl border border-white/15 bg-[#161616] p-4">
          <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{vehicle.brand} · {vehicle.vehicleModel}</h3><p className="font-mono text-sm text-[#FFC799] mt-1">{vehicle.licensePlate}</p></div><span className="text-xs px-2 py-1 h-fit rounded-lg border border-white/15">{statusLabels[vehicle.status]}</span></div>
          <p className="text-xs text-[#A0A0A0] mt-2">{typeof vehicle.branchId === 'object' ? vehicle.branchId.name : ''} · {typeof vehicle.category === 'object' ? vehicle.category.name : ''}</p>
          <p className="text-sm mt-2">{vehicle.dailyPrice.toLocaleString('vi-VN')} đ/ngày · {vehicle.hourlyPrice ? `${vehicle.hourlyPrice.toLocaleString('vi-VN')} đ/giờ` : 'Chưa đặt giá giờ'}</p>
          <p className="text-xs text-[#A0A0A0] mt-1">{vehicle.odometer.toLocaleString('vi-VN')} km · {vehicle.images.length}/10 ảnh · {vehicle.color || 'Chưa ghi màu xe'}</p>
          {vehicle.requiresMaintenance && <p className="text-xs text-[#FFAAAA] mt-2 flex gap-1"><AlertCircle size={14} />Cần bảo dưỡng trước khi cho thuê. <Link to="/manager/fleet" className="underline">Mở phiếu kỹ thuật</Link></p>}
          <div className="flex flex-wrap gap-2 mt-4"><button className={buttonClass} disabled={pending} onClick={() => edit(vehicle)}><Pencil size={14} />Sửa</button><button className={`${buttonClass} text-[#FFC799]`} onClick={() => setPricingId(pricingId === vehicle._id ? null : vehicle._id)}><Bike size={14} />Giá & mùa vụ</button><Link className={buttonClass} to={`/bikes/${vehicle._id}`}>Xem phía khách</Link><button className={`${buttonClass} text-[#FFAAAA]`} disabled={pending} onClick={() => setDeleteTarget(vehicle)}><Trash2 size={14} />Ngừng khai thác</button></div>
        </article>)}
        {pricingVehicle && <div ref={priceRef} className="scroll-mt-28 border border-[#FFC799]/40 rounded-2xl p-5 bg-[#161616]"><div className="flex justify-between items-center mb-4"><h2 className="font-semibold">{pricingVehicle.vehicleModel} · {pricingVehicle.licensePlate}</h2><button className={buttonClass} onClick={() => setPricingId(null)} aria-label="Đóng bảng giá"><X size={16} /></button></div><VehiclePricingPanel key={pricingVehicle._id} vehicle={pricingVehicle} onUpdated={() => { void reload(); }} /></div>}
      </section>
    </div>
    {deleteTarget && <div role="dialog" aria-modal="true" aria-labelledby="delete-vehicle-heading" className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"><div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#161616] p-6"><h2 id="delete-vehicle-heading" className="text-xl font-semibold">Ngừng khai thác xe?</h2><p className="text-sm text-[#A0A0A0] my-4">{deleteTarget.vehicleModel} · {deleteTarget.licensePlate}. Hệ thống sẽ kiểm tra đơn thuê, bảo dưỡng và điều chuyển trước khi xóa mềm.</p><div className="flex gap-3"><button autoFocus disabled={pending} className={buttonClass} onClick={() => setDeleteTarget(null)}>Hủy</button><button disabled={pending} className={`${buttonClass} text-[#FFAAAA]`} onClick={() => void remove()}>{pending ? 'Đang xử lý…' : 'Xác nhận ngừng khai thác'}</button></div></div></div>}
  </div>;
}
