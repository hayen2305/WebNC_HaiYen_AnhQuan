require('dotenv').config();
const mysql = require('mysql2/promise');

const requiredEnv = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
	throw new Error(`Thiếu biến môi trường database: ${missingEnv.join(', ')}`);
}

const pool = mysql.createPool({
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT),
	database: process.env.DB_NAME,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	ssl: {
		rejectUnauthorized: true,
	},
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
});

module.exports = pool;
