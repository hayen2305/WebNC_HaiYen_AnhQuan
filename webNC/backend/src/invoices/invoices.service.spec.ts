import { InvoicesService } from './invoices.service';

const code = async (p: Promise<unknown>) => {
  try { await p; } catch (e: any) { return e.getStatus?.() ?? e; }
  return null;
};

function setup(contract: any = null, invoice: any = null) {
  const invoiceRepository: any = {
    create: jest.fn().mockResolvedValue(55),
    findById: jest.fn().mockResolvedValue(invoice),
    update: jest.fn().mockResolvedValue(1),
    markPaid: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
    findByTenant: jest.fn().mockResolvedValue([]),
  };
  const contractRepository: any = { findById: jest.fn().mockResolvedValue(contract) };
  const paymentService: any = {
    generateQRCode: jest.fn().mockReturnValue({ qrUrl: 'http://qr', transferContent: 'SEV1' }),
  };
  const ocr: any = { extractBillAmounts: jest.fn().mockResolvedValue({ electricity_amount: '350.000 đ', water_amount: 100000, confidence: 'HIGH', raw_text: 'x' }) };
  const cloud: any = { uploadBuffer: jest.fn().mockResolvedValue({ secure_url: 'http://file' }) };
  const svc = new InvoicesService(invoiceRepository, contractRepository, {} as any, cloud, ocr, paymentService);
  return { svc, invoiceRepository, contractRepository, paymentService, ocr, cloud };
}

const monthly = { id: 1, status: 'ACTIVE', rental_type: 'MONTHLY', monthly_fee: '3000000', daily_fee: 100000,
  start_date: '2026-01-01', end_date: '2026-12-31', room_number: '101' };
const daily = { ...monthly, rental_type: 'DAILY', start_date: '2026-03-10', end_date: '2026-03-20' };
const base = { contract_id: 1, month: 3, year: 2026, due_date: '2026-03-31' };

describe('InvoicesService.createInvoice', () => {
  it('thiếu thông tin bắt buộc -> 400', async () => {
    expect(await code(setup(monthly).svc.createInvoice({ contract_id: 1 }))).toBe(400);
  });
  it('kỳ hóa đơn sai -> 400', async () => {
    expect(await code(setup(monthly).svc.createInvoice({ ...base, month: 13, electricity: 0, water: 0 }))).toBe(400);
  });
  it('hạn thanh toán sai định dạng -> 400', async () => {
    expect(await code(setup(monthly).svc.createInvoice({ ...base, due_date: '31/03/2026' }))).toBe(400);
  });
  it('không có hợp đồng -> 404', async () => {
    expect(await code(setup(null).svc.createInvoice({ ...base, electricity: 0, water: 0 }))).toBe(404);
  });
  it('hợp đồng chưa duyệt (PENDING) -> 409', async () => {
    expect(await code(setup({ ...monthly, status: 'PENDING' }).svc.createInvoice({ ...base, electricity: 0, water: 0 }))).toBe(409);
  });
  it('kỳ nằm ngoài thời gian thuê -> 400', async () => {
    expect(await code(setup(monthly).svc.createInvoice({ ...base, year: 2027, electricity: 0, water: 0 }))).toBe(400);
  });

  it('hợp đồng THÁNG: tiền phòng = monthly_fee, cộng điện/nước/phụ phí', async () => {
    const { svc, invoiceRepository, paymentService } = setup(monthly);
    const r = await svc.createInvoice({ ...base, electricity: 350000, water: 100000, other_fee: 50000 });
    expect(r).toEqual({ id: 55, total_amount: 3_500_000, qr_url: 'http://qr', transfer_content: 'SEV1' });
    expect(invoiceRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      room_fee: 3_000_000, electricity: 350000, water: 100000, other_fee: 50000, month: 3, year: 2026 }));
    expect(paymentService.generateQRCode).toHaveBeenCalledWith({ amount: 3_500_000, roomNumber: '101', invoiceId: 55 });
  });

  it('hợp đồng THÁNG: thiếu điện/nước hoặc số âm/lẻ -> 400', async () => {
    const { svc } = setup(monthly);
    expect(await code(svc.createInvoice({ ...base, water: 0 }))).toBe(400);
    expect(await code(svc.createInvoice({ ...base, electricity: -1, water: 0 }))).toBe(400);
    expect(await code(svc.createInvoice({ ...base, electricity: 1.5, water: 0 }))).toBe(400);
    expect(await code(svc.createInvoice({ ...base, electricity: 0, water: 0, other_fee: 'x' }))).toBe(400);
  });

  it('hợp đồng NGÀY: tiền phòng = daily_fee × số ngày thuê nằm trong kỳ, bỏ qua điện/nước', async () => {
    const { svc, invoiceRepository } = setup(daily);
    const r = await svc.createInvoice({ ...base, electricity: 999, water: 999 });
    expect(r.total_amount).toBe(100000 * 11); // 10/3 → 20/3
    expect(invoiceRepository.create).toHaveBeenCalledWith(expect.objectContaining({ room_fee: 1_100_000, electricity: 0, water: 0 }));
  });

  it('hợp đồng NGÀY vắt qua 2 tháng: chỉ tính phần trong kỳ', async () => {
    const c = { ...daily, start_date: '2026-03-28', end_date: '2026-04-03' };
    const { svc } = setup(c);
    expect((await svc.createInvoice({ ...base })).total_amount).toBe(100000 * 4); // 28..31/3
  });

  it('trùng kỳ hóa đơn (ER_DUP_ENTRY) -> 409', async () => {
    const s = setup(monthly);
    s.invoiceRepository.create.mockRejectedValue({ code: 'ER_DUP_ENTRY' });
    expect(await code(s.svc.createInvoice({ ...base, electricity: 0, water: 0 }))).toBe(409);
  });
});

describe('InvoicesService.updateInvoice', () => {
  const unpaid = { id: 1, payment_status: 'UNPAID', room_fee: 3000000, electricity: 100, water: 50, other_fee: 0, due_date: '2026-03-31' };
  const paid = { ...unpaid, payment_status: 'PAID', paid_at: '2026-03-05 10:00:00', payment_method: 'MOMO', transaction_ref: 'T1' };

  it('không tìm thấy -> 404', async () => expect(await code(setup(null, null).svc.updateInvoice('1', {}))).toBe(404));
  it('trạng thái không hợp lệ -> 400', async () =>
    expect(await code(setup(null, unpaid).svc.updateInvoice('1', { payment_status: 'X' }))).toBe(400));

  it('sửa tiền hóa đơn đã PAID mà không đặt lại UNPAID -> 409', async () =>
    expect(await code(setup(null, paid).svc.updateInvoice('1', { electricity: 5 }))).toBe(409));

  it('số tiền sai -> 400', async () =>
    expect(await code(setup(null, unpaid).svc.updateInvoice('1', { water: -5 }))).toBe(400));

  it('chỉ đổi trường được gửi, giữ nguyên phần còn lại và trả về tổng mới', async () => {
    const { svc, invoiceRepository } = setup(null, unpaid);
    const r = await svc.updateInvoice('1', { electricity: 200 });
    expect(r.total_amount).toBe(3_000_000 + 200 + 50);
    expect(invoiceRepository.update).toHaveBeenCalledWith('1', expect.objectContaining({
      room_fee: 3000000, electricity: 200, water: 50, paid_at: null, payment_method: null }));
  });

  it('UNPAID -> PAID: ghi paid_at, mặc định CASH', async () => {
    const { svc, invoiceRepository } = setup(null, unpaid);
    await svc.updateInvoice('1', { payment_status: 'PAID' });
    const arg = invoiceRepository.update.mock.calls[0][1];
    expect(arg.payment_status).toBe('PAID');
    expect(arg.payment_method).toBe('CASH');
    expect(arg.paid_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('PAID -> PAID (đổi ghi chú khác) giữ nguyên thông tin thanh toán cũ', async () => {
    const { svc, invoiceRepository } = setup(null, paid);
    await svc.updateInvoice('1', { payment_status: 'PAID' });
    expect(invoiceRepository.update).toHaveBeenCalledWith('1', expect.objectContaining({
      paid_at: '2026-03-05 10:00:00', payment_method: 'MOMO', transaction_ref: 'T1' }));
  });

  it('PAID -> UNPAID xóa thông tin thanh toán', async () => {
    const { svc, invoiceRepository } = setup(null, paid);
    await svc.updateInvoice('1', { payment_status: 'UNPAID' });
    expect(invoiceRepository.update).toHaveBeenCalledWith('1', expect.objectContaining({
      payment_status: 'UNPAID', paid_at: null, payment_method: null, transaction_ref: null }));
  });
});

describe('InvoicesService khác', () => {
  it('markPaid: 404 / 409 / thành công với phương thức hợp lệ', async () => {
    expect(await code(setup(null, null).svc.markPaid('1'))).toBe(404);
    expect(await code(setup(null, { payment_status: 'PAID' }).svc.markPaid('1'))).toBe(409);
    const { svc, invoiceRepository } = setup(null, { payment_status: 'UNPAID' });
    await svc.markPaid('1', 'MOMO');
    expect(invoiceRepository.markPaid).toHaveBeenCalledWith('1', expect.objectContaining({ method: 'MOMO' }));
    await svc.markPaid('1', 'BITCOIN');
    expect(invoiceRepository.markPaid).toHaveBeenLastCalledWith('1', expect.objectContaining({ method: 'CASH' }));
  });

  it('deleteInvoice: 404 khi không có dòng bị xóa', async () => {
    const s = setup();
    s.invoiceRepository.delete.mockResolvedValue(0);
    expect(await code(s.svc.deleteInvoice('9'))).toBe(404);
  });

  it('listForTenant: kiểm tra from/to, chỉ gắn QR cho hóa đơn UNPAID', async () => {
    const s = setup();
    expect(await code(s.svc.listForTenant(1, { from: '2026-13' }))).toBe(400);
    expect(await code(s.svc.listForTenant(1, { from: '2026-05', to: '2026-01' }))).toBe(400);

    s.invoiceRepository.findByTenant.mockResolvedValue([
      { id: 1, payment_status: 'UNPAID', total_amount: 10, room_number: '101' },
      { id: 2, payment_status: 'PAID', total_amount: 20, room_number: '101' },
    ]);
    const rows: any[] = await s.svc.listForTenant(1, { from: '2026-01', to: '2026-12' });
    expect(s.invoiceRepository.findByTenant).toHaveBeenCalledWith(1, { fromIdx: 2026 * 12 + 1, toIdx: 2026 * 12 + 12 });
    expect(rows[0].qr_url).toBe('http://qr');
    expect(rows[1].qr_url).toBeUndefined();
  });

  it('scanBill: chuẩn hóa số tiền AI đọc được ("350.000 đ" -> 350000)', async () => {
    const r = await setup().svc.scanBill(Buffer.from('x'), 'image/png');
    expect(r).toMatchObject({ bill_file_url: 'http://file', electricity_amount: 350000, water_amount: 100000 });
  });
});
