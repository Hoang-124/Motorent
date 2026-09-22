import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { connectDatabase } from './config/database';
import { errorHandler } from './core/errorHandler';
import {
  Branch,
  Vehicle,
  Booking,
  User,
  Category,
  VehicleTransfer,
  MaintenanceLog,
  StaffSchedule,
  Complaint,
  AuditLog,
  Discount,
  Feedback,
  Notification,
  BookingReminder,
  Conversation,
  Message,
  Banner,
  StaticPage,
} from './models';

import authRoutes from './modules/auth/authRoutes';

const app = express();
const server = http.createServer(app);

// Socket.IO setup
export const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  },
});

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded static files (avatars, eKYC licenses)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Mount Modules
app.use('/api/auth', authRoutes);

// Health check & System Stats route
app.get('/api/health', async (req, res) => {
  try {
    const stats = {
      status: 'UP',
      timestamp: new Date(),
      database: 'Connected',
      collections: {
        branches: await Branch.countDocuments(),
        users: await User.countDocuments(),
        categories: await Category.countDocuments(),
        vehicles: await Vehicle.countDocuments(),
        bookings: await Booking.countDocuments(),
        vehicleTransfers: await VehicleTransfer.countDocuments(),
        maintenanceLogs: await MaintenanceLog.countDocuments(),
        staffSchedules: await StaffSchedule.countDocuments(),
        complaints: await Complaint.countDocuments(),
        auditLogs: await AuditLog.countDocuments(),
        discounts: await Discount.countDocuments(),
        feedbacks: await Feedback.countDocuments(),
        notifications: await Notification.countDocuments(),
        bookingReminders: await BookingReminder.countDocuments(),
        conversations: await Conversation.countDocuments(),
        messages: await Message.countDocuments(),
        banners: await Banner.countDocuments(),
        staticPages: await StaticPage.countDocuments(),
      },
    };
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Branches API
app.get('/api/branches', async (req, res) => {
  try {
    const branches = await Branch.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, count: branches.length, data: branches });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Categories API
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ success: true, count: categories.length, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Vehicles API (with category & branch populated)
app.get('/api/vehicles', async (req, res) => {
  try {
    const { branchId, category, status } = req.query;
    const filter: any = {};
    if (branchId) filter.branchId = branchId;
    if (category) filter.category = category;
    if (status) filter.status = status;

    const vehicles = await Vehicle.find(filter)
      .populate('branchId', 'name code address phone hours_open hours_close')
      .populate('category', 'name slug')
      .sort({ dailyPrice: 1 });

    res.json({ success: true, count: vehicles.length, data: vehicles });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bookings API
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('vehicleId', 'vehicleModel brand licensePlate dailyPrice images')
      .populate('pickupBranchId', 'name address phone')
      .populate('returnBranchId', 'name address phone')
      .populate('userId', 'username firstName lastName phoneNumber email')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const {
      vehicleId,
      pickupBranchId,
      returnBranchId,
      pickupDateTime,
      returnDateTime,
      customerName,
      customerPhone,
      paymentMethod = 'Banking',
    } = req.body;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Xe không tồn tại trong hệ thống.' });
    }

    const start = new Date(pickupDateTime);
    const end = new Date(returnDateTime);
    const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
    const totalAmount = diffDays * vehicle.dailyPrice;
    const depositAmount = Math.round(totalAmount * 0.3);
    const remainingAmount = totalAmount - depositAmount;

    // Find or create customer
    let user = await User.findOne({ phoneNumber: customerPhone });
    if (!user) {
      user = await User.create({
        username: customerPhone,
        phoneNumber: customerPhone,
        firstName: customerName || 'Khách Hàng',
        roles: 'Customer',
        status: 'Active',
      });
    }

    const bookingCode = `MV-${Date.now().toString().slice(-6)}`;

    const newBooking = await Booking.create({
      bookingCode,
      userId: user._id,
      vehicleId: vehicle._id,
      pickupBranchId,
      returnBranchId,
      pickupDateTime: start,
      returnDateTime: end,
      totalAmount,
      depositAmount,
      remainingAmount,
      paymentMethod,
      startOdometer: vehicle.odometer || 0,
      status: 'Confirmed',
      isPaid: true,
    });

    // Update vehicle status
    await Vehicle.findByIdAndUpdate(vehicleId, { status: 'Rented' });

    res.status(201).json({
      success: true,
      message: 'Đặt xe thành công! Vui lòng lưu mã để nhận xe tại chi nhánh.',
      data: newBooking,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log(`⚡ Socket connected: ${socket.id}`);

  socket.on('join_conversation', (conversationId: string) => {
    socket.join(conversationId);
    console.log(`👤 Socket ${socket.id} joined conversation: ${conversationId}`);
  });

  socket.on('leave_conversation', (conversationId: string) => {
    socket.leave(conversationId);
    console.log(`🚪 Socket ${socket.id} left conversation: ${conversationId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use(errorHandler);

// Connect DB and start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDatabase();
  server.listen(PORT, () => {
    console.log(`🚀 MOTORENT Server running on http://localhost:${PORT}`);
    console.log(`📡 Realtime Socket.IO initialized`);
    console.log(`🩺 Health check endpoint: http://localhost:${PORT}/api/health`);
  });
};

startServer();
