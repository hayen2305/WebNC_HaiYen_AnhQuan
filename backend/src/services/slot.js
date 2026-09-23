const pool = require('../database/db');

async function hasConflict(staffId, startAt, endAt, connection = pool) {
    const [rows] = await connection.query(
        `SELECT id FROM appointments
         WHERE staff_id = ? AND status <> 'CANCELLED'
           AND start_at < ? AND end_at > ?
         FOR UPDATE`,
        [staffId, endAt, startAt]
    );
    return rows.length > 0;
}

async function getBookedSlots({ staffId, startAt, endAt }) {
    if (!staffId || !startAt || !endAt) {
        throw new Error('staffId, startAt và endAt là bắt buộc');
    }

    const [rows] = await pool.query(
        `SELECT start_at AS startAt, end_at AS endAt
         FROM appointments
         WHERE staff_id = ? AND status <> 'CANCELLED'
           AND start_at < ? AND end_at > ?
         ORDER BY start_at`,
        [staffId, endAt, startAt]
    );
    return rows;
}

module.exports = { hasConflict, getBookedSlots };