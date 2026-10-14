import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DangKi } from './dangki.js';
import { MonHoc } from '../monhoc/monhoc.js';
import { SinhVien } from '../sinhvien/sinhvien.js';
import { DangKiController } from './dangki.controller.js';
import { DangKiService } from './dangki.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([DangKi, SinhVien, MonHoc])],
  controllers: [DangKiController],
  providers: [DangKiService],
})
export class DangKiModule {}
