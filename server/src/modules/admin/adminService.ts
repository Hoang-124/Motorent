import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, IUser, UserRole, UserStatus } from '../../models/User';
import { Branch } from '../../models/Branch';
import { AppError } from '../../core/errorHandler';

export interface CreateUserInput {
  username: string;
  password?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  roles?: UserRole;
  branchId?: string | null;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: Date | string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  roles?: UserRole;
  branchId?: string | null;
  status?: UserStatus;
  password?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: Date | string;
}

export interface GetUsersQuery {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  branchId?: string;
  search?: string;
}

export const createUser = async (data: CreateUserInput): Promise<Omit<IUser, 'passwordHash'>> => {
  const normalizedUsername = data.username.trim().toLowerCase();

  const existingUsername = await User.findOne({ username: normalizedUsername });
  if (existingUsername) {
    throw new AppError(409, `Tên đăng nhập "${data.username}" đã tồn tại trên hệ thống.`);
  }

  if (data.email && data.email.trim()) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      throw new AppError(409, `Địa chỉ email "${data.email}" đã được đăng ký.`);
    }
  }

  // Validate branch if assigned
  let branchObjectId: mongoose.Types.ObjectId | undefined = undefined;
  if (data.branchId && mongoose.isValidObjectId(data.branchId)) {
    const branch = await Branch.findById(data.branchId);
    if (!branch) {
      throw new AppError(404, 'Chi nhánh được chỉ định không tồn tại.');
    }
    branchObjectId = new mongoose.Types.ObjectId(data.branchId);
  }

  const rawPassword = data.password && data.password.trim() ? data.password : 'Motorent@2026';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const role = data.roles || 'BranchManager';

  const user = await User.create({
    username: normalizedUsername,
    email: data.email?.trim().toLowerCase() || undefined,
    passwordHash,
    firstName: data.firstName?.trim() || '',
    lastName: data.lastName?.trim() || '',
    phoneNumber: data.phoneNumber?.trim() || '',
    gender: data.gender || 'Other',
    dob: data.dob ? new Date(data.dob) : undefined,
    roles: role,
    status: 'Active',
    isEmailVerified: true,
    branchId: branchObjectId,
    tokenVersion: 0,
    failedLoginAttempts: 0,
  });

  // If role is BranchManager and branchId is provided, link manager to Branch
  if (role === 'BranchManager' && branchObjectId) {
    await Branch.findByIdAndUpdate(branchObjectId, { managerId: user._id });
  }

  const userObj = user.toObject();
  const { passwordHash: _, ...sanitizedUser } = userObj;
  return sanitizedUser as unknown as Omit<IUser, 'passwordHash'>;
};

export const getUsers = async (query: GetUsersQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};

  if (query.role && query.role !== 'all') {
    filter.roles = query.role;
  }

  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  }

  if (query.branchId && query.branchId !== 'all') {
    filter.branchId = query.branchId;
  }

  if (query.search && query.search.trim()) {
    const searchRegex = new RegExp(query.search.trim(), 'i');
    filter.$or = [
      { username: searchRegex },
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
      { phoneNumber: searchRegex },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash -resetPasswordToken -emailVerificationToken')
      .populate('branchId', 'name code address phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getUserById = async (id: string) => {
  const user = await User.findById(id)
    .select('-passwordHash -resetPasswordToken -emailVerificationToken')
    .populate('branchId', 'name code address phone');

  if (!user) {
    throw new AppError(404, 'Không tìm thấy người dùng.');
  }

  return user;
};

export const updateUser = async (id: string, data: UpdateUserInput) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError(404, 'Không tìm thấy người dùng để cập nhật.');
  }

  if (data.email && data.email.trim().toLowerCase() !== user.email) {
    const existing = await User.findOne({
      email: data.email.trim().toLowerCase(),
      _id: { $ne: id },
    });
    if (existing) {
      throw new AppError(409, `Địa chỉ email "${data.email}" đã được đăng ký bởi tài khoản khác.`);
    }
    user.email = data.email.trim().toLowerCase();
  }

  if (data.firstName !== undefined) user.firstName = data.firstName.trim();
  if (data.lastName !== undefined) user.lastName = data.lastName.trim();
  if (data.phoneNumber !== undefined) user.phoneNumber = data.phoneNumber.trim();
  if (data.gender !== undefined) user.gender = data.gender;
  if (data.dob !== undefined) user.dob = data.dob ? new Date(data.dob) : undefined;
  if (data.status !== undefined) user.status = data.status;

  // Handle password change if specified
  if (data.password && data.password.trim()) {
    user.passwordHash = await bcrypt.hash(data.password.trim(), 10);
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate current sessions
  }

  const oldRole = user.roles;
  const oldBranchId = user.branchId?.toString();
  const newRole = data.roles || oldRole;
  const newBranchId = data.branchId !== undefined ? (data.branchId ? data.branchId.toString() : null) : oldBranchId;

  if (data.roles) {
    user.roles = data.roles;
  }

  if (data.branchId !== undefined) {
    if (data.branchId && mongoose.isValidObjectId(data.branchId)) {
      user.branchId = new mongoose.Types.ObjectId(data.branchId);
    } else {
      user.branchId = undefined;
      user.set('branchId', undefined);
    }
  }

  // Branch link/unlink side-effects for BranchManager role
  if (oldRole === 'BranchManager' && (newRole !== 'BranchManager' || newBranchId !== oldBranchId)) {
    // Unlink old branch if user was manager
    if (oldBranchId) {
      await Branch.updateOne({ _id: oldBranchId, managerId: user._id }, { $unset: { managerId: 1 } });
    }
  }

  if (newRole === 'BranchManager' && newBranchId && mongoose.isValidObjectId(newBranchId)) {
    await Branch.findByIdAndUpdate(newBranchId, { managerId: user._id });
  }

  await user.save();

  const userObj = user.toObject();
  const { passwordHash: _, ...sanitizedUser } = userObj;
  return sanitizedUser;
};

export const deleteUser = async (id: string) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError(404, 'Không tìm thấy người dùng.');
  }

  if (user.roles === 'SystemAdmin') {
    throw new AppError(400, 'Không thể xóa tài khoản Quản trị viên cấp cao (SystemAdmin).');
  }

  // Unlink from branch if was manager
  if (user.roles === 'BranchManager' && user.branchId) {
    await Branch.updateOne({ _id: user.branchId, managerId: user._id }, { $unset: { managerId: 1 } });
  }

  // Soft suspend
  user.status = 'Suspended';
  user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all active sessions
  await user.save();

  return { message: 'Đã tạm khóa tài khoản thành công.' };
};

export const lockUser = async (id: string, reason?: string) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError(404, 'Không tìm thấy người dùng để khóa.');
  }

  if (user.roles === 'SystemAdmin') {
    throw new AppError(400, 'Không thể khóa tài khoản SystemAdmin.');
  }

  user.status = 'Suspended';
  user.tokenVersion = (user.tokenVersion || 0) + 1; // Crucial: Invalidate JWT immediately (UC-100)
  await user.save();

  return {
    id: user._id,
    username: user.username,
    status: user.status,
    message: reason ? `Đã tạm khóa tài khoản: ${reason}` : 'Đã tạm khóa tài khoản và thu hồi toàn bộ token đăng nhập.',
  };
};

export const unlockUser = async (id: string) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError(404, 'Không tìm thấy người dùng để mở khóa.');
  }

  user.status = 'Active';
  user.failedLoginAttempts = 0; // Reset failed attempts (UC-101)
  user.lockUntil = undefined;
  await user.save();

  return {
    id: user._id,
    username: user.username,
    status: user.status,
    message: 'Đã kích hoạt lại tài khoản thành công.',
  };
};
