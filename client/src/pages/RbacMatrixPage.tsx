import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Search,
  Filter,
  Users,
  Building2,
  Bike,
  FileText,
  DollarSign,
  Headphones,
  RefreshCw,
  Info,
  Check,
  Minus,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/I18nContext';

const MODULE_NAME_EN: Record<string, string> = {
  'Người dùng & Định danh': 'Users & Identity',
  'Chi nhánh & Trạm xe': 'Stations & Branches',
  'Phương tiện & Kho bãi': 'Vehicles & Fleet',
  'Vận hành đơn hàng': 'Order Operations',
  'Tài chính & Kế toán': 'Finance & Accounting',
  'Bảo mật & Kiểm toán': 'Security & Audit',
  'Nhân sự & Hỗ trợ': 'Staff & Support',
  'Cấu hình & CMS Hệ thống': 'System CMS & Config',
  'Chức năng chung': 'General Features',
};

const PERMISSION_EN: Record<string, { label: string; description: string }> = {
  USER_VIEW: { label: 'View Staff & User List', description: 'Query user accounts, active roles, and assigned branch' },
  USER_MANAGE: { label: 'Account Management', description: 'Create manager/staff accounts, lock/unlock accounts' },
  BRANCH_VIEW: { label: 'View Branch Stations', description: 'Browse branch locations, GPS coords, opening hours' },
  BRANCH_MANAGE: { label: 'Branch Management', description: 'Add, update details, GPS, or deactivate branch stations' },
  CATEGORY_MANAGE: { label: 'Vehicle Category Management', description: 'Create, update category models, engine size, fuel specs' },
  DISCOUNT_MANAGE: { label: 'Discounts & Voucher Hub', description: 'Issue, update discount vouchers and campaign rules' },
  SYSTEM_CONFIG: { label: 'System Configuration', description: 'Manage business params, hotline, auto-cancellation timers' },
  CMS_MANAGE: { label: 'Banners & Static CMS', description: 'Publish promotional banners, terms, policies, and FAQs' },
  BRANCH_COMPARE: { label: 'Cross-Branch Comparison', description: 'Compare utilization, revenue, and fleet efficiency across branches' },
  VEHICLE_VIEW: { label: 'View Fleet & Availability', description: 'Browse available vehicles, rental rates, license plates' },
  VEHICLE_MANAGE: { label: 'Fleet Vehicle Control', description: 'Add new motorbikes, update rental rates, specs, and status' },
  VEHICLE_TRANSFER: { label: 'Inter-Station Transfer', description: 'Initiate and approve vehicle transfers between stations' },
  BOOKING_VIEW: { label: 'View Rental Orders', description: 'Inspect schedules, rental contract details, and progress' },
  BOOKING_CREATE: { label: 'Create Rental Booking', description: 'Reserve motorbike online and lock vehicle plate' },
  BOOKING_CHECKIN: { label: 'Process Check-in', description: 'Inspect bike, record ODO/fuel, collect digital signature' },
  BOOKING_CHECKOUT: { label: 'Process Check-out', description: 'Return vehicle, inspect damage, assess surcharges and settle' },
  BOOKING_CANCEL: { label: 'Cancel Booking', description: 'Cancel booking according to refund policy terms' },
  BOOKING_COUNTER_PAY: { label: 'Counter Desk Payment', description: 'Collect cash or POS card payments at branch counter' },
  BOOKING_APPROVE: { label: 'Approve Rental Order', description: 'Branch manager approves rental requests' },
  BOOKING_REJECT: { label: 'Reject Rental Order', description: 'Reject rental request with reason and trigger 100% refund' },
  EKYC_VIEW: { label: 'View eKYC Documents', description: 'Inspect customer ID cards and driver license records' },
  EKYC_REVIEW: { label: 'Review & Verify eKYC', description: 'Approve or reject customer digital identity documents' },
  AUDIT_VIEW: { label: 'Security Audit Log Viewer', description: 'Inspect complete audit trail of sensitive mutations' },
  FINANCE_RECONCILE: { label: 'Station Financial Reconciliation', description: 'Reconcile cash, POS, and online gateway payments per shift' },
  FINANCE_TAX_REPORT: { label: 'Tax & Financial Reports', description: 'Export invoice data, VAT reports, and revenue statements' },
  MAINTENANCE_VIEW: { label: 'View Maintenance Logs', description: 'Track periodic oil changes, maintenance schedules, and repairs' },
  MAINTENANCE_LOG: { label: 'Record Maintenance', description: 'Log technical repairs and mark bike in maintenance mode' },
  STAFF_MANAGE: { label: 'Station Staff Management', description: 'Add, update, and manage station front desk staff profiles' },
  STAFF_SCHEDULE: { label: 'Staff Shift Scheduling', description: 'Schedule and coordinate front desk shifts across stations' },
  COMPLAINT_RESOLVE: { label: 'Claims Resolution', description: 'Resolve customer complaints and approve compensation' },
  CHAT_STAFF_CONSOLE: { label: 'Live Chat Console', description: 'Provide real-time support and chat dispatch to customers' },
};

const ROLE_DESC_EN: Record<string, { name: string; description: string }> = {
  SystemAdmin: {
    name: 'System Administrator',
    description: 'Full multi-branch system administration, security configurations, high-level financial reports, and audit logs.',
  },
  BranchManager: {
    name: 'Branch Manager',
    description: 'Comprehensive branch operations management, fleet control, transfers, staff roster, and branch revenue reconciliation.',
  },
  Staff: {
    name: 'Station Front Desk Staff',
    description: 'Check-in/check-out handover procedures, counter desk payments, eKYC verification, and customer support.',
  },
  Customer: {
    name: 'Renter Customer',
    description: 'Browse fleet, book motorbikes online, pay deposits via VNPay, submit claims, and track rental trips.',
  },
};


interface RoleDescription {
  name: string;
  description: string;
  badgeColor: string;
}

interface PermissionItem {
  permission: string;
  label: string;
  description: string;
  allowedRoles: string[];
}

interface RbacData {
  role?: string;
  permissions?: string[];
  matrix: Record<string, string[]>;
  roles: string[];
  roleDescriptions: Record<string, RoleDescription>;
  modules: Record<string, PermissionItem[]>;
}

export const RbacMatrixPage: React.FC = () => {
  const { user } = useAuth();
  const { isEnglish } = useTranslation();
  const [data, setData] = useState<RbacData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  const fetchRbacData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/system/permissions');
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError(isEnglish ? 'Failed to load RBAC permissions matrix.' : 'Không thể tải ma trận phân quyền.');
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj.response?.data?.message || (isEnglish ? 'Error loading permission information.' : 'Lỗi khi tải thông tin phân quyền.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRbacData();
  }, []);

  const roles = data?.roles || ['SystemAdmin', 'BranchManager', 'Staff', 'Customer'];
  const modules = data?.modules || {};
  const moduleNames = Object.keys(modules);

  // Flatten and filter permissions
  const allPermissions: Array<PermissionItem & { moduleName: string }> = [];
  for (const [modName, items] of Object.entries(modules)) {
    for (const item of items) {
      allPermissions.push({ ...item, moduleName: modName });
    }
  }

  const filteredPermissions = allPermissions.filter((item) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.permission.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesModule = selectedModule === 'all' || item.moduleName === selectedModule;

    const matchesRole =
      selectedRoleFilter === 'all' || item.allowedRoles.includes(selectedRoleFilter);

    return matchesSearch && matchesModule && matchesRole;
  });

  const getModuleIcon = (mod: string) => {
    switch (mod) {
      case 'Người dùng & Định danh':
        return <Users className="w-4 h-4 text-[#FFC799]" />;
      case 'Chi nhánh & Trạm xe':
        return <Building2 className="w-4 h-4 text-emerald-400" />;
      case 'Phương tiện & Kho bãi':
        return <Bike className="w-4 h-4 text-sky-400" />;
      case 'Vận hành đơn hàng':
        return <FileText className="w-4 h-4 text-amber-400" />;
      case 'Tài chính & Kế toán':
      case 'Bảo mật & Kiểm toán':
        return <DollarSign className="w-4 h-4 text-violet-400" />;
      default:
        return <Headphones className="w-4 h-4 text-pink-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] py-8 sm:py-12 bg-editorial-grain">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* =====================================================================
            1. HEADER BANNER
            ===================================================================== */}
        <div className="pb-6 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#FFC799]/10 border border-[#FFC799]/25 text-[#FFC799] text-xs font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isEnglish ? 'Access Control Architecture (RBAC)' : 'Kiến trúc Phân quyền Truy cập (RBAC)'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] tracking-tight">
              {isEnglish ? 'System RBAC Matrix' : 'Ma trận Phân quyền Hệ thống (RBAC Matrix)'}
            </h1>
            <p className="text-xs sm:text-sm text-[#A0A0A0] mt-1.5 max-w-2xl leading-relaxed">
              {isEnglish ? 'Access control standard and endpoint authorization rules for 4 user roles in Motorent ecosystem.' : 'Quy chuẩn kiểm soát truy cập và bảo vệ điểm cuối (Endpoint Authorization) cho 4 cấp độ vai trò người dùng trong hệ sinh thái Motorent.'}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={fetchRbacData}
              disabled={loading}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#161616] border border-white/10 hover:border-white/20 text-xs font-semibold text-[#F5F5F5] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FFC799]' : ''}`} />
              <span>{isEnglish ? 'Refresh Matrix' : 'Làm mới ma trận'}</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            2. 4-ROLE ARCHITECTURAL CARDS
            ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map((roleKey) => {
            const roleInfo = {
              name: isEnglish
                ? (ROLE_DESC_EN[roleKey]?.name || data?.roleDescriptions?.[roleKey]?.name || roleKey)
                : (data?.roleDescriptions?.[roleKey]?.name || roleKey),
              description: isEnglish
                ? (ROLE_DESC_EN[roleKey]?.description || data?.roleDescriptions?.[roleKey]?.description || 'User role in system')
                : (data?.roleDescriptions?.[roleKey]?.description || 'Vai trò người dùng trong hệ thống'),
              badgeColor: data?.roleDescriptions?.[roleKey]?.badgeColor || 'text-white border-white/20 bg-white/5',
            };
            const isCurrentUserRole = user?.roles === roleKey;

            return (
              <div
                key={roleKey}
                className={`p-5 rounded-2xl bg-[#161616] border transition-all ${
                  isCurrentUserRole
                    ? 'border-[#FFC799]/50 shadow-lg shadow-[#FFC799]/5 ring-1 ring-[#FFC799]/30'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${roleInfo.badgeColor}`}
                  >
                    {roleKey}
                  </span>
                  {isCurrentUserRole && (
                    <span className="text-[10px] font-semibold text-[#FFC799] uppercase tracking-wider bg-[#FFC799]/15 px-2 py-0.5 rounded">
                      {isEnglish ? 'Your Current Role' : 'Vai trò của bạn'}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-[#F5F5F5] mb-1">{roleInfo.name}</h3>
                <p className="text-xs text-[#A0A0A0] leading-relaxed line-clamp-3">
                  {roleInfo.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* =====================================================================
            3. SEARCH & MODULE FILTER CONTROLS
            ===================================================================== */}
        <div className="bg-[#161616] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-[#6E6E6E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isEnglish ? 'Search permission by name (e.g. BOOKING_CHECKIN, eKYC...)' : 'Tìm quyền theo tên (vd: BOOKING_CHECKIN, eKYC...)'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#101010] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F5F5F5] placeholder-[#6E6E6E] outline-none focus:border-[#FFC799] transition-colors"
              />
            </div>

            {/* Role Filter Selector */}
            <div className="flex items-center space-x-2 self-start md:self-auto text-xs">
              <span className="text-[#6E6E6E]">{isEnglish ? 'Filter by role:' : 'Lọc theo vai trò:'}</span>
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="bg-[#101010] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]"
              >
                <option value="all">{isEnglish ? 'All Roles' : 'Tất cả vai trò'}</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Module Tabs Strip */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]">
            <button
              onClick={() => setSelectedModule('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedModule === 'all'
                  ? 'bg-[#FFC799] text-[#101010]'
                  : 'bg-[#101010] border border-white/10 text-[#A0A0A0] hover:text-[#F5F5F5]'
              }`}
            >
              {isEnglish ? `All Modules (${allPermissions.length})` : `Tất cả phân hệ (${allPermissions.length})`}
            </button>
            {moduleNames.map((mod) => (
              <button
                key={mod}
                onClick={() => setSelectedModule(mod)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center space-x-1.5 cursor-pointer ${
                  selectedModule === mod
                    ? 'bg-[#FFC799] text-[#101010]'
                    : 'bg-[#101010] border border-white/10 text-[#A0A0A0] hover:text-[#F5F5F5]'
                }`}
              >
                {getModuleIcon(mod)}
                <span>{isEnglish ? (MODULE_NAME_EN[mod] || mod) : mod}</span>
                <span className="text-[10px] opacity-70">({modules[mod]?.length || 0})</span>
              </button>
            ))}
          </div>
        </div>

        {/* =====================================================================
            4. INTERACTIVE RBAC MATRIX TABLE
            ===================================================================== */}
        <div className="bg-[#161616] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#101010] border-b border-white/10 text-xs text-[#6E6E6E] font-semibold">
                  <th className="py-4 px-6 w-1/3">{isEnglish ? 'System Permission & Description' : 'Quyền hạn hệ thống & Diễn giải'}</th>
                  <th className="py-4 px-4 w-1/6">{isEnglish ? 'Module' : 'Phân hệ'}</th>
                  {roles.map((r) => (
                    <th key={r} className="py-4 px-4 text-center">
                      <span className="block text-xs font-bold text-[#F5F5F5]">{r}</span>
                      <span className="text-[10px] text-[#6E6E6E] font-normal">
                        {r === 'SystemAdmin'
                          ? (isEnglish ? 'Full Access' : 'Toàn quyền')
                          : r === 'BranchManager'
                          ? (isEnglish ? 'Branch Level' : 'Chi nhánh')
                          : r === 'Staff'
                          ? (isEnglish ? 'Operations' : 'Vận hành')
                          : (isEnglish ? 'Personal' : 'Cá nhân')}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-xs">
                {filteredPermissions.length === 0 ? (
                  <tr>
                    <td colSpan={2 + roles.length} className="py-12 text-center text-[#6E6E6E]">
                      {isEnglish ? 'No permissions match your search criteria.' : 'Không tìm thấy quyền hạn phù hợp với bộ lọc tìm kiếm.'}
                    </td>
                  </tr>
                ) : (
                  filteredPermissions.map((item) => (
                    <tr
                      key={item.permission}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Permission Name & Label */}
                      <td className="py-4 px-6">
                        <div className="flex items-start space-x-3">
                          <div className="p-1.5 rounded-lg bg-[#101010] border border-white/10 shrink-0 mt-0.5">
                            <Lock className="w-3.5 h-3.5 text-[#FFC799]" />
                          </div>
                          <div>
                            <div className="font-bold text-[#F5F5F5] group-hover:text-[#FFC799] transition-colors">
                              {isEnglish ? (PERMISSION_EN[item.permission]?.label || item.label) : item.label}
                            </div>
                            <div className="font-mono text-[11px] text-[#6E6E6E] mt-0.5">
                              {item.permission}
                            </div>
                            <div className="text-[11px] text-[#A0A0A0] mt-1 leading-relaxed">
                              {isEnglish ? (PERMISSION_EN[item.permission]?.description || item.description) : item.description}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Module Badge */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#101010] border border-white/10 text-[11px] text-[#A0A0A0]">
                          {getModuleIcon(item.moduleName)}
                          <span>{isEnglish ? (MODULE_NAME_EN[item.moduleName] || item.moduleName) : item.moduleName}</span>
                        </span>
                      </td>

                      {/* Role Checkmarks */}
                      {roles.map((r) => {
                        const hasAccess = item.allowedRoles.includes(r);
                        return (
                          <td key={r} className="py-4 px-4 text-center">
                            {hasAccess ? (
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#FFC799]/15 border border-[#FFC799]/30 text-[#FFC799]">
                                <Check className="w-4 h-4 stroke-[2.5]" />
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[#6E6E6E]/40">
                                <Minus className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-4 bg-[#101010] border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs text-[#6E6E6E]">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFC799]" />
                <span className="text-[#A0A0A0]">{isEnglish ? 'Allowed / Enforced' : 'Được phép truy cập (Enforced)'}</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span>{isEnglish ? 'Forbidden (HTTP 403 Forbidden)' : 'Không có quyền (HTTP 403 Forbidden)'}</span>
              </span>
            </div>
            <div>
              {isEnglish ? 'Total administrative permissions: ' : 'Tổng số quyền quản trị: '}<strong className="text-[#F5F5F5]">{allPermissions.length} {isEnglish ? 'permissions' : 'quyền'}</strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
