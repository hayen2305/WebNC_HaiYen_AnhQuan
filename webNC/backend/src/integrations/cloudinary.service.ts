import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface UploadOptions {
  folder?: string;
  resourceType?: 'auto' | 'image' | 'video' | 'raw';
}

/**
 * CloudinaryService — đóng gói SDK Cloudinary để lưu ảnh/video/PDF.
 */
@Injectable()
export class CloudinaryService {
  constructor(config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    });
  }

  uploadBuffer(
    buffer: Buffer,
    { folder = 'rental_management', resourceType = 'auto' }: UploadOptions = {},
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: resourceType },
        (error, result) => (error || !result ? reject(error) : resolve(result)),
      );
      stream.end(buffer);
    });
  }
}
