## Hải Yến và Anh Quân - WebNC
1. Mở VS Code và mở workspace (thư mục dự án).
2. Mở Command Palette (Ctrl+Shift+P).
3. Gõ: `Dev Containers: Add Development Container Configuration Files` (hoặc `Remote-Containers: Add Development Container Configuration Files`).
4. Chọn mẫu phù hợp (ví dụ: **Node.js,github,.....**). Chọn phiên bản Node bạn muốn sử dụng.
5. VS Code sẽ tạo thư mục `.devcontainer/` chứa `devcontainer.json` và có thể kèm `Dockerfile` hoặc `docker-compose.yml` tuỳ lựa chọn.
6. Sau khi cấu hình xong: mở Command Palette → `Dev Containers: Reopen in Container` (hoặc `Remote-Containers: Reopen Folder in Container`) để khởi động và mở workspace bên trong container.
7 Mở terminal trong VS Code và chạy lệnh: npm init -y để tạo package.json
8. Chạy lệnh npx create-react-app client để tạo ứng dụng React trong thư mục `client`.
```bash
---
## Docker — build và chạy bằng Docker Compose
- Xây và chạy bằng Docker Compose:

```bash
docker compose up --build
```

Sau khi chạy, mở `http://localhost:3000` để xem ứng dụng (nginx trong container lắng nghe cổng 80, được map sang 3000 trên host).

- Nếu muốn chỉ build image client thủ công:

```bash
docker build -t webnc-client ./client
docker run --rm -p 3000:80 webnc-client
```

Ghi chú: Dockerfile dùng Node để build và nginx để serve. Nếu cần server Node thay vì nginx, mình có thể tạo Dockerfile khác cho server.