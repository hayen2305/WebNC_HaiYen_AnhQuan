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
        rejectUnauthorized: false, // Đặt false để kết nối Aiven Cloud thành công không bị lỗi CA Certificate
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Hàm kiểm tra kết nối & in thông tin để chụp ảnh màn hình nộp bài
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Kết nối Aiven Cloud MySQL thành công!');
        
        const [rows] = await connection.query('SELECT NOW() AS currentTime, DATABASE() AS currentDb;');
        console.log('📍 Thông tin CSDL:', rows[0]);
        
        connection.release();
    } catch (error) {
        console.error('❌ Thất bại khi kết nối Aiven Cloud MySQL:', error.message);
    }
}

// Chạy test nếu file được thực thi trực tiếp qua node dbConnection.js
if (require.main === module) {
    testConnection();
}

pool.testConnection = testConnection;

module.exports = pool;