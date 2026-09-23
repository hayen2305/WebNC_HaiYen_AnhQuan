const { createBooking, cancelBooking } = require('../services/booking.service');
const { getAvailableSlots } = require('../services/slot.service');
const { sendBookingConfirmation } = require('../services/mail.service');

async function availableSlots(req, res, next) {
    try {
        const { staffId, serviceId, date } = req.query;
        const slots = await getAvailableSlots({ staffId, serviceId, date });
        res.json({ date, staffId, serviceId, slots });
    } catch (error) {
        next(error);
    }
}

async function create(req, res, next) {
    try {
        const appointment = await createBooking(req.body);
        setImmediate(() => sendBookingConfirmation(appointment));
        res.status(201).json({ message: 'Booking created successfully', appointment });
    } catch (error) {
        next(error);
    }
}

async function cancel(req, res, next) {
    try {
        const appointment = await cancelBooking(req.params.id);
        res.json({ message: 'Booking cancelled successfully', appointment });
    } catch (error) {
        next(error);
    }
}

module.exports = { availableSlots, create, cancel };
