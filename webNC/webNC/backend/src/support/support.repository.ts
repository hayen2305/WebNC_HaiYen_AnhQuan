import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../database/base.repository';

@Injectable()
export class SupportRepository extends BaseRepository {
  async create({ user_id, question, answer }: { user_id: number; question: string; answer: string }) {
    const result = await this.run(
      'INSERT INTO support_messages (user_id, question, answer) VALUES (?, ?, ?)',
      [user_id, question, answer],
    );
    return result.insertId;
  }

  async findRecentByUser(userId: number, limit = 20) {
    const rows = await this.select<{ id: number; question: string; answer: string; created_at: string }>(
      'SELECT id, question, answer, created_at FROM support_messages WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?',
      [userId, limit],
    );
    return rows.reverse();
  }
}
