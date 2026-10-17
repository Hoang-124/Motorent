import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Branch, Vehicle } from '../types';

type MaintenanceStatus = 'Scheduled' | 'InProgress' | 'Completed';
type TransferStatus = 'Pending' | 'Approved' | 'InTransit' | 'Completed' | 'Rejected';
type Person = string | { _id: string; username?: string; firstName?: string; lastName?: string };
interface Transfer { _id: string; vehicleId: string | Vehicle; fromBranchId: string | Branch; toBranchId: string | Branch;
  requestedBy: Person; status: TransferStatus; transferReason: string; rejectionReason?: string; notes?: string; createdAt: string }
interface Maintenance { _id: string; vehicleId: string | Vehicle; branchId: string | Branch; maintenanceType: string;
  description: string; performedBy?: string; cost: number; scheduledDate?: string; startDate?: string; endDate?: string;
  odometerAtMaintenance: number; status: MaintenanceStatus; createdAt: string }
interface Pagination { page: number; limit: number; total: number; totalPages: number }
interface MaintenanceSummary { totalCost: number; completedCount: number; pendingEstimatedCost: number; pendingCount: number }
interface ListResponse<T, S> { success: boolean; data: T[]; pagination: Pagination; summary: S }
interface Notice { type: 'success' | 'error'; text: string }
const emptyPage: Pagination = { page: 1, limit: 8, total: 0, totalPages: 0 };
const emptySummary: MaintenanceSummary = { totalCost: 0, completedCount: 0, pendingEstimatedCost: 0, pendingCount: 0 };
const maintenanceLabels: Record<MaintenanceStatus, string> = { Scheduled: 'Đã lên lịch', InProgress: 'Đang thực hiện', Completed: 'Hoàn tất' };
const transferLabels: Record<TransferStatus, string> = { Pending: 'Chờ phê duyệt', Approved: 'Đã điều chuyển', InTransit: 'Đang vận chuyển', Completed: 'Hoàn tất', Rejected: 'Từ chối' };
const idOf = (value?: string | { _id: string }): string => typeof value === 'string' ? value : value?._id ?? '';
const branchName = (value: string | Branch): string => typeof value === 'string' ? value : value.name;
const vehicleName = (value: string | Vehicle): string => typeof value === 'string' ? 'Xe không còn trong danh mục' : `${value.brand} ${value.vehicleModel} · ${value.licensePlate}`;
const date = (value?: string): string => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Chưa ghi nhận';
const money = (value: number): string => `${value.toLocaleString('vi-VN')} đ`;
const errorMessage = (error: unknown): string => axios.isAxiosError<{ message?: string }>(error)
  ? error.response?.data.message ?? 'Không thể kết nối đến máy chủ.' : 'Thao tác chưa thực hiện được. Vui lòng thử lại.';
const inputClass = 'min-w-0 w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#FFC799]/70 disabled:opacity-50';
const buttonClass = 'min-h-11 rounded-xl bg-[#FFC799] px-4 py-2.5 text-sm font-semibold text-[#101010] transition hover:bg-[#FFD6B3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFC799] disabled:cursor-not-allowed disabled:opacity-40';
const subtleButton = 'min-h-10 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-[#F5F5F5] transition hover:border-[#FFC799]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFC799] disabled:opacity-40';

function Icon({ kind }: { kind: 'transfer' | 'maintenance' | 'alert' }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'transfer' ? <><path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4" /></> : kind === 'alert'
      ? <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v5m0 3h.01" /></>
      : <><path d="M14 6a5 5 0 0 0-6 6L3 17a3 3 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-3 3-4-4 3-3Z" /></>}
  </svg>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0 space-y-2 text-xs font-medium text-[#A0A0A0]"><span>{label}</span>{children}</label>;
}
function Status({ children, done = false }: { children: ReactNode; done?: boolean }) {
  return <span className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-[11px] font-semibold ${done ? 'border-[#99FFE4]/20 bg-[#99FFE4]/5 text-[#99FFE4]' : 'border-[#FFC799]/20 bg-[#FFC799]/5 text-[#FFC799]'}`}>{children}</span>;
}
function Pages({ page, onChange, disabled }: { page: Pagination; onChange: (page: number) => void; disabled: boolean }) {
  return <nav aria-label="Phân trang danh sách" className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-[#A0A0A0]">
    <span>{page.total} kết quả · Trang {page.page}/{Math.max(1, page.totalPages)}</span>
    <div className="flex gap-2"><button className={subtleButton} disabled={disabled || page.page <= 1} onClick={() => onChange(page.page - 1)}>Trước</button>
      <button className={subtleButton} disabled={disabled || page.page >= page.totalPages} onClick={() => onChange(page.page + 1)}>Sau</button></div>
  </nav>;
}

export function FleetOperationsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isAdmin = user?.roles === 'SystemAdmin';
  const canManage = isAdmin || user?.roles === 'BranchManager';
  const ownBranch = idOf(user?.branchId);
  const [tab, setTab] = useState<'maintenance' | 'transfers'>(searchParams.get('tab') === 'transfers' && canManage ? 'transfers' : 'maintenance');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [branchFilter, setBranchFilter] = useState('');
  const [alerts, setAlerts] = useState<Vehicle[]>([]);
  const [alertPage, setAlertPage] = useState<Pagination>(emptyPage);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [maintenancePage, setMaintenancePage] = useState<Pagination>(emptyPage);
  const [summary, setSummary] = useState<MaintenanceSummary>(emptySummary);
  const [statusFilter, setStatusFilter] = useState('');
  const [historyVehicle, setHistoryVehicle] = useState(searchParams.get('vehicle') ?? '');
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [transferPage, setTransferPage] = useState<Pagination>(emptyPage);
  const [pendingTransfers, setPendingTransfers] = useState(0);
  const [transferStatus, setTransferStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [maintenanceForm, setMaintenanceForm] = useState({ vehicleId: '', maintenanceType: 'Routine', description: '', performedBy: '', cost: '0', scheduledDate: '' });
  const [transferForm, setTransferForm] = useState({ vehicleId: '', toBranchId: ownBranch, transferReason: '', notes: '' });
  const [review, setReview] = useState<{ id: string; reason: string } | null>(null);
  const [completion, setCompletion] = useState<{ id: string; vehicle: string; cost: string; performedBy: string; odometer: string } | null>(null);
  const maintenanceRequest = useRef(0);
  const transferRequest = useRef(0);
  const visibleVehicles = vehicles.filter((vehicle) => isAdmin ? !branchFilter || idOf(vehicle.branchId) === branchFilter : idOf(vehicle.branchId) === ownBranch);
  const maintenanceVehicles = visibleVehicles.filter((vehicle) => vehicle.status === 'Available');
  const destination = isAdmin ? transferForm.toBranchId : ownBranch;
  const transferVehicles = vehicles.filter((vehicle) => vehicle.status === 'Available' && !vehicle.requiresMaintenance && idOf(vehicle.branchId) !== destination);

  useEffect(() => {
    const requestedVehicle = searchParams.get('vehicle');
    if (requestedVehicle) {
      setTab('maintenance'); setBranchFilter(''); setHistoryVehicle(requestedVehicle); setMaintenancePage(emptyPage);
    } else if (searchParams.get('tab') === 'transfers' && canManage) setTab('transfers');
  }, [searchParams, canManage]);

  const loadLookups = useCallback(async () => {
    const [branchResponse, vehicleResponse, alertResponse] = await Promise.all([
      api.get<{ data: Branch[] }>('/branches'), api.get<{ data: Vehicle[] }>('/vehicles'),
      api.get<ListResponse<Vehicle, { dueCount: number }>>('/maintenance/alerts', { params: { page: alertPage.page, limit: 8, ...(branchFilter ? { branchId: branchFilter } : {}) } }),
    ]);
    setBranches(branchResponse.data.data.filter((branch) => branch.isActive));
    setVehicles(vehicleResponse.data.data);
    setAlerts(alertResponse.data.data); setAlertPage(alertResponse.data.pagination);
  }, [branchFilter, alertPage.page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadLookups().catch((error: unknown) => { if (!cancelled) setNotice({ type: 'error', text: errorMessage(error) }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadLookups, refreshKey]);

  useEffect(() => {
    const request = ++maintenanceRequest.current;
    const endpoint = historyVehicle ? `/maintenance/vehicle/${historyVehicle}` : '/maintenance';
    api.get<ListResponse<Maintenance, MaintenanceSummary>>(endpoint, { params: {
      page: maintenancePage.page, limit: 8, ...(branchFilter ? { branchId: branchFilter } : {}),
      ...(!historyVehicle && statusFilter ? { status: statusFilter } : {}),
    } }).then((response) => {
      if (request !== maintenanceRequest.current) return;
      setMaintenance(response.data.data); setMaintenancePage(response.data.pagination); setSummary(response.data.summary);
    }).catch((error: unknown) => { if (request === maintenanceRequest.current) setNotice({ type: 'error', text: errorMessage(error) }); });
  }, [maintenancePage.page, branchFilter, statusFilter, historyVehicle, refreshKey]);

  useEffect(() => {
    if (!canManage) return;
    const request = ++transferRequest.current;
    api.get<ListResponse<Transfer, { pending: number }>>('/transfers', { params: {
      page: transferPage.page, limit: 8, ...(branchFilter ? { branchId: branchFilter } : {}), ...(transferStatus ? { status: transferStatus } : {}),
    } }).then((response) => {
      if (request !== transferRequest.current) return;
      setTransfers(response.data.data); setTransferPage(response.data.pagination); setPendingTransfers(response.data.summary.pending);
    }).catch((error: unknown) => { if (request === transferRequest.current) setNotice({ type: 'error', text: errorMessage(error) }); });
  }, [canManage, transferPage.page, branchFilter, transferStatus, refreshKey]);

  const mutate = async (request: () => Promise<unknown>, success: string, after?: () => void) => {
    setBusy(true); setNotice(null);
    try { await request(); after?.(); setNotice({ type: 'success', text: success }); setRefreshKey((value) => value + 1); }
    catch (error) { setNotice({ type: 'error', text: errorMessage(error) }); }
    finally { setBusy(false); }
  };
  const schedule = (event: FormEvent) => {
    event.preventDefault();
    void mutate(() => api.post('/maintenance', { ...maintenanceForm, cost: Number(maintenanceForm.cost),
      scheduledDate: maintenanceForm.scheduledDate ? new Date(maintenanceForm.scheduledDate).toISOString() : undefined,
    }), 'Đã tạo phiếu và giữ xe cho bảo trì.', () => setMaintenanceForm({ vehicleId: '', maintenanceType: 'Routine', description: '', performedBy: '', cost: '0', scheduledDate: '' }));
  };
  const requestTransfer = (event: FormEvent) => {
    event.preventDefault();
    void mutate(() => api.post('/transfers', { ...transferForm, toBranchId: destination }), 'Đã gửi yêu cầu đến quản lý chi nhánh đang giữ xe.',
      () => setTransferForm({ vehicleId: '', toBranchId: destination, transferReason: '', notes: '' }));
  };
  const openCompletion = (log: Maintenance) => setCompletion({ id: log._id, vehicle: vehicleName(log.vehicleId), cost: String(log.cost),
    performedBy: log.performedBy ?? '', odometer: String(typeof log.vehicleId === 'string' ? log.odometerAtMaintenance : log.vehicleId.odometer) });
  const selectBranch = (value: string) => {
    setBranchFilter(value); setAlertPage(emptyPage); setMaintenancePage(emptyPage); setTransferPage(emptyPage); setHistoryVehicle('');
    setMaintenanceForm((form) => ({ ...form, vehicleId: '' }));
  };

  return <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 text-[#F5F5F5] sm:px-6 lg:px-8">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.3em] text-[#FFC799]">Motorent / Vận hành</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Điều phối đội xe</h1>
        <p className="mt-3 max-w-2xl text-sm text-[#A0A0A0]">Theo dõi bảo trì, xử lý điều chuyển và giữ đội xe sẵn sàng cho hành trình tiếp theo.</p></div>
      <div className="flex w-full min-w-0 gap-3 sm:w-auto">{isAdmin && <select aria-label="Lọc chi nhánh" className={`${inputClass} sm:max-w-[240px]`} value={branchFilter} onChange={(event) => selectBranch(event.target.value)}>
        <option value="">Tất cả chi nhánh</option>{branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}</select>}
        <button className={`${subtleButton} shrink-0`} disabled={busy || loading} onClick={() => setRefreshKey((value) => value + 1)}>Làm mới</button></div>
    </div>
    {notice && <div role={notice.type === 'error' ? 'alert' : 'status'} className={`mb-6 rounded-xl border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-[#FF8080]/30 bg-[#FF8080]/5 text-[#FFB3B3]' : 'border-[#99FFE4]/25 bg-[#99FFE4]/5 text-[#99FFE4]'}`}>{notice.text}</div>}
    <div className="mb-8 grid gap-3 sm:grid-cols-3">
      {[{ label: 'Xe cần bảo trì', value: alertPage.total, detail: 'Chu kỳ ODO 1.500 km', icon: 'alert' as const },
        { label: 'Phiếu chưa hoàn tất', value: summary.pendingCount, detail: `Dự kiến ${money(summary.pendingEstimatedCost)}`, icon: 'maintenance' as const },
        { label: canManage ? 'Yêu cầu điều chuyển chờ xử lý' : 'Phiếu đã hoàn tất', value: canManage ? pendingTransfers : summary.completedCount, detail: canManage ? 'Chi nhánh xuất phê duyệt' : `Đã chi ${money(summary.totalCost)}`, icon: 'transfer' as const }].map((item) =>
        <div key={item.label} className="min-w-0 rounded-2xl border border-white/10 bg-[#161616] p-5"><div className="flex justify-between gap-3 text-[#A0A0A0]"><span className="text-xs leading-relaxed">{item.label}</span><span className="shrink-0 text-[#FFC799]"><Icon kind={item.icon} /></span></div>
          <p className="my-3 text-3xl font-semibold tabular-nums">{item.value}</p><p className="text-xs leading-relaxed text-[#A0A0A0]">{item.detail}</p></div>)}
    </div>
    <section id="odo-alerts" aria-labelledby="odo-alerts-title" aria-busy={loading} className="mb-8 scroll-mt-28 rounded-2xl border border-[#FFC799]/20 bg-[#FFC799]/[.03] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[#FFC799]"><span className="shrink-0"><Icon kind="alert" /></span><h2 id="odo-alerts-title" className="text-sm font-semibold">Cảnh báo ODO</h2><span aria-label={`${alertPage.total} xe đến hạn bảo trì`} className="rounded-full border border-[#FFC799]/30 bg-[#FFC799]/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums">{alertPage.total}</span></div>
        <p className="text-xs text-[#A0A0A0]">Chu kỳ bảo dưỡng mỗi 1.500 km</p>
      </div>
      {alerts.length > 0 ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{alerts.map((vehicle) => <button type="button" key={vehicle._id} className="group min-w-0 rounded-xl border border-[#FFC799]/20 bg-[#101010] p-4 text-left transition hover:border-[#FFC799]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFC799]" onClick={() => {
        setTab('maintenance'); setHistoryVehicle(vehicle._id); setMaintenancePage(emptyPage);
        if (vehicle.status === 'Available') setMaintenanceForm((form) => ({ ...form, vehicleId: vehicle._id }));
      }}>
        <span className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-[#FFC799]">{vehicle.licensePlate}</span><span className="rounded-full border border-[#FFC799]/20 px-2 py-0.5 text-[10px] text-[#FFC799]">Đến hạn</span></span>
        <span className="mt-2 block break-words text-xs text-[#F5F5F5]">{vehicle.brand} {vehicle.vehicleModel}</span>
        <span className="mt-1 block break-words text-[11px] text-[#A0A0A0]">{branchName(vehicle.branchId)}</span>
        <span className="mt-4 block text-xl font-semibold tabular-nums text-[#F5F5F5]">{vehicle.odometer.toLocaleString('vi-VN')} <span className="text-xs font-normal text-[#A0A0A0]">km</span></span>
        <span className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3 text-[11px] text-[#FFC799]"><span>{vehicle.status === 'Available' ? 'Lập phiếu & xem lịch sử' : 'Xem phiếu & lịch sử'}</span><svg className="shrink-0 transition group-hover:translate-x-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12h16m-5-5 5 5-5 5" /></svg></span>
      </button>)}</div> : <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-[#A0A0A0]">{loading ? 'Đang kiểm tra cảnh báo bảo trì…' : 'Không có xe đến hạn bảo trì trong phạm vi đang xem.'}</p>}
      {alertPage.totalPages > 1 && <Pages page={alertPage} disabled={busy || loading} onChange={(page) => setAlertPage((current) => ({ ...current, page }))} />}
    </section>
    <div role="tablist" aria-label="Nghiệp vụ đội xe" className="mb-6 flex gap-4 border-b border-white/10 sm:gap-6">
      <button role="tab" aria-selected={tab === 'maintenance'} onClick={() => setTab('maintenance')} className={`min-h-12 border-b-2 pb-3 text-left text-xs sm:text-sm ${tab === 'maintenance' ? 'border-[#FFC799] text-[#FFC799]' : 'border-transparent text-[#A0A0A0]'}`}>Phiếu bảo trì</button>
      {canManage && <button role="tab" aria-selected={tab === 'transfers'} onClick={() => setTab('transfers')} className={`flex min-h-12 items-center gap-2 border-b-2 pb-3 text-left text-xs sm:text-sm ${tab === 'transfers' ? 'border-[#FFC799] text-[#FFC799]' : 'border-transparent text-[#A0A0A0]'}`}>Điều chuyển chi nhánh{pendingTransfers > 0 && <span className="rounded-full bg-[#FFC799]/10 px-2 py-0.5 text-[10px] text-[#FFC799]">{pendingTransfers}</span>}</button>}
    </div>

    {tab === 'maintenance' ? <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <form onSubmit={schedule} className="min-w-0 space-y-4 rounded-2xl border border-white/10 bg-[#161616] p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Lập phiếu bảo trì</h2><p className="text-xs leading-relaxed text-[#A0A0A0]">Xe được giữ ở trạng thái Bảo trì ngay khi lập phiếu, kể cả khi ngày dự kiến ở tương lai.</p>
        <Field label="Xe tại chi nhánh"><select required className={inputClass} value={maintenanceForm.vehicleId} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, vehicleId: event.target.value })}>
          <option value="">Chọn xe đang sẵn sàng</option>{maintenanceVehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{vehicle.licensePlate} · {vehicle.vehicleModel}{vehicle.requiresMaintenance ? ' · Đến hạn' : ''}</option>)}</select></Field>
        <Field label="Loại công việc"><select className={inputClass} value={maintenanceForm.maintenanceType} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, maintenanceType: event.target.value })}>
          <option value="Routine">Bảo dưỡng định kỳ</option><option value="Repair">Sửa chữa</option><option value="Inspection">Kiểm tra</option></select></Field>
        <Field label="Tình trạng / công việc cần thực hiện"><textarea required minLength={5} maxLength={2000} rows={3} className={inputClass} value={maintenanceForm.description} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, description: event.target.value })} /></Field>
        <Field label="Kỹ thuật viên phụ trách"><input required minLength={2} maxLength={120} className={inputClass} value={maintenanceForm.performedBy} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, performedBy: event.target.value })} /></Field>
        <Field label="Thời gian dự kiến (để trống nếu xử lý ngay)"><input type="datetime-local" className={inputClass} value={maintenanceForm.scheduledDate} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, scheduledDate: event.target.value })} /></Field>
        <Field label="Chi phí dự kiến (VNĐ)"><input required type="number" min="0" step="1" className={inputClass} value={maintenanceForm.cost} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, cost: event.target.value })} /></Field>
        <button disabled={busy || loading || !maintenanceForm.vehicleId} className={`${buttonClass} w-full`}>{busy ? 'Đang lưu…' : 'Tạo phiếu bảo trì'}</button>
      </form>
      <section aria-labelledby="maintenance-history-title" className="min-w-0 rounded-2xl border border-white/10 bg-[#161616] p-4 sm:p-5">
        <div className="mb-5 flex flex-wrap justify-between gap-4"><div><h2 id="maintenance-history-title" className="text-lg font-semibold">Dòng thời gian bảo trì</h2><p className="mt-1 text-xs leading-relaxed text-[#A0A0A0]">Theo dõi từng phiếu từ khi lập đến khi hoàn tất.</p></div>
          <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto"><select aria-label="Xem lịch sử theo xe" className={`${inputClass} sm:max-w-[210px]`} value={historyVehicle} onChange={(event) => { setHistoryVehicle(event.target.value); setMaintenancePage(emptyPage); }}>
            <option value="">Tất cả xe</option>{visibleVehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{vehicle.licensePlate}</option>)}</select>
            {!historyVehicle && <select aria-label="Lọc trạng thái bảo trì" className={`${inputClass} sm:max-w-[180px]`} value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setMaintenancePage(emptyPage); }}>
              <option value="">Mọi trạng thái</option>{Object.entries(maintenanceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</div></div>
        <dl className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-[#99FFE4]/15 bg-[#99FFE4]/[.035] p-4"><dt className="text-xs text-[#A0A0A0]">Tổng chi phí bảo trì đã hoàn tất</dt><dd className="mt-2 break-words text-2xl font-semibold tabular-nums text-[#99FFE4]">{money(summary.totalCost)}</dd><dd className="mt-1 text-[11px] text-[#A0A0A0]">{summary.completedCount} phiếu hoàn tất</dd></div>
          <div className="min-w-0 rounded-xl border border-white/10 bg-[#101010] p-4"><dt className="text-xs text-[#A0A0A0]">Chi phí dự kiến chưa hoàn tất</dt><dd className="mt-2 break-words text-2xl font-semibold tabular-nums">{money(summary.pendingEstimatedCost)}</dd><dd className="mt-1 text-[11px] text-[#A0A0A0]">{summary.pendingCount} phiếu đang chờ hoặc thực hiện</dd></div>
        </dl>
        <ol aria-label="Các phiếu bảo trì, mới nhất trước" className="ml-1 border-l border-white/15 pl-5 sm:pl-6">{maintenance.map((log) => <li key={log._id} className="relative min-w-0 pb-6 last:pb-0">
          <span aria-hidden="true" className={`absolute -left-[26px] top-1 h-[11px] w-[11px] rounded-full border-2 border-[#161616] ring-4 ring-[#161616] sm:-left-[30px] ${log.status === 'Completed' ? 'bg-[#99FFE4]' : 'bg-[#FFC799]'}`} />
          <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#A0A0A0]"><span>Lập phiếu</span><time dateTime={log.createdAt} className="tabular-nums">{date(log.createdAt)}</time></p>
          <article className="min-w-0 rounded-xl border border-white/10 bg-[#101010] p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{vehicleName(log.vehicleId)}</h3><p className="mt-1 break-words text-xs leading-relaxed text-[#A0A0A0]">{branchName(log.branchId)} · {log.maintenanceType === 'Routine' ? 'Bảo dưỡng định kỳ' : log.maintenanceType === 'Repair' ? 'Sửa chữa' : 'Kiểm tra'}</p></div>
            <Status done={log.status === 'Completed'}>{maintenanceLabels[log.status]}</Status></div>
          <p className="my-3 whitespace-pre-wrap break-words text-sm text-[#A0A0A0]">{log.description}</p>
          <dl className="grid gap-3 text-xs min-[420px]:grid-cols-2"><div className="min-w-0"><dt className="text-[#A0A0A0]">Kỹ thuật viên</dt><dd className="mt-1 break-words">{log.performedBy || 'Chưa phân công'}</dd></div>
            <div className="min-w-0"><dt className="text-[#A0A0A0]">{log.status === 'Completed' ? 'Chi phí thực tế' : 'Chi phí dự kiến'}</dt><dd className="mt-1 break-words font-semibold tabular-nums text-[#FFC799]">{money(log.cost)}</dd></div>
            <div className="min-w-0"><dt className="text-[#A0A0A0]">Dự kiến</dt><dd className="mt-1 break-words">{log.scheduledDate ? <time dateTime={log.scheduledDate}>{date(log.scheduledDate)}</time> : 'Xử lý ngay'}</dd></div>
            <div className="min-w-0"><dt className="text-[#A0A0A0]">ODO ghi nhận</dt><dd className="mt-1 break-words tabular-nums">{log.odometerAtMaintenance.toLocaleString('vi-VN')} km</dd></div>
            <div className="min-w-0"><dt className="text-[#A0A0A0]">Bắt đầu thực tế</dt><dd className="mt-1 break-words">{log.startDate ? <time dateTime={log.startDate}>{date(log.startDate)}</time> : 'Chưa ghi nhận'}</dd></div><div className="min-w-0"><dt className="text-[#A0A0A0]">Hoàn tất thực tế</dt><dd className="mt-1 break-words">{log.endDate ? <time dateTime={log.endDate}>{date(log.endDate)}</time> : 'Chưa ghi nhận'}</dd></div></dl>
          {log.status !== 'Completed' && <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
            {log.status === 'Scheduled' && <button disabled={busy || Boolean(log.scheduledDate && new Date(log.scheduledDate).getTime() > Date.now())} className={subtleButton} onClick={() => void mutate(() => api.put(`/maintenance/${log._id}/start`), 'Đã bắt đầu công việc bảo trì.')}>Bắt đầu công việc</button>}
            {log.status === 'InProgress' && canManage && <button disabled={busy} className={subtleButton} onClick={() => openCompletion(log)}>Ghi nhận hoàn tất</button>}
            {log.status === 'InProgress' && !canManage && <span className="text-xs text-[#6E6E6E]">Quản lý chi nhánh xác nhận khi hoàn tất.</span>}
            {log.status === 'Scheduled' && log.scheduledDate && new Date(log.scheduledDate).getTime() > Date.now() && <span className="text-xs text-[#6E6E6E]">Chờ đến thời gian dự kiến.</span>}</div>}
        </article></li>)}</ol>
        {maintenance.length === 0 && <p className="py-12 text-center text-sm text-[#6E6E6E]">Chưa có phiếu bảo trì phù hợp.</p>}
        <Pages page={maintenancePage} disabled={busy} onChange={(page) => setMaintenancePage((current) => ({ ...current, page }))} />
      </section>
    </div> : <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <form onSubmit={requestTransfer} className="min-w-0 space-y-4 rounded-2xl border border-white/10 bg-[#161616] p-4 sm:p-5"><h2 className="text-lg font-semibold">Yêu cầu nhận xe</h2>
        <p className="text-xs leading-relaxed text-[#A0A0A0]">Đề nghị nhận xe sẵn sàng từ chi nhánh khác. Xe chuyển chi nhánh khi quản lý chi nhánh xuất phê duyệt.</p>
        <Field label="Chi nhánh nhận">{isAdmin ? <select required className={inputClass} value={transferForm.toBranchId} onChange={(event) => setTransferForm({ ...transferForm, toBranchId: event.target.value, vehicleId: '' })}>
          <option value="">Chọn chi nhánh nhận</option>{branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}</select>
          : <div className="break-words rounded-xl border border-white/10 bg-[#0A0A0A] px-3 py-2.5 text-sm text-[#F5F5F5]">{branches.find((branch) => branch._id === ownBranch)?.name || 'Chưa được phân bổ chi nhánh'}</div>}</Field>
        <Field label="Xe cần điều chuyển"><select required className={inputClass} value={transferForm.vehicleId} onChange={(event) => setTransferForm({ ...transferForm, vehicleId: event.target.value })}>
          <option value="">Chọn xe ở chi nhánh khác</option>{transferVehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{vehicle.licensePlate} · {vehicle.vehicleModel} · {branchName(vehicle.branchId)}</option>)}</select></Field>
        <Field label="Lý do điều chuyển"><textarea required minLength={5} maxLength={2000} rows={3} className={inputClass} value={transferForm.transferReason} onChange={(event) => setTransferForm({ ...transferForm, transferReason: event.target.value })} /></Field>
        <Field label="Ghi chú"><textarea maxLength={2000} rows={2} className={inputClass} value={transferForm.notes} onChange={(event) => setTransferForm({ ...transferForm, notes: event.target.value })} /></Field>
        <button className={`${buttonClass} w-full`} disabled={busy || loading || !destination || !transferForm.vehicleId}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu nhận xe'}</button>
      </form>
      <section aria-labelledby="transfer-list-title" className="min-w-0 rounded-2xl border border-white/10 bg-[#161616] p-4 sm:p-5"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 id="transfer-list-title" className="text-lg font-semibold">Yêu cầu đi & đến</h2><p className="mt-1 text-xs text-[#A0A0A0]">Quản lý chi nhánh xuất xác nhận điều chuyển.</p></div>
        <select aria-label="Lọc trạng thái điều chuyển" className={`${inputClass} sm:max-w-[190px]`} value={transferStatus} onChange={(event) => { setTransferStatus(event.target.value); setTransferPage(emptyPage); }}><option value="">Mọi trạng thái</option>{Object.entries(transferLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="space-y-3">{transfers.map((transfer) => {
          const canReview = transfer.status === 'Pending' && idOf(transfer.requestedBy) !== user?._id && (isAdmin || idOf(transfer.fromBranchId) === ownBranch);
          return <article key={transfer._id} className="min-w-0 rounded-xl border border-white/10 bg-[#101010] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="min-w-0 break-words text-sm font-semibold">{vehicleName(transfer.vehicleId)}</h3>
            <Status done={transfer.status === 'Approved' || transfer.status === 'Completed'}>{transferLabels[transfer.status]}</Status></div>
            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3 text-xs"><div className="min-w-0"><p className="text-[10px] text-[#A0A0A0]">Chi nhánh xuất</p><p className="mt-1 break-words leading-relaxed">{branchName(transfer.fromBranchId)}</p></div><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-label="đến"><path d="M4 12h16m-5-5 5 5-5 5" /></svg><div className="min-w-0"><p className="text-[10px] text-[#A0A0A0]">Chi nhánh nhận</p><p className="mt-1 break-words leading-relaxed">{branchName(transfer.toBranchId)}</p></div></div>
            <p className="my-3 whitespace-pre-wrap break-words text-sm text-[#A0A0A0]">{transfer.transferReason}</p>{transfer.notes && <p className="mb-3 whitespace-pre-wrap break-words text-xs text-[#6E6E6E]">{transfer.notes}</p>}
            <p className="text-xs text-[#A0A0A0]">Tạo lúc <time dateTime={transfer.createdAt}>{date(transfer.createdAt)}</time></p>{transfer.rejectionReason && <p className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-[#FF8080]/20 bg-[#FF8080]/5 p-3 text-xs leading-relaxed text-[#FFB3B3]">Lý do từ chối: {transfer.rejectionReason}</p>}
            {canReview && <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3"><button disabled={busy} className={buttonClass} onClick={() => void mutate(() => api.put(`/transfers/${transfer._id}/approve`), 'Đã phê duyệt và chuyển xe sang chi nhánh nhận.')}>Phê duyệt điều chuyển</button>
              <button disabled={busy} className={subtleButton} onClick={() => setReview({ id: transfer._id, reason: '' })}>Từ chối</button></div>}
            {transfer.status === 'Pending' && !canReview && <p className="mt-3 text-xs text-[#6E6E6E]">Chờ quản lý chi nhánh xuất xử lý.</p>}</article>;
        })}</div>{transfers.length === 0 && <p className="py-12 text-center text-sm text-[#6E6E6E]">Chưa có yêu cầu điều chuyển phù hợp.</p>}
        <Pages page={transferPage} disabled={busy} onChange={(page) => setTransferPage((current) => ({ ...current, page }))} />
      </section>
    </div>}
    {(review || completion) && <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/80 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="fleet-dialog-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-[#161616] p-5 shadow-2xl sm:p-6">
      <h2 id="fleet-dialog-title" className="mb-4 text-xl font-semibold">{review ? 'Từ chối yêu cầu' : 'Hoàn tất bảo trì'}</h2>
      {notice?.type === 'error' && <p role="alert" className="mb-4 text-sm text-[#FFB3B3]">{notice.text}</p>}
      {review ? <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void mutate(() => api.put(`/transfers/${review.id}/reject`, { rejectionReason: review.reason }), 'Đã từ chối yêu cầu điều chuyển.', () => setReview(null)); }}>
        <Field label="Lý do từ chối"><textarea autoFocus required minLength={5} maxLength={2000} rows={4} className={inputClass} value={review.reason} onChange={(event) => setReview({ ...review, reason: event.target.value })} /></Field>
        <div className="flex flex-wrap justify-end gap-3"><button type="button" className={subtleButton} disabled={busy} onClick={() => setReview(null)}>Quay lại</button><button disabled={busy} className={buttonClass}>Xác nhận từ chối</button></div>
      </form> : completion && <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void mutate(() => api.put(`/maintenance/${completion.id}/complete`, { cost: Number(completion.cost), performedBy: completion.performedBy, odometer: Number(completion.odometer) }), 'Đã hoàn tất bảo trì. Xe sẵn sàng phục vụ.', () => setCompletion(null)); }}>
        <p className="break-words text-sm text-[#A0A0A0]">{completion.vehicle}</p><Field label="Chi phí thực tế (VNĐ)"><input autoFocus required type="number" min="0" step="1" className={inputClass} value={completion.cost} onChange={(event) => setCompletion({ ...completion, cost: event.target.value })} /></Field>
        <Field label="Kỹ thuật viên thực hiện"><input required minLength={2} maxLength={120} className={inputClass} value={completion.performedBy} onChange={(event) => setCompletion({ ...completion, performedBy: event.target.value })} /></Field>
        <Field label="ODO khi hoàn tất (km)"><input required type="number" min="0" step="1" className={inputClass} value={completion.odometer} onChange={(event) => setCompletion({ ...completion, odometer: event.target.value })} /></Field>
        <p className="text-xs leading-relaxed text-[#6E6E6E]">Xe trở lại trạng thái Sẵn sàng và bắt đầu chu kỳ cảnh báo ODO tiếp theo.</p>
        <div className="flex flex-wrap justify-end gap-3"><button type="button" className={subtleButton} disabled={busy} onClick={() => setCompletion(null)}>Quay lại</button><button disabled={busy} className={buttonClass}>Xác nhận hoàn tất</button></div>
      </form>}
    </section></div>}
  </div>;
}
