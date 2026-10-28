import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { StaticPage, IStaticPage } from '../../models/StaticPage';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import {
  generateSlug,
  validateSlug,
  sanitizePageContent,
  SYSTEM_PAGE_SLUGS,
  SystemPageSlug,
} from './pageUtils';

/**
 * Public: GET /pages?type=FAQ
 * Lists all published pages, optionally filtered by type (UC-119 CMS Content Seeding)
 */
export const getPublicPages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = { isPublished: true };
    const validTypes = ['FAQ', 'Terms', 'Privacy', 'Other'];
    if (req.query.type && validTypes.includes(req.query.type as string)) {
      filter.type = req.query.type;
    }

    const pages = await StaticPage.find(filter)
      .select('-updatedBy -__v')
      .sort({ type: 1, updatedAt: -1 })
      .lean();

    res.json({ success: true, data: pages });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: GET /admin/pages
 * Lists all pages with pagination and filters (type, isPublished, search)
 */
export const getAdminPages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (req.query.type && ['FAQ', 'Terms', 'Privacy', 'Other'].includes(req.query.type as string)) {
      filter.type = req.query.type;
    }

    if (typeof req.query.isPublished === 'string') {
      if (req.query.isPublished === 'true') filter.isPublished = true;
      else if (req.query.isPublished === 'false') filter.isPublished = false;
    }

    if (req.query.search && typeof req.query.search === 'string') {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [{ title: searchRegex }, { slug: searchRegex }];
    }

    const [items, total] = await Promise.all([
      StaticPage.find(filter)
        .populate('updatedBy', 'username firstName lastName email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StaticPage.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: GET /admin/pages/:id
 * Retrieves a single page by its ID
 */
export const getAdminPageById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'ID trang không hợp lệ.' });
      return;
    }

    const page = await StaticPage.findById(id).populate('updatedBy', 'username firstName lastName email');
    if (!page) {
      res.status(404).json({ success: false, message: 'Không tìm thấy trang yêu cầu.' });
      return;
    }

    res.json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: POST /admin/pages
 * Creates a new static page
 */
export const createAdminPage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, content, type, isPublished } = req.body;
    let { slug } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ success: false, message: 'Tiêu đề trang (title) là bắt buộc.' });
      return;
    }

    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      slug = generateSlug(title);
    } else {
      slug = slug.trim().toLowerCase();
    }

    const slugValidation = validateSlug(slug);
    if (!slugValidation.isValid) {
      res.status(400).json({ success: false, message: slugValidation.error });
      return;
    }

    // Check duplicate slug in DB
    const existing = await StaticPage.findOne({ slug });
    if (existing) {
      res.status(409).json({ success: false, message: `Slug "${slug}" đã tồn tại trên hệ thống.` });
      return;
    }

    const validTypes = ['FAQ', 'Terms', 'Privacy', 'Other'];
    const pageType = type && validTypes.includes(type) ? type : 'Other';

    const sanitizedContent = sanitizePageContent(content || '');

    const newPage = await StaticPage.create({
      title: title.trim(),
      slug,
      content: sanitizedContent,
      type: pageType,
      isPublished: Boolean(isPublished),
      updatedBy: req.user?._id,
    });

    const populated = await StaticPage.findById(newPage._id).populate(
      'updatedBy',
      'username firstName lastName email'
    );

    res.status(201).json({
      success: true,
      message: 'Tạo trang tĩnh mới thành công.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: PATCH /admin/pages/:id
 * Updates an existing static page
 */
export const updateAdminPage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'ID trang không hợp lệ.' });
      return;
    }

    const page = await StaticPage.findById(id);
    if (!page) {
      res.status(404).json({ success: false, message: 'Không tìm thấy trang yêu cầu để cập nhật.' });
      return;
    }

    const isSystemPage = (SYSTEM_PAGE_SLUGS as readonly string[]).includes(page.slug);

    // Rule: System pages cannot change slug
    if (req.body.slug !== undefined) {
      const targetSlug = String(req.body.slug).trim().toLowerCase();
      if (isSystemPage && targetSlug !== page.slug) {
        res.status(400).json({
          success: false,
          message: `Không được phép thay đổi slug của trang hệ thống "${page.slug}".`,
        });
        return;
      }

      if (targetSlug !== page.slug) {
        const slugValidation = validateSlug(targetSlug);
        if (!slugValidation.isValid) {
          res.status(400).json({ success: false, message: slugValidation.error });
          return;
        }

        const duplicate = await StaticPage.findOne({ slug: targetSlug, _id: { $ne: page._id } });
        if (duplicate) {
          res.status(409).json({ success: false, message: `Slug "${targetSlug}" đã tồn tại trên hệ thống.` });
          return;
        }

        page.slug = targetSlug;
      }
    }

    if (req.body.title !== undefined) {
      const trimmedTitle = String(req.body.title).trim();
      if (!trimmedTitle) {
        res.status(400).json({ success: false, message: 'Tiêu đề không được để trống.' });
        return;
      }
      page.title = trimmedTitle;
    }

    if (req.body.content !== undefined) {
      page.content = sanitizePageContent(String(req.body.content));
    }

    if (req.body.type !== undefined) {
      const validTypes = ['FAQ', 'Terms', 'Privacy', 'Other'];
      if (!validTypes.includes(req.body.type)) {
        res.status(400).json({ success: false, message: 'Loại trang (type) không hợp lệ.' });
        return;
      }
      page.type = req.body.type;
    }

    if (req.body.isPublished !== undefined) {
      page.isPublished = Boolean(req.body.isPublished);
    }

    page.updatedBy = req.user?._id;
    await page.save();

    const populated = await StaticPage.findById(page._id).populate(
      'updatedBy',
      'username firstName lastName email'
    );

    res.json({
      success: true,
      message: 'Cập nhật trang tĩnh thành công.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: DELETE /admin/pages/:id
 * Deletes a static page. System pages (faq, terms, privacy) are protected from deletion.
 */
export const deleteAdminPage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'ID trang không hợp lệ.' });
      return;
    }

    const page = await StaticPage.findById(id);
    if (!page) {
      res.status(404).json({ success: false, message: 'Không tìm thấy trang yêu cầu để xóa.' });
      return;
    }

    if ((SYSTEM_PAGE_SLUGS as readonly string[]).includes(page.slug)) {
      res.status(400).json({
        success: false,
        message: `Không thể xóa trang hệ thống "${page.slug}". Trang này được bảo vệ vĩnh viễn.`,
      });
      return;
    }

    await page.deleteOne();

    res.json({
      success: true,
      message: `Đã xóa trang "${page.title}" thành công.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: GET /pages/:slug
 * Retrieves a published page by slug.
 * Hidden drafts return 404. Omit updatedBy / internal admin emails for security.
 */
export const getPublicPageBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const slug = req.params.slug?.trim().toLowerCase();
    if (!slug) {
      res.status(404).json({ success: false, message: 'Đường dẫn trang không hợp lệ.' });
      return;
    }

    const page = await StaticPage.findOne({
      slug,
      isPublished: true,
    }).select('-updatedBy -__v');

    if (!page) {
      res.status(404).json({
        success: false,
        message: 'Trang không tồn tại hoặc chưa được xuất bản.',
      });
      return;
    }

    res.json({
      success: true,
      data: page,
    });
  } catch (error) {
    next(error);
  }
};
