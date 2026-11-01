import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, Branch, AuditLog } from '../../models';
import { AuthenticatedRequest } from '../../core/authMiddleware';

/**
 * Get staff list (UC-81 context)
 * SystemAdmin can see all or filter by branch; BranchManager can only see staff in their assigned branch
 */
export const getStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userRole = req.user?.roles;
    const managerBranchId = req.user?.branchId;

    const query: Record<string, any> = { roles: 'Staff' };

    if (userRole === 'BranchManager') {
      if (!managerBranchId) {
        res.status(403).json({ success: false, message: 'Tài khoản Quản lý chưa được gán chi nhánh công tác.' });
        return;
      }
      query.branchId = managerBranchId;
    } else if (req.query.branchId) {
      query.branchId = req.query.branchId;
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    if (req.query.search) {
      const searchStr = String(req.query.search).trim();
      query.$or = [
        { username: { $regex: searchStr, $options: 'i' } },
        { email: { $regex: searchStr, $options: 'i' } },
        { phoneNumber: { $regex: searchStr, $options: 'i' } },
        { firstName: { $regex: searchStr, $options: 'i' } },
        { lastName: { $regex: searchStr, $options: 'i' } },
      ];
    }

    const staffList = await User.find(query)
      .populate('branchId', 'name code address')
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: staffList.length,
      data: staffList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Staff account (UC-81)
 * Role: BranchManager, SystemAdmin
 */
export const createStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, email, password, firstName, lastName, phoneNumber, branchId: reqBranchId } = req.body;

    const userRole = req.user?.roles;
    let targetBranchId: any = reqBranchId;

    if (userRole === 'BranchManager') {
      targetBranchId = req.user?.branchId;
      if (!targetBranchId) {
        res.status(403).json({ success: false, message: 'Quản lý chưa được gán chi nhánh để tạo nhân viên.' });
        return;
      }
    }

    if (!targetBranchId) {
      res.status(400).json({ success: false, message: 'Vui lòng chọn chi nhánh công tác cho nhân viên.' });
      return;
    }

    if (!email || !password || !firstName || !lastName || !phoneNumber) {
      res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các thông tin bắt buộc.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { username: (username || cleanEmail).trim() }],
    });

    if (existingUser) {
      res.status(400).json({ success: false, message: 'Email hoặc tên tài khoản đã tồn tại trong hệ thống.' });
      return;
    }

    const branch = await Branch.findById(targetBranchId);
    if (!branch) {
      res.status(404).json({ success: false, message: 'Chi nhánh được chọn không tồn tại.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newStaff = await User.create({
      username: username ? username.trim() : cleanEmail.split('@')[0],
      email: cleanEmail,
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber.trim(),
      roles: 'Staff',
      branchId: targetBranchId,
      status: 'Active',
      isEmailVerified: true,
      identityStatus: 'Verified',
    });

    await AuditLog.create({
      userId: req.user?._id,
      action: 'CREATE_STAFF',
      entityType: 'User',
      entityId: newStaff._id,
      details: {
        staffName: `${newStaff.firstName} ${newStaff.lastName}`,
        email: newStaff.email,
        branchId: targetBranchId,
        branchCode: branch.code,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản nhân viên thành công.',
      data: {
        _id: newStaff._id,
        username: newStaff.username,
        email: newStaff.email,
        fullName: `${newStaff.firstName} ${newStaff.lastName}`,
        roles: newStaff.roles,
        branchId: targetBranchId,
        status: newStaff.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Edit Staff account (UC-82)
 * Role: BranchManager, SystemAdmin
 */
export const updateStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phoneNumber, branchId: reqBranchId } = req.body;

    const staff = await User.findOne({ _id: id, roles: 'Staff' });
    if (!staff) {
      res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên.' });
      return;
    }

    if (req.user?.roles === 'BranchManager') {
      if (String(staff.branchId) !== String(req.user.branchId)) {
        res.status(403).json({ success: false, message: 'Bạn chỉ có quyền quản lý nhân viên tại chi nhánh của mình.' });
        return;
      }
    }

    if (firstName) staff.firstName = firstName.trim();
    if (lastName) staff.lastName = lastName.trim();
    if (phoneNumber) staff.phoneNumber = phoneNumber.trim();

    if (req.user?.roles === 'SystemAdmin' && reqBranchId) {
      staff.branchId = reqBranchId;
    }

    await staff.save();

    await AuditLog.create({
      userId: req.user?._id,
      action: 'UPDATE_STAFF',
      entityType: 'User',
      entityId: staff._id,
      details: {
        staffName: `${staff.firstName} ${staff.lastName}`,
        phoneNumber: staff.phoneNumber,
        branchId: staff.branchId,
      },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Cập nhật thông tin nhân viên thành công.',
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate Staff account (UC-83)
 * Sets status='Suspended' and increments tokenVersion to revoke active sessions
 */
export const deactivateStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const staff = await User.findOne({ _id: id, roles: 'Staff' });
    if (!staff) {
      res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên.' });
      return;
    }

    if (req.user?.roles === 'BranchManager') {
      if (String(staff.branchId) !== String(req.user.branchId)) {
        res.status(403).json({ success: false, message: 'Bạn chỉ có quyền quản lý nhân viên tại chi nhánh của mình.' });
        return;
      }
    }

    staff.status = 'Suspended';
    staff.tokenVersion = (staff.tokenVersion || 0) + 1;
    await staff.save();

    await AuditLog.create({
      userId: req.user?._id,
      action: 'DEACTIVATE_STAFF',
      entityType: 'User',
      entityId: staff._id,
      details: {
        staffEmail: staff.email,
        branchId: staff.branchId,
        reason: 'Quản lý đình chỉ tài khoản nhân viên.',
      },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Đã tạm khóa tài khoản nhân viên thành công.',
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reactivate Staff account
 */
export const activateStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const staff = await User.findOne({ _id: id, roles: 'Staff' });
    if (!staff) {
      res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên.' });
      return;
    }

    if (req.user?.roles === 'BranchManager') {
      if (String(staff.branchId) !== String(req.user.branchId)) {
        res.status(403).json({ success: false, message: 'Bạn chỉ có quyền quản lý nhân viên tại chi nhánh của mình.' });
        return;
      }
    }

    staff.status = 'Active';
    staff.failedLoginAttempts = 0;
    await staff.save();

    await AuditLog.create({
      userId: req.user?._id,
      action: 'ACTIVATE_STAFF',
      entityType: 'User',
      entityId: staff._id,
      details: { staffEmail: staff.email },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Đã kích hoạt lại tài khoản nhân viên thành công.',
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};
