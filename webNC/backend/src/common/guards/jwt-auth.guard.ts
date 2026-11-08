import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from '../../database/database.constants';
import { AuthUser } from '../auth-user';

/**
 * Xác thực JWT: ưu tiên header "Authorization: Bearer <token>",
 * nếu không có thì đọc cookie "token" (httpOnly) — giống middleware Express cũ.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(MYSQL_POOL) private readonly pool: Pool,
  ) {}

  private getToken(req: Request): string | null {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);

    const cookiePair = (req.headers.cookie || '')
      .split(';')
      .map((chunk) => chunk.trim())
      .find((chunk) => chunk.startsWith('token='));
    return cookiePair ? decodeURIComponent(cookiePair.slice('token='.length)) : null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = this.getToken(req);
    if (!token) throw new UnauthorizedException('Thiếu token xác thực.');

    let decoded: AuthUser;
    try {
      decoded = await this.jwtService.verifyAsync<AuthUser>(token);
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn.');
    }

    // Đối chiếu DB: tài khoản bị admin xóa thì token cũ vô hiệu ngay; đổi vai trò/tên có hiệu lực ngay
    // (không phải chờ token hết hạn).
    const [rows] = await this.pool.query('SELECT id, role, full_name, is_active FROM users WHERE id = ? LIMIT 1', [decoded.id]);
    const row = (rows as any[])[0];
    if (!row) throw new UnauthorizedException('Tài khoản không còn tồn tại.');
    if (!row.is_active) throw new ForbiddenException('Tài khoản đã bị khóa. Vui lòng liên hệ chủ trọ.');
    req.user = { id: row.id, role: row.role, full_name: row.full_name };
    return true;
  }
}
