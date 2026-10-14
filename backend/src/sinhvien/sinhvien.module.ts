import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SinhVien } from './sinhvien.js';
import { SinhVienController } from './sinhvien.controller.js';
import { SinhVienService } from './sinhvien.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([SinhVien])],
  controllers: [SinhVienController],
  providers: [SinhVienService],
  exports: [SinhVienService],
})
export class SinhVienModule {}
