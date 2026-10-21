import {
  BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Put, Query,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthUser } from '../common/auth-user';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { mediaUploadOptions } from '../common/upload/upload.options';
import { CreateTicketDto, TicketQueryDto, UpdateTicketStatusDto } from './dto/ticket.dto';
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
    const id = await this.ticketsService.create({ ...dto, tenant_id: user.id, tenant_name: user.full_name });
    return { id, message: 'Đã gửi báo cáo sự cố.' };
  }

  @Get()
  @Auth('ADMIN')
  list(@Query() query: TicketQueryDto) {
    return this.ticketsService.list(query);
  }

  @Put(':id')
  @Auth('ADMIN')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    await this.ticketsService.updateStatus(id, dto?.status);
    return { message: 'Đã cập nhật trạng thái ticket.' };
  }
}
