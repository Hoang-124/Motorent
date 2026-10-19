import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../core/errorHandler';
import { getPublishedStaticPage } from './staticPageService';

export const getPublicPage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const slug = req.params.slug;
    if (!/^[a-z0-9-]{2,100}$/i.test(slug)) {
      throw new AppError(400, 'Đường dẫn trang không hợp lệ.');
    }
    const page = await getPublishedStaticPage(slug);
    res.json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
};
