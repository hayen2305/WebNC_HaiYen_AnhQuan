import { readFileSync } from 'fs';
import { join } from 'path';
import { createPool, Pool } from 'mysql2/promise';

export interface DbEnv {
  DB_HOST?: string;
  DB_PORT?: string;
  DB_USER?: string;
  DB_PASSWORD?: string;
  DB_NAME?: string;
  DB_SSL?: string;
}

/**
 * Tạo connection pool MySQL. Dùng chung cho DatabaseModule và script seed.
 * DB_SSL=true -> bật SSL với CA tại src/certs/ca.pem (VD: Aiven MySQL).
 */
export function createMysqlPool(env: DbEnv): Pool {
  const ssl =
    env.DB_SSL === 'true'
      ? { ca: readFileSync(join(__dirname, '..', 'certs', 'ca.pem')) }
      : undefined;

  return createPool({
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME,
    ssl,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
    dateStrings: true,
  });
}
