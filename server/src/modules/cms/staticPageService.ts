import { AppError } from '../../core/errorHandler';
import { StaticPage } from '../../models/StaticPage';

export const getPublishedStaticPage = async (slug: string) => {
  const page = await StaticPage.findOne({ slug: slug.trim().toLowerCase(), isPublished: true })
    .select('slug title content updatedAt')
    .lean();
  if (!page) throw new AppError(404, 'Không tìm thấy trang chính sách đã xuất bản.');
  return page;
};
