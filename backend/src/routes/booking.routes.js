const express = require('express');
const { availableSlots, create, cancel } = require('../controllers/booking.controller');

const router = express.Router();

router.get('/available-slots', availableSlots);
router.post('/', create);
router.patch('/:id/cancel', cancel);

module.exports = router;
