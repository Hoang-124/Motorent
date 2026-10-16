import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  MapPin,
  Plus,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Mail,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  X,
  ExternalLink,
  Navigation,
  KeyRound,
  UserCheck,
  UserX,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import type { Branch, User } from '../types';
import { BranchInteractiveMap } from '../components/BranchInteractiveMap';

type AdminTab = 'branches' | 'users' | 'map';

interface BranchFormData {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  location_lat: number | string;
  location_lng: number | string;
  hours_open: string;
  hours_close: string;
  managerId: string;
  description: string;
}

interface UserFormData {
  username: string;
  password?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  roles: 'BranchManager' | 'Staff' | 'Customer' | 'SystemAdmin';
  branchId: string;
}

const DA_NANG_PRESETS = [
  { name: 'Sân bay Quốc tế Đà Nẵng (T1/T2)', lat: 16.0538, lng: 108.1994 },
  { name: 'Bãi biển Mỹ Khê - Võ Nguyên Giáp', lat: 16.0592, lng: 108.2458 },
  { name: 'Trung tâm Hải Châu - Bạch Đằng', lat: 16.0681, lng: 108.2235 },
  { name: 'Cầu Rồng - Trần Hưng Đạo', lat: 16.0611, lng: 108.2274 },
  { name: 'Bán đảo Sơn Trà - Chùa Linh Ứng', lat: 16.1002, lng: 108.2774 },
  { name: 'Ngũ Hành Sơn - Non Nước', lat: 16.0028, lng: 108.2638 },
];

export const AdminCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('branches');

  // Branch states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchLoading, setBranchLoading] = useState<boolean>(true);
  const [branchSearch, setBranchSearch] = useState<string>('');
  const [branchFilterStatus, setBranchFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // User states
  const [users, setUsers] = useState<User[]>([]);
  const [userLoading, setUserLoading] = useState<boolean>(true);
  const [userSearch, setUserSearch] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  const [userBranchFilter, setUserBranchFilter] = useState<string>('all');

  // Managers list for dropdowns
  const [availableManagers, setAvailableManagers] = useState<User[]>([]);

  // Notification Banner
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  // Modals
  const [showAddBranchModal, setShowAddBranchModal] = useState<boolean>(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deactivatingBranch, setDeactivatingBranch] = useState<Branch | null>(null);
  const [activeBookingsCount, setActiveBookingsCount] = useState<number>(0);
  const [checkingBookings, setCheckingBookings] = useState<boolean>(false);

  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [lockingUser, setLockingUser] = useState<User | null>(null);
  const [lockReason, setLockReason] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Forms initial state
  const initialBranchForm: BranchFormData = {
    name: '',
    code: 'CN-',
    address: '',
    phone: '',
    email: '',
    location_lat: 16.054,
    location_lng: 108.202,
    hours_open: '06:00',
    hours_close: '23:00',
    managerId: '',
    description: '',
  };

  const initialUserForm: UserFormData = {
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    roles: 'BranchManager',
    branchId: '',
  };

  const [branchForm, setBranchForm] = useState<BranchFormData>(initialBranchForm);
  const [userForm, setUserForm] = useState<UserFormData>(initialUserForm);

  const showToast = (type: 'success' | 'error' | 'warning', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Fetch Branches
  const fetchBranches = async () => {
    setBranchLoading(true);
    try {
      const res = await api.get('/branches?all=true');
      if (res.data?.data) {
        setBranches(res.data.data);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Không thể tải danh sách chi nhánh.');
    } finally {
      setBranchLoading(false);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    setUserLoading(true);
    try {
      const params: Record<string, string> = { limit: '100' };
      if (userRoleFilter !== 'all') params.role = userRoleFilter;
      if (userStatusFilter !== 'all') params.status = userStatusFilter;
      if (userBranchFilter !== 'all') params.branchId = userBranchFilter;
      if (userSearch.trim()) params.search = userSearch.trim();

      const res = await api.get('/admin/users', { params });
      if (res.data?.data) {
        setUsers(res.data.data);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setUserLoading(false);
    }
  };

  // Fetch managers for selector dropdowns
  const fetchManagersList = async () => {
    try {
      const res = await api.get('/admin/users?role=BranchManager&limit=100');
      if (res.data?.data) {
        setAvailableManagers(res.data.data);
      }
    } catch (err) {
      console.warn('Could not load manager list', err);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchUsers();
    fetchManagersList();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [userRoleFilter, userStatusFilter, userBranchFilter]);

  // Handle GPS detection
  const handleDetectGPS = (forEdit = false) => {
    if (!navigator.geolocation) {
      showToast('warning', 'Trình duyệt không hỗ trợ Geolocation.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lng = Math.round(pos.coords.longitude * 10000) / 10000;
        setBranchForm((prev) => ({
          ...prev,
          location_lat: lat,
          location_lng: lng,
        }));
        showToast('success', `Đã lấy tọa độ GPS thực tế: ${lat}, ${lng}`);
      },
      (err) => {
        showToast('warning', `Không thể truy cập GPS: ${err.message}`);
      }
    );
  };

  // Handle Branch Creation
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = branchForm.code.trim().toUpperCase();
    if (!cleanCode || cleanCode === 'CN-') {
      showToast('warning', 'Vui lòng nhập phần mã chi nhánh sau tiền tố CN- (Ví dụ: CN-HC, CN-ST).');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...branchForm,
        code: cleanCode,
        location_lat: Number(branchForm.location_lat),
        location_lng: Number(branchForm.location_lng),
        managerId: branchForm.managerId || undefined,
      };

      const res = await api.post('/branches', payload);
      showToast('success', res.data?.message || 'Tạo chi nhánh mới thành công!');
      setShowAddBranchModal(false);
      setBranchForm(initialBranchForm);
      fetchBranches();
      fetchManagersList();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Không thể tạo chi nhánh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Open Edit Branch Modal
  const openEditBranchModal = (branch: Branch) => {
    setEditingBranch(branch);
    const mId: string =
      typeof branch.managerId === 'object' && branch.managerId !== null
        ? ((branch.managerId as unknown as { _id: string })._id || '')
        : (typeof branch.managerId === 'string' ? branch.managerId : '');

    setBranchForm({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      email: branch.email || '',
      location_lat: branch.location_lat ?? 16.054,
      location_lng: branch.location_lng ?? 108.202,
      hours_open: branch.hours_open || '06:00',
      hours_close: branch.hours_close || '23:00',
      managerId: mId,
      description: branch.description || '',
    });
  };

  // Handle Update Branch
  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;
    const cleanCode = branchForm.code.trim().toUpperCase();
    if (!cleanCode || cleanCode === 'CN-') {
      showToast('warning', 'Vui lòng nhập phần mã chi nhánh sau tiền tố CN- (Ví dụ: CN-HC, CN-ST).');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...branchForm,
        code: cleanCode,
        location_lat: Number(branchForm.location_lat),
        location_lng: Number(branchForm.location_lng),
        managerId: branchForm.managerId || null,
      };

      const res = await api.put(`/branches/${editingBranch._id}`, payload);
      showToast('success', res.data?.message || 'Cập nhật thông tin chi nhánh thành công!');
      setEditingBranch(null);
      fetchBranches();
      fetchManagersList();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Lỗi cập nhật chi nhánh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Deactivate Confirmation Modal with Booking Warning Check (UC-95)
  const openDeactivateModal = async (branch: Branch) => {
    setDeactivatingBranch(branch);
    setCheckingBookings(true);
    try {
      const res = await api.get(`/branches/${branch._id}/active-bookings`);
      setActiveBookingsCount(res.data?.activeBookingsCount || 0);
    } catch (err) {
      console.warn('Could not check active bookings', err);
      setActiveBookingsCount(0);
    } finally {
      setCheckingBookings(false);
    }
  };

  // Confirm Deactivate Branch (UC-95)
  const handleConfirmDeactivate = async () => {
    if (!deactivatingBranch) return;
    setIsSubmitting(true);
    try {
      const res = await api.put(`/branches/${deactivatingBranch._id}/deactivate`);
      if (res.data?.warning) {
        showToast('warning', res.data.warning);
      } else {
        showToast('success', res.data?.message || 'Đã tạm ngưng hoạt động chi nhánh.');
      }
      setDeactivatingBranch(null);
      fetchBranches();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Lỗi khi tạm ngưng chi nhánh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reactivate Branch
  const handleReactivateBranch = async (branchId: string) => {
    try {
      const res = await api.put(`/branches/${branchId}/activate`);
      showToast('success', res.data?.message || 'Đã kích hoạt lại chi nhánh thành công!');
      fetchBranches();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Lỗi khi kích hoạt lại chi nhánh.');
    }
  };

  // Handle Create Manager Account (UC-96)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...userForm,
        username: userForm.username.trim().toLowerCase(),
        email: userForm.email.trim() || undefined,
        branchId: userForm.branchId || undefined,
      };

      const res = await api.post('/admin/users', payload);
      showToast('success', res.data?.message || 'Tạo tài khoản người dùng thành công!');
      setShowAddUserModal(false);
      setUserForm(initialUserForm);
      fetchUsers();
      fetchManagersList();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Lỗi khi tạo tài khoản.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit User Modal (UC-97-98)
  const openEditUserModal = (user: User) => {
    setEditingUser(user);
    const bId: string =
      typeof user.branchId === 'object' && user.branchId !== null
        ? ((user.branchId as unknown as { _id: string })._id || '')
        : (typeof user.branchId === 'string' ? user.branchId : '');

    setUserForm({
      username: user.username,
      password: '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      roles: user.roles,
      branchId: bId,
    });
  };

  // Handle Update User (UC-97-98)
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      const payload = {
        firstName: userForm.firstName,
        lastName: userForm.lastName,
        phoneNumber: userForm.phoneNumber,
        email: userForm.email || undefined,
        roles: userForm.roles,
        branchId: userForm.branchId || null,
        password: userForm.password ? userForm.password : undefined,
      };

      const res = await api.put(`/admin/users/${editingUser._id}`, payload);
      showToast('success', res.data?.message || 'Cập nhật tài khoản thành công!');
      setEditingUser(null);
      fetchUsers();
      fetchManagersList();
      fetchBranches();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Lỗi khi cập nhật tài khoản.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Lock Account (UC-100)
  const handleConfirmLockUser = async () => {
    if (!lockingUser) return;
    setIsSubmitting(true);
    try {
      const res = await api.put(`/admin/users/${lockingUser._id}/lock`, {
        reason: lockReason.trim() || undefined,
      });
      showToast('warning', res.data?.message || 'Đã tạm khóa tài khoản và hủy toàn bộ phiên làm việc.');
      setLockingUser(null);
      setLockReason('');
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Lỗi khi khóa tài khoản.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Unlock Account (UC-101)
  const handleUnlockUser = async (userId: string) => {
    try {
      const res = await api.put(`/admin/users/${userId}/unlock`);
      showToast('success', res.data?.message || 'Đã kích hoạt lại tài khoản thành công.');
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Lỗi khi mở khóa tài khoản.');
    }
  };

  // Helper to remove Vietnamese diacritics for flexible fuzzy searching
  const removeVietnameseTones = (str: string): string => {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  };

  // Relevance-based Search & Filter for Branches (Strictly match code suffix, never generic CN-)
  const filteredBranches = useMemo(() => {
    const rawQ = branchSearch.trim();
    if (!rawQ) {
      return branches.filter((b) =>
        branchFilterStatus === 'all'
          ? true
          : branchFilterStatus === 'active'
          ? b.isActive
          : !b.isActive
      );
    }

    const q = rawQ.toLowerCase();
    const qNorm = removeVietnameseTones(rawQ);
    // If the user typed "CN-NN" or "CN-MK", strip "CN-" so it matches "NN" or "MK"
    const qSuffix = q.replace(/^cn-?/i, '').trim();

    const scoredBranches = branches
      .map((b) => {
        // Status filter check first
        const matchesStatus =
          branchFilterStatus === 'all'
            ? true
            : branchFilterStatus === 'active'
            ? b.isActive
            : !b.isActive;

        if (!matchesStatus) return { branch: b, score: 0 };

        // Suffix of branch code ONLY (strictly exclude CN-)
        const suffix = (b.code || '').toLowerCase().replace(/^cn-?/i, '').trim();
        const rawNameNorm = removeVietnameseTones(b.name || '');
        const cleanName = rawNameNorm.replace(/^(chi nhanh|tram)\s+/, '').trim();
        const addressNorm = removeVietnameseTones(b.address || '');

        let score = 0;

        // 1. Strict Suffix matching (NEVER match generic CN-)
        if (qSuffix) {
          if (suffix === qSuffix) score += 2000;
          else if (suffix.startsWith(qSuffix)) score += 1000;
          else if (suffix.includes(qSuffix)) score += 800;
        }

        // 2. Name matching
        if (q.length === 1) {
          // 1 character: only match if cleanName starts with this char (e.g. 'n' matches 'Non Nước')
          if (cleanName.startsWith(qNorm)) score += 500;
        } else if (q.length === 2) {
          // 2 characters: match suffix or cleanName starts or word starts
          if (cleanName.startsWith(qNorm)) score += 500;
          else if (cleanName.split(/\s+/).some((w) => w.startsWith(qNorm))) score += 200;
        } else {
          // 3+ characters: full name & address search
          if (cleanName.startsWith(qNorm)) score += 500;
          else if (rawNameNorm.includes(qNorm) || cleanName.includes(qNorm)) score += 300;
          if (addressNorm.includes(qNorm)) score += 100;
        }

        return { branch: b, score };
      })
      .filter((item) => item.score > 0);

    // Sort by highest relevance score first
    scoredBranches.sort((a, b) => b.score - a.score);

    return scoredBranches.map((item) => item.branch);
  }, [branches, branchSearch, branchFilterStatus]);

  // Calculate statistics
  const totalBranchesCount = branches.length;
  const activeBranchesCount = branches.filter((b) => b.isActive).length;
  const totalVehiclesCount = branches.reduce((sum, b) => sum + (b.totalVehiclesCount || 0), 0);
  const availableVehiclesCount = branches.reduce((sum, b) => sum + (b.availableVehiclesCount || 0), 0);

  const totalUsersCount = users.length;
  const managersCount = users.filter((u) => u.roles === 'BranchManager').length;
  const staffCount = users.filter((u) => u.roles === 'Staff').length;
  const customerCount = users.filter((u) => u.roles === 'Customer').length;
  const suspendedCount = users.filter((u) => u.status === 'Suspended').length;

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] py-8 sm:py-12 bg-editorial-grain">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border flex items-center space-x-3 shadow-2xl transition-all animate-bounce ${
              toastMessage.type === 'success'
                ? 'bg-[#122A1E] border-[#22C55E]/40 text-[#99FFE4]'
                : toastMessage.type === 'warning'
                ? 'bg-[#2A2012] border-[#EAB308]/40 text-[#FFC799]'
                : 'bg-[#2A1212] border-[#EF4444]/40 text-[#FFA8A8]'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : toastMessage.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-medium">{toastMessage.text}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-white/60 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =====================================================================
            1. HEADER & SYSTEM ADMIN HERO
            ===================================================================== */}
        <div className="pb-6 border-b border-white/[0.08] flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 text-[11px] uppercase tracking-[0.16em] text-[#FFC799] font-semibold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFC799]" />
              <span>Hệ Thống Quản Trị Hệ Thống • System Admin</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#F5F5F5]">
              Trung Tâm Điều Hành <span className="font-serif-display italic text-[#FFC799]">Motorent</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#A0A0A0] mt-1.5">
              Quản lý toàn bộ danh mục chi nhánh trạm nhận/trả xe và phân quyền tài khoản Quản lý chi nhánh (BranchManager), Nhân viên &amp; Khách hàng.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-[#181818] border border-white/10 rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('branches')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
                activeTab === 'branches'
                  ? 'bg-[#FFC799] text-[#101010] shadow'
                  : 'text-[#A0A0A0] hover:text-[#F5F5F5]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Quản lý Chi nhánh</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
                activeTab === 'users'
                  ? 'bg-[#FFC799] text-[#101010] shadow'
                  : 'text-[#A0A0A0] hover:text-[#F5F5F5]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Quản lý &amp; Nhân sự</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
                activeTab === 'map'
                  ? 'bg-[#FFC799] text-[#101010] shadow'
                  : 'text-[#A0A0A0] hover:text-[#F5F5F5]'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Bản đồ GPS Trạm</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            TAB 1: QUẢN LÝ CHI NHÁNH (BRANCHES - UC-93, UC-94, UC-95)
            ===================================================================== */}
        {activeTab === 'branches' && (
          <div className="space-y-6 animate-fade-up">
            {/* Stat Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                <span className="text-[11px] uppercase tracking-wider text-[#A0A0A0] flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#FFC799]" />
                  <span>Tổng số chi nhánh</span>
                </span>
                <p className="text-2xl sm:text-3xl font-bold font-mono-tabular text-[#F5F5F5] mt-2">
                  0{totalBranchesCount}
                </p>
                <span className="text-[11px] text-[#A0A0A0] mt-1 block">Toàn địa bàn TP Đà Nẵng</span>
              </div>

              <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                <span className="text-[11px] uppercase tracking-wider text-[#A0A0A0] flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#99FFE4]" />
                  <span>Trạm đang hoạt động</span>
                </span>
                <p className="text-2xl sm:text-3xl font-bold font-mono-tabular text-[#99FFE4] mt-2">
                  0{activeBranchesCount}
                </p>
                <span className="text-[11px] text-[#A0A0A0] mt-1 block">
                  {totalBranchesCount - activeBranchesCount > 0
                    ? `0${totalBranchesCount - activeBranchesCount} trạm tạm dừng`
                    : '100% trạm vận hành tốt'}
                </span>
              </div>

              <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                <span className="text-[11px] uppercase tracking-wider text-[#A0A0A0] flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#FFC799]" />
                  <span>Quy mô đội xe tại trạm</span>
                </span>
                <p className="text-2xl sm:text-3xl font-bold font-mono-tabular text-[#F5F5F5] mt-2">
                  {totalVehiclesCount} xe
                </p>
                <span className="text-[11px] text-[#A0A0A0] mt-1 block">Tổng phương tiện gán chi nhánh</span>
              </div>

              <div className="bg-[#161616] border border-white/10 rounded-2xl p-5">
                <span className="text-[11px] uppercase tracking-wider text-[#A0A0A0] flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFC799]" />
                  <span>Xe sẵn sàng cho thuê</span>
                </span>
                <p className="text-2xl sm:text-3xl font-bold font-mono-tabular text-[#FFC799] mt-2">
                  {availableVehiclesCount} xe
                </p>
                <span className="text-[11px] text-[#A0A0A0] mt-1 block">Trạng thái Available tại bãi</span>
              </div>
            </div>

            {/* Action Bar & Filters */}
            <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[260px]">
                  <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={branchSearch}
                    onChange={(e) => setBranchSearch(e.target.value)}
                    placeholder="Tìm theo mã (NN, MK...), tên trạm, địa chỉ..."
                    className="w-full pl-9 pr-8 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] placeholder-[#6E6E6E] focus:outline-none focus:border-[#FFC799]"
                  />
                  {branchSearch && (
                    <button
                      type="button"
                      onClick={() => setBranchSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-[#F5F5F5]"
                      title="Xóa tìm kiếm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center bg-[#101010] border border-white/10 rounded-xl p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setBranchFilterStatus('all')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      branchFilterStatus === 'all'
                        ? 'bg-[#2A2A2A] text-[#F5F5F5] font-semibold'
                        : 'text-[#A0A0A0] hover:text-[#F5F5F5]'
                    }`}
                  >
                    Tất cả ({branches.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBranchFilterStatus('active')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      branchFilterStatus === 'active'
                        ? 'bg-[#2A2A2A] text-[#99FFE4] font-semibold'
                        : 'text-[#A0A0A0] hover:text-[#F5F5F5]'
                    }`}
                  >
                    Đang hoạt động ({activeBranchesCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBranchFilterStatus('inactive')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      branchFilterStatus === 'inactive'
                        ? 'bg-[#2A2A2A] text-red-400 font-semibold'
                        : 'text-[#A0A0A0] hover:text-[#F5F5F5]'
                    }`}
                  >
                    Tạm dừng ({branches.length - activeBranchesCount})
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={fetchBranches}
                  className="p-2.5 bg-[#101010] border border-white/10 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
                  title="Làm mới"
                >
                  <RefreshCw className={`w-4 h-4 ${branchLoading ? 'animate-spin' : ''}`} />
                </button>

                {/* UC-93: Add Branch Button */}
                <button
                  type="button"
                  onClick={() => {
                    setBranchForm(initialBranchForm);
                    setShowAddBranchModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#FFC799] text-[#101010] text-xs font-semibold hover:bg-[#ffe2cc] transition-all flex items-center space-x-2 shadow-md active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Thêm Chi Nhánh Mới</span>
                </button>
              </div>
            </div>

            {/* Branches Grid Cards */}
            {branchLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-64 rounded-2xl bg-[#161616] border border-white/10 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredBranches.length === 0 ? (
              <div className="bg-[#161616] border border-white/10 rounded-2xl p-12 text-center space-y-3">
                <Building2 className="w-10 h-10 text-[#6E6E6E] mx-auto" />
                <h3 className="text-base font-semibold text-[#F5F5F5]">Không tìm thấy chi nhánh phù hợp</h3>
                <p className="text-xs text-[#A0A0A0] max-w-md mx-auto">
                  Hãy thử thay đổi từ khóa tìm kiếm hoặc bấm nút "Thêm Chi Nhánh Mới" để thiết lập trạm giao nhận xe.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredBranches.map((branch, idx) => {
                  const managerObj =
                    typeof branch.managerId === 'object' && branch.managerId !== null
                      ? (branch.managerId as User)
                      : null;

                  return (
                    <div
                      key={branch._id}
                      className={`bg-[#161616] border rounded-2xl p-6 flex flex-col justify-between transition-all hover:border-white/25 ${
                        branch.isActive
                          ? 'border-white/10'
                          : 'border-red-500/30 bg-[#161313]'
                      }`}
                    >
                      <div className="space-y-4">
                        {/* Header: Code, Name, Status Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#101010] text-[#FFC799] border border-white/10">
                                {branch.code}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                                  branch.isActive
                                    ? 'bg-[#122A1E] text-[#99FFE4] border-[#22C55E]/30'
                                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                                }`}
                              >
                                {branch.isActive ? 'Đang hoạt động' : 'Đã tạm ngưng'}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-[#F5F5F5] pt-1">
                              {branch.name}
                            </h3>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold font-mono-tabular text-[#99FFE4] block">
                              {branch.availableVehiclesCount ?? 0} xe sẵn sàng
                            </span>
                            <span className="text-[11px] text-[#A0A0A0] font-mono-tabular">
                              Tổng: {branch.totalVehiclesCount ?? 0} xe
                            </span>
                          </div>
                        </div>

                        {/* Address & GPS */}
                        <div className="space-y-1.5 text-xs text-[#A0A0A0] pt-1">
                          <p className="flex items-start space-x-2">
                            <MapPin className="w-4 h-4 text-[#FFC799] shrink-0 mt-0.5" />
                            <span>{branch.address}</span>
                          </p>
                          {branch.location_lat !== undefined && branch.location_lng !== undefined && (
                            <p className="flex items-center space-x-2 text-[11px] font-mono pl-6 text-[#6E6E6E]">
                              <span>GPS: {branch.location_lat}, {branch.location_lng}</span>
                            </p>
                          )}
                        </div>

                        {/* Operational Details Grid */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="bg-[#101010] border border-white/[0.06] rounded-xl p-3 text-xs">
                            <span className="text-[10px] uppercase tracking-wider text-[#6E6E6E] flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-[#FFC799]" />
                              <span>Giờ mở cửa</span>
                            </span>
                            <p className="font-mono font-bold text-[#F5F5F5] mt-1">
                              {branch.hours_open} – {branch.hours_close}
                            </p>
                          </div>

                          <div className="bg-[#101010] border border-white/[0.06] rounded-xl p-3 text-xs">
                            <span className="text-[10px] uppercase tracking-wider text-[#6E6E6E] flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-[#FFC799]" />
                              <span>Hotline trạm</span>
                            </span>
                            <a
                              href={`tel:${branch.phone}`}
                              className="font-mono font-bold text-[#FFC799] hover:underline mt-1 block"
                            >
                              {branch.phone}
                            </a>
                          </div>
                        </div>

                        {/* Manager Information */}
                        <div className="bg-[#101010] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#202020] border border-white/10 flex items-center justify-center text-[#FFC799]">
                              <Shield className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-[#6E6E6E] block">
                                Quản lý chi nhánh
                              </span>
                              <span className="font-semibold text-[#F5F5F5]">
                                {managerObj
                                  ? `${managerObj.lastName || ''} ${managerObj.firstName || ''} (@${managerObj.username})`
                                  : 'Chưa gán Quản lý'}
                              </span>
                            </div>
                          </div>
                          {managerObj?.phoneNumber && (
                            <span className="font-mono text-[11px] text-[#A0A0A0]">
                              {managerObj.phoneNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => openEditBranchModal(branch)}
                            className="px-3 py-2 rounded-xl bg-[#222222] hover:bg-[#2C2C2C] border border-white/10 text-xs font-semibold text-[#F5F5F5] flex items-center space-x-1.5 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#FFC799]" />
                            <span>Chỉnh sửa</span>
                          </button>

                          {branch.isActive ? (
                            <button
                              type="button"
                              onClick={() => openDeactivateModal(branch)}
                              className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-400 flex items-center space-x-1.5 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Tạm ngưng</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleReactivateBranch(branch._id)}
                              className="px-3 py-2 rounded-xl bg-[#122A1E] hover:bg-[#1B3D2B] border border-[#22C55E]/40 text-xs font-semibold text-[#99FFE4] flex items-center space-x-1.5 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Kích hoạt lại</span>
                            </button>
                          )}
                        </div>

                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${branch.name} ${branch.address} Đà Nẵng`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-[#A0A0A0] hover:text-[#FFC799] transition-colors"
                          title="Xem trên Google Maps"
                        >
                          <Navigation className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 2: QUẢN LÝ QUẢN LÝ & NGƯỜI DÙNG (USERS & MANAGERS - UC-96, UC-97, UC-100, UC-101)
            ===================================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-fade-up">
            {/* Stat Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div className="bg-[#161616] border border-white/10 rounded-2xl p-4">
                <span className="text-[10px] uppercase tracking-wider text-[#A0A0A0] flex items-center space-x-1">
                  <Users className="w-3 h-3 text-[#FFC799]" />
                  <span>Tổng người dùng</span>
                </span>
                <p className="text-xl sm:text-2xl font-bold font-mono-tabular text-[#F5F5F5] mt-1.5">
                  {totalUsersCount}
                </p>
              </div>

              <div className="bg-[#161616] border border-white/10 rounded-2xl p-4">
                <span className="text-[10px] uppercase tracking-wider text-[#A0A0A0] flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-[#FFC799]" />
                  <span>Quản lý chi nhánh</span>
                </span>
                <p className="text-xl sm:text-2xl font-bold font-mono-tabular text-[#FFC799] mt-1.5">
                  {managersCount}
                </p>
                <span className="text-[10px] text-[#A0A0A0]">BranchManager</span>
              </div>

              <div className="bg-[#161616] border border-white/10 rounded-2xl p-4">
                <span className="text-[10px] uppercase tracking-wider text-[#A0A0A0] flex items-center space-x-1">
                  <Shield className="w-3 h-3 text-[#38BDF8]" />
                  <span>Nhân viên trực quầy</span>
                </span>
                <p className="text-xl sm:text-2xl font-bold font-mono-tabular text-[#38BDF8] mt-1.5">
                  {staffCount}
                </p>
                <span className="text-[10px] text-[#A0A0A0]">Staff</span>
              </div>

              <div className="bg-[#161616] border border-white/10 rounded-2xl p-4">
                <span className="text-[10px] uppercase tracking-wider text-[#A0A0A0] flex items-center space-x-1">
                  <UserCheck className="w-3 h-3 text-[#99FFE4]" />
                  <span>Khách hàng</span>
                </span>
                <p className="text-xl sm:text-2xl font-bold font-mono-tabular text-[#99FFE4] mt-1.5">
                  {customerCount}
                </p>
                <span className="text-[10px] text-[#A0A0A0]">Customer</span>
              </div>

              <div className="bg-[#161616] border border-white/10 rounded-2xl p-4">
                <span className="text-[10px] uppercase tracking-wider text-[#A0A0A0] flex items-center space-x-1">
                  <ShieldAlert className="w-3 h-3 text-red-400" />
                  <span>Tài khoản bị khóa</span>
                </span>
                <p className="text-xl sm:text-2xl font-bold font-mono-tabular text-red-400 mt-1.5">
                  {suspendedCount}
                </p>
                <span className="text-[10px] text-red-400/80">Suspended</span>
              </div>
            </div>

            {/* Filter & Action Bar */}
            <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                    placeholder="Tìm tên, username, sđt, email..."
                    className="w-full pl-9 pr-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] placeholder-[#6E6E6E] focus:outline-none focus:border-[#FFC799]"
                  />
                </div>

                {/* Role Filter */}
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="BranchManager">Quản lý (BranchManager)</option>
                  <option value="Staff">Nhân viên (Staff)</option>
                  <option value="Customer">Khách hàng (Customer)</option>
                  <option value="SystemAdmin">Quản trị viên (SystemAdmin)</option>
                </select>

                {/* Status Filter */}
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="Active">Hoạt động (Active)</option>
                  <option value="Suspended">Đã khóa (Suspended)</option>
                  <option value="Unverified">Chưa xác thực (Unverified)</option>
                </select>

                {/* Branch Filter */}
                <select
                  value={userBranchFilter}
                  onChange={(e) => setUserBranchFilter(e.target.value)}
                  className="bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                >
                  <option value="all">Tất cả chi nhánh</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.code} - {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={fetchUsers}
                  className="p-2.5 bg-[#101010] border border-white/10 rounded-xl text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
                  title="Tìm kiếm"
                >
                  <Search className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserForm(initialUserForm);
                    setShowAddUserModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#FFC799] text-[#101010] text-xs font-semibold hover:bg-[#ffe2cc] transition-all flex items-center space-x-2 shadow-md active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Tạo Quản Lý / Nhân Sự</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-[#161616] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#101010] text-[#A0A0A0] uppercase tracking-wider text-[10px] border-b border-white/10">
                    <tr>
                      <th className="py-3.5 px-4">Tài khoản &amp; Họ tên</th>
                      <th className="py-3.5 px-4">Vai trò (Role)</th>
                      <th className="py-3.5 px-4">Chi nhánh trực thuộc</th>
                      <th className="py-3.5 px-4">Liên hệ</th>
                      <th className="py-3.5 px-4">Trạng thái</th>
                      <th className="py-3.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {userLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#A0A0A0]">
                          Đang tải danh sách người dùng...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#A0A0A0]">
                          Không tìm thấy người dùng nào phù hợp.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const branchObj =
                          typeof u.branchId === 'object' && u.branchId !== null
                            ? (u.branchId as Branch)
                            : branches.find((b) => b._id === u.branchId);

                        const isSuspended = u.status === 'Suspended';
                        const isSystemAdmin = u.roles === 'SystemAdmin';

                        return (
                          <tr key={u._id} className="hover:bg-white/[0.02] transition-colors">
                            {/* User & Name */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 rounded-xl bg-[#222222] border border-white/10 flex items-center justify-center font-bold text-[#FFC799] uppercase shrink-0">
                                  {u.firstName ? u.firstName[0] : u.username[0]}
                                </div>
                                <div>
                                  <span className="font-semibold text-[#F5F5F5] block">
                                    {u.lastName} {u.firstName}
                                  </span>
                                  <span className="font-mono text-[11px] text-[#A0A0A0]">
                                    @{u.username}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Role Badge */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                  u.roles === 'SystemAdmin'
                                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                    : u.roles === 'BranchManager'
                                    ? 'bg-[#FFC799]/15 text-[#FFC799] border-[#FFC799]/30'
                                    : u.roles === 'Staff'
                                    ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                <span>{u.roles}</span>
                              </span>
                            </td>

                            {/* Branch */}
                            <td className="py-3.5 px-4">
                              {branchObj ? (
                                <span className="inline-flex items-center space-x-1.5 text-xs text-[#F5F5F5]">
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#101010] text-[#FFC799] border border-white/10">
                                    {branchObj.code}
                                  </span>
                                  <span className="truncate max-w-[160px]">{branchObj.name}</span>
                                </span>
                              ) : (
                                <span className="text-[#6E6E6E] italic">Chưa gán trạm</span>
                              )}
                            </td>

                            {/* Contact */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5 text-[11px]">
                                {u.phoneNumber && (
                                  <p className="font-mono text-[#F5F5F5]">{u.phoneNumber}</p>
                                )}
                                {u.email && (
                                  <p className="text-[#A0A0A0] truncate max-w-[180px]">{u.email}</p>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  u.status === 'Active'
                                    ? 'bg-[#122A1E] text-[#99FFE4] border-[#22C55E]/30'
                                    : u.status === 'Suspended'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                }`}
                              >
                                {u.status === 'Active' ? (
                                  <CheckCircle2 className="w-3 h-3 text-[#99FFE4]" />
                                ) : (
                                  <Lock className="w-3 h-3 text-red-400" />
                                )}
                                <span>{u.status}</span>
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center space-x-2">
                                {/* UC-97-98: Edit Manager/User */}
                                <button
                                  type="button"
                                  onClick={() => openEditUserModal(u)}
                                  className="p-1.5 rounded-lg bg-[#222222] hover:bg-[#2C2C2C] border border-white/10 text-[#FFC799] transition-colors"
                                  title="Chỉnh sửa tài khoản"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* UC-100: Lock Account / UC-101: Unlock Account */}
                                {!isSystemAdmin && (
                                  <>
                                    {isSuspended ? (
                                      <button
                                        type="button"
                                        onClick={() => handleUnlockUser(u._id)}
                                        className="px-2.5 py-1.5 rounded-lg bg-[#122A1E] hover:bg-[#1B3D2B] border border-[#22C55E]/40 text-[#99FFE4] font-semibold text-[11px] inline-flex items-center space-x-1 transition-colors"
                                        title="Mở khóa tài khoản"
                                      >
                                        <Unlock className="w-3 h-3" />
                                        <span>Mở khóa</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setLockingUser(u);
                                          setLockReason('');
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold text-[11px] inline-flex items-center space-x-1 transition-colors"
                                        title="Khóa tài khoản và thu hồi JWT"
                                      >
                                        <Lock className="w-3 h-3" />
                                        <span>Khóa tài khoản</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: BẢN ĐỒ GPS TRẠM (UC-02 & UC-27)
            ===================================================================== */}
        {activeTab === 'map' && (
          <div className="space-y-6 animate-fade-up">
            <div className="bg-[#161616] border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#F5F5F5]">
                  Bản Đồ Mạng Lưới Chi Nhánh Motorent
                </h3>
                <p className="text-xs text-[#A0A0A0] mt-1">
                  Định vị trực quan tọa độ GPS các trạm trên địa bàn Đà Nẵng, số lượng xe khả dụng theo thời gian thực và tuyến liên trạm sân bay - biển.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDetectGPS()}
                className="px-3.5 py-2 rounded-xl bg-[#101010] border border-white/15 text-xs font-semibold text-[#FFC799] hover:border-[#FFC799] transition-colors flex items-center space-x-1.5 shrink-0"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Định vị vị trí hiện tại</span>
              </button>
            </div>

            {/* Interactive Vector SVG Map */}
            <BranchInteractiveMap branches={branches} />
          </div>
        )}

        {/* =====================================================================
            MODALS
            ===================================================================== */}

        {/* 1. ADD BRANCH MODAL (UC-93) */}
        {showAddBranchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#161616] border border-white/15 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-up">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Building2 className="w-5 h-5 text-[#FFC799]" />
                  <h3 className="text-base font-bold text-[#F5F5F5]">
                    Thêm Chi Nhánh Mới
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="text-[#A0A0A0] hover:text-[#F5F5F5]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateBranch} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-[#A0A0A0]">
                      Tên chi nhánh <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={branchForm.name}
                      onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                      placeholder="Ví dụ: Trạm Hải Châu - Sông Hàn"
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">
                      Mã chi nhánh <span className="text-red-500 font-bold ml-0.5">*</span> (Duy nhất)
                    </label>
                    <div className="flex rounded-xl overflow-hidden border border-white/10 focus-within:border-[#FFC799] bg-[#101010] transition-colors">
                      <span className="px-3 py-2 bg-[#1B1B1B] text-[#FFC799] font-mono font-bold text-xs border-r border-white/10 select-none flex items-center">
                        CN-
                      </span>
                      <input
                        type="text"
                        required
                        value={branchForm.code.startsWith('CN-') ? branchForm.code.slice(3) : branchForm.code}
                        onChange={(e) => {
                          const raw = e.target.value.toUpperCase().replace(/\s+/g, '');
                          const cleanSuffix = raw.startsWith('CN-') ? raw.slice(3) : raw;
                          setBranchForm({ ...branchForm, code: `CN-${cleanSuffix}` });
                        }}
                        placeholder="HC"
                        className="w-full px-2.5 py-2 bg-transparent text-xs font-mono font-bold text-[#FFC799] uppercase focus:outline-none placeholder:text-[#555555]"
                      />
                    </div>
                    <span className="text-[10px] text-[#A0A0A0] block">
                      Mã lưu hệ thống: <strong className="text-[#FFC799] font-mono">{branchForm.code || 'CN-'}</strong>
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#A0A0A0]">
                    Địa chỉ chi nhánh <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={branchForm.address}
                    onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                    placeholder="Số nhà, đường, quận, Đà Nẵng..."
                    className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">
                      Hotline chi nhánh <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={branchForm.phone}
                      onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                      placeholder="02363889900"
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">Email trạm</label>
                    <input
                      type="email"
                      value={branchForm.email}
                      onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                      placeholder="haichau@motorent.vn"
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">Giờ mở cửa</label>
                    <input
                      type="time"
                      value={branchForm.hours_open}
                      onChange={(e) => setBranchForm({ ...branchForm, hours_open: e.target.value })}
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">Giờ đóng cửa</label>
                    <input
                      type="time"
                      value={branchForm.hours_close}
                      onChange={(e) => setBranchForm({ ...branchForm, hours_close: e.target.value })}
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>
                </div>

                {/* Manager Assignment */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#A0A0A0]">
                    Gán Quản lý phụ trách (BranchManager)
                  </label>
                  <select
                    value={branchForm.managerId}
                    onChange={(e) => setBranchForm({ ...branchForm, managerId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                  >
                    <option value="">-- Chưa chỉ định Quản lý --</option>
                    {availableManagers.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.lastName} {m.firstName} (@{m.username}) - {m.phoneNumber || 'Không có SĐT'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* GPS Coordinates & Presets */}
                <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#FFC799] flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Tọa độ GPS (Vĩ độ / Kinh độ) <span className="text-red-500 font-bold ml-0.5">*</span></span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDetectGPS()}
                      className="text-[11px] text-[#99FFE4] hover:underline flex items-center space-x-1"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Lấy GPS hiện tại</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      step="any"
                      required
                      value={branchForm.location_lat}
                      onChange={(e) => setBranchForm({ ...branchForm, location_lat: e.target.value })}
                      placeholder="Vĩ độ (Lat, vd: 16.054)"
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                    <input
                      type="number"
                      step="any"
                      required
                      value={branchForm.location_lng}
                      onChange={(e) => setBranchForm({ ...branchForm, location_lng: e.target.value })}
                      placeholder="Kinh độ (Lng, vd: 108.202)"
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-[#6E6E6E] w-full block">Vị trí phổ biến:</span>
                    {DA_NANG_PRESETS.map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() =>
                          setBranchForm({
                            ...branchForm,
                            location_lat: preset.lat,
                            location_lng: preset.lng,
                          })
                        }
                        className="px-2 py-1 rounded-md bg-[#222222] hover:bg-[#2A2A2A] text-[10px] text-[#A0A0A0] hover:text-[#FFC799] border border-white/10 transition-colors"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddBranchModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[#A0A0A0] hover:text-white"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-[#FFC799] text-[#101010] text-xs font-semibold hover:bg-[#ffe2cc] transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang tạo...' : 'Tạo Chi Nhánh'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. EDIT BRANCH MODAL */}
        {editingBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#161616] border border-white/15 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-up">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Edit3 className="w-5 h-5 text-[#FFC799]" />
                  <h3 className="text-base font-bold text-[#F5F5F5]">
                    Cập Nhật Chi Nhánh: {editingBranch.code}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
                  className="text-[#A0A0A0] hover:text-[#F5F5F5]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateBranch} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-[#A0A0A0]">
                      Tên chi nhánh <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={branchForm.name}
                      onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">
                      Mã chi nhánh <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <div className="flex rounded-xl overflow-hidden border border-white/10 focus-within:border-[#FFC799] bg-[#101010] transition-colors">
                      <span className="px-3 py-2 bg-[#1B1B1B] text-[#FFC799] font-mono font-bold text-xs border-r border-white/10 select-none flex items-center">
                        CN-
                      </span>
                      <input
                        type="text"
                        required
                        value={branchForm.code.startsWith('CN-') ? branchForm.code.slice(3) : branchForm.code}
                        onChange={(e) => {
                          const raw = e.target.value.toUpperCase().replace(/\s+/g, '');
                          const cleanSuffix = raw.startsWith('CN-') ? raw.slice(3) : raw;
                          setBranchForm({ ...branchForm, code: `CN-${cleanSuffix}` });
                        }}
                        placeholder="HC"
                        className="w-full px-2.5 py-2 bg-transparent text-xs font-mono font-bold text-[#FFC799] uppercase focus:outline-none placeholder:text-[#555555]"
                      />
                    </div>
                    <span className="text-[10px] text-[#A0A0A0] block">
                      Mã lưu hệ thống: <strong className="text-[#FFC799] font-mono">{branchForm.code || 'CN-'}</strong>
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#A0A0A0]">
                    Địa chỉ chi nhánh <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={branchForm.address}
                    onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">
                      Hotline chi nhánh <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={branchForm.phone}
                      onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">Email trạm</label>
                    <input
                      type="email"
                      value={branchForm.email}
                      onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">Giờ mở cửa</label>
                    <input
                      type="time"
                      value={branchForm.hours_open}
                      onChange={(e) => setBranchForm({ ...branchForm, hours_open: e.target.value })}
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">Giờ đóng cửa</label>
                    <input
                      type="time"
                      value={branchForm.hours_close}
                      onChange={(e) => setBranchForm({ ...branchForm, hours_close: e.target.value })}
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>
                </div>

                {/* Manager Re-assignment */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#A0A0A0]">
                    Gán lại Quản lý phụ trách
                  </label>
                  <select
                    value={branchForm.managerId}
                    onChange={(e) => setBranchForm({ ...branchForm, managerId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                  >
                    <option value="">-- Hủy gán Quản lý --</option>
                    {availableManagers.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.lastName} {m.firstName} (@{m.username}) - {m.phoneNumber || 'Không có SĐT'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* GPS Coordinates */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.08]">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#A0A0A0]">
                      Vĩ độ (Lat) <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={branchForm.location_lat}
                      onChange={(e) => setBranchForm({ ...branchForm, location_lat: e.target.value })}
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#A0A0A0]">
                      Kinh độ (Lng) <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={branchForm.location_lng}
                      onChange={(e) => setBranchForm({ ...branchForm, location_lng: e.target.value })}
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditingBranch(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[#A0A0A0] hover:text-white"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-[#FFC799] text-[#101010] text-xs font-semibold hover:bg-[#ffe2cc] transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. DEACTIVATE BRANCH WARNING MODAL */}
        {deactivatingBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#161616] border border-red-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-red-500/10">
                <div className="flex items-center space-x-2.5 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-base font-bold">
                    Tạm Ngưng Chi Nhánh
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDeactivatingBranch(null)}
                  className="text-[#A0A0A0] hover:text-[#F5F5F5]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-[#F5F5F5] leading-relaxed">
                  Bạn có chắc chắn muốn tạm dừng hoạt động chi nhánh{' '}
                  <strong className="text-[#FFC799]">{deactivatingBranch.name} ({deactivatingBranch.code})</strong>?
                </p>

                {checkingBookings ? (
                  <div className="p-3 rounded-xl bg-[#202020] border border-white/10 text-xs text-[#A0A0A0] flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#FFC799]" />
                    <span>Đang kiểm tra các đơn thuê xe đang hoạt động...</span>
                  </div>
                ) : activeBookingsCount > 0 ? (
                  <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200 space-y-1.5">
                    <div className="flex items-center space-x-2 font-bold text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>CẢNH BÁO ĐƠN THUÊ XE ĐANG HOẠT ĐỘNG!</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-200/90">
                      Chi nhánh này hiện có <strong className="font-bold underline text-white">{activeBookingsCount} đơn thuê xe</strong> đang trong quá trình đặt cọc hoặc đang lưu thông trên đường.
                    </p>
                    <p className="text-[10px] text-amber-300/80">
                      Khách hàng vẫn có thể trả xe hoặc đối soát hợp đồng theo thỏa thuận.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#122A1E] border border-[#22C55E]/30 text-xs text-[#99FFE4] flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Không có đơn thuê xe nào đang hoạt động tại chi nhánh này.</span>
                  </div>
                )}

                <div className="pt-3 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setDeactivatingBranch(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[#A0A0A0] hover:text-white"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeactivate}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang xử lý...' : 'Xác Nhận Tạm Ngưng'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. ADD USER / MANAGER MODAL */}
        {showAddUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#161616] border border-white/15 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-scale-up">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <KeyRound className="w-5 h-5 text-[#FFC799]" />
                  <h3 className="text-base font-bold text-[#F5F5F5]">
                    Tạo Tài Khoản Quản Lý / Nhân Sự
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="text-[#A0A0A0] hover:text-[#F5F5F5]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">
                      Tên đăng nhập (Username) <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value.toLowerCase() })}
                      placeholder="manager_sontra"
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">Mật khẩu khởi tạo</label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="Mặc định: Motorent@2026"
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">
                      Họ đệm <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={userForm.lastName}
                      onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                      placeholder="Nguyễn Văn"
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">
                      Tên <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={userForm.firstName}
                      onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                      placeholder="An"
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">Số điện thoại</label>
                    <input
                      type="tel"
                      value={userForm.phoneNumber}
                      onChange={(e) => setUserForm({ ...userForm, phoneNumber: e.target.value })}
                      placeholder="0905123456"
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">Địa chỉ Email</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="an.nguyen@motorent.vn"
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">
                      Vai trò (Role) <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <select
                      value={userForm.roles}
                      onChange={(e) =>
                        setUserForm({ ...userForm, roles: e.target.value as UserFormData['roles'] })
                      }
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    >
                      <option value="BranchManager">Quản lý chi nhánh (BranchManager)</option>
                      <option value="Staff">Nhân viên trực quầy (Staff)</option>
                      <option value="Customer">Khách hàng (Customer)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">Gán chi nhánh công tác</label>
                    <select
                      value={userForm.branchId}
                      onChange={(e) => setUserForm({ ...userForm, branchId: e.target.value })}
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    >
                      <option value="">-- Chưa gán chi nhánh --</option>
                      {branches.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.code} - {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[#A0A0A0] hover:text-white"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-[#FFC799] text-[#101010] text-xs font-semibold hover:bg-[#ffe2cc] transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang tạo...' : 'Tạo Tài Khoản'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 5. EDIT USER MODAL */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#161616] border border-white/15 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-scale-up">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Edit3 className="w-5 h-5 text-[#FFC799]" />
                  <h3 className="text-base font-bold text-[#F5F5F5]">
                    Chỉnh Sửa Tài Khoản: @{editingUser.username}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="text-[#A0A0A0] hover:text-[#F5F5F5]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">Họ đệm</label>
                    <input
                      type="text"
                      value={userForm.lastName}
                      onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">Tên</label>
                    <input
                      type="text"
                      value={userForm.firstName}
                      onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">Số điện thoại</label>
                    <input
                      type="tel"
                      value={userForm.phoneNumber}
                      onChange={(e) => setUserForm({ ...userForm, phoneNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">Địa chỉ Email</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">Vai trò (Role)</label>
                    <select
                      value={userForm.roles}
                      disabled={editingUser.roles === 'SystemAdmin'}
                      onChange={(e) =>
                        setUserForm({ ...userForm, roles: e.target.value as UserFormData['roles'] })
                      }
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799] disabled:opacity-50"
                    >
                      <option value="BranchManager">Quản lý (BranchManager)</option>
                      <option value="Staff">Nhân viên (Staff)</option>
                      <option value="Customer">Khách hàng (Customer)</option>
                      {editingUser.roles === 'SystemAdmin' && (
                        <option value="SystemAdmin">Quản trị viên (SystemAdmin)</option>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A0A0A0]">
                      Chi nhánh trực thuộc
                    </label>
                    <select
                      value={userForm.branchId}
                      onChange={(e) => setUserForm({ ...userForm, branchId: e.target.value })}
                      className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                    >
                      <option value="">-- Hủy liên kết chi nhánh (Unlink) --</option>
                      {branches.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.code} - {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/[0.08]">
                  <label className="text-xs font-medium text-[#A0A0A0]">
                    Đặt lại mật khẩu mới (để trống nếu không đổi)
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                  />
                  <span className="text-[10px] text-[#6E6E6E] block">
                    Đổi mật khẩu sẽ tự động thu hồi các token JWT đang đăng nhập.
                  </span>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[#A0A0A0] hover:text-white"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-[#FFC799] text-[#101010] text-xs font-semibold hover:bg-[#ffe2cc] transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 6. LOCK USER CONFIRMATION MODAL */}
        {lockingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#161616] border border-red-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-red-500/10">
                <div className="flex items-center space-x-2.5 text-red-400">
                  <Lock className="w-5 h-5" />
                  <h3 className="text-base font-bold">
                    Khóa Tài Khoản
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setLockingUser(null)}
                  className="text-[#A0A0A0] hover:text-[#F5F5F5]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-[#F5F5F5] leading-relaxed">
                  Bạn có chắc chắn muốn tạm khóa tài khoản{' '}
                  <strong className="text-[#FFC799]">@{lockingUser.username} ({lockingUser.lastName} {lockingUser.firstName})</strong>?
                </p>

                <div className="p-3 rounded-xl bg-[#1F1414] border border-red-500/30 text-xs text-red-300 space-y-1">
                  <p className="font-semibold text-red-400 flex items-center space-x-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Thu hồi token đăng nhập tức thì (Invalidate JWT)</span>
                  </p>
                  <p className="text-[11px] text-[#A0A0A0]">
                    Hệ thống sẽ tăng <code className="text-[#FFC799]">tokenVersion</code> để ngắt kết nối phiên làm việc của người dùng này trên mọi thiết bị ngay lập tức.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#A0A0A0]">Lý do tạm khóa (tùy chọn)</label>
                  <textarea
                    rows={2}
                    value={lockReason}
                    onChange={(e) => setLockReason(e.target.value)}
                    placeholder="Ghi chú lý do tạm ngưng hoạt động tài khoản..."
                    className="w-full px-3 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFC799]"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setLockingUser(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[#A0A0A0] hover:text-white"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmLockUser}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang khóa...' : 'Khóa Tài Khoản'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
