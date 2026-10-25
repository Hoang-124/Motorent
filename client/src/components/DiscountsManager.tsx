import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Edit3,
  Trash2,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Calendar,
  Percent,
  TrendingUp,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import { api } from '../services/api';
import type { Discount } from '../types';

interface DiscountFormData {
  code: string;
  description: string;
  discountPercent: number | string;
  maxDiscountAmount: number | string;
  minBookingAmount: number | string;
  startDate: string;
  endDate: string;
  usageLimit: number | string;
  isActive: boolean;
}

export const DiscountsManager: React.FC = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active'>('all');

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [formData, setFormData] = useState<DiscountFormData>({
    code: '',
    description: '',
    discountPercent: 10,
    maxDiscountAmount: 0,
    minBookingAmount: 0,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    usageLimit: 100,
    isActive: true,
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (activeFilter === 'active') params.activeOnly = 'true';
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/discounts', { params });
      if (res.data?.success) {
        setDiscounts(res.data.data);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Không thể tải danh sách mã giảm giá.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, [activeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDiscounts();
  };

  const handleOpenAddModal = () => {
    setEditingDiscount(null);
    setFormData({
      code: '',
      description: '',
      discountPercent: 10,
      maxDiscountAmount: 100000,
      minBookingAmount: 200000,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      usageLimit: 100,
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (d: Discount) => {
    setEditingDiscount(d);
    setFormData({
      code: d.code,
      description: d.description || '',
      discountPercent: d.discountPercent,
      maxDiscountAmount: d.maxDiscountAmount || 0,
      minBookingAmount: d.minBookingAmount || 0,
      startDate: new Date(d.startDate).toISOString().slice(0, 10),
      endDate: new Date(d.endDate).toISOString().slice(0, 10),
      usageLimit: d.usageLimit,
      isActive: d.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingDiscount) {
        // UC-111: Update Discount
        const res = await api.put(`/discounts/${editingDiscount._id}`, {
          code: formData.code,
          description: formData.description,
          discountPercent: Number(formData.discountPercent),
          maxDiscountAmount: Number(formData.maxDiscountAmount),
          minBookingAmount: Number(formData.minBookingAmount),
          startDate: formData.startDate,
          endDate: formData.endDate,
          usageLimit: Number(formData.usageLimit),
          isActive: formData.isActive,
        });

        if (res.data?.success) {
          showToast('success', res.data.message || 'Cập nhật mã giảm giá thành công.');
          setShowModal(false);
          fetchDiscounts();
        }
      } else {
        // UC-110: Create Discount
        const res = await api.post('/discounts', {
          code: formData.code,
          description: formData.description,
          discountPercent: Number(formData.discountPercent),
          maxDiscountAmount: Number(formData.maxDiscountAmount),
          minBookingAmount: Number(formData.minBookingAmount),
          startDate: formData.startDate,
          endDate: formData.endDate,
          usageLimit: Number(formData.usageLimit),
          isActive: formData.isActive,
        });

        if (res.data?.success) {
          showToast('success', res.data.message || 'Tạo mã giảm giá mới thành công.');
          setShowModal(false);
          fetchDiscounts();
        }
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Có lỗi xảy ra khi lưu mã giảm giá.');
    } finally {
      setSubmitting(false);
    }
  };

  // UC-112: Delete Discount
  const handleDeleteDiscount = async (d: Discount) => {
    if (!window.confirm(`Bạn có chắc muốn xóa vĩnh viễn mã giảm giá "${d.code}"?`)) return;

    try {
      const res = await api.delete(`/discounts/${d._id}`);
      if (res.data?.success) {
        showToast('success', res.data.message || 'Đã xóa mã giảm giá.');
        fetchDiscounts();
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Không thể xóa mã giảm giá.');
    }
  };

  // Quick toggle active
  const handleToggleActive = async (d: Discount) => {
    try {
      const res = await api.put(`/discounts/${d._id}`, { isActive: !d.isActive });
      if (res.data?.success) {
        showToast('success', `Đã ${!d.isActive ? 'kích hoạt' : 'tạm dừng'} mã ${d.code}.`);
        fetchDiscounts();
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Không thể thay đổi trạng thái.');
    }
  };

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Tag className="text-[#FFC799]" size={26} />
            Quản trị Khuyến Mãi & Voucher Giảm Giá (UC-110 - UC-112)
          </h2>
          <p className="text-sm text-[#A0A0A0] mt-1">
            Thiết lập mã coupon, tỷ lệ chiết khấu (%), điều kiện đơn tối thiểu và giới hạn số lượt sử dụng.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFC799] text-[#101010] font-semibold text-sm hover:bg-[#ffb77d] transition-all shadow-lg shadow-[#FFC799]/10"
        >
          <Plus size={18} />
          Tạo mã giảm giá mới
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-[#161616] border border-white/10 rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0A0A0]" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo mã CODE hoặc mô tả chương trình..."
              className="w-full bg-[#101010] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#606060] focus:border-[#FFC799] focus:outline-none transition-colors"
            />
          </form>

          <div className="flex items-center gap-2">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
              className="bg-[#101010] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#FFC799] focus:outline-none"
            >
              <option value="all">Tất cả chương trình</option>
              <option value="active">Đang có hiệu lực</option>
            </select>

            <button
              type="button"
              onClick={fetchDiscounts}
              disabled={loading}
              className="p-2.5 rounded-xl border border-white/10 bg-[#101010] text-[#D0D0D0] hover:text-white hover:border-[#FFC799] transition-colors"
              title="Làm mới"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Discounts Table */}
      {loading ? (
        <div className="p-16 text-center text-[#A0A0A0] flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-[#FFC799]" />
          <span>Đang tải danh sách khuyến mãi...</span>
        </div>
      ) : discounts.length === 0 ? (
        <div className="bg-[#161616] border border-white/10 rounded-2xl p-12 text-center">
          <Tag size={40} className="mx-auto text-[#606060] mb-3" />
          <h3 className="text-base font-semibold text-white">Chưa có mã giảm giá nào</h3>
          <p className="text-sm text-[#A0A0A0] mt-1 max-w-md mx-auto">
            Khởi tạo mã ưu đãi đầu tiên để kích cầu thuê xe cho khách hàng trên toàn hệ thống.
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFC799] text-[#101010] text-sm font-semibold hover:bg-[#ffb77d] transition-colors"
          >
            <Plus size={16} />
            Tạo mã coupon ngay
          </button>
        </div>
      ) : (
        <div className="bg-[#161616] border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#101010] border-b border-white/10 text-xs text-[#A0A0A0] uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Mã Code & Mô tả</th>
                  <th className="py-3.5 px-4">Mức giảm</th>
                  <th className="py-3.5 px-4">Điều kiện đơn</th>
                  <th className="py-3.5 px-4">Thời hạn áp dụng</th>
                  <th className="py-3.5 px-4">Tiến độ sử dụng</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {discounts.map((d) => {
                  const now = new Date();
                  const start = new Date(d.startDate);
                  const end = new Date(d.endDate);
                  const isExpired = now > end;
                  const percentUsed = Math.min(100, Math.round((d.usedCount / (d.usageLimit || 1)) * 100));

                  return (
                    <tr key={d._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFC799]/15 border border-[#FFC799]/30 text-[#FFC799] font-mono font-bold text-xs">
                          <Tag size={13} />
                          {d.code}
                        </div>
                        {d.description && (
                          <div className="text-xs text-[#A0A0A0] mt-1 max-w-xs truncate" title={d.description}>
                            {d.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-base font-extrabold text-emerald-400">
                          {d.discountPercent}%
                        </div>
                        {d.maxDiscountAmount ? (
                          <div className="text-xs text-[#A0A0A0]">
                            Tối đa: {d.maxDiscountAmount.toLocaleString('vi-VN')} đ
                          </div>
                        ) : (
                          <div className="text-xs text-[#606060]">Không giới hạn trần</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {d.minBookingAmount ? (
                          <div className="text-xs text-[#D0D0D0]">
                            Từ {d.minBookingAmount.toLocaleString('vi-VN')} đ
                          </div>
                        ) : (
                          <div className="text-xs text-[#606060]">Mọi đơn hàng</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-xs text-white flex items-center gap-1">
                          <Calendar size={12} className="text-[#FFC799]" />
                          <span>
                            {start.toLocaleDateString('vi-VN')} — {end.toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        {isExpired && (
                          <span className="text-[10px] text-rose-400 font-medium">Đã hết hạn</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-white font-medium">
                            {d.usedCount} / {d.usageLimit}
                          </span>
                          <span className="text-[11px] text-[#A0A0A0]">{percentUsed}%</span>
                        </div>
                        <div className="w-24 bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#FFC799] h-full rounded-full transition-all"
                            style={{ width: `${percentUsed}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            d.isActive && !isExpired
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {d.isActive && !isExpired ? (
                            <>
                              <PlayCircle size={12} /> Áp dụng
                            </>
                          ) : (
                            <>
                              <PauseCircle size={12} /> Tạm dừng
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(d)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              d.isActive
                                ? 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10'
                                : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                            title={d.isActive ? 'Tạm ngưng áp dụng' : 'Kích hoạt lại'}
                          >
                            {d.isActive ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(d)}
                            className="p-1.5 rounded-lg border border-white/10 hover:border-[#FFC799] text-[#D0D0D0] hover:text-white transition-colors"
                            title="Sửa voucher"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteDiscount(d)}
                            className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Xóa voucher"
                          >
                            <Trash2 size={15} />
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

      {/* Add / Edit Discount Modal (UC-110, UC-111) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#161616] border border-white/15 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Tag className="text-[#FFC799]" size={20} />
                {editingDiscount ? 'Cập nhật mã giảm giá (UC-111)' : 'Khởi tạo mã giảm giá mới (UC-110)'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-[#A0A0A0] hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                  Mã Code (Tự động in hoa) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="DANANG2026, SUMMER15..."
                  className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase focus:border-[#FFC799] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">Mô tả chương trình</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Giảm 10% cho khách đặt xe chuyến hè tại Đà Nẵng"
                  className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                    Tỷ lệ giảm (%) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                    className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                    Mức giảm trần (VND)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                    placeholder="0 = Không giới hạn"
                    className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                    Đơn hàng tối thiểu (VND)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={formData.minBookingAmount}
                    onChange={(e) => setFormData({ ...formData, minBookingAmount: e.target.value })}
                    placeholder="0 = Mọi đơn"
                    className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                    Tổng lượt dùng <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                    Ngày bắt đầu <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                    Ngày kết thúc <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActiveDiscount"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-white/20 text-[#FFC799] focus:ring-[#FFC799] w-4 h-4 bg-[#101010]"
                />
                <label htmlFor="isActiveDiscount" className="text-sm text-white font-medium">
                  Kích hoạt mã giảm giá này ngay lập tức
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-[#D0D0D0] hover:text-white transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#FFC799] text-[#101010] text-sm font-semibold hover:bg-[#ffb77d] transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : editingDiscount ? 'Lưu thay đổi' : 'Tạo mã voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
