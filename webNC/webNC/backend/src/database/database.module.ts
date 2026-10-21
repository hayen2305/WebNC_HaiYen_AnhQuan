import { Global, Inject, Logger, Module, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from './database.constants';
import { createMysqlPool } from './pool.factory';

@Global()
@Module({
  providers: [
    {
      provide: MYSQL_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createMysqlPool({
          DB_HOST: config.get('DB_HOST'),
          DB_PORT: config.get('DB_PORT'),
          DB_USER: config.get('DB_USER'),
          DB_PASSWORD: config.get('DB_PASSWORD'),
          DB_NAME: config.get('DB_NAME'),
          DB_SSL: config.get('DB_SSL'),
        }),
    },
  ],
  exports: [MYSQL_POOL],
})
export class DatabaseModule implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger('Database');

  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async onModuleInit() {
    try {
      const conn = await this.pool.getConnection();
      await conn.ping();
      conn.release();
      this.logger.log('✅ Kết nối MySQL thành công.');
    } catch (err) {
      this.logger.error(`❌ Không kết nối được MySQL: ${(err as Error).message}`);
      throw err;
    }
  }

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
