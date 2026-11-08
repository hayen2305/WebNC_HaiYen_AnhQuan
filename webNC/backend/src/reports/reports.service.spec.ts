import { ReportsService } from './reports.service';

const code = async (p: Promise<unknown>) => {
  try { await p; } catch (e: any) { return e.getStatus?.() ?? e; }
  return null;
};

function setup() {
  const repo: any = {
    series: jest.fn().mockResolvedValue([
      { key: '2026-01', invoices: 2, billed: 5_000_000, collected: 3_000_000, room_fee: 4_000_000, electricity_fee: 600_000, water_fee: 300_000, other_fee: 100_000 },
      { key: '2026-02', invoices: 1, billed: 2_000_000, collected: 2_000_000, room_fee: 1_700_000, electricity_fee: 200_000, water_fee: 100_000, other_fee: 0 },
    ]),
    byRoom: jest.fn().mockResolvedValue([{ room_number: '101', billed: 7_000_000 }]),
    outstandingByDue: jest.fn().mockResolvedValue({ amount: 2_000_000, count: 1 }),
    detail: jest.fn().mockResolvedValue([]),
  };
  const invoices: any = { listForTenant: jest.fn().mockResolvedValue([]) };
  return { svc: new ReportsService(repo, invoices), repo, invoices };
}

describe('ReportsService.revenue', () => {
  it('khoảng thời gian sai định dạng / đảo ngược / quá 5 năm -> 400', async () => {
    const { svc } = setup();
    expect(await code(svc.revenue({ from: '2026-1-1', to: '2026-02-01' }))).toBe(400);
    expect(await code(svc.revenue({ from: '2026-03-01', to: '2026-02-01' }))).toBe(400);
    expect(await code(svc.revenue({ from: '2018-01-01', to: '2026-01-01' }))).toBe(400);
  });

  it('xem theo ngày tối đa 366 ngày', async () => {
    const { svc } = setup();
    expect(await code(svc.revenue({ from: '2025-01-01', to: '2026-06-01', group: 'day' }))).toBe(400);
    await expect(svc.revenue({ from: '2026-01-01', to: '2026-06-01', group: 'day' })).resolves.toMatchObject({ group: 'day' });
  });

  it('mặc định: cơ sở "thực thu", gom theo tháng', async () => {
    const { svc } = setup();
    const r = await svc.revenue({ from: '2026-01-01', to: '2026-02-28' });
    expect(r.basis).toBe('paid');
    expect(r.group).toBe('month');
  });

  it('cơ sở "kỳ hóa đơn" luôn gom theo tháng dù yêu cầu theo ngày', async () => {
    const { svc } = setup();
    const r = await svc.revenue({ from: '2026-01-01', to: '2026-02-28', basis: 'period', group: 'day' });
    expect(r.group).toBe('month');
  });

  it('tổng hợp từ các dòng series; "thực thu" lấy công nợ theo hạn', async () => {
    const { svc, repo } = setup();
    const r = await svc.revenue({ from: '2026-01-01', to: '2026-02-28', basis: 'paid' });
    expect(r.summary).toMatchObject({
      invoices: 3, billed: 7_000_000, collected: 5_000_000, outstanding: 2_000_000, outstanding_count: 1,
      components: { room_fee: 5_700_000, electricity_fee: 800_000, water_fee: 400_000, other_fee: 100_000 },
    });
    expect(repo.outstandingByDue).toHaveBeenCalled();
    expect(r.by_room).toHaveLength(1);
  });

  it('"kỳ hóa đơn": chưa thu = phát sinh - đã thu, không truy vấn công nợ riêng', async () => {
    const { svc, repo } = setup();
    const r = await svc.revenue({ from: '2026-01-01', to: '2026-02-28', basis: 'period' });
    expect(r.summary.outstanding).toBe(2_000_000);
    expect(r.summary.outstanding_count).toBeNull();
    expect(repo.outstandingByDue).not.toHaveBeenCalled();
  });

  it('truyền đúng chỉ số tháng (năm*12+tháng) cho repository', async () => {
    const { svc, repo } = setup();
    await svc.revenue({ from: '2026-01-15', to: '2026-03-20', basis: 'period' });
    expect(repo.series).toHaveBeenCalledWith('period', 'month', expect.objectContaining({ fromIdx: 2026 * 12 + 1, toIdx: 2026 * 12 + 3 }));
  });
});

describe('ReportsService xuất Excel', () => {
  it('revenueWorkbook tạo workbook có sheet tổng quan', async () => {
    const { svc } = setup();
    const wb = await svc.revenueWorkbook({ from: '2026-01-01', to: '2026-02-28' });
    expect(wb.worksheets.length).toBeGreaterThanOrEqual(2);
    const buf = await wb.xlsx.writeBuffer();
    expect(Buffer.from(buf).subarray(0, 2).toString()).toBe('PK'); // file .xlsx là zip
  });
});
