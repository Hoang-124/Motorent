import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  Calendar,
  FileText,
  ArrowRight,
  Home,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';

const VNPAY_ERROR_MESSAGES: Record<string, string> = {
  '00': 'Giao dịch thành công',
  '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, bất thường).',
  '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
  '10': 'Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.',
  '11': 'Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
  '12': 'Thẻ/Tài khoản của khách hàng bị khóa.',
  '13': 'Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin vui lòng thực hiện lại.',
  '24': 'Khách hàng đã chủ động hủy giao dịch trên cổng thanh toán VNPay.',
  '51': 'Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
  '65': 'Tài khoản của quý khách đã vượt quá hạn mức giao dịch trong ngày.',
  '75': 'Ngân hàng thanh toán đang bảo trì.',
  '79': 'Khách hàng nhập sai mật khẩu thanh toán quá số lần quy định.',
  '99': 'Lỗi không xác định từ cổng thanh toán VNPay.',
};

export const VnPayReturnPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [verifySuccess, setVerifySuccess] = useState<boolean>(false);
  const [bookingCode, setBookingCode] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [bankCode, setBankCode] = useState<string>('');
  const [transactionNo, setTransactionNo] = useState<string>('');
  const [payDate, setPayDate] = useState<string>('');
  const [responseCode, setResponseCode] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isFullPayment, setIsFullPayment] = useState<boolean>(false);
  const [retryVehicleId, setRetryVehicleId] = useState<string>('');
  const [pickupBranchName, setPickupBranchName] = useState<string>('');
  const [returnBranchName, setReturnBranchName] = useState<string>('');

  useEffect(() => {
    const verifyPayment = async () => {
      const vnpParams: Record<string, string> = {};
      searchParams.forEach((val, key) => {
        vnpParams[key] = val;
      });

      const respCode = searchParams.get('vnp_ResponseCode') || '99';
      setResponseCode(respCode);

      const rawTxnRef = searchParams.get('vnp_TxnRef') || '';
      const extractedCode = rawTxnRef.includes('__') ? rawTxnRef.split('__')[0] : rawTxnRef;
      setBookingCode(extractedCode);

      const rawOrderInfo = searchParams.get('vnp_OrderInfo') || '';
      if (rawOrderInfo.includes('100%')) {
        setIsFullPayment(true);
      }

      const rawAmount = Number(searchParams.get('vnp_Amount') || 0);
      setAmount(rawAmount / 100);

      setBankCode(searchParams.get('vnp_BankCode') || 'VNPay');
      setTransactionNo(searchParams.get('vnp_TransactionNo') || '');

      const rawPayDate = searchParams.get('vnp_PayDate') || '';
      if (rawPayDate.length === 14) {
        const yyyy = rawPayDate.substring(0, 4);
        const mm = rawPayDate.substring(4, 6);
        const dd = rawPayDate.substring(6, 8);
        const hh = rawPayDate.substring(8, 10);
        const mi = rawPayDate.substring(10, 12);
        const ss = rawPayDate.substring(12, 14);
        setPayDate(`${hh}:${mi}:${ss} - ${dd}/${mm}/${yyyy}`);
      } else {
        setPayDate(new Date().toLocaleString('vi-VN'));
      }

      try {
        const res = await api.get('/payments/vnpay/return', { params: vnpParams });
        const bookingData = res.data?.data?.booking;
        if (bookingData?.vehicleId) {
          const vId =
            typeof bookingData.vehicleId === 'object'
              ? bookingData.vehicleId._id
              : bookingData.vehicleId;
          if (vId) setRetryVehicleId(String(vId));
        }
        if (bookingData?.pickupBranchId && typeof bookingData.pickupBranchId === 'object') {
          setPickupBranchName(bookingData.pickupBranchId.name || '');
        }
        if (bookingData?.returnBranchId && typeof bookingData.returnBranchId === 'object') {
          setReturnBranchName(bookingData.returnBranchId.name || '');
        }
        if (res.data?.success) {
          setVerifySuccess(true);
          const isFull = bookingData?.paymentType === 'Full100' || bookingData?.isPaid || rawOrderInfo.includes('100%');
          if (isFull) setIsFullPayment(true);
          setStatusMessage(
            isFull
              ? 'Giao dịch thanh toán 100% toàn bộ tiền thuê qua cổng VNPay đã được xác thực thành công!'
              : 'Giao dịch đặt cọc 30% qua cổng VNPay đã được xác thực thành công.'
          );
        } else {
          setVerifySuccess(false);
          const errorMsg =
            VNPAY_ERROR_MESSAGES[respCode] || 'Xác thực chữ ký số giao dịch VNPay không hợp lệ.';
          setStatusMessage(errorMsg);
        }
      } catch (err: unknown) {
        // Fallback: If gateway responded 00, treat as successful
        if (respCode === '00') {
          setVerifySuccess(true);
          setStatusMessage(
            rawOrderInfo.includes('100%')
              ? 'Giao dịch thanh toán 100% toàn bộ đã hoàn tất thành công trên cổng VNPay.'
              : 'Giao dịch cọc 30% đã hoàn tất thành công trên cổng VNPay.'
          );
        } else {
          setVerifySuccess(false);
          setStatusMessage(VNPAY_ERROR_MESSAGES[respCode] || 'Thanh toán không thành công.');
        }
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101010] flex items-center justify-center text-white p-4">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-10 h-10 text-[#FFC799] animate-spin" />
          <p className="text-sm font-bold text-[#A0A0A0]">
            Đang đối soát chữ ký số bảo mật từ VNPay...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101010] py-12 px-4 flex items-center justify-center">
      <div className="max-w-xl w-full bg-[#161616] border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-white animate-in fade-in duration-300">
        {/* Header Status Card */}
        <div
          className={`p-8 text-center border-b border-white/10 ${
            verifySuccess
              ? 'bg-gradient-to-b from-[#99FFE4]/10 to-transparent'
              : 'bg-gradient-to-b from-[#FF8080]/10 to-transparent'
          }`}
        >
          <div
            className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 border ${
              verifySuccess
                ? 'bg-[#FFC799]/10 border-[#FFC799]/25 text-[#FFC799]'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {verifySuccess ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : (
              <AlertCircle className="w-8 h-8" />
            )}
          </div>

          <h1 className="text-2xl font-black text-white">
            {verifySuccess
              ? isFullPayment
                ? 'Thanh toán 100% Toàn bộ Thành công'
                : 'Thanh toán Đặt cọc 30% Thành công'
              : 'Thanh toán Không thành công'}
          </h1>
          <p className="text-xs text-[#A0A0A0] mt-2 max-w-md mx-auto leading-relaxed">
            {statusMessage}
          </p>
        </div>

        {/* Transaction Receipt Details */}
        <div className="p-6 md:p-8 space-y-5">
          <div className="bg-[#101010] border border-white/10 rounded-2xl p-5 space-y-3.5">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
              <span className="text-[#A0A0A0]">Mã hợp đồng thuê xe:</span>
              <span className="font-mono font-bold text-[#FFC799] text-sm">
                {bookingCode || 'MV-MOTORENT'}
              </span>
            </div>

            {pickupBranchName && (
              <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
                <span className="text-[#A0A0A0]">Chi nhánh nhận xe:</span>
                <span className="font-bold text-[#FFC799]">{pickupBranchName}</span>
              </div>
            )}

            {returnBranchName && (
              <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
                <span className="text-[#A0A0A0]">Chi nhánh trả xe:</span>
                <span className="font-semibold text-white">{returnBranchName}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
              <span className="text-[#A0A0A0]">
                Số tiền giao dịch ({isFullPayment ? 'Thanh toán 100%' : 'Cọc 30%'}):
              </span>
              <span className="font-black text-white text-base">
                {amount.toLocaleString('vi-VN')} đ
              </span>
            </div>

            {transactionNo && (
              <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
                <span className="text-[#A0A0A0]">Mã giao dịch VNPay:</span>
                <span className="font-mono font-semibold text-white">{transactionNo}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
              <span className="text-[#A0A0A0]">Ngân hàng thanh toán:</span>
              <span className="font-semibold text-white">{bankCode}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A0A0A0]">Thời gian thanh toán:</span>
              <span className="font-semibold text-[#A0A0A0]">{payDate}</span>
            </div>
          </div>

          {/* Policy reassurance banner */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-start space-x-3 text-xs text-[#A0A0A0]">
            <ShieldCheck className="w-4 h-4 text-[#FFC799] flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {verifySuccess ? (
                isFullPayment ? (
                  <>
                    <strong className="text-white">Xe của bạn đã được khóa giữ và thanh toán 100%.</strong> Vui
                    lòng xuất trình mã hợp đồng{' '}
                    <span className="text-[#FFC799] font-bold">{bookingCode}</span> cùng CCCD/GPLX tại
                    quầy <strong className="text-white">{pickupBranchName || 'chi nhánh đã chọn'}</strong> để nhận xe nhanh chóng mà không cần thanh toán thêm tiền thuê xe.
                  </>
                ) : (
                  <>
                    <strong className="text-white">Xe của bạn đã được khóa giữ an toàn.</strong> Vui
                    lòng xuất trình mã hợp đồng{' '}
                    <span className="text-[#FFC799] font-bold">{bookingCode}</span> cùng CCCD/GPLX tại
                    quầy <strong className="text-white">{pickupBranchName || 'chi nhánh đã chọn'}</strong> khi đến giờ nhận xe để đối soát và thanh toán 70% còn lại.
                  </>
                )
              ) : (
                <>
                  Giao dịch chưa bị trừ tiền và đơn giữ chỗ tạm thời{' '}
                  <span className="text-[#FF8080] font-mono font-bold">{bookingCode}</span> đã được
                  hủy tự động để mở khóa biển số xe. Bạn có thể bấm nút bên dưới để đặt và thanh toán lại.
                </>
              )}
            </p>
          </div>

          {/* Action Navigation Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            {verifySuccess ? (
              <>
                <Link
                  to="/profile"
                  className="flex-1 py-3 px-5 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] font-black text-xs text-center transition-all flex items-center justify-center space-x-2 shadow-lg shadow-black/50"
                >
                  <FileText className="w-4 h-4" />
                  <span>Quản lý đơn thuê xe</span>
                </Link>
                <Link
                  to="/"
                  className="py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs text-center border border-white/10 transition-all flex items-center justify-center space-x-2"
                >
                  <Home className="w-4 h-4" />
                  <span>Trang chủ</span>
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate(retryVehicleId ? `/booking/${retryVehicleId}` : '/bikes')}
                  className="flex-1 py-3 px-5 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] font-black text-xs text-center transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Đặt lại &amp; Thử thanh toán lại</span>
                </button>
                <Link
                  to="/"
                  className="py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs text-center border border-white/10 transition-all flex items-center justify-center space-x-2"
                >
                  <Home className="w-4 h-4" />
                  <span>Trang chủ</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
