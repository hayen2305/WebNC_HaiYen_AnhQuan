const express = require('express');
const cors = require('cors');
const serviceRoutes = require('./src/routes/service.routes');
const bookingRoutes = require('./src/routes/booking.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Booking API đang hoạt động',
    });
});

app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/bookings', bookingRoutes);

app.use((error, req, res, next) => {
    console.error('API error:', error.message);
    res.status(error.statusCode || 500).json({
        message: error.statusCode ? error.message : 'Lỗi máy chủ',
    });
});

app.use((req, res) => {
    res.status(404).json({
        message: 'Không tìm thấy endpoint',
    });
});

module.exports = app;
