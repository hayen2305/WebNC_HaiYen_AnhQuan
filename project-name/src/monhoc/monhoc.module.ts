import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonHoc } from './monhoc.js';
import { MonHocController } from './monhoc.controller.js';
import { MonHocService } from './monhoc.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([MonHoc])],
  controllers: [MonHocController],
  providers: [MonHocService],
  exports: [MonHocService],
})
export class MonHocModule {}
