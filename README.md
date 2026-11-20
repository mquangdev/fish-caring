# Fish Caring

Web app nhắc lịch chăm sóc bể cá / thủy sinh tại nhà: cho ăn, thay nước, bón phân. Thông báo tới điện thoại qua PWA + Web Push.

- Yêu cầu và thiết kế: [docs/spec.md](docs/spec.md)
- Quy ước làm việc cho AI/dev: [CLAUDE.md](CLAUDE.md), [be/CLAUDE.md](be/CLAUDE.md), [fe/CLAUDE.md](fe/CLAUDE.md)

## Stack

- Backend `be/`: Java 21, Spring Boot 4 (monolith), Maven, Spring JDBC (`JdbcClient`), Flyway, MySQL 8
- Frontend `fe/`: React, Vite, TypeScript, Tailwind, Redux Toolkit

## Trạng thái

MVP1 đang phát triển trên nhánh `feature/mvp1`. Đã xong M0 (tài liệu), M1 (scaffold), M2 (schema, repository, nền tảng BE). Xem milestone ở mục 11 của [docs/spec.md](docs/spec.md).

## Chạy local

1. Tạo database MySQL 8 và user (dùng `docker compose` ở thư mục gốc, hoặc MySQL có sẵn):

   ```powershell
   copy .env.example .env   # điền giá trị cho các biến MYSQL_*, rồi chạy:
   docker compose up -d
   ```

2. Chạy backend (Flyway tự tạo bảng ở lần chạy đầu). Đặt biến môi trường khớp với database ở bước 1:

   ```powershell
   cd be
   $env:DB_URL = "jdbc:mysql://localhost:3306/fishcaring"
   $env:DB_USERNAME = "<user>"
   $env:DB_PASSWORD = "<password>"
   .\mvnw spring-boot:run
   ```

   Kiểm tra: `http://localhost:8080/actuator/health` trả `{"status":"UP"}`. Cổng 8080 bận thì đặt `$env:SERVER_PORT = "8089"`.

3. Chạy frontend:

   ```powershell
   cd fe
   npm install
   npm run dev
   ```

Test backend: `cd be; .\mvnw verify` (chạy trên H2, không cần MySQL).
