const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Booking API đang hoạt động',
    });
});

app.use((req, res) => {
    res.status(404).json({
        message: 'Không tìm thấy endpoint',
    });
});

module.exports = app;
