import {
  BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthUser } from '../common/auth-user';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { roomImageUploadOptions } from '../common/upload/upload.options';
import { CreateRoomDto, RoomQueryDto, UpdateRoomDto } from './dto/room.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @Auth()
  list(@Query() query: RoomQueryDto, @CurrentUser() user: AuthUser) {
    const { status, search } = query;
    return this.roomsService.list({ status, search }, user);
  }

  @Get(':id')
  @Auth()
  getById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.roomsService.getById(id, user);
  }

  @Post()
  @Auth('ADMIN')
  async create(@Body() dto: CreateRoomDto) {
    const id = await this.roomsService.create(dto);
    return { id, message: 'Tạo phòng thành công.' };
  }

  @Put(':id')
  @Auth('ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    await this.roomsService.update(id, dto);
    return { message: 'Cập nhật phòng thành công.' };
  }

  @Delete(':id')
  @Auth('ADMIN')
  async remove(@Param('id') id: string) {
    await this.roomsService.remove(id);
    return { message: 'Đã xóa phòng.' };
  }

  @Post(':id/image')
  @Auth('ADMIN')
  @UseInterceptors(FileInterceptor('image', roomImageUploadOptions))
  async uploadImage(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh phòng.');
    const image_url = await this.roomsService.uploadImage(id, file.buffer);
    return { image_url, message: 'Đã cập nhật ảnh phòng.' };
  }
}
