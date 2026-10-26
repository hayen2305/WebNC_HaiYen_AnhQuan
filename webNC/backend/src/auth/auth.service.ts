import {
  BadRequestException, ConflictException, HttpException, Injectable,
  NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { CloudinaryService } from '../integrations/cloudinary.service';
import { RegisterDto } from './dto/auth.dto';
import { User } from './entities/user.entity';
import { UserRepository } from './user.repository';

/**
 * AuthService — toàn bộ business logic xác thực: hash mật khẩu, so khớp, sinh JWT.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private signToken(user: User) {
    return this.jwtService.sign({ id: user.id, role: user.role, full_name: user.full_name });
  }

  async login(email: string, password: string) {
    const row = await this.userRepository.findByEmail(email);
    if (!row) throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');

    const user = User.fromRow(row)!;
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');

    return { token: this.signToken(user), user: user.toPublicJSON() };
  }

  async register({ full_name, email, phone, password }: RegisterDto) {
    const existing = await this.userRepository.findByEmailOrPhone(email, phone);
    if (existing) throw new ConflictException('Email hoặc số điện thoại đã được sử dụng.');

    const password_hash = await bcrypt.hash(password, 10);
    // Đăng ký công khai luôn tạo TENANT (không tin `role` từ client). Tài khoản ADMIN tạo bằng `npm run seed`.
    const finalRole = 'TENANT' as const;
    const id = await this.userRepository.create({ full_name, email, phone, password_hash, role: finalRole });

    const user = new User({ id, full_name, email, phone, role: finalRole });
    return { token: this.signToken(user), user: user.toPublicJSON() };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    if (
      typeof currentPassword !== 'string' || !currentPassword ||
      typeof newPassword !== 'string' || newPassword.length < 6
    ) {
      throw new BadRequestException('Mật khẩu mới phải có ít nhất 6 ký tự.');
    }

    const row = await this.userRepository.findById(userId);
    if (!row) throw new NotFoundException('Không tìm thấy tài khoản.');

    const user = User.fromRow(row)!;
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) throw new BadRequestException('Mật khẩu hiện tại không đúng.');

    await this.userRepository.updatePassword(userId, await bcrypt.hash(newPassword, 10));
  }

  async uploadAvatar(userId: number, fileBuffer: Buffer) {
    const userRow = await this.userRepository.findById(userId);
    if (!userRow) throw new NotFoundException('Không tìm thấy tài khoản.');

    const uploaded = await this.cloudinaryService.uploadBuffer(fileBuffer, {
      folder: 'rental_management/avatars',
      resourceType: 'image',
    });
    if (!uploaded?.secure_url) {
      throw new HttpException('Không nhận được địa chỉ ảnh sau khi tải lên.', 500);
    }

    await this.userRepository.updateAvatar(userId, uploaded.secure_url);
    return User.fromRow({ ...userRow, avatar_url: uploaded.secure_url })!.toPublicJSON();
  }

  lookupTenants(keyword: string) {
    return this.userRepository.searchTenants(keyword);
  }
}
