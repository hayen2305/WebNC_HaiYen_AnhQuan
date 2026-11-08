import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';

const code = async (p: Promise<unknown>) => {
  try { await p; } catch (e: any) { return e.getStatus?.() ?? e; }
  return null;
};
const admin = { id: 1, role: 'ADMIN' as const, full_name: 'Admin' };
const row = { id: 2, full_name: 'Khách', email: 'k@x.com', phone: '0900000001', role: 'TENANT', avatar_url: null, password_hash: 'h' };

function setup(r: any = row) {
  const repo: any = {
    findById: jest.fn().mockResolvedValue(r),
    findConflict: jest.fn().mockResolvedValue(null),
    updateProfile: jest.fn(),
    countBindingContracts: jest.fn().mockResolvedValue(0),
    deleteWithRelated: jest.fn(),
    findAllForAdmin: jest.fn().mockResolvedValue([]),
  };
  return { svc: new UsersService(repo), repo };
}

describe('UsersService', () => {
  it('list: bỏ role không hợp lệ, trim search', async () => {
    const s = setup();
    await s.svc.list({ role: 'ROOT' as any, search: '  an ' });
    expect(s.repo.findAllForAdmin).toHaveBeenCalledWith({ role: undefined, search: 'an' });
  });

  describe('update (admin)', () => {
    it('404; không có gì để sửa -> 400', async () => {
      expect(await code(setup(null).svc.update(admin, '2', { full_name: 'x' }))).toBe(404);
      expect(await code(setup().svc.update(admin, '2', {}))).toBe(400);
    });
    it('không tự đổi vai trò / tự khóa chính mình', async () => {
      const self = setup({ ...row, id: 1, role: 'ADMIN' });
      expect(await code(self.svc.update(admin, '1', { role: 'TENANT' }))).toBe(400);
      expect(await code(self.svc.update(admin, '1', { is_active: false as any }))).toBe(400);
    });
    it('vai trò không hợp lệ -> 400', async () =>
      expect(await code(setup().svc.update(admin, '2', { role: 'ROOT' as any }))).toBe(400));
    it('đặt lại mật khẩu: tối thiểu 6 ký tự và được băm', async () => {
      expect(await code(setup().svc.update(admin, '2', { password: '123' }))).toBe(400);
      const s = setup();
      await s.svc.update(admin, '2', { password: 'matkhau1' });
      const f = s.repo.updateProfile.mock.calls[0][1];
      expect(f).not.toHaveProperty('password');
      expect(await bcrypt.compare('matkhau1', f.password_hash)).toBe(true);
    });
    it('email/SĐT trùng người khác -> 409; khóa tài khoản người khác -> is_active = 0', async () => {
      const s = setup();
      s.repo.findConflict.mockResolvedValue({ id: 9 });
      expect(await code(s.svc.update(admin, '2', { email: 'trung@x.com' }))).toBe(409);
      const ok = setup();
      await ok.svc.update(admin, '2', { is_active: false as any });
      expect(ok.repo.updateProfile).toHaveBeenCalledWith(2, { is_active: 0 });
    });
  });

  describe('hồ sơ cá nhân', () => {
    it('getMe không lộ password_hash', async () => {
      const r: any = await setup().svc.getMe(2);
      expect(r).not.toHaveProperty('password_hash');
      expect(r.email).toBe('k@x.com');
    });
    it('updateMe: chỉ sửa họ tên/email/SĐT, kiểm tra định dạng, trùng, và không cho đổi vai trò', async () => {
      expect(await code(setup().svc.updateMe(2, { email: 'sai' }))).toBe(400);
      expect(await code(setup().svc.updateMe(2, {}))).toBe(400);
      const c = setup();
      c.repo.findConflict.mockResolvedValue({ id: 3 });
      expect(await code(c.svc.updateMe(2, { phone: '0911111111' }))).toBe(409);

      const s = setup();
      const r: any = await s.svc.updateMe(2, { full_name: ' Mới ', role: 'ADMIN' });
      expect(s.repo.updateProfile).toHaveBeenCalledWith(2, { full_name: 'Mới' });
      expect(r.role).toBe('TENANT');
      expect(r.full_name).toBe('Mới');
    });
  });

  describe('setActive / remove', () => {
    it('không tự khóa mình', async () =>
      expect(await code(setup({ ...row, id: 1 }).svc.setActive(admin, '1', false))).toBe(400));
    it('khóa/mở khóa người khác', async () => {
      const s = setup();
      await s.svc.setActive(admin, '2', true);
      expect(s.repo.updateProfile).toHaveBeenCalledWith(2, { is_active: 1 });
    });
    it('remove: không tự xóa; có hợp đồng -> 409; ngược lại xóa kèm dữ liệu liên quan', async () => {
      expect(await code(setup({ ...row, id: 1 }).svc.remove(admin, '1'))).toBe(400);
      const bound = setup();
      bound.repo.countBindingContracts.mockResolvedValue(1);
      expect(await code(bound.svc.remove(admin, '2'))).toBe(409);
      const ok = setup();
      await ok.svc.remove(admin, '2');
      expect(ok.repo.deleteWithRelated).toHaveBeenCalledWith(2);
    });
  });
});
