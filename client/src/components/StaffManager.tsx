import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Edit3,
  UserX,
  UserCheck,
  Search,
  Building2,
  Phone,
  Mail,
  Shield,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Lock,
} from 'lucide-react';
import { api } from '../services/api';
import type { User, Branch } from '../types';
import { useAuth } from '../context/AuthContext';

interface StaffFormData {
  username: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  branchId: string;
}

export const StaffManager: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isManager = currentUser?.roles === 'BranchManager';
  const isAdmin = currentUser?.roles === 'SystemAdmin';

  const [staffList, setStaffList] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<StaffFormData>({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    branchId: '',
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data?.success) {
        setBranches(res.data.data);
      }
    } catch {
      // Ignore if fail
    }
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (branchFilter !== 'all') params.branchId = branchFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/staff', { params });
      if (res.data?.success) {
        setStaffList(res.data.data);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Không thể tải danh sách nhân viên.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [statusFilter, branchFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStaff();
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      branchId: isManager && currentUser?.branchId ? String((currentUser.branchId as any)._id || currentUser.branchId) : '',
    });
    setEditingStaff(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEditModal = (staff: User) => {
    setEditingStaff(staff);
    const branchIdVal = staff.branchId ? (typeof staff.branchId === 'object' ? staff.branchId._id : staff.branchId) : '';
    setFormData({
      username: staff.username,
      email: staff.email || '',
      password: '',
      firstName: staff.firstName || '',
      lastName: staff.lastName || '',
      phoneNumber: staff.phoneNumber || '',
      branchId: branchIdVal,
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingStaff) {
        // UC-82: Edit Staff
        const res = await api.put(`/staff/${editingStaff._id}`, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          branchId: formData.branchId || undefined,
        });

        if (res.data?.success) {
          showToast('success', res.data.message || 'Cập nhật nhân viên thành công.');
          setShowAddModal(false);
          fetchStaff();
        }
      } else {
        // UC-81: Add Staff
        const res = await api.post('/staff', {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          branchId: formData.branchId,
        });

        if (res.data?.success) {
          showToast('success', res.data.message || 'Thêm nhân viên mới thành công.');
          setShowAddModal(false);
          fetchStaff();
        }
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin nhân viên.');
    } finally {
      setSubmitting(false);
    }
  };

  // UC-83: Deactivate Staff (status=Suspended)
  const handleToggleStatus = async (staff: User) => {
    const isSuspending = staff.status === 'Active';
    const confirmMsg = isSuspending
      ? `Bạn có chắc muốn vô hiệu hóa (khóa quyền) tài khoản nhân viên "${staff.firstName} ${staff.lastName}"?`
      : `Bạn có chắc muốn kích hoạt lại tài khoản nhân viên "${staff.firstName} ${staff.lastName}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const endpoint = isSuspending ? `/staff/${staff._id}/deactivate` : `/staff/${staff._id}/activate`;
      const res = await api.put(endpoint);

      if (res.data?.success) {
        showToast('success', res.data.message || 'Cập nhật trạng thái thành công.');
        fetchStaff();
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Không thể thay đổi trạng thái nhân viên.');
    }
  };

  const stats = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter((s) => s.status === 'Active').length;
    const suspended = staffList.filter((s) => s.status === 'Suspended').length;
    return { total, active, suspended };
  }, [staffList]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          role="status"
          className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-auto text-current opacity-70 hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header & KPI Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="text-[#FFC799]" size={26} />
            Quản lý Nhân sự & Đội ngũ quầy (UC-81 - UC-83)
          </h2>
          <p className="text-sm text-[#A0A0A0] mt-1">
            Thêm mới, cập nhật hồ sơ và quản lý trạng thái tài khoản nhân viên các trạm.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFC799] text-[#101010] font-semibold text-sm hover:bg-[#ffb77d] transition-all shadow-lg shadow-[#FFC799]/10"
        >
          <UserPlus size={18} />
          Thêm nhân viên mới
        </button>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-white/5 text-[#FFC799]">
            <Users size={22} />
          </div>
          <div>
            <div className="text-xs text-[#A0A0A0] uppercase font-semibold">Tổng số nhân sự</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
        </div>

        <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <UserCheck size={22} />
          </div>
          <div>
            <div className="text-xs text-[#A0A0A0] uppercase font-semibold">Đang hoạt động</div>
            <div className="text-2xl font-bold text-emerald-400">{stats.active}</div>
          </div>
        </div>

        <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
            <UserX size={22} />
          </div>
          <div>
            <div className="text-xs text-[#A0A0A0] uppercase font-semibold">Đang tạm khóa</div>
            <div className="text-2xl font-bold text-rose-400">{stats.suspended}</div>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-[#161616] border border-white/10 rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0A0A0]" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo họ tên, email, SĐT hoặc tên tài khoản..."
              className="w-full bg-[#101010] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#606060] focus:border-[#FFC799] focus:outline-none transition-colors"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-[#101010] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#FFC799] focus:outline-none"
              >
                <option value="all">Tất cả chi nhánh</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#101010] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#FFC799] focus:outline-none"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Active">Đang hoạt động</option>
              <option value="Suspended">Đã tạm khóa</option>
            </select>

            <button
              type="button"
              onClick={fetchStaff}
              disabled={loading}
              className="p-2.5 rounded-xl border border-white/10 bg-[#101010] text-[#D0D0D0] hover:text-white hover:border-[#FFC799] transition-colors"
              title="Tải lại danh sách"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Staff List View */}
      {loading ? (
        <div className="p-12 text-center text-[#A0A0A0] flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-[#FFC799]" />
          <span>Đang tải danh sách nhân viên...</span>
        </div>
      ) : staffList.length === 0 ? (
        <div className="bg-[#161616] border border-white/10 rounded-2xl p-12 text-center">
          <Users size={40} className="mx-auto text-[#606060] mb-3" />
          <h3 className="text-base font-semibold text-white">Chưa có nhân viên nào phù hợp</h3>
          <p className="text-sm text-[#A0A0A0] mt-1 max-w-md mx-auto">
            Không tìm thấy nhân viên theo bộ lọc hiện tại hoặc chưa có tài khoản nào được tạo.
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFC799] text-[#101010] text-sm font-semibold hover:bg-[#ffb77d] transition-colors"
          >
            <UserPlus size={16} />
            Thêm nhân viên đầu tiên
          </button>
        </div>
      ) : (
        <div className="bg-[#161616] border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#101010] border-b border-white/10 text-xs text-[#A0A0A0] uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Nhân viên</th>
                  <th className="py-3.5 px-4">Tài khoản & Email</th>
                  <th className="py-3.5 px-4">Chi nhánh công tác</th>
                  <th className="py-3.5 px-4">Số điện thoại</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {staffList.map((staff) => {
                  const branchObj = typeof staff.branchId === 'object' ? staff.branchId : null;
                  return (
                    <tr key={staff._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#FFC799]/15 border border-[#FFC799]/30 flex items-center justify-center font-bold text-[#FFC799] text-xs">
                            {staff.firstName?.charAt(0) || 'S'}
                            {staff.lastName?.charAt(0) || 'T'}
                          </div>
                          <div>
                            <div className="font-semibold text-white">
                              {staff.firstName} {staff.lastName}
                            </div>
                            <div className="text-xs text-[#A0A0A0] flex items-center gap-1">
                              <Shield size={12} className="text-[#FFC799]" />
                              Nhân viên quầy (Staff)
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-white font-mono text-xs">@{staff.username}</div>
                        <div className="text-xs text-[#A0A0A0] flex items-center gap-1 mt-0.5">
                          <Mail size={12} />
                          {staff.email}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {branchObj ? (
                          <div className="flex items-center gap-1.5 text-white">
                            <Building2 size={14} className="text-[#FFC799] flex-shrink-0" />
                            <span>{branchObj.name}</span>
                          </div>
                        ) : (
                          <span className="text-[#606060] italic">Chưa gán</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-[#D0D0D0] font-mono text-xs">
                          <Phone size={12} />
                          {staff.phoneNumber || '---'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            staff.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {staff.status === 'Active' ? (
                            <>
                              <UserCheck size={12} /> Hoạt động
                            </>
                          ) : (
                            <>
                              <UserX size={12} /> Tạm khóa
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(staff)}
                            className="p-1.5 rounded-lg border border-white/10 hover:border-[#FFC799] text-[#D0D0D0] hover:text-white transition-colors"
                            title="Sửa thông tin"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(staff)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              staff.status === 'Active'
                                ? 'border-rose-500/20 text-rose-400 hover:bg-rose-500/10'
                                : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                            title={staff.status === 'Active' ? 'Vô hiệu hóa (Tạm khóa)' : 'Mở khóa kích hoạt'}
                          >
                            {staff.status === 'Active' ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Staff Modal (UC-81, UC-82) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#161616] border border-white/15 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="text-[#FFC799]" size={20} />
                {editingStaff ? 'Cập nhật thông tin nhân viên (UC-82)' : 'Thêm tài khoản nhân viên mới (UC-81)'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#A0A0A0] hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                    Họ đệm <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Nguyễn Văn"
                    className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                    Tên <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="An"
                    className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                  />
                </div>
              </div>

              {!editingStaff && (
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                    Tên đăng nhập (Username) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="staff_danang01"
                    className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                  Email liên hệ <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  disabled={Boolean(editingStaff)}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="staff@motorent.vn"
                  className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none disabled:opacity-50"
                />
              </div>

              {!editingStaff && (
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                    Mật khẩu khởi tạo <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                  Số điện thoại <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="0901234567"
                  className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                  Chi nhánh công tác <span className="text-rose-400">*</span>
                </label>
                {isAdmin ? (
                  <select
                    required
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                  >
                    <option value="">-- Chọn chi nhánh công tác --</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={
                      branches.find((b) => String(b._id) === String(currentUser?.branchId))?.name ||
                      'Chi nhánh quản lý của bạn'
                    }
                    className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-[#A0A0A0] opacity-60"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-[#D0D0D0] hover:text-white hover:border-white/20 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#FFC799] text-[#101010] text-sm font-semibold hover:bg-[#ffb77d] transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : editingStaff ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
