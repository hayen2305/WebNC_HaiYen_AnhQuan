import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../common/auth-user';
import { nowInAppTz, todayInAppTz } from '../common/date.util';
import { CloudinaryService } from '../integrations/cloudinary.service';
import { CreateRoomDto, RoomQueryDto, UpdateRoomDto } from './dto/room.dto';
import { Room } from './entities/room.entity';
import { RoomRepository } from './room.repository';

@Injectable()
export class RoomsService {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /** Khách thuê chỉ thấy phòng ĐANG TRỐNG và chỉ các trường công khai (không lộ tên người thuê khác). */
  private toTenantView(room: Room) {
    const { id, room_number, floor, price, daily_price, daily_rate, area, status, description, image_url } = room;
    return { id, room_number, floor, price, daily_price, daily_rate, area, status, description, image_url };
  }

  private housekeeping() {
    return this.roomRepository.housekeeping(todayInAppTz(), nowInAppTz());
  }

  async list(filters: RoomQueryDto, user?: AuthUser) {
    await this.housekeeping();
    if (user?.role === 'TENANT') {
      const rooms = await this.roomRepository.findAll({ search: filters.search, status: 'EMPTY' });
      return rooms.map((r) => this.toTenantView(r));
    }
    const rooms = await this.roomRepository.findAll(filters);
    return rooms;
  }

  async getById(id: string, user?: AuthUser) {
    await this.housekeeping();
    const room = await this.roomRepository.findById(id);
    if (!room || (user?.role === 'TENANT' && room.status !== 'EMPTY')) {
      throw new NotFoundException('Không tìm thấy phòng.');
    }
    return user?.role === 'TENANT' ? this.toTenantView(room) : room;
  }

  async create(dto: CreateRoomDto) {
    const { room_number, floor, price, daily_price } = dto || ({} as CreateRoomDto);
    if (!room_number || !floor || !price) {
      throw new BadRequestException('Vui lòng nhập Số phòng, Tầng và Giá phòng.');
    }
    const existing = await this.roomRepository.findByRoomNumber(room_number);
    if (existing) throw new ConflictException(`Số phòng ${room_number} đã tồn tại.`);
    const dp = daily_price === undefined || daily_price === null || (daily_price as unknown) === '' ? null : Number(daily_price);
    if (dp !== null && (!Number.isInteger(dp) || dp <= 0)) {
      throw new BadRequestException('Giá thuê ngày phải là số nguyên dương (VNĐ).');
    }
    return this.roomRepository.create({ ...dto, daily_price: dp });
  }

  async update(id: string, fields: UpdateRoomDto = {}) {
    const room = await this.roomRepository.findById(id);
    if (!room) throw new NotFoundException('Không tìm thấy phòng.');

    const patch: Record<string, any> = {};
    if (fields.room_number !== undefined) {
      const v = String(fields.room_number).trim();
      if (!v || v.length > 20) throw new BadRequestException('Số phòng không được để trống và tối đa 20 ký tự.');
      if (v !== room.room_number && (await this.roomRepository.findByRoomNumber(v))) {
        throw new ConflictException(`Số phòng ${v} đã tồn tại.`);
      }
      patch.room_number = v;
    }
    if (fields.floor !== undefined) {
      const v = Number(fields.floor);
      if (!Number.isInteger(v) || v < 0) throw new BadRequestException('Tầng phải là số nguyên không âm.');
      patch.floor = v;
    }
    if (fields.price !== undefined) {
      const v = Number(fields.price);
      if (!Number.isInteger(v) || v <= 0) throw new BadRequestException('Giá phòng phải là số nguyên dương (VNĐ).');
      patch.price = v;
    }
    if (fields.daily_price !== undefined) {
      if (fields.daily_price === null || (fields.daily_price as unknown) === '') patch.daily_price = null;
      else {
        const v = Number(fields.daily_price);
        if (!Number.isInteger(v) || v <= 0) throw new BadRequestException('Giá thuê ngày phải là số nguyên dương (VNĐ).');
        patch.daily_price = v;
      }
    }
    if (fields.area !== undefined) {
      if (fields.area === null || (fields.area as unknown) === '') patch.area = null;
      else {
        const v = Number(fields.area);
        if (!Number.isFinite(v) || v < 0) throw new BadRequestException('Diện tích không hợp lệ.');
        patch.area = v;
      }
    }
    if (fields.description !== undefined) {
      patch.description = fields.description === null ? null : String(fields.description);
    }
    if (fields.status !== undefined && fields.status !== room.status) {
      if (!['EMPTY', 'MAINTENANCE'].includes(fields.status)) {
        throw new BadRequestException('Chỉ có thể chuyển phòng sang Trống hoặc Bảo trì; trạng thái Đang thuê được tạo qua hợp đồng.');
      }
      if (room.status === 'RENTED') {
        throw new ConflictException('Phòng đang có người thuê, hãy thanh lý hợp đồng trước khi đổi trạng thái.');
      }
      patch.status = fields.status;
    }
    if (Object.keys(patch).length === 0) throw new BadRequestException('Không có thông tin nào để cập nhật.');

    return this.roomRepository.update(id, patch);
  }

  async remove(id: string) {
    const room = await this.roomRepository.findById(id);
    if (!room) throw new NotFoundException('Không tìm thấy phòng.');
    if (room.status === 'RENTED') throw new ConflictException('Phòng đang có người thuê nên không thể xóa.');
    if ((await this.roomRepository.countContracts(id)) > 0) {
      throw new ConflictException(
        'Phòng đã từng có hợp đồng nên không thể xóa (cần giữ lại để đối chiếu hóa đơn). Hãy chuyển sang Bảo trì nếu không cho thuê nữa.',
      );
    }
    await this.roomRepository.deleteWithRelated(id);
  }

  /** Tải ảnh phòng lên Cloudinary và lưu URL vào phòng. */
  async uploadImage(id: string, fileBuffer: Buffer) {
    const room = await this.roomRepository.findById(id);
    if (!room) throw new NotFoundException('Không tìm thấy phòng.');

    const uploaded = await this.cloudinaryService.uploadBuffer(fileBuffer, {
      folder: 'rental_management/rooms',
      resourceType: 'image',
    });
    await this.roomRepository.updateImage(id, uploaded.secure_url);
    return uploaded.secure_url;
  }
}
