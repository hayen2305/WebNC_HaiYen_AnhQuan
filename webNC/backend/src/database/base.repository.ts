import { Inject } from '@nestjs/common';
import { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';
import { MYSQL_POOL } from './database.constants';

/**
 * BaseRepository — lớp cha cho tầng Repository (Data Access Layer).
 * Đóng gói connection pool và cung cấp helper truy vấn dùng chung.
 */
export abstract class BaseRepository {
  constructor(@Inject(MYSQL_POOL) protected readonly pool: Pool) {}

  /** SELECT -> trả về mảng rows. */
  protected async select<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const [rows] = await this.pool.query(sql, params);
    return rows as T[];
  }

  /** INSERT / UPDATE / DELETE -> trả về ResultSetHeader (insertId, affectedRows). */
  protected async run(sql: string, params: any[] = []): Promise<ResultSetHeader> {
    const [result] = await this.pool.query(sql, params);
    return result as ResultSetHeader;
  }

  /** Lấy 1 connection riêng để tự quản lý transaction. */
  getConnection(): Promise<PoolConnection> {
    return this.pool.getConnection();
  }
}
