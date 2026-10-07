import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreateSinhVienDto } from '../dto/create-sinhvien.dto.js';
import { Public } from '../auth/public.decorator.js';
import { SinhVien } from './sinhvien.js';
import { SinhVienService } from './sinhvien.service.js';

@Controller('sinhvien')
export class SinhVienController {
  constructor(private readonly sinhVienService: SinhVienService) {}

  @Get()
  findAll(): Promise<SinhVien[]> {
    return this.sinhVienService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<SinhVien> {
    return this.sinhVienService.findOne(id);
  }

  @Public()
  @Post()
  create(@Body() dto: CreateSinhVienDto): Promise<SinhVien> {
    return this.sinhVienService.create(dto);
  }

  @Public()
  @Post('register')
  register(@Body() dto: CreateSinhVienDto): Promise<SinhVien> {
    return this.sinhVienService.create(dto);
  }
}
