import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SinhVien } from '../sinhvien/sinhvien.js';

export class LoginDto {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(SinhVien)
    private readonly sinhVienRepository: Repository<SinhVien>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const sinhVien = await this.sinhVienRepository.findOne({
      where: {
        email: dto.email,
      },
    });

    if (!sinhVien || sinhVien.password !== dto.password) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    }

    const payload = {
      sub: sinhVien.id,
      maSV: sinhVien.maSV,
      email: sinhVien.email,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: sinhVien.id,
        maSV: sinhVien.maSV,
        ten: sinhVien.ten,
        email: sinhVien.email,
      },
    };
  }
}
