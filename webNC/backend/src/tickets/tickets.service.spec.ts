import { TicketsService } from './tickets.service';

const code = async (p: Promise<unknown>) => {
  try { await p; } catch (e: any) { return e.getStatus?.() ?? e; }
  return null;
};

function setup(over: { room?: any; ticket?: any; contracts?: any[] } = {}) {
  const ticketRepository: any = {
    create: jest.fn().mockResolvedValue(11),
    findById: jest.fn().mockResolvedValue(over.ticket ?? null),
    updateHandling: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findByTenant: jest.fn().mockResolvedValue([]),
  };
  const roomRepository: any = { findById: jest.fn().mockResolvedValue(over.room === undefined ? { id: 5 } : over.room) };
  const cloud: any = { uploadBuffer: jest.fn().mockResolvedValue({ secure_url: 'http://media' }) };
  const ocr: any = { analyzeIssueImage: jest.fn().mockResolvedValue({ title: 'Vòi nước rò', severity: 'HIGH' }) };
  const contractRepository: any = { findAll: jest.fn().mockResolvedValue(over.contracts ?? [{ room_id: 5 }]) };
  return { svc: new TicketsService(ticketRepository, roomRepository, cloud, ocr, contractRepository), ticketRepository, cloud, ocr, contractRepository };
}

describe('TicketsService', () => {
  describe('analyzeImage', () => {
    it('ảnh: upload rồi nhờ AI phân tích', async () => {
      const s = setup();
      const r: any = await s.svc.analyzeImage(Buffer.from('x'), 'image/jpeg');
      expect(s.cloud.uploadBuffer).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ resourceType: 'image' }));
      expect(r).toMatchObject({ image_url: 'http://media', title: 'Vòi nước rò', severity: 'HIGH' });
    });
    it('video: không gọi AI, mức độ mặc định MEDIUM', async () => {
      const s = setup();
      const r: any = await s.svc.analyzeImage(Buffer.from('x'), 'video/mp4');
      expect(s.ocr.analyzeIssueImage).not.toHaveBeenCalled();
      expect(s.cloud.uploadBuffer).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ resourceType: 'video' }));
      expect(r.severity).toBe('MEDIUM');
    });
  });

  describe('create', () => {
    it('thiếu room_id -> 400', async () => expect(await code(setup().svc.create({ tenant_id: 9 } as any))).toBe(400));
    it('phòng không tồn tại -> 404', async () =>
      expect(await code(setup({ room: null }).svc.create({ tenant_id: 9, room_id: 5 } as any))).toBe(404));
    it('khách không thuê phòng này -> 403', async () =>
      expect(await code(setup({ contracts: [{ room_id: 6 }] }).svc.create({ tenant_id: 9, room_id: 5 } as any))).toBe(403));
    it('tạo ticket: tiêu đề mặc định, mức độ không hợp lệ về MEDIUM', async () => {
      const s = setup();
      expect(await s.svc.create({ tenant_id: 9, room_id: 5, severity: 'EXTREME' } as any)).toBe(11);
      expect(s.ticketRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Báo cáo sự cố', severity: 'MEDIUM', tenant_id: 9, room_id: 5 }));
    });
    it('cắt tiêu đề tối đa 255 ký tự', async () => {
      const s = setup();
      await s.svc.create({ tenant_id: 9, room_id: 5, title: 'a'.repeat(400), severity: 'HIGH' } as any);
      expect(s.ticketRepository.create.mock.calls[0][0].title).toHaveLength(255);
    });
  });

  describe('handle', () => {
    const t = (status: string, extra: any = {}) => ({ id: 1, status, admin_note: null, resolved_at: null, ...extra });
    it('404 khi không tồn tại; 400 khi trạng thái sai', async () => {
      expect(await code(setup().svc.handle('1', { status: 'RESOLVED' }))).toBe(404);
      expect(await code(setup({ ticket: t('PENDING') }).svc.handle('1', { status: 'DONE' as any }))).toBe(400);
    });
    it('chuyển sang RESOLVED ghi resolved_at', async () => {
      const s = setup({ ticket: t('IN_PROGRESS') });
      await s.svc.handle('1', { status: 'RESOLVED', admin_note: ' Đã thay vòi ' });
      const arg = s.ticketRepository.updateHandling.mock.calls[0][1];
      expect(arg.status).toBe('RESOLVED');
      expect(arg.admin_note).toBe('Đã thay vòi');
      expect(arg.resolved_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
    it('đã RESOLVED mà cập nhật lại ghi chú: giữ nguyên resolved_at', async () => {
      const s = setup({ ticket: t('RESOLVED', { resolved_at: '2026-03-01 08:00:00', admin_note: 'cũ' }) });
      await s.svc.handle('1', { admin_note: 'mới' });
      expect(s.ticketRepository.updateHandling).toHaveBeenCalledWith('1', { status: 'RESOLVED', admin_note: 'mới', resolved_at: '2026-03-01 08:00:00' });
    });
    it('mở lại ticket (về PENDING) xóa resolved_at; ghi chú rỗng -> null', async () => {
      const s = setup({ ticket: t('RESOLVED', { resolved_at: '2026-03-01 08:00:00', admin_note: 'cũ' }) });
      await s.svc.handle('1', { status: 'PENDING', admin_note: '   ' });
      expect(s.ticketRepository.updateHandling).toHaveBeenCalledWith('1', { status: 'PENDING', admin_note: null, resolved_at: null });
    });
  });
});
