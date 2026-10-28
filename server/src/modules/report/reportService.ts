import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import mongoose from 'mongoose';
import {
  Booking,
  Payment,
  Vehicle,
  Branch,
  MaintenanceLog,
  Category,
  Review,
} from '../../models';

// Helper for Vietnamese date string formatting
const formatDateVN = (d: Date): string => {
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatCurrencyVN = (amount: number): string => {
  return `${(amount || 0).toLocaleString('vi-VN')} đ`;
};

/**
 * UC-86: Daily Revenue Report
 */
export const getDailyRevenue = async (branchId?: string, dateStr?: string) => {
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const branchFilter: Record<string, any> = {};
  if (branchId && mongoose.isValidObjectId(branchId)) {
    branchFilter.pickupBranchId = new mongoose.Types.ObjectId(branchId);
  }

  // 1. Fetch Bookings active or created today
  const bookingsToday = await Booking.find({
    ...branchFilter,
    $or: [
      { createdAt: { $gte: startOfDay, $lte: endOfDay } },
      { actualReturnDateTime: { $gte: startOfDay, $lte: endOfDay } },
      { checkinAt: { $gte: startOfDay, $lte: endOfDay } },
      { checkoutAt: { $gte: startOfDay, $lte: endOfDay } },
    ],
  })
    .populate('userId', 'firstName lastName phoneNumber email')
    .populate('vehicleId', 'vehicleModel licensePlate brand')
    .populate('pickupBranchId', 'name code')
    .populate('returnBranchId', 'name code')
    .sort({ createdAt: -1 });

  // 2. Fetch Payments made today
  const bookingIds = bookingsToday.map((b) => b._id);
  const paymentQuery: Record<string, any> = {
    createdAt: { $gte: startOfDay, $lte: endOfDay },
    status: 'SUCCESS',
  };
  if (bookingIds.length > 0 && branchId) {
    paymentQuery.bookingId = { $in: bookingIds };
  }

  const paymentsToday = await Payment.find(paymentQuery).populate('bookingId', 'bookingCode');

  let onlineDepositRevenue = 0;
  let counterSettlementRevenue = 0;
  let refunds = 0;

  for (const p of paymentsToday) {
    if (p.type === 'DEPOSIT' || p.type === 'FULL') {
      onlineDepositRevenue += p.amount;
    } else if (p.type === 'COUNTER') {
      counterSettlementRevenue += p.amount;
    } else if (p.type === 'REFUND') {
      refunds += p.amount;
    }
  }

  // Calculate fees from bookings completed today
  let additionalFees = 0;
  let pickupsCount = 0;
  let returnsCount = 0;
  let cancelledCount = 0;

  for (const b of bookingsToday) {
    if (b.lateFee) additionalFees += b.lateFee;
    if (b.damageFee) additionalFees += b.damageFee;

    if (b.checkinAt && b.checkinAt >= startOfDay && b.checkinAt <= endOfDay) {
      pickupsCount++;
    }
    if (b.checkoutAt && b.checkoutAt >= startOfDay && b.checkoutAt <= endOfDay) {
      returnsCount++;
    }
    if (b.status === 'Cancelled' || b.status === 'Rejected') {
      cancelledCount++;
    }
  }

  const grossRevenue = onlineDepositRevenue + counterSettlementRevenue + additionalFees;
  const netRevenue = Math.max(0, grossRevenue - refunds);

  let branchInfo = null;
  if (branchId && mongoose.isValidObjectId(branchId)) {
    branchInfo = await Branch.findById(branchId).select('name code address phone');
  }

  return {
    date: startOfDay.toISOString().slice(0, 10),
    dateFormatted: formatDateVN(startOfDay),
    branch: branchInfo,
    metrics: {
      grossRevenue,
      netRevenue,
      onlineDepositRevenue,
      counterSettlementRevenue,
      additionalFees,
      refunds,
      totalBookings: bookingsToday.length,
      pickupsCount,
      returnsCount,
      cancelledCount,
    },
    paymentMethods: {
      vnpay: onlineDepositRevenue,
      counter: counterSettlementRevenue + additionalFees,
    },
    bookings: bookingsToday.map((b) => ({
      _id: b._id,
      bookingCode: b.bookingCode,
      customerName: (b.userId as any)?.firstName
        ? `${(b.userId as any).firstName} ${(b.userId as any).lastName}`
        : 'Khách vãng lai',
      customerPhone: (b.userId as any)?.phoneNumber || '---',
      vehicleModel: (b.vehicleId as any)?.vehicleModel || 'Xe máy',
      licensePlate: (b.vehicleId as any)?.licensePlate || '---',
      totalAmount: b.totalAmount,
      paidAmount: b.paidAmount,
      status: b.status,
      paymentMethod: b.paymentMethod,
      pickupTime: b.pickupDateTime,
      returnTime: b.returnDateTime,
      damageFee: b.damageFee || 0,
      lateFee: b.lateFee || 0,
    })),
  };
};

/**
 * UC-87 & UC-88: Monthly Revenue Report with Chart Data & Comparison
 */
export const getMonthlyRevenue = async (branchId?: string, monthParam?: number, yearParam?: number) => {
  const now = new Date();
  const month = monthParam && monthParam >= 1 && monthParam <= 12 ? monthParam : now.getMonth() + 1;
  const year = yearParam && yearParam >= 2020 ? yearParam : now.getFullYear();

  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
  const daysInMonth = endOfMonth.getDate();

  // Previous month range for comparison
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const startOfPrevMonth = new Date(prevYear, prevMonth - 1, 1, 0, 0, 0, 0);
  const endOfPrevMonth = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);

  const branchFilter: Record<string, any> = {};
  if (branchId && mongoose.isValidObjectId(branchId)) {
    branchFilter.pickupBranchId = new mongoose.Types.ObjectId(branchId);
  }

  // Fetch current month bookings
  const currentMonthBookings = await Booking.find({
    ...branchFilter,
    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    status: { $nin: ['Cancelled', 'Rejected'] },
  }).populate('vehicleId', 'category vehicleModel');

  // Fetch previous month bookings
  const prevMonthBookings = await Booking.find({
    ...branchFilter,
    createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth },
    status: { $nin: ['Cancelled', 'Rejected'] },
  });

  // Calculate totals
  const currentTotalRevenue = currentMonthBookings.reduce((sum, b) => sum + (b.totalAmount || 0) + (b.lateFee || 0) + (b.damageFee || 0), 0);
  const prevTotalRevenue = prevMonthBookings.reduce((sum, b) => sum + (b.totalAmount || 0) + (b.lateFee || 0) + (b.damageFee || 0), 0);

  let growthPercent = 0;
  if (prevTotalRevenue > 0) {
    growthPercent = Math.round(((currentTotalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100);
  } else if (currentTotalRevenue > 0) {
    growthPercent = 100;
  }

  // Daily breakdown array (Day 1 to daysInMonth)
  const dailyBreakdown = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return {
      day,
      date: dStr,
      revenue: 0,
      bookingsCount: 0,
      deposits: 0,
      counterCash: 0,
    };
  });

  for (const b of currentMonthBookings) {
    const bDate = new Date(b.createdAt);
    const dayIndex = bDate.getDate() - 1;
    if (dayIndex >= 0 && dayIndex < daysInMonth) {
      const rev = (b.totalAmount || 0) + (b.lateFee || 0) + (b.damageFee || 0);
      dailyBreakdown[dayIndex].revenue += rev;
      dailyBreakdown[dayIndex].bookingsCount += 1;
      dailyBreakdown[dayIndex].deposits += b.depositAmount || 0;
      dailyBreakdown[dayIndex].counterCash += Math.max(0, rev - (b.depositAmount || 0));
    }
  }

  // Category breakdown
  const categoryCounts: Record<string, { name: string; revenue: number; bookingsCount: number }> = {};
  for (const b of currentMonthBookings) {
    const cat = (b.vehicleId as any)?.category || 'Khác';
    const catName = typeof cat === 'object' && cat.name ? cat.name : String(cat);
    if (!categoryCounts[catName]) {
      categoryCounts[catName] = { name: catName, revenue: 0, bookingsCount: 0 };
    }
    categoryCounts[catName].revenue += (b.totalAmount || 0);
    categoryCounts[catName].bookingsCount += 1;
  }

  let branchInfo = null;
  if (branchId && mongoose.isValidObjectId(branchId)) {
    branchInfo = await Branch.findById(branchId).select('name code address');
  }

  return {
    month,
    year,
    branch: branchInfo,
    summary: {
      totalRevenue: currentTotalRevenue,
      totalBookings: currentMonthBookings.length,
      averageOrderValue: currentMonthBookings.length > 0 ? Math.round(currentTotalRevenue / currentMonthBookings.length) : 0,
      previousMonthRevenue: prevTotalRevenue,
      growthPercent,
    },
    dailyBreakdown,
    categoryBreakdown: Object.values(categoryCounts),
  };
};

/**
 * UC-90, UC-91, UC-92: Fleet Utilization & Statistics Report
 */
export const getFleetStats = async (branchId?: string) => {
  const vehicleFilter: Record<string, any> = { isDeleted: false };
  if (branchId && mongoose.isValidObjectId(branchId)) {
    vehicleFilter.branchId = new mongoose.Types.ObjectId(branchId);
  }

  const vehicles = await Vehicle.find(vehicleFilter)
    .populate('category', 'name')
    .populate('branchId', 'name code');

  const totalVehicles = vehicles.length;
  let availableCount = 0;
  let rentedCount = 0;
  let maintenanceCount = 0;
  let transferringCount = 0;
  let requiresMaintenanceCount = 0;
  let totalRatingSum = 0;
  let ratedVehiclesCount = 0;
  let totalOdometer = 0;

  for (const v of vehicles) {
    if (v.status === 'Available') availableCount++;
    else if (v.status === 'Rented') rentedCount++;
    else if (v.status === 'Maintenance') maintenanceCount++;
    else if (v.status === 'Transferring') transferringCount++;

    if (v.requiresMaintenance) requiresMaintenanceCount++;
    if (v.averageRating && v.averageRating > 0) {
      totalRatingSum += v.averageRating;
      ratedVehiclesCount++;
    }
    totalOdometer += v.odometer || 0;
  }

  const utilizationRate = totalVehicles > 0 ? Math.round((rentedCount / totalVehicles) * 100) : 0;
  const averageRating = ratedVehiclesCount > 0 ? Number((totalRatingSum / ratedVehiclesCount).toFixed(1)) : 0;
  const averageOdometer = totalVehicles > 0 ? Math.round(totalOdometer / totalVehicles) : 0;

  // Maintenance log costs this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const maintenanceQuery: Record<string, any> = { createdAt: { $gte: startOfMonth } };
  if (branchId && mongoose.isValidObjectId(branchId)) {
    maintenanceQuery.branchId = new mongoose.Types.ObjectId(branchId);
  }

  const maintenanceLogs = await MaintenanceLog.find(maintenanceQuery);
  const totalMaintenanceCost = maintenanceLogs.reduce((acc, log) => acc + (log.cost || 0), 0);

  // Top vehicles by popularity
  const topVehicles = vehicles
    .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
    .slice(0, 5)
    .map((v) => ({
      _id: v._id,
      vehicleModel: v.vehicleModel,
      licensePlate: v.licensePlate,
      brand: v.brand,
      status: v.status,
      odometer: v.odometer,
      averageRating: v.averageRating || 0,
      dailyPrice: v.dailyPrice,
    }));

  return {
    totalVehicles,
    statusBreakdown: {
      available: availableCount,
      rented: rentedCount,
      maintenance: maintenanceCount,
      transferring: transferringCount,
    },
    utilizationRate,
    averageRating,
    averageOdometer,
    maintenanceStats: {
      requiresMaintenanceCount,
      inMaintenance: maintenanceCount,
      monthlyCost: totalMaintenanceCost,
      recentLogsCount: maintenanceLogs.length,
    },
    topVehicles,
  };
};

/**
 * UC-103: Chain-wide Revenue (Executive SystemAdmin View)
 */
export const getChainRevenue = async (period: string = 'this_month') => {
  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  if (period === 'today') {
    startDate = new Date(now.setHours(0, 0, 0, 0));
    endDate = new Date(now.setHours(23, 59, 59, 999));
  } else if (period === 'this_year') {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  const branches = await Branch.find({ isActive: true });
  const allBookings = await Booking.find({
    createdAt: { $gte: startDate, $lte: endDate },
    status: { $nin: ['Cancelled', 'Rejected'] },
  }).populate('pickupBranchId', 'name code');

  const totalChainRevenue = allBookings.reduce(
    (sum, b) => sum + (b.totalAmount || 0) + (b.lateFee || 0) + (b.damageFee || 0),
    0
  );

  // Per branch breakdown
  const branchMap: Record<string, any> = {};
  for (const br of branches) {
    const bId = String(br._id);
    branchMap[bId] = {
      branchId: br._id,
      branchName: br.name,
      branchCode: br.code,
      address: br.address,
      revenue: 0,
      bookingsCount: 0,
      activeVehicles: 0,
      utilizationRate: 0,
      contributionPercent: 0,
    };
  }

  for (const b of allBookings) {
    const brId = b.pickupBranchId ? String((b.pickupBranchId as any)._id || b.pickupBranchId) : null;
    if (brId && branchMap[brId]) {
      const rev = (b.totalAmount || 0) + (b.lateFee || 0) + (b.damageFee || 0);
      branchMap[brId].revenue += rev;
      branchMap[brId].bookingsCount += 1;
    }
  }

  // Query vehicles per branch
  for (const br of branches) {
    const bId = String(br._id);
    const vCount = await Vehicle.countDocuments({ branchId: br._id, isDeleted: false });
    const rentedCount = await Vehicle.countDocuments({ branchId: br._id, status: 'Rented', isDeleted: false });
    if (branchMap[bId]) {
      branchMap[bId].activeVehicles = vCount;
      branchMap[bId].utilizationRate = vCount > 0 ? Math.round((rentedCount / vCount) * 100) : 0;
      branchMap[bId].contributionPercent =
        totalChainRevenue > 0 ? Math.round((branchMap[bId].revenue / totalChainRevenue) * 100) : 0;
    }
  }

  return {
    period,
    totalChainRevenue,
    totalBookings: allBookings.length,
    totalBranches: branches.length,
    branchBreakdown: Object.values(branchMap),
  };
};

/**
 * UC-104: Side-by-side Branch KPI Comparison
 */
export const getBranchComparison = async (period: string = 'this_month') => {
  const chainData = await getChainRevenue(period);
  const branches = chainData.branchBreakdown;

  const comparison = branches.map((b: any) => ({
    branchId: b.branchId,
    branchName: b.branchName,
    branchCode: b.branchCode,
    revenue: b.revenue,
    bookingsCount: b.bookingsCount,
    averageOrderValue: b.bookingsCount > 0 ? Math.round(b.revenue / b.bookingsCount) : 0,
    activeVehicles: b.activeVehicles,
    utilizationRate: b.utilizationRate,
    contributionPercent: b.contributionPercent,
  }));

  // Identify top performers
  const sortedByRevenue = [...comparison].sort((a, b) => b.revenue - a.revenue);
  const sortedByUtil = [...comparison].sort((a, b) => b.utilizationRate - a.utilizationRate);

  return {
    period,
    branches: comparison,
    highlights: {
      topRevenueBranch: sortedByRevenue[0]?.branchName || 'N/A',
      highestUtilizationBranch: sortedByUtil[0]?.branchName || 'N/A',
    },
  };
};

/**
 * UC-105: Executive KPI Dashboard (Trends, Top Vehicles, Funnel)
 */
export const getKpiDashboard = async (branchId?: string) => {
  const branchFilter: Record<string, any> = {};
  if (branchId && mongoose.isValidObjectId(branchId)) {
    branchFilter.pickupBranchId = new mongoose.Types.ObjectId(branchId);
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 1. Overall stats
  const allBookings = await Booking.find(branchFilter);
  const recentBookings = await Booking.find({
    ...branchFilter,
    createdAt: { $gte: thirtyDaysAgo },
  }).sort({ createdAt: 1 });

  const totalRevenue = allBookings
    .filter((b) => b.status !== 'Cancelled' && b.status !== 'Rejected')
    .reduce((sum, b) => sum + (b.totalAmount || 0) + (b.lateFee || 0) + (b.damageFee || 0), 0);

  const activeRentalsCount = allBookings.filter((b) => b.status === 'Ongoing').length;
  const completedCount = allBookings.filter((b) => b.status === 'Completed').length;
  const cancelledCount = allBookings.filter((b) => b.status === 'Cancelled' || b.status === 'Rejected').length;

  // 2. Trend: last 7 days daily revenue
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const last7DaysTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    return {
      date: dateStr,
      label: d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit' }),
      revenue: 0,
      bookings: 0,
    };
  });

  for (const b of recentBookings) {
    if (b.status === 'Cancelled' || b.status === 'Rejected') continue;
    const bDateStr = new Date(b.createdAt).toISOString().slice(0, 10);
    const found = last7DaysTrend.find((item) => item.date === bDateStr);
    if (found) {
      found.revenue += (b.totalAmount || 0) + (b.lateFee || 0) + (b.damageFee || 0);
      found.bookings += 1;
    }
  }

  // 3. Rental Funnel (100% real counts from DB)
  const totalInteractions = allBookings.length;
  const paidDeposits = allBookings.filter((b) => b.depositPaid || b.isPaid).length;
  const checkedIn = allBookings.filter((b) => b.checkinAt).length;

  const funnel = [
    {
      stage: 'Đặt đơn ban đầu',
      count: totalInteractions,
      percent: totalInteractions > 0 ? 100 : 0,
    },
    {
      stage: 'Thanh toán cọc VNPay',
      count: paidDeposits,
      percent: totalInteractions > 0 ? Math.round((paidDeposits / totalInteractions) * 100) : 0,
    },
    {
      stage: 'Check-in nhận xe tại quầy',
      count: checkedIn,
      percent: totalInteractions > 0 ? Math.round((checkedIn / totalInteractions) * 100) : 0,
    },
    {
      stage: 'Check-out hoàn tất chuyến đi',
      count: completedCount,
      percent: totalInteractions > 0 ? Math.round((completedCount / totalInteractions) * 100) : 0,
    },
  ];

  // 4. Fleet stats
  const fleet = await getFleetStats(branchId);

  return {
    kpi: {
      totalRevenue,
      activeRentals: activeRentalsCount,
      completedRentals: completedCount,
      cancellationRate: allBookings.length > 0 ? Math.round((cancelledCount / allBookings.length) * 100) : 0,
      fleetUtilization: fleet.utilizationRate,
      fleetTotal: fleet.totalVehicles,
      averageRating: fleet.averageRating,
    },
    trend: last7DaysTrend,
    funnel,
    topVehicles: fleet.topVehicles,
  };
};

/**
 * UC-106: Demand Forecast Service (Seasonal Trends & Predictive Analytics)
 */
export const getDemandForecast = async (branchId?: string) => {
  const now = new Date();
  const past30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const query: Record<string, any> = {
    createdAt: { $gte: past30Days },
    status: { $nin: ['Cancelled', 'Rejected'] },
  };
  if (branchId && mongoose.isValidObjectId(branchId)) {
    query.pickupBranchId = new mongoose.Types.ObjectId(branchId);
  }

  const historicalBookings = await Booking.find(query);
  const fleet = await getFleetStats(branchId);
  const fleetCapacity = fleet.totalVehicles;

  // Compute average bookings per day of week (0: Sun, 1: Mon, ..., 6: Sat)
  const dayOfWeekCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
  const dayOfWeekTotals: number[] = [0, 0, 0, 0, 0, 0, 0];

  for (const b of historicalBookings) {
    const d = new Date(b.createdAt).getDay();
    dayOfWeekTotals[d] += (b.totalAmount || 0);
    dayOfWeekCounts[d] += 1;
  }

  // Base daily average strictly from real historical DB transactions (zero synthetic baseline)
  const avgDailyBookings = historicalBookings.length > 0 ? historicalBookings.length / 30 : 0;
  const avgOrderValue =
    historicalBookings.length > 0
      ? dayOfWeekTotals.reduce((a, b) => a + b, 0) / historicalBookings.length
      : 0;

  // Project next 7 days
  const forecast7Days = Array.from({ length: 7 }, (_, i) => {
    const targetDate = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
    const dayOfWeek = targetDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Seasonal & weekend multiplier
    const weekendMultiplier = isWeekend ? 1.45 : 1.0;
    const month = targetDate.getMonth();
    const seasonalMultiplier = month >= 4 && month <= 7 ? 1.25 : 1.05;

    const predictedBookings = Math.round(avgDailyBookings * weekendMultiplier * seasonalMultiplier);
    const predictedRevenue = Math.round(predictedBookings * avgOrderValue);
    const expectedUtilization =
      fleetCapacity > 0 ? Math.min(100, Math.round((predictedBookings / fleetCapacity) * 100)) : 0;

    let capacityRisk: 'Normal' | 'High' | 'Overload' = 'Normal';
    if (expectedUtilization >= 90) capacityRisk = 'Overload';
    else if (expectedUtilization >= 75) capacityRisk = 'High';

    return {
      date: targetDate.toISOString().slice(0, 10),
      dayLabel: targetDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }),
      isWeekend,
      predictedBookings,
      predictedRevenue,
      expectedUtilization,
      capacityRisk,
    };
  });

  const weekendAlert = forecast7Days.some((d) => d.capacityRisk === 'Overload');
  const insights: string[] = [];

  if (historicalBookings.length === 0) {
    insights.push(
      'Chưa có giao dịch thuê xe thực tế trong 30 ngày qua. Hệ thống sẽ tự động cập nhật biểu đồ dự báo khi phát sinh đơn đặt xe thực.'
    );
    insights.push(
      `Tổng công suất hiện tại ghi nhận thực tế từ cơ sở dữ liệu: ${fleetCapacity} xe (${fleet.statusBreakdown.available} xe sẵn sàng giao ngay).`
    );
  } else {
    insights.push(
      weekendAlert
        ? 'Cảnh báo nguy cơ thiếu xe cuối tuần: Nhu cầu dự báo từ lịch sử giao dịch vượt 90% công suất đội xe hiện tại.'
        : `Tỷ lệ khai thác dựa trên ${historicalBookings.length} đơn thuê trong 30 ngày qua đang ở mức ổn định (trung bình ${avgDailyBookings.toFixed(1)} đơn/ngày).`
    );
    if (fleet.maintenanceStats.requiresMaintenanceCount > 0 || fleet.maintenanceStats.inMaintenance > 0) {
      insights.push(
        `Hiện có ${fleet.maintenanceStats.inMaintenance} xe đang bảo dưỡng và ${fleet.maintenanceStats.requiresMaintenanceCount} xe đến ngưỡng ODO cần kiểm tra kỹ thuật.`
      );
    }
  }

  return {
    forecast7Days,
    fleetCapacity,
    insights,
  };
};

/**
 * UC-89: Export Reports to Excel (ExcelJS)
 */
export const generateExcelReport = async (reportType: string, branchId?: string, dateStr?: string, monthParam?: number, yearParam?: number): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Motorent Vietnam';
  workbook.created = new Date();

  if (reportType === 'daily') {
    const data = await getDailyRevenue(branchId, dateStr);
    const sheet = workbook.addWorksheet('Báo Cáo Doanh Thu Ngày');

    // Title Block
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `MOTORENT - BÁO CÁO DOANH THU NGÀY ${data.dateFormatted.toUpperCase()}`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 35;

    // Metadata block
    sheet.addRow(['Chi nhánh:', data.branch ? `${data.branch.name} (${data.branch.code})` : 'Toàn hệ thống']);
    sheet.addRow(['Tổng doanh thu thuần:', data.metrics.netRevenue]);
    sheet.addRow(['Thu cọc online VNPay:', data.metrics.onlineDepositRevenue]);
    sheet.addRow(['Tất toán tại quầy:', data.metrics.counterSettlementRevenue]);
    sheet.addRow(['Phụ phí trễ/hư tổn:', data.metrics.additionalFees]);
    sheet.addRow(['Hoàn tiền khách hủy:', data.metrics.refunds]);
    sheet.addRow(['Tổng số đơn phát sinh:', data.metrics.totalBookings]);
    sheet.addRow([]);

    // Table Header
    const tableHeader = ['Mã Đơn', 'Khách Hàng', 'Số Điện Thoại', 'Xe Thuê', 'Biển Số', 'Phương Thức', 'Tổng Tiền (VND)'];
    const headerRow = sheet.addRow(tableHeader);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };

    for (const b of data.bookings) {
      sheet.addRow([
        b.bookingCode,
        b.customerName,
        b.customerPhone,
        b.vehicleModel,
        b.licensePlate,
        b.paymentMethod === 'Banking' ? 'VNPay / Banking' : 'Tiền mặt tại quầy',
        b.totalAmount,
      ]);
    }

    // Auto-fit columns
    sheet.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 3, 30);
    });

  } else {
    // Monthly or default
    const data = await getMonthlyRevenue(branchId, monthParam, yearParam);
    const sheet = workbook.addWorksheet(`Doanh Thu T${data.month}-${data.year}`);

    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `MOTORENT - BÁO CÁO DOANH THU THÁNG ${data.month}/${data.year}`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 35;

    sheet.addRow(['Chi nhánh:', data.branch ? `${data.branch.name} (${data.branch.code})` : 'Toàn hệ thống']);
    sheet.addRow(['Tổng doanh thu tháng:', data.summary.totalRevenue]);
    sheet.addRow(['Tổng đơn đặt xe:', data.summary.totalBookings]);
    sheet.addRow(['Giá trị đơn trung bình (AOV):', data.summary.averageOrderValue]);
    sheet.addRow(['Tăng trưởng so với tháng trước:', `${data.summary.growthPercent}%`]);
    sheet.addRow([]);

    const headerRow = sheet.addRow(['Ngày', 'Số Lượng Đơn', 'Cọc Online (VND)', 'Thu Tại Quầy (VND)', 'Tổng Doanh Thu (VND)']);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };

    for (const d of data.dailyBreakdown) {
      sheet.addRow([d.date, d.bookingsCount, d.deposits, d.counterCash, d.revenue]);
    }

    sheet.columns.forEach((col) => {
      let maxLen = 14;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 3, 30);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

/**
 * UC-89: Export Reports to PDF (PDFKit)
 */
export const generatePdfReport = async (reportType: string, branchId?: string, dateStr?: string, monthParam?: number, yearParam?: number): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Header Brand
      doc.rect(40, 40, 515, 60).fill('#1F2937');
      doc.fillColor('#FFC799').font('Helvetica-Bold').fontSize(18).text('MOTORENT VIETNAM', 55, 52);
      doc.fillColor('#9CA3AF').font('Helvetica').fontSize(9).text('HE THONG CHO THUE XE MAY SO 1 DA NANG - MOTORENT.VN', 55, 76);

      let currentY = 120;

      if (reportType === 'daily') {
        const data = await getDailyRevenue(branchId, dateStr);

        doc.fillColor('#111827').fontSize(14).text(`BAO CAO DOANH THU NGAY: ${data.dateFormatted}`, 40, currentY, { underline: true });
        currentY += 25;

        doc.fontSize(10).fillColor('#374151');
        doc.text(`Chi nhanh: ${data.branch ? `${data.branch.name} (${data.branch.code})` : 'Toan he thong'}`, 40, currentY);
        currentY += 15;
        doc.text(`Thoi diem xuat bao cao: ${new Date().toLocaleString('vi-VN')}`, 40, currentY);
        currentY += 25;

        // KPI Box
        doc.rect(40, currentY, 515, 70).fillAndStroke('#F3F4F6', '#E5E7EB');
        doc.fillColor('#111827').fontSize(11).text('TONG QUAN TAI CHINH', 55, currentY + 10);
        doc.fontSize(9).fillColor('#4B5563');
        doc.text(`Tong doanh thu thuan: ${formatCurrencyVN(data.metrics.netRevenue)}`, 55, currentY + 30);
        doc.text(`Thu coc online VNPay: ${formatCurrencyVN(data.metrics.onlineDepositRevenue)}`, 55, currentY + 45);
        doc.text(`Tat toan tai quay: ${formatCurrencyVN(data.metrics.counterSettlementRevenue)}`, 300, currentY + 30);
        doc.text(`Tong so chuyen xe: ${data.metrics.totalBookings} don`, 300, currentY + 45);

        currentY += 90;

        // Bookings table summary
        doc.fillColor('#111827').fontSize(11).text('DANH SACH DON HANG PHAT SINH TRONG NGAY', 40, currentY);
        currentY += 20;

        // Table Header
        doc.rect(40, currentY, 515, 20).fill('#374151');
        doc.fillColor('#FFFFFF').fontSize(8);
        doc.text('Ma don', 45, currentY + 6);
        doc.text('Khach hang', 120, currentY + 6);
        doc.text('Xe may', 220, currentY + 6);
        doc.text('Bien so', 320, currentY + 6);
        doc.text('Phuong thuc', 400, currentY + 6);
        doc.text('Tong tien', 480, currentY + 6);

        currentY += 20;

        const maxRows = Math.min(data.bookings.length, 15);
        for (let i = 0; i < maxRows; i++) {
          const b = data.bookings[i];
          const rowBg = i % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
          doc.rect(40, currentY, 515, 18).fill(rowBg);
          doc.fillColor('#1F2937').fontSize(8);
          doc.text(b.bookingCode, 45, currentY + 5);
          doc.text(b.customerName.slice(0, 15), 120, currentY + 5);
          doc.text(b.vehicleModel.slice(0, 16), 220, currentY + 5);
          doc.text(b.licensePlate, 320, currentY + 5);
          doc.text(b.paymentMethod === 'Banking' ? 'VNPay' : 'Tien mat', 400, currentY + 5);
          doc.text(formatCurrencyVN(b.totalAmount), 475, currentY + 5);
          currentY += 18;
        }

      } else {
        const data = await getMonthlyRevenue(branchId, monthParam, yearParam);

        doc.fillColor('#111827').fontSize(14).text(`BAO CAO DOANH THU THANG ${data.month}/${data.year}`, 40, currentY, { underline: true });
        currentY += 25;

        doc.fontSize(10).fillColor('#374151');
        doc.text(`Chi nhanh: ${data.branch ? `${data.branch.name} (${data.branch.code})` : 'Toan he thong'}`, 40, currentY);
        currentY += 15;
        doc.text(`Thoi gian xuat file: ${new Date().toLocaleString('vi-VN')}`, 40, currentY);
        currentY += 25;

        doc.rect(40, currentY, 515, 60).fillAndStroke('#F3F4F6', '#E5E7EB');
        doc.fillColor('#111827').fontSize(11).text('KET QUA KINH DOANH THANG', 55, currentY + 10);
        doc.fontSize(9).fillColor('#4B5563');
        doc.text(`Tong doanh thu thang: ${formatCurrencyVN(data.summary.totalRevenue)}`, 55, currentY + 30);
        doc.text(`Tong don thue hoan tat: ${data.summary.totalBookings} luot`, 55, currentY + 45);
        doc.text(`Tang truong so voi thang truoc: ${data.summary.growthPercent}%`, 300, currentY + 30);
        doc.text(`Gia tri don trung binh: ${formatCurrencyVN(data.summary.averageOrderValue)}`, 300, currentY + 45);

        currentY += 85;

        doc.fillColor('#111827').fontSize(11).text('BIEN DO DOANH THU THEO NGAY', 40, currentY);
        currentY += 20;

        doc.rect(40, currentY, 515, 20).fill('#374151');
        doc.fillColor('#FFFFFF').fontSize(8);
        doc.text('Ngay', 55, currentY + 6);
        doc.text('So luong don', 180, currentY + 6);
        doc.text('Tien coc online', 300, currentY + 6);
        doc.text('Doanh thu trong ngay', 420, currentY + 6);

        currentY += 20;

        for (let i = 0; i < data.dailyBreakdown.length; i++) {
          if (currentY > 750) {
            doc.addPage();
            currentY = 40;
          }
          const d = data.dailyBreakdown[i];
          const rowBg = i % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
          doc.rect(40, currentY, 515, 16).fill(rowBg);
          doc.fillColor('#1F2937').fontSize(8);
          doc.text(d.date, 55, currentY + 4);
          doc.text(`${d.bookingsCount} don`, 180, currentY + 4);
          doc.text(formatCurrencyVN(d.deposits), 300, currentY + 4);
          doc.text(formatCurrencyVN(d.revenue), 420, currentY + 4);
          currentY += 16;
        }
      }

      // Footer
      doc.fontSize(8).fillColor('#9CA3AF').text(
        'Bao cao duoc tao tu dong boi he thong Motorent Enterprise. Moi thac mac vui long lien he phong Tai chinh - Ke toan.',
        40,
        780,
        { align: 'center', width: 515 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
