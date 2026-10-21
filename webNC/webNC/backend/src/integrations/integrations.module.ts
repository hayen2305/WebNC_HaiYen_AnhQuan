import { Global, Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { OcrService } from './ocr.service';

@Global()
@Module({
  providers: [CloudinaryService, OcrService],
  exports: [CloudinaryService, OcrService],
})
export class IntegrationsModule {}
