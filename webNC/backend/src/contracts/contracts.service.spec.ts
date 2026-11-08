import { ContractsService } from './contracts.service';

const code = async (p: Promise<unknown>) => {
  try { await p; } catch (e: any) { return e.getStatus?.() ?? e; }
  return null;
};

const FIXED_NOW = new Date('2026-03-10T05:00:00Z'); // 12:00 ngày 10/3/2026 ở VN

function setup(over: { room?: any; tenant?: any; locked?: any } = {}) {
  const conn: any = {
    beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(),
    query: jest.fn().mockResolvedValue([]),
  };
  const contractRepository: any = {
    getConnection: jest.fn().mockResolvedValue(conn),
    insertWithConnection: jest.fn().mockResolvedValue(77),
    rejectOtherPending: jest.fn(),
    findPendingByTenantAndRoom: jest.fn().mockResolvedValue(null),
    findByIdForUpdate: jest.fn().mockResolvedValue(over.locked ?? null),
    findById: jest.fn().mockResolvedValue(over.locked ?? null),
    cancel: jest.fn().mockResolvedValue(1),
    reject: jest.fn().mockResolvedValue(1),
    markApproved: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findActiveByRoom: jest.fn().mockResolvedValue(null),
    findActiveByTenant: jest.fn().mockResolvedValue(null),
    countInvoicesWithConnection: jest.fn().mockResolvedValue(0),
    setStatusWithConnection: jest.fn(),
  };
  const room = over.room === undefined
    ? { id: 5, room_number: '101', status: 'EMPTY', price: 3_000_000, daily_rate: 100_000 } : over.room;
  const roomRepository: any = {
    housekeeping: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(room),
    findByIdForUpdate: jest.fn().mockResolvedValue(room),
  };
  const userRepository: any = {
    findById: jest.fn().mockResolvedValue(over.tenant === undefined ? { id: 9, role: 'TENANT' } : over.tenant),
  };
  return { svc: new ContractsService(contractRepository, roomRepository, userRepository), conn, contractRepository, roomRepository };
}

describe('ContractsService', () => {
  beforeEach(() => { jest.useFakeTimers().setSystemTime(FIXED_NOW); });
  afterEach(() => jest.useRealTimers());

  describe('create (admin tạo trực tiếp)', () => {
    const body = { room_id: 5, tenant_id: 9, start_date: '2026-03-10', months: 6 };

    it('thiếu thông tin -> 400', async () => expect(await code(setup().svc.create({ room_id: 5 }))).toBe(400));
    it('loại thuê sai -> 400', async () =>
      expect(await code(setup().svc.create({ ...body, rental_type: 'YEARLY' }))).toBe(400));
    it('số tháng ngoài 1..36 -> 400', async () => {
      expect(await code(setup().svc.create({ ...body, months: 0 }))).toBe(400);
      expect(await code(setup().svc.create({ ...body, months: 37 }))).toBe(400);
    });
    it('tiền cọc âm -> 400', async () => expect(await code(setup().svc.create({ ...body, deposit: -1 }))).toBe(400));
    it('end_date trước start_date -> 400', async () =>
      expect(await code(setup().svc.create({ ...body, end_date: '2026-03-01' }))).toBe(400));
    it('khách không tồn tại / không phải TENANT -> 404', async () => {
      expect(await code(setup({ tenant: null }).svc.create(body))).toBe(404);
      expect(await code(setup({ tenant: { id: 9, role: 'ADMIN' } }).svc.create(body))).toBe(404);
    });
    it('phòng không tồn tại -> 404 và rollback', async () => {
      const s = setup({ room: null });
      expect(await code(s.svc.create(body))).toBe(404);
      expect(s.conn.rollback).toHaveBeenCalled();
      expect(s.conn.release).toHaveBeenCalled();
    });
    it('phòng đang thuê / bảo trì -> 409', async () => {
      expect(await code(setup({ room: { id: 5, room_number: '101', status: 'RENTED' } }).svc.create(body))).toBe(409);
      expect(await code(setup({ room: { id: 5, room_number: '101', status: 'MAINTENANCE' } }).svc.create(body))).toBe(409);
    });

    it('thuê tháng: tính end_date, lấy giá từ phòng, đặt phòng RENTED, từ chối yêu cầu khác', async () => {
      const s = setup();
      expect(await s.svc.create(body)).toBe(77);
      expect(s.contractRepository.insertWithConnection).toHaveBeenCalledWith(s.conn, expect.objectContaining({
        tenant_id: 9, room_id: 5, rental_type: 'MONTHLY', status: 'ACTIVE', start_date: '2026-03-10',
        end_date: '2026-09-09', monthly_fee: 3_000_000, daily_fee: 100_000, deposit: 0 }));
      expect(s.conn.query).toHaveBeenCalledWith(expect.stringContaining("status = 'RENTED'"), [5]);
      expect(s.contractRepository.rejectOtherPending).toHaveBeenCalledWith(s.conn, 5, 77, expect.any(String), expect.any(String));
      expect(s.conn.commit).toHaveBeenCalled();
    });

    it('thuê ngày: 3 ngày từ 10/3 kết thúc 12/3; cho phép ghi đè đơn giá', async () => {
      const s = setup();
      await s.svc.create({ room_id: 5, tenant_id: 9, start_date: '2026-03-10', rental_type: 'DAILY', days: 3, daily_fee: 150000 });
      expect(s.contractRepository.insertWithConnection).toHaveBeenCalledWith(s.conn, expect.objectContaining({
        rental_type: 'DAILY', end_date: '2026-03-12', daily_fee: 150000 }));
    });

    it('ER_DUP_ENTRY (2 hợp đồng ACTIVE cùng phòng) -> 409', async () => {
      const s = setup();
      s.contractRepository.insertWithConnection.mockRejectedValue({ code: 'ER_DUP_ENTRY' });
      expect(await code(s.svc.create(body))).toBe(409);
      expect(s.conn.rollback).toHaveBeenCalled();
    });
  });

  describe('request (khách gửi yêu cầu)', () => {
    const body = { room_id: 5, rental_type: 'MONTHLY', start_date: '2026-03-15', months: 1 };

    it('thiếu/ sai loại thuê -> 400', async () => {
      expect(await code(setup().svc.request(9, { room_id: 5 }))).toBe(400);
      expect(await code(setup().svc.request(9, { ...body, rental_type: 'X' }))).toBe(400);
    });
    it('ngày bắt đầu ở quá khứ -> 400', async () =>
      expect(await code(setup().svc.request(9, { ...body, start_date: '2026-03-09' }))).toBe(400));
    it('hôm nay thì được (tính theo múi giờ VN)', async () => {
      const s = setup();
      expect(await s.svc.request(9, { ...body, start_date: '2026-03-10' })).toBe(77);
    });
    it('phòng không còn trống -> 409; không tồn tại -> 404', async () => {
      expect(await code(setup({ room: { id: 5, status: 'RENTED' } }).svc.request(9, body))).toBe(409);
      expect(await code(setup({ room: null }).svc.request(9, body))).toBe(404);
    });
    it('đã có yêu cầu chờ duyệt cho phòng này -> 409', async () => {
      const s = setup();
      s.contractRepository.findPendingByTenantAndRoom.mockResolvedValue({ id: 1 });
      expect(await code(s.svc.request(9, body))).toBe(409);
    });
    it('tạo PENDING với giá chốt theo phòng, tiền cọc 0', async () => {
      const s = setup();
      await s.svc.request(9, body);
      expect(s.contractRepository.insertWithConnection).toHaveBeenCalledWith(s.conn, expect.objectContaining({
        status: 'PENDING', deposit: 0, tenant_id: 9, monthly_fee: 3_000_000, daily_fee: 100_000, end_date: '2026-04-14' }));
    });
    it('thuê ngày > 365 ngày -> 400', async () =>
      expect(await code(setup().svc.request(9, { ...body, rental_type: 'DAILY', days: 366 }))).toBe(400));
  });

  describe('cancel / reject', () => {
    it('hủy yêu cầu không còn PENDING -> 409', async () => {
      const s = setup();
      s.contractRepository.cancel.mockResolvedValue(0);
      expect(await code(s.svc.cancel('1', 9))).toBe(409);
    });
    it('reject: dùng lý do mặc định khi để trống, cắt tối đa 255 ký tự', async () => {
      const s = setup();
      await s.svc.reject('1', '   ');
      expect(s.contractRepository.reject).toHaveBeenCalledWith('1', 'Chủ trọ từ chối yêu cầu', expect.any(String));
      await s.svc.reject('1', 'x'.repeat(300));
      expect(s.contractRepository.reject.mock.calls[1][1]).toHaveLength(255);
    });
    it('reject: 404 khi không tồn tại, 409 khi đã xử lý', async () => {
      const s = setup();
      s.contractRepository.reject.mockResolvedValue(0);
      expect(await code(s.svc.reject('1'))).toBe(404);
      s.contractRepository.findById.mockResolvedValue({ id: 1 });
      expect(await code(s.svc.reject('1'))).toBe(409);
    });
  });

  describe('approve', () => {
    const pending = { id: 3, room_id: 5, status: 'PENDING', start_date: '2026-03-15', deposit: 500000 };
    it('không tìm thấy -> 404', async () => expect(await code(setup().svc.approve('3'))).toBe(404));
    it('đã xử lý -> 409', async () =>
      expect(await code(setup({ locked: { ...pending, status: 'ACTIVE' } }).svc.approve('3'))).toBe(409));
    it('ngày bắt đầu đã qua -> 409', async () =>
      expect(await code(setup({ locked: { ...pending, start_date: '2026-03-01' } }).svc.approve('3'))).toBe(409));
    it('phòng không còn trống -> 409', async () =>
      expect(await code(setup({ locked: pending, room: { id: 5, status: 'RENTED' } }).svc.approve('3'))).toBe(409));
    it('duyệt: ghi tiền cọc, đặt phòng RENTED, từ chối yêu cầu cạnh tranh', async () => {
      const s = setup({ locked: pending });
      await s.svc.approve('3', { deposit: 1_000_000 });
      expect(s.contractRepository.markApproved).toHaveBeenCalledWith(s.conn, 3, 1_000_000, expect.any(String));
      expect(s.conn.query).toHaveBeenCalledWith(expect.stringContaining("status = 'RENTED'"), [5]);
      expect(s.contractRepository.rejectOtherPending).toHaveBeenCalled();
    });
    it('không gửi tiền cọc -> giữ tiền cọc khách đã đề xuất', async () => {
      const s = setup({ locked: pending });
      await s.svc.approve('3');
      expect(s.contractRepository.markApproved).toHaveBeenCalledWith(s.conn, 3, 500000, expect.any(String));
    });
  });

  describe('update / remove / terminate', () => {
    const active = { id: 1, room_id: 5, status: 'ACTIVE', start_date: '2026-03-01', end_date: '2026-08-31' };
    it('update: 404, hợp đồng đã kết thúc -> 409, không có gì để sửa -> 400', async () => {
      expect(await code(setup().svc.update('1', { deposit: 1 }))).toBe(404);
      expect(await code(setup({ locked: { ...active, status: 'EXPIRED' } }).svc.update('1', { deposit: 1 }))).toBe(409);
      expect(await code(setup({ locked: active }).svc.update('1', {}))).toBe(400);
    });
    it('update: end_date trước start_date -> 400; hợp lệ thì gọi repository', async () => {
      expect(await code(setup({ locked: active }).svc.update('1', { end_date: '2026-02-01' }))).toBe(400);
      const s = setup({ locked: active });
      await s.svc.update('1', { deposit: 2_000_000, daily_rate: 120000 });
      expect(s.contractRepository.update).toHaveBeenCalledWith(1, { deposit: 2_000_000, daily_fee: 120000 });
    });
    it('remove: đã có hóa đơn -> 409; hợp đồng ACTIVE xóa xong trả phòng về EMPTY', async () => {
      const s = setup({ locked: active });
      s.contractRepository.countInvoicesWithConnection.mockResolvedValue(2);
      expect(await code(s.svc.remove('1'))).toBe(409);

      const ok = setup({ locked: active });
      await ok.svc.remove('1');
      expect(ok.conn.query).toHaveBeenCalledWith('DELETE FROM contracts WHERE id = ?', [1]);
      expect(ok.conn.query).toHaveBeenCalledWith(expect.stringContaining("status = 'EMPTY'"), [5]);
    });
    it('remove yêu cầu PENDING không đụng tới trạng thái phòng', async () => {
      const s = setup({ locked: { ...active, status: 'PENDING' } });
      await s.svc.remove('1');
      expect(s.conn.query).toHaveBeenCalledTimes(1);
    });
    it('terminate: chỉ hợp đồng ACTIVE; trả phòng về EMPTY', async () => {
      expect(await code(setup().svc.terminate('1'))).toBe(404);
      expect(await code(setup({ locked: { ...active, status: 'EXPIRED' } }).svc.terminate('1'))).toBe(409);
      const s = setup({ locked: active });
      await s.svc.terminate('1');
      expect(s.contractRepository.setStatusWithConnection).toHaveBeenCalledWith(s.conn, 1, 'EXPIRED');
      expect(s.conn.query).toHaveBeenCalledWith(expect.stringContaining("status = 'EMPTY'"), [5]);
    });
  });

  describe('list / getActive*', () => {
    it('list lọc bỏ giá trị không hợp lệ', async () => {
      const s = setup();
      await s.svc.list({ status: 'HACK', rental_type: 'DAILY', room_id: '5', tenant_id: '' });
      expect(s.contractRepository.findAll).toHaveBeenCalledWith({ status: undefined, rental_type: 'DAILY', room_id: 5, tenant_id: undefined });
    });
    it('getActiveByRoom / getActiveByTenant -> 404 khi không có', async () => {
      expect(await code(setup().svc.getActiveByRoom('5'))).toBe(404);
      expect(await code(setup().svc.getActiveByTenant(9))).toBe(404);
    });
  });
});
