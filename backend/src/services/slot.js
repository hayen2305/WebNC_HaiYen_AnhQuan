const pool = require('../database/db');
const Service = require('../models/Service');
const WorkingHour = require('../models/WorkingHour');

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

async function getAvailableSlots({ staffId, serviceId, date }) {
    if (!staffId || !serviceId || !date) {
        throw new Error('staffId, serviceId và date là bắt buộc');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('date phải có định dạng YYYY-MM-DD');
    }

    const service = await Service.findById(serviceId);
    if (!service) throw new Error('Không tìm thấy dịch vụ');

    const workingHours = await WorkingHour.findByStaffId(staffId);
    const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
    const workingHour = workingHours.find((item) => item.dayOfWeek === dayOfWeek);
    if (!workingHour) return [];

    const toMinutes = (value) => {
        const [hours, minutes] = String(value).slice(0, 5).split(':').map(Number);
        return hours * 60 + minutes;
    };
    const startMinutes = toMinutes(workingHour.startTime);
    const endMinutes = toMinutes(workingHour.endTime);
    const slots = [];

    for (let minute = startMinutes; minute + service.durationMinutes <= endMinutes; minute += service.durationMinutes) {
        const startAt = new Date(`${date}T00:00:00Z`);
        startAt.setUTCMinutes(minute);
        const endAt = new Date(startAt.getTime() + service.durationMinutes * 60000);
        const booked = await getBookedSlots({ staffId, startAt, endAt });
        if (booked.length === 0) {
            slots.push({ startAt: startAt.toISOString(), endAt: endAt.toISOString() });
        }
    }

    return slots;
}

module.exports = { hasConflict, getBookedSlots, getAvailableSlots };