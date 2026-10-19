import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Vehicle } from '../types';

type VehicleStatus = Vehicle['status'];
interface BranchOption { _id: string; name: string; code: string; isActive: boolean }
interface DashboardData {
  generatedAt: string;
  scope: { branchId: string | null; name: string; code: string | null };
  branches: BranchOption[];
  vehicles: { total: number; statusCounts: Record<VehicleStatus, number>; readyCount: number;
    maintenanceDueCount: number; availableWithMaintenanceDueCount: number };
  maintenance: { scheduledCount: number; inProgressCount: number; pendingCount: number;
    completedCount: number; pendingEstimatedCost: number; completedCost: number };
  transfers: { pendingCount: number; pendingInboundCount: number; pendingOutboundCount: number;
    inTransitCount: number; inTransitInboundCount: number; inTransitOutboundCount: number };
}
const statusItems: { status: VehicleStatus; label: string; color: string }[] = [
  { status: 'Available', label: 'Sẵn có', color: '#99FFE4' },
  { status: 'Rented', label: 'Đang thuê', color: '#FFC799' },
  { status: 'Maintenance', label: 'Bảo trì', color: '#FF8080' },
  { status: 'Transferring', label: 'Điều chuyển', color: '#B9B0E8' },
];
const number = (value: number): string => value.toLocaleString('vi-VN');
const money = (value: number): string => `${number(value)} đ`;
const percentage = (count: number, total: number): string => `${(total ? count / total * 100 : 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
const outlineButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-[#F5F5F5] transition hover:border-[#FFC799]/60 hover:bg-white/[.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFC799] disabled:cursor-wait disabled:opacity-50';
const panelClass = 'min-w-0 rounded-2xl border border-white/10 bg-[#161616] p-5 sm:p-6';

function Arrow() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>;
}
function Metric({ label, value, detail, warning = false }: { label: string; value: string; detail: string; warning?: boolean }) {
  return <div className={`${panelClass} relative overflow-hidden`}>
    <span className={`absolute right-5 top-5 h-1.5 w-1.5 rounded-full ${warning ? 'bg-[#FF8080]' : 'bg-[#FFC799]'}`} aria-hidden="true" />
    <p className="pr-4 text-xs font-medium text-[#A0A0A0]">{label}</p>
    <p className={`mt-5 text-4xl font-semibold tabular-nums tracking-tight ${warning ? 'text-[#FFB3B3]' : 'text-[#F5F5F5]'}`}>{value}</p>
    <p className="mt-3 text-xs leading-relaxed text-[#A0A0A0]">{detail}</p>
  </div>;
}
function PanelHeading({ title, detail, children }: { title: string; detail: string; children?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div>
    <h2 className="text-lg font-semibold tracking-tight">{title}</h2><p className="mt-1.5 text-xs leading-relaxed text-[#A0A0A0]">{detail}</p>
  </div>{children}</div>;
}
function StatusChart({ vehicles }: { vehicles: DashboardData['vehicles'] }) {
  const chartId = useId();
  let offset = 0;
  return <div className="grid items-center gap-6 sm:grid-cols-[220px_minmax(0,1fr)]">
    <svg viewBox="0 0 240 240" className="mx-auto w-full max-w-[220px]" role="img" aria-labelledby={`${chartId}-title ${chartId}-desc`}>
      <title id={`${chartId}-title`}>Phân bố {number(vehicles.total)} xe theo trạng thái</title>
      <desc id={`${chartId}-desc`}>{statusItems.map((item) => `${item.label}: ${number(vehicles.statusCounts[item.status])} xe`).join('. ')}.</desc>
      <circle cx="120" cy="120" r="88" fill="none" stroke="#262626" strokeWidth="21" />
      {statusItems.map((item) => {
        const part = vehicles.total ? vehicles.statusCounts[item.status] / vehicles.total * 100 : 0;
        const start = offset; offset += part;
        return part > 0 ? <circle key={item.status} cx="120" cy="120" r="88" pathLength="100" fill="none" stroke={item.color} strokeWidth="21"
          strokeDasharray={`${part} ${100 - part}`} strokeDashoffset={-start} transform="rotate(-90 120 120)" /> : null;
      })}
      <text x="120" y="117" textAnchor="middle" fill="#F5F5F5" fontSize="34" fontWeight="600">{number(vehicles.total)}</text>
      <text x="120" y="142" textAnchor="middle" fill="#A0A0A0" fontSize="11">TỔNG SỐ XE</text>
    </svg>
    <table className="w-full text-left text-sm">
      <caption className="sr-only">Số lượng và tỷ trọng từng trạng thái xe</caption>
      <thead><tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#A0A0A0]">
        <th scope="col" className="pb-3 font-medium">Trạng thái</th><th scope="col" className="pb-3 text-right font-medium">Xe</th><th scope="col" className="pb-3 text-right font-medium">Tỷ trọng</th>
      </tr></thead>
      <tbody>{statusItems.map((item) => <tr key={item.status} className="border-b border-white/[.06]">
        <th scope="row" className="py-4 font-normal text-[#D0D0D0]"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />{item.label}</th>
        <td className="py-4 text-right font-semibold tabular-nums">{number(vehicles.statusCounts[item.status])}</td>
        <td className="py-4 text-right text-xs tabular-nums text-[#A0A0A0]">{percentage(vehicles.statusCounts[item.status], vehicles.total)}</td>
      </tr>)}</tbody>
      <tfoot><tr><th scope="row" className="pt-4 font-medium">Tổng cộng</th><td className="pt-4 text-right font-semibold tabular-nums">{number(vehicles.total)}</td><td className="pt-4 text-right text-xs text-[#A0A0A0]">{vehicles.total ? '100%' : '0%'}</td></tr></tfoot>
    </table>
  </div>;
}
function MaintenanceChart({ maintenance }: { maintenance: DashboardData['maintenance'] }) {
  const chartId = useId();
  const rows = [
    { label: 'Đã lên lịch', count: maintenance.scheduledCount, color: '#FFC799' },
    { label: 'Đang thực hiện', count: maintenance.inProgressCount, color: '#FF8080' },
    { label: 'Đã hoàn tất', count: maintenance.completedCount, color: '#99FFE4' },
  ];
  const max = Math.max(1, ...rows.map((row) => row.count));
  return <svg viewBox="0 0 340 190" className="w-full" role="img" aria-labelledby={`${chartId}-title ${chartId}-desc`}>
    <title id={`${chartId}-title`}>Tiến độ phiếu bảo trì</title>
    <desc id={`${chartId}-desc`}>{rows.map((row) => `${row.label}: ${number(row.count)} phiếu`).join('. ')}. Độ dài cột tỷ lệ với số phiếu.</desc>
    {rows.map((row, index) => <g key={row.label} transform={`translate(0 ${index * 66})`}>
      <text x="0" y="16" fill="#D0D0D0" fontSize="12">{row.label}</text>
      <text x="340" y="16" textAnchor="end" fill="#F5F5F5" fontSize="14" fontWeight="600">{number(row.count)}</text>
      <rect x="0" y="31" width="340" height="9" rx="4.5" fill="#262626" />
      {row.count > 0 && <rect x="0" y="31" width={row.count / max * 340} height="9" rx="4.5" fill={row.color} />}
    </g>)}
  </svg>;
}

export function FleetDashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles === 'SystemAdmin';
  const canManage = isAdmin || user?.roles === 'BranchManager';
  const ownBranchId = typeof user?.branchId === 'string' ? user.branchId : user?.branchId?._id;
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!canManage) { setData(null); setLoading(false); return; }
    const controller = new AbortController();
    let active = true;
    setLoading(true); setError(''); setData(null);
    api.get<{ success: boolean; data: DashboardData }>('/fleet/dashboard', {
      params: isAdmin && branchId ? { branchId } : {}, signal: controller.signal,
    }).then((response) => {
      if (!active) return;
      setData(response.data.data); setBranches(response.data.data.branches);
    }).catch((requestError: unknown) => {
      if (!active) return;
      setError(axios.isAxiosError<{ message?: string }>(requestError)
        ? requestError.response?.data.message ?? 'Không thể kết nối đến máy chủ. Vui lòng thử lại.'
        : 'Không thể tải tổng quan đội xe. Vui lòng thử lại.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [canManage, isAdmin, branchId, ownBranchId, user?._id, refresh]);

  if (!canManage) return <div role="alert" className="mx-auto max-w-7xl px-4 pb-20 pt-28 text-[#FFB3B3]">Bạn không có quyền xem tổng quan đội xe.</div>;

  return <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 text-[#F5F5F5] sm:px-6 lg:px-8" aria-busy={loading}>
    <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.3em] text-[#FFC799]">Motorent / Tổng quan</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Nhịp vận hành đội xe</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#A0A0A0]">Số lượng xe, tình trạng bảo trì và điều chuyển trong cùng một góc nhìn.</p>
      </div>
      <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
        {isAdmin && <label className="min-w-0 flex-1 space-y-2 text-xs text-[#A0A0A0] sm:w-60 sm:flex-none"><span>Phạm vi chi nhánh</span>
          <select value={branchId} onChange={(event) => { setData(null); setBranchId(event.target.value); }} className="w-full rounded-xl border border-white/15 bg-[#0A0A0A] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#FFC799]">
            <option value="">Toàn bộ chi nhánh</option>{branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}{branch.isActive ? '' : ' · Ngừng hoạt động'}</option>)}
          </select></label>}
        <button onClick={() => setRefresh((value) => value + 1)} disabled={loading} className={outlineButton}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 7a7 7 0 0 1 11.7-1L20 9M4 15l2.2 3A7 7 0 0 0 18 17" /></svg>Làm mới
        </button>
      </div>
    </div>
    <div className="mb-7 flex flex-wrap items-center justify-between gap-3 border-y border-white/10 py-4 text-xs">
      <p className="font-medium text-[#D0D0D0]">{data ? data.scope.name : isAdmin ? 'Phạm vi theo bộ lọc chi nhánh' : 'Chi nhánh công tác của bạn'}{data?.scope.code && <span className="ml-2 text-[#A0A0A0]">/ {data.scope.code}</span>}</p>
      {data && <p className="text-[#A0A0A0]">Cập nhật {new Date(data.generatedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</p>}
    </div>
    {loading && <div role="status" className={`${panelClass} flex min-h-72 items-center justify-center gap-3 text-sm text-[#A0A0A0]`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="animate-spin motion-reduce:animate-none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="#262626" strokeWidth="2" /><path d="M12 3a9 9 0 0 1 9 9" stroke="#FFC799" strokeWidth="2" strokeLinecap="round" /></svg>Đang tải dữ liệu đội xe…
    </div>}
    {error && <div role="alert" className="rounded-2xl border border-[#FF8080]/30 bg-[#FF8080]/5 p-6">
      <h2 className="font-semibold text-[#FFB3B3]">Chưa thể tải tổng quan</h2><p className="mt-2 text-sm text-[#D0D0D0]">{error}</p>
      <button className={`${outlineButton} mt-5`} onClick={() => setRefresh((value) => value + 1)}>Thử lại</button>
    </div>}
    {data && <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Tổng số xe" value={number(data.vehicles.total)} detail="Xe hiện thuộc phạm vi đang xem." />
        <Metric label="Sẵn có, không cảnh báo" value={number(data.vehicles.readyCount)} detail="Trạng thái sẵn có và không có cảnh báo bảo trì." />
        <Metric label="Tỷ lệ đang thuê" value={percentage(data.vehicles.statusCounts.Rented, data.vehicles.total)} detail={`${number(data.vehicles.statusCounts.Rented)} xe đang thuê trên tổng số ${number(data.vehicles.total)} xe.`} />
        <Metric label="Xe đến hạn bảo trì" value={number(data.vehicles.maintenanceDueCount)} detail="Cảnh báo bảo trì ở mọi trạng thái xe." warning={data.vehicles.maintenanceDueCount > 0} />
      </div>
      <div className="mb-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <section className={panelClass}>
          <PanelHeading title="Phân bố trạng thái" detail="Mỗi xe thuộc một trạng thái duy nhất." />
          <StatusChart vehicles={data.vehicles} />
          {data.vehicles.total === 0 && <p className="mt-5 rounded-xl bg-[#0A0A0A] p-4 text-sm text-[#A0A0A0]">Chưa có xe trong phạm vi này.</p>}
          <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-relaxed text-[#A0A0A0]">Trong {number(data.vehicles.statusCounts.Available)} xe sẵn có, {number(data.vehicles.availableWithMaintenanceDueCount)} xe có cảnh báo bảo trì. Cảnh báo không được cộng thêm vào tổng trạng thái.</p>
        </section>
        <section className={panelClass}>
          <PanelHeading title="Tiến độ bảo trì" detail="Số phiếu theo trạng thái · toàn bộ lịch sử." />
          <MaintenanceChart maintenance={data.maintenance} />
          <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-[#FFC799]/15 bg-[#FFC799]/[.03] px-4 py-3">
            <span className="text-xs text-[#D0D0D0]">Phiếu chưa hoàn tất</span><strong className="text-xl font-semibold tabular-nums text-[#FFC799]">{number(data.maintenance.pendingCount)}</strong>
          </div>
          {data.maintenance.pendingCount + data.maintenance.completedCount === 0 && <p className="mt-3 text-xs text-[#A0A0A0]">Chưa có phiếu bảo trì.</p>}
          <Link to="/manager/fleet" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#FFC799] hover:underline">Xem phiếu bảo trì <Arrow /></Link>
        </section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={panelClass}>
          <PanelHeading title="Điều chuyển chi nhánh" detail={data.scope.branchId ? 'Yêu cầu liên quan đến chi nhánh đang xem.' : 'Mỗi yêu cầu trong mạng lưới được tính một lần.'} />
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <caption className="sr-only">Yêu cầu điều chuyển đang chờ và đang vận chuyển</caption>
            <thead><tr className="border-b border-white/10 text-xs text-[#A0A0A0]"><th scope="col" className="pb-3 font-medium">Trạng thái</th>
              {data.scope.branchId && <><th scope="col" className="pb-3 text-right font-medium">Chiều nhận</th><th scope="col" className="pb-3 text-right font-medium">Chiều xuất</th></>}
              <th scope="col" className="pb-3 text-right font-medium">Tổng</th></tr></thead>
            <tbody>{[
              { label: 'Chờ phê duyệt', total: data.transfers.pendingCount, inbound: data.transfers.pendingInboundCount, outbound: data.transfers.pendingOutboundCount },
              { label: 'Đang vận chuyển', total: data.transfers.inTransitCount, inbound: data.transfers.inTransitInboundCount, outbound: data.transfers.inTransitOutboundCount },
            ].map((row) => <tr key={row.label} className="border-b border-white/[.06]"><th scope="row" className="py-4 font-normal text-[#D0D0D0]">{row.label}</th>
              {data.scope.branchId && <><td className="py-4 text-right tabular-nums">{number(row.inbound)}</td><td className="py-4 text-right tabular-nums">{number(row.outbound)}</td></>}
              <td className="py-4 text-right font-semibold tabular-nums text-[#FFC799]">{number(row.total)}</td></tr>)}</tbody>
          </table></div>
          <p className="mt-4 text-xs leading-relaxed text-[#A0A0A0]">Yêu cầu đã được duyệt, hoàn tất hoặc từ chối không thuộc hàng chờ. Chi nhánh xuất xe phê duyệt yêu cầu.</p>
          <Link to="/manager/fleet" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#FFC799] hover:underline">Xử lý điều chuyển <Arrow /></Link>
        </section>
        <section className={panelClass}>
          <PanelHeading title="Chi phí bảo trì" detail="Theo chi nhánh ghi nhận phiếu · toàn bộ lịch sử." />
          <dl className="space-y-5"><div className="border-b border-white/10 pb-5"><dt className="text-xs text-[#A0A0A0]">Đã chi cho phiếu hoàn tất</dt>
            <dd className="mt-2 break-words text-3xl font-semibold tabular-nums tracking-tight text-[#99FFE4]">{money(data.maintenance.completedCost)}</dd>
            <dd className="mt-2 text-xs text-[#A0A0A0]">{number(data.maintenance.completedCount)} phiếu đã hoàn tất</dd></div>
            <div><dt className="text-xs text-[#A0A0A0]">Dự kiến cho phiếu chưa hoàn tất</dt><dd className="mt-2 break-words text-2xl font-semibold tabular-nums tracking-tight text-[#FFC799]">{money(data.maintenance.pendingEstimatedCost)}</dd>
              <dd className="mt-2 text-xs text-[#A0A0A0]">{number(data.maintenance.pendingCount)} phiếu đã lên lịch hoặc đang thực hiện</dd></div>
          </dl>
        </section>
      </div>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 text-xs text-[#A0A0A0]">
        <p>Thống kê chỉ tính xe chưa xóa và phiếu liên quan đến những xe này.</p>
        <Link to="/manager/vehicles" className={outlineButton}>Quản lý xe & giá thuê <Arrow /></Link>
      </div>
    </>}
  </div>;
}
