# Backend — NestJS

API quản lý nhà trọ, chuyển từ Express sang **NestJS** (TypeScript). Giữ nguyên toàn bộ đường dẫn `/api/*`,
schema MySQL (`sql/schema.sql`) và format response `{ message }` nên frontend React không cần sửa.

## Chạy
```bash
cp .env.example .env      # điền DB_*, JWT_SECRET, ...
npm install
mysql < sql/schema.sql    # nạp schema vào database đã chọn
npm run start:dev         # http://localhost:5000/api/health
npm run seed             # tạo tài khoản admin@local.com / Admin@123
```

## Cấu trúc
```
src/
  main.ts / app.module.ts
  common/        guards (JwtAuthGuard, RolesGuard), decorators (@Auth, @Roles, @CurrentUser),
                 filter lỗi tập trung, cấu hình upload (multer)
  database/      MySQL pool (mysql2) dùng chung, BaseRepository
  integrations/  CloudinaryService, OcrService (Gemini / OpenAI)
  auth/ rooms/ contracts/ invoices/ tickets/ support/
                 mỗi module: controller -> service -> repository (+ dto, entities)
  invoices/      PaymentService (VietQR + webhook), ReminderService (cron nhắc nợ)
```

## Ánh xạ Express -> NestJS
| Express | NestJS |
|---|---|
| `routes/*.routes.js` + `controllers/*` | `@Controller` + decorator `@Get/@Post/@Put` |
| `container.js` (DI thủ công) | `@Module` / `@Injectable` (DI của Nest) |
| `middleware/auth.js` (`authenticate`, `authorize`) | `JwtAuthGuard` + `RolesGuard`, dùng qua `@Auth('ADMIN')` |
| `middleware/upload*.js` (multer) | `FileInterceptor` + `common/upload/upload.options.ts` |
| error handler trong `app.js` | `AllExceptionsFilter` |
| `ReminderEngine` + `node-cron` | `ReminderService` + `@nestjs/schedule` |
| `config/db.js` + `dotenv` | `DatabaseModule` + `@nestjs/config` |

## Biến môi trường
Xem `.env.example`. Lưu ý: `config/db.js` và `.env` không có trong bản zip gốc nên tên các biến DB
(`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`) là đặt mới — đổi lại nếu `.env` cũ của bạn dùng tên khác.
