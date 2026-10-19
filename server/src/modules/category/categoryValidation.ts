import { z } from 'zod';

const plainText = (value: string): boolean => !/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value);

export const normalizeCategorySlug = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[đĐ]/g, 'd')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const nameSchema = z.string()
  .trim()
  .transform((value) => value.normalize('NFC').replace(/\s+/g, ' '))
  .pipe(z.string().min(2, 'Tên danh mục phải có ít nhất 2 ký tự.').max(100, 'Tên danh mục tối đa 100 ký tự.'))
  .refine(plainText, 'Tên danh mục phải là văn bản thuần, không chứa thẻ HTML.');

const slugSchema = z.string()
  .trim()
  .max(120, 'Slug đầu vào tối đa 120 ký tự.')
  .refine(plainText, 'Slug không được chứa thẻ HTML hoặc ký tự điều khiển.')
  .transform(normalizeCategorySlug)
  .pipe(z.string().min(2, 'Slug phải có ít nhất 2 chữ cái hoặc chữ số.').max(80, 'Slug tối đa 80 ký tự.'));

const descriptionSchema = z.string()
  .trim()
  .max(2000, 'Mô tả tối đa 2.000 ký tự.')
  .refine(plainText, 'Mô tả phải là văn bản thuần, không chứa thẻ HTML.');

export const createCategorySchema = z.object({
  name: nameSchema,
  slug: slugSchema,
  description: descriptionSchema.optional(),
}).strict();

export const updateCategorySchema = createCategorySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Cần cung cấp ít nhất một trường để cập nhật.'
);

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
