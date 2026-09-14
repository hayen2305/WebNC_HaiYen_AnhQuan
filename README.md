📅 Booking System API
📌 Giới Thiệu
Booking System API là giải pháp backend giúp quản lý đặt lịch hẹn theo thời gian thực, phù hợp cho các mô hình như:

Phòng khám, spa, salon/tiệm cắt tóc

Dịch vụ tư vấn

Hệ thống khóa/tủ lưu trữ thông minh

Điểm nổi bật
Tính toán Slot trống động: Chia nhỏ khung giờ làm việc theo thời lượng dịch vụ.

Chống Race Condition: Đảm bảo dữ liệu không bị đè khi nhiều người đặt cùng lúc.

Hiệu năng cao: Tách luồng xử lý chính và tác vụ phụ (gửi email).

Cloud-native: Sử dụng Aiven Cloud MySQL với kết nối SSL bảo mật.

🛠️ Công Nghệ
Runtime: Node.js, Express.js

Database: Aiven Cloud MySQL

ORM: Prisma ORM

Mail: Nodemailer / SendGrid

Auth: JWT

Tools: Postman, Docker (tùy chọn)

📐 Database Schema (Prisma)
prisma
model Service {
  id              String        @id @default(uuid())
  name            String
  durationMinutes Int
  price           Float
  appointments    Appointment[]
  createdAt       DateTime      @default(now())
}

model Staff {
  id           String        @id @default(uuid())
  name         String
  email        String        @unique
  workingHours WorkingHour[]
  appointments Appointment[]
  createdAt    DateTime      @default(now())
}

model WorkingHour {
  id        String   @id @default(uuid())
  staffId   String
  staff     Staff    @relation(fields: [staffId], references: [id])
  dayOfWeek Int      // 0: Chủ Nhật, 1: Thứ 2, ..., 6: Thứ 7
  startTime String   // "08:00"
  endTime   String   // "17:00"

  @@unique([staffId, dayOfWeek])
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  CANCELLED
}

model Appointment {
  id        String            @id @default(uuid())
  userId    String
  staffId   String
  staff     Staff             @relation(fields: [staffId], references: [id])
  serviceId String
  service   Service           @relation(fields: [serviceId], references: [id])
  startAt   DateTime
  endAt     DateTime
  status    AppointmentStatus @default(CONFIRMED)
  createdAt DateTime          @default(now())

  @@index([staffId, startAt, endAt])
}
🚀 Tính Năng Chính
Kiểm tra Slot trống (getAvailableSlots)

Lấy khung giờ làm việc của nhân viên.

Chia thành slot theo durationMinutes.

Kiểm tra trùng lịch bằng công thức:

  IsOverlapped = (Start_A < End_B) ∧ (End_A > Start_B)

Trả về danh sách slot khả dụng.

Xử lý Trùng lịch (Concurrency Control)

Sử dụng prisma.$transaction để khóa dữ liệu khi tạo lịch.

Ngăn chặn Race Condition trên MySQL.

Gửi Email Bất đồng bộ (Async Mail Service)

Gửi email xác nhận qua Nodemailer chạy nền.

API phản hồi ngay với 201 Created.

📡 API Endpoints
Method	Endpoint	Mô tả
GET	/api/v1/services	Lấy danh sách dịch vụ
GET	/api/v1/bookings/available-slots	Lấy slot trống (tham số: staffId, serviceId, date)
POST	/api/v1/bookings	Đặt lịch mới (Transaction + Email)
PATCH	/api/v1/bookings/:id/cancel	Hủy lịch hẹn


💻 Hướng Dẫn Cài Đặt
1. Yêu cầu hệ thống
Node.js v18+

Tài khoản Aiven với MySQL Service đang chạy

2. Cài đặt dependencies
bash
npm install
3. Cấu hình biến môi trường
Tạo file .env tại thư mục gốc:

env
PORT=5000

# Chuỗi kết nối MySQL từ Aiven Cloud (SSL bắt buộc)
DATABASE_URL="mysql://avnadmin:YOUR_AIVEN_PASSWORD@YOUR_AIVEN_HOST.aivencloud.com:PORT/defaultdb?sslmode=REQUIRED"

# SMTP Config
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
4. Đồng bộ cơ sở dữ liệu
bash
npx prisma migrate dev --name init
5. Khởi chạy server
bash
# Development mode
npm run dev

# Production mode
npm start
📖 Ghi chú
Đảm bảo MySQL Service trên Aiven đang ở trạng thái RUNNING.

Gmail yêu cầu App Password thay vì mật khẩu thường để gửi mail.
