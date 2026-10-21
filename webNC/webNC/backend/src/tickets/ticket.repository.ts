import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../database/base.repository';
import { TicketQueryDto } from './dto/ticket.dto';

@Injectable()
export class TicketRepository extends BaseRepository {
  async create(t: Record<string, any>) {
    const result = await this.run(
      `INSERT INTO tickets (room_id, tenant_id, room_number, tenant_name, title, description, image_url, severity, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [t.room_id, t.tenant_id, t.room_number, t.tenant_name, t.title, t.description || null, t.image_url || null, t.severity || 'MEDIUM'],
    );
    return result.insertId;
  }

  findAll({ status, severity }: TicketQueryDto = {}) {
    let sql = 'SELECT * FROM tickets WHERE 1=1';
    const params: any[] = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (severity) { sql += ' AND severity = ?'; params.push(severity); }
    sql += " ORDER BY FIELD(severity, 'HIGH', 'MEDIUM', 'LOW'), created_at DESC";
    return this.select(sql, params);
  }

  async updateStatus(id: number | string, status: string) {
    const result = await this.run('UPDATE tickets SET status = ? WHERE id = ?', [status, id]);
    return result.affectedRows;
  }
}
