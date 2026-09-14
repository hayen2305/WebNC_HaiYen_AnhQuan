# 📅 Hệ Thống Đặt Lịch & Booking Tự Động (Booking System API)

Backend API cho hệ thống **đặt lịch hẹn theo thời gian thực**, hỗ trợ tính toán slot trống động, xử lý đồng thời nhiều yêu cầu đặt lịch và gửi email xác nhận bất đồng bộ.

Project phù hợp với các mô hình:

* 🏥 Phòng khám
* 💆 Spa
* 💇 Salon / Tiệm cắt tóc
* 👨‍💼 Dịch vụ tư vấn
* 🔐 Hệ thống khóa / tủ lưu trữ thông minh
* 📅 Các hệ thống cần quản lý lịch hẹn

---

## 📌 Tính năng nổi bật

### 1. Tính toán Slot trống động

Hệ thống tự động:

* Lấy giờ làm việc của nhân viên.
* Lấy thời lượng của dịch vụ.
* Chia khoảng thời gian làm việc thành các slot tương ứng.
* Kiểm tra slot đã có người đặt hay chưa.
* Chỉ trả về những slot còn trống.

Ví dụ:

```text
Working Hours: 08:00 → 17:00
Service Duration: 60 phút

Available Slots:

08:00 → 09:00
09:00 → 10:00
10:00 → 11:00
...
```

Công thức kiểm tra hai lịch có bị trùng:

```text
IsOverlapped =
(Start_A < End_B) AND (End_A > Start_B)
```

---

### 2. 🔒 Chống Race Condition

Khi nhiều người dùng cùng đặt một slot tại cùng thời điểm, hệ thống sử dụng:

```text
Prisma Transaction
```

để đảm bảo việc kiểm tra và tạo appointment được xử lý an toàn.

Mục tiêu:

```text
User A ──┐
         ├──> Check Slot ──> Transaction ──> Create Booking
User B ──┘
```

Không cho phép hai request cùng tạo lịch trên cùng một khoảng thời gian.

---

### 3. ⚡ Hiệu năng cao

Các tác vụ không cần thiết để trả response ngay được xử lý bất đồng bộ.

Ví dụ:

```text
Client
   │
   ▼
POST /api/v1/bookings
   │
   ├──> Validate
   ├──> Check availability
   ├──> Create appointment
   │
   ▼
201 Created
   │
   └──> Send confirmation email (Background)
```

API không cần chờ email gửi xong mới trả response.

---

### 4. ☁️ Cloud-native

Database sử dụng:

**Aiven Cloud MySQL**

Kết nối database được bảo mật bằng SSL.

---

# 🛠️ Công nghệ sử dụng

| Công nghệ   | Mục đích                    |
| ----------- | --------------------------- |
| Node.js     | Runtime                     |
| Express.js  | Backend Framework           |
| MySQL       | Database                    |
| Aiven Cloud | Cloud Database              |
| Prisma ORM  | Database ORM                |
| JWT         | Authentication              |
| Nodemailer  | Gửi email                   |
| SendGrid    | Email service               |
| Postman     | API Testing                 |


---

# 📐 Database Schema

Database được xây dựng bằng **Prisma ORM**.

## Service

```prisma
model Service {
  id              String        @id @default(uuid())
  name            String
  durationMinutes Int
  price           Float
  appointments    Appointment[]
  createdAt       DateTime      @default(now())
}
```

Lưu thông tin dịch vụ:

* Tên dịch vụ
* Thời lượng
* Giá
* Danh sách appointment

---

## Staff

```prisma
model Staff {
  id           String        @id @default(uuid())
  name         String
  email        String        @unique
  workingHours WorkingHour[]
  appointments Appointment[]
  createdAt    DateTime      @default(now())
}
```

Lưu thông tin nhân viên và lịch làm việc.

---

## WorkingHour

```prisma
model WorkingHour {
  id        String @id @default(uuid())
  staffId   String
  staff     Staff  @relation(fields: [staffId], references: [id])
  dayOfWeek Int
  startTime String
  endTime   String

  @@unique([staffId, dayOfWeek])
}
```

Trong đó:

```text
0 = Chủ Nhật
1 = Thứ 2
2 = Thứ 3
3 = Thứ 4
4 = Thứ 5
5 = Thứ 6
6 = Thứ 7
```

Ví dụ:

```text
dayOfWeek = 1
startTime = "08:00"
endTime   = "17:00"
```

Có nghĩa nhân viên làm việc từ **08:00 đến 17:00 vào Thứ 2**.

---

## Appointment Status

```prisma
enum AppointmentStatus {
  PENDING
  CONFIRMED
  CANCELLED
}
```

Các trạng thái:

| Status      | Ý nghĩa           |
| ----------- | ----------------- |
| `PENDING`   | Đang chờ xác nhận |
| `CONFIRMED` | Đã xác nhận       |
| `CANCELLED` | Đã hủy            |

---

## Appointment

```prisma
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
```

Appointment lưu:

* Người đặt lịch
* Nhân viên
* Dịch vụ
* Thời gian bắt đầu
* Thời gian kết thúc
* Trạng thái
* Thời gian tạo

Index:

```text
(staffId, startAt, endAt)
```

giúp tối ưu việc tìm kiếm các appointment của một nhân viên trong khoảng thời gian cụ thể.

UML DIAGRAM

<img width="394" height="322" alt="image" src="https://github.com/user-attachments/assets/f6d92ab6-d2a2-467f-8a10-2e3189ee17a1" />

---

# 🚀 Tính năng chính

## 1. Get Available Slots

Endpoint:

```http
GET /api/v1/bookings/available-slots
```

### Query Parameters

| Parameter   | Mô tả        |
| ----------- | ------------ |
| `staffId`   | ID nhân viên |
| `serviceId` | ID dịch vụ   |
| `date`      | Ngày cần đặt |

Ví dụ:

```http
GET /api/v1/bookings/available-slots?staffId=staff-id&serviceId=service-id&date=2026-09-20
```

### Quy trình xử lý

```text
Request
   │
   ▼
Get Staff Working Hours
   │
   ▼
Get Service Duration
   │
   ▼
Generate Time Slots
   │
   ▼
Get Existing Appointments
   │
   ▼
Check Overlap
   │
   ▼
Return Available Slots
```

---

# 🔒 Xử lý Concurrent Booking

Khi client gửi:

```http
POST /api/v1/bookings
```

hệ thống thực hiện:

```text
1. Validate request
        ↓
2. Get service
        ↓
3. Get staff
        ↓
4. Calculate endAt
        ↓
5. Check existing appointments
        ↓
6. Transaction
        ↓
7. Create appointment
        ↓
8. Send email asynchronously
        ↓
9. Return 201 Created
```

Điều kiện kiểm tra trùng lịch:

```text
Start_A < End_B
AND
End_A > Start_B
```

Ví dụ:

```text
Existing:
10:00 ───────── 11:00

Request:
10:30 ───────── 11:30

→ OVERLAPPED
→ Không cho phép đặt
```

Trong khi:

```text
Existing:
10:00 ───────── 11:00

Request:
11:00 ───────── 12:00

→ Không overlap
→ Có thể đặt
```

---

# 📧 Async Email Service

Sau khi tạo appointment thành công, hệ thống gửi email xác nhận.

Luồng xử lý:

```text
POST /bookings
       │
       ▼
Create Appointment
       │
       ├──────────────► Return 201
       │
       ▼
Background Email
       │
       ▼
Send Confirmation Email
```

Có thể sử dụng:

* Nodemailer
* SendGrid

Việc gửi email được tách khỏi request chính để giảm thời gian response API.

---

# 📡 API Endpoints

| Method | Endpoint                           | Mô tả                  |
| ------ | ---------------------------------- | ---------------------- |
| GET    | `/api/v1/services`                 | Lấy danh sách dịch vụ  |
| GET    | `/api/v1/bookings/available-slots` | Lấy các slot còn trống |
| POST   | `/api/v1/bookings`                 | Tạo lịch hẹn           |
| PATCH  | `/api/v1/bookings/:id/cancel`      | Hủy lịch hẹn           |

---

## GET `/api/v1/services`

Lấy danh sách tất cả dịch vụ.

Response mẫu:

```json
[
  {
    "id": "service-id",
    "name": "Haircut",
    "durationMinutes": 60,
    "price": 150000
  }
]
```

---

## GET `/api/v1/bookings/available-slots`

Query:

```text
staffId
serviceId
date
```

Ví dụ:

```http
GET /api/v1/bookings/available-slots?staffId=abc&serviceId=xyz&date=2026-09-20
```

Response mẫu:

```json
{
  "date": "2026-09-20",
  "staffId": "abc",
  "serviceId": "xyz",
  "slots": [
    {
      "startAt": "2026-09-20T08:00:00.000Z",
      "endAt": "2026-09-20T09:00:00.000Z"
    },
    {
      "startAt": "2026-09-20T09:00:00.000Z",
      "endAt": "2026-09-20T10:00:00.000Z"
    }
  ]
}
```

---

## POST `/api/v1/bookings`

Tạo appointment mới.

Request:

```json
{
  "userId": "user-id",
  "staffId": "staff-id",
  "serviceId": "service-id",
  "startAt": "2026-09-20T08:00:00.000Z"
}
```

Response:

```http
201 Created
```

Ví dụ:

```json
{
  "message": "Booking created successfully",
  "appointment": {
    "id": "appointment-id",
    "status": "CONFIRMED"
  }
}
```

---

## PATCH `/api/v1/bookings/:id/cancel`

Hủy appointment.

Ví dụ:

```http
PATCH /api/v1/bookings/appointment-id/cancel
```

Response:

```json
{
  "message": "Booking cancelled successfully"
}
```

---

# 💻 Installation

## 1. Requirements

Cần cài đặt:

* Node.js `18+`
* npm
* MySQL
* Tài khoản Aiven
* Aiven MySQL Service đang hoạt động

Kiểm tra Node.js:

```bash
node -v
```

Kiểm tra npm:

```bash
npm -v
```

---

## 2. Clone project

```bash
git clone <YOUR_REPOSITORY_URL>
```

Di chuyển vào project:

```bash
cd booking-system-api
```

---

## 3. Install dependencies

```bash
npm install
```

---

# 🔐 Environment Variables

Tạo file:

```text
.env
```

tại thư mục gốc của project.

Ví dụ:

```env
PORT=5000

DATABASE_URL="mysql://USERNAME:PASSWORD@HOST:PORT/DATABASE"

JWT_SECRET="your_jwt_secret"

MAIL_HOST="smtp.example.com"
MAIL_PORT=587
MAIL_USER="your_email"
MAIL_PASSWORD="your_password"
MAIL_FROM="your_email@example.com"
```

> Không commit file `.env` lên GitHub.

Thêm vào `.gitignore`:

```text
.env
node_modules/
```

---

# 🗄️ Prisma Setup

Sau khi cấu hình `DATABASE_URL`, chạy:

```bash
npx prisma generate
```

Sau đó migrate database:

```bash
npx prisma migrate dev --name init
```

Nếu database đã tồn tại và chỉ muốn đồng bộ schema:

```bash
npx prisma db push
```

Có thể mở Prisma Studio bằng:

```bash
npx prisma studio
```

---

# ▶️ Run Project

Development:

```bash
npm run dev
```

Hoặc:

```bash
npm start
```

Server mặc định chạy tại:

```text
http://localhost:5000
```

API:

```text
http://localhost:5000/api/v1
```

---

# 🧪 Testing

Có thể sử dụng **Postman** để test API.

Các API cần kiểm tra:

```text
GET     /api/v1/services
GET     /api/v1/bookings/available-slots
POST    /api/v1/bookings
PATCH   /api/v1/bookings/:id/cancel
```

### Test quan trọng

#### Test 1 — Lấy slot trống

```text
GET available-slots
```

Kiểm tra:

* Đúng working hours
* Đúng duration của service
* Không trả về slot đã được đặt

#### Test 2 — Đặt lịch thành công

```text
POST /bookings
```

Expected:

```text
201 Created
```

#### Test 3 — Đặt trùng lịch

Gửi hai request cùng thời gian.

Expected:

```text
Request 1 → SUCCESS
Request 2 → REJECTED
```

#### Test 4 — Hủy lịch

```text
PATCH /bookings/:id/cancel
```

Expected:

```text
status = CANCELLED
```

#### Test 5 — Gửi email

Sau khi booking thành công:

```text
Booking Created
       ↓
Email Service
       ↓
Confirmation Email
```

---



# 📂 Project Structure

Một cấu trúc đề xuất:

```text
booking-system-api/
│
├── prisma/
│   └── schema.prisma
│
├── src/
│   ├── controllers/
│   │   ├── booking.controller.js
│   │   └── service.controller.js
│   │
│   ├── routes/
│   │   ├── booking.routes.js
│   │   └── service.routes.js
│   │
│   ├── services/
│   │   ├── booking.service.js
│   │   ├── slot.service.js
│   │   └── mail.service.js
│   │
│   ├── middleware/
│   │   └── auth.middleware.js
│   │
│   ├── utils/
│   │   └── prisma.js
│   │
│   └── app.js
│
├── .env
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---

# 🏗️ Architecture

```text
                  ┌───────────────┐
                  │    Client     │
                  │ Web / Mobile  │
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │    Express    │
                  │     API       │
                  └───────┬───────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
          Booking       Slot        Auth
          Service      Service      JWT
              │           │
              └──────┬────┘
                     │
                     ▼
              ┌───────────────┐
              │ Prisma ORM    │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │ Aiven MySQL   │
              └───────────────┘

Booking Service
      │
      └──────────────► Async Mail Service
                              │
                              ▼
                       Nodemailer /
                         SendGrid
```

---

# 🔐 Security

Project sử dụng JWT cho authentication.

Các thông tin nhạy cảm nên được lưu trong environment variables:

```text
DATABASE_URL
JWT_SECRET
MAIL_PASSWORD
```

Không lưu trực tiếp password hoặc secret vào source code.

---

# 📈 Future Improvements

Một số tính năng có thể phát triển thêm:

* [ ] User registration / login
* [ ] JWT authentication middleware
* [ ] Role-based authorization
* [ ] Admin dashboard
* [ ] Quản lý Staff
* [ ] Quản lý Working Hours
* [ ] Quản lý Services
* [ ] Reschedule appointment
* [ ] Reminder email
* [ ] SMS notification
* [ ] Redis để xử lý distributed locking
* [ ] Rate limiting
* [ ] Docker Compose
* [ ] Swagger / OpenAPI documentation
* [ ] Unit Test
* [ ] Integration Test
* [ ] CI/CD
* [ ] Monitoring và logging

---

# 📄 License

This project is developed for learning and educational purposes.
