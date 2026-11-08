/**
 * Tiện ích ngày (chuỗi 'YYYY-MM-DD'). "Hôm nay" tính theo múi giờ ứng dụng
 * (APP_TIMEZONE, mặc định Asia/Ho_Chi_Minh) chứ không theo UTC, để khách không bị
 * chặn/cho qua nhầm ngày vào khung giờ sáng sớm.
 */
const DAY_MS = 86_400_000;

export function todayInAppTz(): string {
  const tz = process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh';
  // 'en-CA' cho định dạng YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00.000Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Số ngày giữa 2 mốc, tính cả ngày bắt đầu và ngày kết thúc. */
export function countDaysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  return Math.floor((end - start) / DAY_MS) + 1;
}

/** Đơn giá thuê ngày mặc định = giá tháng / 30, làm tròn về số nguyên đồng. */
export function dailyRateFromMonthly(monthlyPrice: number | string): number {
  return Math.round(Number(monthlyPrice) / 30);
}

/** Cộng tháng, giữ nguyên ngày; ngày không tồn tại ở tháng đích thì lùi về ngày cuối tháng (31/1 + 1 tháng = 28/2). */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const total = (m - 1) + months;
  const ty = y + Math.floor(total / 12);
  const tm = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return new Date(Date.UTC(ty, tm, day)).toISOString().slice(0, 10);
}

/** Thời điểm hiện tại theo múi giờ ứng dụng, dạng 'YYYY-MM-DD HH:MM:SS' (khớp cột DATETIME). */
export function nowInAppTz(): string {
  const tz = process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}:${g('second')}`;
}
