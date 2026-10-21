import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoomDto, RoomQueryDto, UpdateRoomDto } from './dto/room.dto';
import { RoomRepository } from './room.repository';

@Injectable()
export class RoomsService {
  constructor(private readonly roomRepository: RoomRepository) {}

  list(filters: RoomQueryDto) {
    return this.roomRepository.findAll(filters);
  }

  async getById(id: string) {
    const room = await this.roomRepository.findById(id);
    if (!room) throw new NotFoundException('Không tìm thấy phòng.');
    return room;
  }

  async create(dto: CreateRoomDto) {
    const { room_number, floor, price } = dto || ({} as CreateRoomDto);
    if (!room_number || !floor || !price) {
      throw new BadRequestException('Vui lòng nhập Số phòng, Tầng và Giá phòng.');
    }
    const existing = await this.roomRepository.findByRoomNumber(room_number);
    if (existing) throw new ConflictException(`Số phòng ${room_number} đã tồn tại.`);
    return this.roomRepository.create(dto);
  }

  async update(id: string, fields: UpdateRoomDto) {
    const affected = await this.roomRepository.update(id, fields as Record<string, any>);
    if (affected === 0) throw new NotFoundException('Không tìm thấy phòng.');
    return affected;
  }
}
