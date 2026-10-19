import { AppError } from '../../core/errorHandler';
import { StaticPage } from '../../models/StaticPage';
import {
  generateSlug,
  validateSlug,
  sanitizePageContent,
  SYSTEM_PAGE_SLUGS,
  SystemPageSlug,
  RESERVED_SLUGS,
} from './pageUtils';

export {
  generateSlug,
  validateSlug,
  sanitizePageContent,
  SYSTEM_PAGE_SLUGS,
  SystemPageSlug,
  RESERVED_SLUGS,
};

export const getPublishedStaticPage = async (slug: string) => {
  const page = await StaticPage.findOne({
    slug: slug.trim().toLowerCase(),
    isPublished: true,
  })
    .select('-updatedBy -__v')
    .lean();
  if (!page) {
    throw new AppError(404, 'Không tìm thấy trang chính sách đã xuất bản.');
  }
  return page;
};
