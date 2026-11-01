import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  AlertCircle,
  Bike,
  CheckCircle2,
  Eye,
  Fuel,
  Gauge,
  ImagePlus,
  Layers,
  Link2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Branch, Category, Vehicle } from '../types';
import { VehiclePricingPanel } from '../components/VehiclePricingPanel';
import { getOptimizedVehicleImageUrl } from '../utils/imageHelper';

const inputClass =
  'w-full rounded-xl border border-white/12 bg-[#101010] px-3.5 py-2.5 text-xs font-medium text-[#F5F5F5] placeholder-[#6E6E6E] outline-none focus:border-[#FFC799] transition-colors disabled:text-[#777] disabled:cursor-not-allowed';

const statusLabels: Record<Vehicle['status'], string> = {
  Available: 'Sẵn sàng',
  Rented: 'Đang thuê',
  Maintenance: 'Bảo dưỡng',
  Transferring: 'Điều chuyển',
};

const statusBadgeStyles: Record<Vehicle['status'], string> = {
  Available: 'bg-[#122A1E] text-[#99FFE4] border-[#22C55E]/35',
  Rented: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
  Maintenance: 'bg-amber-500/15 text-[#FFC799] border-[#FFC799]/40',
  Transferring: 'bg-purple-500/15 text-purple-300 border-purple-500/35',
};

const transmissionLabels: Record<Vehicle['transmissionType'], string> = {
  Automatic: 'Xe tay ga (Tự động)',
  Manual: 'Xe số / Côn tay',
  'Semi-Auto': 'Bán tự động',
};

const fuelLabels: Record<Vehicle['fuelType'], string> = {
  Gasoline: 'Động cơ Xăng',
  Electric: 'Xe máy Điện',
};

const refId = (value: string | { _id: string } | undefined) =>
  typeof value === 'string' ? value : value?._id ?? '';

const errorText = (error: unknown) =>
  axios.isAxiosError(error)
    ? error.response?.data?.message || 'Không kết nối được máy chủ. Vui lòng thử lại.'
    : 'Thao tác chưa thành công. Vui lòng thử lại.';

const isValidVehicleImageUrl = (raw: string): boolean => {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/uploads/')) return true;
  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

interface FormState {
  branchId: string;
  category: string;
  brand: string;
  vehicleModel: string;
  licensePlate: string;
  dailyPrice: string;
  hourlyPrice: string;
  transmissionType: Vehicle['transmissionType'];
  fuelType: Vehicle['fuelType'];
  yearManufactured: string;
  color: string;
  odometer: string;
  images: string[];
  status: Vehicle['status'];
}

const emptyForm = (branchId: string): FormState => ({
  branchId,
  category: '',
  brand: '',
  vehicleModel: '',
  licensePlate: '',
  dailyPrice: '150000',
  hourlyPrice: '25000',
  transmissionType: 'Automatic',
  fuelType: 'Gasoline',
  yearManufactured: String(new Date().getFullYear()),
  color: '',
  odometer: '0',
  images: [],
  status: 'Available',
});

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

  // Filters
  const [query, setQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Upload & URL Input states
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const [fleet, branchResponse, categoryResponse] = await Promise.all([
        api.get('/vehicles/management'),
        api.get('/branches'),
        api.get('/categories'),
      ]);
      setVehicles(fleet.data.data);
      setBranches(branchResponse.data.data);
      setCategories(categoryResponse.data.data);
      setError('');
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (pricingId) {
      priceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [pricingId]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm(ownBranchId));
    setImageUrlInput('');
  };

  const edit = (vehicle: Vehicle) => {
    setEditingId(vehicle._id);
    setError('');
    setNotice('');
    setForm({
      branchId: refId(vehicle.branchId),
      category: refId(vehicle.category),
      brand: vehicle.brand,
      vehicleModel: vehicle.vehicleModel,
      licensePlate: vehicle.licensePlate,
      dailyPrice: String(vehicle.dailyPrice),
      hourlyPrice: vehicle.hourlyPrice === undefined ? '' : String(vehicle.hourlyPrice),
      transmissionType: vehicle.transmissionType,
      fuelType: vehicle.fuelType,
      yearManufactured: String(vehicle.yearManufactured ?? ''),
      color: vehicle.color ?? '',
      odometer: String(vehicle.odometer),
      images: Array.isArray(vehicle.images) ? [...vehicle.images] : [],
      status: vehicle.status,
    });
    editRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError('');
    setNotice('');

    const remainingSlots = 10 - form.images.length;
    if (remainingSlots <= 0) {
      setError('Mỗi xe chỉ được phép có tối đa 10 ảnh. Vui lòng xóa bớt ảnh cũ trước khi thêm.');
      return;
    }

    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    const formData = new FormData();
    for (const file of selectedFiles) {
      formData.append('images', file);
    }

    setUploadingImages(true);
    try {
      const response = await api.post('/vehicles/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrls: string[] = response.data?.data?.urls || [];
      if (uploadedUrls.length > 0) {
        setForm((current) => ({
          ...current,
          images: [...current.images, ...uploadedUrls].slice(0, 10),
        }));
        setNotice(`Đã tải lên ${uploadedUrls.length} ảnh từ máy tính thành công.`);
      }
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddImageUrl = () => {
    setError('');
    const lines = imageUrlInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    if (lines.some((url) => !isValidVehicleImageUrl(url))) {
      setError('Đường dẫn ảnh phải bắt đầu bằng http://, https:// hoặc /uploads/.');
      return;
    }

    const nextImages = [...form.images, ...lines];
    if (nextImages.length > 10) {
      setError('Tổng số ảnh của mỗi xe không được vượt quá 10 ảnh.');
      return;
    }

    setForm((current) => ({ ...current, images: nextImages }));
    setImageUrlInput('');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleSetPrimaryImage = (indexToPromote: number) => {
    if (indexToPromote <= 0) return;
    setForm((current) => {
      const copy = [...current.images];
      const [picked] = copy.splice(indexToPromote, 1);
      copy.unshift(picked);
      return { ...current, images: copy };
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const imageUrls = form.images.map((item) => item.trim()).filter(Boolean);
    if (imageUrls.length > 10) {
      setError('Mỗi xe có tối đa 10 ảnh. Hãy giảm số lượng ảnh.');
      return;
    }
    if (imageUrls.some((url) => !isValidVehicleImageUrl(url))) {
      setError('Mỗi ảnh cần là một tệp đã tải lên từ máy hoặc một URL http/https hợp lệ.');
      return;
    }

    const payload = {
      branchId: form.branchId,
      category: form.category,
      brand: form.brand.trim(),
      vehicleModel: form.vehicleModel.trim(),
      transmissionType: form.transmissionType,
      fuelType: form.fuelType,
      ...(form.yearManufactured ? { yearManufactured: Number(form.yearManufactured) } : {}),
      color: form.color.trim(),
      odometer: Number(form.odometer),
      images: imageUrls,
    };

    setPending(true);
    try {
      if (editingId) {
        const existing = vehicles.find((vehicle) => vehicle._id === editingId);
        await api.put(`/vehicles/${editingId}`, {
          ...payload,
          ...(existing?.status !== form.status ? { status: form.status } : {}),
        });
      } else {
        await api.post('/vehicles', {
          ...payload,
          licensePlate: form.licensePlate.trim(),
          dailyPrice: Number(form.dailyPrice),
          ...(form.hourlyPrice ? { hourlyPrice: Number(form.hourlyPrice) } : {}),
        });
      }
      const wasEditing = Boolean(editingId);
      cancelEdit();
      await reload();
      setNotice(
        wasEditing
          ? 'Đã lưu thông tin và hình ảnh phương tiện thành công.'
          : 'Đã thêm xe mới vào đội xe. Biển số đã được khóa cố định.'
      );
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setPending(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setPending(true);
    setError('');
    setNotice('');
    try {
      await api.delete(`/vehicles/${deleteTarget._id}`);
      if (editingId === deleteTarget._id) cancelEdit();
      if (pricingId === deleteTarget._id) setPricingId(null);
      setDeleteTarget(null);
      await reload();
      setNotice('Đã ngừng khai thác xe. Lịch sử đơn thuê vẫn được lưu trữ an toàn.');
    } catch (cause) {
      setError(errorText(cause));
      setDeleteTarget(null);
    } finally {
      setPending(false);
    }
  };

  const filtered = vehicles.filter((vehicle) => {
    const matchQuery = `${vehicle.brand} ${vehicle.vehicleModel} ${vehicle.licensePlate} ${vehicle.color || ''}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase());
    const vBranchId = refId(vehicle.branchId);
    const vCatId = refId(vehicle.category);
    const matchBranch = filterBranch === 'all' || vBranchId === filterBranch;
    const matchCategory = filterCategory === 'all' || vCatId === filterCategory;
    const matchStatus = filterStatus === 'all' || vehicle.status === filterStatus;
    return matchQuery && matchBranch && matchCategory && matchStatus;
  });

  const pricingVehicle = vehicles.find((vehicle) => vehicle._id === pricingId);
  const availableCount = vehicles.filter((v) => v.status === 'Available').length;
  const rentedCount = vehicles.filter((v) => v.status === 'Rented').length;
  const maintenanceCount = vehicles.filter((v) => v.status === 'Maintenance' || v.requiresMaintenance).length;

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* =====================================================================
            1. HEADER & KPI SUMMARY CARDS
            ===================================================================== */}
        <header className="pb-6 border-b border-white/10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#FFC799] font-semibold mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFC799]" />
                <span>
                  {isAdmin ? 'Quản Trị Đội Xe Hệ Thống' : 'Quản Lý Đội Xe Chi Nhánh'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#F5F5F5]">
                Quản Lý Xe &amp; <span className="font-serif-display italic text-[#FFC799]">Biểu Giá Thuê</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#A0A0A0] mt-1.5 max-w-2xl">
                Quản lý danh mục phương tiện, tải ảnh xe trực tiếp từ máy tính hoặc đường dẫn, cấu hình giá ngày/giờ và hệ số mùa vụ.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => void reload()}
                disabled={loading || pending}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-white/12 bg-[#161616] hover:border-[#FFC799]/50 text-xs font-semibold text-[#F5F5F5] transition-colors cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#FFC799] ${loading ? 'animate-spin' : ''}`} />
                <span>Tải lại dữ liệu</span>
              </button>

              <Link
                to="/manager/fleet"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFC799] hover:bg-[#ffd6b3] text-[#101010] text-xs font-bold transition-all shadow-md shrink-0 whitespace-nowrap"
              >
                <Wrench className="w-3.5 h-3.5 shrink-0" />
                <span>Điều chuyển &amp; Bảo dưỡng</span>
              </Link>
            </div>
          </div>

          {/* 4 KPI Strip Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#A0A0A0] block">Tổng đội xe quản lý</span>
                <p className="text-2xl font-bold font-mono-tabular text-[#F5F5F5] mt-1">{vehicles.length} xe</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#FFC799]/10 border border-[#FFC799]/25 flex items-center justify-center text-[#FFC799] shrink-0">
                <Bike className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#A0A0A0] block">Sẵn sàng tại bãi</span>
                <p className="text-2xl font-bold font-mono-tabular text-[#99FFE4] mt-1">{availableCount} xe</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#122A1E] border border-[#22C55E]/30 flex items-center justify-center text-[#99FFE4] shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#A0A0A0] block">Đang cho thuê</span>
                <p className="text-2xl font-bold font-mono-tabular text-sky-300 mt-1">{rentedCount} xe</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-300 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#A0A0A0] block">Bảo dưỡng / Cảnh báo</span>
                <p className="text-2xl font-bold font-mono-tabular text-[#FFC799] mt-1">{maintenanceCount} xe</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-[#FFC799] shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
            </div>
          </div>
        </header>

        {/* Feedback Alerts */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-[#FF8080]/40 bg-[#FF8080]/10 p-4 text-xs font-medium text-[#FFAAAA] flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="shrink-0 text-[#FF8080]" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="text-[#FFAAAA] hover:text-white">
              <X size={16} />
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="rounded-xl border border-[#99FFE4]/30 bg-[#122A1E]/70 p-4 text-xs font-medium text-[#99FFE4] flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="shrink-0 text-[#99FFE4]" />
              <span>{notice}</span>
            </div>
            <button type="button" onClick={() => setNotice('')} className="text-[#99FFE4] hover:text-white">
              <X size={16} />
            </button>
          </div>
        )}

        {/* =====================================================================
            2. MAIN WORKSPACE: LEFT VEHICLE EDITOR FORM + RIGHT VISUAL VEHICLE CARDS
            ===================================================================== */}
        <div className="grid lg:grid-cols-[400px_minmax(0,1fr)] gap-6 items-start">
          {/* LEFT PANEL: ADD / EDIT VEHICLE WITH LOCAL IMAGE UPLOADER */}
          <section
            ref={editRef}
            className="scroll-mt-24 rounded-2xl border border-white/12 bg-[#161616] p-5 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FFC799]/15 border border-[#FFC799]/30 flex items-center justify-center text-[#FFC799] shrink-0">
                  {editingId ? <Pencil size={15} /> : <Plus size={16} />}
                </div>
                <div>
                  <h2 className="font-bold text-base text-[#F5F5F5]">
                    {editingId ? 'Cập nhật thông tin xe' : 'Thêm phương tiện mới'}
                  </h2>
                  <p className="text-[11px] text-[#A0A0A0]">
                    {editingId ? `Đang sửa biển số ${form.licensePlate}` : 'Điền thông số & tải ảnh thực tế của xe'}
                  </p>
                </div>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={pending}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#FFC799] transition-colors cursor-pointer shrink-0"
                >
                  Hủy sửa
                </button>
              )}
            </div>

            <form onSubmit={submit}>
              <fieldset disabled={pending} className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-[#D0D0D0]">
                    Chi nhánh quản lý <span className="text-[#FF8080]">*</span>
                  </span>
                  <select
                    aria-label="Chi nhánh xe"
                    className={inputClass}
                    value={form.branchId}
                    onChange={(event) => setField('branchId', event.target.value)}
                    disabled={!isAdmin || Boolean(editingId)}
                    required
                  >
                    <option value="">Chọn chi nhánh...</option>
                    {branches.map((branch) => (
                      <option key={branch._id} value={branch._id}>
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[#D0D0D0]">
                      Thương hiệu <span className="text-[#FF8080]">*</span>
                    </span>
                    <input
                      className={inputClass}
                      required
                      minLength={2}
                      value={form.brand}
                      onChange={(event) => setField('brand', event.target.value)}
                      placeholder="VD: Honda, Yamaha, VinFast"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[#D0D0D0]">
                      Tên mẫu xe <span className="text-[#FF8080]">*</span>
                    </span>
                    <input
                      className={inputClass}
                      required
                      minLength={2}
                      value={form.vehicleModel}
                      onChange={(event) => setField('vehicleModel', event.target.value)}
                      placeholder="VD: Honda Air Blade 160"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[#D0D0D0]">
                      Biển số xe <span className="text-[#FF8080]">*</span>
                    </span>
                    <input
                      className={`${inputClass} uppercase font-mono font-bold text-[#FFC799]`}
                      required
                      minLength={6}
                      maxLength={24}
                      value={form.licensePlate}
                      onChange={(event) => setField('licensePlate', event.target.value)}
                      disabled={Boolean(editingId)}
                      placeholder="43-C1 284.67"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[#D0D0D0]">
                      Danh mục loại xe <span className="text-[#FF8080]">*</span>
                    </span>
                    <select
                      className={inputClass}
                      required
                      value={form.category}
                      onChange={(event) => setField('category', event.target.value)}
                    >
                      <option value="">Chọn loại xe...</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {!editingId ? (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold text-[#D0D0D0]">
                        Giá thuê ngày (VNĐ) <span className="text-[#FF8080]">*</span>
                      </span>
                      <input
                        className={`${inputClass} font-mono`}
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={form.dailyPrice}
                        onChange={(event) => setField('dailyPrice', event.target.value)}
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold text-[#D0D0D0]">Giá thuê giờ (VNĐ)</span>
                      <input
                        className={`${inputClass} font-mono`}
                        type="number"
                        min="1"
                        step="1"
                        value={form.hourlyPrice}
                        onChange={(event) => setField('hourlyPrice', event.target.value)}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="rounded-xl bg-[#FFC799]/10 border border-[#FFC799]/25 px-3 py-2 text-[11px] text-[#FFC799]">
                    Để điều chỉnh giá ngày/giờ hoặc hệ số lễ tết, bấm nút <strong>“Giá &amp; mùa vụ”</strong> ở thẻ xe bên phải.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[#D0D0D0]">Hộp số / Truyền động</span>
                    <select
                      className={inputClass}
                      value={form.transmissionType}
                      onChange={(event) =>
                        setField('transmissionType', event.target.value as Vehicle['transmissionType'])
                      }
                    >
                      <option value="Automatic">Tự động (Tay ga)</option>
                      <option value="Manual">Số tay / Côn tay</option>
                      <option value="Semi-Auto">Bán tự động</option>
                    </select>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[#D0D0D0]">Nhiên liệu</span>
                    <select
                      className={inputClass}
                      value={form.fuelType}
                      onChange={(event) => setField('fuelType', event.target.value as Vehicle['fuelType'])}
                    >
                      <option value="Gasoline">Xăng</option>
                      <option value="Electric">Điện</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[#D0D0D0]">Năm SX</span>
                    <input
                      className={`${inputClass} font-mono`}
                      type="number"
                      min="1950"
                      max={new Date().getFullYear() + 1}
                      step="1"
                      value={form.yearManufactured}
                      onChange={(event) => setField('yearManufactured', event.target.value)}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[#D0D0D0]">Màu sơn</span>
                    <input
                      className={inputClass}
                      value={form.color}
                      onChange={(event) => setField('color', event.target.value)}
                      placeholder="Đen Nhám"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[#D0D0D0]">ODO (km)</span>
                    <input
                      className={`${inputClass} font-mono`}
                      type="number"
                      min={editingId ? vehicles.find((vehicle) => vehicle._id === editingId)?.odometer ?? 0 : 0}
                      step="1"
                      required
                      value={form.odometer}
                      onChange={(event) => setField('odometer', event.target.value)}
                    />
                  </label>
                </div>

                {editingId && (
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[#D0D0D0]">Trạng thái vận hành</span>
                    <select
                      className={inputClass}
                      value={form.status}
                      onChange={(event) => setField('status', event.target.value as Vehicle['status'])}
                    >
                      <option value="Available">Sẵn sàng</option>
                      <option value="Maintenance">Bảo dưỡng</option>
                      {['Rented', 'Transferring'].includes(form.status) && (
                        <option value={form.status}>{statusLabels[form.status]}</option>
                      )}
                    </select>
                  </label>
                )}

                {/* ===============================================================
                    VEHICLE IMAGE UPLOADER (FROM COMPUTER OR URL)
                    =============================================================== */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#F5F5F5] flex items-center gap-1.5">
                      <ImagePlus className="w-4 h-4 text-[#FFC799]" />
                      <span>Hình ảnh xe ({form.images.length}/10 ảnh)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowUrlInput((prev) => !prev)}
                      className="text-[11px] font-semibold text-[#FFC799] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Link2 className="w-3 h-3" />
                      <span>{showUrlInput ? 'Ẩn nhập link' : 'Thêm bằng link URL'}</span>
                    </button>
                  </div>

                  {/* Direct Computer File Upload Dropzone */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(event) => void handleUploadFiles(event.target.files)}
                  />

                  <button
                    type="button"
                    disabled={uploadingImages || form.images.length >= 10}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl border border-dashed border-[#FFC799]/40 bg-[#101010] hover:bg-[#FFC799]/[0.06] hover:border-[#FFC799] p-4 text-center transition-all cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <div className="w-9 h-9 rounded-xl bg-[#FFC799]/15 text-[#FFC799] flex items-center justify-center">
                        <Upload className={`w-4 h-4 ${uploadingImages ? 'animate-bounce' : ''}`} />
                      </div>
                      <span className="text-xs font-bold text-[#F5F5F5]">
                        {uploadingImages ? 'Đang tải ảnh lên máy chủ...' : 'Chọn ảnh xe từ máy tính'}
                      </span>
                      <span className="text-[11px] text-[#8E8E8E]">
                        Hỗ trợ chọn nhiều ảnh cùng lúc (JPG, PNG, WebP • tối đa 5MB/ảnh)
                      </span>
                    </div>
                  </button>

                  {/* Optional URL Input Box */}
                  {showUrlInput && (
                    <div className="rounded-xl border border-white/10 bg-[#101010] p-3 space-y-2">
                      <textarea
                        rows={2}
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        placeholder="Dán link ảnh http:// hoặc https:// (mỗi dòng 1 link)..."
                        className="w-full bg-transparent text-xs text-[#F5F5F5] placeholder-[#6E6E6E] outline-none resize-none"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddImageUrl}
                          className="px-3 py-1.5 rounded-lg bg-[#242424] hover:bg-[#FFC799] text-[#F5F5F5] hover:text-[#101010] text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Thêm link ảnh
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Image Thumbnails Preview Grid */}
                  {form.images.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                      {form.images.map((imgUrl, idx) => {
                        const resolvedSrc = getOptimizedVehicleImageUrl(imgUrl, 320);
                        return (
                          <div
                            key={`${imgUrl}-${idx}`}
                            className={`group relative aspect-[4/3] rounded-xl overflow-hidden bg-[#101010] border ${
                              idx === 0 ? 'border-[#FFC799] ring-1 ring-[#FFC799]/40' : 'border-white/12'
                            }`}
                          >
                            <img
                              src={resolvedSrc}
                              alt={`Ảnh xe ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {idx === 0 ? (
                              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#FFC799] text-[#101010] text-[9px] font-extrabold uppercase">
                                Ảnh chính
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryImage(idx)}
                                className="opacity-0 group-hover:opacity-100 absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[#FFC799] text-[9px] font-semibold border border-[#FFC799]/40 transition-opacity cursor-pointer"
                                title="Đặt làm ảnh đại diện chính"
                              >
                                Đặt làm chính
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-black/80 hover:bg-[#FF8080] text-white hover:text-[#101010] flex items-center justify-center transition-colors cursor-pointer"
                              title="Xóa ảnh này"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#7E7E7E] text-center py-1">
                      Chưa có ảnh nào được chọn cho phương tiện này.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={pending || loading || uploadingImages || !form.branchId}
                  className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-[#FFC799] hover:bg-[#ffd6b3] px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-[#101010] shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  <Plus size={16} />
                  <span>
                    {pending ? 'Đang lưu thông tin...' : editingId ? 'Lưu cập nhật phương tiện' : 'Thêm xe vào chi nhánh'}
                  </span>
                </button>
              </fieldset>
            </form>
          </section>

          {/* RIGHT PANEL: VEHICLE CATALOG WITH PHOTOS, FILTERS & PRICING DRAWER */}
          <section className="min-w-0 space-y-4">
            {/* Search & Multi-Filter Bar */}
            <div className="rounded-2xl border border-white/10 bg-[#161616] p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#F5F5F5]">
                    Danh sách đội xe ({filtered.length}/{vehicles.length})
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isAdmin && (
                    <select
                      value={filterBranch}
                      onChange={(e) => setFilterBranch(e.target.value)}
                      className="rounded-xl border border-white/10 bg-[#101010] px-3 py-1.5 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]"
                    >
                      <option value="all">Tất cả chi nhánh</option>
                      {branches.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.code} - {b.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#101010] px-3 py-1.5 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]"
                  >
                    <option value="all">Mọi loại xe</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#101010] px-3 py-1.5 text-xs text-[#F5F5F5] outline-none focus:border-[#FFC799]"
                  >
                    <option value="all">Mọi trạng thái</option>
                    <option value="Available">Sẵn sàng</option>
                    <option value="Rented">Đang thuê</option>
                    <option value="Maintenance">Bảo dưỡng</option>
                    <option value="Transferring">Điều chuyển</option>
                  </select>
                </div>
              </div>

              <label className="relative flex items-center">
                <Search size={16} className="text-[#FFC799] absolute left-3.5 pointer-events-none" />
                <input
                  aria-label="Tìm xe quản lý"
                  className="w-full rounded-xl border border-white/10 bg-[#101010] pl-10 pr-9 py-2.5 text-xs text-[#F5F5F5] placeholder-[#6E6E6E] outline-none focus:border-[#FFC799]"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm theo tên mẫu xe, thương hiệu, biển số (VD: Air Blade, Sirius, 43-C1...)"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 text-[#A0A0A0] hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
            </div>

            {/* Seasonal Pricing Panel Drawer (if selected) */}
            {pricingVehicle && (
              <div
                ref={priceRef}
                className="scroll-mt-24 border border-[#FFC799]/50 rounded-2xl p-5 bg-[#161616] shadow-2xl"
              >
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30">
                      {pricingVehicle.licensePlate}
                    </span>
                    <h2 className="font-bold text-base text-[#F5F5F5]">
                      Cấu hình giá &amp; mùa vụ · {pricingVehicle.vehicleModel}
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="p-2 rounded-xl border border-white/10 hover:border-[#FFC799] text-[#A0A0A0] hover:text-white transition-colors cursor-pointer"
                    onClick={() => setPricingId(null)}
                    aria-label="Đóng bảng giá"
                  >
                    <X size={16} />
                  </button>
                </div>
                <VehiclePricingPanel
                  key={pricingVehicle._id}
                  vehicle={pricingVehicle}
                  onUpdated={() => {
                    void reload();
                  }}
                />
              </div>
            )}

            {/* Vehicle Cards List */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-72 rounded-2xl bg-[#161616] border border-white/10 animate-pulse"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#161616] p-12 text-center space-y-2">
                <Bike className="w-10 h-10 text-[#6E6E6E] mx-auto" />
                <p className="text-sm font-semibold text-[#F5F5F5]">Không tìm thấy phương tiện phù hợp</p>
                <p className="text-xs text-[#A0A0A0]">
                  Thử thay đổi bộ lọc chi nhánh, danh mục hoặc từ khóa tìm kiếm.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((vehicle) => {
                  const primaryPhoto = getOptimizedVehicleImageUrl(
                    vehicle.images?.[1] || vehicle.images?.[0],
                    640
                  );
                  const categoryName =
                    typeof vehicle.category === 'object' && vehicle.category !== null
                      ? vehicle.category.name
                      : 'Chưa phân loại';
                  const branchName =
                    typeof vehicle.branchId === 'object' && vehicle.branchId !== null
                      ? vehicle.branchId.name
                      : '';
                  const isBeingEdited = editingId === vehicle._id;

                  return (
                    <article
                      key={vehicle._id}
                      className={`group rounded-2xl border bg-[#161616] overflow-hidden flex flex-col justify-between transition-all hover:border-white/25 ${
                        isBeingEdited
                          ? 'border-[#FFC799] ring-1 ring-[#FFC799]/40'
                          : 'border-white/10'
                      }`}
                    >
                      <div>
                        {/* Vehicle Visual Showcase Header */}
                        <div className="relative h-44 bg-gradient-to-b from-[#202020] to-[#141414] overflow-hidden flex items-center justify-center">
                          {primaryPhoto ? (
                            <img
                              src={primaryPhoto}
                              alt={`${vehicle.brand} ${vehicle.vehicleModel}`}
                              className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-[#6E6E6E] gap-1.5">
                              <Bike className="w-10 h-10 stroke-[1.4]" />
                              <span className="text-[11px]">Chưa có ảnh xe</span>
                            </div>
                          )}

                          {/* Top Left: License Plate Badge */}
                          <span className="absolute top-3 left-3 font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-[#101010]/90 backdrop-blur-md text-[#FFC799] border border-white/15 shadow">
                            {vehicle.licensePlate}
                          </span>

                          {/* Top Right: Status Pill */}
                          <span
                            className={`absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-md ${
                              statusBadgeStyles[vehicle.status]
                            }`}
                          >
                            {statusLabels[vehicle.status]}
                          </span>

                          {/* Bottom Left: Category Tag & Photo Count */}
                          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#101010]/85 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-[#F5F5F5]">
                              <Layers className="w-3 h-3 text-[#FFC799]" />
                              <span>{categoryName}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-[#101010]/85 backdrop-blur-md border border-white/10 text-[10px] font-mono text-[#A0A0A0]">
                              {vehicle.images.length}/10 ảnh
                            </span>
                          </div>
                        </div>

                        {/* Vehicle Body Details */}
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFC799] block">
                                {vehicle.brand} {vehicle.yearManufactured ? `• ${vehicle.yearManufactured}` : ''}
                              </span>
                              <h3 className="text-base font-bold text-[#F5F5F5] truncate mt-0.5">
                                {vehicle.vehicleModel}
                              </h3>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-sm font-extrabold font-mono-tabular text-[#FFC799] block">
                                {(vehicle.effectiveDailyPrice ?? vehicle.dailyPrice).toLocaleString('vi-VN')} đ/ngày
                              </span>
                              <span className="text-[11px] font-mono-tabular text-[#A0A0A0]">
                                {vehicle.hourlyPrice
                                  ? `${(vehicle.effectiveHourlyPrice ?? vehicle.hourlyPrice).toLocaleString('vi-VN')} đ/giờ`
                                  : 'Chưa đặt giá giờ'}
                              </span>
                            </div>
                          </div>

                          {/* Branch & Specs Grid */}
                          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-[#A0A0A0]">
                            <div className="flex items-center gap-1.5 bg-[#101010] border border-white/[0.06] rounded-lg px-2.5 py-1.5 truncate">
                              <Settings2 className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                              <span className="truncate">{transmissionLabels[vehicle.transmissionType]}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-[#101010] border border-white/[0.06] rounded-lg px-2.5 py-1.5 truncate">
                              <Fuel className="w-3.5 h-3.5 text-[#99FFE4] shrink-0" />
                              <span className="truncate">{fuelLabels[vehicle.fuelType]}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-[#101010] border border-white/[0.06] rounded-lg px-2.5 py-1.5 truncate">
                              <Gauge className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                              <span className="font-mono-tabular">{vehicle.odometer.toLocaleString('vi-VN')} km</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-[#101010] border border-white/[0.06] rounded-lg px-2.5 py-1.5 truncate">
                              <MapPin className="w-3.5 h-3.5 text-[#FFC799] shrink-0" />
                              <span className="truncate">{branchName || 'Toàn hệ thống'}</span>
                            </div>
                          </div>

                          {vehicle.requiresMaintenance && (
                            <div className="rounded-xl bg-[#FF8080]/10 border border-[#FF8080]/30 px-3 py-2 text-[11px] text-[#FFAAAA] flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 font-medium">
                                <AlertCircle size={14} className="shrink-0 text-[#FF8080]" />
                                <span>Đến mốc bảo dưỡng ODO</span>
                              </span>
                              <Link to="/manager/fleet" className="font-bold underline shrink-0">
                                Mở phiếu kỹ thuật
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="px-4 py-3 border-t border-white/[0.08] bg-[#121212] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => edit(vehicle)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#202020] hover:bg-[#FFC799] text-[#F5F5F5] hover:text-[#101010] border border-white/10 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                          >
                            <Pencil size={13} />
                            <span>Sửa &amp; Ảnh</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPricingId(pricingId === vehicle._id ? null : vehicle._id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                              pricingId === vehicle._id
                                ? 'bg-[#FFC799] text-[#101010] border-[#FFC799]'
                                : 'bg-[#161616] text-[#FFC799] border-[#FFC799]/30 hover:bg-[#FFC799]/15'
                            }`}
                          >
                            <Bike size={13} />
                            <span>Giá &amp; mùa vụ</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Link
                            to={`/bikes/${vehicle._id}`}
                            className="p-1.5 rounded-lg border border-white/10 text-[#A0A0A0] hover:text-white hover:border-white/30 transition-colors"
                            title="Xem trang chi tiết phía khách hàng"
                          >
                            <Eye size={14} />
                          </Link>

                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setDeleteTarget(vehicle)}
                            className="p-1.5 rounded-lg border border-[#FF8080]/25 text-[#FF8080] hover:bg-[#FF8080]/15 transition-colors cursor-pointer"
                            title="Ngừng khai thác xe"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-vehicle-heading"
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#161616] p-6 shadow-2xl space-y-4">
            <h2 id="delete-vehicle-heading" className="text-lg font-bold text-[#F5F5F5]">
              Ngừng khai thác phương tiện?
            </h2>
            <p className="text-xs leading-relaxed text-[#A0A0A0]">
              Bạn đang chọn ngừng khai thác xe{' '}
              <strong className="text-[#F5F5F5]">{deleteTarget.vehicleModel}</strong> (Biển số:{' '}
              <strong className="font-mono text-[#FFC799]">{deleteTarget.licensePlate}</strong>). Hệ thống sẽ kiểm tra đơn thuê, bảo dưỡng và điều chuyển trước khi ẩn xe khỏi danh mục đặt thuê.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                autoFocus
                disabled={pending}
                className="px-4 py-2 rounded-xl border border-white/15 text-xs font-semibold text-[#D0D0D0] hover:text-white cursor-pointer"
                onClick={() => setDeleteTarget(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={pending}
                className="px-4 py-2 rounded-xl bg-[#FF8080] hover:bg-[#ff6666] text-[#101010] text-xs font-bold cursor-pointer disabled:opacity-50"
                onClick={() => void remove()}
              >
                {pending ? 'Đang xử lý…' : 'Xác nhận ngừng khai thác'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
