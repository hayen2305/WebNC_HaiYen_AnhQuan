import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

const ctx = (user?: any) => ({
  getHandler: () => 'h', getClass: () => 'c',
  switchToHttp: () => ({ getRequest: () => ({ user }) }),
}) as any;
const guardWith = (roles?: string[]) => new RolesGuard({ getAllAndOverride: () => roles } as any);

describe('RolesGuard', () => {
  it('route không yêu cầu vai trò -> cho qua', () => {
    expect(guardWith(undefined).canActivate(ctx())).toBe(true);
    expect(guardWith([]).canActivate(ctx())).toBe(true);
  });
  it('đúng vai trò -> cho qua', () => expect(guardWith(['ADMIN']).canActivate(ctx({ role: 'ADMIN' }))).toBe(true));
  it('sai vai trò hoặc chưa đăng nhập -> 403', () => {
    expect(() => guardWith(['ADMIN']).canActivate(ctx({ role: 'TENANT' }))).toThrow(ForbiddenException);
    expect(() => guardWith(['ADMIN']).canActivate(ctx())).toThrow(ForbiddenException);
  });
});
