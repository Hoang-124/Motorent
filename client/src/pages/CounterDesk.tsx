import React, { useState, useEffect } from 'react';
import { 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  Gauge, 
  FileCheck, 
  PenTool, 
  DollarSign, 
  Clock, 
  RefreshCw,
  ShieldCheck,
  User,
  Phone,
  Bike
} from 'lucide-react';
import type { Booking, Vehicle } from '../types';
import { api } from '../services/api';

export const CounterDesk: React.FC = () => {
  const [searchCode, setSearchCode] = useState<string>('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'checkin' | 'checkout'>('checkin');

  // Check-in form states
  const [startOdo, setStartOdo] = useState<number>(0);
  const [checklist, setChecklist] = useState({
    tires: true,
    brakes: true,
    lights: true,
    fuel: true,
    helmets: true,
  });
  const [customerSigned, setCustomerSigned] = useState<boolean>(false);

  // Check-out form states
  const [endOdo, setEndOdo] = useState<number>(0);
  const [lateHours, setLateHours] = useState<number>(0);
  const [extraFee, setExtraFee] = useState<number>(0);
  const [checkoutNotes, setCheckoutNotes] = useState<string>('');

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings');
      if (res.data?.data) {
        setBookings(res.data.data);
        if (res.data.data.length > 0 && !selectedBooking) {
          setSelectedBooking(res.data.data[0]);
          if (res.data.data[0].vehicleId) {
            setStartOdo((res.data.data[0].vehicleId as Vehicle).odometer || 4200);
            setEndOdo(((res.data.data[0].vehicleId as Vehicle).odometer || 4200) + 120);
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching counter bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleSelectBooking = (b: Booking) => {
    setSelectedBooking(b);
    if (b.vehicleId && typeof b.vehicleId === 'object') {
      setStartOdo(b.vehicleId.odometer || 4200);
      setEndOdo((b.vehicleId.odometer || 4200) + 120);
    }
    setCustomerSigned(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    const found = bookings.find(b => b.bookingCode.toLowerCase().includes(searchCode.trim().toLowerCase()));
    if (found) {
      handleSelectBooking(found);
    } else {
      alert(`Không tìm thấy đơn đặt xe với mã: ${searchCode}`);
    }
  };

  // Settlement calculations
  const lateFeeTotal = lateHours * 30000;
  const finalSettlement = (selectedBooking?.remainingAmount || 0) + lateFeeTotal + extraFee;

  return (
    <div className="min-h-screen bg-slate-50/70 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-forest-700">
                Phân hệ Quản lý Vận hành Chi nhánh
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Bàn giao nhận xe tại quầy (Counter Desk)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Xử lý quy trình Check-in giao xe eKYC và Check-out thu hồi xe, đối soát ODO và tất toán 70% còn lại.
            </p>
          </div>

          <button
            onClick={fetchBookings}
            className="self-start md:self-auto inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Đồng bộ danh sách</span>
          </button>
        </div>

        {/* Main 2-column desk */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Booking lookup and Queue (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Quick Search */}
            <form onSubmit={handleSearch} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tra cứu mã đặt xe (Booking Code)
              </label>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3" />
                <input
                  type="text"
                  placeholder="Nhập mã đơn, VD: MV-892101..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="w-full pl-9 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 px-3 py-1.5 bg-forest-600 text-white rounded-lg text-xs font-bold hover:bg-forest-700"
                >
                  Tra cứu
                </button>
              </div>
            </form>

            {/* Bookings Queue */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Hàng đợi khách nhận / trả ({bookings.length})
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Hôm nay
                </span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Đang tải danh sách đơn đặt xe...
                </div>
              ) : bookings.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Chưa có đơn đặt xe nào trong hàng đợi.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {bookings.map((b) => {
                    const isSelected = selectedBooking?._id === b._id;
                    const bikeName = typeof b.vehicleId === 'object' && b.vehicleId !== null 
                      ? b.vehicleId.vehicleModel 
                      : 'Xe máy Motov';
                    const userName = typeof b.userId === 'object' && b.userId !== null 
                      ? `${b.userId.firstName || ''} ${b.userId.lastName || ''}`.trim() || b.userId.username
                      : 'Khách hàng';

                    return (
                      <div
                        key={b._id}
                        onClick={() => handleSelectBooking(b)}
                        className={`p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50/70 border-l-4 border-emerald-600'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {b.bookingCode}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.status === 'Confirmed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : b.status === 'Ongoing'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {b.status === 'Confirmed' ? 'Chờ nhận xe' : b.status === 'Ongoing' ? 'Đang lưu hành' : b.status}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-800 truncate">
                          {bikeName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center justify-between">
                          <span>Khách: {userName}</span>
                          <span className="font-bold text-forest-700">
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
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Terminal Header */}
                <div className="bg-gradient-to-r from-slate-900 to-forest-950 text-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                        Chi tiết hồ sơ giao nhận
                      </span>
                      <h2 className="text-xl font-black text-white mt-0.5">
                        Mã đơn: {selectedBooking.bookingCode}
                      </h2>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Đã cọc online 30%</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {selectedBooking.depositAmount?.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>

                  {/* Quick details chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Phương tiện:</span>
                      <span className="font-bold text-slate-200 truncate block">
                        {typeof selectedBooking.vehicleId === 'object' ? selectedBooking.vehicleId?.vehicleModel : 'Xe Motov'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Khách hàng:</span>
                      <span className="font-bold text-slate-200 truncate block">
                        {typeof selectedBooking.userId === 'object' ? selectedBooking.userId?.firstName || selectedBooking.userId?.username : 'Khách thuê'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Ngày nhận:</span>
                      <span className="font-bold text-slate-200 truncate block">
                        {new Date(selectedBooking.pickupDateTime).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Ngày hẹn trả:</span>
                      <span className="font-bold text-slate-200 truncate block">
                        {new Date(selectedBooking.returnDateTime).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Workflow Mode Tabs */}
                <div className="flex border-b border-slate-200">
                  <button
                    onClick={() => setActiveTab('checkin')}
                    className={`flex-1 py-3.5 text-xs font-bold text-center border-b-2 transition-all ${
                      activeTab === 'checkin'
                        ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    1. Check-in Bàn giao xe (Bắt đầu)
                  </button>
                  <button
                    onClick={() => setActiveTab('checkout')}
                    className={`flex-1 py-3.5 text-xs font-bold text-center border-b-2 transition-all ${
                      activeTab === 'checkout'
                        ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    2. Check-out Trả xe & Tất toán (Kết thúc)
                  </button>
                </div>

                {/* Tab 1: Check-in Process */}
                {activeTab === 'checkin' && (
                  <div className="p-6 space-y-5">
                    {/* Odometer Input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                        <Gauge className="w-4 h-4 text-emerald-600 mr-1.5" />
                        Ghi nhận chỉ số ODO công-tơ-mét khi giao
                      </label>
                      <input
                        type="number"
                        value={startOdo}
                        onChange={(e) => setStartOdo(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Chỉ số ODO làm căn cứ đối chiếu khi khách bàn giao trả xe.
                      </p>
                    </div>

                    {/* 5-point Checklist */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center">
                        <FileCheck className="w-4 h-4 text-emerald-600 mr-1.5" />
                        Biên bản kiểm tra kỹ thuật an toàn trước khi rời trạm
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {[
                          { key: 'tires', label: 'Áp suất lốp xe & độ bám đường tốt' },
                          { key: 'brakes', label: 'Phanh trước & sau hoạt động nhạy' },
                          { key: 'lights', label: 'Đèn pha, xi nhan, còi xe hoạt động' },
                          { key: 'fuel', label: 'Xăng/Pin đầy bình khi giao khách' },
                          { key: 'helmets', label: 'Đã giao 2 nón bảo hiểm chuẩn CR + 2 áo mưa' },
                        ].map((item) => (
                          <label
                            key={item.key}
                            className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={(checklist as any)[item.key]}
                              onChange={(e) =>
                                setChecklist({ ...checklist, [item.key]: e.target.checked })
                              }
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-slate-700 font-medium">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* eKYC Confirmation */}
                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start space-x-2 text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-emerald-900">
                          Quy chuẩn eKYC Motov: Không giữ CCCD bản gốc
                        </p>
                        <p className="text-emerald-800 text-[11px] mt-0.5">
                          Nhân viên đã chụp ảnh CCCD & GPLX của khách lưu vào hồ sơ bảo mật. Khách cầm lại toàn bộ giấy tờ tùy thân.
                        </p>
                      </div>
                    </div>

                    {/* Digital Signature */}
                    <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center">
                      <p className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-center">
                        <PenTool className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                        Chữ ký xác nhận nhận xe của khách hàng
                      </p>
                      {customerSigned ? (
                        <div className="py-3 text-emerald-700 font-serif italic text-lg font-bold">
                          ✓ Đã ký điện tử xác nhận bàn giao
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCustomerSigned(true)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700"
                        >
                          Mời khách chạm để ký xác nhận trên màn hình
                        </button>
                      )}
                    </div>

                    {/* Complete Check-in Button */}
                    <button
                      type="button"
                      onClick={() => alert(`Check-in thành công cho đơn ${selectedBooking.bookingCode}! Xe đã chuyển sang trạng thái Đang lưu hành.`)}
                      className="w-full py-3.5 bg-forest-600 hover:bg-forest-700 text-white font-bold rounded-xl text-xs shadow-md shadow-forest-600/20 transition-all flex items-center justify-center space-x-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Hoàn tất Check-in & Bàn giao chìa khóa</span>
                    </button>
                  </div>
                )}

                {/* Tab 2: Check-out Process */}
                {activeTab === 'checkout' && (
                  <div className="p-6 space-y-5">
                    {/* End Odometer */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                        <Gauge className="w-4 h-4 text-emerald-600 mr-1.5" />
                        Chỉ số ODO công-tơ-mét khi thu hồi xe
                      </label>
                      <input
                        type="number"
                        value={endOdo}
                        onChange={(e) => setEndOdo(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Quãng đường khách đã di chuyển: ~{Math.max(0, endOdo - startOdo)} km
                      </p>
                    </div>

                    {/* Late Hour Adjustment */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                          Số giờ trễ hẹn (nếu có)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={lateHours}
                          onChange={(e) => setLateHours(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Phụ thu: 30.000 đ/giờ trễ</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                          Phụ thu khác (xăng / trầy xước)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="10000"
                          value={extraFee}
                          onChange={(e) => setExtraFee(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">0 đ nếu xe nguyên vẹn</p>
                      </div>
                    </div>

                    {/* Final Settlement Summary Box */}
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Tiền thuê còn lại (70%):</span>
                        <span className="font-bold text-slate-800">
                          {selectedBooking.remainingAmount?.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      {lateHours > 0 && (
                        <div className="flex justify-between text-amber-700">
                          <span>Phụ thu trả muộn ({lateHours} giờ):</span>
                          <span className="font-bold">{lateFeeTotal.toLocaleString('vi-VN')} đ</span>
                        </div>
                      )}
                      {extraFee > 0 && (
                        <div className="flex justify-between text-amber-700">
                          <span>Phụ phí phát sinh:</span>
                          <span className="font-bold">{extraFee.toLocaleString('vi-VN')} đ</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-emerald-200 flex justify-between items-baseline text-sm">
                        <span className="font-black text-slate-900 uppercase">
                          Tổng số tiền khách thanh toán:
                        </span>
                        <span className="text-lg font-black text-forest-700">
                          {finalSettlement.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>

                    {/* Complete Checkout Button */}
                    <button
                      type="button"
                      onClick={() => alert(`Check-out và tất toán thành công cho đơn ${selectedBooking.bookingCode}! Thu tiền: ${finalSettlement.toLocaleString('vi-VN')} đ. Xe đã trở về trạng thái Sẵn sàng.`)}
                      className="w-full py-3.5 bg-forest-600 hover:bg-forest-700 text-white font-bold rounded-xl text-xs shadow-md shadow-forest-600/20 transition-all flex items-center justify-center space-x-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xác nhận thu hồi xe & Hoàn tất tất toán ({finalSettlement.toLocaleString('vi-VN')} đ)</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                Vui lòng chọn một đơn từ danh sách bên trái để tiến hành quy trình Check-in hoặc Check-out.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
