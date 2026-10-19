import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as adminService from './adminService';

const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
    .max(30, 'Tên đăng nhập tối đa 30 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ được chứa chữ cái, chữ số và dấu gạch dưới'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').optional(),
  email: z.string().trim().email('Địa chỉ email không đúng định dạng').optional().or(z.literal('')),
  firstName: z.string().trim().min(1, 'Họ đệm không được để trống'),
  lastName: z.string().trim().min(1, 'Tên không được để trống'),
  phoneNumber: z.string().trim().optional(),
  roles: z.enum(['SystemAdmin', 'BranchManager', 'Staff', 'Customer']).default('BranchManager'),
  branchId: z.string().optional().nullable(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dob: z.string().optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  phoneNumber: z.string().trim().optional(),
  email: z.string().trim().email('Email không hợp lệ').optional().or(z.literal('')),
  roles: z.enum(['SystemAdmin', 'BranchManager', 'Staff', 'Customer']).optional(),
  branchId: z.string().optional().nullable(),
  status: z.enum(['Active', 'Suspended', 'Unverified']).optional(),
  password: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự').optional().or(z.literal('')),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dob: z.string().optional(),
});

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = createUserSchema.parse(req.body);
    const user = await adminService.createUser({
      ...data,
      email: data.email || undefined,
      branchId: data.branchId || undefined,
    });
    res.status(201).json({
      success: true,
      message: `Tạo tài khoản ${user.roles} thành công.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      role: req.query.role as string | undefined,
      status: req.query.status as string | undefined,
      branchId: req.query.branchId as string | undefined,
      search: req.query.search as string | undefined,
    };
    const result = await adminService.getUsers(query);
    res.json({
      success: true,
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await adminService.getUserById(req.params.id);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = updateUserSchema.parse(req.body);
    const updatedUser = await adminService.updateUser(req.params.id, {
      ...data,
      password: data.password || undefined,
      email: data.email || undefined,
    });
    res.json({
      success: true,
      message: 'Cập nhật thông tin tài khoản thành công.',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await adminService.deleteUser(req.params.id);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const lockUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reason = req.body?.reason as string | undefined;
    const result = await adminService.lockUser(req.params.id, reason);
    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const unlockUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await adminService.unlockUser(req.params.id);
    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
