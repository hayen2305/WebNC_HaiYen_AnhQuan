import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import { CreateMonHocDto } from '../dto/create-monhoc.dto.js';
import { MonHoc } from './monhoc.js';
import { MonHocService } from './monhoc.service.js';

@Controller('monhoc')
export class MonHocController {
  constructor(private readonly monHocService: MonHocService) {}

  @Get()
  findAll(): Promise<MonHoc[]> {
    return this.monHocService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<MonHoc> {
    return this.monHocService.findOne(id);
  }

  @Public()
  @Post()
  create(@Body() dto: CreateMonHocDto): Promise<MonHoc> {
    return this.monHocService.create(dto);
  }
}
