## Hải Yến và Anh Quân - WebNC
1. Mở VS Code → mở thư mục dự án.
2. Mở Command Palette (Ctrl+Shift+P).
3. Gõ: Dev Containers: Add Development Container Configuration Files.
4. Chọn mẫu (Node.js,mysql,github) và phiên bản Node mong muốn.
5. Command Palette → chọn Dev Containers: Reopen in Container để mở dự án trong container.
6. Mở terminal trong VS Code → chạy npm init -y để tạo package.json.
7. Chạy npx create-react-app client để tạo ứng dụng React trong thư mục client.
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