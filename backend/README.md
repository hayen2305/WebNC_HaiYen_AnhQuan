# Quản lý đăng ký môn học - NestJS

Ứng dụng REST API quản lý sinh viên, môn học và việc sinh viên đăng ký môn học. Dự án được xây dựng bằng NestJS, TypeORM và MySQL (có thể chạy local hoặc dùng Aiven).

## 1. Công nghệ sử dụng

- Node.js và TypeScript
- NestJS
- TypeORM
- MySQL local hoặc Aiven Cloud


## 2. Cài đặt và chạy ứng dụng

Yêu cầu Node.js tương thích với NestJS CLI của dự án.

Mở PowerShell tại thư mục `BTGK`, sau đó chuyển vào thư mục dự án (nơi có `package.json`):

```powershell
cd .\project-name
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run start:dev
```

Tạo file `.env` ở thư mục dự án (hoặc copy từ `.env.example`):

```bash
Copy-Item .env.example .env
```

Nội dung mẫu `.env`:

```env
# Application
PORT=3000

# MySQL / Aiven Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=btgk_db
DB_SYNCHRONIZE=true

# JWT
JWT_SECRET=change_this_to_a_strong_secret_key
JWT_EXPIRES_IN=3600
```

Các biến quan trọng:

- `PORT`: cổng chạy ứng dụng (mặc định `3000`)
- `DB_HOST`: host MySQL/Aiven (`localhost` hoặc hostname Aiven)
- `DB_PORT`: cổng MySQL (`3306` mặc định)
- `DB_USER`: username MySQL
- `DB_PASSWORD`: password MySQL
- `DB_NAME`: tên database
- `DB_SYNCHRONIZE`: `true` cho môi trường dev, nên tắt ở production
- `JWT_SECRET`: secret key để ký JWT
- `JWT_EXPIRES_IN`: thời gian sống JWT tính bằng giây

Không commit `.env` lên Git; file này đã được ignore trong `.gitignore`.
Sau khi cấu hình `.env`, chạy ứng dụng bằng `npm run start:dev`. Ứng dụng chạy tại `http://localhost:3000`.

> `synchronize: true` đang bật để tiện cho bài tập và phát triển local. Không nên bật tùy chọn này trong môi trường production; production nên dùng migration.

## 3. Thiết kế dữ liệu

Ứng dụng có ba thực thể:

- **SinhVien** (`sinhvien`): `id`, `maSV`, `ten`, `email`.
- **MonHoc** (`monhoc`): `id`, `maMH`, `tenMonHoc`, `soTinChi`.
- **DangKi** (`dangki`): `id`, `sinhVienId`, `monHocId`, `ngayDangKy`, `ghiChu`.

Mỗi bản ghi `DangKi` liên kết với một sinh viên và một môn học. Một sinh viên hoặc môn học có thể có nhiều bản ghi đăng ký. Một sinh viên không thể đăng ký cùng một môn học hai lần thông qua API.

## 4. Cấu trúc chính

```text
src/
├── dangki/       # Module, controller và service đăng ký môn học
├── dto/          # DTO nhận dữ liệu từ API
├── entity/       # Các entity SinhVien, MonHoc, DangKi
├── monhoc/       # Module, controller và service môn học
└── sinhvien/     # Module, controller và service sinh viên
```

## 5. API

Tất cả API nhận và trả dữ liệu JSON.

| Method | Đường dẫn | Chức năng |
|---|---|---|
| `POST` | `/sinhvien` | Tạo sinh viên |
| `POST` | `/sinhvien/register` | Tạo sinh viên (đường dẫn tương thích) |
| `GET` | `/sinhvien` | Liệt kê sinh viên |
| `GET` | `/sinhvien/:id` | Xem sinh viên theo ID |
| `POST` | `/monhoc` | Tạo môn học |
| `GET` | `/monhoc` | Liệt kê môn học |
| `GET` | `/monhoc/:id` | Xem môn học theo ID |
| `POST` | `/dangki/register` | Đăng ký môn học cho sinh viên |
| `GET` | `/dangki` | Liệt kê các đăng ký, kèm thông tin sinh viên và môn học |

### Tạo sinh viên

`POST http://localhost:3000/sinhvien`

```json
{
  "maSV": "SV001",
  "ten": "Nguyen Van A",
  "email": "a@example.com"
}
```

`maSV` và `email` cần là giá trị duy nhất.

### Tạo môn học

`POST http://localhost:3000/monhoc`

```json
{
  "maMH": "CS101",
  "tenMonHoc": "Co so du lieu",
  "soTinChi": 3
}
```

`maMH` cần là giá trị duy nhất.

### Đăng ký môn học

Trước tiên, tạo sinh viên và môn học. Dùng `id` trả về từ hai API tạo dữ liệu trong request dưới đây.

`POST http://localhost:3000/dangki/register`

```json
{
  "sinhVienId": 1,
  "monHocId": 1,
  "ghiChu": "Dang ky hoc ky 1"
}
```

API trả về bản ghi vừa lưu trong bảng `dangki`. Nếu sinh viên hoặc môn học không tồn tại, API trả lỗi `404`; nếu sinh viên đã đăng ký môn học đó, API trả lỗi `409`.

### Liệt kê danh sách đăng ký

`GET http://localhost:3000/dangki`

Ví dụ kết quả:

```json
[
  {
    "id": 1,
    "sinhVien": {
      "id": 1,
      "maSV": "SV001",
      "ten": "Nguyen Van A",
      "email": "a@example.com"
    },
    "monHoc": {
      "id": 1,
      "maMH": "CS101",
      "tenMonHoc": "Co so du lieu",
      "soTinChi": 3
    },
    "ngayDangKy": "2026-10-05T09:47:16.000Z",
    "ghiChu": "Dang ky hoc ky 1"
  }
]
```

## 6. Kiểm tra bằng curl

Chạy ứng dụng trước, sau đó gửi lần lượt các request sau. Ví dụ dùng Bash hoặc Git Bash:

```bash
curl -X POST http://localhost:3000/sinhvien \
  -H "Content-Type: application/json" \
  -d '{"maSV":"SV001","ten":"Nguyen Van A","email":"a@example.com"}'

curl -X POST http://localhost:3000/monhoc \
  -H "Content-Type: application/json" \
  -d '{"maMH":"CS101","tenMonHoc":"Co so du lieu","soTinChi":3}'

curl -X POST http://localhost:3000/dangki/register \
  -H "Content-Type: application/json" \
  -d '{"sinhVienId":1,"monHocId":1,"ghiChu":"Dang ky hoc ky 1"}'

curl http://localhost:3000/dangki
```

Nếu đã có dữ liệu hoặc xóa/thay đổi CSDL, kiểm tra ID thực tế từ `GET /sinhvien` và `GET /monhoc` rồi thay `sinhVienId` và `monHocId` tương ứng. Không gửi nhiều lần cùng một dữ liệu mẫu vì mã sinh viên/email/mã môn học là duy nhất.
