import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../database/base.repository';

@Injectable()
export class UserRepository extends BaseRepository {
  async findByEmail(email: string) {
    const rows = await this.select('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  }

  async findById(id: number) {
    const rows = await this.select('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  }

  async findByEmailOrPhone(email: string, phone: string) {
    const rows = await this.select('SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1', [email, phone]);
    return rows[0] || null;
  }

  async create(u: { full_name: string; email: string; phone: string; password_hash: string; role: string }) {
    const result = await this.run(
      `INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
      [u.full_name, u.email, u.phone, u.password_hash, u.role],
    );
    return result.insertId;
  }

  async updatePassword(id: number, passwordHash: string) {
    await this.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  }

  async updateAvatar(id: number, avatarUrl: string) {
    await this.run('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, id]);
  }

  searchTenants(keyword: string) {
    return this.select(
      `SELECT id, full_name, email, phone FROM users
       WHERE role = 'TENANT' AND (email LIKE ? OR phone LIKE ?) LIMIT 10`,
      [`%${keyword}%`, `%${keyword}%`],
    );
  }

  /** Danh sách người dùng cho admin (kèm số hợp đồng đang hiệu lực), không trả password_hash. */
  findAllForAdmin({ role, search }: { role?: string; search?: string } = {}) {
    let sql = `SELECT u.id, u.full_name, u.email, u.phone, u.avatar_url, u.role, u.is_active, u.created_at,
        (SELECT COUNT(*) FROM contracts c WHERE c.tenant_id = u.id AND c.status = 'ACTIVE') AS active_contracts
      FROM users u WHERE 1=1`;
    const params: any[] = [];
    if (role) { sql += ' AND u.role = ?'; params.push(role); }
    if (search) {
      sql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY u.role ASC, u.full_name ASC';
    return this.select(sql, params);
  }

  /** Email/sđt đã thuộc về người dùng KHÁC chưa. */
  async findConflict(email: string, phone: string, excludeId: number) {
    const rows = await this.select(
      'SELECT id, email, phone FROM users WHERE (email = ? OR phone = ?) AND id <> ? LIMIT 1',
      [email, phone, excludeId],
    );
    return rows[0] || null;
  }

  /** Số hợp đồng ACTIVE/EXPIRED — chặn xóa người dùng (cần giữ lại để đối chiếu hóa đơn). */
  async countBindingContracts(userId: number) {
    const rows = await this.select(
      `SELECT COUNT(*) AS n FROM contracts WHERE tenant_id = ? AND status IN ('ACTIVE', 'EXPIRED')`, [userId]);
    return Number(rows[0].n);
  }

  /** Cập nhật hồ sơ (chỉ các cột trong whitelist). Tên/sđt chỉ lưu ở bảng users nên không cần đồng bộ nơi khác. */
  async updateProfile(id: number, fields: Record<string, any>) {
    const allowed = ['full_name', 'email', 'phone', 'role', 'password_hash', 'is_active'];
    const keys = Object.keys(fields).filter((k) => allowed.includes(k));
    if (!keys.length) return 0;
    const r = await this.run(
      `UPDATE users SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
      [...keys.map((k) => fields[k]), id]);
    return r.affectedRows;
  }

  /** Xóa người dùng cùng dữ liệu phụ thuộc (yêu cầu thuê chưa hiệu lực, sự cố, hội thoại hỗ trợ). */
  async deleteWithRelated(id: number) {
    const conn = await this.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`DELETE FROM contracts WHERE tenant_id = ? AND status IN ('PENDING', 'REJECTED', 'CANCELLED')`, [id]);
      await conn.query('DELETE FROM tickets WHERE tenant_id = ?', [id]);
      await conn.query('DELETE FROM support_messages WHERE user_id = ?', [id]);
      await conn.query('DELETE FROM users WHERE id = ?', [id]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
