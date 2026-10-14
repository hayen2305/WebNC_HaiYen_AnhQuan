import { Body, Controller, Get, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import { CreateDangKiDto } from '../dto/create-dangki.dto.js';
import { DangKi } from './dangki.js';
import { DangKiService } from './dangki.service.js';

@Controller('dangki')
export class DangKiController {
  constructor(private readonly dangKiService: DangKiService) {}

  @Public()
  @Post('register')
  register(@Body() dto: CreateDangKiDto): Promise<DangKi> {
    return this.dangKiService.dangKy(dto);
  }

  @Get()
  findAll(): Promise<DangKi[]> {
    return this.dangKiService.findAll();
  }
}
