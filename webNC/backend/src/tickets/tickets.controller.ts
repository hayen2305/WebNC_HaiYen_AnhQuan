import {
  BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Put, Query,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthUser } from '../common/auth-user';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { mediaUploadOptions } from '../common/upload/upload.options';
import { CreateTicketDto, TicketQueryDto, UpdateTicketDto } from './dto/ticket.dto';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('analyze-image')
  @HttpCode(200)
  @Auth()
  @UseInterceptors(FileInterceptor('file', mediaUploadOptions))
  analyzeImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng đính kèm ảnh hoặc video sự cố.');
    return this.ticketsService.analyzeImage(file.buffer, file.mimetype);
  }

  @Post()
  @Auth('TENANT')
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    const id = await this.ticketsService.create({ ...dto, tenant_id: user.id });
    return { id, message: 'Đã gửi báo cáo sự cố.' };
  }

  @Get('my')
  @Auth('TENANT')
  listMine(@CurrentUser() user: AuthUser) {
    return this.ticketsService.listMine(user.id);
  }

  @Get()
  @Auth('ADMIN')
  list(@Query() query: TicketQueryDto) {
    return this.ticketsService.list(query);
  }

  @Put(':id')
  @Auth('ADMIN')
  async handle(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    await this.ticketsService.handle(id, dto || {});
    return { message: 'Đã cập nhật ticket.' };
  }
}
