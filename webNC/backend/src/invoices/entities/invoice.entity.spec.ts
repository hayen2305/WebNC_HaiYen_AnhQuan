import { Invoice } from './invoice.entity';

describe('Invoice.calculate', () => {
  it('tổng = phòng + điện + nước + phụ phí', () => {
    expect(Invoice.calculate({ roomPrice: 3_000_000, electricity: 350_000, water: 100_000, otherFee: 50_000 }))
      .toEqual({ roomFee: 3_000_000, electricity: 350_000, water: 100_000, otherFee: 50_000, totalAmount: 3_500_000 });
  });
  it('phụ phí mặc định 0 và nhận giá phòng dạng chuỗi (DECIMAL từ MySQL)', () => {
    const r = Invoice.calculate({ roomPrice: '2500000', electricity: 0, water: 0 });
    expect(r.otherFee).toBe(0);
    expect(r.totalAmount).toBe(2_500_000);
  });
});
