import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|svg/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, webp, svg).'));
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
 * Upload middleware for eKYC Identity Documents (UC-22: CCCD front/back + driving license)
 */
export const ekycUpload = multer({
  storage,
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
