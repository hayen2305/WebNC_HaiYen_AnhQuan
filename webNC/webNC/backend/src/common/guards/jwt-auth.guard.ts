import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthUser } from '../auth-user';

/**
 * Xác thực JWT: ưu tiên header "Authorization: Bearer <token>",
 * nếu không có thì đọc cookie "token" (httpOnly) — giống middleware Express cũ.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

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

    try {
      req.user = await this.jwtService.verifyAsync<AuthUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn.');
    }
  }
}
