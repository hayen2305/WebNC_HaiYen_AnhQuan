import {
  addDays, addMonths, countDaysInclusive, dailyRateFromMonthly, isValidDate, nowInAppTz, todayInAppTz,
} from './date.util';

describe('date.util', () => {
  afterEach(() => { jest.useRealTimers(); delete process.env.APP_TIMEZONE; });

  describe('isValidDate', () => {
    it.each(['2026-01-31', '2024-02-29'])('chấp nhận %s', (d) => expect(isValidDate(d)).toBe(true));
    it.each(['2026-02-30', '2026-13-01', '2026-1-1', '', 'abc', '2025-02-29'])('từ chối %s', (d) =>
      expect(isValidDate(d)).toBe(false));
    it('từ chối giá trị không phải chuỗi', () => {
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(20260101)).toBe(false);
    });
  });

  describe('addDays / countDaysInclusive', () => {
    it('cộng/trừ ngày qua ranh giới tháng và năm', () => {
      expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
      expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
      expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    });
    it('đếm cả ngày đầu và ngày cuối', () => {
      expect(countDaysInclusive('2026-03-01', '2026-03-01')).toBe(1);
      expect(countDaysInclusive('2026-03-01', '2026-03-31')).toBe(31);
      expect(countDaysInclusive('2026-02-01', '2026-02-28')).toBe(28);
    });
  });

  describe('addMonths', () => {
    it('lùi về ngày cuối tháng khi tháng đích ngắn hơn', () => {
      expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
      expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    });
    it('qua năm', () => {
      expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
      expect(addMonths('2026-01-15', 12)).toBe('2027-01-15');
    });
    it('cộng 0 tháng giữ nguyên', () => expect(addMonths('2026-05-10', 0)).toBe('2026-05-10'));
  });

  describe('dailyRateFromMonthly', () => {
    it('= giá tháng / 30 làm tròn nguyên', () => {
      expect(dailyRateFromMonthly(3_000_000)).toBe(100_000);
      expect(dailyRateFromMonthly('3500000')).toBe(116_667);
    });
  });

  describe('múi giờ ứng dụng', () => {
    it('todayInAppTz tính theo Asia/Ho_Chi_Minh chứ không theo UTC', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-03-10T20:00:00Z')); // 03:00 ngày 11 ở VN
      expect(todayInAppTz()).toBe('2026-03-11');
    });
    it('đọc APP_TIMEZONE', () => {
      process.env.APP_TIMEZONE = 'UTC';
      jest.useFakeTimers().setSystemTime(new Date('2026-03-10T20:00:00Z'));
      expect(todayInAppTz()).toBe('2026-03-10');
    });
    it('nowInAppTz đúng định dạng DATETIME', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-03-10T20:05:09Z'));
      expect(nowInAppTz()).toBe('2026-03-11 03:05:09');
    });
  });
});
