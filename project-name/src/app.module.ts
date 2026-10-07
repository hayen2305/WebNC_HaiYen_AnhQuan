import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { DangKiModule } from './dangki/dangki.module.js';
import { DangKi } from './dangki/dangki.js';
import { MonHoc } from './monhoc/monhoc.js';
import { SinhVien } from './sinhvien/sinhvien.js';
import { MonHocModule } from './monhoc/monhoc.module.js';
import { SinhVienModule } from './sinhvien/sinhvien.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const port = Number(config.get('DB_PORT', '3306'));
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          throw new Error('DB_PORT must be an integer between 1 and 65535.');
        }

        return {
          type: 'mysql' as const,
          host: config.getOrThrow<string>('DB_HOST'),
          port,
          username: config.getOrThrow<string>('DB_USER'),
          password: config.getOrThrow<string>('DB_PASSWORD'),
          database: config.getOrThrow<string>('DB_NAME'),
          entities: [SinhVien, MonHoc, DangKi],
          synchronize: config.get('DB_SYNCHRONIZE', 'true') === 'true',
          logging: false,
        };
      },
    }),
    SinhVienModule,
    MonHocModule,
    DangKiModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
