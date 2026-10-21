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
}
