import { describe, expect, it, vi } from 'vitest';
import {
  contractStatus, dailyRateOf, downloadFile, fmtDate, moneyInputProps, rentalTypeLabel, vnd,
} from './format';

describe('vnd', () => {
  it('định dạng tiền Việt', () => {
    expect(vnd(1234567)).toBe(`${(1234567).toLocaleString('vi-VN')} đ`);
    expect(vnd('3500000')).toContain('đ');
  });
  it('rỗng / null / undefined -> 0 đ', () => {
    expect(vnd(null)).toBe('0 đ');
    expect(vnd(undefined)).toBe('0 đ');
    expect(vnd('')).toBe('0 đ');
  });
});

describe('fmtDate', () => {
  it('YYYY-MM-DD -> DD/MM/YYYY', () => expect(fmtDate('2026-01-05')).toBe('05/01/2026'));
  it('không có giá trị -> "-"', () => {
    expect(fmtDate(null)).toBe('-');
    expect(fmtDate('')).toBe('-');
  });
});

describe('dailyRateOf', () => {
  it('= giá tháng / 30, làm tròn nguyên (khớp backend)', () => {
    expect(dailyRateOf(3_000_000)).toBe(100_000);
    expect(dailyRateOf('3500000')).toBe(116_667);
  });
});

describe('moneyInputProps', () => {
  it('formatter thêm dấu phẩy ngăn cách hàng nghìn', () => {
    expect(moneyInputProps.formatter(1234567)).toBe('1,234,567');
    expect(moneyInputProps.formatter(500)).toBe('500');
    expect(moneyInputProps.formatter(undefined)).toBe('');
  });
  it('parser chỉ giữ chữ số', () => {
    expect(moneyInputProps.parser('1,234,567')).toBe('1234567');
    expect(moneyInputProps.parser('12abc3')).toBe('123');
    expect(moneyInputProps.parser('')).toBe('');
  });
});

describe('nhãn trạng thái', () => {
  it('đủ 5 trạng thái hợp đồng, mỗi cái có màu + nhãn', () => {
    expect(Object.keys(contractStatus).sort()).toEqual(['ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING', 'REJECTED']);
    Object.values(contractStatus).forEach((s) => { expect(s.color).toBeTruthy(); expect(s.label).toBeTruthy(); });
  });
  it('nhãn loại thuê', () => expect(rentalTypeLabel).toEqual({ MONTHLY: 'Theo tháng', DAILY: 'Theo ngày' }));
});

describe('downloadFile', () => {
  function run(headers) {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const clicks = [];
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { clicks.push(this.download); };
    const api = { get: vi.fn().mockResolvedValue({ data: new Blob(['x']), headers }) };
    return downloadFile(api, '/reports/revenue/export', { from: '2026-01-01' }, 'fallback.xlsx')
      .then(() => { HTMLAnchorElement.prototype.click = orig; return { api, clicks }; });
  }

  it('gọi API dạng blob với tham số và lưu file theo tên trong Content-Disposition', async () => {
    const { api, clicks } = await run({ 'content-disposition': 'attachment; filename="doanh-thu.xlsx"' });
    expect(api.get).toHaveBeenCalledWith('/reports/revenue/export', { params: { from: '2026-01-01' }, responseType: 'blob' });
    expect(clicks).toEqual(['doanh-thu.xlsx']);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });

  it('thiếu header -> dùng tên dự phòng; không để lại thẻ <a> trong DOM', async () => {
    const { clicks } = await run({});
    expect(clicks).toEqual(['fallback.xlsx']);
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
