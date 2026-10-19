import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from './errorHandler';

const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const privateEkycDir = path.resolve(__dirname, '../../private_uploads/ekyc');
if (!fs.existsSync(privateEkycDir)) {
  fs.mkdirSync(privateEkycDir, { recursive: true });
}

export { uploadDir, privateEkycDir };

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const privateEkycStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, privateEkycDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh định dạng JPEG, PNG hoặc WebP.'));
    }
  },
});

/**
 * Upload middleware for User Avatar (UC-21: Max 5MB, JPEG/PNG/WebP)
 */
export const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB per UC-21 spec
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh định dạng JPEG, PNG hoặc WebP có dung lượng tối đa 5MB.'));
    }
  },
});

/**
 * Upload middleware for Review Photos (UC-39-41: Max 5 photos, Max 5MB each, JPEG/PNG/WebP)
 */
export const reviewPhotosUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per photo
    files: 5, // Max 5 photos
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh định dạng JPEG, PNG hoặc WebP có dung lượng tối đa 5MB.'));
    }
  },
});

/**
 * Upload middleware for eKYC Identity Documents (UC-22: CCCD front/back + driving license)
 * Stored in private directory private_uploads/ekyc - blocked from public static HTTP serving!
 */
export const ekycUpload = multer({
  storage: privateEkycStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB per document
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh giấy tờ định dạng JPEG, PNG hoặc WebP.'));
    }
  },
});

/**
 * Verify file magic bytes (JPEG: FFD8FF, PNG: 89504E47, WebP: RIFF....WEBP)
 * Deletes the uploaded file immediately if magic bytes do not match.
 */
export const validateImageMagicBytes = async (filePath: string): Promise<boolean> => {
  try {
    const handle = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);
    await handle.close();

    if (bytesRead < 4) {
      await fs.promises.unlink(filePath).catch(() => {});
      return false;
    }

    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;
    const isWebp =
      bytesRead >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    if (!isJpeg && !isPng && !isWebp) {
      await fs.promises.unlink(filePath).catch(() => {});
      return false;
    }

    return true;
  } catch {
    await fs.promises.unlink(filePath).catch(() => {});
    return false;
  }
};

/**
 * Verify file magic bytes for Images (JPEG, PNG, WebP) or PDF documents
 */
export const validateImageOrPdfMagicBytes = async (filePath: string): Promise<boolean> => {
  try {
    const handle = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);
    await handle.close();

    if (bytesRead < 4) {
      await fs.promises.unlink(filePath).catch(() => {});
      return false;
    }

    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;
    const isWebp =
      bytesRead >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    const isPdf = buffer.subarray(0, 4).toString('ascii') === '%PDF';

    if (!isJpeg && !isPng && !isWebp && !isPdf) {
      await fs.promises.unlink(filePath).catch(() => {});
      return false;
    }

    return true;
  } catch {
    await fs.promises.unlink(filePath).catch(() => {});
    return false;
  }
};

/**
 * Upload middleware for Customer Complaints (UC-42: Max 5 files, 5MB/file, JPG/PNG/PDF)
 */
export const complaintUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    const allowedExts = /jpeg|jpg|png|pdf/;
    const ext = allowedExts.test(path.extname(file.originalname).toLowerCase());
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const mime = allowedMimes.includes(file.mimetype.toLowerCase());
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Chỉ chấp nhận file đính kèm định dạng JPG, PNG hoặc PDF với dung lượng tối đa 5MB/tệp.'));
    }
  },
});



