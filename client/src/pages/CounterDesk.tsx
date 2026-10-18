import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Calendar,
  MessageSquare,
  Database,
  CreditCard,
  Wallet,
  Banknote,
  Receipt,
  Camera,
  UploadCloud
} from 'lucide-react';
import axios from 'axios';
import type { Booking, Vehicle, User } from '../types';
import { api } from '../services/api';
import { getUserAvatarUrl, getOptimizedVehicleImageUrl } from '../utils/imageHelper';
import { watermarkImageFromUrl } from '../utils/watermark';
import { StaffChatConsole } from '../components/StaffChatConsole';
import { AuditLogViewer } from '../components/AuditLogViewer';

type ChecklistKey = 'tires' | 'brakes' | 'lights' | 'fuel' | 'helmets';
type MainDeskMode = 'bookings' | 'ekyc' | 'chat' | 'audit';

const VEHICLE_FOUR_ANGLES = [
  {
    index: 0,
    code: 'GÓC 01',
    title: 'Mặt trước & Đèn pha',
    desc: 'Kiểm tra mặt nạ trước, cụm đèn pha, phuộc trước & chắn bùn',
  },
  {
    index: 1,
    code: 'GÓC 02',
    title: 'Thân xe bên trái',
    desc: 'Kiểm tra dàn áo trái, tay phanh trái, lốc máy & gác chân',
  },
  {
    index: 2,
    code: 'GÓC 03',
    title: 'Thân xe bên phải',
    desc: 'Kiểm tra dàn áo phải, ống xả (pô xe), tay ga & phanh trước',
  },
  {
    index: 3,
    code: 'GÓC 04',
    title: 'Đuôi xe, Biển số & ODO',
    desc: 'Kiểm tra biển số, cụm đèn hậu, lốp sau & mặt đồng hồ ODO',
  },
] as const;

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
  selfieUrl?: string;
  drivingLicenseUrl?: string;
  ekycConsentAgreed?: boolean;
  ekycConsentDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const CounterDesk: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = (searchParams.get('mode') || searchParams.get('tab') || 'bookings') as MainDeskMode;
  const initialMode: MainDeskMode = ['bookings', 'ekyc', 'chat', 'audit'].includes(modeParam)
    ? modeParam
    : 'bookings';

  const [deskMode, setDeskMode] = useState<MainDeskMode>(initialMode);
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
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [previewRotation, setPreviewRotation] = useState<number>(0);

  const openPreviewDoc = (title: string, url: string) => {
    setPreviewZoom(1);
    setPreviewRotation(0);
    setPreviewDocModal({ title, url });
  };

  // Check-in form states
  const [startOdo, setStartOdo] = useState<number>(0);
  const [checklist, setChecklist] = useState<Record<ChecklistKey, boolean>>({
    tires: true,
    brakes: true,
    lights: true,
    fuel: true,
    helmets: true,
  });
  const [checkinPhotos, setCheckinPhotos] = useState<string[]>(['', '', '', '']);
  const [signatureData, setSignatureData] = useState<string>('');

  // Check-out form states
  const [endOdo, setEndOdo] = useState<number>(0);
  const [damageFee, setDamageFee] = useState<number>(0);
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [checkoutPhotos, setCheckoutPhotos] = useState<string[]>(['', '', '', '']);
  const [uploadingAngle, setUploadingAngle] = useState<string | null>(null);

  // Canvas ref for digital signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef<boolean>(false);

  // Counter Payment modal states (UC-31)
  const [showCounterPayModal, setShowCounterPayModal] = useState<boolean>(false);
  const [counterPayAmount, setCounterPayAmount] = useState<number>(0);
  const [counterPayMethod, setCounterPayMethod] = useState<'Cash' | 'POS' | 'DirectBank'>('Cash');
  const [counterPayNotes, setCounterPayNotes] = useState<string>('');
  const [counterPaySubmitting, setCounterPaySubmitting] = useState<boolean>(false);

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

  const formatAdminDocUrl = (userId: string, docType: string) => {
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') as string;
    const token = localStorage.getItem('motorent_token') || localStorage.getItem('token') || '';
    return `${apiBase}/auth/ekyc/document/view/${userId}/${docType}?token=${encodeURIComponent(token)}`;
  };

  const handleReviewEkyc = async (status: 'Verified' | 'Rejected') => {
    if (!selectedEkycUser) return;
    setReviewLoading(true);
    setStatusMessage(null);
    try {
      let res;
      if (status === 'Verified') {
        // Stage 2: Automatically seal Front & Back CCCD with security watermark while keeping Portrait Selfie clean
        const [sealedFront, sealedBack] = await Promise.all([
          watermarkImageFromUrl(
            formatAdminDocUrl(selectedEkycUser._id, 'idCardFront'),
            'cccd_front_watermarked.webp',
            { rentalService: 'MOTORENT VIỆT NAM' }
          ),
          watermarkImageFromUrl(
            formatAdminDocUrl(selectedEkycUser._id, 'idCardBack'),
            'cccd_back_watermarked.webp',
            { rentalService: 'MOTORENT VIỆT NAM' }
          ),
        ]);

        const formData = new FormData();
        formData.append('status', 'Verified');
        if (rejectNote.trim()) formData.append('note', rejectNote.trim());
        if (sealedFront) formData.append('idCardFront', sealedFront);
        if (sealedBack) formData.append('idCardBack', sealedBack);

        res = await api.put(`/auth/ekyc/review/${selectedEkycUser._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.put(`/auth/ekyc/review/${selectedEkycUser._id}`, {
          status,
          note: rejectNote.trim() || undefined,
        });
      }

      if (res.data?.success) {
        setStatusMessage({
          type: 'success',
          text: status === 'Verified' 
            ? `Đã phê duyệt eKYC cho ${selectedEkycUser.firstName || selectedEkycUser.username}! 2 mặt CCCD đã tự động chuyển sang dạng đóng dấu bảo mật, ảnh chân dung được giữ nguyên để đối chiếu nhận xe.`
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

  useEffect(() => {
    fetchBookings();
    fetchPendingEkyc();
  }, []);

  useEffect(() => {
    const m = (searchParams.get('mode') || searchParams.get('tab')) as MainDeskMode | null;
    if (m && ['bookings', 'ekyc', 'chat', 'audit'].includes(m)) {
      setDeskMode(m);
    }
  }, [searchParams]);

  const switchDeskMode = (mode: MainDeskMode) => {
    setDeskMode(mode);
    setSearchParams({ mode });
  };

  const getDefaultFourAnglesFromVehicle = (b: Booking): string[] => {
    const v = typeof b.vehicleId === 'object' && b.vehicleId !== null ? (b.vehicleId as Vehicle) : null;
    const rawImgs = v?.images || [];
    const img0 = getOptimizedVehicleImageUrl(rawImgs[0] || rawImgs[1]);
    const img1 = getOptimizedVehicleImageUrl(rawImgs[1] || rawImgs[0]);
    const img2 = getOptimizedVehicleImageUrl(rawImgs[2] || rawImgs[1] || rawImgs[0]);
    const img3 = getOptimizedVehicleImageUrl(rawImgs[0] || rawImgs[2] || rawImgs[1]);
    return [img0, img1, img2, img3];
  };

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

    const existingCheckin = Array.isArray(b.checkinImages) ? b.checkinImages : [];
    setCheckinPhotos([
      existingCheckin[0] || '',
      existingCheckin[1] || '',
      existingCheckin[2] || '',
      existingCheckin[3] || '',
    ]);

    const existingCheckout = Array.isArray(b.checkoutImages) ? b.checkoutImages : [];
    setCheckoutPhotos([
      existingCheckout[0] || '',
      existingCheckout[1] || '',
      existingCheckout[2] || '',
      existingCheckout[3] || '',
    ]);

    if (b.status === 'Ongoing') {
      setActiveTab('checkout');
    } else {
      setActiveTab('checkin');
    }
  };

  // Compress and stamp uploaded angle photo with timestamp & angle code
  const handleAnglePhotoUpload = async (
    phase: 'checkin' | 'checkout',
    index: number,
    file: File
  ) => {
    const slotKey = `${phase}_${index}`;
    setUploadingAngle(slotKey);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 960;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(String(reader.result));
              return;
            }
            ctx.drawImage(img, 0, 0, w, h);

            // Draw timestamp inspection bar at bottom
            const barH = Math.max(28, Math.round(h * 0.065));
            ctx.fillStyle = 'rgba(16, 16, 16, 0.82)';
            ctx.fillRect(0, h - barH, w, barH);
            ctx.fillStyle = '#FFC799';
            ctx.font = `bold ${Math.max(11, Math.round(barH * 0.45))}px monospace`;
            const angleMeta = VEHICLE_FOUR_ANGLES[index];
            const stampText = `MOTORENT ${phase === 'checkin' ? 'GIAO XE (CHECK-IN)' : 'NHẬN LẠI XE (CHECK-OUT)'} • ${angleMeta.code}: ${angleMeta.title.toUpperCase()} • ${new Date().toLocaleString('vi-VN')}`;
            ctx.fillText(stampText, 12, h - Math.round(barH * 0.3));

            resolve(canvas.toDataURL('image/jpeg', 0.82));
          };
          img.onerror = reject;
          img.src = String(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (phase === 'checkin') {
        setCheckinPhotos((prev) => {
          const next = [...prev];
          next[index] = dataUrl;
          return next;
        });
      } else {
        setCheckoutPhotos((prev) => {
          const next = [...prev];
          next[index] = dataUrl;
          return next;
        });
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Không thể xử lý tệp hình ảnh góc xe. Vui lòng chọn ảnh JPEG/PNG/WebP hợp lệ.',
      });
    } finally {
      setUploadingAngle(null);
    }
  };

  const handleQuickFillCheckinAngles = () => {
    if (!selectedBooking) return;
    setCheckinPhotos(getDefaultFourAnglesFromVehicle(selectedBooking));
  };

  const handleQuickFillCheckoutAngles = () => {
    if (!selectedBooking) return;
    const base =
      checkinPhotos.filter(Boolean).length === 4
        ? [...checkinPhotos]
        : getDefaultFourAnglesFromVehicle(selectedBooking);
    setCheckoutPhotos(base);
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
    ctx.strokeStyle = '#99FFE4';
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

    if (checkinPhotos.filter(Boolean).length < 4) {
      setStatusMessage({
        type: 'error',
        text: 'Vui lòng chụp/tải đủ 4 góc xe (Mặt trước, Thân trái, Thân phải, Đuôi xe & ODO) trước khi bàn giao.',
      });
      return;
    }

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
        checkinImages: checkinPhotos.filter(Boolean),
        eSignatureUrl: signatureData,
      });

      if (res.data?.data) {
        setStatusMessage({
          type: 'success',
          text: `Check-in thành công cho đơn ${selectedBooking.bookingCode}! Đã lưu biên bản 4 góc xe và chuyển sang trạng thái Đang lưu hành.`,
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

    if (checkoutPhotos.filter(Boolean).length < 4) {
      setStatusMessage({
        type: 'error',
        text: 'Vui lòng chụp/tải đủ 4 góc xe khi thu hồi để đối chiếu tình trạng phương tiện trước khi tất toán.',
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
        checkoutImages: checkoutPhotos.filter(Boolean),
      });

      if (res.data?.data) {
        const updated = res.data.data;
        const totalPaid =
          typeof updated.settlementAmount === 'number'
            ? updated.settlementAmount
            : (updated.remainingAmount || 0) + (updated.lateFee || 0) + (updated.damageFee || 0);
        setStatusMessage({
          type: 'success',
          text: `Check-out thành công cho đơn ${selectedBooking.bookingCode}! Tổng tiền khách thanh toán tại quầy: ${totalPaid.toLocaleString('vi-VN')} đ (Đã gồm trễ hẹn: ${(updated.lateFee || 0).toLocaleString('vi-VN')} đ, phụ phí: ${(updated.damageFee || 0).toLocaleString('vi-VN')} đ). Phương tiện đã sẵn sàng khai thác.`,
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

  const openCounterPayModal = () => {
    if (!selectedBooking) return;
    const remaining = selectedBooking.remainingAmount || 0;
    setCounterPayAmount(remaining);
    setCounterPayMethod('Cash');
    setCounterPayNotes('');
    setShowCounterPayModal(true);
  };

  const handleCounterPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    if (counterPayAmount <= 0) {
      setStatusMessage({ type: 'error', text: 'Số tiền thu phải lớn hơn 0 VNĐ.' });
      return;
    }
    if (counterPayAmount > (selectedBooking.remainingAmount || 0)) {
      setStatusMessage({
        type: 'error',
        text: `Số tiền thu (${counterPayAmount.toLocaleString('vi-VN')} đ) vượt quá số dư còn lại (${(selectedBooking.remainingAmount || 0).toLocaleString('vi-VN')} đ).`,
      });
      return;
    }
    setCounterPaySubmitting(true);
    setStatusMessage(null);
    try {
      const methodLabel = counterPayMethod === 'POS' ? '[Quẹt thẻ POS]' : counterPayMethod === 'DirectBank' ? '[Chuyển khoản quầy]' : '[Tiền mặt]';
      const notes = [methodLabel, counterPayNotes.trim()].filter(Boolean).join(' - ');
      const res = await api.put(`/bookings/${selectedBooking._id}/counter-pay`, {
        amount: counterPayAmount,
        notes,
      });
      if (res.data?.success && res.data?.data) {
        const updated = res.data.data;
        setStatusMessage({
          type: 'success',
          text: `Ghi nhận thu tiền tại quầy thành công cho đơn ${selectedBooking.bookingCode}: +${counterPayAmount.toLocaleString('vi-VN')} đ! Số dư còn lại: ${(updated.remainingAmount || 0).toLocaleString('vi-VN')} đ.`,
        });
        handleSelectBooking(updated);
        setShowCounterPayModal(false);
        fetchBookings();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setStatusMessage({
          type: 'error',
          text: err.response?.data?.message || 'Không thể ghi nhận thanh toán tại quầy.',
        });
      }
    } finally {
      setCounterPaySubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] pt-28 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#99FFE4] animate-pulse"></span>
              <span className="text-xs font-semibold tracking-wider text-[#FFC799]">
                Phân hệ Quản lý Vận hành Chi nhánh
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
              Bàn giao nhận xe tại quầy (Counter Desk)
            </h1>
            <p className="text-xs text-[#A0A0A0] mt-1">
              Xử lý quy trình Check-in giao xe eKYC và Check-out thu hồi xe, đối soát ODO và tất toán 70% còn lại.
            </p>

            {/* Mode Switcher */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => switchDeskMode('bookings')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  deskMode === 'bookings'
                    ? 'bg-[#FFC799] text-[#101010] font-black shadow-md'
                    : 'bg-[#161616] text-[#A0A0A0] hover:text-white border border-white/10'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                <span>01. Bàn giao nhận xe ({bookings.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchDeskMode('ekyc');
                  fetchPendingEkyc();
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  deskMode === 'ekyc'
                    ? 'bg-[#FFC799] text-[#101010] font-black shadow-md'
                    : 'bg-[#161616] text-[#A0A0A0] hover:text-white border border-white/10'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>02. Đối soát & Duyệt eKYC</span>
                {pendingEkycList.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#99FFE4] text-[#101010] font-black text-[10px]">
                    {pendingEkycList.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => switchDeskMode('chat')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  deskMode === 'chat'
                    ? 'bg-[#FFC799] text-[#101010] font-black shadow-md'
                    : 'bg-[#161616] text-[#A0A0A0] hover:text-white border border-white/10'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>03. Tổng đài Live Chat (UC-66)</span>
              </button>

              <button
                type="button"
                onClick={() => switchDeskMode('audit')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  deskMode === 'audit'
                    ? 'bg-[#FFC799] text-[#101010] font-black shadow-md'
                    : 'bg-[#161616] text-[#A0A0A0] hover:text-white border border-white/10'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>04. Nhật ký Audit (UC-102)</span>
              </button>
            </div>
          </div>

          {(deskMode === 'bookings' || deskMode === 'ekyc') && (
            <button
              onClick={() => {
                if (deskMode === 'bookings') fetchBookings();
                else fetchPendingEkyc();
              }}
              disabled={loading || ekycLoading}
              className="self-start md:self-auto inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#A0A0A0] bg-[#161616] border border-white/10 hover:border-[#FFC799]/40 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#A0A0A0] ${loading || ekycLoading ? 'animate-spin' : ''}`} />
              <span>{deskMode === 'bookings' ? 'Đồng bộ đơn chi nhánh' : 'Làm mới hàng đợi eKYC'}</span>
            </button>
          )}
        </div>

        {/* Global Alert / Toast Notification */}
        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-xs flex items-start space-x-3 transition-all ${
              statusMessage.type === 'success'
                ? 'bg-[#FFC799]/10 border-[#FFC799]/30 text-[#FFC799]'
                : 'bg-[#FF8080]/12 border-[#FF8080]/30 text-[#FF8080]'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#FFC799] mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#FF8080] mt-0.5" />
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
            <form onSubmit={handleSearch} className="bg-[#161616] p-4 rounded-2xl border border-white/10">
              <label className="block text-xs font-semibold text-[#A0A0A0] mb-1.5">
                Tra cứu mã đặt xe (Booking Code)
              </label>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[#6E6E6E] absolute left-3" />
                <input
                  type="text"
                  placeholder="Nhập mã đơn, VD: MV-892101..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="w-full pl-9 pr-24 py-2.5 bg-[#101010] border border-white/10 rounded-xl text-xs font-medium text-white placeholder:text-[#6E6E6E] outline-none focus:border-[#FFC799]"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 px-3 py-1.5 bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] rounded-lg text-xs font-bold hover:bg-[#FFD6B3] transition-colors"
                >
                  Tra cứu
                </button>
              </div>
            </form>

            {/* Bookings Queue */}
            <div className="bg-[#161616] rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">
                  Hàng đợi chi nhánh ({bookings.length})
                </h3>
                <span className="text-[11px] font-semibold text-[#FFC799] bg-[#FFC799]/10 border border-[#FFC799]/20 px-2 py-0.5 rounded">
                  Hôm nay
                </span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs text-[#6E6E6E]">
                  Đang tải danh sách đơn đặt xe...
                </div>
              ) : bookings.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6E6E6E]">
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
                            ? 'bg-[#FFC799]/10 border-l-4 border-[#FFC799]'
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
                                ? 'bg-[#FFC799]/12 text-[#FFC799] border border-[#FFC799]/30'
                                : b.status === 'Ongoing'
                                ? 'bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30'
                                : b.status === 'Completed'
                                ? 'bg-[#1E1E1E] text-[#A0A0A0] border border-white/10'
                                : 'bg-[#1E1E1E] text-[#A0A0A0] border border-white/10'
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

                        <p className="text-xs font-bold text-[#F5F5F5] truncate">
                          {bikeName}
                        </p>
                        <p className="text-[11px] text-[#A0A0A0] truncate mt-0.5 flex items-center justify-between">
                          <span>Khách: {userName}</span>
                          <span className="font-semibold text-[#FFC799]">
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
              <div className="bg-[#161616] rounded-2xl border border-white/10 overflow-hidden">
                {/* Terminal Header */}
                <div className="bg-[#101010]/80 p-5 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#FFC799]">
                        Chi tiết hồ sơ giao nhận
                      </span>
                      <h2 className="text-xl font-bold text-white mt-0.5">
                        Mã đơn: <span className="font-mono">{selectedBooking.bookingCode}</span>
                      </h2>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#A0A0A0] block">Đã cọc online 30%</span>
                      <span className="text-sm font-bold text-[#FFC799]">
                        {selectedBooking.depositAmount?.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>

                  {/* Quick details chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
                    <div>
                      <span className="text-[#A0A0A0] block text-[10px]">Phương tiện:</span>
                      <span className="font-medium text-[#F5F5F5] truncate block">
                        {typeof selectedBooking.vehicleId === 'object' && selectedBooking.vehicleId !== null
                          ? (selectedBooking.vehicleId as Vehicle).vehicleModel
                          : 'Xe Motorent'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#A0A0A0] block text-[10px]">Khách hàng:</span>
                      <span className="font-medium text-[#F5F5F5] truncate block">
                        {typeof selectedBooking.userId === 'object' && selectedBooking.userId !== null
                          ? (selectedBooking.userId as User).firstName || (selectedBooking.userId as User).username
                          : 'Khách thuê'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#A0A0A0] block text-[10px]">Ngày nhận:</span>
                      <span className="font-medium text-[#F5F5F5] truncate block">
                        {new Date(selectedBooking.pickupDateTime).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#A0A0A0] block text-[10px]">Ngày hẹn trả:</span>
                      <span className="font-medium text-[#F5F5F5] truncate block">
                        {new Date(selectedBooking.returnDateTime).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  {/* Financial & Counter Payment (UC-31) Status Card */}
                  <div className="mt-4 p-3.5 bg-[#101010] border border-white/10 rounded-xl">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center space-x-6 text-xs">
                        <div>
                          <span className="text-[#A0A0A0] block text-[10px] uppercase font-bold">Tổng tiền đơn</span>
                          <span className="font-bold text-white text-sm">
                            {selectedBooking.totalAmount?.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        <div>
                          <span className="text-[#A0A0A0] block text-[10px] uppercase font-bold">Đã thanh toán</span>
                          <span className="font-bold text-[#99FFE4] text-sm">
                            {(selectedBooking.paidAmount || selectedBooking.depositAmount || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        <div>
                          <span className="text-[#A0A0A0] block text-[10px] uppercase font-bold">Còn lại phải thu</span>
                          <span className={`font-bold text-sm ${
                            selectedBooking.isPaid || (selectedBooking.remainingAmount || 0) <= 0
                              ? 'text-[#99FFE4]'
                              : 'text-[#FF8080]'
                          }`}>
                            {(selectedBooking.remainingAmount || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {selectedBooking.isPaid || (selectedBooking.remainingAmount || 0) <= 0 ? (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-[#99FFE4]/10 text-[#99FFE4] border border-[#99FFE4]/30">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Đã tất toán 100%
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={openCounterPayModal}
                            className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] shadow-sm hover:shadow-md transition-all cursor-pointer"
                          >
                            <Wallet className="w-3.5 h-3.5 mr-1.5" />
                            <span>Thu tiền tại quầy ({(selectedBooking.remainingAmount || 0).toLocaleString('vi-VN')} đ)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workflow Mode Tabs */}
                <div className="flex border-b border-white/10">
                  <button
                    onClick={() => setActiveTab('checkin')}
                    className={`flex-1 py-3.5 text-xs font-bold text-center border-b-2 transition-all ${
                      activeTab === 'checkin'
                        ? 'border-[#FFC799] text-[#FFC799] bg-[#FFC799]/10'
                        : 'border-transparent text-[#A0A0A0] hover:text-[#F5F5F5]'
                    }`}
                  >
                    1. Check-in Bàn giao xe ({selectedBooking.status === 'Confirmed' || selectedBooking.status === 'Approved' ? 'Sẵn sàng' : selectedBooking.status})
                  </button>
                  <button
                    onClick={() => setActiveTab('checkout')}
                    className={`flex-1 py-3.5 text-xs font-bold text-center border-b-2 transition-all ${
                      activeTab === 'checkout'
                        ? 'border-[#FFC799] text-[#FFC799] bg-[#FFC799]/10'
                        : 'border-transparent text-[#A0A0A0] hover:text-[#F5F5F5]'
                    }`}
                  >
                    2. Check-out Thu hồi xe & Tất toán ({selectedBooking.status === 'Ongoing' ? 'Đang thực hiện' : ''})
                  </button>
                </div>

                {/* Tab 1: Check-in Process */}
                {activeTab === 'checkin' && (
                  <div className="p-6 space-y-5">
                    {/* Unpaid 70% Alert Banner */}
                    {!selectedBooking.isPaid && (selectedBooking.remainingAmount || 0) > 0 && (
                      <div className="p-3.5 rounded-xl bg-[#FFC799]/10 border border-[#FFC799]/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center space-x-2.5 text-[#FFC799]">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>
                            Khách hàng chưa thanh toán 70% còn lại (<strong>{(selectedBooking.remainingAmount || 0).toLocaleString('vi-VN')} đ</strong>).
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={openCounterPayModal}
                          className="px-3 py-1 bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] font-bold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Thu tiền ngay
                        </button>
                      </div>
                    )}
                    {/* Odometer Input */}
                    <div>
                      <label className="block text-xs font-semibold text-[#A0A0A0] mb-1 flex items-center">
                        <Gauge className="w-4 h-4 text-[#FFC799] mr-1.5" />
                        Ghi nhận chỉ số ODO công-tơ-mét khi giao
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={startOdo}
                        onChange={(e) => setStartOdo(Number(e.target.value))}
                        disabled={selectedBooking.status !== 'Confirmed' && selectedBooking.status !== 'Approved'}
                        className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none focus:border-[#FFC799] disabled:opacity-50"
                      />
                      <p className="text-[11px] text-[#A0A0A0] mt-1">
                        Chỉ số ODO làm căn cứ đối chiếu khi khách bàn giao trả xe.
                      </p>
                    </div>

                    {/* 5-point Checklist */}
                    <div>
                      <label className="block text-xs font-semibold text-[#A0A0A0] mb-2 flex items-center">
                        <FileCheck className="w-4 h-4 text-[#FFC799] mr-1.5" />
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
                            className="flex items-center space-x-2 p-2.5 rounded-xl border border-white/10 bg-[#101010] cursor-pointer hover:bg-white/[0.02]"
                          >
                            <input
                              type="checkbox"
                              checked={checklist[item.key]}
                              disabled={selectedBooking.status !== 'Confirmed' && selectedBooking.status !== 'Approved'}
                              onChange={(e) =>
                                setChecklist({ ...checklist, [item.key]: e.target.checked })
                              }
                              className="rounded accent-[#FFC799]"
                            />
                            <span className="text-[#A0A0A0] font-medium">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 4-Angle Vehicle Photo Capture Before Handover (Check-in) */}
                    <div className="p-4 rounded-2xl border border-white/10 bg-[#101010]/90 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div>
                          <label className="text-xs font-bold text-[#F5F5F5] flex items-center">
                            <Camera className="w-4 h-4 text-[#FFC799] mr-1.5 shrink-0" />
                            <span>Chụp 4 góc xe kiểm định trước khi giao (Check-in)</span>
                            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30">
                              {checkinPhotos.filter(Boolean).length}/4 góc
                            </span>
                          </label>
                          <p className="text-[11px] text-[#A0A0A0] mt-0.5">
                            Lưu bằng chứng ngoại thất 4 góc xe trước khi bàn giao để đối chiếu minh bạch khi khách trả xe.
                          </p>
                        </div>
                        {(selectedBooking.status === 'Confirmed' || selectedBooking.status === 'Approved') && (
                          <button
                            type="button"
                            onClick={handleQuickFillCheckinAngles}
                            className="shrink-0 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#FFC799]/15 border border-white/10 hover:border-[#FFC799]/40 text-[11px] font-bold text-[#FFC799] transition-all cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Nạp nhanh 4 góc mẫu</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {VEHICLE_FOUR_ANGLES.map((angle) => {
                          const photoUrl = checkinPhotos[angle.index];
                          const isUploading = uploadingAngle === `checkin_${angle.index}`;
                          const canEdit = selectedBooking.status === 'Confirmed' || selectedBooking.status === 'Approved';

                          return (
                            <div
                              key={angle.code}
                              className={`rounded-xl border p-3 transition-all ${
                                photoUrl
                                  ? 'border-[#99FFE4]/30 bg-[#141414]'
                                  : 'border-white/10 bg-[#141414]/60'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center space-x-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-[#FFC799]/15 text-[#FFC799] font-mono text-[10px] font-extrabold">
                                    {angle.code}
                                  </span>
                                  <span className="text-xs font-bold text-white">{angle.title}</span>
                                </div>
                                {photoUrl ? (
                                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-[#99FFE4]">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Đã lưu</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-[#6E6E6E]">Chưa chụp</span>
                                )}
                              </div>
                              <p className="text-[10px] text-[#A0A0A0] mb-2.5 line-clamp-1">{angle.desc}</p>

                              {photoUrl ? (
                                <div className="relative group aspect-video rounded-lg overflow-hidden border border-white/10 bg-black">
                                  <img
                                    src={photoUrl}
                                    alt={`${angle.code} - ${angle.title}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-2.5 py-1.5 flex items-center justify-between">
                                    <span className="text-[10px] font-mono font-bold text-[#99FFE4]">
                                      TRƯỚC KHI GIAO • {angle.code}
                                    </span>
                                    <div className="flex items-center space-x-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openPreviewDoc(
                                            `Ảnh kiểm định trước khi giao (Check-in) - ${angle.code}: ${angle.title}`,
                                            photoUrl
                                          )
                                        }
                                        className="p-1 rounded bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
                                        title="Phóng to kiểm tra chi tiết"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      {canEdit && (
                                        <label
                                          className="p-1 rounded bg-[#FFC799]/20 hover:bg-[#FFC799]/35 text-[#FFC799] transition-colors cursor-pointer"
                                          title="Chụp hoặc tải ảnh khác"
                                        >
                                          <Camera className="w-3.5 h-3.5" />
                                          <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleAnglePhotoUpload('checkin', angle.index, file);
                                              e.target.value = '';
                                            }}
                                          />
                                        </label>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : canEdit ? (
                                <label className="flex flex-col items-center justify-center aspect-video rounded-lg border border-dashed border-white/15 hover:border-[#FFC799]/50 bg-[#101010] hover:bg-[#FFC799]/[0.03] transition-all cursor-pointer p-3 text-center">
                                  {isUploading ? (
                                    <RefreshCw className="w-5 h-5 text-[#FFC799] animate-spin mb-1.5" />
                                  ) : (
                                    <UploadCloud className="w-5 h-5 text-[#FFC799] mb-1.5" />
                                  )}
                                  <span className="text-[11px] font-bold text-[#F5F5F5]">
                                    {isUploading ? 'Đang đóng dấu thời gian...' : `Chụp / Tải ảnh ${angle.code}`}
                                  </span>
                                  <span className="text-[10px] text-[#6E6E6E] mt-0.5">
                                    Tự động gắn nhãn giờ kiểm định
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    disabled={isUploading}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleAnglePhotoUpload('checkin', angle.index, file);
                                      e.target.value = '';
                                    }}
                                  />
                                </label>
                              ) : (
                                <div className="flex items-center justify-center aspect-video rounded-lg border border-white/5 bg-[#101010] text-[11px] text-[#6E6E6E]">
                                  Chưa có ảnh góc này
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* eKYC Guarantee & Portrait Counter Verification */}
                    <div className="p-3.5 bg-[#FFC799]/10 rounded-xl border border-[#FFC799]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-start space-x-2">
                        <ShieldCheck className="w-4 h-4 text-[#FFC799] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-[#FFC799]">
                            Quy chuẩn Hậu kiểm eKYC Motorent: Không giữ CCCD bản gốc
                          </p>
                          <p className="text-[#FFC799]/80 text-[11px] mt-0.5">
                            Ảnh CCCD đã được đóng dấu bảo mật lưu hồ sơ. Ảnh chân dung thực tế được giữ nguyên bản để đối chiếu khuôn mặt khách đến nhận xe tại quầy.
                          </p>
                        </div>
                      </div>
                      {typeof selectedBooking.userId === 'object' && selectedBooking.userId !== null && (
                        <button
                          type="button"
                          onClick={() =>
                            openPreviewDoc(
                              `Ảnh chân dung đối chiếu khách nhận xe: ${(selectedBooking.userId as User).firstName || (selectedBooking.userId as User).username}`,
                              formatAdminDocUrl((selectedBooking.userId as User)._id, 'selfiePhoto')
                            )
                          }
                          className="shrink-0 inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#FFC799]/20 hover:bg-[#FFC799]/30 border border-[#FFC799]/30 text-[#F5F5F5] font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#FFC799]" />
                          <span>Đối chiếu ảnh chân dung</span>
                        </button>
                      )}
                    </div>

                    {/* Digital Signature Canvas */}
                    <div className="border border-dashed border-white/15 rounded-2xl p-4 bg-[#101010]/60">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-[#A0A0A0] flex items-center">
                          <PenTool className="w-3.5 h-3.5 text-[#FFC799] mr-1" />
                          Chữ ký điện tử của khách hàng
                        </p>
                        {signatureData && (
                          <button
                            type="button"
                            onClick={clearSignature}
                            disabled={selectedBooking.status !== 'Confirmed' && selectedBooking.status !== 'Approved'}
                            className="text-[11px] text-[#FF8080] hover:text-[#FF8080] flex items-center space-x-1 font-semibold"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Xóa ký lại</span>
                          </button>
                        )}
                      </div>

                      {selectedBooking.status === 'Confirmed' || selectedBooking.status === 'Approved' ? (
                        <div className="relative border border-white/10 rounded-xl bg-[#101010] overflow-hidden">
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
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-[#6E6E6E]">
                              Mời khách ký tay trực tiếp tại đây bằng chuột hoặc màn hình cảm ứng
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-[#101010] rounded-xl text-center">
                          {selectedBooking.eSignatureUrl ? (
                            <img
                              src={selectedBooking.eSignatureUrl}
                              alt="Chữ ký khách hàng"
                              className="max-h-24 mx-auto object-contain filter invert"
                            />
                          ) : (
                            <span className="text-xs text-[#6E6E6E]">Chưa ghi nhận chữ ký điện tử</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Complete Check-in Button */}
                    {selectedBooking.status === 'Confirmed' || selectedBooking.status === 'Approved' ? (
                      <button
                        type="button"
                        onClick={handleCheckinSubmit}
                        disabled={submitting}
                        className="w-full py-3.5 bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] font-bold rounded-xl text-xs shadow-lg shadow-black/50 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
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
                      <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-center text-xs text-[#A0A0A0] font-medium">
                        Đơn hàng hiện ở trạng thái: <strong className="text-white">{selectedBooking.status}</strong> (Chỉ thực hiện Check-in khi trạng thái là Confirmed / Approved).
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Check-out Process */}
                {activeTab === 'checkout' && (
                  <div className="p-6 space-y-5">
                    {/* End Odometer */}
                    <div>
                      <label className="block text-xs font-semibold text-[#A0A0A0] mb-1 flex items-center">
                        <Gauge className="w-4 h-4 text-[#FFC799] mr-1.5" />
                        Chỉ số ODO công-tơ-mét khi thu hồi xe
                      </label>
                      <input
                        type="number"
                        min={selectedBooking.startOdometer || 0}
                        value={endOdo}
                        onChange={(e) => setEndOdo(Number(e.target.value))}
                        disabled={selectedBooking.status !== 'Ongoing'}
                        className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none focus:border-[#FFC799] disabled:opacity-50"
                      />
                      <p className="text-[11px] text-[#A0A0A0] mt-1">
                        Quãng đường khách đã di chuyển trong chuyến: ~{Math.max(0, endOdo - (selectedBooking.startOdometer || 0))} km
                      </p>
                    </div>

                    {/* 4-Angle Before & After Inspection Comparison (Check-in vs Check-out) */}
                    <div className="p-4 rounded-2xl border border-white/10 bg-[#101010]/90 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div>
                          <label className="text-xs font-bold text-[#F5F5F5] flex items-center">
                            <Camera className="w-4 h-4 text-[#FFC799] mr-1.5 shrink-0" />
                            <span>Đối chiếu & Chụp 4 góc xe sau khi nhận lại (Check-out)</span>
                            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#99FFE4]/15 text-[#99FFE4] border border-[#99FFE4]/30">
                              {checkoutPhotos.filter(Boolean).length}/4 góc thu hồi
                            </span>
                          </label>
                          <p className="text-[11px] text-[#A0A0A0] mt-0.5">
                            So sánh trực tiếp ảnh 4 góc trước khi giao (trái) và ảnh thực tế khi nhận lại xe (phải) để kiểm định trầy xước.
                          </p>
                        </div>
                        {selectedBooking.status === 'Ongoing' && (
                          <button
                            type="button"
                            onClick={handleQuickFillCheckoutAngles}
                            className="shrink-0 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#99FFE4]/15 border border-white/10 hover:border-[#99FFE4]/40 text-[11px] font-bold text-[#99FFE4] transition-all cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Xác nhận 4 góc nguyên vẹn</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {VEHICLE_FOUR_ANGLES.map((angle) => {
                          const defaultAngles = getDefaultFourAnglesFromVehicle(selectedBooking);
                          const beforeUrl = checkinPhotos[angle.index] || defaultAngles[angle.index];
                          const afterUrl = checkoutPhotos[angle.index];
                          const isUploading = uploadingAngle === `checkout_${angle.index}`;
                          const canEdit = selectedBooking.status === 'Ongoing';

                          return (
                            <div
                              key={angle.code}
                              className={`rounded-xl border p-3 transition-all ${
                                afterUrl
                                  ? 'border-[#99FFE4]/30 bg-[#141414]'
                                  : 'border-white/10 bg-[#141414]/60'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-[#FFC799]/15 text-[#FFC799] font-mono text-[10px] font-extrabold">
                                    {angle.code}
                                  </span>
                                  <span className="text-xs font-bold text-white">{angle.title}</span>
                                </div>
                                {afterUrl ? (
                                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-[#99FFE4]">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Đã đối chiếu</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-[#FFC799]">Chờ chụp thu hồi</span>
                                )}
                              </div>
                              <p className="text-[10px] text-[#A0A0A0] mb-2.5 line-clamp-1">{angle.desc}</p>

                              <div className="grid grid-cols-2 gap-2">
                                {/* Left: Before (Check-in) */}
                                <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black">
                                  <img
                                    src={beforeUrl}
                                    alt={`Trước khi giao ${angle.code}`}
                                    className="w-full h-full object-cover opacity-90"
                                  />
                                  <div className="absolute inset-x-0 top-0 bg-black/70 px-1.5 py-0.5 flex items-center justify-between">
                                    <span className="text-[9px] font-mono font-bold text-[#FFC799]">
                                      TRƯỚC GIAO
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openPreviewDoc(
                                          `Ảnh trước khi giao (Check-in) - ${angle.code}: ${angle.title}`,
                                          beforeUrl
                                        )
                                      }
                                      className="text-white/80 hover:text-white cursor-pointer"
                                      title="Phóng to ảnh lúc giao"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Right: After (Check-out) */}
                                {afterUrl ? (
                                  <div className="relative aspect-video rounded-lg overflow-hidden border border-[#99FFE4]/40 bg-black">
                                    <img
                                      src={afterUrl}
                                      alt={`Sau khi nhận ${angle.code}`}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-x-0 top-0 bg-black/75 px-1.5 py-0.5 flex items-center justify-between">
                                      <span className="text-[9px] font-mono font-bold text-[#99FFE4]">
                                        SAU NHẬN
                                      </span>
                                      <div className="flex items-center space-x-1">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openPreviewDoc(
                                              `Ảnh sau khi nhận lại (Check-out) - ${angle.code}: ${angle.title}`,
                                              afterUrl
                                            )
                                          }
                                          className="text-white/80 hover:text-white cursor-pointer"
                                          title="Phóng to ảnh lúc nhận lại"
                                        >
                                          <Eye className="w-3 h-3" />
                                        </button>
                                        {canEdit && (
                                          <label
                                            className="text-[#FFC799] hover:text-white cursor-pointer"
                                            title="Chụp lại góc này"
                                          >
                                            <Camera className="w-3 h-3" />
                                            <input
                                              type="file"
                                              accept="image/*"
                                              capture="environment"
                                              className="hidden"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleAnglePhotoUpload('checkout', angle.index, file);
                                                e.target.value = '';
                                              }}
                                            />
                                          </label>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : canEdit ? (
                                  <label className="flex flex-col items-center justify-center aspect-video rounded-lg border border-dashed border-white/20 hover:border-[#99FFE4]/50 bg-[#101010] hover:bg-[#99FFE4]/[0.03] transition-all cursor-pointer p-1.5 text-center">
                                    {isUploading ? (
                                      <RefreshCw className="w-4 h-4 text-[#99FFE4] animate-spin mb-1" />
                                    ) : (
                                      <Camera className="w-4 h-4 text-[#99FFE4] mb-1" />
                                    )}
                                    <span className="text-[10px] font-bold text-[#F5F5F5] leading-tight">
                                      {isUploading ? 'Đang lưu...' : 'Chụp sau nhận'}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      className="hidden"
                                      disabled={isUploading}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleAnglePhotoUpload('checkout', angle.index, file);
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                ) : (
                                  <div className="flex items-center justify-center aspect-video rounded-lg border border-white/5 bg-[#101010] text-[10px] text-[#6E6E6E] text-center px-1">
                                    Chưa chụp thu hồi
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Damage & Additional fee input */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#A0A0A0] mb-1 flex items-center">
                          <DollarSign className="w-3.5 h-3.5 text-[#FFC799] mr-1" />
                          Phụ phí phát sinh (xăng / trầy xước)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="10000"
                          value={damageFee}
                          onChange={(e) => setDamageFee(Number(e.target.value))}
                          disabled={selectedBooking.status !== 'Ongoing'}
                          className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        />
                        <p className="text-[10px] text-[#A0A0A0] mt-1">0 đ nếu phương tiện nguyên vẹn</p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#A0A0A0] mb-1 flex items-center">
                          <Clock className="w-3.5 h-3.5 text-[#FFC799] mr-1" />
                          Ghi chú tình trạng xe lúc thu hồi
                        </label>
                        <input
                          type="text"
                          placeholder="VD: Xe nguyên vẹn, đầy bình xăng..."
                          value={returnNotes}
                          onChange={(e) => setReturnNotes(e.target.value)}
                          disabled={selectedBooking.status !== 'Ongoing'}
                          className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-[#6E6E6E] disabled:opacity-50"
                        />
                        <p className="text-[10px] text-[#A0A0A0] mt-1">Ghi chú lưu biên bản tất toán</p>
                      </div>
                    </div>

                    {/* Settlement Summary Box */}
                    <div className="p-4 bg-[#101010] rounded-2xl border border-[#FFC799]/20 space-y-2 text-xs">
                      <div className="flex justify-between text-[#A0A0A0]">
                        <span>Tiền thuê còn lại (70%):</span>
                        <span className="font-bold text-white">
                          {selectedBooking.remainingAmount?.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <div className="flex justify-between text-[#A0A0A0]">
                        <span>Phụ thu trễ hẹn (Server tính 30.000đ/giờ trễ):</span>
                        <span className="font-bold text-[#FFC799]">
                          {selectedBooking.lateFee ? `${selectedBooking.lateFee.toLocaleString('vi-VN')} đ` : 'Tự động tính theo giờ trả'}
                        </span>
                      </div>
                      {damageFee > 0 && (
                        <div className="flex justify-between text-[#FFC799]">
                          <span>Phụ phí phát sinh:</span>
                          <span className="font-bold">{damageFee.toLocaleString('vi-VN')} đ</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-white/10 flex justify-between items-baseline text-sm">
                        <span className="font-bold text-white uppercase text-xs">
                          Tổng số tiền khách thanh toán tại quầy:
                        </span>
                        <span className="text-lg font-black text-[#FFC799]">
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
                        className="w-full py-3.5 bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] hover:bg-[#FFD6B3] text-white font-bold rounded-xl text-xs shadow-lg shadow-black/50 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
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
                      <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-center text-xs text-[#A0A0A0] font-medium">
                        Đơn hàng hiện ở trạng thái: <strong className="text-white">{selectedBooking.status}</strong> (Chỉ thực hiện Check-out khi trạng thái là Ongoing).
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#161616] rounded-2xl border border-white/10 p-12 text-center text-xs text-[#A0A0A0]">
                Vui lòng chọn một đơn từ danh sách bên trái để tiến hành quy trình Check-in hoặc Check-out.
              </div>
            )}
          </div>
        </div>

        ) : deskMode === 'ekyc' ? (
          /* eKYC Dedicated Station */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col (4 cols): Queue of pending eKYC users */}
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-[#161616] rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-[#FFC799]" />
                    <h3 className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">
                      Hồ sơ chờ đối soát ({pendingEkycList.length})
                    </h3>
                  </div>
                  <button
                    onClick={fetchPendingEkyc}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#A0A0A0] hover:text-white transition-colors"
                    title="Làm mới hàng đợi"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${ekycLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                  {ekycLoading && pendingEkycList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#6E6E6E]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#FFC799] mb-2" />
                      Đang tải danh sách chờ duyệt...
                    </div>
                  ) : pendingEkycList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#A0A0A0] space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-[#FFC799] mx-auto" />
                      <p className="font-semibold text-white">Tuyệt vời!</p>
                      <p className="text-[11px] text-[#6E6E6E]">
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
                              ? 'bg-[#FFC799]/10 border-l-4 border-[#FFC799] pl-3'
                              : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-[#101010] border border-[#FFC799]/30 flex-shrink-0 flex items-center justify-center font-bold text-[#FFC799] text-xs">
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
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/20">
                                Chờ duyệt
                              </span>
                            </div>
                            <p className="text-[11px] text-[#A0A0A0] mt-0.5 truncate">
                              {customer.phoneNumber || customer.email || `@${customer.username}`}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-[#6E6E6E] mt-2">
                              <span>Gửi: {new Date(customer.updatedAt || customer.createdAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="text-[#FFC799] font-medium">NĐ 13/2023</span>
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
                <div className="bg-[#161616] rounded-2xl border border-white/10 p-6 space-y-6">
                  {/* Customer Banner Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-white/10 gap-3">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-[#101010] border border-[#FFC799]/30 flex items-center justify-center font-bold text-[#FFC799] text-lg flex-shrink-0 shadow-md">
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
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#A0A0A0] mt-0.5">
                          <span>@{selectedEkycUser.username}</span>
                          <span>•</span>
                          <span>{selectedEkycUser.phoneNumber || 'Chưa cập nhật SĐT'}</span>
                          <span>•</span>
                          <span>{selectedEkycUser.email || 'Email chưa cung cấp'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FFC799]/10 border border-[#FFC799]/20 text-[#FFC799] text-xs self-start sm:self-auto">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#FFC799]" />
                      <span>Đã xác nhận NĐ 13/2023/NĐ-CP</span>
                    </div>
                  </div>

                  {/* 3 Documents Grid */}
                  <div>
                    <h3 className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider mb-3">
                      Tài liệu định danh & Ảnh chân dung đối chiếu
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        {
                          key: 'idCardFront',
                          label: '1. Mặt trước CCCD',
                          modalTitle: 'Mặt trước Căn cước công dân',
                        },
                        {
                          key: 'idCardBack',
                          label: '2. Mặt sau CCCD',
                          modalTitle: 'Mặt sau Căn cước công dân',
                        },
                        {
                          key: 'selfiePhoto',
                          label: '3. Ảnh chân dung thực tế',
                          modalTitle: 'Ảnh chụp chân dung thực tế',
                        },
                      ].map((docItem) => {
                        const docUrl = formatAdminDocUrl(selectedEkycUser._id, docItem.key);
                        return (
                          <div
                            key={docItem.key}
                            onClick={() => openPreviewDoc(docItem.modalTitle, docUrl)}
                            className="p-3 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl border border-white/10 hover:border-[#FFC799]/40 flex flex-col justify-between cursor-pointer transition-all group"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-[#F5F5F5]">{docItem.label}</span>
                            </div>
                            <div className="w-full h-48 bg-[#101010] rounded-lg overflow-hidden relative border border-white/10 flex items-center justify-center p-1">
                              <img
                                src={docUrl}
                                alt={docItem.label}
                                className="w-full h-full object-contain rounded"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.style.display = 'none';
                                  if (target.parentElement) {
                                    target.parentElement.innerHTML = '<span class="text-xs text-[#6E6E6E]">Chưa có ảnh</span>';
                                  }
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Decision Actions Bar */}
                  <div className="pt-5 border-t border-white/10 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#A0A0A0] mb-1.5">
                        Ghi chú đối soát (Tùy chọn khi duyệt, bắt buộc nếu từ chối):
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Ảnh CCCD mặt sau bị mờ góc mã QR hoặc ảnh chân dung chưa rõ mặt, đề nghị khách chụp lại..."
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#6E6E6E] outline-none focus:border-[#FFC799]"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                      <button
                        type="button"
                        disabled={reviewLoading}
                        onClick={() => handleReviewEkyc('Rejected')}
                        className="w-full sm:w-auto px-5 py-2.5 bg-[#FF8080]/12 hover:bg-[#FF8080]/20 border border-[#FF8080]/30 text-[#FF8080] hover:text-[#FF8080] font-bold rounded-xl text-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Từ chối & Yêu cầu chụp lại</span>
                      </button>

                      <button
                        type="button"
                        disabled={reviewLoading}
                        onClick={() => handleReviewEkyc('Verified')}
                        className="w-full sm:w-auto px-6 py-2.5 bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] hover:bg-[#FFD6B3] text-white font-bold rounded-xl text-xs shadow-md shadow-black/50 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                      >
                        {reviewLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Đang đóng dấu CCCD & Duyệt...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Phê duyệt & Tự đóng dấu CCCD (Verified)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#161616] rounded-2xl border border-white/10 p-12 text-center text-xs text-[#A0A0A0]">
                  Vui lòng chọn một hồ sơ khách hàng từ danh sách bên trái để đối soát.
                </div>
              )}
            </div>
          </div>
        ) : deskMode === 'chat' ? (
          <StaffChatConsole />
        ) : (
          <AuditLogViewer />
        )}

        {/* Modal preview high-res doc with mouse-wheel zoom & rotate */}
        {previewDocModal && (
          <div
            onClick={() => setPreviewDocModal(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#161616] border border-white/15 rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                <span className="font-bold text-sm text-white">{previewDocModal.title}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-[#A0A0A0] hidden sm:inline mr-1">
                    Lăn chuột để phóng to / thu nhỏ
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewRotation((r) => (r + 90) % 360)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#A0A0A0] hover:text-white text-xs font-bold flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Xoay 90°</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDocModal(null)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#A0A0A0] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY < 0 ? 0.18 : -0.18;
                  setPreviewZoom((prev) => Math.min(4, Math.max(0.5, Number((prev + delta).toFixed(2)))));
                }}
                className="p-6 bg-[#101010] flex items-center justify-center max-h-[80vh] overflow-auto cursor-zoom-in"
              >
                <img
                  src={previewDocModal.url}
                  alt={previewDocModal.title}
                  style={{
                    transform: `scale(${previewZoom}) rotate(${previewRotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                  className="max-w-full max-h-[72vh] object-contain rounded-lg transition-transform duration-150"
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal Counter Payment (UC-31) */}
        {showCounterPayModal && selectedBooking && (
          <div
            onClick={() => setShowCounterPayModal(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#161616] border border-white/15 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-[#FFC799]/10 text-[#FFC799] rounded-xl border border-[#FFC799]/20">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Ghi nhận thu tiền tại quầy (UC-31)</h3>
                    <p className="text-[11px] text-[#A0A0A0]">Đơn đặt xe #{selectedBooking.bookingCode}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCounterPayModal(false)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#A0A0A0] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCounterPaySubmit} className="p-5 space-y-4">
                {/* Payment overview */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-[#101010] p-3.5 rounded-xl border border-white/5">
                  <div>
                    <span className="text-[#A0A0A0] block text-[10px]">Tổng đơn:</span>
                    <span className="font-bold text-white">
                      {selectedBooking.totalAmount?.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A0A0A0] block text-[10px]">Đã thanh toán trước:</span>
                    <span className="font-bold text-[#99FFE4]">
                      {(selectedBooking.paidAmount || selectedBooking.depositAmount || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[#A0A0A0] text-[11px]">Còn lại cần thu:</span>
                    <span className="font-extrabold text-[#FFC799] text-base">
                      {(selectedBooking.remainingAmount || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1.5">
                    Số tiền thu thực tế (VNĐ) <span className="text-[#FF8080]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max={selectedBooking.remainingAmount || 0}
                      value={counterPayAmount}
                      onChange={(e) => setCounterPayAmount(Number(e.target.value))}
                      className="w-full pl-3.5 pr-14 py-2.5 bg-[#101010] border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-[#FFC799]"
                      required
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-semibold text-[#A0A0A0]">
                      VNĐ
                    </span>
                  </div>
                  {/* Quick presets */}
                  <div className="flex items-center space-x-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setCounterPayAmount(selectedBooking.remainingAmount || 0)}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[11px] font-medium text-[#FFC799] border border-white/10 cursor-pointer"
                    >
                      Thu đủ 100% ({(selectedBooking.remainingAmount || 0).toLocaleString('vi-VN')} đ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCounterPayAmount(Math.round((selectedBooking.remainingAmount || 0) / 2))}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[11px] font-medium text-[#A0A0A0] hover:text-white border border-white/10 cursor-pointer"
                    >
                      Thu 50%
                    </button>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1.5">
                    Phương thức thu tại quầy
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCounterPayMethod('Cash')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                        counterPayMethod === 'Cash'
                          ? 'bg-[#FFC799]/10 border-[#FFC799] text-[#FFC799]'
                          : 'bg-[#101010] border-white/10 text-[#A0A0A0] hover:border-white/20'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Tiền mặt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCounterPayMethod('POS')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                        counterPayMethod === 'POS'
                          ? 'bg-[#FFC799]/10 border-[#FFC799] text-[#FFC799]'
                          : 'bg-[#101010] border-white/10 text-[#A0A0A0] hover:border-white/20'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Thẻ POS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCounterPayMethod('DirectBank')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                        counterPayMethod === 'DirectBank'
                          ? 'bg-[#FFC799]/10 border-[#FFC799] text-[#FFC799]'
                          : 'bg-[#101010] border-white/10 text-[#A0A0A0] hover:border-white/20'
                      }`}
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Chuyển khoản</span>
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1.5">
                    Ghi chú biên nhận (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="Mã chuẩn chi POS / Bill ngân hàng / Tên người nộp..."
                    value={counterPayNotes}
                    onChange={(e) => setCounterPayNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-white placeholder:text-[#6E6E6E] outline-none focus:border-[#FFC799]"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCounterPayModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#A0A0A0] hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={counterPaySubmitting || counterPayAmount <= 0}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {counterPaySubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang ghi nhận...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Xác nhận đã thu tiền</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

