import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Gauge, 
  FileCheck, 
  PenTool, 
  DollarSign, 
  Clock, 
  RefreshCw, 
  ShieldCheck, 
  RotateCcw, 
  Sparkles,
  UserCheck,
  XCircle,
  Eye,
  X,
  FileText,
  User as UserIcon,
  Phone,
  Mail,
  Calendar
} from 'lucide-react';
import axios from 'axios';
import type { Booking, Vehicle, User } from '../types';
import { api } from '../services/api';
import { getUserAvatarUrl } from '../utils/imageHelper';

type ChecklistKey = 'tires' | 'brakes' | 'lights' | 'fuel' | 'helmets';
type MainDeskMode = 'bookings' | 'ekyc';

interface PendingEkycUser {
  _id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  identityStatus: string;
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  drivingLicenseUrl?: string;
  ekycConsentAgreed?: boolean;
  ekycConsentDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const CounterDesk: React.FC = () => {
  const [deskMode, setDeskMode] = useState<MainDeskMode>('bookings');
  const [searchCode, setSearchCode] = useState<string>('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'checkin' | 'checkout'>('checkin');

  // Notification banners (replacing alert())
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // eKYC Management states
  const [pendingEkycList, setPendingEkycList] = useState<PendingEkycUser[]>([]);
  const [selectedEkycUser, setSelectedEkycUser] = useState<PendingEkycUser | null>(null);
  const [ekycLoading, setEkycLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [previewDocModal, setPreviewDocModal] = useState<{ title: string; url: string } | null>(null);

  // Check-in form states
  const [startOdo, setStartOdo] = useState<number>(0);
  const [checklist, setChecklist] = useState<Record<ChecklistKey, boolean>>({
    tires: true,
    brakes: true,
    lights: true,
    fuel: true,
    helmets: true,
  });
  const [signatureData, setSignatureData] = useState<string>('');

  // Check-out form states
  const [endOdo, setEndOdo] = useState<number>(0);
  const [damageFee, setDamageFee] = useState<number>(0);
  const [returnNotes, setReturnNotes] = useState<string>('');

  // Canvas ref for digital signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef<boolean>(false);

  const fetchBookings = async () => {
    setLoading(true);

    setStatusMessage(null);
    try {
      const res = await api.get('/bookings/branch');
      if (res.data?.data) {
        setBookings(res.data.data);
        if (res.data.data.length > 0 && !selectedBooking) {
          handleSelectBooking(res.data.data[0]);
        }
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setStatusMessage({
          type: 'error',
          text: err.response?.data?.message || 'Không thể tải danh sách đơn của chi nhánh.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingEkyc = async () => {
    setEkycLoading(true);
    try {
      const res = await api.get('/auth/ekyc/pending');
      if (res.data?.data) {
        setPendingEkycList(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedEkycUser((prev) => prev ? (res.data.data.find((u: PendingEkycUser) => u._id === prev._id) || res.data.data[0]) : res.data.data[0]);
        } else {
          setSelectedEkycUser(null);
        }
      }
    } catch (err) {
      console.error('Không thể tải hàng đợi eKYC:', err);
    } finally {
      setEkycLoading(false);
    }
  };

  const handleReviewEkyc = async (status: 'Verified' | 'Rejected') => {
    if (!selectedEkycUser) return;
    setReviewLoading(true);
    setStatusMessage(null);
    try {
      const res = await api.put(`/auth/ekyc/review/${selectedEkycUser._id}`, {
        status,
        note: status === 'Rejected' ? rejectNote.trim() : undefined,
      });
      if (res.data?.success) {
        setStatusMessage({
          type: 'success',
          text: status === 'Verified' 
            ? `Đã phê duyệt eKYC thành công cho khách hàng ${selectedEkycUser.firstName || selectedEkycUser.username}!`
            : `Đã từ chối và gửi yêu cầu chụp lại giấy tờ tới khách hàng ${selectedEkycUser.firstName || selectedEkycUser.username}.`,
        });
        setRejectNote('');
        await fetchPendingEkyc();
        await fetchBookings();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setStatusMessage({
          type: 'error',
          text: err.response?.data?.message || 'Có lỗi xảy ra khi xét duyệt eKYC.',
        });
      }
    } finally {
      setReviewLoading(false);
    }
  };

  const formatAdminDocUrl = (userId: string, docType: string) => {
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') as string;
    const token = localStorage.getItem('motorent_token') || localStorage.getItem('token') || '';
    return `${apiBase}/auth/ekyc/document/view/${userId}/${docType}?token=${encodeURIComponent(token)}`;
  };

  useEffect(() => {
    fetchBookings();
    fetchPendingEkyc();
  }, []);


  const handleSelectBooking = (b: Booking) => {
    setSelectedBooking(b);
    setStatusMessage(null);
    setSignatureData(b.eSignatureUrl || '');

    const bikeOdo = typeof b.vehicleId === 'object' && b.vehicleId !== null 
      ? (b.vehicleId as Vehicle).odometer || 0 
      : 0;

    setStartOdo(b.startOdometer || bikeOdo);
    setEndOdo(b.endOdometer || (b.startOdometer ? b.startOdometer : bikeOdo));
    setDamageFee(b.damageFee || 0);

    if (b.status === 'Ongoing') {
      setActiveTab('checkout');
    } else {
      setActiveTab('checkin');
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await api.get(`/bookings/code/${encodeURIComponent(searchCode.trim())}`);
      if (res.data?.data) {
        handleSelectBooking(res.data.data);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setStatusMessage({
          type: 'error',
          text: err.response?.data?.message || `Không tìm thấy đơn đặt xe với mã: ${searchCode}`,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawing.current = true;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#10b981';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing.current && canvasRef.current) {
      isDrawing.current = false;
      setSignatureData(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  const handleCheckinSubmit = async () => {
    if (!selectedBooking) return;

    if (!signatureData) {
      setStatusMessage({
        type: 'error',
        text: 'Vui lòng yêu cầu khách hàng ký xác nhận vào khung chữ ký điện tử trước khi bàn giao.',
      });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await api.put(`/bookings/${selectedBooking._id}/checkin`, {
        startOdometer: startOdo,
        startFuelLevel: 100,
        checklist,
        eSignatureUrl: signatureData,
      });

      if (res.data?.data) {
        setStatusMessage({
          type: 'success',
          text: `Check-in thành công cho đơn ${selectedBooking.bookingCode}! Phương tiện đã chuyển sang trạng thái Đang lưu hành.`,
        });
        handleSelectBooking(res.data.data);
        fetchBookings();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setStatusMessage({
          type: 'error',
          text: err.response?.data?.message || 'Không thể hoàn tất Check-in.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckoutSubmit = async () => {
    if (!selectedBooking) return;

    if (endOdo < (selectedBooking.startOdometer || 0)) {
      setStatusMessage({
        type: 'error',
        text: 'Chỉ số ODO lúc trả xe không được nhỏ hơn ODO lúc nhận xe.',
      });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await api.put(`/bookings/${selectedBooking._id}/checkout`, {
        endOdometer: endOdo,
        damageFee,
        returnNotes,
      });

      if (res.data?.data) {
        const updated = res.data.data;
        const totalPaid = (updated.remainingAmount || 0) + (updated.lateFee || 0) + (updated.damageFee || 0);
        setStatusMessage({
          type: 'success',
          text: `Check-out thành công cho đơn ${selectedBooking.bookingCode}! Tổng tiền khách thanh toán tại quầy: ${totalPaid.toLocaleString('vi-VN')} đ (Đã gồm trễ hẹn: ${updated.lateFee?.toLocaleString('vi-VN')} đ, phụ phí: ${updated.damageFee?.toLocaleString('vi-VN')} đ). Phương tiện đã sẵn sàng khai thác.`,
        });
        handleSelectBooking(updated);
        fetchBookings();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setStatusMessage({
          type: 'error',
          text: err.response?.data?.message || 'Không thể hoàn tất Check-out.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse"></span>
              <span className="text-xs font-semibold tracking-wider text-orange-400">
                Phân hệ Quản lý Vận hành Chi nhánh
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
              Bàn giao nhận xe tại quầy (Counter Desk)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Xử lý quy trình Check-in giao xe eKYC và Check-out thu hồi xe, đối soát ODO và tất toán 70% còn lại.
            </p>

            {/* Mode Switcher */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setDeskMode('bookings')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  deskMode === 'bookings'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                    : 'bg-[#111827] text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                <span>Bàn giao nhận xe ({bookings.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeskMode('ekyc');
                  fetchPendingEkyc();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  deskMode === 'ekyc'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                    : 'bg-[#111827] text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-orange-400" />
                <span>Đối soát & Duyệt eKYC</span>
                {pendingEkycList.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                    {pendingEkycList.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              if (deskMode === 'bookings') fetchBookings();
              else fetchPendingEkyc();
            }}
            disabled={loading || ekycLoading}
            className="self-start md:self-auto inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-[#111827] border border-white/10 hover:border-orange-500/40 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading || ekycLoading ? 'animate-spin' : ''}`} />
            <span>{deskMode === 'bookings' ? 'Đồng bộ đơn chi nhánh' : 'Làm mới hàng đợi eKYC'}</span>
          </button>
        </div>

        {/* Global Alert / Toast Notification */}
        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-xs flex items-start space-x-3 transition-all ${
              statusMessage.type === 'success'
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-orange-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
            )}
            <div className="flex-1 font-medium leading-relaxed">
              {statusMessage.text}
            </div>
          </div>
        )}

        {/* Main 2-column desk */}
        {deskMode === 'bookings' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Booking lookup and Queue (5 cols) */}
          <div className="lg:col-span-5 space-y-4">

            {/* Quick Search */}
            <form onSubmit={handleSearch} className="bg-[#111827] p-4 rounded-2xl border border-white/10">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tra cứu mã đặt xe (Booking Code)
              </label>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-500 absolute left-3" />
                <input
                  type="text"
                  placeholder="Nhập mã đơn, VD: MV-892101..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="w-full pl-9 pr-24 py-2.5 bg-[#0B0F17] border border-white/10 rounded-xl text-xs font-medium text-white placeholder:text-slate-500 outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg text-xs font-bold hover:from-orange-400 hover:to-amber-400 transition-colors"
                >
                  Tra cứu
                </button>
              </div>
            </form>

            {/* Bookings Queue */}
            <div className="bg-[#111827] rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Hàng đợi chi nhánh ({bookings.length})
                </h3>
                <span className="text-[11px] font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                  Hôm nay
                </span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Đang tải danh sách đơn đặt xe...
                </div>
              ) : bookings.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Chưa có đơn đặt xe nào trong chi nhánh.
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto">
                  {bookings.map((b) => {
                    const isSelected = selectedBooking?._id === b._id;
                    const bikeName = typeof b.vehicleId === 'object' && b.vehicleId !== null 
                      ? (b.vehicleId as Vehicle).vehicleModel 
                      : 'Xe máy Motorent';
                    const userName = typeof b.userId === 'object' && b.userId !== null 
                      ? `${(b.userId as User).firstName || ''} ${(b.userId as User).lastName || ''}`.trim() || (b.userId as User).username
                      : 'Khách hàng';

                    return (
                      <div
                        key={b._id}
                        onClick={() => handleSelectBooking(b)}
                        className={`p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-orange-500/10 border-l-4 border-orange-500'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-xs font-bold text-white">
                            {b.bookingCode}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.status === 'Confirmed'
                                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                                : b.status === 'Ongoing'
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                : b.status === 'Completed'
                                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {b.status === 'Confirmed'
                              ? 'Chờ nhận xe'
                              : b.status === 'Ongoing'
                              ? 'Đang lưu hành'
                              : b.status === 'Completed'
                              ? 'Đã hoàn tất'
                              : b.status}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-200 truncate">
                          {bikeName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center justify-between">
                          <span>Khách: {userName}</span>
                          <span className="font-semibold text-orange-400">
                            Còn lại: {b.remainingAmount?.toLocaleString('vi-VN') || 0} đ
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Active Terminal Workflow (7 cols) */}
          <div className="lg:col-span-7">
            {selectedBooking ? (
              <div className="bg-[#111827] rounded-2xl border border-white/10 overflow-hidden">
                {/* Terminal Header */}
                <div className="bg-gradient-to-r from-[#081512] to-[#0D241E] p-5 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-orange-400">
                        Chi tiết hồ sơ giao nhận
                      </span>
                      <h2 className="text-xl font-bold text-white mt-0.5">
                        Mã đơn: <span className="font-mono">{selectedBooking.bookingCode}</span>
                      </h2>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Đã cọc online 30%</span>
                      <span className="text-sm font-bold text-orange-400">
                        {selectedBooking.depositAmount?.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>

                  {/* Quick details chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Phương tiện:</span>
                      <span className="font-medium text-slate-200 truncate block">
                        {typeof selectedBooking.vehicleId === 'object' && selectedBooking.vehicleId !== null
                          ? (selectedBooking.vehicleId as Vehicle).vehicleModel
                          : 'Xe Motorent'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Khách hàng:</span>
                      <span className="font-medium text-slate-200 truncate block">
                        {typeof selectedBooking.userId === 'object' && selectedBooking.userId !== null
                          ? (selectedBooking.userId as User).firstName || (selectedBooking.userId as User).username
                          : 'Khách thuê'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Ngày nhận:</span>
                      <span className="font-medium text-slate-200 truncate block">
                        {new Date(selectedBooking.pickupDateTime).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Ngày hẹn trả:</span>
                      <span className="font-medium text-slate-200 truncate block">
                        {new Date(selectedBooking.returnDateTime).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Workflow Mode Tabs */}
                <div className="flex border-b border-white/10">
                  <button
                    onClick={() => setActiveTab('checkin')}
                    className={`flex-1 py-3.5 text-xs font-bold text-center border-b-2 transition-all ${
                      activeTab === 'checkin'
                        ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    1. Check-in Bàn giao xe ({selectedBooking.status === 'Confirmed' ? 'Sẵn sàng' : selectedBooking.status})
                  </button>
                  <button
                    onClick={() => setActiveTab('checkout')}
                    className={`flex-1 py-3.5 text-xs font-bold text-center border-b-2 transition-all ${
                      activeTab === 'checkout'
                        ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    2. Check-out Thu hồi xe & Tất toán ({selectedBooking.status === 'Ongoing' ? 'Đang thực hiện' : ''})
                  </button>
                </div>

                {/* Tab 1: Check-in Process */}
                {activeTab === 'checkin' && (
                  <div className="p-6 space-y-5">
                    {/* Odometer Input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
                        <Gauge className="w-4 h-4 text-orange-400 mr-1.5" />
                        Ghi nhận chỉ số ODO công-tơ-mét khi giao
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={startOdo}
                        onChange={(e) => setStartOdo(Number(e.target.value))}
                        disabled={selectedBooking.status !== 'Confirmed'}
                        className="w-full bg-[#0B0F17] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500 disabled:opacity-50"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Chỉ số ODO làm căn cứ đối chiếu khi khách bàn giao trả xe.
                      </p>
                    </div>

                    {/* 5-point Checklist */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center">
                        <FileCheck className="w-4 h-4 text-orange-400 mr-1.5" />
                        Biên bản kiểm tra kỹ thuật an toàn trước khi rời trạm
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {[
                          { key: 'tires' as ChecklistKey, label: 'Áp suất lốp xe & độ bám đường tốt' },
                          { key: 'brakes' as ChecklistKey, label: 'Phanh trước & sau hoạt động nhạy' },
                          { key: 'lights' as ChecklistKey, label: 'Đèn pha, xi nhan, còi xe hoạt động' },
                          { key: 'fuel' as ChecklistKey, label: 'Xăng/Pin đầy bình khi giao khách' },
                          { key: 'helmets' as ChecklistKey, label: 'Đã giao 2 nón bảo hiểm chuẩn CR + 2 áo mưa' },
                        ].map((item) => (
                          <label
                            key={item.key}
                            className="flex items-center space-x-2 p-2.5 rounded-xl border border-white/10 bg-[#0B0F17] cursor-pointer hover:bg-white/[0.02]"
                          >
                            <input
                              type="checkbox"
                              checked={checklist[item.key]}
                              disabled={selectedBooking.status !== 'Confirmed'}
                              onChange={(e) =>
                                setChecklist({ ...checklist, [item.key]: e.target.checked })
                              }
                              className="rounded accent-orange-500"
                            />
                            <span className="text-slate-300 font-medium">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* eKYC Guarantee */}
                    <div className="p-3.5 bg-orange-500/10 rounded-xl border border-orange-500/20 flex items-start space-x-2 text-xs">
                      <ShieldCheck className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-orange-300">
                          Quy chuẩn eKYC Motorent: Không giữ CCCD bản gốc
                        </p>
                        <p className="text-orange-400/80 text-[11px] mt-0.5">
                          Nhân viên đã chụp ảnh CCCD & GPLX của khách lưu vào hồ sơ bảo mật. Khách cầm lại toàn bộ giấy tờ tùy thân.
                        </p>
                      </div>
                    </div>

                    {/* Digital Signature Canvas */}
                    <div className="border border-dashed border-white/15 rounded-2xl p-4 bg-[#0B0F17]/40">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-300 flex items-center">
                          <PenTool className="w-3.5 h-3.5 text-orange-400 mr-1" />
                          Chữ ký điện tử của khách hàng
                        </p>
                        {signatureData && (
                          <button
                            type="button"
                            onClick={clearSignature}
                            disabled={selectedBooking.status !== 'Confirmed'}
                            className="text-[11px] text-red-400 hover:text-red-300 flex items-center space-x-1 font-semibold"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Xóa ký lại</span>
                          </button>
                        )}
                      </div>

                      {selectedBooking.status === 'Confirmed' ? (
                        <div className="relative border border-white/10 rounded-xl bg-[#040807] overflow-hidden">
                          <canvas
                            ref={canvasRef}
                            width={500}
                            height={160}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="w-full h-40 touch-none cursor-crosshair"
                          />
                          {!signatureData && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-500">
                              Mời khách ký tay trực tiếp tại đây bằng chuột hoặc màn hình cảm ứng
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-[#0B0F17] rounded-xl text-center">
                          {selectedBooking.eSignatureUrl ? (
                            <img
                              src={selectedBooking.eSignatureUrl}
                              alt="Chữ ký khách hàng"
                              className="max-h-24 mx-auto object-contain filter invert"
                            />
                          ) : (
                            <span className="text-xs text-slate-500">Chưa ghi nhận chữ ký điện tử</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Complete Check-in Button */}
                    {selectedBooking.status === 'Confirmed' ? (
                      <button
                        type="button"
                        onClick={handleCheckinSubmit}
                        disabled={submitting}
                        className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold rounded-xl text-xs shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        {submitting ? (
                          <span>Đang thực hiện Check-in...</span>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Hoàn tất Check-in & Bàn giao chìa khóa</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-center text-xs text-slate-400 font-medium">
                        Đơn hàng hiện ở trạng thái: <strong className="text-white">{selectedBooking.status}</strong> (Chỉ thực hiện Check-in khi trạng thái là Confirmed).
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Check-out Process */}
                {activeTab === 'checkout' && (
                  <div className="p-6 space-y-5">
                    {/* End Odometer */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
                        <Gauge className="w-4 h-4 text-orange-400 mr-1.5" />
                        Chỉ số ODO công-tơ-mét khi thu hồi xe
                      </label>
                      <input
                        type="number"
                        min={selectedBooking.startOdometer || 0}
                        value={endOdo}
                        onChange={(e) => setEndOdo(Number(e.target.value))}
                        disabled={selectedBooking.status !== 'Ongoing'}
                        className="w-full bg-[#0B0F17] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500 disabled:opacity-50"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Quãng đường khách đã di chuyển trong chuyến: ~{Math.max(0, endOdo - (selectedBooking.startOdometer || 0))} km
                      </p>
                    </div>

                    {/* Damage & Additional fee input */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
                          <DollarSign className="w-3.5 h-3.5 text-orange-400 mr-1" />
                          Phụ phí phát sinh (xăng / trầy xước)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="10000"
                          value={damageFee}
                          onChange={(e) => setDamageFee(Number(e.target.value))}
                          disabled={selectedBooking.status !== 'Ongoing'}
                          className="w-full bg-[#0B0F17] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">0 đ nếu phương tiện nguyên vẹn</p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
                          <Clock className="w-3.5 h-3.5 text-orange-400 mr-1" />
                          Ghi chú tình trạng xe lúc thu hồi
                        </label>
                        <input
                          type="text"
                          placeholder="VD: Xe nguyên vẹn, đầy bình xăng..."
                          value={returnNotes}
                          onChange={(e) => setReturnNotes(e.target.value)}
                          disabled={selectedBooking.status !== 'Ongoing'}
                          className="w-full bg-[#0B0F17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 disabled:opacity-50"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Ghi chú lưu biên bản tất toán</p>
                      </div>
                    </div>

                    {/* Settlement Summary Box */}
                    <div className="p-4 bg-[#111827] rounded-2xl border border-orange-500/20 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>Tiền thuê còn lại (70%):</span>
                        <span className="font-bold text-white">
                          {selectedBooking.remainingAmount?.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Phụ thu trễ hẹn (Server tính 30.000đ/giờ trễ):</span>
                        <span className="font-bold text-amber-400">
                          {selectedBooking.lateFee ? `${selectedBooking.lateFee.toLocaleString('vi-VN')} đ` : 'Tự động tính theo giờ trả'}
                        </span>
                      </div>
                      {damageFee > 0 && (
                        <div className="flex justify-between text-amber-400">
                          <span>Phụ phí phát sinh:</span>
                          <span className="font-bold">{damageFee.toLocaleString('vi-VN')} đ</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-white/10 flex justify-between items-baseline text-sm">
                        <span className="font-bold text-white uppercase text-xs">
                          Tổng số tiền khách thanh toán tại quầy:
                        </span>
                        <span className="text-lg font-black text-orange-400">
                          {((selectedBooking.remainingAmount || 0) + (selectedBooking.lateFee || 0) + damageFee).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>

                    {/* Complete Checkout Button */}
                    {selectedBooking.status === 'Ongoing' ? (
                      <button
                        type="button"
                        onClick={handleCheckoutSubmit}
                        disabled={submitting}
                        className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold rounded-xl text-xs shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        {submitting ? (
                          <span>Đang thực hiện Check-out...</span>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Xác nhận thu hồi xe & Hoàn tất tất toán hợp đồng</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-center text-xs text-slate-400 font-medium">
                        Đơn hàng hiện ở trạng thái: <strong className="text-white">{selectedBooking.status}</strong> (Chỉ thực hiện Check-out khi trạng thái là Ongoing).
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#111827] rounded-2xl border border-white/10 p-12 text-center text-xs text-slate-400">
                Vui lòng chọn một đơn từ danh sách bên trái để tiến hành quy trình Check-in hoặc Check-out.
              </div>
            )}
          </div>
        </div>

        ) : (
          /* eKYC Dedicated Station */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col (4 cols): Queue of pending eKYC users */}
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-[#111827] rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-orange-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Hồ sơ chờ đối soát ({pendingEkycList.length})
                    </h3>
                  </div>
                  <button
                    onClick={fetchPendingEkyc}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Làm mới hàng đợi"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${ekycLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                  {ekycLoading && pendingEkycList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-orange-400 mb-2" />
                      Đang tải danh sách chờ duyệt...
                    </div>
                  ) : pendingEkycList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-orange-400 mx-auto" />
                      <p className="font-semibold text-white">Tuyệt vời!</p>
                      <p className="text-[11px] text-slate-500">
                        Hiện không có hồ sơ eKYC nào đang chờ duyệt tại 2 chi nhánh.
                      </p>
                    </div>
                  ) : (
                    pendingEkycList.map((customer) => {
                      const isSelected = selectedEkycUser?._id === customer._id;
                      const displayName = customer.firstName ? `${customer.firstName} ${customer.lastName || ''}`.trim() : customer.username;
                      const customerAvatar = getUserAvatarUrl(customer.avatarUrl);
                      return (
                        <div
                          key={customer._id}
                          onClick={() => setSelectedEkycUser(customer)}
                          className={`p-4 cursor-pointer transition-all flex items-start space-x-3 ${
                            isSelected
                              ? 'bg-orange-500/10 border-l-4 border-orange-400 pl-3'
                              : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-orange-950 border border-orange-500/30 flex-shrink-0 flex items-center justify-center font-bold text-orange-300 text-xs">
                            {customerAvatar ? (
                              <img
                                src={customerAvatar}
                                alt={displayName}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              (customer.firstName || customer.username || 'U').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs truncate">
                                {displayName}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                Chờ duyệt
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {customer.phoneNumber || customer.email || `@${customer.username}`}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                              <span>Gửi: {new Date(customer.updatedAt || customer.createdAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="text-orange-400 font-medium">NĐ 13/2023</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Col (8 cols): Document viewer and decision controls */}
            <div className="lg:col-span-8">
              {selectedEkycUser ? (
                <div className="bg-[#111827] rounded-2xl border border-white/10 p-6 space-y-6">
                  {/* Customer Banner Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-white/10 gap-3">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-orange-950 border border-orange-500/30 flex items-center justify-center font-bold text-orange-300 text-lg flex-shrink-0 shadow-md">
                        {getUserAvatarUrl(selectedEkycUser.avatarUrl) ? (
                          <img
                            src={getUserAvatarUrl(selectedEkycUser.avatarUrl)!}
                            alt={selectedEkycUser.firstName || selectedEkycUser.username}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          (selectedEkycUser.firstName || selectedEkycUser.username || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">
                          {selectedEkycUser.firstName ? `${selectedEkycUser.firstName} ${selectedEkycUser.lastName || ''}`.trim() : selectedEkycUser.username}
                        </h2>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
                          <span>@{selectedEkycUser.username}</span>
                          <span>•</span>
                          <span>{selectedEkycUser.phoneNumber || 'Chưa cập nhật SĐT'}</span>
                          <span>•</span>
                          <span>{selectedEkycUser.email || 'Email chưa cung cấp'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs self-start sm:self-auto">
                      <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                      <span>Đã xác nhận NĐ 13/2023/NĐ-CP</span>
                    </div>
                  </div>

                  {/* 3 Documents Grid */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                      Tài liệu định danh tải lên (Đã đóng dấu chống mạo danh)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Doc 1: CCCD Front */}
                      <div className="p-3 bg-white/[0.02] rounded-xl border border-white/10 flex flex-col justify-between">
                        <span className="text-xs font-semibold text-slate-300 mb-2">1. Mặt trước CCCD</span>
                        <div className="w-full h-36 bg-[#0B0F17] rounded-lg overflow-hidden relative group border border-white/10 flex items-center justify-center">
                          <img
                            src={formatAdminDocUrl(selectedEkycUser._id, 'idCardFront')}
                            alt="CCCD Front"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              if (target.parentElement) {
                                target.parentElement.innerHTML = '<span class="text-xs text-slate-500">Chưa có ảnh</span>';
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewDocModal({
                              title: 'Mặt trước Căn cước công dân',
                              url: formatAdminDocUrl(selectedEkycUser._id, 'idCardFront')
                            })}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1.5 text-xs font-bold text-white"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Phóng to</span>
                          </button>
                        </div>
                      </div>

                      {/* Doc 2: CCCD Back */}
                      <div className="p-3 bg-white/[0.02] rounded-xl border border-white/10 flex flex-col justify-between">
                        <span className="text-xs font-semibold text-slate-300 mb-2">2. Mặt sau CCCD</span>
                        <div className="w-full h-36 bg-[#0B0F17] rounded-lg overflow-hidden relative group border border-white/10 flex items-center justify-center">
                          <img
                            src={formatAdminDocUrl(selectedEkycUser._id, 'idCardBack')}
                            alt="CCCD Back"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              if (target.parentElement) {
                                target.parentElement.innerHTML = '<span class="text-xs text-slate-500">Chưa có ảnh</span>';
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewDocModal({
                              title: 'Mặt sau Căn cước công dân',
                              url: formatAdminDocUrl(selectedEkycUser._id, 'idCardBack')
                            })}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1.5 text-xs font-bold text-white"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Phóng to</span>
                          </button>
                        </div>
                      </div>

                      {/* Doc 3: Driving License */}
                      <div className="p-3 bg-white/[0.02] rounded-xl border border-white/10 flex flex-col justify-between">
                        <span className="text-xs font-semibold text-slate-300 mb-2">3. Giấy phép lái xe</span>
                        <div className="w-full h-36 bg-[#0B0F17] rounded-lg overflow-hidden relative group border border-white/10 flex items-center justify-center">
                          <img
                            src={formatAdminDocUrl(selectedEkycUser._id, 'drivingLicense')}
                            alt="Driving License"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              if (target.parentElement) {
                                target.parentElement.innerHTML = '<span class="text-xs text-slate-500">Chưa có ảnh</span>';
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewDocModal({
                              title: 'Giấy phép lái xe (GPLX)',
                              url: formatAdminDocUrl(selectedEkycUser._id, 'drivingLicense')
                            })}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1.5 text-xs font-bold text-white"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Phóng to</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Decision Actions Bar */}
                  <div className="pt-5 border-t border-white/10 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Ghi chú đối soát (Tùy chọn khi duyệt, bắt buộc nếu từ chối):
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Ảnh CCCD mặt sau bị mờ góc mã QR, đề nghị khách chụp lại..."
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        className="w-full bg-[#0B0F17] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                      <button
                        type="button"
                        disabled={reviewLoading}
                        onClick={() => handleReviewEkyc('Rejected')}
                        className="w-full sm:w-auto px-5 py-2.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 hover:text-red-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Từ chối & Yêu cầu chụp lại</span>
                      </button>

                      <button
                        type="button"
                        disabled={reviewLoading}
                        onClick={() => handleReviewEkyc('Verified')}
                        className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                      >
                        {reviewLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Đang xử lý...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Phê duyệt eKYC hợp lệ (Verified)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#111827] rounded-2xl border border-white/10 p-12 text-center text-xs text-slate-400">
                  Vui lòng chọn một hồ sơ khách hàng từ danh sách bên trái để đối soát.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal preview high-res doc */}
        {previewDocModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-white/15 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <span className="font-bold text-sm text-white">{previewDocModal.title}</span>
                <button
                  type="button"
                  onClick={() => setPreviewDocModal(null)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 bg-[#0B0F17] flex items-center justify-center max-h-[75vh] overflow-auto">
                <img
                  src={previewDocModal.url}
                  alt={previewDocModal.title}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

