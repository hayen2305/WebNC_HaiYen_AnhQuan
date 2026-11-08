import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

function setup(opts: { verify?: any; row?: any } = {}) {
  const jwt: any = { verifyAsync: opts.verify ?? jest.fn().mockResolvedValue({ id: 1 }) };
  const pool: any = { query: jest.fn().mockResolvedValue([opts.row === undefined ? [{ id: 1, role: 'ADMIN', full_name: 'A', is_active: 1 }] : (opts.row ? [opts.row] : [])]) };
  const req: any = { headers: {} };
  const ctx: any = { switchToHttp: () => ({ getRequest: () => req }) };
  return { guard: new JwtAuthGuard(jwt, pool), req, ctx, jwt, pool };
}

describe('JwtAuthGuard', () => {
  it('thiếu token -> 401', async () => {
    const { guard, ctx } = setup();
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('đọc token từ header Bearer và gắn user lấy từ DB (không tin payload)', async () => {
    const { guard, ctx, req, jwt } = setup();
    req.headers.authorization = 'Bearer abc';
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('abc');
    expect(req.user).toEqual({ id: 1, role: 'ADMIN', full_name: 'A' });
  });

  it('đọc token từ cookie httpOnly', async () => {
    const { guard, ctx, req, jwt } = setup();
    req.headers.cookie = 'a=1; token=xyz%20; b=2';
    await guard.canActivate(ctx);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('xyz ');
  });

  it('token sai/hết hạn -> 401', async () => {
    const { guard, ctx, req } = setup({ verify: jest.fn().mockRejectedValue(new Error('expired')) });
    req.headers.authorization = 'Bearer bad';
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('tài khoản đã bị xóa -> 401', async () => {
    const { guard, ctx, req } = setup({ row: null });
    req.headers.authorization = 'Bearer t';
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('tài khoản bị khóa -> 403 dù token còn hạn', async () => {
    const { guard, ctx, req } = setup({ row: { id: 1, role: 'TENANT', full_name: 'B', is_active: 0 } });
    req.headers.authorization = 'Bearer t';
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('đổi vai trò trong DB có hiệu lực ngay', async () => {
    const { guard, ctx, req } = setup({ row: { id: 1, role: 'TENANT', full_name: 'B', is_active: 1 } });
    req.headers.authorization = 'Bearer t';
    await guard.canActivate(ctx);
    expect(req.user.role).toBe('TENANT');
  });
});
