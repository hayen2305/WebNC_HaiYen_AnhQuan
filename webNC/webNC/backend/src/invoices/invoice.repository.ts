import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../database/base.repository';
import { InvoiceQueryDto } from './dto/invoice.dto';
import { InvoiceRow } from './entities/invoice.entity';

@Injectable()
export class InvoiceRepository extends BaseRepository {
  async create(data: Record<string, any>) {
    const result = await this.run(
      `INSERT INTO invoices
        (contract_id, room_id, tenant_id, room_number, tenant_name, month, year,
         electricity, water,
         room_fee, electricity_fee, water_fee, other_fee, total_amount,
         payment_status, due_date, bill_file_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNPAID', ?, ?)`,
      [
        data.contract_id, data.room_id, data.tenant_id, data.room_number, data.tenant_name,
        data.month, data.year, data.electricity, data.water,
        data.room_fee, data.electricity_fee, data.water_fee, data.other_fee || 0, data.total_amount,
        data.due_date, data.bill_file_url || null,
      ],
    );
    return result.insertId;
  }

  findAll({ status, month, year }: InvoiceQueryDto = {}) {
    let sql = 'SELECT * FROM invoices WHERE 1=1';
    const params: any[] = [];
    if (status) { sql += ' AND payment_status = ?'; params.push(status); }
    if (month) { sql += ' AND month = ?'; params.push(month); }
    if (year) { sql += ' AND year = ?'; params.push(year); }
    sql += ' ORDER BY year DESC, month DESC, room_number ASC';
    return this.select<InvoiceRow>(sql, params);
  }

  findByTenant(tenantId: number) {
    return this.select<InvoiceRow>('SELECT * FROM invoices WHERE tenant_id = ? ORDER BY year DESC, month DESC', [tenantId]);
  }

  findAllUnpaid() {
    return this.select<InvoiceRow>(`SELECT * FROM invoices WHERE payment_status = 'UNPAID'`);
  }

  async markPaid(id: number | string) {
    const result = await this.run(`UPDATE invoices SET payment_status = 'PAID' WHERE id = ?`, [id]);
    return result.affectedRows;
  }

  async incrementReminder(id: number) {
    await this.run(
      `UPDATE invoices SET last_reminder_sent_at = NOW(), reminder_count = reminder_count + 1 WHERE id = ?`,
      [id],
    );
  }
}
