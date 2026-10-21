import { Injectable } from '@nestjs/common';
import { PoolConnection } from 'mysql2/promise';
import { BaseRepository } from '../database/base.repository';
import { Room } from './entities/room.entity';
import { CreateRoomDto, RoomQueryDto } from './dto/room.dto';

/** Các cột được phép cập nhật qua API (chống chèn tên cột tùy ý vào câu SQL). */
const UPDATABLE_COLUMNS = ['room_number', 'floor', 'price', 'area', 'status', 'description'];

@Injectable()
export class RoomRepository extends BaseRepository {
  findAll({ status, search }: RoomQueryDto = {}) {
    let sql = 'SELECT * FROM rooms WHERE 1=1';
    const params: any[] = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (search) { sql += ' AND room_number LIKE ?'; params.push(`%${search}%`); }
    sql += ' ORDER BY floor ASC, room_number ASC';
    return this.select<Room>(sql, params);
  }

  async findById(id: number | string) {
    const rows = await this.select<Room>('SELECT * FROM rooms WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  }

  async findByRoomNumber(roomNumber: string) {
    const rows = await this.select<Room>('SELECT * FROM rooms WHERE room_number = ? LIMIT 1', [roomNumber]);
    return rows[0] || null;
  }

  async create({ room_number, floor, price, area, description }: CreateRoomDto) {
    const result = await this.run(
      `INSERT INTO rooms (room_number, floor, price, area, description, status) VALUES (?, ?, ?, ?, ?, 'EMPTY')`,
      [room_number, floor, price, area || null, description || null],
    );
    return result.insertId;
  }

  async update(id: number | string, fields: Record<string, any>) {
    const keys = Object.keys(fields || {}).filter((k) => UPDATABLE_COLUMNS.includes(k));
    if (keys.length === 0) return 0;
    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    const result = await this.run(`UPDATE rooms SET ${setClause} WHERE id = ?`, [...keys.map((k) => fields[k]), id]);
    return result.affectedRows;
  }

  /** Khóa dòng trong transaction để tránh 2 admin cùng tạo hợp đồng cho 1 phòng. */
  async findByIdForUpdate(conn: PoolConnection, id: number | string) {
    const [rows] = await conn.query('SELECT * FROM rooms WHERE id = ? FOR UPDATE', [id]);
    return ((rows as any[])[0] as Room) || null;
  }
}
