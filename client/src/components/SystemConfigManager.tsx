import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  RotateCcw,
  Percent,
  Clock,
  Award,
  Phone,
  Mail,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';
import type { SystemConfig } from '../types';

export const SystemConfigManager: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields
  const [depositPercent, setDepositPercent] = useState<number>(30);
  const [cancelFreeHours, setCancelFreeHours] = useState<number>(24);
  const [cancelPartialRefundPercent, setCancelPartialRefundPercent] = useState<number>(50);
  const [lateFeePerHour, setLateFeePerHour] = useState<number>(30000);
  const [loyaltySpendPerPoint, setLoyaltySpendPerPoint] = useState<number>(10000);
  const [loyaltyPointValueVnd, setLoyaltyPointValueVnd] = useState<number>(1000);
  const [minPointsToRedeem, setMinPointsToRedeem] = useState<number>(50);
  const [supportHotline, setSupportHotline] = useState<string>('1900 6868');
  const [supportEmail, setSupportEmail] = useState<string>('support@motorent.vn');

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await api.get('/system/config');
      if (res.data?.success) {
        const c: SystemConfig = res.data.data;
        setConfig(c);
        setDepositPercent(c.depositPercent);
        setCancelFreeHours(c.cancelFreeHours);
        setCancelPartialRefundPercent(c.cancelPartialRefundPercent);
        setLateFeePerHour(c.lateFeePerHour);
        setLoyaltySpendPerPoint(c.loyaltySpendPerPoint);
        setLoyaltyPointValueVnd(c.loyaltyPointValueVnd);
        setMinPointsToRedeem(c.minPointsToRedeem);
        setSupportHotline(c.supportHotline || '1900 6868');
        setSupportEmail(c.supportEmail || 'support@motorent.vn');
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Không thể tải cấu hình hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await api.put('/system/config', {
        depositPercent: Number(depositPercent),
        cancelFreeHours: Number(cancelFreeHours),
        cancelPartialRefundPercent: Number(cancelPartialRefundPercent),
        lateFeePerHour: Number(lateFeePerHour),
        loyaltySpendPerPoint: Number(loyaltySpendPerPoint),
        loyaltyPointValueVnd: Number(loyaltyPointValueVnd),
        minPointsToRedeem: Number(minPointsToRedeem),
        supportHotline,
        supportEmail,
      });

      if (res.data?.success) {
        setConfig(res.data.data);
        showToast('success', res.data.message || 'Cập nhật cấu hình toàn hệ thống thành công.');
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Không thể lưu cấu hình hệ thống.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-[#A0A0A0] flex flex-col items-center justify-center gap-3">
        <RefreshCw size={24} className="animate-spin text-[#FFC799]" />
        <span>Đang tải thông số cấu hình chính sách hệ thống...</span>
      </div>
    );
  }

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
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Settings className="text-[#FFC799]" size={26} />
            Cấu Hình Chính Sách & Quy Chuẩn Hệ Thống (UC-113 - UC-115)
          </h2>
          <p className="text-sm text-[#A0A0A0] mt-1">
            Thiết lập tỷ lệ cọc giữ xe, quy tắc phạt hủy, phí trễ giờ và cơ chế điểm thưởng tích lũy (Loyalty).
          </p>
        </div>

        <button
          type="button"
          onClick={fetchConfig}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-[#161616] text-[#D0D0D0] hover:text-white hover:border-[#FFC799] text-sm transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={16} />
          Tải lại dữ liệu
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Deposit Policy (UC-114) */}
        <div className="bg-[#161616] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <Percent className="text-[#FFC799]" size={20} />
            <h3 className="text-base font-bold text-white">1. Chính Sách Đặt Cọc Trực Tuyến (UC-114)</h3>
          </div>

          <div className="max-w-xl">
            <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
              Tỷ lệ đặt cọc tối thiểu (%) <span className="text-rose-400">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                required
                min={10}
                max={100}
                value={depositPercent}
                onChange={(e) => setDepositPercent(Number(e.target.value))}
                className="w-32 bg-[#101010] border border-white/10 rounded-xl px-3 py-2.5 text-base font-bold text-white focus:border-[#FFC799] focus:outline-none"
              />
              <span className="text-sm text-emerald-400 font-semibold">% tổng giá trị hợp đồng thuê</span>
            </div>
            <p className="text-xs text-[#808080] mt-1.5">
              Khách hàng phải thanh toán trực tuyến qua cổng VNPay tỷ lệ này (mặc định 30%) để xác nhận giữ xe thành công. 70% còn lại thanh toán tại quầy khi nhận xe.
            </p>
          </div>
        </div>

        {/* Section 2: Cancellation & Late Return Fees (UC-113) */}
        <div className="bg-[#161616] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <RotateCcw className="text-[#FFC799]" size={20} />
            <h3 className="text-base font-bold text-white">2. Chính Sách Hủy Đơn & Phí Trễ Giờ (UC-113)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                Thời gian hủy miễn phí (Giờ) <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  required
                  min={1}
                  value={cancelFreeHours}
                  onChange={(e) => setCancelFreeHours(Number(e.target.value))}
                  className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-[#FFC799] focus:outline-none"
                />
                <span className="text-xs text-[#A0A0A0] font-semibold">Giờ</span>
              </div>
              <p className="text-[11px] text-[#707070] mt-1">
                Hủy trước giờ nhận xe {cancelFreeHours}h sẽ được hoàn cọc 100%.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                Tỷ lệ hoàn khi hủy sát giờ (%) <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  required
                  min={0}
                  max={100}
                  value={cancelPartialRefundPercent}
                  onChange={(e) => setCancelPartialRefundPercent(Number(e.target.value))}
                  className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-[#FFC799] focus:outline-none"
                />
                <span className="text-xs text-[#A0A0A0] font-semibold">% cọc</span>
              </div>
              <p className="text-[11px] text-[#707070] mt-1">
                Nếu hủy trong vòng dưới {cancelFreeHours}h, khách nhận lại {cancelPartialRefundPercent}% cọc.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                Phí trả xe trễ mỗi giờ (VND/giờ) <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  required
                  min={0}
                  step={5000}
                  value={lateFeePerHour}
                  onChange={(e) => setLateFeePerHour(Number(e.target.value))}
                  className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-[#FFC799] focus:outline-none"
                />
                <span className="text-xs text-[#A0A0A0] font-semibold">VND</span>
              </div>
              <p className="text-[11px] text-[#707070] mt-1">
                Tự động tính thêm vào hóa đơn tất toán Check-out tại quầy (mặc định 30,000 đ/h).
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Loyalty & Rewards Program (UC-115) */}
        <div className="bg-[#161616] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <Award className="text-[#FFC799]" size={20} />
            <h3 className="text-base font-bold text-white">3. Cơ Chế Điểm Thưởng Tích Lũy (Loyalty Rules UC-115)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                Chi tiêu để tích 1 điểm (VND) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                required
                min={1000}
                step={1000}
                value={loyaltySpendPerPoint}
                onChange={(e) => setLoyaltySpendPerPoint(Number(e.target.value))}
                className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-[#FFC799] focus:outline-none"
              />
              <p className="text-[11px] text-[#707070] mt-1">
                Mỗi {loyaltySpendPerPoint.toLocaleString('vi-VN')} VND hoàn tất sẽ cộng 1 điểm.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                Giá trị quy đổi 1 điểm (VND) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                required
                min={100}
                step={100}
                value={loyaltyPointValueVnd}
                onChange={(e) => setLoyaltyPointValueVnd(Number(e.target.value))}
                className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-[#FFC799] focus:outline-none"
              />
              <p className="text-[11px] text-[#707070] mt-1">
                1 điểm quy đổi tương đương {loyaltyPointValueVnd.toLocaleString('vi-VN')} VND giảm trực tiếp.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">
                Số điểm tối thiểu để đổi thưởng <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                value={minPointsToRedeem}
                onChange={(e) => setMinPointsToRedeem(Number(e.target.value))}
                className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-[#FFC799] focus:outline-none"
              />
              <p className="text-[11px] text-[#707070] mt-1">
                Tích lũy từ {minPointsToRedeem} điểm trở lên mới được cấn trừ đơn hàng.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Public Support Channels */}
        <div className="bg-[#161616] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <Phone className="text-[#FFC799]" size={20} />
            <h3 className="text-base font-bold text-white">4. Kênh Hỗ Trợ Khách Hàng Công Khai</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">Hotline toàn quốc</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0A0A0]" size={16} />
                <input
                  type="text"
                  value={supportHotline}
                  onChange={(e) => setSupportHotline(e.target.value)}
                  className="w-full bg-[#101010] border border-white/10 rounded-xl pl-10 pr-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A0A0A0] mb-1">Email trung tâm hỗ trợ</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0A0A0]" size={16} />
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full bg-[#101010] border border-white/10 rounded-xl pl-10 pr-3 py-2 text-sm text-white focus:border-[#FFC799] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between p-4 bg-[#161616] border border-white/10 rounded-2xl">
          <div className="text-xs text-[#A0A0A0]">
            Mọi thay đổi cấu hình sẽ được lưu vào lịch sử kiểm toán <code className="text-[#FFC799]">AuditLog</code> hệ thống.
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FFC799] text-[#101010] font-bold text-sm hover:bg-[#ffb77d] transition-all shadow-lg shadow-[#FFC799]/15 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Đang cập nhật...' : 'Lưu toàn bộ cấu hình'}
          </button>
        </div>
      </form>
    </div>
  );
};
