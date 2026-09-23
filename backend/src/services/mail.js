async function sendBookingConfirmation(booking) {
    return sendBookingMail('BOOKING_CONFIRMED', booking);
}

async function sendBookingCancellation(booking) {
    return sendBookingMail('BOOKING_CANCELLED', booking);
}

async function sendBookingMail(event, booking) {
    const webhookUrl = process.env.MAIL_WEBHOOK_URL;
    if (!webhookUrl) {
        return { sent: false, reason: 'MAIL_WEBHOOK_URL chưa được cấu hình' };
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ event, booking }),
        });

        if (!response.ok) {
            return { sent: false, reason: `HTTP ${response.status}` };
        }

        return { sent: true };
    } catch (error) {
        return { sent: false, reason: error.message };
    }
}

module.exports = { sendBookingConfirmation, sendBookingCancellation };