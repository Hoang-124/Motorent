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
export const createComplaint = submitComplaint;
