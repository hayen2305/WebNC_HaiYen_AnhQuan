import { Injectable } from '@nestjs/common';
import { PoolConnection } from 'mysql2/promise';
import { BaseRepository } from '../database/base.repository';
import { Contract } from './entities/contract.entity';

const CONTRACT_SELECT = `
  SELECT c.id, c.tenant_id, c.room_id, c.monthly_fee, c.daily_fee, c.daily_fee AS daily_rate, c.deposit,
         c.start_date, c.end_date, c.rental_type, c.status, c.admin_note, c.decided_at, c.created_at,
         r.room_number, r.image_url AS room_image, r.monthly_price AS room_price,
         u.full_name AS tenant_name, u.phone AS tenant_phone, u.email AS tenant_email,
         DATEDIFF(c.end_date, c.start_date) + 1 AS days,
         TIMESTAMPDIFF(MONTH, c.start_date, DATE_ADD(c.end_date, INTERVAL 1 DAY)) AS months,
         CASE c.rental_type
           WHEN 'DAILY' THEN c.daily_fee * (DATEDIFF(c.end_date, c.start_date) + 1)
           ELSE c.monthly_fee * TIMESTAMPDIFF(MONTH, c.start_date, DATE_ADD(c.end_date, INTERVAL 1 DAY))
         END AS estimated_total
    FROM contracts c
    JOIN rooms r ON r.id = c.room_id
    JOIN users u ON u.id = c.tenant_id`;

export interface ContractInsert {
  tenant_id: number | string;
  room_id: number | string;
  monthly_fee?: number;
  daily_fee?: number;
  deposit?: number;
  start_date: string;
  end_date: string;
  rental_type: 'MONTHLY' | 'DAILY';
  status: 'ACTIVE' | 'PENDING';
  decided_at?: string | null;
}

@Injectable()
export class ContractRepository extends BaseRepository {
  findAll({ status, room_id, tenant_id, rental_type }: {
    status?: string; room_id?: number; tenant_id?: number; rental_type?: string;
  } = {}) {
    let sql = `${CONTRACT_SELECT} WHERE 1=1`;
    const params: any[] = [];
    if (status) { sql += ' AND c.status = ?'; params.push(status); }
    if (room_id) { sql += ' AND c.room_id = ?'; params.push(room_id); }
    if (tenant_id) { sql += ' AND c.tenant_id = ?'; params.push(tenant_id); }
    if (rental_type) { sql += ' AND c.rental_type = ?'; params.push(rental_type); }
    sql += " ORDER BY FIELD(c.status, 'PENDING', 'ACTIVE', 'EXPIRED', 'REJECTED', 'CANCELLED'), r.room_number ASC, c.id DESC";
    return this.select<Contract>(sql, params);
  }

  async findActiveByRoom(roomId: number | string) {
    const rows = await this.select<Contract>(`${CONTRACT_SELECT} WHERE c.room_id = ? AND c.status = 'ACTIVE' LIMIT 1`, [roomId]);
    return rows[0] || null;
  }

  async findActiveByTenant(tenantId: number | string) {
    const rows = await this.select<Contract>(
      `${CONTRACT_SELECT} WHERE c.tenant_id = ? AND c.status = 'ACTIVE' ORDER BY c.id DESC LIMIT 1`, [tenantId]);
    return rows[0] || null;
  }

  findByTenant(tenantId: number | string) {
    return this.select<Contract>(`${CONTRACT_SELECT} WHERE c.tenant_id = ? ORDER BY c.created_at DESC, c.id DESC`, [tenantId]);
  }

  async findById(id: number | string) {
    const rows = await this.select<Contract>(`${CONTRACT_SELECT} WHERE c.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  }

  async findPendingByTenantAndRoom(tenantId: number | string, roomId: number | string) {
    const rows = await this.select<{ id: number }>(
      `SELECT id FROM contracts WHERE tenant_id = ? AND room_id = ? AND status = 'PENDING' LIMIT 1`, [tenantId, roomId]);
    return rows[0] || null;
  }

  /** Khách tự hủy yêu cầu của mình khi còn PENDING. */
  async cancel(id: number | string, tenantId: number | string, now: string) {
    const r = await this.run(
      `UPDATE contracts SET status = 'CANCELLED', decided_at = ? WHERE id = ? AND tenant_id = ? AND status = 'PENDING'`,
      [now, id, tenantId]);
    return r.affectedRows;
  }

  /** Admin từ chối yêu cầu còn PENDING. */
  async reject(id: number | string, note: string, now: string) {
    const r = await this.run(
      `UPDATE contracts SET status = 'REJECTED', admin_note = ?, decided_at = ? WHERE id = ? AND status = 'PENDING'`,
      [note, now, id]);
    return r.affectedRows;
  }

  async update(id: number | string, patch: Record<string, any>) {
    const keys = Object.keys(patch);
    const r = await this.run(
      `UPDATE contracts SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
      [...keys.map((k) => patch[k]), id]);
    return r.affectedRows;
  }

  // ---- Các hàm nhận `conn` (đang trong transaction) từ Service ----

  async insertWithConnection(conn: PoolConnection, d: ContractInsert) {
    const [result] = await conn.query(
      `INSERT INTO contracts
        (tenant_id, room_id, monthly_fee, daily_fee, deposit, start_date, end_date, rental_type, status, decided_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.tenant_id, d.room_id, d.monthly_fee || 0, d.daily_fee || 0, d.deposit || 0,
        d.start_date, d.end_date, d.rental_type, d.status, d.decided_at || null]);
    return (result as any).insertId as number;
  }

  async findByIdForUpdate(conn: PoolConnection, id: number | string) {
    const [rows] = await conn.query('SELECT * FROM contracts WHERE id = ? FOR UPDATE', [id]);
    return (rows as any[])[0] || null;
  }

  async setStatusWithConnection(conn: PoolConnection, id: number | string, status: string) {
    await conn.query('UPDATE contracts SET status = ? WHERE id = ?', [status, id]);
  }

  async markApproved(conn: PoolConnection, id: number | string, deposit: number, now: string) {
    await conn.query(`UPDATE contracts SET status = 'ACTIVE', deposit = ?, decided_at = ? WHERE id = ?`, [deposit, now, id]);
  }

  /** Phòng đã có người thuê -> tự động từ chối mọi yêu cầu PENDING còn lại của phòng đó. */
  async rejectOtherPending(conn: PoolConnection, roomId: number | string, exceptId: number | string, note: string, now: string) {
    await conn.query(
      `UPDATE contracts SET status = 'REJECTED', admin_note = ?, decided_at = ?
        WHERE room_id = ? AND id <> ? AND status = 'PENDING'`, [note, now, roomId, exceptId]);
  }

  async countInvoicesWithConnection(conn: PoolConnection, contractId: number | string) {
    const [rows] = await conn.query('SELECT COUNT(*) AS n FROM invoices WHERE contract_id = ?', [contractId]);
    return Number((rows as any[])[0].n);
  }
}
