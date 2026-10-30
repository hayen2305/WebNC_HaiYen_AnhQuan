import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../database/base.repository';
import { InvoiceQueryDto } from './dto/invoice.dto';
import { InvoiceRow } from './entities/invoice.entity';

// Hóa đơn gắn với hợp đồng; phòng / khách lấy qua JOIN. electricity / water là TIỀN (VNĐ).
const INVOICE_SELECT = `
  SELECT i.id, i.contract_id, c.room_id, c.tenant_id, r.room_number, u.full_name AS tenant_name,
         c.rental_type, i.month, i.year, i.room_fee,
         i.electricity_fee AS electricity, i.water_fee AS water, i.other_fee, i.total_amount,
         i.payment_status, i.paid_at, i.payment_method, i.transaction_ref,
         i.due_date, i.bill_file_url, i.last_reminder_sent_at, i.reminder_count, i.created_at
    FROM invoices i
    JOIN contracts c ON c.id = i.contract_id
    JOIN rooms r ON r.id = c.room_id
    JOIN users u ON u.id = c.tenant_id`;

@Injectable()
export class InvoiceRepository extends BaseRepository {
  async create(data: {
    contract_id: number | string; month: number; year: number; room_fee: number;
    electricity: number; water: number; other_fee?: number; due_date: string; bill_file_url?: string;
  }) {
    const result = await this.run(
      `INSERT INTO invoices
        (contract_id, month, year, room_fee, electricity_fee, water_fee, other_fee,
         payment_status, due_date, bill_file_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'UNPAID', ?, ?)`,
      [data.contract_id, data.month, data.year, data.room_fee, data.electricity, data.water,
        data.other_fee || 0, data.due_date, data.bill_file_url || null]);
    return result.insertId;
  }

  async findById(id: number | string) {
    const rows = await this.select<InvoiceRow>(`${INVOICE_SELECT} WHERE i.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  }

  /** Cập nhật hóa đơn (total_amount do DB tự tính); chuyển trạng thái thì ghi/xóa thông tin thanh toán. */
  async update(id: number | string, d: Record<string, any>) {
    const r = await this.run(
      `UPDATE invoices SET room_fee = ?, electricity_fee = ?, water_fee = ?, other_fee = ?,
         due_date = ?, payment_status = ?, paid_at = ?, payment_method = ?, transaction_ref = ? WHERE id = ?`,
      [d.room_fee, d.electricity, d.water, d.other_fee, d.due_date, d.payment_status,
        d.paid_at, d.payment_method, d.transaction_ref, id]);
    return r.affectedRows;
  }

  async delete(id: number | string) {
    const r = await this.run('DELETE FROM invoices WHERE id = ?', [id]);
    return r.affectedRows;
  }

  findAll({ status, month, year }: InvoiceQueryDto = {}) {
    let sql = `${INVOICE_SELECT} WHERE 1=1`;
    const params: any[] = [];
    if (status) { sql += ' AND i.payment_status = ?'; params.push(status); }
    if (month) { sql += ' AND i.month = ?'; params.push(month); }
    if (year) { sql += ' AND i.year = ?'; params.push(year); }
    sql += ' ORDER BY i.year DESC, i.month DESC, r.room_number ASC';
    return this.select<InvoiceRow>(sql, params);
  }

  /** Hóa đơn của một tenant; fromIdx/toIdx (tùy chọn) = year*12+month để lọc theo kỳ. */
  findByTenant(tenantId: number | string, { fromIdx, toIdx }: { fromIdx?: number | null; toIdx?: number | null } = {}) {
    let sql = `${INVOICE_SELECT} WHERE c.tenant_id = ?`;
    const params: any[] = [tenantId];
    if (fromIdx != null) { sql += ' AND (i.year * 12 + i.month) >= ?'; params.push(fromIdx); }
    if (toIdx != null) { sql += ' AND (i.year * 12 + i.month) <= ?'; params.push(toIdx); }
    sql += ' ORDER BY i.year DESC, i.month DESC';
    return this.select<InvoiceRow>(sql, params);
  }

  findAllUnpaid() {
    return this.select<InvoiceRow>(`${INVOICE_SELECT} WHERE i.payment_status = 'UNPAID'`);
  }

  /** Đánh dấu đã thanh toán (chỉ khi còn UNPAID); trả về số dòng thay đổi. */
  async markPaid(id: number | string, { paidAt, method, transactionRef = null }: { paidAt: string; method: string; transactionRef?: string | null }) {
    const r = await this.run(
      `UPDATE invoices SET payment_status = 'PAID', paid_at = ?, payment_method = ?, transaction_ref = ?
        WHERE id = ? AND payment_status = 'UNPAID'`,
      [paidAt, method, transactionRef, id]);
    return r.affectedRows;
  }

  async incrementReminder(id: number | string) {
    await this.run(
      `UPDATE invoices SET last_reminder_sent_at = NOW(), reminder_count = reminder_count + 1 WHERE id = ?`, [id]);
  }
}
