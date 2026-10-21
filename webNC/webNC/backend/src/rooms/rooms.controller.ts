import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Auth } from '../common/decorators/auth.decorator';
import { CreateRoomDto, RoomQueryDto, UpdateRoomDto } from './dto/room.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @Auth()
  list(@Query() query: RoomQueryDto) {
    const { status, search } = query;
    return this.roomsService.list({ status, search });
  }

  @Get(':id')
  @Auth()
  getById(@Param('id') id: string) {
    return this.roomsService.getById(id);
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
}
