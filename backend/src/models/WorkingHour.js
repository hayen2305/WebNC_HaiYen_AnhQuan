const { randomUUID } = require('crypto');
const pool = require('../database/db');

class WorkingHour {
    static async findByStaffId(staffId) {
        const [rows] = await pool.query(
            `SELECT id, staff_id AS staffId, day_of_week AS dayOfWeek,
                    start_time AS startTime, end_time AS endTime
             FROM working_hours
             WHERE staff_id = ?
             ORDER BY day_of_week`,
            [staffId]
        );
        return rows;
    }

    static async create({ staffId, dayOfWeek, startTime, endTime }) {
        const id = randomUUID();
        await pool.query(
            `INSERT INTO working_hours
                (id, staff_id, day_of_week, start_time, end_time)
             VALUES (?, ?, ?, ?, ?)`,
            [id, staffId, dayOfWeek, startTime, endTime]
        );
        const [rows] = await pool.query(
            `SELECT id, staff_id AS staffId, day_of_week AS dayOfWeek,
                    start_time AS startTime, end_time AS endTime
             FROM working_hours WHERE id = ?`,
            [id]
        );
        return rows[0];
    }
}

module.exports = WorkingHour;
