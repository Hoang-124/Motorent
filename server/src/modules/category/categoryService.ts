import mongoose from 'mongoose';
import { Category, ICategory } from '../../models/Category';
import { Vehicle } from '../../models/Vehicle';
import { AppError } from '../../core/errorHandler';
import { CreateCategoryInput, UpdateCategoryInput } from './categoryValidation';
import { withResourceLock } from '../../core/resourceLock';

const parseCategoryId = (id: string): mongoose.Types.ObjectId => {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new AppError(400, 'Mã danh mục không hợp lệ.');
  }
  return new mongoose.Types.ObjectId(id);
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const checkDuplicates = async (data: UpdateCategoryInput, excludeId?: mongoose.Types.ObjectId): Promise<void> => {
  const excluded = excludeId ? { _id: { $ne: excludeId } } : {};
  const [sameName, sameSlug] = await Promise.all([
    data.name === undefined ? null : Category.exists({ ...excluded, name: new RegExp(`^${escapeRegex(data.name)}$`, 'i') }),
    data.slug === undefined ? null : Category.exists({ ...excluded, slug: data.slug }),
  ]);
  if (sameName) throw new AppError(409, 'Tên danh mục đã tồn tại. Vui lòng chọn tên khác.');
  if (sameSlug) throw new AppError(409, 'Slug danh mục đã tồn tại. Vui lòng chọn slug khác.');
};

const rethrowDuplicate = (error: unknown): never => {
  if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
    const field = 'keyPattern' in error && error.keyPattern && typeof error.keyPattern === 'object'
      && 'name' in error.keyPattern ? 'Tên' : 'Slug';
    throw new AppError(409, `${field} danh mục đã tồn tại. Vui lòng chọn giá trị khác.`);
  }
  throw error;
};

const withVehicleCount = async (category: ICategory) => ({
  ...category.toObject(),
  vehicleCount: await Vehicle.countDocuments({ category: category._id, isDeleted: { $ne: true } }),
});

export const getAllCategories = async () => {
  const [categories, vehicleCounts] = await Promise.all([
    Category.find().sort({ name: 1, _id: 1 }).lean(),
    Vehicle.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  ]);
  const counts = new Map(vehicleCounts.map(({ _id, count }) => [String(_id), count]));
  return categories.map((category) => ({ ...category, vehicleCount: counts.get(String(category._id)) ?? 0 }));
};

export const createCategory = async (data: CreateCategoryInput) => {
  await checkDuplicates(data);
  try {
    const category = await Category.create({ name: data.name, slug: data.slug, description: data.description ?? '' });
    return { ...category.toObject(), vehicleCount: 0 };
  } catch (error) {
    rethrowDuplicate(error);
  }
};

export const updateCategory = async (id: string, data: UpdateCategoryInput) => {
  const categoryId = parseCategoryId(id);
  const category = await Category.findById(categoryId);
  if (!category) throw new AppError(404, 'Không tìm thấy danh mục.');
  await checkDuplicates(data, categoryId);
  if (data.name !== undefined) category.name = data.name;
  if (data.slug !== undefined) category.slug = data.slug;
  if (data.description !== undefined) category.description = data.description;
  try {
    await category.save();
  } catch (error) {
    rethrowDuplicate(error);
  }
  return withVehicleCount(category);
};

export const deleteCategory = async (id: string) => {
  const categoryId = parseCategoryId(id);
  return withResourceLock(`category:${id}`, async () => {
  const category = await Category.findById(categoryId);
  if (!category) throw new AppError(404, 'Không tìm thấy danh mục.');
  const vehicleCount = await Vehicle.countDocuments({ category: categoryId, isDeleted: { $ne: true } });
  if (vehicleCount > 0) {
    throw new AppError(409, `Không thể xóa danh mục đang được ${vehicleCount} xe sử dụng. Hãy chuyển các xe sang danh mục khác trước.`);
  }
  const deleted = await Category.findOneAndDelete({ _id: categoryId });
  if (!deleted) throw new AppError(404, 'Danh mục đã được xóa.');
  return { ...deleted.toObject(), vehicleCount: 0 };
  });
};
