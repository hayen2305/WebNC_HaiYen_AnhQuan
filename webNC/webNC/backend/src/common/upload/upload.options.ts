import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

// File lưu tạm trong RAM rồi đẩy thẳng lên Cloudinary, không ghi ra ổ đĩa server.

/** Ảnh/PDF hóa đơn, ảnh/video sự cố — tối đa 20MB. */
export const mediaUploadOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/heic',
      'application/pdf', 'video/mp4', 'video/quicktime',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new BadRequestException(`Định dạng file không được hỗ trợ: ${file.mimetype}`), false);
  },
};

/** Ảnh đại diện — tối đa 5MB. */
export const avatarUploadOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(null, true);
    cb(new BadRequestException('Ảnh đại diện chỉ hỗ trợ định dạng JPG, PNG hoặc WEBP.'), false);
  },
};
