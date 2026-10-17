import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarDays, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { api } from '../services/api';

interface SeasonalRule { _id: string; name: string; startDate: string; endDate: string; multiplier: number }
interface RuleForm { name: string; startDate: string; endDate: string; multiplier: string }
interface Props {
  vehicle: { _id: string; dailyPrice: number; hourlyPrice?: number; vehicleModel: string };
  onUpdated: () => void;
}
const emptyRule: RuleForm = { name: '', startDate: '', endDate: '', multiplier: '1.2' };
const inputClass = 'w-full rounded-xl border border-white/10 bg-[#101010] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#FFC799]';
const errorMessage = (error: unknown) => axios.isAxiosError(error)
  ? error.response?.data?.message || 'Không thể lưu biểu giá. Vui lòng thử lại.'
  : 'Không thể kết nối máy chủ. Vui lòng thử lại.';

export const VehiclePricingPanel: React.FC<Props> = ({ vehicle, onUpdated }) => {
  const [daily, setDaily] = useState(String(vehicle.dailyPrice));
  const [hourly, setHourly] = useState(vehicle.hourlyPrice == null ? '' : String(vehicle.hourlyPrice));
  const [rules, setRules] = useState<SeasonalRule[]>([]);
  const [form, setForm] = useState<RuleForm>(emptyRule);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setDaily(String(vehicle.dailyPrice));
    setHourly(vehicle.hourlyPrice == null ? '' : String(vehicle.hourlyPrice));
  }, [vehicle._id, vehicle.dailyPrice, vehicle.hourlyPrice]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setRules([]); setForm(emptyRule); setEditingId(null);
    api.get(`/vehicles/${vehicle._id}/pricing-rules`, { signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) setRules(response.data.data); })
      .catch((failure: unknown) => { if (!controller.signal.aborted) setError(errorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [vehicle._id]);

  const savePrices = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    const dailyPrice = Number(daily);
    const hourlyPrice = hourly.trim() ? Number(hourly) : null;
    if (!Number.isFinite(dailyPrice) || dailyPrice <= 0 || (hourlyPrice !== null && (!Number.isFinite(hourlyPrice) || hourlyPrice <= 0))) {
      setError('Giá ngày và giá giờ (nếu có) phải là số lớn hơn 0.'); return;
    }
    setBusy(true);
    try {
      await api.put(`/vehicles/${vehicle._id}/pricing`, { dailyPrice, hourlyPrice });
      setMessage('Đã cập nhật giá thuê. Các báo giá mới sẽ sử dụng biểu giá này.'); onUpdated();
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  };

  const saveRule = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    const multiplier = Number(form.multiplier);
    if (!form.name.trim() || !form.startDate || !form.endDate || form.startDate > form.endDate || !Number.isFinite(multiplier) || multiplier < 0.01 || multiplier > 10) {
      setError('Nhập tên, khoảng ngày hợp lệ và hệ số từ 0,01 đến 10.'); return;
    }
    setBusy(true);
    try {
      const path = `/vehicles/${vehicle._id}/pricing-rules`;
      const payload = { ...form, name: form.name.trim(), multiplier };
      if (editingId) await api.put(`${path}/${editingId}`, payload);
      else await api.post(path, payload);
      const response = await api.get(path);
      setRules(response.data.data); setForm(emptyRule); setEditingId(null);
      setMessage('Đã lưu quy tắc giá mùa vụ.'); onUpdated();
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  };

  const deleteRule = async (rule: SeasonalRule) => {
    setBusy(true); setError(''); setMessage('');
    try {
      await api.delete(`/vehicles/${vehicle._id}/pricing-rules/${rule._id}`);
      setRules((current) => current.filter((item) => item._id !== rule._id));
      if (editingId === rule._id) { setEditingId(null); setForm(emptyRule); }
      setMessage(`Đã xóa quy tắc “${rule.name}”.`); onUpdated();
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  };

  return <section className="space-y-5 text-[#F5F5F5]" aria-label={`Biểu giá ${vehicle.vehicleModel}`}>
    <div>
      <h3 className="text-lg font-bold">Biểu giá thuê · {vehicle.vehicleModel}</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#8F8F8F]">Giá giờ áp dụng cho chuyến dưới 24 giờ; chuyến dài hơn tính tròn ngày. Tiền cọc 30% được tính sau điều chỉnh mùa vụ và voucher.</p>
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
    {message && <p role="status" className="rounded-xl border border-[#FFC799]/25 bg-[#FFC799]/10 p-3 text-sm text-[#FFC799]">{message}</p>}
    <form onSubmit={savePrices} className="space-y-3 rounded-2xl border border-white/10 bg-[#161616] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-xs text-[#B0B0B0]"><span>Giá ngày (VNĐ)</span><input required type="number" min="1" max="1000000000" step="1" value={daily} onChange={(event) => setDaily(event.target.value)} className={inputClass} /></label>
        <label className="space-y-1.5 text-xs text-[#B0B0B0]"><span>Giá giờ (VNĐ, để trống để tính ngày)</span><input type="number" min="1" max="1000000000" step="1" value={hourly} onChange={(event) => setHourly(event.target.value)} className={inputClass} /></label>
      </div>
      <button disabled={busy} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#FFC799] px-4 py-2.5 text-xs font-bold text-[#101010] disabled:opacity-50"><Save size={15} />Lưu giá thuê</button>
    </form>
    <div className="space-y-3 rounded-2xl border border-white/10 bg-[#161616] p-4">
      <div className="flex items-center gap-2"><CalendarDays size={18} className="text-[#FFC799]" /><h4 className="font-bold">Giá mùa vụ</h4></div>
      <p className="text-xs leading-relaxed text-[#8F8F8F]">Ngày bắt đầu và kết thúc đều được tính theo giờ Việt Nam. Các quy tắc không được trùng ngày. Hệ số 1,2 tăng 20%; hệ số 0,9 giảm 10%. Phần thời gian giao nhau được phân bổ theo từng ngày.</p>
      {loading ? <p className="text-sm text-[#8F8F8F]">Đang tải quy tắc giá...</p> : rules.length === 0 ? <p className="text-sm text-[#8F8F8F]">Chưa có quy tắc mùa vụ. Áp dụng giá thuê cơ bản.</p> : <ul className="space-y-2">
        {rules.map((rule) => <li key={rule._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#101010] p-3">
          <div><p className="text-sm font-semibold">{rule.name} <span className="ml-2 text-[#FFC799]">×{rule.multiplier}</span></p><p className="mt-1 text-xs text-[#8F8F8F]">{rule.startDate} → {rule.endDate} (GMT+7)</p></div>
          <div className="flex gap-2">
            <button type="button" disabled={busy} aria-label={`Sửa ${rule.name}`} onClick={() => { setEditingId(rule._id); setForm({ name: rule.name, startDate: rule.startDate, endDate: rule.endDate, multiplier: String(rule.multiplier) }); setError(''); }} className="rounded-lg border border-white/10 p-2 hover:text-[#FFC799] disabled:opacity-50"><Pencil size={15} /></button>
            <button type="button" disabled={busy} aria-label={`Xóa ${rule.name}`} onClick={() => void deleteRule(rule)} className="rounded-lg border border-white/10 p-2 text-red-300 disabled:opacity-50"><Trash2 size={15} /></button>
          </div>
        </li>)}
      </ul>}
      <form onSubmit={saveRule} className="space-y-3 border-t border-white/10 pt-4">
        <h5 className="text-sm font-semibold">{editingId ? 'Chỉnh sửa quy tắc' : 'Thêm quy tắc mùa vụ'}</h5>
        <label className="block space-y-1.5 text-xs text-[#B0B0B0]"><span>Tên quy tắc</span><input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} /></label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5 text-xs text-[#B0B0B0]"><span>Từ ngày</span><input required type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className={inputClass} /></label>
          <label className="space-y-1.5 text-xs text-[#B0B0B0]"><span>Đến ngày (bao gồm)</span><input required type="date" min={form.startDate || undefined} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} className={inputClass} /></label>
          <label className="space-y-1.5 text-xs text-[#B0B0B0]"><span>Hệ số giá</span><input required type="number" min="0.01" max="10" step="0.01" value={form.multiplier} onChange={(event) => setForm({ ...form, multiplier: event.target.value })} className={inputClass} /></label>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={busy || loading} className="inline-flex items-center gap-2 rounded-xl bg-[#FFC799] px-4 py-2.5 text-xs font-bold text-[#101010] disabled:opacity-50">{editingId ? <Save size={15} /> : <Plus size={15} />}{editingId ? 'Lưu quy tắc' : 'Thêm quy tắc'}</button>
          {editingId && <button type="button" disabled={busy} onClick={() => { setEditingId(null); setForm(emptyRule); }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs"><X size={15} />Hủy chỉnh sửa</button>}
        </div>
      </form>
    </div>
  </section>;
};

export default VehiclePricingPanel;
