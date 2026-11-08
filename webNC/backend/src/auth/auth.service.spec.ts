import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

const code = async (p: Promise<unknown>) => {
  try { await p; } catch (e: any) { return e.getStatus?.() ?? e; }
  return null;
};

function setup(row: any = null) {
  const userRepository: any = {
    findByEmail: jest.fn().mockResolvedValue(row),
    findById: jest.fn().mockResolvedValue(row),
    findByEmailOrPhone: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(42),
    updatePassword: jest.fn(),
  };
  const jwt: any = { sign: jest.fn().mockReturnValue('TOKEN') };
  return { svc: new AuthService(userRepository, jwt, {} as any), userRepository, jwt };
}

describe('AuthService', () => {
  let hash: string;
  beforeAll(async () => { hash = await bcrypt.hash('secret1', 4); });
  const userRow = () => ({ id: 1, full_name: 'An', email: 'a@x.com', phone: '0901234567', password_hash: hash, role: 'TENANT', is_active: 1 });

  describe('login', () => {
    it('email không tồn tại hoặc sai mật khẩu -> cùng một lỗi 401 (không lộ email nào có thật)', async () => {
      expect(await code(setup(null).svc.login('a@x.com', 'secret1'))).toBe(401);
      expect(await code(setup(userRow()).svc.login('a@x.com', 'sai'))).toBe(401);
    });
    it('thành công: trả token và không lộ password_hash', async () => {
      const s = setup(userRow());
      const r: any = await s.svc.login('a@x.com', 'secret1');
      expect(r.token).toBe('TOKEN');
      expect(r.user).not.toHaveProperty('password_hash');
      expect(s.jwt.sign).toHaveBeenCalledWith({ id: 1, role: 'TENANT', full_name: 'An' });
    });
    it('tài khoản bị khóa -> 403 (chỉ báo sau khi đúng mật khẩu)', async () => {
      const row = { ...userRow(), is_active: 0 };
      expect(await code(setup(row).svc.login('a@x.com', 'secret1'))).toBe(403);
      expect(await code(setup(row).svc.login('a@x.com', 'sai'))).toBe(401);
    });
  });

  describe('register', () => {
    const body: any = { full_name: 'Bình', email: 'b@x.com', phone: '0912345678', password: 'abcdef' };
    it('mật khẩu < 6 ký tự -> 400', async () => expect(await code(setup().svc.register({ ...body, password: '123' }))).toBe(400));
    it('email/điện thoại sai định dạng -> 400', async () => {
      expect(await code(setup().svc.register({ ...body, email: 'xx' }))).toBe(400);
      expect(await code(setup().svc.register({ ...body, phone: 'abc' }))).toBe(400);
    });
    it('trùng email hoặc SĐT -> 409', async () => {
      const s = setup();
      s.userRepository.findByEmailOrPhone.mockResolvedValue({ id: 3 });
      expect(await code(s.svc.register(body))).toBe(409);
    });
    it('luôn tạo TENANT dù client gửi role=ADMIN, và băm mật khẩu', async () => {
      const s = setup();
      const r: any = await s.svc.register({ ...body, role: 'ADMIN' });
      const created = s.userRepository.create.mock.calls[0][0];
      expect(created.role).toBe('TENANT');
      expect(created.password_hash).not.toBe('abcdef');
      expect(await bcrypt.compare('abcdef', created.password_hash)).toBe(true);
      expect(r.user.role).toBe('TENANT');
      expect(r.user.id).toBe(42);
    });
  });

  describe('changePassword', () => {
    it('mật khẩu mới ngắn -> 400; tài khoản không tồn tại -> 404; mật khẩu cũ sai -> 400', async () => {
      expect(await code(setup(userRow()).svc.changePassword(1, 'secret1', '123'))).toBe(400);
      expect(await code(setup(null).svc.changePassword(1, 'secret1', 'newpass1'))).toBe(404);
      expect(await code(setup(userRow()).svc.changePassword(1, 'sai', 'newpass1'))).toBe(400);
    });
    it('thành công: lưu hash mới', async () => {
      const s = setup(userRow());
      await s.svc.changePassword(1, 'secret1', 'newpass1');
      const saved = s.userRepository.updatePassword.mock.calls[0][1];
      expect(await bcrypt.compare('newpass1', saved)).toBe(true);
    });
  });
});
