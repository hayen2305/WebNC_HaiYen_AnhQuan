import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../database/base.repository';
import { TicketQueryDto } from './dto/ticket.dto';

// Số phòng / tên khách lấy qua JOIN (không còn sao chép trong bảng tickets).
const TICKET_SELECT = `
  SELECT t.id, t.room_id, t.tenant_id, r.room_number, u.full_name AS tenant_name, t.title, t.description,
         t.image_url, t.severity, t.status, t.admin_note, t.created_at, t.updated_at, t.resolved_at
    FROM tickets t
    JOIN rooms r ON r.id = t.room_id
    JOIN users u ON u.id = t.tenant_id`;

@Injectable()
export class TicketRepository extends BaseRepository {
  async create(t: Record<string, any>) {
    const result = await this.run(
      `INSERT INTO tickets (room_id, tenant_id, title, description, image_url, severity, status)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
      [t.room_id, t.tenant_id, t.title, t.description || null, t.image_url || null, t.severity || 'MEDIUM']);
    return result.insertId;
  }

  findAll({ status, severity }: TicketQueryDto = {}) {
    let sql = `${TICKET_SELECT} WHERE 1=1`;
    const params: any[] = [];
    if (status) { sql += ' AND t.status = ?'; params.push(status); }
    if (severity) { sql += ' AND t.severity = ?'; params.push(severity); }
    sql += " ORDER BY FIELD(t.status, 'PENDING', 'IN_PROGRESS', 'RESOLVED'), FIELD(t.severity, 'HIGH', 'MEDIUM', 'LOW'), t.created_at DESC";
    return this.select(sql, params);
  }

  findByTenant(tenantId: number) {
    return this.select(`${TICKET_SELECT} WHERE t.tenant_id = ? ORDER BY t.created_at DESC`, [tenantId]);
  }

  async findById(id: number | string) {
    const rows = await this.select<any>(`${TICKET_SELECT} WHERE t.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  }

  /** Cập nhật trạng thái xử lý + ghi chú của chủ trọ; resolved_at do service truyền vào. */
  async updateHandling(id: number | string, { status, admin_note, resolved_at }: { status: string; admin_note: string | null; resolved_at: string | null }) {
    const r = await this.run('UPDATE tickets SET status = ?, admin_note = ?, resolved_at = ? WHERE id = ?', [status, admin_note, resolved_at, id]);
    return r.affectedRows;
  }
}
