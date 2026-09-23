const { randomUUID } = require('crypto');
const pool = require('../database/db');

const APPOINTMENT_STATUSES = Object.freeze({
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    CANCELLED: 'CANCELLED',
});

class Appointment {
    static async findById(id) {
        const [rows] = await pool.query(
            `SELECT id, user_id AS userId, staff_id AS staffId,
                    service_id AS serviceId, start_at AS startAt,
                    end_at AS endAt, status, created_at AS createdAt
             FROM appointments WHERE id = ?`,
            [id]
        );
        return rows[0] || null;
    }

    static async findByStaffAndRange(staffId, startAt, endAt) {
        const [rows] = await pool.query(
            `SELECT id, user_id AS userId, staff_id AS staffId,
                    service_id AS serviceId, start_at AS startAt,
                    end_at AS endAt, status, created_at AS createdAt
             FROM appointments
             WHERE staff_id = ?
               AND status <> 'CANCELLED'
               AND start_at < ?
               AND end_at > ?
             ORDER BY start_at`,
            [staffId, endAt, startAt]
        );
        return rows;
    }

    static async create({ userId, staffId, serviceId, startAt, endAt, status = APPOINTMENT_STATUSES.CONFIRMED }) {
        if (!Object.values(APPOINTMENT_STATUSES).includes(status)) {
            throw new Error(`Trạng thái appointment không hợp lệ: ${status}`);
        }

        const id = randomUUID();
        await pool.query(
            `INSERT INTO appointments
                (id, user_id, staff_id, service_id, start_at, end_at, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, userId, staffId, serviceId, startAt, endAt, status]
        );
        return this.findById(id);
    }
}

Appointment.Status = APPOINTMENT_STATUSES;

module.exports = Appointment;
