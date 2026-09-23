const Service = require('../models/Service');

async function listServices(req, res, next) {
    try {
        res.json(await Service.findAll());
    } catch (error) {
        next(error);
    }
}

module.exports = { listServices };
