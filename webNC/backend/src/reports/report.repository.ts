import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../database/base.repository';

export interface RangeParams { from: string; to: string; fromIdx: number; toIdx: number }

/**
 * ReportRepository — truy vấn tổng hợp doanh thu từ bảng invoices.
 * basis = 'paid'   : tính theo NGÀY THỰC THU (paid_at) của hóa đơn đã thanh toán.
 * basis = 'period' : tính theo KỲ HÓA ĐƠN (tháng/năm phát sinh), gồm cả chưa thu.
 * SUM() của MySQL trả DECIMAL (chuỗi) nên luôn CAST sang SIGNED.
 */
@Injectable()
export class ReportRepository extends BaseRepository {
  private scope(basis: string, p: RangeParams) {
    if (basis === 'paid') {
      return { where: `i.payment_status = 'PAID' AND DATE(i.paid_at) BETWEEN ? AND ?`, params: [p.from, p.to] };
    }
    return { where: `(i.year * 12 + i.month) BETWEEN ? AND ?`, params: [p.fromIdx, p.toIdx] };
  }

  private key(basis: string, group: string) {
    if (basis === 'paid') return group === 'day' ? `DATE_FORMAT(i.paid_at, '%Y-%m-%d')` : `DATE_FORMAT(i.paid_at, '%Y-%m')`;
    return `CONCAT(i.year, '-', LPAD(i.month, 2, '0'))`;
  }

  series(basis: string, group: string, p: RangeParams) {
    const { where, params } = this.scope(basis, p);
    const key = this.key(basis, group);
    return this.select<any>(
      `SELECT ${key} AS \`key\`, COUNT(*) AS invoices,
         CAST(SUM(i.room_fee) AS SIGNED) AS room_fee, CAST(SUM(i.electricity_fee) AS SIGNED) AS electricity_fee,
         CAST(SUM(i.water_fee) AS SIGNED) AS water_fee, CAST(SUM(i.other_fee) AS SIGNED) AS other_fee,
         CAST(SUM(i.total_amount) AS SIGNED) AS billed,
         CAST(SUM(CASE WHEN i.payment_status = 'PAID' THEN i.total_amount ELSE 0 END) AS SIGNED) AS collected
       FROM invoices i WHERE ${where} GROUP BY \`key\` ORDER BY \`key\``,
      params
    );
  }

  byRoom(basis: string, p: RangeParams) {
    const { where, params } = this.scope(basis, p);
    return this.select<any>(
      `SELECT r.room_number, COUNT(*) AS invoices,
         CAST(SUM(i.total_amount) AS SIGNED) AS billed,
         CAST(SUM(CASE WHEN i.payment_status = 'PAID' THEN i.total_amount ELSE 0 END) AS SIGNED) AS collected
       FROM invoices i JOIN contracts c ON c.id = i.contract_id JOIN rooms r ON r.id = c.room_id
       WHERE ${where} GROUP BY r.id, r.room_number ORDER BY collected DESC, r.room_number`,
      params
    );
  }

  /** Khoản chưa thu có hạn nằm trong khoảng (dùng cho basis = paid). */
  async outstandingByDue(p: RangeParams) {
    const rows = await this.select<any>(
      `SELECT COUNT(*) AS n, CAST(COALESCE(SUM(total_amount), 0) AS SIGNED) AS amount
         FROM invoices WHERE payment_status = 'UNPAID' AND due_date BETWEEN ? AND ?`,
      [p.from, p.to]
    );
    return { count: Number(rows[0].n), amount: Number(rows[0].amount) };
  }

  detail(basis: string, p: RangeParams) {
    const { where, params } = this.scope(basis, p);
    return this.select<any>(
      `SELECT i.id, i.year, i.month, r.room_number, u.full_name AS tenant_name, c.rental_type,
         i.room_fee, i.electricity_fee, i.water_fee, i.other_fee, i.total_amount,
         i.payment_status, i.paid_at, i.payment_method, i.due_date
       FROM invoices i JOIN contracts c ON c.id = i.contract_id JOIN rooms r ON r.id = c.room_id
       JOIN users u ON u.id = c.tenant_id
       WHERE ${where} ORDER BY i.year, i.month, r.room_number`,
      params
    );
  }
}
