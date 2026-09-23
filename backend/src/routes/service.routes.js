const express = require('express');
const { listServices } = require('../controllers/service.controller');

const router = express.Router();

router.get('/', listServices);

module.exports = router;
