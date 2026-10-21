import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { createMysqlPool } from './database/pool.factory';

/**
 * Tạo 1 tài khoản Admin mặc định để đăng nhập lần đầu.
 * Chạy: npm run build && npm run seed
 */
async function seed() {
  const email = 'admin@local.com';
  const password = 'Admin@123';
  const pool = createMysqlPool(process.env);

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if ((existing as any[]).length > 0) {
      console.log('ℹ️  Tài khoản admin đã tồn tại, bỏ qua seed.');
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'ADMIN')`,
      ['Chủ trọ', email, '0900000000', password_hash],
    );

    console.log('✅ Đã tạo tài khoản Admin mặc định:');
    console.log(`   Email:    ${email}`);
    console.log(`   Mật khẩu: ${password}`);
    console.log('⚠️  Hãy đổi mật khẩu ngay sau khi đăng nhập lần đầu.');
  } catch (err) {
    console.error('❌ Lỗi khi seed dữ liệu:', (err as Error).message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
