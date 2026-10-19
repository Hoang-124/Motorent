import mongoose from 'mongoose';
import { Wishlist, IWishlist } from '../../models/Wishlist';
import { Vehicle } from '../../models/Vehicle';
import { AppError } from '../../core/errorHandler';

export async function addToWishlist(userId: string, vehicleId: string): Promise<IWishlist | null> {
  if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
    throw new AppError(404, 'Phương tiện không tồn tại.');
  }

  // Xe phải tồn tại và chưa bị xóa
  const vehicle = await Vehicle.findOne({ _id: vehicleId, isDeleted: false });
  if (!vehicle) {
    throw new AppError(404, 'Phương tiện không tồn tại hoặc đã ngừng kinh doanh.');
  }

  // Idempotent: Nếu đã có trong wishlist thì trả về bản ghi hiện tại
  const existing = await Wishlist.findOne({ userId, vehicleId });
  if (existing) {
    return existing;
  }

  // Giới hạn tối đa 200 xe / user
  const count = await Wishlist.countDocuments({ userId });
  if (count >= 200) {
    throw new AppError(400, 'Danh sách yêu thích đã đạt giới hạn tối đa 200 xe.');
  }

  try {
    const item = await Wishlist.create({ userId, vehicleId });
    return item;
  } catch (err: any) {
    // Bắt lỗi unique constraint khi 2 request đồng thời và coi là thành công
    if (err && (err.code === 11000 || err.message?.includes('E11000') || err.message?.includes('duplicate key'))) {
      const raceItem = await Wishlist.findOne({ userId, vehicleId });
      return raceItem;
    }
    throw err;
  }
}

export async function removeFromWishlist(userId: string, vehicleId: string): Promise<void> {
  if (mongoose.Types.ObjectId.isValid(vehicleId)) {
    await Wishlist.deleteOne({ userId, vehicleId });
  }
}

export interface GetWishlistParams {
  userId: string;
  page?: number;
  limit?: number;
}

export async function getWishlist(params: GetWishlistParams) {
  const { userId } = params;
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params.limit) || 10));
  const skip = (page - 1) * limit;

  const [total, items] = await Promise.all([
    Wishlist.countDocuments({ userId }),
    Wishlist.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'vehicleId',
        populate: { path: 'branchId', select: 'name code address' },
        select:
          'vehicleModel brand licensePlate odometer dailyPrice hourlyPrice status transmissionType fuelType yearManufactured color images isDeleted averageRating reviewCount',
      })
      .lean(),
  ]);

  const formattedItems = items.map((item: any) => {
    const v = item.vehicleId;
    // Rule: xe đã ngừng hoạt động/bị xóa sau khi được yêu thích: vẫn trả item nhưng kèm isAvailable=false
    const isAvailable = Boolean(v && !v.isDeleted && v.status === 'Available');

    return {
      _id: item._id,
      vehicleId: v ? v._id : item.vehicleId,
      vehicle: v
        ? {
            _id: v._id,
            vehicleModel: v.vehicleModel,
            brand: v.brand,
            licensePlate: v.licensePlate,
            odometer: v.odometer,
            dailyPrice: v.dailyPrice,
            hourlyPrice: v.hourlyPrice,
            status: v.status,
            transmissionType: v.transmissionType,
            fuelType: v.fuelType,
            yearManufactured: v.yearManufactured,
            color: v.color,
            images: v.images || [],
            isDeleted: v.isDeleted || false,
            averageRating: v.averageRating || 0,
            reviewCount: v.reviewCount || 0,
            branchId: v.branchId,
          }
        : null,
      isAvailable,
      createdAt: item.createdAt,
    };
  });

  return {
    items: formattedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getWishlistIds(userId: string): Promise<string[]> {
  const items = await Wishlist.find({ userId }).select('vehicleId').lean();
  return items.map((item) => item.vehicleId.toString());
}
