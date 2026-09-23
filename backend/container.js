const pool = require('./src/database/db');

const reminderEngine = {
    schedule(cronTime) {
        console.log(`ReminderEngine đã được cấu hình với lịch: ${cronTime}`);
    },
};

module.exports = {
    pool,
    testConnection: pool.testConnection,
    reminderEngine,
};
