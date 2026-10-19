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
        setError('Không thể tải ma trận phân quyền.');
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj.response?.data?.message || 'Lỗi khi tải thông tin phân quyền.');
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
              <span>UC-99 Role-Based Access Control Architecture</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] tracking-tight">
              Ma trận Phân quyền Hệ thống (RBAC Matrix)
            </h1>
            <p className="text-xs sm:text-sm text-[#A0A0A0] mt-1.5 max-w-2xl leading-relaxed">
              Quy chuẩn kiểm soát truy cập và bảo vệ điểm cuối (Endpoint Authorization) cho 4 cấp độ vai trò người dùng trong hệ sinh thái Motorent.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={fetchRbacData}
              disabled={loading}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#161616] border border-white/10 hover:border-white/20 text-xs font-semibold text-[#F5F5F5] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FFC799]' : ''}`} />
              <span>Làm mới ma trận</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            2. 4-ROLE ARCHITECTURAL CARDS
            ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map((roleKey) => {
            const roleInfo = data?.roleDescriptions?.[roleKey] || {
              name: roleKey,
              description: 'Vai trò người dùng trong hệ thống',
              badgeColor: 'text-white border-white/20 bg-white/5',
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
                      Vai trò của bạn
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
                placeholder="Tìm quyền theo tên (vd: BOOKING_CHECKIN, eKYC...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#101010] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F5F5F5] placeholder-[#6E6E6E] outline-none focus:border-[#FFC799] transition-colors"
              />
            </div>

            {/* Role Filter Selector */}
            <div className="flex items-center space-x-2 self-start md:self-auto text-xs">
              <span className="text-[#6E6E6E]">Lọc theo vai trò:</span>
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="bg-[#101010] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]"
              >
                <option value="all">Tất cả vai trò</option>
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
              Tất cả phân hệ ({allPermissions.length})
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
                <span>{mod}</span>
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
                  <th className="py-4 px-6 w-1/3">Quyền hạn hệ thống &amp; Diễn giải</th>
                  <th className="py-4 px-4 w-1/6">Phân hệ</th>
                  {roles.map((r) => (
                    <th key={r} className="py-4 px-4 text-center">
                      <span className="block text-xs font-bold text-[#F5F5F5]">{r}</span>
                      <span className="text-[10px] text-[#6E6E6E] font-normal">
                        {r === 'SystemAdmin'
                          ? 'Toàn quyền'
                          : r === 'BranchManager'
                          ? 'Chi nhánh'
                          : r === 'Staff'
                          ? 'Vận hành'
                          : 'Cá nhân'}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-xs">
                {filteredPermissions.length === 0 ? (
                  <tr>
                    <td colSpan={2 + roles.length} className="py-12 text-center text-[#6E6E6E]">
                      Không tìm thấy quyền hạn phù hợp với bộ lọc tìm kiếm.
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
                              {item.label}
                            </div>
                            <div className="font-mono text-[11px] text-[#6E6E6E] mt-0.5">
                              {item.permission}
                            </div>
                            <div className="text-[11px] text-[#A0A0A0] mt-1 leading-relaxed">
                              {item.description}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Module Badge */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#101010] border border-white/10 text-[11px] text-[#A0A0A0]">
                          {getModuleIcon(item.moduleName)}
                          <span>{item.moduleName}</span>
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
                <span className="text-[#A0A0A0]">Được phép truy cập (Enforced)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span>Không có quyền (HTTP 403 Forbidden)</span>
              </span>
            </div>
            <div>
              Tổng số quyền quản trị: <strong className="text-[#F5F5F5]">{allPermissions.length} quyền</strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
