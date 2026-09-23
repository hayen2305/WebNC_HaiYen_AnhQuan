const { randomUUID } = require('crypto');
const pool = require('../database/db');

class Staff {
    static async findAll() {
        const [rows] = await pool.query(
            'SELECT id, name, email, created_at AS createdAt FROM staff ORDER BY created_at DESC'
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.query(
            'SELECT id, name, email, created_at AS createdAt FROM staff WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }

    static async create({ name, email }) {
        const id = randomUUID();
        await pool.query(
            'INSERT INTO staff (id, name, email) VALUES (?, ?, ?)',
            [id, name, email]
        );
        return this.findById(id);
    }
}

module.exports = Staff;
