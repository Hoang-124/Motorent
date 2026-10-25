import { Request, Response, NextFunction } from 'express';
import { SystemConfig, AuditLog } from '../../models';
import { AuthenticatedRequest } from '../../core/authMiddleware';

const DEFAULT_CONFIG_KEY = 'GLOBAL_CONFIG';

/**
 * Get current system configuration (UC-113, UC-114, UC-115)
 * If not yet created, seeds the default record.
 */
export const getSystemConfig = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let config = await SystemConfig.findOne({ key: DEFAULT_CONFIG_KEY }).populate('updatedBy', 'firstName lastName email');

    if (!config) {
      config = await SystemConfig.create({
        key: DEFAULT_CONFIG_KEY,
        depositPercent: 30,
        cancelFreeHours: 24,
        cancelPartialRefundPercent: 50,
        lateFeePerHour: 30000,
        loyaltySpendPerPoint: 10000,
        loyaltyPointValueVnd: 1000,
        minPointsToRedeem: 50,
        supportHotline: '1900 6868',
        supportEmail: 'support@motorent.vn',
      });
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update system configuration (UC-113, UC-114, UC-115)
 * Role: SystemAdmin
 */
export const updateSystemConfig = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      depositPercent,
      cancelFreeHours,
      cancelPartialRefundPercent,
      lateFeePerHour,
      loyaltySpendPerPoint,
      loyaltyPointValueVnd,
      minPointsToRedeem,
      supportHotline,
      supportEmail,
    } = req.body;

    let config = await SystemConfig.findOne({ key: DEFAULT_CONFIG_KEY });

    if (!config) {
      config = new SystemConfig({ key: DEFAULT_CONFIG_KEY });
    }

    // UC-114: Deposit percent validation
    if (depositPercent !== undefined) {
      const dep = Number(depositPercent);
      if (dep < 10 || dep > 100) {
        res.status(400).json({ success: false, message: 'Tỷ lệ đặt cọc phải nằm trong khoảng từ 10% đến 100%.' });
        return;
      }
      config.depositPercent = dep;
    }

    // UC-113: Cancellation policy & late fee validation
    if (cancelFreeHours !== undefined) {
      const hours = Number(cancelFreeHours);
      if (hours < 1) {
        res.status(400).json({ success: false, message: 'Thời gian hủy miễn phí tối thiểu là 1 giờ.' });
        return;
      }
      config.cancelFreeHours = hours;
    }

    if (cancelPartialRefundPercent !== undefined) {
      const ref = Number(cancelPartialRefundPercent);
      if (ref < 0 || ref > 100) {
        res.status(400).json({ success: false, message: 'Tỷ lệ hoàn tiền khi hủy trễ phải từ 0% đến 100%.' });
        return;
      }
      config.cancelPartialRefundPercent = ref;
    }

    if (lateFeePerHour !== undefined) {
      const fee = Number(lateFeePerHour);
      if (fee < 0) {
        res.status(400).json({ success: false, message: 'Phí trả xe trễ không được là số âm.' });
        return;
      }
      config.lateFeePerHour = fee;
    }

    // UC-115: Loyalty points configuration
    if (loyaltySpendPerPoint !== undefined) {
      const spend = Number(loyaltySpendPerPoint);
      if (spend < 1000) {
        res.status(400).json({ success: false, message: 'Mức chi tiêu quy đổi 1 điểm phải từ 1,000 VND trở lên.' });
        return;
      }
      config.loyaltySpendPerPoint = spend;
    }

    if (loyaltyPointValueVnd !== undefined) {
      const val = Number(loyaltyPointValueVnd);
      if (val < 100) {
        res.status(400).json({ success: false, message: 'Giá trị quy đổi 1 điểm phải từ 100 VND trở lên.' });
        return;
      }
      config.loyaltyPointValueVnd = val;
    }

    if (minPointsToRedeem !== undefined) {
      const minPts = Number(minPointsToRedeem);
      if (minPts < 0) {
        res.status(400).json({ success: false, message: 'Điểm tích lũy tối thiểu để đổi thưởng không hợp lệ.' });
        return;
      }
      config.minPointsToRedeem = minPts;
    }

    if (supportHotline) config.supportHotline = String(supportHotline).trim();
    if (supportEmail) config.supportEmail = String(supportEmail).trim();

    config.updatedBy = req.user?._id;

    await config.save();

    await AuditLog.create({
      userId: req.user?._id,
      action: 'UPDATE_SYSTEM_CONFIG',
      entityType: 'SystemConfig',
      entityId: config._id,
      details: {
        depositPercent: config.depositPercent,
        cancelFreeHours: config.cancelFreeHours,
        lateFeePerHour: config.lateFeePerHour,
        loyaltySpendPerPoint: config.loyaltySpendPerPoint,
      },
      ipAddress: req.ip,
    });

    const populated = await SystemConfig.findById(config._id).populate('updatedBy', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Cập nhật cấu hình toàn hệ thống thành công.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};
