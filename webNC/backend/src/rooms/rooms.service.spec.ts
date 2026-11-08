import { RoomsService } from './rooms.service';

const code = async (p: Promise<unknown>) => {
  try { await p; } catch (e: any) { return e.getStatus?.() ?? e; }
  return null;
};

const room = { id: 5, room_number: '101', floor: 1, price: 3_000_000, daily_price: null, daily_rate: 100_000, area: 20,
  status: 'EMPTY', description: 'd', image_url: null, tenant_name: 'Bí mật' };

function setup(r: any = room) {
  const repo: any = {
    housekeeping: jest.fn(),
    findAll: jest.fn().mockResolvedValue([r]),
    findById: jest.fn().mockResolvedValue(r),
    findByRoomNumber: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(9),
    update: jest.fn().mockResolvedValue(1),
    countContracts: jest.fn().mockResolvedValue(0),
    deleteWithRelated: jest.fn(),
    updateImage: jest.fn(),
  };
  const cloud: any = { uploadBuffer: jest.fn().mockResolvedValue({ secure_url: 'http://img' }) };
  return { svc: new RoomsService(repo, cloud), repo, cloud };
}

describe('RoomsService', () => {
  describe('phân quyền xem phòng', () => {
    it('khách chỉ thấy phòng trống và không lộ thông tin người thuê', async () => {
      const s = setup();
      const rows: any[] = await s.svc.list({}, { id: 1, role: 'TENANT', full_name: 'x' });
      expect(s.repo.findAll).toHaveBeenCalledWith(expect.objectContaining({ status: 'EMPTY' }));
      expect(rows[0]).not.toHaveProperty('tenant_name');
      expect(rows[0]).toHaveProperty('daily_rate', 100_000);
    });
    it('admin thấy đầy đủ', async () => {
      const rows: any[] = await setup().svc.list({}, { id: 1, role: 'ADMIN', full_name: 'a' });
      expect(rows[0]).toHaveProperty('tenant_name');
    });
    it('khách xem phòng đã có người thuê -> 404', async () => {
      const s = setup({ ...room, status: 'RENTED' });
      expect(await code(s.svc.getById('5', { id: 1, role: 'TENANT', full_name: 'x' }))).toBe(404);
      await expect(s.svc.getById('5', { id: 1, role: 'ADMIN', full_name: 'a' })).resolves.toBeTruthy();
    });
  });

  describe('create', () => {
    it('thiếu số phòng / tầng / giá -> 400', async () => {
      expect(await code(setup().svc.create({ room_number: '1', floor: 1 } as any))).toBe(400);
    });
    it('trùng số phòng -> 409', async () => {
      const s = setup();
      s.repo.findByRoomNumber.mockResolvedValue({ id: 1 });
      expect(await code(s.svc.create({ room_number: '101', floor: 1, price: 1 } as any))).toBe(409);
    });
    it('giá ngày: rỗng -> null, hợp lệ -> giữ, sai -> 400', async () => {
      const s = setup();
      await s.svc.create({ room_number: '102', floor: 1, price: 2_000_000, daily_price: '' } as any);
      expect(s.repo.create).toHaveBeenLastCalledWith(expect.objectContaining({ daily_price: null }));
      await s.svc.create({ room_number: '103', floor: 1, price: 2_000_000, daily_price: 90000 } as any);
      expect(s.repo.create).toHaveBeenLastCalledWith(expect.objectContaining({ daily_price: 90000 }));
      expect(await code(s.svc.create({ room_number: '104', floor: 1, price: 1, daily_price: 1.5 } as any))).toBe(400);
      expect(await code(s.svc.create({ room_number: '104', floor: 1, price: 1, daily_price: -5 } as any))).toBe(400);
    });
  });

  describe('update', () => {
    it('404 / không có gì để sửa -> 400', async () => {
      const s = setup(null);
      expect(await code(s.svc.update('5', { price: 1 }))).toBe(404);
      expect(await code(setup().svc.update('5', {}))).toBe(400);
    });
    it('kiểm tra từng trường', async () => {
      const s = setup();
      expect(await code(s.svc.update('5', { room_number: '  ' }))).toBe(400);
      expect(await code(s.svc.update('5', { floor: -1 }))).toBe(400);
      expect(await code(s.svc.update('5', { price: 0 }))).toBe(400);
      expect(await code(s.svc.update('5', { area: -3 }))).toBe(400);
      expect(await code(s.svc.update('5', { daily_price: 0 }))).toBe(400);
    });
    it('đổi sang số phòng đã có -> 409; giữ nguyên số phòng của chính nó thì được', async () => {
      const s = setup();
      s.repo.findByRoomNumber.mockResolvedValue({ id: 2 });
      expect(await code(s.svc.update('5', { room_number: '202' }))).toBe(409);
      await s.svc.update('5', { room_number: '101' });
      expect(s.repo.update).toHaveBeenCalledWith('5', { room_number: '101' });
    });
    it('đổi trạng thái: không cho đặt RENTED thủ công; phòng đang thuê không được đổi', async () => {
      expect(await code(setup().svc.update('5', { status: 'RENTED' as any }))).toBe(400);
      expect(await code(setup({ ...room, status: 'RENTED' }).svc.update('5', { status: 'MAINTENANCE' }))).toBe(409);
      const s = setup();
      await s.svc.update('5', { status: 'MAINTENANCE' });
      expect(s.repo.update).toHaveBeenCalledWith('5', { status: 'MAINTENANCE' });
    });
    it('xóa giá ngày bằng null', async () => {
      const s = setup();
      await s.svc.update('5', { daily_price: null as any });
      expect(s.repo.update).toHaveBeenCalledWith('5', { daily_price: null });
    });
  });

  describe('remove', () => {
    it('404; đang thuê -> 409; từng có hợp đồng -> 409; ngược lại xóa', async () => {
      expect(await code(setup(null).svc.remove('5'))).toBe(404);
      expect(await code(setup({ ...room, status: 'RENTED' }).svc.remove('5'))).toBe(409);
      const s = setup();
      s.repo.countContracts.mockResolvedValue(1);
      expect(await code(s.svc.remove('5'))).toBe(409);
      const ok = setup();
      await ok.svc.remove('5');
      expect(ok.repo.deleteWithRelated).toHaveBeenCalledWith('5');
    });
  });

  it('uploadImage: lưu URL Cloudinary vào phòng', async () => {
    const s = setup();
    expect(await s.svc.uploadImage('5', Buffer.from('x'))).toBe('http://img');
    expect(s.repo.updateImage).toHaveBeenCalledWith('5', 'http://img');
    expect(await code(setup(null).svc.uploadImage('5', Buffer.from('x')))).toBe(404);
  });
});
