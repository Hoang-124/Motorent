import mongoose from 'mongoose';
import { Category } from '../../models/Category';
import { Vehicle } from '../../models/Vehicle';
import { AppError } from '../../core/errorHandler';

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isDuplicateKeyError = (error: unknown): error is { code: number } =>
  typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 11000;

const duplicateCategoryError = (): AppError =>
  new AppError(409, 'Tên hoặc slug danh mục đã tồn tại.');

export const getCategories = async () => Category.find().sort({ name: 1 });

export const createCategory = async (data: CreateCategoryInput) => {
  const name = data.name.trim();
  const slug = data.slug.trim().toLowerCase();
  const existing = await Category.findOne({
    $or: [
      { name: new RegExp(`^${escapeRegExp(name)}$`, 'i') },
      { slug },
    ],
  });

  if (existing) {
    const message = existing.slug === slug
      ? `Slug "${slug}" đã được sử dụng.`
      : `Tên danh mục "${name}" đã được sử dụng.`;
    throw new AppError(409, message);
  }

  try {
    return await Category.create({ name, slug, description: data.description?.trim() ?? '' });
  } catch (error) {
    if (isDuplicateKeyError(error)) throw duplicateCategoryError();
    throw error;
  }
};

export const updateCategory = async (id: string, data: UpdateCategoryInput) => {
  const category = await Category.findById(id);
  if (!category) throw new AppError(404, 'Không tìm thấy danh mục xe.');

  if (data.name !== undefined) {
    const name = data.name.trim();
    const duplicateName = await Category.findOne({
      _id: { $ne: new mongoose.Types.ObjectId(id) },
      name: new RegExp(`^${escapeRegExp(name)}$`, 'i'),
    });
    if (duplicateName) throw new AppError(409, `Tên danh mục "${name}" đã được sử dụng.`);
    category.name = name;
  }

  if (data.description !== undefined) category.description = data.description.trim();

  try {
    return await category.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) throw duplicateCategoryError();
    throw error;
  }
};

export const deleteCategory = async (id: string) => {
  const category = await Category.findById(id);
  if (!category) throw new AppError(404, 'Không tìm thấy danh mục xe.');

  const assignedVehicle = await Vehicle.exists({ category: category._id });
  if (assignedVehicle) {
    throw new AppError(
      409,
      'Không thể xóa danh mục vì vẫn còn xe được gán. Hãy chuyển các xe sang danh mục khác trước.'
    );
  }

  await category.deleteOne();
  return category;
};
