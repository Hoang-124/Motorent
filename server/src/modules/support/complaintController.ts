import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import { AppError } from '../../core/errorHandler';
import { validateImageOrPdfMagicBytes } from '../../core/uploadMiddleware';
import * as complaintService from './complaintService';

/**
 * Clean up uploaded files on error or validation failure
 */
const cleanupFiles = async (files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] }) => {
  if (!files) return;
  const fileList = Array.isArray(files) ? files : Object.values(files).flat();
  for (const f of fileList) {
    if (f.path) {
      await fs.promises.unlink(f.path).catch(() => {});
    }
  }
};

/**
 * UC-42: GET /complaints/categories
 * Returns complaint categories list for frontend dropdown
 */
export const getCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = [
      { id: 'Vehicle', name: 'Phương tiện', description: 'Sự cố hoặc tình trạng phương tiện' },
      { id: 'Service', name: 'Dịch vụ', description: 'Chất lượng dịch vụ hỗ trợ và thuê xe' },
      { id: 'Payment', name: 'Thanh toán', description: 'Sự cố trừ tiền, cọc, hoàn tiền VNPay' },
      { id: 'Staff', name: 'Nhân viên', description: 'Thái độ phục vụ của nhân viên chi nhánh' },
      { id: 'Other', name: 'Khác', description: 'Các vấn đề phát sinh khác' },
    ];

    res.json({
      success: true,
      data: categories,
      categories: ['Vehicle', 'Service', 'Payment', 'Staff', 'Other'],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-42: POST /complaints (multipart: bookingId, category, description, attachments[])
 * Submit a customer complaint tied to their booking
 */
export const submitComplaint = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const uploadedFiles = req.files as Express.Multer.File[] | undefined;

  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const attachments: string[] = [];
    if (uploadedFiles && uploadedFiles.length > 0) {
      if (uploadedFiles.length > 5) {
        await cleanupFiles(uploadedFiles);
        throw new AppError(400, 'Số lượng tệp đính kèm tối đa là 5 tệp.');
      }

      for (const file of uploadedFiles) {
        const isValid = await validateImageOrPdfMagicBytes(file.path);
        if (!isValid) {
          await cleanupFiles(uploadedFiles);
          throw new AppError(
            400,
            'Tệp đính kèm không đúng định dạng JPG, PNG hoặc PDF hợp lệ.'
          );
        }
        attachments.push(`/uploads/${file.filename}`);
      }
    }

    const { bookingId, category, description, title } = req.body;

    const complaint = await complaintService.submitComplaint(
      req.user._id.toString(),
      {
        bookingId,
        category,
        description,
        attachments,
        title,
      }
    );

    res.status(201).json({
      success: true,
      message: 'Gửi khiếu nại thành công! MOTORENT sẽ tiếp nhận và xử lý trong thời gian sớm nhất.',
      data: complaint,
      code: complaint.code,
    });
  } catch (error) {
    if (uploadedFiles) {
      await cleanupFiles(uploadedFiles);
    }
    next(error);
  }
};

/**
 * Backward compatibility alias for submitComplaint
 */
/**
 * UC-43: GET /me/complaints?status&page&limit and GET /complaints
 * Returns list of customer's own complaints sorted newest first
 */
export const getMyComplaints = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const result = await complaintService.getMyComplaints(
      req.user._id.toString(),
      req.query
    );

    res.json({
      success: true,
      count: result.items.length,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      data: result.items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-43: GET /complaints/:id and GET /me/complaints/:id
 * Returns detail of customer's own complaint with timeline and final resolution
 */
export const getComplaintDetail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const detail = await complaintService.getComplaintDetail(
      req.user._id.toString(),
      req.params.id
    );

    res.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-85: GET /manager/complaints/pending?page&limit
 * Manager lists pending complaints (InProgress or Resolved, not Closed)
 */
export const getPendingComplaints = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const result = await complaintService.getPendingComplaintsForManager(
      req.user,
      req.query
    );

    res.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-85: POST /manager/complaints/:id/resolve
 * Manager updates complaint with final resolution (min 10 chars)
 */
export const resolveComplaint = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const { finalResolution } = req.body;
    const complaint = await complaintService.resolveComplaintByManager(
      req.params.id,
      finalResolution,
      req.user
    );

    res.json({
      success: true,
      message: 'Cập nhật kết luận giải quyết khiếu nại thành công.',
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-85: POST /manager/complaints/:id/close
 * Manager officially closes the complaint (terminal action)
 */
export const closeComplaint = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const complaint = await complaintService.closeComplaintByManager(
      req.params.id,
      req.user
    );

    res.json({
      success: true,
      message: 'Đóng khiếu nại thành công! Khiếu nại đã chuyển sang chế độ lưu trữ vĩnh viễn.',
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * GET /staff/complaints/:id and /manager/complaints/:id
 * Staff / Manager views detailed complaint with timeline
 */
export const getStaffOrManagerComplaintDetail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const detail = await complaintService.getComplaintDetailsForStaffOrManager(
      req.params.id,
      req.user
    );

    res.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /staff/complaints/:id/response
 * Add a message response to complaint
 */
export const addComplaintResponse = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const { message } = req.body;
    const responseDoc = await complaintService.addComplaintResponse(
      req.params.id,
      message,
      req.user
    );

    res.status(201).json({
      success: true,
      message: 'Gửi phản hồi khiếu nại thành công.',
      data: responseDoc,
    });
  } catch (error) {
    next(error);
  }
};

export const addStaffComplaintResponse = addComplaintResponse;

/**
 * UC-65: GET /staff/complaints?status&category&q&page&limit
 * Staff and Manager retrieve complaints queue
 */
export const getStaffComplaints = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const result = await complaintService.getStaffComplaints(req.query);

    res.json({
      success: true,
      count: result.items.length,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      data: result.items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-65: GET /staff/complaints/:id
 * Staff and Manager retrieve detailed complaint with timeline and allowedTransitions
 */
export const getStaffComplaintById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const complaint = await complaintService.getStaffComplaintById(
      req.params.id,
      req.user
    );

    res.json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-65: PATCH /staff/complaints/:id/status
 * Body: { toStatus, note }
 * Update complaint status using state machine with race condition protection
 */
export const updateComplaintStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Yêu cầu đăng nhập.');
    }

    const { toStatus, note } = req.body;
    const result = await complaintService.updateComplaintStatus(
      req.params.id,
      req.user,
      toStatus,
      note
    );

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái khiếu nại sang ${toStatus}.`,
      data: result.complaint,
      statusLog: result.statusLog,
    });
  } catch (error) {
    next(error);
  }
};

