import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SinhVienService } from '../sinhvien/sinhvien.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly sinhVienService: SinhVienService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: number; maSV: string; email: string }) {
    const sinhVien = await this.sinhVienService.findOne(payload.sub);

    if (!sinhVien) {
      throw new UnauthorizedException('Token không hợp lệ.');
    }

    return {
      id: sinhVien.id,
      maSV: sinhVien.maSV,
      ten: sinhVien.ten,
      email: sinhVien.email,
    };
  }
}
