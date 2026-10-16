import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AppError } from '../../core/errorHandler';
import * as categoryService from './categoryService';

const nameSchema = z.string().trim().min(2, 'Tên danh mục phải có tối thiểu 2 ký tự.').max(80);
const descriptionSchema = z.string().trim().max(500, 'Mô tả không được vượt quá 500 ký tự.');

const createCategorySchema = z.object({
  name: nameSchema,
  slug: z.string()
    .trim()
    .min(2, 'Slug danh mục phải có tối thiểu 2 ký tự.')
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, 'Slug chỉ gồm chữ cái, số và dấu gạch ngang.'),
  description: descriptionSchema.optional(),
});

const updateCategorySchema = z.object({
  name: nameSchema.optional(),
  description: descriptionSchema.optional(),
}).refine((data) => data.name !== undefined || data.description !== undefined, {
  message: 'Cần cung cấp tên hoặc mô tả để cập nhật danh mục.',
});

const assertValidId = (id: string): void => {
  if (!/^[a-f\d]{24}$/i.test(id) || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Mã danh mục không hợp lệ.');
  }
};

export const getCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await categoryService.getCategories();
    res.json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = createCategorySchema.parse(req.body);
    const category = await categoryService.createCategory(data);
    res.status(201).json({ success: true, message: 'Tạo danh mục xe mới thành công.', data: category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    assertValidId(req.params.id);
    const data = updateCategorySchema.parse(req.body);
    const category = await categoryService.updateCategory(req.params.id, data);
    res.json({ success: true, message: 'Cập nhật danh mục xe thành công.', data: category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    assertValidId(req.params.id);
    const category = await categoryService.deleteCategory(req.params.id);
    res.json({ success: true, message: 'Xóa danh mục xe thành công.', data: category });
  } catch (error) {
    next(error);
  }
};
