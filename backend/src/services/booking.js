const { randomUUID } = require('crypto');
const pool = require('../database/db');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const slotService = require('./slot');
const mailService = require('./mail');

async function createBooking({ userId, staffId, serviceId, startAt }) {
    if (!userId || !staffId || !serviceId || !startAt) {
        throw new Error('userId, staffId, serviceId và startAt là bắt buộc');
    }

    const service = await Service.findById(serviceId);
    const staff = await Staff.findById(staffId);
    if (!service) throw new Error('Không tìm thấy dịch vụ');
    if (!staff) throw new Error('Không tìm thấy nhân viên');

    const start = new Date(startAt);
    if (Number.isNaN(start.getTime())) throw new Error('startAt không hợp lệ');
    const end = new Date(start.getTime() + service.durationMinutes * 60000);

    const connection = await pool.getConnection();
    let booking;
    try {
        await connection.beginTransaction();

        if (await slotService.hasConflict(staffId, start, end, connection)) {
            const error = new Error('Khung giờ này đã được đặt');
            error.statusCode = 409;
            throw error;
        }

        const id = randomUUID();
        await connection.query(
            `INSERT INTO appointments
                (id, user_id, staff_id, service_id, start_at, end_at, status)
             VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED')`,
            [id, userId, staffId, serviceId, start, end]
        );
        await connection.commit();
        booking = await Appointment.findById(id);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    await mailService.sendBookingConfirmation(booking);
    return booking;
}

async function cancelBooking(id) {
    const [result] = await pool.query(
        `UPDATE appointments SET status = 'CANCELLED'
         WHERE id = ? AND status <> 'CANCELLED'`,
        [id]
    );
    if (result.affectedRows === 0) {
        const error = new Error('Không tìm thấy lịch hẹn hoặc lịch đã được hủy');
        error.statusCode = 404;
        throw error;
    }

    const booking = await Appointment.findById(id);
    await mailService.sendBookingCancellation(booking);
    return booking;
}

module.exports = { createBooking, cancelBooking };