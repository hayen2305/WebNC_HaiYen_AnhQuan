import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../auth/user.repository';
import { profileFields } from '../common/validators';
import { AuthUser } from '../common/auth-user';
import { UpdateUserDto, UserQueryDto } from './dto/user.dto';


/** UsersService — quản lý người dùng dành cho admin: xem danh sách, sửa hồ sơ/vai trò/mật khẩu, xóa. */
@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  list(filters: UserQueryDto = {}) {
    const role = ['ADMIN', 'TENANT'].includes(String(filters.role)) ? filters.role : undefined;
    const search = String(filters.search || '').trim() || undefined;
    return this.userRepository.findAllForAdmin({ role, search });
  }

  async update(actor: AuthUser, id: string, body: UpdateUserDto = {}) {
    const row = await this.userRepository.findById(Number(id));
    if (!row) throw new NotFoundException('Không tìm thấy người dùng.');

    const fields: Record<string, any> = profileFields(body);
    if (body.role !== undefined && body.role !== row.role) {
      if (!['ADMIN', 'TENANT'].includes(body.role)) throw new BadRequestException('Vai trò không hợp lệ.');
      if (Number(id) === Number(actor.id)) throw new BadRequestException('Bạn không thể tự đổi vai trò của chính mình.');
      fields.role = body.role;
    }
    if (body.is_active !== undefined) {
      if (Number(id) === Number(actor.id) && !body.is_active) {
        throw new BadRequestException('Bạn không thể tự khóa tài khoản của chính mình.');
      }
      fields.is_active = body.is_active ? 1 : 0;
    }
    if (body.password !== undefined && (body.password as unknown) !== '') {
      if (typeof body.password !== 'string' || body.password.length < 6) {
        throw new BadRequestException('Mật khẩu mới phải có ít nhất 6 ký tự.');
      }
      fields.password_hash = await bcrypt.hash(body.password, 10);
    }
    if (Object.keys(fields).length === 0) throw new BadRequestException('Không có thông tin nào để cập nhật.');

    const email = fields.email ?? row.email;
    const phone = fields.phone ?? row.phone;
    if (await this.userRepository.findConflict(email, phone, row.id)) {
      throw new ConflictException('Email hoặc số điện thoại đã được người dùng khác sử dụng.');
    }

    await this.userRepository.updateProfile(row.id, fields);
  }

  private publicUser(row: any) {
    return { id: row.id, full_name: row.full_name, email: row.email, phone: row.phone, avatar_url: row.avatar_url, role: row.role };
  }

  async getMe(userId: number) {
    const row = await this.userRepository.findById(userId);
    if (!row) throw new NotFoundException('Không tìm thấy tài khoản.');
    return this.publicUser(row);
  }

  /** Người dùng tự cập nhật họ tên / email / số điện thoại của mình. */
  async updateMe(userId: number, body: any = {}) {
    const row = await this.userRepository.findById(userId);
    if (!row) throw new NotFoundException('Không tìm thấy tài khoản.');
    const fields = profileFields(body);
    if (Object.keys(fields).length === 0) throw new BadRequestException('Không có thông tin nào để cập nhật.');
    const conflict = await this.userRepository.findConflict(fields.email ?? row.email, fields.phone ?? row.phone, row.id);
    if (conflict) throw new ConflictException('Email hoặc số điện thoại đã được người dùng khác sử dụng.');
    await this.userRepository.updateProfile(row.id, fields);
    return this.publicUser({ ...row, ...fields });
  }

  /** Khóa / mở khóa tài khoản (không tự khóa chính mình). */
  async setActive(actor: AuthUser, id: string, active: boolean) {
    const row = await this.userRepository.findById(Number(id));
    if (!row) throw new NotFoundException('Không tìm thấy người dùng.');
    if (Number(id) === Number(actor.id)) throw new BadRequestException('Bạn không thể tự khóa tài khoản của chính mình.');
    await this.userRepository.updateProfile(row.id, { is_active: active ? 1 : 0 });
  }

  async remove(actor: AuthUser, id: string) {
    const row = await this.userRepository.findById(Number(id));
    if (!row) throw new NotFoundException('Không tìm thấy người dùng.');
    if (Number(id) === Number(actor.id)) throw new BadRequestException('Bạn không thể xóa chính tài khoản đang đăng nhập.');
    if ((await this.userRepository.countBindingContracts(row.id)) > 0) {
      throw new ConflictException('Người dùng này đã có hợp đồng thuê nên không thể xóa (cần giữ lại để đối chiếu hóa đơn). Hãy khóa tài khoản thay vì xóa.');
    }
    await this.userRepository.deleteWithRelated(row.id);
  }
}
