import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  SlidersHorizontal, 
  MapPin, 
  Sparkles, 
  Filter, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { VehicleCard } from '../components/VehicleCard';
import { BookingModal } from '../components/BookingModal';
import type { Vehicle, Branch } from '../types';
import { api } from '../services/api';

export const FleetPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const pickupParam = searchParams.get('pickup') || '';
  const returnParam = searchParams.get('return') || '';
  const typeParam = searchParams.get('type') || '';

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>(pickupParam);
  const [selectedType, setSelectedType] = useState<string>(
    typeParam === 'xe-tay-ga' ? 'tay-ga' :
    typeParam === 'xe-so' ? 'xe-so' :
    typeParam === 'xe-con-tay' ? 'con-tay' :
    typeParam === 'xe-dien' ? 'xe-dien' : 'all'
  );
  const [priceSort, setPriceSort] = useState<'asc' | 'desc' | 'default'>('default');

  // Booking Modal
  const [selectedVehicleForBooking, setSelectedVehicleForBooking] = useState<Vehicle | null>(null);
  const [successBookingCode, setSuccessBookingCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [branchesRes, vehiclesRes] = await Promise.all([
          api.get('/branches'),
          api.get('/vehicles'),
        ]);

        if (branchesRes.data?.data) setBranches(branchesRes.data.data);
        if (vehiclesRes.data?.data) setVehicles(vehiclesRes.data.data);
      } catch (err) {
        console.warn('Error fetching fleet data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter and sort logic
  const filteredVehicles = vehicles
    .filter((v) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchModel = v.vehicleModel.toLowerCase().includes(q);
        const matchBrand = v.brand.toLowerCase().includes(q);
        const matchPlate = v.licensePlate.toLowerCase().includes(q);
        if (!matchModel && !matchBrand && !matchPlate) return false;
      }

      // Branch filter
      if (selectedBranch) {
        const branchId = typeof v.branchId === 'object' && v.branchId !== null ? v.branchId._id : v.branchId;
        if (branchId !== selectedBranch) return false;
      }

      // Type filter
      if (selectedType === 'tay-ga') return v.transmissionType === 'Automatic' && v.fuelType !== 'Electric';
      if (selectedType === 'xe-so') return v.transmissionType === 'Semi-Auto' || (v.transmissionType === 'Manual' && v.brand === 'Honda');
      if (selectedType === 'con-tay') return v.transmissionType === 'Manual' && v.brand === 'Yamaha';
      if (selectedType === 'xe-dien') return v.fuelType === 'Electric';

      return true;
    })
    .sort((a, b) => {
      if (priceSort === 'asc') return a.dailyPrice - b.dailyPrice;
      if (priceSort === 'desc') return b.dailyPrice - a.dailyPrice;
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-50/60 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Title */}
        <div className="mb-8">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Xe tự doanh chính hãng • Bảo dưỡng định kỳ</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Đội xe & Bảng giá thuê tự lái
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Tất cả các dòng xe đều được kiểm định kỹ thuật nghiêm ngặt trước khi giao, đi kèm 2 mũ bảo hiểm chuẩn CR và 2 áo mưa tiện lợi.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-sm mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search Box */}
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên xe (Vision, Air Blade, Exciter, VinFast...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            {/* Branch Filter */}
            <div>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
              >
                <option value="">Tất cả các chi nhánh</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Sort */}
            <div>
              <select
                value={priceSort}
                onChange={(e) => setPriceSort(e.target.value as any)}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
              >
                <option value="default">Sắp xếp theo giá</option>
                <option value="asc">Giá thuê: Thấp đến Cao</option>
                <option value="desc">Giá thuê: Cao đến Thấp</option>
              </select>
            </div>
          </div>

          {/* Quick Category Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Phân loại:</span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'tay-ga', label: 'Xe tay ga' },
              { id: 'xe-so', label: 'Xe số' },
              { id: 'con-tay', label: 'Xe côn tay phượt' },
              { id: 'xe-dien', label: 'Xe máy điện' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedType === tab.id
                    ? 'bg-forest-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-6 text-xs text-slate-500">
          <span>Tìm thấy <strong className="text-slate-800 font-bold">{filteredVehicles.length}</strong> phương tiện sẵn sàng bàn giao</span>
          <span className="text-emerald-700 font-semibold flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Cọc 30% giữ xe trực tuyến tức thì
          </span>
        </div>

        {/* Fleet Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Đang tải dữ liệu đội xe...
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">Không tìm thấy xe phù hợp tiêu chí</p>
            <p className="text-xs text-slate-500 mt-1">Vui lòng thử bỏ bớt bộ lọc hoặc chọn chi nhánh khác.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedBranch('');
                setSelectedType('all');
                setPriceSort('default');
              }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              Đặt lại tất cả bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle._id}
                vehicle={vehicle}
                onBookNow={(v) => setSelectedVehicleForBooking(v)}
              />
            ))}
          </div>
        )}

        {/* Booking Modal */}
        {selectedVehicleForBooking && (
          <BookingModal
            vehicle={selectedVehicleForBooking}
            branches={branches}
            initialPickupBranchId={selectedBranch || pickupParam}
            initialReturnBranchId={returnParam}
            onClose={() => setSelectedVehicleForBooking(null)}
            onSuccess={(code) => {
              setSelectedVehicleForBooking(null);
              setSuccessBookingCode(code);
            }}
          />
        )}

        {/* Success Modal */}
        {successBookingCode && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 border border-emerald-200 shadow-2xl">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-forest-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                Đặt giữ xe thành công!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mã đặt xe của bạn là:
              </p>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl font-mono text-lg font-black text-forest-700 tracking-wider">
                {successBookingCode}
              </div>
              <p className="text-[11px] text-slate-500">
                Vui lòng lưu lại mã để xuất trình tại bàn tiếp tân chi nhánh khi nhận xe.
              </p>
              <button
                onClick={() => setSuccessBookingCode(null)}
                className="w-full py-3 rounded-xl bg-forest-600 text-white font-bold text-xs hover:bg-forest-700 transition-colors shadow-md shadow-forest-600/20"
              >
                Đã hiểu & Tiếp tục
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
