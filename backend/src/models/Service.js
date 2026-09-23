const { randomUUID } = require('crypto');
const pool = require('../database/db');
// Mô hình cho bảng services
class Service {
    static async findAll() {
        const [rows] = await pool.query(
            'SELECT id, name, duration_minutes AS durationMinutes, price, created_at AS createdAt FROM services ORDER BY created_at DESC'
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.query(
            'SELECT id, name, duration_minutes AS durationMinutes, price, created_at AS createdAt FROM services WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }

    static async create({ name, durationMinutes, price }) {
        const id = randomUUID();
        await pool.query(
            'INSERT INTO services (id, name, duration_minutes, price) VALUES (?, ?, ?, ?)',
            [id, name, durationMinutes, price]
        );
        return this.findById(id);
    }
}

module.exports = Service;
