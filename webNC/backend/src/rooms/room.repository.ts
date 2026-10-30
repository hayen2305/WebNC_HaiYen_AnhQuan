import { Injectable } from '@nestjs/common';
import { PoolConnection } from 'mysql2/promise';
import { BaseRepository } from '../database/base.repository';
import { Room } from './entities/room.entity';
import { CreateRoomDto, RoomQueryDto } from './dto/room.dto';

// API trả `price` (giá tháng) và `daily_rate`; khách đang thuê suy ra từ hợp đồng ACTIVE (tối đa 1 / phòng).
const ROOM_SELECT = `
  SELECT r.id, r.room_number, r.floor, r.monthly_price AS price, r.daily_price,
         CAST(COALESCE(r.daily_price, ROUND(r.monthly_price / 30)) AS SIGNED) AS daily_rate,
         r.area, r.description, r.image_url, r.status,
         c.id AS current_contract_id, u.full_name AS tenant_name, c.end_date AS end_date,
         (SELECT COUNT(*) FROM contracts p WHERE p.room_id = r.id AND p.status = 'PENDING') AS pending_requests
    FROM rooms r
    LEFT JOIN contracts c ON c.active_room_id = r.id
    LEFT JOIN users u ON u.id = c.tenant_id`;

/** Tên trường API -> cột DB được phép cập nhật (chống chèn tên cột tùy ý vào câu SQL). */
const UPDATABLE: Record<string, string> = {
  room_number: 'room_number', floor: 'floor', price: 'monthly_price', daily_price: 'daily_price',
  area: 'area', status: 'status', description: 'description',
};

@Injectable()
export class RoomRepository extends BaseRepository {
  findAll({ status, search }: RoomQueryDto = {}) {
    let sql = `${ROOM_SELECT} WHERE 1=1`;
    const params: any[] = [];
    if (status) { sql += ' AND r.status = ?'; params.push(status); }
    if (search) { sql += ' AND r.room_number LIKE ?'; params.push(`%${search}%`); }
    sql += ' ORDER BY r.floor ASC, r.room_number ASC';
    return this.select<Room>(sql, params);
  }

  async findById(id: number | string) {
    const rows = await this.select<Room>(`${ROOM_SELECT} WHERE r.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  }

  async findByRoomNumber(roomNumber: string) {
    const rows = await this.select<{ id: number; room_number: string }>(
      'SELECT id, room_number FROM rooms WHERE room_number = ? LIMIT 1', [roomNumber]);
    return rows[0] || null;
  }

  async create({ room_number, floor, price, daily_price, area, description }: CreateRoomDto) {
    const result = await this.run(
      `INSERT INTO rooms (room_number, floor, monthly_price, daily_price, area, description, status)
       VALUES (?, ?, ?, ?, ?, ?, 'EMPTY')`,
      [room_number, floor, price, daily_price || null, area || null, description || null],
    );
    return result.insertId;
  }

  async update(id: number | string, fields: Record<string, any>) {
    const keys = Object.keys(fields || {}).filter((k) => UPDATABLE[k]);
    if (keys.length === 0) return 0;
    const setClause = keys.map((k) => `${UPDATABLE[k]} = ?`).join(', ');
    const result = await this.run(`UPDATE rooms SET ${setClause} WHERE id = ?`, [...keys.map((k) => fields[k]), id]);
    return result.affectedRows;
  }

  async countContracts(roomId: number | string) {
    const rows = await this.select<{ n: number }>(
      `SELECT COUNT(*) AS n FROM contracts WHERE room_id = ? AND status IN ('ACTIVE', 'EXPIRED')`, [roomId]);
    return Number(rows[0].n);
  }

  /** Xóa phòng cùng yêu cầu thuê chưa hiệu lực và sự cố gắn với phòng đó (transaction). */
  async deleteWithRelated(id: number | string) {
    const conn = await this.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`DELETE FROM contracts WHERE room_id = ? AND status IN ('PENDING', 'REJECTED', 'CANCELLED')`, [id]);
      await conn.query('DELETE FROM tickets WHERE room_id = ?', [id]);
      await conn.query('DELETE FROM rooms WHERE id = ?', [id]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async updateImage(id: number | string, imageUrl: string) {
    const result = await this.run('UPDATE rooms SET image_url = ? WHERE id = ?', [imageUrl, id]);
    return result.affectedRows;
  }

  /** Khóa dòng trong transaction để tránh 2 admin cùng tạo hợp đồng / duyệt yêu cầu cho 1 phòng. */
  async findByIdForUpdate(conn: PoolConnection, id: number | string) {
    const [rows] = await conn.query(
      `SELECT id, room_number, status, monthly_price AS price, daily_price,
              CAST(COALESCE(daily_price, ROUND(monthly_price / 30)) AS SIGNED) AS daily_rate
         FROM rooms WHERE id = ? FOR UPDATE`, [id]);
    return ((rows as any[])[0] as Pick<Room, 'id' | 'room_number' | 'status' | 'price' | 'daily_price' | 'daily_rate'>) || null;
  }

  /**
   * Dọn trạng thái hết hiệu lực (gọi "lười" mỗi khi đọc phòng/hợp đồng):
   *  1) hợp đồng thuê NGÀY quá ngày kết thúc -> EXPIRED
   *  2) yêu cầu PENDING quá ngày bắt đầu mà chưa duyệt -> EXPIRED
   *  3) phòng RENTED không còn hợp đồng ACTIVE -> EMPTY
   */
  async housekeeping(today: string, now: string) {
    const conn = await this.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `UPDATE contracts SET status = 'EXPIRED' WHERE status = 'ACTIVE' AND rental_type = 'DAILY' AND end_date < ?`, [today]);
      await conn.query(
        `UPDATE contracts SET status = 'EXPIRED', decided_at = ?,
                admin_note = COALESCE(admin_note, 'Yêu cầu hết hạn: quá ngày bắt đầu mà chưa được duyệt')
          WHERE status = 'PENDING' AND start_date < ?`, [now, today]);
      await conn.query(
        `UPDATE rooms r SET r.status = 'EMPTY'
          WHERE r.status = 'RENTED'
            AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.room_id = r.id AND c.status = 'ACTIVE')`);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
