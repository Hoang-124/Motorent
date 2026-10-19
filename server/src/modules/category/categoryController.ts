import { Request, Response, NextFunction } from 'express';
import * as categoryService from './categoryService';
import { createCategorySchema, updateCategorySchema } from './categoryValidation';

export const getCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await categoryService.getAllCategories();
    res.json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = createCategorySchema.parse(req.body);
    const category = await categoryService.createCategory(data);
    res.status(201).json({ success: true, message: 'Đã tạo danh mục xe.', data: category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = updateCategorySchema.parse(req.body);
    const category = await categoryService.updateCategory(req.params.id, data);
    res.json({ success: true, message: 'Đã cập nhật danh mục xe.', data: category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await categoryService.deleteCategory(req.params.id);
    res.json({ success: true, message: 'Đã xóa danh mục xe.', data: category });
  } catch (error) {
    next(error);
  }
};
