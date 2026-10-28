import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  AlertCircle,
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
  MessageSquare,
  Database,
  CreditCard,
  Wallet,
  Banknote,
  Receipt,
  Camera,
  UploadCloud,
  Wrench,
  ShieldAlert,
  Image as ImageIcon,
  Calendar,
  Users,
  Lock,
  BarChart3,
} from 'lucide-react';
import axios from 'axios';
import type { Booking, Vehicle, User } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getUserAvatarUrl, getOptimizedVehicleImageUrl } from '../utils/imageHelper';
import { SecureEkycImage } from '../components/SecureEkycImage';
import { StaffChatConsole } from '../components/StaffChatConsole';
import { AuditLogViewer } from '../components/AuditLogViewer';
import { StaffComplaintDesk } from '../components/StaffComplaintDesk';
import { ManagerComplaintWorkspace } from '../components/ManagerComplaintWorkspace';
import { BannerManager } from '../components/BannerManager';
import { StaffClockWidget } from '../components/StaffClockWidget';
import { ShiftCalendarView } from '../components/ShiftCalendarView';
import { StaffManager } from '../components/StaffManager';
import { ReportsCenter } from '../components/ReportsCenter';

type ChecklistKey =
  | 'idCardVerified'
  | 'drivingLicenseVerified'
  | 'tires'
  | 'brakes'
  | 'lights'
  | 'fuel'
  | 'helmets';

type MainDeskMode =
  | 'bookings'
  | 'ekyc'
  | 'chat'
  | 'audit'
  | 'vehicles'
  | 'complaints'
  | 'banners'
  | 'shifts'
  | 'staff'
  | 'reports';

const VALID_DESK_MODES: MainDeskMode[] = [
  'bookings',
  'ekyc',
  'chat',
  'audit',
  'vehicles',
  'complaints',
  'banners',
  'shifts',
  'staff',
  'reports',
];

interface DamageRecordItem {
  description: string;
  damageFee: number;
  severity?: 'Minor' | 'Moderate' | 'Severe';
  photos?: string[];
}

type ExtendedBooking = Booking & {
  startFuelLevel?: string;
  endFuelLevel?: string;
  damageRecords?: DamageRecordItem[];
  rejectReason?: string;
};

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
  idCardNumber?: string;
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
  const { user } = useAuth();
  const isManager = Boolean(user && (user.roles === 'BranchManager' || user.roles === 'SystemAdmin'));

  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = (searchParams.get('mode') || searchParams.get('tab') || 'bookings') as MainDeskMode;
  const initialMode: MainDeskMode = VALID_DESK_MODES.includes(modeParam) ? modeParam : 'bookings';

  const [deskMode, setDeskMode] = useState<MainDeskMode>(initialMode);
  const [searchCode, setSearchCode] = useState<string>('');
  const [bookings, setBookings] = useState<ExtendedBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<ExtendedBooking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'checkin' | 'checkout'>('checkin');

  // Notification banners (replacing alert())
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // UC-54: Branch Queue & Status Filter states
  const [queueFilter, setQueueFilter] = useState<'today' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orderCounts, setOrderCounts] = useState({
    total: 0,
    today: 0,
    pending: 0,
    confirmed: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0,
  });

  // UC-61-63: Vehicle Fleet Status Management
  const [branchVehicles, setBranchVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState<boolean>(false);
  const [vehicleFilterStatus, setVehicleFilterStatus] = useState<'all' | 'Available' | 'Rented' | 'Maintenance'>('all');
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState<string>('');
  const [vehicleActionModal, setVehicleActionModal] = useState<{
    vehicle: Vehicle;
    targetStatus: 'Available' | 'Rented' | 'Maintenance';
    reason: string;
    maintenanceType: 'Routine' | 'Repair' | 'Inspection';
    cost: number;
    odometer: number;
  } | null>(null);
  const [vehicleSubmitting, setVehicleSubmitting] = useState<boolean>(false);

  // UC-85 / UC-65: Complaint Management states
  const [complaintSubTab, setComplaintSubTab] = useState<'manager' | 'queue'>(isManager ? 'manager' : 'queue');
  const [pendingComplaintCount, setPendingComplaintCount] = useState<number>(0);

  // UC-73: Manager Approval state
  const [approving, setApproving] = useState<boolean>(false);

  // UC-74: Manager Reject state
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejecting, setRejecting] = useState<boolean>(false);

  // UC-75: Approve Refund States
  const [approveRefundModal, setApproveRefundModal] = useState<ExtendedBooking | null>(null);
  const [refundNote, setRefundNote] = useState<string>('');
  const [refundBankName, setRefundBankName] = useState<string>('');
  const [refundBankAccount, setRefundBankAccount] = useState<string>('');
  const [refundBankAccountName, setRefundBankAccountName] = useState<string>('');
  const [approvingRefund, setApprovingRefund] = useState<boolean>(false);

  // UC-76: Reject Refund State
  const [rejectRefundModal, setRejectRefundModal] = useState<ExtendedBooking | null>(null);
  const [refundDenyReason, setRefundDenyReason] = useState<string>('');
  const [rejectingRefund, setRejectingRefund] = useState<boolean>(false);

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

  // Check-in form states (UC-56: 5-point handover)
  const [startOdo, setStartOdo] = useState<number>(0);
  const [startFuel, setStartFuel] = useState<string>('100%');
  const [checklist, setChecklist] = useState<Record<ChecklistKey, boolean>>({
    idCardVerified: true,
    drivingLicenseVerified: true,
    tires: true,
    brakes: true,
    lights: true,
    fuel: true,
    helmets: true,
  });
  const [checkinPhotos, setCheckinPhotos] = useState<string[]>(['', '', '', '']);
  const [signatureData, setSignatureData] = useState<string>('');
  const [receiverName, setReceiverName] = useState<string>('');
  const [receiverPhone, setReceiverPhone] = useState<string>('');
  const [receiverIdCard, setReceiverIdCard] = useState<string>('');

  // Check-out form states (UC-57: 4 photos, ODO, fuel, damage, late fee)
  const [endOdo, setEndOdo] = useState<number>(0);
  const [endFuel, setEndFuel] = useState<string>('100%');
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

  // Damage Record modal states (UC-58)
  const [showDamageModal, setShowDamageModal] = useState<boolean>(false);
  const [damageDesc, setDamageDesc] = useState<string>('');
  const [damageAmount, setDamageAmount] = useState<number>(0);
  const [damageSeverity, setDamageSeverity] = useState<'Minor' | 'Moderate' | 'Severe'>('Minor');
  const [damagePhotoUrl, setDamagePhotoUrl] = useState<string>('');
  const [damageSubmitting, setDamageSubmitting] = useState<boolean>(false);

  const getDefaultFourAnglesFromVehicle = (b: Booking): string[] => {
    const v = typeof b.vehicleId === 'object' && b.vehicleId !== null ? (b.vehicleId as Vehicle) : null;
    const rawImgs = v?.images || [];
    const img0 = getOptimizedVehicleImageUrl(rawImgs[0] || rawImgs[1]);
    const img1 = getOptimizedVehicleImageUrl(rawImgs[1] || rawImgs[0]);
    const img2 = getOptimizedVehicleImageUrl(rawImgs[2] || rawImgs[1] || rawImgs[0]);
    const img3 = getOptimizedVehicleImageUrl(rawImgs[0] || rawImgs[2] || rawImgs[1]);
    return [img0, img1, img2, img3];
  };

  const getEffectivePaidAmount = (b: Booking): number => {
    if (typeof b.paidAmount === 'number' && b.paidAmount > 0) return b.paidAmount;
    if (b.depositPaid) return b.depositAmount || 0;
    return 0;
  };

  const getEffectivePayableBalance = (b: Booking): number => {
    if (b.isPaid) return 0;
    const isInitialPendingUnpaid =
      b.status === 'Pending' && !b.depositPaid && (b.paidAmount || 0) === 0;
    if (isInitialPendingUnpaid) return b.totalAmount || 0;
    return b.remainingAmount || 0;
  };

  const handleSelectBooking = (b: ExtendedBooking) => {
    setSelectedBooking(b);
    setStatusMessage(null);
    setSignatureData(b.eSignatureUrl || '');

    const bookingOwner =
      typeof b.userId === 'object' && b.userId !== null ? (b.userId as User) : null;
    const defaultReceiverName = bookingOwner
      ? [bookingOwner.lastName, bookingOwner.firstName].filter(Boolean).join(' ') ||
        bookingOwner.username
      : '';
    setReceiverName(b.receiverName || defaultReceiverName);
    setReceiverPhone(b.receiverPhone || bookingOwner?.phoneNumber || '');
    setReceiverIdCard(b.receiverIdCard || bookingOwner?.idCardNumber || '');

    const bikeOdo =
      typeof b.vehicleId === 'object' && b.vehicleId !== null
        ? (b.vehicleId as Vehicle).odometer || 0
        : 0;

    setStartOdo(b.startOdometer || bikeOdo);
    setStartFuel(b.startFuelLevel ? String(b.startFuelLevel) : '100%');
    setEndOdo(b.endOdometer || (b.startOdometer ? b.startOdometer : bikeOdo));
    setEndFuel(b.endFuelLevel ? String(b.endFuelLevel) : '100%');
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

  const fetchBookings = async (
    customStatus?: string,
    customQueue?: 'today' | 'all',
    customSearch?: string
  ) => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const activeStatus = customStatus !== undefined ? customStatus : statusFilter;
      const activeQueue = customQueue !== undefined ? customQueue : queueFilter;
      const activeSearch = customSearch !== undefined ? customSearch : searchCode;

      const params: Record<string, string> = {};
      if (activeStatus && activeStatus !== 'all') params.status = activeStatus;
      if (activeQueue && activeQueue !== 'all') params.queue = activeQueue;
      if (activeSearch && activeSearch.trim()) params.search = activeSearch.trim();

      const res = await api.get('/bookings/branch', { params });
      if (res.data?.data) {
        const list: ExtendedBooking[] = res.data.data;
        setBookings(list);
        if (res.data?.meta?.counts) {
          setOrderCounts(res.data.meta.counts);
        }
        if (list.length > 0) {
          const matched = selectedBooking ? list.find((b) => b._id === selectedBooking._id) : undefined;
          handleSelectBooking(matched || list[0]);
        } else {
          setSelectedBooking(null);
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

  const handleTabChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    fetchBookings(newStatus, queueFilter, searchCode);
  };

  const handleQueueToggle = (newQueue: 'today' | 'all') => {
    setQueueFilter(newQueue);
    fetchBookings(statusFilter, newQueue, searchCode);
  };

  const fetchPendingEkyc = async () => {
    setEkycLoading(true);
    try {
      const res = await api.get('/auth/ekyc/pending');
      if (res.data?.data) {
        setPendingEkycList(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedEkycUser((prev) =>
            prev
              ? res.data.data.find((u: PendingEkycUser) => u._id === prev._id) || res.data.data[0]
              : res.data.data[0]
          );
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

  const fetchBranchVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const rawBranch = user?.branchId;
      const bId =
        rawBranch && typeof rawBranch === 'object' && '_id' in rawBranch
          ? rawBranch._id
          : rawBranch
          ? String(rawBranch)
          : undefined;
      const params = bId ? { branchId: bId } : {};
      const res = await api.get('/vehicles', { params });
      if (res.data && res.data.data) {
        setBranchVehicles(res.data.data);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch branch vehicles:', err);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleUpdateVehicleStatus = async (
    vehicleId: string,
    targetStatus: 'Available' | 'Rented' | 'Maintenance',
    details?: {
      reason?: string;
      maintenanceType?: 'Routine' | 'Repair' | 'Inspection';
      cost?: number;
      odometer?: number;
    }
  ) => {
    setVehicleSubmitting(true);
    try {
      await api.put(`/vehicles/${vehicleId}/status`, {
        status: targetStatus,
        reason: details?.reason,
        maintenanceType: details?.maintenanceType,
        cost: details?.cost,
        odometer: details?.odometer,
      });
      setVehicleActionModal(null);
      await fetchBranchVehicles();
      setStatusMessage({
        type: 'success',
        text: `Đã cập nhật trạng thái phương tiện thành "${targetStatus}" thành công!`,
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setStatusMessage({
          type: 'error',
          text: err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái phương tiện.',
        });
      }
    } finally {
      setVehicleSubmitting(false);
    }
  };

  const formatAdminDocUrl = (userId: string, docType: string) => {
    return `/auth/ekyc/document/view/${userId}/${docType}`;
  };

  const handleReviewEkyc = async (status: 'Verified' | 'Rejected') => {
    if (!selectedEkycUser) return;
    setReviewLoading(true);
    setStatusMessage(null);
    try {
      const res = await api.put(`/auth/ekyc/review/${selectedEkycUser._id}`, {
        status,
        note: rejectNote.trim() || undefined,
      });

      if (res.data?.success) {
        setStatusMessage({
          type: 'success',
          text:
            status === 'Verified'
              ? `Đã phê duyệt eKYC cho ${selectedEkycUser.firstName || selectedEkycUser.username}! Hồ sơ gốc được giữ nguyên hiển thị rõ nét và mã hóa bảo mật chuẩn AES-256-GCM.`
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

  // UC-73: Manager Approve Booking
  const handleApproveBooking = async () => {
    if (!selectedBooking) return;
    setApproving(true);
    setStatusMessage(null);
    try {
      const res = await api.put(`/bookings/${selectedBooking._id}/approve`, {});
      if (res.data?.success && res.data?.data) {
        setStatusMessage({
          type: 'success',
          text: `Đã phê duyệt thành công đơn đặt xe ${selectedBooking.bookingCode}! Đơn chuyển sang trạng thái "${res.data.data.status}".`,
        });
        handleSelectBooking(res.data.data);
        fetchBookings();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setStatusMessage({
          type: 'error',
          text: err.response?.data?.message || 'Không thể phê duyệt đơn đặt xe.',
        });
      }
    } finally {
      setApproving(false);
    }
  };

  // UC-74: Manager Reject Booking
  const handleRejectBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    if (!rejectReason.trim()) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập lý do từ chối đơn đặt xe.' });
      return;
    }

    setRejecting(true);
    setStatusMessage(null);
    try {
      const res = await api.put(`/bookings/${selectedBooking._id}/reject`, {
        reason: rejectReason.trim(),
      });
      if (res.data?.success && res.data?.data) {
        setStatusMessage({
          type: 'success',
          text: `Đã từ chối đơn đặt xe ${selectedBooking.bookingCode} thành công. Hệ thống đã gửi thông báo đến khách hàng.`,
        });
        setShowRejectModal(false);
        setRejectReason('');
        handleSelectBooking(res.data.data);
        fetchBookings();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setStatusMessage({
          type: 'error',
          text: err.response?.data?.message || 'Không thể từ chối đơn đặt xe.',
        });
      }
    } finally {
      setRejecting(false);
    }
  };

  // UC-75: Manager Approve Refund
  const handleApproveRefund = async () => {
    if (!approveRefundModal) return;
    setApprovingRefund(true);
    try {
      const res = await api.put(`/bookings/${approveRefundModal._id}/refund/approve`, {
        note: refundNote,
        bankName: refundBankName,
        bankAccount: refundBankAccount,
        bankAccountName: refundBankAccountName,
      });

      setStatusMessage({
        type: 'success',
        text: `Đã phê duyệt hoàn tiền ${(approveRefundModal.refundAmount || 0).toLocaleString('vi-VN')} đ cho đơn ${approveRefundModal.bookingCode}!`,
      });
      setApproveRefundModal(null);
      setRefundNote('');
      setRefundBankName('');
      setRefundBankAccount('');
      setRefundBankAccountName('');
      if (selectedBooking?._id === approveRefundModal._id && res.data?.data) {
        handleSelectBooking(res.data.data);
      }
      fetchBookings();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setStatusMessage({
          type: 'error',
          text: err.response?.data?.message || 'Có lỗi xảy ra khi phê duyệt hoàn tiền.',
        });
      }
    } finally {
      setApprovingRefund(false);
    }
  };

  // UC-76: Manager Reject Refund
  const handleRejectRefund = async () => {
    if (!rejectRefundModal || !refundDenyReason.trim()) return;
    setRejectingRefund(true);
    try {
      const res = await api.put(`/bookings/${rejectRefundModal._id}/refund/reject`, {
        reason: refundDenyReason.trim(),
      });

      setStatusMessage({
        type: 'success',
        text: `Đã từ chối hoàn tiền cho đơn ${rejectRefundModal.bookingCode}!`,
      });
      setRejectRefundModal(null);
      setRefundDenyReason('');
      if (selectedBooking?._id === rejectRefundModal._id && res.data?.data) {
        handleSelectBooking(res.data.data);
      }
      fetchBookings();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setStatusMessage({
          type: 'error',
          text: err.response?.data?.message || 'Có lỗi xảy ra khi từ chối hoàn tiền.',
        });
      }
    } finally {
      setRejectingRefund(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchPendingEkyc();
    fetchBranchVehicles();
  }, []);

  useEffect(() => {
    const m = (searchParams.get('mode') || searchParams.get('tab')) as MainDeskMode | null;
    if (m && VALID_DESK_MODES.includes(m)) {
      setDeskMode(m);
      if (m === 'vehicles') {
        fetchBranchVehicles();
      }
    }
  }, [searchParams]);

  const switchDeskMode = (mode: MainDeskMode) => {
    setDeskMode(mode);
    setSearchParams({ mode });
    if (mode === 'vehicles') {
      fetchBranchVehicles();
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
    if (!searchCode.trim()) {
      await fetchBookings(statusFilter, queueFilter, '');
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      // 1. Try searching within branch queue with search keyword
      const res = await api.get('/bookings/branch', {
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          queue: queueFilter !== 'all' ? queueFilter : undefined,
          search: searchCode.trim(),
        },
      });

      if (res.data?.data && res.data.data.length > 0) {
        setBookings(res.data.data);
        if (res.data?.meta?.counts) {
          setOrderCounts(res.data.meta.counts);
        }
        handleSelectBooking(res.data.data[0]);
      } else {
        // 2. Fallback: try direct code lookup
        const codeRes = await api.get(`/bookings/code/${encodeURIComponent(searchCode.trim())}`);
        if (codeRes.data?.data) {
          setBookings([codeRes.data.data]);
          handleSelectBooking(codeRes.data.data);
        } else {
          setBookings([]);
          setSelectedBooking(null);
          setStatusMessage({
            type: 'error',
            text: `Không tìm thấy đơn đặt xe phù hợp với từ khóa: "${searchCode}"`,
          });
        }
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setStatusMessage({
          type: 'error',
          text: err.response?.data?.message || `Không tìm thấy đơn đặt xe với từ khóa: ${searchCode}`,
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
        startFuelLevel: startFuel,
        checklist,
        checkinImages: checkinPhotos.filter(Boolean),
        eSignatureUrl: signatureData,
        verifiedAtCounter: true,
        receiverName: receiverName.trim() || undefined,
        receiverPhone: receiverPhone.trim() || undefined,
        receiverIdCard: receiverIdCard.trim() || undefined,
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
        endFuelLevel: endFuel,
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
    const isInitialPendingUnpaid =
      selectedBooking.status === 'Pending' &&
      !selectedBooking.depositPaid &&
      (selectedBooking.paidAmount || 0) === 0;
    const maxPayable = getEffectivePayableBalance(selectedBooking);
    setCounterPayAmount(
      isInitialPendingUnpaid ? selectedBooking.depositAmount || maxPayable : maxPayable
    );
    setCounterPayMethod('Cash');
    setCounterPayNotes('');
    setShowCounterPayModal(true);
  };

  const handleCounterPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    const maxPayable = getEffectivePayableBalance(selectedBooking);
    if (counterPayAmount <= 0) {
      setStatusMessage({ type: 'error', text: 'Số tiền thu phải lớn hơn 0 VNĐ.' });
      return;
    }
    if (counterPayAmount > maxPayable) {
      setStatusMessage({
        type: 'error',
        text: `Số tiền thu (${counterPayAmount.toLocaleString('vi-VN')} đ) vượt quá số dư cần thanh toán (${maxPayable.toLocaleString('vi-VN')} đ).`,
      });
      return;
    }
    setCounterPaySubmitting(true);
    setStatusMessage(null);
    try {
      const methodLabel =
        counterPayMethod === 'POS'
          ? '[Quẹt thẻ POS]'
          : counterPayMethod === 'DirectBank'
          ? '[Chuyển khoản quầy]'
          : '[Tiền mặt]';
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

  const handleRecordDamageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    if (!damageDesc.trim()) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập mô tả chi tiết hư hại, trầy xước.' });
      return;
    }
    setDamageSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await api.post(`/bookings/${selectedBooking._id}/damage`, {
        description: damageDesc.trim(),
        damageFee: damageAmount,
        severity: damageSeverity,
        photos: damagePhotoUrl.trim() ? [damagePhotoUrl.trim()] : [],
      });
      if (res.data?.success && res.data?.data) {
        const updated = res.data.data;
        setStatusMessage({
          type: 'success',
          text: `Ghi nhận hư hỏng thành công cho đơn ${selectedBooking.bookingCode}! Phí bồi thường: ${damageAmount.toLocaleString('vi-VN')} đ.`,
        });
        handleSelectBooking(updated);
        setShowDamageModal(false);
        setDamageDesc('');
        setDamageAmount(0);
        setDamagePhotoUrl('');
        fetchBookings();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setStatusMessage({
          type: 'error',
          text: err.response?.data?.message || 'Không thể ghi nhận hư hỏng.',
        });
      }
    } finally {
      setDamageSubmitting(false);
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

              <button
                type="button"
                onClick={() => {
                  switchDeskMode('vehicles');
                  fetchBranchVehicles();
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  deskMode === 'vehicles'
                    ? 'bg-[#FFC799] text-[#101010] font-black shadow-md'
                    : 'bg-[#161616] text-[#A0A0A0] hover:text-white border border-white/10'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>05. Đội xe & Trạng thái (UC-61-63)</span>
                {branchVehicles.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-white font-bold text-[10px]">
                    {branchVehicles.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => switchDeskMode('complaints')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  deskMode === 'complaints'
                    ? 'bg-[#FFC799] text-[#101010] font-black shadow-md'
                    : 'bg-[#161616] text-[#A0A0A0] hover:text-white border border-white/10'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                <span>06. Khiếu nại {isManager ? '(UC-85)' : '(UC-65)'}</span>
                {isManager && pendingComplaintCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#FF8080] text-[#101010] font-black text-[10px]">
                    {pendingComplaintCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => switchDeskMode('banners')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  deskMode === 'banners'
                    ? 'bg-[#FFC799] text-[#101010] font-black shadow-md'
                    : 'bg-[#161616] text-[#A0A0A0] hover:text-white border border-white/10'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>07. Banner CMS (UC-118)</span>
              </button>

              <button
                type="button"
                onClick={() => switchDeskMode('shifts')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  deskMode === 'shifts'
                    ? 'bg-[#FFC799] text-[#101010] font-black shadow-md'
                    : 'bg-[#161616] text-[#A0A0A0] hover:text-white border border-white/10'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>08. Lịch phân ca & Chấm công (UC-84)</span>
              </button>

              {isManager && (
                <>
                  <button
                    type="button"
                    onClick={() => switchDeskMode('staff')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                      deskMode === 'staff'
                        ? 'bg-[#FFC799] text-[#101010] font-black shadow-md'
                        : 'bg-[#161616] text-[#A0A0A0] hover:text-white border border-white/10'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>09. Quản lý nhân viên (UC-81-83)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => switchDeskMode('reports')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                      deskMode === 'reports'
                        ? 'bg-[#FFC799] text-[#101010] font-black shadow-md'
                        : 'bg-[#161616] text-[#A0A0A0] hover:text-white border border-white/10'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>10. Báo cáo & Phân tích (S3)</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {(deskMode === 'bookings' || deskMode === 'ekyc' || deskMode === 'vehicles') && (
            <button
              onClick={() => {
                if (deskMode === 'bookings') fetchBookings();
                else if (deskMode === 'ekyc') fetchPendingEkyc();
                else fetchBranchVehicles();
              }}
              disabled={loading || ekycLoading || loadingVehicles}
              className="self-start md:self-auto inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#A0A0A0] bg-[#161616] border border-white/10 hover:border-[#FFC799]/40 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#A0A0A0] ${
                  loading || ekycLoading || loadingVehicles ? 'animate-spin' : ''
                }`}
              />
              <span>
                {deskMode === 'bookings'
                  ? 'Đồng bộ đơn chi nhánh'
                  : deskMode === 'ekyc'
                  ? 'Làm mới hàng đợi eKYC'
                  : 'Làm mới danh sách xe'}
              </span>
            </button>
          )}
        </div>

        {/* UC-84: Quick Staff Attendance Bar */}
        <div className="mb-6">
          <StaffClockWidget />
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
            <div className="flex-1 font-medium leading-relaxed">{statusMessage.text}</div>
          </div>
        )}

        {/* Main 2-column desk */}
        {deskMode === 'bookings' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Booking lookup and Queue (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Quick Search (UC-54) */}
              <form onSubmit={handleSearch} className="bg-[#161616] p-4 rounded-2xl border border-white/10">
                <label className="block text-xs font-semibold text-[#A0A0A0] mb-1.5">
                  Tìm kiếm đơn theo mã, SĐT khách hoặc biển số xe
                </label>
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-[#6E6E6E] absolute left-3" />
                  <input
                    type="text"
                    placeholder="Nhập mã đơn, SĐT, biển số xe..."
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    className="w-full pl-9 pr-24 py-2.5 bg-[#101010] border border-white/10 rounded-xl text-xs font-medium text-white placeholder:text-[#6E6E6E] outline-none focus:border-[#FFC799]"
                  />
                  {searchCode && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchCode('');
                        fetchBookings(statusFilter, queueFilter, '');
                      }}
                      className="absolute right-20 text-[#6E6E6E] hover:text-white p-1"
                      title="Xóa tìm kiếm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="absolute right-1.5 px-3 py-1.5 bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] rounded-lg text-xs font-bold transition-colors"
                  >
                    Tìm kiếm
                  </button>
                </div>
              </form>

              {/* Bookings Queue (UC-54) */}
              <div className="bg-[#161616] rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider flex items-center gap-2">
                      Hàng đợi chi nhánh
                      <span className="text-[11px] font-semibold text-[#A0A0A0] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                        {bookings.length}
                      </span>
                    </h3>
                    {/* Queue Toggle: Today vs All */}
                    <div className="flex items-center gap-1 bg-[#101010] p-1 rounded-xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => handleQueueToggle('today')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          queueFilter === 'today'
                            ? 'bg-[#FFC799] text-[#101010] shadow-sm'
                            : 'text-[#A0A0A0] hover:text-white'
                        }`}
                      >
                        Hôm nay ({orderCounts.today})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQueueToggle('all')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          queueFilter === 'all'
                            ? 'bg-[#FFC799] text-[#101010] shadow-sm'
                            : 'text-[#A0A0A0] hover:text-white'
                        }`}
                      >
                        Tất cả ({orderCounts.total})
                      </button>
                    </div>
                  </div>

                  {/* Status Filter Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {[
                      { key: 'all', label: 'Tất cả' },
                      { key: 'confirmed', label: 'Chờ nhận', count: orderCounts.confirmed },
                      { key: 'ongoing', label: 'Đang thuê', count: orderCounts.ongoing },
                      { key: 'completed', label: 'Đã trả', count: orderCounts.completed },
                      { key: 'cancelled', label: 'Đã hủy', count: orderCounts.cancelled },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => handleTabChange(tab.key)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                          statusFilter === tab.key
                            ? 'bg-white/15 text-white border border-white/20'
                            : 'bg-[#101010] text-[#A0A0A0] hover:text-white border border-white/5'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                          <span className="text-[10px] font-bold opacity-75">({tab.count})</span>
                        )}
                      </button>
                    ))}
                  </div>
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
                      const bikeName =
                        typeof b.vehicleId === 'object' && b.vehicleId !== null
                          ? (b.vehicleId as Vehicle).vehicleModel
                          : 'Xe máy Motorent';
                      const userName =
                        typeof b.userId === 'object' && b.userId !== null
                          ? `${(b.userId as User).firstName || ''} ${(b.userId as User).lastName || ''}`.trim() ||
                            (b.userId as User).username
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
                            <span className="font-mono text-xs font-bold text-white">{b.bookingCode}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                b.status === 'Confirmed' || b.status === 'Approved'
                                  ? 'bg-[#FFC799]/12 text-[#FFC799] border border-[#FFC799]/30'
                                  : b.status === 'Ongoing'
                                  ? 'bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30'
                                  : b.status === 'Completed'
                                  ? 'bg-[#1E1E1E] text-[#A0A0A0] border border-white/10'
                                  : 'bg-[#1E1E1E] text-[#A0A0A0] border border-white/10'
                              }`}
                            >
                              {b.status === 'Confirmed' || b.status === 'Approved'
                                ? 'Chờ nhận xe'
                                : b.status === 'Ongoing'
                                ? 'Đang lưu hành'
                                : b.status === 'Completed'
                                ? 'Đã hoàn tất'
                                : b.status}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-[#F5F5F5] truncate">{bikeName}</p>
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
                            ? (selectedBooking.userId as User).firstName ||
                              (selectedBooking.userId as User).username
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
                            <span className="text-[#A0A0A0] block text-[10px] uppercase font-bold">
                              Tổng tiền đơn
                            </span>
                            <span className="font-bold text-white text-sm">
                              {selectedBooking.totalAmount?.toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                          <div>
                            <span className="text-[#A0A0A0] block text-[10px] uppercase font-bold">
                              Đã thanh toán
                            </span>
                            <span className="font-bold text-[#99FFE4] text-sm">
                              {getEffectivePaidAmount(selectedBooking).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                          <div>
                            <span className="text-[#A0A0A0] block text-[10px] uppercase font-bold">
                              Còn lại phải thu
                            </span>
                            <span
                              className={`font-bold text-sm ${
                                getEffectivePayableBalance(selectedBooking) <= 0
                                  ? 'text-[#99FFE4]'
                                  : 'text-[#FF8080]'
                              }`}
                            >
                              {getEffectivePayableBalance(selectedBooking).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* UC-73: Approve Order Button */}
                          {isManager && selectedBooking.status === 'Pending' && (
                            <button
                              type="button"
                              onClick={handleApproveBooking}
                              disabled={approving}
                              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-[#101010] shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              <span>{approving ? 'Đang duyệt...' : 'Duyệt đơn (UC-73)'}</span>
                            </button>
                          )}

                          {/* UC-74: Reject Order Button */}
                          {isManager &&
                            ['Pending', 'Approved', 'Confirmed'].includes(selectedBooking.status) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectReason('');
                                  setShowRejectModal(true);
                                }}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#FF8080]/30 hover:border-[#FF8080] text-[#FF8080] hover:bg-[#FF8080]/10 transition-colors cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                <span>Từ chối đơn (UC-74)</span>
                              </button>
                            )}

                          {getEffectivePayableBalance(selectedBooking) <= 0 ? (
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
                              <span>
                                Thu tiền tại quầy (
                                {getEffectivePayableBalance(selectedBooking).toLocaleString('vi-VN')} đ)
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* UC-75 & UC-76: Refund Status & Approval/Rejection Banner */}
                    {selectedBooking.refundStatus === 'Pending' && (
                      <div className="mt-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center space-x-2.5">
                          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-white">
                              Yêu cầu hoàn tiền BR-06 đang chờ duyệt
                            </p>
                            <p className="text-[11px] text-[#A0A0A0]">
                              Số tiền hoàn:{' '}
                              <strong className="text-amber-400 font-bold">
                                {(selectedBooking.refundAmount || 0).toLocaleString('vi-VN')} đ
                              </strong>
                              {selectedBooking.refundForfeitAmount
                                ? ` (Khấu trừ 50% cọc: ${selectedBooking.refundForfeitAmount.toLocaleString('vi-VN')} đ)`
                                : ''}
                            </p>
                          </div>
                        </div>
                        {isManager ? (
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setRejectRefundModal(selectedBooking)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#FF8080]/15 hover:bg-[#FF8080]/25 text-[#FF8080] border border-[#FF8080]/30 transition-colors flex items-center space-x-1.5 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Từ chối hoàn (UC-76)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setApproveRefundModal(selectedBooking)}
                              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#FFC799] text-[#101010] hover:bg-[#FFD6B3] transition-colors flex items-center space-x-1.5 shadow-md cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Duyệt hoàn tiền (UC-75)</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-300 italic">Chờ Quản lý duyệt</span>
                        )}
                      </div>
                    )}

                    {selectedBooking.refundStatus === 'Approved' && (
                      <div className="mt-3 p-3 bg-[#99FFE4]/10 border border-[#99FFE4]/30 rounded-xl flex items-center space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#99FFE4] shrink-0" />
                        <span className="text-xs font-bold text-[#99FFE4]">
                          Khoản hoàn tiền {(selectedBooking.refundAmount || 0).toLocaleString('vi-VN')} đ đã
                          được Quản lý phê duyệt thành công (Approved).
                        </span>
                      </div>
                    )}

                    {selectedBooking.refundStatus === 'Rejected' && (
                      <div className="mt-3 p-3 bg-[#FF8080]/10 border border-[#FF8080]/30 rounded-xl flex items-center space-x-2.5">
                        <XCircle className="w-4 h-4 text-[#FF8080] shrink-0" />
                        <div className="text-xs">
                          <span className="font-bold text-[#FF8080]">
                            Yêu cầu hoàn tiền đã bị Quản lý từ chối.
                          </span>
                          {selectedBooking.rejectReason && (
                            <span className="text-[#A0A0A0] ml-1.5">
                              Lý do: {selectedBooking.rejectReason}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
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
                      1. Check-in Bàn giao xe (
                      {selectedBooking.status === 'Confirmed' || selectedBooking.status === 'Approved'
                        ? 'Sẵn sàng'
                        : selectedBooking.status}
                      )
                    </button>
                    <button
                      onClick={() => setActiveTab('checkout')}
                      className={`flex-1 py-3.5 text-xs font-bold text-center border-b-2 transition-all ${
                        activeTab === 'checkout'
                          ? 'border-[#FFC799] text-[#FFC799] bg-[#FFC799]/10'
                          : 'border-transparent text-[#A0A0A0] hover:text-[#F5F5F5]'
                      }`}
                    >
                      2. Check-out Thu hồi xe & Tất toán (
                      {selectedBooking.status === 'Ongoing' ? 'Đang thực hiện' : ''})
                    </button>
                  </div>

                  {/* Tab 1: Check-in Process */}
                  {activeTab === 'checkin' && (
                    <div className="p-6 space-y-5">
                      {/* Pending Booking Activation Banner: Counter Payment (Staff/Manager) or UC-73 Approval */}
                      {selectedBooking.status === 'Pending' && (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center space-x-2.5 text-amber-400">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <div>
                              <span className="font-semibold block">
                                Đơn đặt xe đang chờ kích hoạt thanh toán cọc hoặc phê duyệt
                              </span>
                              <span className="text-[11px] text-amber-300/80">
                                Nhân viên quầy có thể thu cọc 30% / thanh toán 100% trực tiếp tại quầy để kích hoạt đơn ngay lập tức và tiến hành bàn giao xe.
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={openCounterPayModal}
                              className="px-3.5 py-2 bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] font-bold rounded-lg text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-md"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              <span>Thu cọc / Thanh toán kích hoạt đơn</span>
                            </button>
                            {isManager && (
                              <button
                                type="button"
                                onClick={handleApproveBooking}
                                disabled={approving}
                                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-[#101010] font-bold rounded-lg text-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-md"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{approving ? 'Đang duyệt...' : 'Quản lý duyệt đơn (UC-73)'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Unpaid Remaining Balance Alert Banner */}
                      {selectedBooking.status !== 'Pending' &&
                        getEffectivePayableBalance(selectedBooking) > 0 && (
                          <div className="p-3.5 rounded-xl bg-[#FFC799]/10 border border-[#FFC799]/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center space-x-2.5 text-[#FFC799]">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              <span>
                                Đơn còn số dư cần thanh toán (
                                <strong>
                                  {getEffectivePayableBalance(selectedBooking).toLocaleString('vi-VN')} đ
                                </strong>
                                ).
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

                      {/* 1. Logical Counter Verification & Actual / Proxy Receiver Card (UC-56) */}
                      <div className="p-4 rounded-xl border border-white/10 bg-[#101010] space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2.5">
                            <UserCheck className="w-5 h-5 text-[#FFC799] flex-shrink-0" />
                            <div>
                              <div className="text-xs font-bold text-white flex flex-wrap items-center gap-2">
                                Xác thực Mã đơn & Người nhận xe thực tế tại quầy
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#99FFE4]/15 text-[#99FFE4] border border-[#99FFE4]/30">
                                  Cho phép nhận xe hộ / đại diện
                                </span>
                                {typeof selectedBooking.userId === 'object' &&
                                  selectedBooking.userId &&
                                  (selectedBooking.userId as User).identityStatus === 'Verified' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/30">
                                      Tài khoản đặt đã eKYC
                                    </span>
                                  )}
                              </div>
                              <div className="text-[11px] text-[#A0A0A0] mt-0.5">
                                Đơn đã xác thực thanh toán hợp lệ: bất kỳ người nhận thực tế nào xuất trình mã đơn và giấy tờ tùy thân/GPLX hợp lệ tại quầy đều được bàn giao xe. Số giấy tờ được mã hóa AES-256-GCM.
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#A0A0A0] mb-1">
                              Họ tên người nhận xe thực tế
                            </label>
                            <input
                              type="text"
                              value={receiverName}
                              disabled={
                                selectedBooking.status !== 'Confirmed' &&
                                selectedBooking.status !== 'Approved'
                              }
                              onChange={(e) => setReceiverName(e.target.value)}
                              placeholder="Họ và tên người nhận xe..."
                              className="w-full bg-[#161616] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#FFC799] disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-[#A0A0A0] mb-1">
                              SĐT người nhận thực tế
                            </label>
                            <input
                              type="text"
                              value={receiverPhone}
                              disabled={
                                selectedBooking.status !== 'Confirmed' &&
                                selectedBooking.status !== 'Approved'
                              }
                              onChange={(e) => setReceiverPhone(e.target.value)}
                              placeholder="Số điện thoại liên hệ..."
                              className="w-full bg-[#161616] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#FFC799] disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-[#A0A0A0] mb-1 flex items-center justify-between">
                              <span>Số CCCD / Passport / GPLX đối chiếu</span>
                              <Lock className="w-3 h-3 text-[#99FFE4]" />
                            </label>
                            <input
                              type="text"
                              value={receiverIdCard}
                              disabled={
                                selectedBooking.status !== 'Confirmed' &&
                                selectedBooking.status !== 'Approved'
                              }
                              onChange={(e) => setReceiverIdCard(e.target.value)}
                              placeholder="Nhập số giấy tờ người nhận..."
                              className="w-full bg-[#161616] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#FFC799] disabled:opacity-50"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 2. Odometer Input & Fuel Level Selector (UC-56) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Odometer Input */}
                        <div>
                          <label className="block text-xs font-semibold text-[#A0A0A0] mb-1 flex items-center">
                            <Gauge className="w-4 h-4 text-[#FFC799] mr-1.5" />
                            Chỉ số ODO công-tơ-mét khi giao (km)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={startOdo || ''}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => setStartOdo(e.target.value === '' ? 0 : Number(e.target.value))}
                            disabled={
                              selectedBooking.status !== 'Confirmed' && selectedBooking.status !== 'Approved'
                            }
                            className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none focus:border-[#FFC799] disabled:opacity-50"
                          />
                          <p className="text-[11px] text-[#A0A0A0] mt-1">
                            Chỉ số ODO làm căn cứ đối chiếu khi khách bàn giao trả xe.
                          </p>
                        </div>

                        {/* Fuel Level Selector */}
                        <div>
                          <label className="block text-xs font-semibold text-[#A0A0A0] mb-1 flex items-center justify-between">
                            <span className="flex items-center">
                              <Gauge className="w-4 h-4 text-[#FFC799] mr-1.5" />
                              Mức nhiên liệu / Xăng
                            </span>
                            <span className="text-xs font-bold text-[#FFC799]">{startFuel}</span>
                          </label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {['100%', '75%', '50%', '25%'].map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                disabled={
                                  selectedBooking.status !== 'Confirmed' &&
                                  selectedBooking.status !== 'Approved'
                                }
                                onClick={() => setStartFuel(lvl)}
                                className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all border ${
                                  startFuel === lvl
                                    ? 'bg-[#FFC799] text-[#101010] border-[#FFC799]'
                                    : 'bg-[#101010] text-[#A0A0A0] border-white/10 hover:border-white/20 hover:text-white'
                                }`}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                          <p className="text-[11px] text-[#A0A0A0] mt-1">
                            Ghi nhận lượng nhiên liệu thực tế khi giao xe.
                          </p>
                        </div>
                      </div>

                      {/* 3. 5-point Handover & Safety Checklist (UC-56) */}
                      <div>
                        <label className="block text-xs font-semibold text-[#A0A0A0] mb-2 flex items-center">
                          <FileCheck className="w-4 h-4 text-[#FFC799] mr-1.5" />
                          Biên bản bàn giao 5 điểm an toàn trước khi rời trạm (UC-56)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {[
                            {
                              key: 'idCardVerified' as ChecklistKey,
                              label: '1. Đã đối chiếu CCCD/Passport khách hàng',
                            },
                            {
                              key: 'drivingLicenseVerified' as ChecklistKey,
                              label: '2. Đã kiểm tra GPLX xe máy còn hiệu lực',
                            },
                            {
                              key: 'tires' as ChecklistKey,
                              label: '3. Áp suất lốp xe & độ bám đường tốt',
                            },
                            {
                              key: 'brakes' as ChecklistKey,
                              label: '4. Phanh trước & sau hoạt động nhạy',
                            },
                            {
                              key: 'lights' as ChecklistKey,
                              label: '5. Đèn pha, xi nhan, còi xe hoạt động',
                            },
                            {
                              key: 'helmets' as ChecklistKey,
                              label: '6. Đã giao 2 nón bảo hiểm CR + 2 áo mưa',
                            },
                          ].map((item) => (
                            <label
                              key={item.key}
                              className="flex items-center space-x-2 p-2.5 rounded-xl border border-white/10 bg-[#101010] cursor-pointer hover:bg-white/[0.02]"
                            >
                              <input
                                type="checkbox"
                                checked={checklist[item.key]}
                                disabled={
                                  selectedBooking.status !== 'Confirmed' &&
                                  selectedBooking.status !== 'Approved'
                                }
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
                          {(selectedBooking.status === 'Confirmed' ||
                            selectedBooking.status === 'Approved') && (
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
                            const canEdit =
                              selectedBooking.status === 'Confirmed' ||
                              selectedBooking.status === 'Approved';

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
                              Quy chuẩn Bảo mật Định danh Motorent: Không giữ giấy tờ gốc • Mã hóa AES-256-GCM
                            </p>
                            <p className="text-[#FFC799]/80 text-[11px] mt-0.5">
                              Hồ sơ định danh của khách đặt xe được lưu trữ mã hóa chuẩn AES-256-GCM chống xâm nhập và hiển thị nguyên bản rõ nét khi nhân viên được phân quyền đối chiếu.
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
                              disabled={
                                selectedBooking.status !== 'Confirmed' &&
                                selectedBooking.status !== 'Approved'
                              }
                              className="text-[11px] text-[#FF8080] hover:text-[#FF8080] flex items-center space-x-1 font-semibold"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Xóa ký lại</span>
                            </button>
                          )}
                        </div>

                        {selectedBooking.status === 'Confirmed' ||
                        selectedBooking.status === 'Approved' ? (
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
                      {selectedBooking.status === 'Confirmed' ||
                      selectedBooking.status === 'Approved' ? (
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
                          Đơn hàng hiện ở trạng thái:{' '}
                          <strong className="text-white">{selectedBooking.status}</strong> (Chỉ thực hiện
                          Check-in khi trạng thái là Confirmed / Approved).
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Check-out Process */}
                  {activeTab === 'checkout' && (
                    <div className="p-6 space-y-5">
                      {/* ODO & Fuel Level Inspection on Return (UC-57) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* End Odometer */}
                        <div>
                          <label className="block text-xs font-semibold text-[#A0A0A0] mb-1 flex items-center">
                            <Gauge className="w-4 h-4 text-[#FFC799] mr-1.5" />
                            Chỉ số ODO công-tơ-mét khi thu hồi xe (km)
                          </label>
                          <input
                            type="number"
                            min={selectedBooking.startOdometer || 0}
                            value={endOdo || ''}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => setEndOdo(e.target.value === '' ? 0 : Number(e.target.value))}
                            disabled={selectedBooking.status !== 'Ongoing'}
                            className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none focus:border-[#FFC799] disabled:opacity-50"
                          />
                          <p className="text-[11px] text-[#A0A0A0] mt-1">
                            Đã di chuyển: ~{Math.max(0, endOdo - (selectedBooking.startOdometer || 0))} km
                            (Lúc giao: {selectedBooking.startOdometer || 0} km).
                          </p>
                        </div>

                        {/* Return Fuel Level */}
                        <div>
                          <label className="block text-xs font-semibold text-[#A0A0A0] mb-1 flex items-center justify-between">
                            <span className="flex items-center">
                              <Gauge className="w-4 h-4 text-[#FFC799] mr-1.5" />
                              Mức nhiên liệu / Xăng khi nhận lại
                            </span>
                            <span className="text-xs font-bold text-[#FFC799]">{endFuel}</span>
                          </label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {['100%', '75%', '50%', '25%'].map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                disabled={selectedBooking.status !== 'Ongoing'}
                                onClick={() => setEndFuel(lvl)}
                                className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all border ${
                                  endFuel === lvl
                                    ? 'bg-[#FFC799] text-[#101010] border-[#FFC799]'
                                    : 'bg-[#101010] text-[#A0A0A0] border-white/10 hover:border-white/20 hover:text-white'
                                }`}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                          <p className="text-[11px] text-[#A0A0A0] mt-1">
                            Đối chiếu mức xăng lúc bàn giao ({selectedBooking.startFuelLevel || '100%'}).
                          </p>
                        </div>
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
                                    <span className="text-[10px] font-semibold text-[#FFC799]">
                                      Chờ chụp thu hồi
                                    </span>
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
                                                  if (file)
                                                    handleAnglePhotoUpload('checkout', angle.index, file);
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

                      {/* Damage & Additional fee input (UC-58) */}
                      <div className="p-4 rounded-xl border border-white/10 bg-[#101010] space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-white flex items-center">
                            <DollarSign className="w-3.5 h-3.5 text-[#FFC799] mr-1" />
                            Hư hại & Phụ phí phát sinh
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setDamageDesc('');
                              setDamageAmount(damageFee || 0);
                              setDamagePhotoUrl('');
                              setShowDamageModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#FF8080]/10 hover:bg-[#FF8080]/20 border border-[#FF8080]/30 text-[11px] font-bold text-[#FF8080] transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Lập biên bản sự cố / Hư hại (UC-58)</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-medium text-[#A0A0A0] mb-1">
                              Tổng phụ phí bồi thường (VNĐ)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="10000"
                              value={damageFee}
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) => setDamageFee(Number(e.target.value))}
                              disabled={selectedBooking.status !== 'Ongoing'}
                              className="w-full bg-[#161616] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                            />
                            <p className="text-[10px] text-[#A0A0A0] mt-1">0 đ nếu phương tiện nguyên vẹn</p>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-[#A0A0A0] mb-1 flex items-center">
                              <Clock className="w-3.5 h-3.5 text-[#FFC799] mr-1" />
                              Ghi chú tình trạng xe lúc thu hồi
                            </label>
                            <input
                              type="text"
                              placeholder="VD: Xe nguyên vẹn, đầy bình xăng..."
                              value={returnNotes}
                              onChange={(e) => setReturnNotes(e.target.value)}
                              disabled={selectedBooking.status !== 'Ongoing'}
                              className="w-full bg-[#161616] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-[#6E6E6E] disabled:opacity-50"
                            />
                            <p className="text-[10px] text-[#A0A0A0] mt-1">Ghi chú lưu biên bản tất toán</p>
                          </div>
                        </div>

                        {/* Display recorded damage history if any */}
                        {selectedBooking.damageRecords && selectedBooking.damageRecords.length > 0 && (
                          <div className="pt-2 border-t border-white/5 space-y-1.5">
                            <span className="text-[10px] uppercase font-bold text-[#FF8080] tracking-wider">
                              Lịch sử biên bản sự cố đã lập:
                            </span>
                            <div className="space-y-1">
                              {selectedBooking.damageRecords.map((rec, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 rounded-lg bg-black/40 border border-white/5 text-[11px] flex items-center justify-between"
                                >
                                  <span className="text-[#F5F5F5]">{rec.description}</span>
                                  <span className="font-bold text-[#FF8080]">
                                    +{rec.damageFee.toLocaleString('vi-VN')} đ
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Settlement Summary Box (UC-59: Penalty auto-calculation 30,000/hr + damage) */}
                      {(() => {
                        const returnDate = new Date(selectedBooking.returnDateTime);
                        const now = new Date();
                        const overdueMs = now.getTime() - returnDate.getTime();
                        const graceMinutes = 15;
                        const isOverdueNow = overdueMs > graceMinutes * 60 * 1000;
                        const overdueMinutes = Math.max(0, Math.floor(overdueMs / (60 * 1000)));
                        const overdueHoursCeil = isOverdueNow ? Math.ceil(overdueMs / (3600 * 1000)) : 0;
                        const dynamicLateFee =
                          selectedBooking.lateFee !== undefined && selectedBooking.lateFee > 0
                            ? selectedBooking.lateFee
                            : isOverdueNow
                            ? overdueHoursCeil * 30000
                            : 0;
                        const totalDue =
                          (selectedBooking.remainingAmount || 0) + dynamicLateFee + (damageFee || 0);

                        return (
                          <div className="p-4 bg-[#101010] rounded-2xl border border-[#FFC799]/20 space-y-2.5 text-xs">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                                <Receipt className="w-3.5 h-3.5 text-[#FFC799]" />
                                Bảng kê tất toán & Phạt vi phạm (UC-59)
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isOverdueNow
                                    ? 'bg-[#FF8080]/15 text-[#FF8080] border border-[#FF8080]/30'
                                    : 'bg-[#99FFE4]/15 text-[#99FFE4] border border-[#99FFE4]/30'
                                }`}
                              >
                                {isOverdueNow ? `Trễ hẹn +${overdueMinutes}p` : 'Đúng hạn (15p ân hạn)'}
                              </span>
                            </div>

                            <div className="flex justify-between text-[#A0A0A0]">
                              <span>Tiền thuê còn lại (70%):</span>
                              <span className="font-bold text-white">
                                {(selectedBooking.remainingAmount || 0).toLocaleString('vi-VN')} đ
                              </span>
                            </div>

                            <div className="flex justify-between text-[#A0A0A0]">
                              <span className="flex items-center gap-1">
                                <span>Phụ thu trễ hẹn (30.000đ/giờ quá hạn):</span>
                                {isOverdueNow && (
                                  <span className="text-[10px] text-[#FFC799] font-medium">
                                    ({overdueHoursCeil} giờ)
                                  </span>
                                )}
                              </span>
                              <span className={`font-bold ${isOverdueNow ? 'text-[#FF8080]' : 'text-white'}`}>
                                {dynamicLateFee > 0 ? `+${dynamicLateFee.toLocaleString('vi-VN')} đ` : '0 đ'}
                              </span>
                            </div>

                            {damageFee > 0 && (
                              <div className="flex justify-between text-[#FF8080]">
                                <span>Phụ phí hư hại / Bồi thường xe:</span>
                                <span className="font-bold">+{damageFee.toLocaleString('vi-VN')} đ</span>
                              </div>
                            )}

                            <div className="pt-2 border-t border-white/10 flex justify-between items-baseline text-sm">
                              <span className="font-bold text-white uppercase text-xs">
                                Tổng số tiền khách thanh toán tại quầy:
                              </span>
                              <span className="text-lg font-black text-[#FFC799]">
                                {totalDue.toLocaleString('vi-VN')} đ
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Complete Checkout Button */}
                      {selectedBooking.status === 'Ongoing' ? (
                        <button
                          type="button"
                          onClick={handleCheckoutSubmit}
                          disabled={submitting}
                          className="w-full py-3.5 bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] font-bold rounded-xl text-xs shadow-lg shadow-black/50 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
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
                          Đơn hàng hiện ở trạng thái:{' '}
                          <strong className="text-white">{selectedBooking.status}</strong> (Chỉ thực hiện
                          Check-out khi trạng thái là Ongoing).
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
                      const displayName = customer.firstName
                        ? `${customer.firstName} ${customer.lastName || ''}`.trim()
                        : customer.username;
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
                              <span className="font-bold text-white text-xs truncate">{displayName}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFC799]/15 text-[#FFC799] border border-[#FFC799]/20">
                                Chờ duyệt
                              </span>
                            </div>
                            <p className="text-[11px] text-[#A0A0A0] mt-0.5 truncate">
                              {customer.phoneNumber || customer.email || `@${customer.username}`}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-[#6E6E6E] mt-2">
                              <span>
                                Gửi:{' '}
                                {new Date(
                                  customer.updatedAt || customer.createdAt || Date.now()
                                ).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
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
                          (selectedEkycUser.firstName || selectedEkycUser.username || 'U')
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">
                          {selectedEkycUser.firstName
                            ? `${selectedEkycUser.firstName} ${selectedEkycUser.lastName || ''}`.trim()
                            : selectedEkycUser.username}
                        </h2>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#A0A0A0] mt-0.5">
                          <span>@{selectedEkycUser.username}</span>
                          <span>•</span>
                          <span>{selectedEkycUser.phoneNumber || 'Chưa cập nhật SĐT'}</span>
                          <span>•</span>
                          <span>{selectedEkycUser.email || 'Email chưa cung cấp'}</span>
                          {selectedEkycUser.idCardNumber && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[#99FFE4]">
                                CCCD: {selectedEkycUser.idCardNumber}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#99FFE4]/10 border border-[#99FFE4]/25 text-[#99FFE4] text-xs self-start sm:self-auto">
                      <Lock className="w-3.5 h-3.5 text-[#99FFE4]" />
                      <span>Mã hóa AES-256-GCM • NĐ 13/2023/NĐ-CP</span>
                    </div>
                  </div>

                  {/* 4 Documents Grid */}
                  <div>
                    <h3 className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider mb-3">
                      Tài liệu định danh nguyên bản & Ảnh đối chiếu (Truyền tải qua Bearer Stream)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                          key: 'drivingLicense',
                          label: '3. Giấy phép lái xe',
                          modalTitle: 'Giấy phép lái xe (A1/A2)',
                        },
                        {
                          key: 'selfiePhoto',
                          label: '4. Ảnh chân dung thực tế',
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
                              <Eye className="w-3.5 h-3.5 text-[#6E6E6E] group-hover:text-[#FFC799] transition-colors" />
                            </div>
                            <div className="w-full h-44 bg-[#101010] rounded-lg overflow-hidden relative border border-white/10 flex items-center justify-center p-1">
                              <SecureEkycImage
                                src={docUrl}
                                alt={docItem.label}
                                versionKey={selectedEkycUser.updatedAt || selectedEkycUser._id}
                                className="w-full h-full object-contain rounded"
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
                        className="w-full sm:w-auto px-6 py-2.5 bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] font-bold rounded-xl text-xs shadow-md shadow-black/50 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                      >
                        {reviewLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Đang phê duyệt hồ sơ...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Phê duyệt eKYC (Giữ nguyên bản rõ nét • Mã hóa AES-256)</span>
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
        ) : deskMode === 'complaints' ? (
          <div className="space-y-4">
            {isManager && (
              <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
                <button
                  type="button"
                  onClick={() => setComplaintSubTab('manager')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                    complaintSubTab === 'manager'
                      ? 'bg-[#FFC799] text-[#101010] shadow-sm font-black'
                      : 'bg-[#161616] text-[#A0A0A0] hover:text-white border border-white/10'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>01. Cần kết luận (Manager UC-85)</span>
                  {pendingComplaintCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#FF8080] text-[#101010] font-mono text-[10px] font-black">
                      {pendingComplaintCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setComplaintSubTab('queue')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                    complaintSubTab === 'queue'
                      ? 'bg-[#FFC799] text-[#101010] shadow-sm font-black'
                      : 'bg-[#161616] text-[#A0A0A0] hover:text-white border border-white/10'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>02. Hàng đợi tiếp nhận &amp; xử lý (Staff UC-65)</span>
                </button>
              </div>
            )}

            {isManager && complaintSubTab === 'manager' ? (
              <ManagerComplaintWorkspace onPendingCountChange={setPendingComplaintCount} />
            ) : (
              <StaffComplaintDesk />
            )}
          </div>
        ) : deskMode === 'chat' ? (
          <StaffChatConsole />
        ) : deskMode === 'banners' ? (
          <BannerManager />
        ) : deskMode === 'audit' ? (
          <AuditLogViewer />
        ) : deskMode === 'shifts' ? (
          <ShiftCalendarView />
        ) : deskMode === 'staff' ? (
          <StaffManager />
        ) : deskMode === 'reports' ? (
          <ReportsCenter />
        ) : (
          /* UC-61-63: Vehicle Fleet & Status Management Tab */
          <div className="space-y-6">
            {/* Status Metric Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#161616] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-wider">
                    Tổng đội xe trạm
                  </p>
                  <p className="text-2xl font-black text-white mt-1">{branchVehicles.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                  <Gauge className="w-5 h-5 text-[#FFC799]" />
                </div>
              </div>

              <div className="bg-[#161616] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-wider">
                    Sẵn sàng nhận khách
                  </p>
                  <p className="text-2xl font-black text-[#99FFE4] mt-1">
                    {branchVehicles.filter((v) => v.status === 'Available').length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#99FFE4]/10 border border-[#99FFE4]/20 flex items-center justify-center text-[#99FFE4]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#161616] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-wider">
                    Đang cho thuê (Tour)
                  </p>
                  <p className="text-2xl font-black text-blue-400 mt-1">
                    {branchVehicles.filter((v) => v.status === 'Rented').length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#161616] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-wider">
                    Đang bảo dưỡng / Sửa
                  </p>
                  <p className="text-2xl font-black text-amber-400 mt-1">
                    {branchVehicles.filter((v) => v.status === 'Maintenance').length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Wrench className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-[#161616] p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo biển số, mẫu xe, hãng sản xuất..."
                  value={vehicleSearchQuery}
                  onChange={(e) => setVehicleSearchQuery(e.target.value)}
                  className="w-full bg-[#101010] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-[#6E6E6E] outline-none focus:border-[#FFC799]"
                />
                {vehicleSearchQuery && (
                  <button
                    onClick={() => setVehicleSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                {(
                  [
                    { id: 'all', label: 'Tất cả' },
                    { id: 'Available', label: 'Sẵn sàng' },
                    { id: 'Rented', label: 'Đang thuê' },
                    { id: 'Maintenance', label: 'Bảo dưỡng' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setVehicleFilterStatus(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      vehicleFilterStatus === tab.id
                        ? 'bg-[#FFC799] text-[#101010]'
                        : 'bg-[#101010] text-[#A0A0A0] hover:text-white border border-white/10'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Cards Grid */}
            {loadingVehicles ? (
              <div className="bg-[#161616] rounded-2xl border border-white/10 p-12 text-center text-xs text-[#A0A0A0] flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#FFC799]" />
                <span>Đang tải danh sách phương tiện tại chi nhánh...</span>
              </div>
            ) : (
              (() => {
                const filtered = branchVehicles.filter((v) => {
                  if (vehicleFilterStatus !== 'all' && v.status !== vehicleFilterStatus) {
                    return false;
                  }
                  if (vehicleSearchQuery.trim()) {
                    const q = vehicleSearchQuery.toLowerCase();
                    const plate = (v.licensePlate || '').toLowerCase();
                    const model = (v.vehicleModel || '').toLowerCase();
                    const brand = (v.brand || '').toLowerCase();
                    return plate.includes(q) || model.includes(q) || brand.includes(q);
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="bg-[#161616] rounded-2xl border border-white/10 p-12 text-center text-xs text-[#A0A0A0]">
                      Không tìm thấy phương tiện nào phù hợp với bộ lọc hiện tại.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((v) => {
                      const img = getOptimizedVehicleImageUrl(v.images?.[0]);
                      const isAvailable = v.status === 'Available';
                      const isRented = v.status === 'Rented';
                      const isMaintenance = v.status === 'Maintenance';

                      return (
                        <div
                          key={v._id}
                          className="bg-[#161616] border border-white/10 hover:border-white/20 rounded-2xl overflow-hidden transition-all shadow-lg flex flex-col justify-between"
                        >
                          <div>
                            {/* Card Image and Status Badge */}
                            <div className="relative h-44 bg-[#101010] overflow-hidden">
                              <img
                                src={img}
                                alt={v.vehicleModel}
                                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                onError={(e) => {
                                  e.currentTarget.src =
                                    'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&auto=format&fit=crop&q=80';
                                }}
                              />
                              <div className="absolute top-3 left-3 bg-[#101010]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/15">
                                <span className="font-mono font-black text-xs text-white tracking-widest uppercase">
                                  {v.licensePlate}
                                </span>
                              </div>

                              <div className="absolute top-3 right-3">
                                {isAvailable && (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-[#99FFE4]/20 border border-[#99FFE4]/40 text-[#99FFE4] backdrop-blur-md">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#99FFE4] animate-pulse"></span>
                                    <span>SẴN SÀNG</span>
                                  </span>
                                )}
                                {isRented && (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-500/20 border border-blue-500/40 text-blue-400 backdrop-blur-md">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                                    <span>ĐANG THUÊ</span>
                                  </span>
                                )}
                                {isMaintenance && (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 border border-amber-500/40 text-amber-400 backdrop-blur-md">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                    <span>BẢO DƯỠNG</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-4 space-y-3">
                              <div>
                                <p className="text-[11px] font-bold text-[#FFC799] uppercase tracking-wider">
                                  {v.brand}
                                </p>
                                <h3 className="text-base font-extrabold text-white truncate">
                                  {v.vehicleModel}
                                </h3>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px] text-[#A0A0A0]">
                                <div className="flex items-center space-x-1.5 bg-[#101010] px-2.5 py-1.5 rounded-lg border border-white/5">
                                  <Gauge className="w-3.5 h-3.5 text-[#FFC799]" />
                                  <span className="font-semibold text-white">
                                    {(v.odometer || 0).toLocaleString('vi-VN')} km
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1.5 bg-[#101010] px-2.5 py-1.5 rounded-lg border border-white/5">
                                  <DollarSign className="w-3.5 h-3.5 text-[#99FFE4]" />
                                  <span className="font-semibold text-white">
                                    {(v.dailyPrice || 0).toLocaleString('vi-VN')} đ/ng
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Toolbar */}
                          <div className="p-4 pt-0 border-t border-white/5 mt-2 space-y-2">
                            <p className="text-[10px] font-bold text-[#6E6E6E] uppercase tracking-wider">
                              Thao tác đổi trạng thái (UC-61-63)
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                disabled={isAvailable || vehicleSubmitting}
                                onClick={() => handleUpdateVehicleStatus(v._id, 'Available')}
                                className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                                  isAvailable
                                    ? 'bg-white/5 text-[#6E6E6E] cursor-not-allowed border border-white/5'
                                    : 'bg-[#99FFE4]/15 hover:bg-[#99FFE4]/25 text-[#99FFE4] border border-[#99FFE4]/30'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Sẵn sàng</span>
                              </button>

                              <button
                                type="button"
                                disabled={isMaintenance || vehicleSubmitting}
                                onClick={() =>
                                  setVehicleActionModal({
                                    vehicle: v,
                                    targetStatus: 'Maintenance',
                                    reason: 'Bảo dưỡng định kỳ / Kiểm tra phanh lốp dầu nhớt',
                                    maintenanceType: 'Routine',
                                    cost: 0,
                                    odometer: v.odometer || 0,
                                  })
                                }
                                className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                                  isMaintenance
                                    ? 'bg-white/5 text-[#6E6E6E] cursor-not-allowed border border-white/5'
                                    : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                <Wrench className="w-3.5 h-3.5" />
                                <span>Bảo dưỡng</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}

            {/* Maintenance Action Dialog Modal */}
            {vehicleActionModal && (
              <div
                onClick={() => setVehicleActionModal(null)}
                className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#161616] border border-white/15 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
                >
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      <span className="font-extrabold text-sm text-white">
                        Lập phiếu bảo dưỡng xe ({vehicleActionModal.vehicle.licensePlate})
                      </span>
                    </div>
                    <button
                      onClick={() => setVehicleActionModal(null)}
                      className="text-[#A0A0A0] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="bg-[#101010] p-3 rounded-xl border border-white/10 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">
                          {vehicleActionModal.vehicle.brand} {vehicleActionModal.vehicle.vehicleModel}
                        </p>
                        <p className="text-[11px] text-[#A0A0A0]">
                          ODO hiện tại: {(vehicleActionModal.vehicle.odometer || 0).toLocaleString('vi-VN')} km
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-black">
                        {vehicleActionModal.vehicle.licensePlate}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#A0A0A0] mb-1.5">
                        Loại hình bảo dưỡng (Maintenance Type):
                      </label>
                      <select
                        value={vehicleActionModal.maintenanceType}
                        onChange={(e) =>
                          setVehicleActionModal({
                            ...vehicleActionModal,
                            maintenanceType: e.target.value as 'Routine' | 'Repair' | 'Inspection',
                          })
                        }
                        className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#FFC799]"
                      >
                        <option value="Routine">
                          Routine - Bảo dưỡng định kỳ (Thay nhớt, lọc gió, kiểm tra lốp)
                        </option>
                        <option value="Repair">Repair - Khắc phục sự cố / Sửa chữa hỏng hóc</option>
                        <option value="Inspection">Inspection - Kiểm định an toàn kỹ thuật</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#A0A0A0] mb-1.5">
                        Lý do & Mô tả sự cố kỹ thuật (Bắt buộc):
                      </label>
                      <textarea
                        rows={3}
                        value={vehicleActionModal.reason}
                        onChange={(e) =>
                          setVehicleActionModal({
                            ...vehicleActionModal,
                            reason: e.target.value,
                          })
                        }
                        placeholder="VD: Kiểm tra phanh sau bị mòn, thay dầu máy mốc 5.000km..."
                        className="w-full bg-[#101010] border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-[#6E6E6E] outline-none focus:border-[#FFC799]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#A0A0A0] mb-1.5">
                          Số ODO ghi nhận (km):
                        </label>
                        <input
                          type="number"
                          value={vehicleActionModal.odometer}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) =>
                            setVehicleActionModal({
                              ...vehicleActionModal,
                              odometer: Number(e.target.value),
                            })
                          }
                          className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#FFC799]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#A0A0A0] mb-1.5">
                          Chi phí bảo dưỡng (đ):
                        </label>
                        <input
                          type="number"
                          value={vehicleActionModal.cost}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) =>
                            setVehicleActionModal({
                              ...vehicleActionModal,
                              cost: Number(e.target.value),
                            })
                          }
                          className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#FFC799]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-white/10 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setVehicleActionModal(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-[#A0A0A0] hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      disabled={vehicleSubmitting || !vehicleActionModal.reason.trim()}
                      onClick={() =>
                        handleUpdateVehicleStatus(
                          vehicleActionModal.vehicle._id,
                          vehicleActionModal.targetStatus,
                          {
                            reason: vehicleActionModal.reason,
                            maintenanceType: vehicleActionModal.maintenanceType,
                            cost: vehicleActionModal.cost,
                            odometer: vehicleActionModal.odometer,
                          }
                        )
                      }
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#FFC799] text-[#101010] hover:bg-[#FFD6B3] transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      {vehicleSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <>
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Xác nhận chuyển sang Bảo dưỡng</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
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
                  setPreviewZoom((prev) =>
                    Math.min(4, Math.max(0.5, Number((prev + delta).toFixed(2))))
                  );
                }}
                className="p-6 bg-[#101010] flex items-center justify-center max-h-[80vh] overflow-auto cursor-zoom-in"
              >
                <SecureEkycImage
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
                    <h3 className="font-bold text-sm text-white">
                      Ghi nhận thu tiền tại quầy (UC-31)
                    </h3>
                    <p className="text-[11px] text-[#A0A0A0]">
                      Đơn đặt xe #{selectedBooking.bookingCode}
                    </p>
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
                      {getEffectivePaidAmount(selectedBooking).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[#A0A0A0] text-[11px]">Còn lại cần thu:</span>
                    <span className="font-extrabold text-[#FFC799] text-base">
                      {getEffectivePayableBalance(selectedBooking).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1.5">
                    Số tiền thu thực tế (VNĐ) <span className="text-[#FF8080]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max={getEffectivePayableBalance(selectedBooking)}
                      value={counterPayAmount}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => setCounterPayAmount(Number(e.target.value))}
                      className="w-full pl-3.5 pr-14 py-2.5 bg-[#101010] border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-[#FFC799]"
                      required
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-semibold text-[#A0A0A0]">
                      VNĐ
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {selectedBooking.status === 'Pending' &&
                      !selectedBooking.depositPaid &&
                      (selectedBooking.paidAmount || 0) === 0 &&
                      (selectedBooking.depositAmount || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => setCounterPayAmount(selectedBooking.depositAmount || 0)}
                          className="px-2.5 py-1 bg-[#99FFE4]/10 hover:bg-[#99FFE4]/20 rounded-lg text-[11px] font-semibold text-[#99FFE4] border border-[#99FFE4]/30 cursor-pointer"
                        >
                          Thu cọc 30% ({(selectedBooking.depositAmount || 0).toLocaleString('vi-VN')} đ)
                        </button>
                      )}
                    <button
                      type="button"
                      onClick={() => setCounterPayAmount(getEffectivePayableBalance(selectedBooking))}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[11px] font-medium text-[#FFC799] border border-white/10 cursor-pointer"
                    >
                      Thu đủ 100% ({getEffectivePayableBalance(selectedBooking).toLocaleString('vi-VN')} đ)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCounterPayAmount(
                          Math.round(getEffectivePayableBalance(selectedBooking) / 2)
                        )
                      }
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[11px] font-medium text-[#A0A0A0] hover:text-white border border-white/10 cursor-pointer"
                    >
                      Thu 50%
                    </button>
                  </div>
                </div>

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

        {/* Modal Record Damage (UC-58) */}
        {showDamageModal && selectedBooking && (
          <div
            onClick={() => setShowDamageModal(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#161616] border border-white/15 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-[#FF8080]/10 text-[#FF8080] rounded-xl border border-[#FF8080]/20">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      Lập biên bản sự cố / Hư hại xe (UC-58)
                    </h3>
                    <p className="text-[11px] text-[#A0A0A0]">
                      Đơn đặt xe #{selectedBooking.bookingCode}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDamageModal(false)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#A0A0A0] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRecordDamageSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1.5">
                    Mô tả chi tiết sự cố / Hư hại phương tiện <span className="text-[#FF8080]">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="VD: Trầy xước cánh yếm bên phải, gãy gương chiếu hậu trái, móp đuôi xe..."
                    value={damageDesc}
                    onChange={(e) => setDamageDesc(e.target.value)}
                    className="w-full p-3 bg-[#101010] border border-white/10 rounded-xl text-xs text-white placeholder:text-[#6E6E6E] outline-none focus:border-[#FFC799]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1.5">
                    Chi phí bồi thường hư hại (VNĐ) <span className="text-[#FF8080]">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={damageAmount}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => setDamageAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#101010] border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-[#FFC799]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1.5">
                    Mức độ nghiêm trọng
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'Minor' as const, label: 'Nhẹ (Vết xước)' },
                      { key: 'Moderate' as const, label: 'Vừa (Cần sửa)' },
                      { key: 'Severe' as const, label: 'Nặng (Bảo dưỡng)' },
                    ].map((sev) => (
                      <button
                        key={sev.key}
                        type="button"
                        onClick={() => setDamageSeverity(sev.key)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                          damageSeverity === sev.key
                            ? 'bg-[#FF8080]/15 border-[#FF8080] text-[#FF8080]'
                            : 'bg-[#101010] border-white/10 text-[#A0A0A0] hover:text-white'
                        }`}
                      >
                        {sev.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1.5">
                    Hình ảnh hiện trường / Vết hỏng (URL ảnh)
                  </label>
                  <input
                    type="url"
                    placeholder="https://... ảnh hiện trường sự cố"
                    value={damagePhotoUrl}
                    onChange={(e) => setDamagePhotoUrl(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#101010] border border-white/10 rounded-xl text-xs text-white placeholder:text-[#6E6E6E] outline-none focus:border-[#FFC799]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowDamageModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#A0A0A0] hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={damageSubmitting}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#FF8080] hover:bg-[#FF9999] text-[#101010] transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {damageSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Lưu biên bản sự cố</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* UC-74: Reject Order Modal */}
        {showRejectModal && selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#161616] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF8080]/15 border border-[#FF8080]/30 flex items-center justify-center text-[#FF8080]">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Từ chối đơn đặt xe (UC-74)</h3>
                    <p className="text-xs text-[#A0A0A0]">Mã đơn: {selectedBooking.bookingCode}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="text-[#6E6E6E] hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#A0A0A0] space-y-1">
                <p className="font-semibold text-white">Quy chuẩn từ chối đơn của Quản lý chi nhánh:</p>
                <p>
                  • Lý do từ chối là <strong>bắt buộc</strong> và sẽ được gửi thông báo trực tiếp đến
                  khách hàng.
                </p>
                <p>
                  • Nếu khách đã thanh toán cọc/toàn bộ, hệ thống sẽ tự động kích hoạt tiến trình hoàn
                  tiền 100%.
                </p>
              </div>

              <form onSubmit={handleRejectBooking} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A0A0A0] mb-1.5">
                    Lý do từ chối đơn đặt xe <span className="text-[#FF8080]">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Ví dụ: Xe cần bảo dưỡng đột xuất, khách hàng không đủ điều kiện giấy phép..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full bg-[#101010] border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-[#6E6E6E] outline-none focus:border-[#FF8080]"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(false)}
                    disabled={rejecting}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#A0A0A0] hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={rejecting || !rejectReason.trim()}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#FF8080] hover:bg-[#FF8080]/80 text-[#101010] transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {rejecting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Xác nhận từ chối</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* UC-75: Approve Refund Modal */}
        {approveRefundModal && (
          <div
            onClick={() => setApproveRefundModal(null)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#161616] border border-white/15 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#99FFE4]" />
                  <span className="font-extrabold text-sm text-white">
                    Phê duyệt hoàn tiền đơn {approveRefundModal.bookingCode}
                  </span>
                </div>
                <button
                  onClick={() => setApproveRefundModal(null)}
                  className="text-[#A0A0A0] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-[#101010] p-3 rounded-xl border border-white/10 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#A0A0A0]">Khách hàng:</span>
                    <span className="font-bold text-white">
                      {typeof approveRefundModal.userId === 'object' &&
                      approveRefundModal.userId !== null
                        ? (approveRefundModal.userId as User).firstName ||
                          (approveRefundModal.userId as User).username
                        : 'Khách hàng'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#A0A0A0]">Đã thanh toán:</span>
                    <span className="font-bold text-white">
                      {(
                        approveRefundModal.paidAmount ||
                        approveRefundModal.depositAmount ||
                        0
                      ).toLocaleString('vi-VN')}{' '}
                      đ
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-white/10">
                    <span className="text-amber-400 font-bold">Số tiền phê duyệt hoàn:</span>
                    <span className="text-[#99FFE4] font-black text-sm">
                      {(approveRefundModal.refundAmount || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A0A0A0] mb-1">
                    Ngân hàng nhận tiền hoàn (Tùy chọn):
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Vietcombank, Techcombank, MB Bank..."
                    value={refundBankName}
                    onChange={(e) => setRefundBankName(e.target.value)}
                    className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-[#6E6E6E] outline-none focus:border-[#FFC799]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A0A0A0] mb-1">
                    Số tài khoản ngân hàng:
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 1012345678"
                    value={refundBankAccount}
                    onChange={(e) => setRefundBankAccount(e.target.value)}
                    className="w-full bg-[#101010] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-[#6E6E6E] outline-none focus:border-[#FFC799]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A0A0A0] mb-1">
                    Ghi chú phê duyệt / Mã giao dịch hoàn tiền:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VD: Đã duyệt hoàn tiền 100% theo chính sách BR-06 hủy trước 24h..."
                    value={refundNote}
                    onChange={(e) => setRefundNote(e.target.value)}
                    className="w-full bg-[#101010] border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-[#6E6E6E] outline-none focus:border-[#FFC799]"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-white/10 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setApproveRefundModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#A0A0A0] hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={approvingRefund}
                  onClick={handleApproveRefund}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#FFC799] text-[#101010] hover:bg-[#FFD6B3] transition-colors flex items-center space-x-1.5"
                >
                  {approvingRefund ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang duyệt...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Xác nhận Duyệt hoàn tiền</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* UC-76: Reject Refund Modal */}
        {rejectRefundModal && (
          <div
            onClick={() => setRejectRefundModal(null)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#161616] border border-white/15 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-[#FF8080]" />
                  <span className="font-extrabold text-sm text-white">
                    Từ chối yêu cầu hoàn tiền ({rejectRefundModal.bookingCode})
                  </span>
                </div>
                <button
                  onClick={() => setRejectRefundModal(null)}
                  className="text-[#A0A0A0] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-[#101010] p-3 rounded-xl border border-white/10 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#A0A0A0]">Khách hàng:</span>
                    <span className="font-bold text-white">
                      {typeof rejectRefundModal.userId === 'object' &&
                      rejectRefundModal.userId !== null
                        ? (rejectRefundModal.userId as User).firstName ||
                          (rejectRefundModal.userId as User).username
                        : 'Khách hàng'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A0A0A0]">Số tiền yêu cầu hoàn:</span>
                    <span className="text-amber-400 font-bold">
                      {(rejectRefundModal.refundAmount || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A0A0A0] mb-1.5">
                    Lý do từ chối hoàn tiền (Bắt buộc):
                  </label>
                  <textarea
                    rows={3}
                    placeholder="VD: Khách báo hủy sau giờ nhận xe, theo điều khoản hợp đồng không đủ điều kiện hoàn trả cọc..."
                    value={refundDenyReason}
                    onChange={(e) => setRefundDenyReason(e.target.value)}
                    className="w-full bg-[#101010] border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-[#6E6E6E] outline-none focus:border-[#FF8080]"
                  />
                  <p className="text-[10px] text-[#6E6E6E] mt-1">
                    Lý do từ chối sẽ được gửi trực tiếp thông báo đến tài khoản khách hàng.
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-white/10 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRejectRefundModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#A0A0A0] hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={rejectingRefund || !refundDenyReason.trim()}
                  onClick={handleRejectRefund}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#FF8080] text-white hover:bg-[#FF6666] transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {rejectingRefund ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang từ chối...</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Xác nhận Từ chối</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
